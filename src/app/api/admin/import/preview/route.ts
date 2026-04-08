import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewRow {
  row: number
  email: string
  name: string
  gender: string
  status: string
  valid: boolean
  error: string | null
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

// ─── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/
const VALID_GENDERS  = ['male', 'female']
const VALID_STATUSES = ['pending', 'approved', 'paused', 'rejected', 'withdrawn', 'suspended', 'introduced']

function validateRow(
  headers: string[],
  values: string[],
): string | null {
  const get = (col: string) => {
    const idx = headers.indexOf(col)
    return idx >= 0 ? (values[idx] ?? '').trim() : ''
  }

  const email  = get('email')
  const gender = get('gender')
  const status = get('status')
  const dob    = get('date_of_birth')

  if (!email)             return 'email is required'
  if (!EMAIL_RE.test(email)) return `invalid email: "${email}"`
  if (!gender)            return 'gender is required'
  if (!VALID_GENDERS.includes(gender.toLowerCase()))
    return `gender must be "male" or "female", got "${gender}"`
  if (status && !VALID_STATUSES.includes(status.toLowerCase()))
    return `invalid status: "${status}"`
  if (dob && !DATE_RE.test(dob))
    return `date_of_birth must be YYYY-MM-DD, got "${dob}"`

  return null
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

    const previewRows: PreviewRow[] = rows.map((values, i) => {
      const rowNum  = i + 2 // 1-indexed, skipping header
      const email   = get(values, 'email')
      const firstName = get(values, 'first_name')
      const lastName  = get(values, 'last_name')
      const gender  = get(values, 'gender')
      const status  = get(values, 'status') || 'pending'
      const error   = validateRow(headers, values)

      return {
        row: rowNum,
        email,
        name: [firstName, lastName].filter(Boolean).join(' ') || '—',
        gender: gender || '—',
        status,
        valid: error === null,
        error,
      }
    })

    const validCount = previewRows.filter(r => r.valid).length
    const errorCount = previewRows.length - validCount

    return NextResponse.json({ rows: previewRows, validCount, errorCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
