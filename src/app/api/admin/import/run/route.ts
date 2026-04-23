import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RowResult {
  row: number
  candidate_name: string
  success: boolean
  error: string | null
  family_account_id?: string
  profile_id?: string
  action?: 'created_family' | 'linked_existing'
}

// ─── CSV parser (handles basic quoted fields) ─────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(l => parseCSVLine(l))
  return { headers, rows }
}

// ─── Phone normalisation ───────────────────────────────────────────────────────

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '44' + digits.slice(1)
  return digits
}

// ─── Completeness scoring ──────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['candidate_name', 'age', 'gender', 'city', 'representative_phone', 'representative_email'] as const
const OPTIONAL_FIELDS = ['ethnicity', 'profile_text', 'female_representative_name', 'female_representative_phone'] as const

function computeCompletenessScore(row: Record<string, string>): { score: number; missing: string[] } {
  const requiredScore = REQUIRED_FIELDS.filter(f => row[f]?.trim()).length / REQUIRED_FIELDS.length * 70
  const optionalScore = OPTIONAL_FIELDS.filter(f => row[f]?.trim()).length / OPTIONAL_FIELDS.length * 30
  const score = Math.round(requiredScore + optionalScore)
  const missing = REQUIRED_FIELDS.filter(f => !row[f]?.trim()) as unknown as string[]
  return { score, missing }
}

