import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RowResultStatus = 'valid' | 'skipped' | 'duplicate' | 'existing_family' | 'missing_data'

export interface PreviewRow {
  row: number
  candidate_name: string
  gender: string
  city: string
  representative_name: string
  representative_email: string
  representative_phone: string
  status: RowResultStatus
  completeness_score: number
  missing_fields: string[]
  error: string | null
  existing_family_id: string | null
}

export interface PreviewResult {
  rows: PreviewRow[]
  validCount: number
  skippedCount: number
  duplicateCount: number
  existingFamilyCount: number
  missingDataCount: number
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
  // Strip all non-digits, then convert leading 0 to 44 (UK)
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '44' + digits.slice(1)
  return digits
}

// ─── Completeness scoring ──────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['candidate_name', 'age', 'gender', 'city', 'representative_phone', 'representative_email'] as const
const OPTIONAL_FIELDS = ['ethnicity', 'profile_text', 'female_representative_name', 'female_representative_phone'] as const

function computeCompletnessScore(row: Record<string, string>): { score: number; missing: string[] } {
  const requiredScore = REQUIRED_FIELDS.filter(f => row[f]?.trim()).length / REQUIRED_FIELDS.length * 70
  const optionalScore = OPTIONAL_FIELDS.filter(f => row[f]?.trim()).length / OPTIONAL_FIELDS.length * 30
  const score = Math.round(requiredScore + optionalScore)
  const missing = REQUIRED_FIELDS.filter(f => !row[f]?.trim()) as unknown as string[]
  return { score, missing }
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

    // Load all existing contact numbers and female contact numbers for duplicate detection
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

    // Track phones seen in this CSV to catch intra-CSV duplicates
    const seenPhones = new Map<string, number>() // normalisedPhone → first row number

    const previewRows: PreviewRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i]
      const rowNum = i + 2 // 1-indexed, skipping header

      const rowMap: Record<string, string> = {
        candidate_name:             get(values, 'candidate_name'),
        age:                        get(values, 'age'),
        gender:                     get(values, 'gender'),
        city:                       get(values, 'city'),
        ethnicity:                  get(values, 'ethnicity'),
        profile_text:               get(values, 'profile_text'),
        representative_name:        get(values, 'representative_name'),
        representative_relationship: get(values, 'representative_relationship'),
        representative_phone:       get(values, 'representative_phone'),
        representative_email:       get(values, 'representative_email'),
        female_representative_name: get(values, 'female_representative_name'),
        female_representative_phone: get(values, 'female_representative_phone'),
      }

      const { score, missing } = computeCompletnessScore(rowMap)

      const repPhone = rowMap.representative_phone
      const repEmail = rowMap.representative_email

      // SKIP: no representative phone AND no representative email
      if (!repPhone && !repEmail) {
        previewRows.push({
          row: rowNum,
          candidate_name: rowMap.candidate_name || '—',
          gender: rowMap.gender || '—',
          city: rowMap.city || '—',
          representative_name: rowMap.representative_name || '—',
          representative_email: repEmail || '—',
          representative_phone: repPhone || '—',
          status: 'skipped',
          completeness_score: score,
          missing_fields: missing,
          error: 'Missing both representative phone and email — cannot contact representative',
          existing_family_id: null,
        })
        continue
      }

      // Duplicate detection — check DB
      const normPhone = repPhone ? normalisePhone(repPhone) : null
      const existingFamilyId = normPhone ? (phoneToFamilyId.get(normPhone) ?? null) : null

      if (existingFamilyId) {
        previewRows.push({
          row: rowNum,
          candidate_name: rowMap.candidate_name || '—',
          gender: rowMap.gender || '—',
          city: rowMap.city || '—',
          representative_name: rowMap.representative_name || '—',
          representative_email: repEmail || '—',
          representative_phone: repPhone || '—',
          status: 'existing_family',
          completeness_score: score,
          missing_fields: missing,
          error: null,
          existing_family_id: existingFamilyId,
        })
        continue
      }

      // Intra-CSV duplicate
      if (normPhone && seenPhones.has(normPhone)) {
        previewRows.push({
          row: rowNum,
          candidate_name: rowMap.candidate_name || '—',
          gender: rowMap.gender || '—',
          city: rowMap.city || '—',
          representative_name: rowMap.representative_name || '—',
          representative_email: repEmail || '—',
          representative_phone: repPhone || '—',
          status: 'duplicate',
          completeness_score: score,
          missing_fields: missing,
          error: `Duplicate phone — same as row ${seenPhones.get(normPhone) ?? '?'}`,
          existing_family_id: null,
        })
        continue
      }

      if (normPhone) seenPhones.set(normPhone, rowNum)

      // Missing critical data (score < 100 for required fields)
      if (missing.length > 0) {
        previewRows.push({
          row: rowNum,
          candidate_name: rowMap.candidate_name || '—',
          gender: rowMap.gender || '—',
          city: rowMap.city || '—',
          representative_name: rowMap.representative_name || '—',
          representative_email: repEmail || '—',
          representative_phone: repPhone || '—',
          status: 'missing_data',
          completeness_score: score,
          missing_fields: missing,
          error: null,
          existing_family_id: null,
        })
        continue
      }

      previewRows.push({
        row: rowNum,
        candidate_name: rowMap.candidate_name,
        gender: rowMap.gender,
        city: rowMap.city,
        representative_name: rowMap.representative_name,
        representative_email: repEmail,
        representative_phone: repPhone,
        status: 'valid',
        completeness_score: score,
        missing_fields: missing,
        error: null,
        existing_family_id: null,
      })
    }

    const result: PreviewResult = {
      rows: previewRows,
      validCount:         previewRows.filter(r => r.status === 'valid').length,
      skippedCount:       previewRows.filter(r => r.status === 'skipped').length,
      duplicateCount:     previewRows.filter(r => r.status === 'duplicate').length,
      existingFamilyCount: previewRows.filter(r => r.status === 'existing_family').length,
      missingDataCount:   previewRows.filter(r => r.status === 'missing_data').length,
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
