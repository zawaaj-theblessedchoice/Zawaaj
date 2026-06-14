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

// ─── DOB → age (privacy: we store AGE only, never persist DOB) ────────────────
// Accepts common formats (ISO YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY). Returns the
// integer age, or null if unparseable. The DOB value itself is discarded by the
// caller — it never reaches the DB.
function dobToAge(dob: string): number | null {
  const s = dob.trim()
  if (!s) return null
  let d: Date | null = null

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    d = new Date(s)
  } else {
    // DD/MM/YYYY or DD-MM-YYYY (UK form — day first)
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (m) {
      const day = parseInt(m[1], 10), month = parseInt(m[2], 10), year = parseInt(m[3], 10)
      d = new Date(year, month - 1, day)
    }
  }

  if (!d || isNaN(d.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const mo = now.getMonth() - d.getMonth()
  if (mo < 0 || (mo === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 120 ? age : null
}

// ─── Phone normalisation ───────────────────────────────────────────────────────

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '44' + digits.slice(1)
  return digits
}

// ─── Completeness scoring ──────────────────────────────────────────────────────

// 'age' is satisfied by either an `age` column OR a `dob` column (converted at
// parse time); representative contact is phone OR email. Completeness scoring
// treats them as present if either source is.
const REQUIRED_FIELDS = ['candidate_name', 'age', 'gender', 'city', 'representative_phone', 'representative_email'] as const
const OPTIONAL_FIELDS = [
  'ethnicity', 'profile_text', 'female_representative_name', 'female_representative_phone',
  'height', 'education', 'profession', 'madhhab', 'best_describes', 'spouse_preferences', 'consent',
] as const

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

      // Age: prefer an explicit `age` column; otherwise convert a `dob` column to
      // age at parse time. The DOB string is NEVER stored (privacy promise).
      const ageColumn = get(values, 'age')
      const dobColumn = get(values, 'dob') || get(values, 'date_of_birth')
      const resolvedAge = ageColumn.trim()
        ? ageColumn.trim()
        : (dobColumn.trim() ? (dobToAge(dobColumn)?.toString() ?? '') : '')

      const rowMap: Record<string, string> = {
        candidate_name:              get(values, 'candidate_name'),
        age:                         resolvedAge,
        gender:                      get(values, 'gender').toLowerCase(),
        city:                        get(values, 'city'),
        ethnicity:                   get(values, 'ethnicity'),
        profile_text:                get(values, 'profile_text'),
        // ── Extended intake fields (all map to existing columns) ──
        height:                      get(values, 'height'),
        education:                   get(values, 'education') || get(values, 'qualifications'),
        profession:                  get(values, 'profession') || get(values, 'occupation'),
        madhhab:                     get(values, 'madhhab') || get(values, 'school_of_thought'),
        best_describes:              get(values, 'best_describes'),
        spouse_preferences:          get(values, 'spouse_preferences') || get(values, 'future_spouse_preferences'),
        consent:                     get(values, 'consent'),
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

      // SKIP: age out of allowed range (18–80)
      const ageRaw = parseInt(rowMap.age, 10)
      if (!rowMap.age?.trim() || isNaN(ageRaw)) {
        results.push({ row: rowNum, candidate_name: rowMap.candidate_name || '—', success: false, error: 'Age is missing or not a valid number — skipped' })
        continue
      }
      if (ageRaw < 18) {
        results.push({ row: rowNum, candidate_name: rowMap.candidate_name || '—', success: false, error: `Age ${ageRaw} is below the minimum of 18 — skipped` })
        continue
      }
      if (ageRaw > 60) {
        results.push({ row: rowNum, candidate_name: rowMap.candidate_name || '—', success: false, error: `Age ${ageRaw} exceeds the maximum of 60 — skipped` })
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

        // "best describes your child": self-registration → 'child', anyone
        // registering on behalf (parent/guardian) → 'parent'. Default 'parent'
        // since the import cohort is representative-led.
        const bd = rowMap.best_describes.toLowerCase()
        const registrationPath = /\b(self|myself|candidate|own)\b/.test(bd) ? 'child' : 'parent'

        const { data: newFa, error: faErr } = await supabaseAdmin
          .from('zawaaj_family_accounts')
          .insert({
            contact_full_name:       rowMap.representative_name || null,
            contact_relationship:    rowMap.representative_relationship,
            contact_number:          repPhone || null,
            contact_email:           repEmail || null,
            female_contact_name:     rowMap.female_representative_name || null,
            female_contact_number:   rowMap.female_representative_phone || null,
            plan:                    'voluntary',
            status:                  'pending_email_verification',
            readiness_state:         'candidate_only',
            no_female_contact_flag:  isMaleRep && !hasFemaleContact,
            imported_user:           true,
            terms_agreed:            false,
            registration_path:       registrationPath,
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
          age_display:           rowMap.age || null,   // age only — DOB never stored
          location:              rowMap.city || null,
          ethnicity:             rowMap.ethnicity || null,
          bio:                   rowMap.profile_text || null,
          // ── Extended intake fields → existing columns ──
          height:                rowMap.height || null,
          education_detail:      rowMap.education || null,
          profession_detail:     rowMap.profession || null,
          school_of_thought:     rowMap.madhhab || null,
          spouse_preferences:    rowMap.spouse_preferences || null,
          status:                'pending',
          // consent_given reflects the family's consent flag when provided; the
          // import itself is admin-mediated, so default true if the column is blank.
          consent_given:         rowMap.consent.trim() ? /^(y|yes|true|1)$/i.test(rowMap.consent.trim()) : true,
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