// ─── Compute display initials ─────────────────────────────────────────────────

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1 && parts[0]) return parts[0][0].toUpperCase()
  return 'XX'
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: _role } = await supabase.rpc('zawaaj_get_role')
    const isSuperAdmin = _role === 'super_admin'
    if (!isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const csvText = await req.text()
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'Empty CSV body' }, { status: 400 })
    }

    const { headers, rows } = parseCSV(csvText)
    if (headers.length === 0) {
      return NextResponse.json({ error: 'Could not parse CSV headers' }, { status: 400 })
    }

    const get = (row: string[], col: string) => {
      const idx = headers.indexOf(col)
      return idx >= 0 ? (row[idx] ?? '').trim() : ''
    }

    // ── Load existing phone → family_account_id map ────────────────────────────
    const { data: existingFamilies } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_number, female_contact_number')

    const phoneToFamilyId = new Map<string, string>()
    for (const fa of existingFamilies ?? []) {
      if (fa.contact_number) {
        phoneToFamilyId.set(normalisePhone(fa.contact_number as string), fa.id as string)
      }
      if (fa.female_contact_number) {
        phoneToFamilyId.set(normalisePhone(fa.female_contact_number as string), fa.id as string)
      }
    }

    // Track phones seen in this run to prevent intra-batch duplicates
    const seenPhones = new Map<string, string>() // normalisedPhone → family_account_id

    // ── Create batch record ────────────────────────────────────────────────────
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('zawaaj_import_batches')
      .insert({
        imported_by:   user.id,
        filename:      'family-csv-upload',
        row_count:     rows.length,
        success_count: 0,
        error_count:   0,
        status:        'processing',
        is_test_run:   false,
      })
      .select('id')
      .single()

    if (batchErr || !batch) {
      return NextResponse.json({ error: batchErr?.message ?? 'Failed to create batch' }, { status: 500 })
    }

    const batchId = batch.id as string
    const now = new Date().toISOString()

    // ── Process rows ────────────────────────────────────────────────────────────
    const results: RowResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i]
      const rowNum = i + 2

      const rowMap: Record<string, string> = {
        candidate_name:              get(values, 'candidate_name'),
        age:                         get(values, 'age'),
        gender:                      get(values, 'gender').toLowerCase(),
        city:                        get(values, 'city'),
        ethnicity:                   get(values, 'ethnicity'),
        profile_text:                get(values, 'profile_text'),
        representative_name:         get(values, 'representative_name'),
        representative_relationship: get(values, 'representative_relationship') || 'mother',
        representative_phone:        get(values, 'representative_phone'),
        representative_email:        get(values, 'representative_email'),
        female_representative_name:  get(values, 'female_representative_name'),
        female_representative_phone: get(values, 'female_representative_phone'),
      }

      const repPhone = rowMap.representative_phone
      const repEmail = rowMap.representative_email

      // SKIP: critical contact info missing
      if (!repPhone && !repEmail) {
        results.push({ row: rowNum, candidate_name: rowMap.candidate_name || '—', success: false, error: 'Missing both representative phone and email — skipped' })
        continue
      }

      const { score, missing } = computeCompletenessScore(rowMap)
      const normPhone = repPhone ? normalisePhone(repPhone) : null

      // ── Find or create family account ──────────────────────────────────────────
      let familyAccountId: string
      let action: 'created_family' | 'linked_existing' = 'created_family'

      // Check DB existing
      const existingFaId = normPhone ? (phoneToFamilyId.get(normPhone) ?? null) : null
      // Check intra-batch
      const batchFaId = normPhone ? (seenPhones.get(normPhone) ?? null) : null

      if (existingFaId || batchFaId) {
        familyAccountId = (existingFaId ?? batchFaId) as string
        action = 'linked_existing'
      } else {
        // Determine if male relationship → need female rep (set no_female_contact_flag if none)
        const MALE_RELATIONSHIPS = new Set(['father', 'brother', 'uncle', 'male_guardian'])
        const isMaleRep = MALE_RELATIONSHIPS.has(rowMap.representative_relationship)
        const hasFemaleContact = !!rowMap.female_representative_phone

        const { data: newFa, error: faErr } = await supabaseAdmin
          .from('zawaaj_family_accounts')
          .insert({
            contact_full_name:       rowMap.representative_name || null,
            contact_relationship:    rowMap.representative_relationship,
            contact_number:          repPhone || null,
            contact_email:           repEmail || null,
            female_contact_name:     rowMap.female_representative_name || null,
            female_contact_number:   rowMap.female_representative_phone || null,
            city:                    rowMap.city || null,
            plan:                    'voluntary',
            status:                  'pending_email_verification',
            readiness_state:         'candidate_only',
            no_female_contact_flag:  isMaleRep && !hasFemaleContact,
            imported_user:           true,
            terms_agreed:            false,
            registration_path:       'parent',
          })
          .select('id')
          .single()

        if (faErr || !newFa) {
          results.push({ row: rowNum, candidate_name: rowMap.candidate_name || '—', success: false, error: faErr?.message ?? 'Failed to create family account' })
          continue
        }

        familyAccountId = newFa.id as string

        // Add to phone map to prevent intra-batch duplicates
        if (normPhone) {
          phoneToFamilyId.set(normPhone, familyAccountId)
          seenPhones.set(normPhone, familyAccountId)
        }
      }

      // ── Create profile ─────────────────────────────────────────────────────────
      const displayInitials = computeInitials(rowMap.candidate_name)
      const nameParts = rowMap.candidate_name.trim().split(/\s+/)
      const firstName = nameParts[0] ?? ''
      const lastName  = nameParts.slice(1).join(' ') || ''

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('zawaaj_profiles')
        .insert({
          family_account_id:     familyAccountId,
          display_initials:      displayInitials,
          first_name:            firstName || null,
          last_name:             lastName  || null,
          gender:                rowMap.gender || null,
          age_display:           rowMap.age || null,
          location:              rowMap.city || null,
          ethnicity:             rowMap.ethnicity || null,
          bio:                   rowMap.profile_text || null,
          status:                'pending',
          consent_given:         true,
          terms_agreed:          true,
          needs_claim:           true,
          imported_user:         true,
          imported_at:           now,
          imported_by:           user.id,
          data_completeness_score: score,
          missing_fields_json:   missing.length > 0 ? JSON.stringify(missing) : null,
          submitted_date:        now,
        })
        .select('id')
        .single()

      if (profileErr || !profile) {
        results.push({ row: rowNum, candidate_name: rowMap.candidate_name || '—', success: false, error: profileErr?.message ?? 'Failed to create profile' })
        continue
      }

      results.push({
        row: rowNum,
        candidate_name: rowMap.candidate_name,
        success: true,
        error: null,
        family_account_id: familyAccountId,
        profile_id: profile.id as string,
        action,
      })
    }

    // ── Update batch record ────────────────────────────────────────────────────
    const successCount = results.filter(r => r.success).length
    const errorCount   = results.length - successCount
    const errorRows    = results.filter(r => !r.success)

    await supabaseAdmin
      .from('zawaaj_import_batches')
      .update({
        success_count: successCount,
        error_count:   errorCount,
        status:        errorCount === results.length ? 'failed' : 'complete',
        errors:        errorRows.length > 0 ? errorRows : null,
        completed_at:  now,
      })
      .eq('id', batchId)

    return NextResponse.json({
      success:     successCount,
      errors:      errorCount,
      batchId,
      results: results.filter(r => r.success).map(r => ({
        candidate_name: r.candidate_name,
        family_account_id: r.family_account_id,
        profile_id: r.profile_id,
        action: r.action,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
