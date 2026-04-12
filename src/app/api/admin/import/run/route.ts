import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RowResult {
  row: number
  email: string
  success: boolean
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

// ─── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Accept YYYY-MM-DD (ISO) or DD/MM/YYYY (UK)
const DATE_RE_ISO = /^\d{4}-\d{2}-\d{2}$/
const DATE_RE_UK  = /^\d{2}\/\d{2}\/\d{4}$/
const VALID_GENDERS  = ['male', 'female']
const VALID_STATUSES = ['pending', 'approved', 'paused', 'rejected', 'withdrawn', 'suspended', 'introduced']

/** Convert DD/MM/YYYY → YYYY-MM-DD; ISO dates pass through unchanged. */
function normaliseDOB(dob: string): string {
  if (DATE_RE_UK.test(dob)) {
    const [dd, mm, yyyy] = dob.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  return dob
}

function isValidDOB(dob: string): boolean {
  return DATE_RE_ISO.test(dob) || DATE_RE_UK.test(dob)
}

function validateRow(headers: string[], values: string[]): string | null {
  const get = (col: string) => {
    const idx = headers.indexOf(col)
    return idx >= 0 ? (values[idx] ?? '').trim() : ''
  }
  const email  = get('email')
  const gender = get('gender')
  const status = get('status')
  const dob    = get('date_of_birth')

  if (!email)                return 'email is required'
  if (!EMAIL_RE.test(email)) return `invalid email: "${email}"`
  if (!gender)               return 'gender is required'
  if (!VALID_GENDERS.includes(gender.toLowerCase()))
    return `gender must be "male" or "female", got "${gender}"`
  if (status && !VALID_STATUSES.includes(status.toLowerCase()))
    return `invalid status: "${status}"`
  if (dob && !isValidDOB(dob))
    return `date_of_birth must be YYYY-MM-DD or DD/MM/YYYY, got "${dob}"`
  return null
}

// ─── Normalise religiosity to accepted enum values ───────────────────────────

function normaliseReligiosity(raw: string): string | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (['steadfast', 'very_practicing', 'very practicing', 'very practising'].includes(v)) return 'steadfast'
  if (['practising', 'practicing', 'moderately_practising', 'moderately practising', 'moderately practicing'].includes(v)) return 'practising'
  if (['striving', 'learning', 'still learning / growing', 'still learning'].includes(v)) return 'striving'
  // cultural / unknown → null (no valid mapping)
  return null
}

// ─── Compute display initials from first/last name ────────────────────────────

function computeInitials(first: string, last: string): string {
  const f = first.trim().charAt(0).toUpperCase()
  const l = last.trim().charAt(0).toUpperCase()
  if (f && l) return `${f}${l}`
  if (f) return f
  if (l) return l
  return 'XX'
}

// ─── Compute age display from date_of_birth ───────────────────────────────────

function computeAgeDisplay(dob: string): string | null {
  if (!DATE_RE_ISO.test(dob)) return null
  const birth = new Date(dob)
  const now   = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return String(age)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: _role } = await supabase.rpc('zawaaj_get_role'); const isSuperAdmin = _role === 'super_admin'
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zawaaj.uk'

    // ── Create batch record ────────────────────────────────────────────────────
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('zawaaj_import_batches')
      .insert({
        imported_by:   user.id,
        filename:      'csv-upload',
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

    // ── Process rows one-by-one ────────────────────────────────────────────────
    const results: RowResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i]
      const rowNum = i + 2

      const validationError = validateRow(headers, values)
      if (validationError) {
        results.push({ row: rowNum, email: get(values, 'email'), success: false, error: validationError })
        continue
      }

      const email        = get(values, 'email')
      const firstName    = get(values, 'first_name')
      const lastName     = get(values, 'last_name')
      const gender       = get(values, 'gender').toLowerCase()
      const city         = get(values, 'city')
      const country      = get(values, 'country')
      const nationality  = get(values, 'nationality')
      const ethnicity    = get(values, 'ethnicity')
      const languages    = get(values, 'languages')
      const profession   = get(values, 'profession')
      const education    = get(values, 'education')
      const institution  = get(values, 'institution')
      const schoolOfThought = get(values, 'school_of_thought')
      const religiosity  = get(values, 'religiosity')
      const prayerReg    = get(values, 'prayer_regularity')
      const wearsHijabRaw = get(values, 'wears_hijab')
      const keepsBeardRaw = get(values, 'keeps_beard')
      const maritalStatus = get(values, 'marital_status')
      const hasChildrenRaw = get(values, 'has_children')
      const height        = get(values, 'height')
      const livingSit     = get(values, 'living_situation')
      const openReloc     = get(values, 'open_to_relocating')
      const openPartnerChild = get(values, 'open_to_partners_children')
      const prefAgeMinRaw = get(values, 'pref_age_min')
      const prefAgeMaxRaw = get(values, 'pref_age_max')
      const prefLocation  = get(values, 'pref_location')
      const prefEthnicity = get(values, 'pref_ethnicity')
      const prefSchool    = get(values, 'pref_school_of_thought')
      const prefReloc     = get(values, 'pref_relocation')
      const bio           = get(values, 'bio')
      const statusRaw     = get(values, 'status') || 'pending'
      // Normalise DD/MM/YYYY → YYYY-MM-DD so storage and age calc are always ISO
      const dobRaw        = get(values, 'date_of_birth') ? normaliseDOB(get(values, 'date_of_birth')) : ''

      // Derived fields
      const displayInitials = computeInitials(firstName, lastName)
      const ageDisplay      = dobRaw ? computeAgeDisplay(dobRaw) : null
      const location        = [city, country].filter(Boolean).join(', ') || null
      const wearsHijab      = wearsHijabRaw !== '' ? wearsHijabRaw.toLowerCase() === 'true' : null
      const keepsBeard      = keepsBeardRaw !== '' ? keepsBeardRaw.toLowerCase() === 'true' : null
      const hasChildren     = hasChildrenRaw !== '' ? hasChildrenRaw.toLowerCase() === 'true' : null
      const prefAgeMin      = prefAgeMinRaw !== '' ? parseInt(prefAgeMinRaw, 10) || null : null
      const prefAgeMax      = prefAgeMaxRaw !== '' ? parseInt(prefAgeMaxRaw, 10) || null : null
      const now             = new Date().toISOString()

      // ── 1. Create auth user (or link to existing on retry) ──────────────────
      let newUserId: string
      let isNewAuthUser = false

      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      })

      if (authUser?.user) {
        newUserId    = authUser.user.id
        isNewAuthUser = true
      } else {
        // Detect duplicate-email error and attempt to link to the existing user
        const isDuplicate =
          authErr?.message?.toLowerCase().includes('already') ||
          authErr?.message?.toLowerCase().includes('registered')

        if (!isDuplicate) {
          results.push({ row: rowNum, email, success: false, error: authErr?.message ?? 'Failed to create auth user' })
          continue
        }

        // Find the pre-existing auth user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        if (!existingAuthUser) {
          results.push({ row: rowNum, email, success: false, error: 'User already registered but could not be located — please delete from Auth and retry' })
          continue
        }

        // Check for an existing profile so we do not create a duplicate
        const { data: existingProfile } = await supabaseAdmin
          .from('zawaaj_profiles')
          .select('id')
          .eq('user_id', existingAuthUser.id)
          .maybeSingle()

        if (existingProfile) {
          results.push({ row: rowNum, email, success: false, error: 'Profile already exists for this email — skipped' })
          continue
        }

        newUserId = existingAuthUser.id
      }

      // ── 2. Insert profile ────────────────────────────────────────────────────
      const profilePayload: Record<string, unknown> = {
        user_id:                newUserId,
        imported_email:         email,
        display_initials:       displayInitials,
        first_name:             firstName || null,
        last_name:              lastName  || null,
        gender,
        date_of_birth:          dobRaw    || null,
        age_display:            ageDisplay,
        height:                 height    || null,
        ethnicity:              ethnicity || null,
        nationality:            nationality || null,
        languages_spoken:       languages ? languages.split(',').map(s => s.trim()).filter(Boolean) : null,
        school_of_thought:      schoolOfThought || null,
        education_level:        education || null,
        education_detail:       institution || null,
        profession_detail:      profession || null,
        location:               location,
        religiosity:            religiosity ? normaliseReligiosity(religiosity) : null,
        prayer_regularity:      prayerReg   || null,
        wears_hijab:            gender === 'female' ? wearsHijab : null,
        keeps_beard:            gender === 'male'   ? keepsBeard : null,
        marital_status:         maritalStatus || null,
        has_children:           hasChildren,
        living_situation:       livingSit || null,
        open_to_relocation:     openReloc || null,
        open_to_partners_children: openPartnerChild || null,
        pref_age_min:           prefAgeMin,
        pref_age_max:           prefAgeMax,
        pref_location:          prefLocation || null,
        pref_ethnicity:         prefEthnicity || null,
        pref_school_of_thought: prefSchool ? [prefSchool] : null,
        pref_relocation:        prefReloc || null,
        bio:                    bio || null,
        status:                 statusRaw,
        consent_given:          true,
        terms_agreed:           true,
        submitted_date:         now,
        approved_date:          statusRaw === 'approved' ? now : null,
        listed_at:              statusRaw === 'approved' ? now : null,
      }

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('zawaaj_profiles')
        .insert(profilePayload)
        .select('id')
        .single()

      if (profileErr || !profile) {
        // Roll back auth user only if we created it — don't delete a pre-existing account
        if (isNewAuthUser) await supabaseAdmin.auth.admin.deleteUser(newUserId)
        results.push({
          row: rowNum,
          email,
          success: false,
          error: profileErr?.message ?? 'Failed to insert profile',
        })
        continue
      }

      const profileId = profile.id as string

      // ── 3. Insert user settings ──────────────────────────────────────────────
      const { error: settingsErr } = await supabaseAdmin
        .from('zawaaj_user_settings')
        .insert({ user_id: newUserId, active_profile_id: profileId })

      if (settingsErr) {
        // Non-fatal — log but continue
        console.error(`[import] user_settings insert failed for ${email}:`, settingsErr.message)
      }

      // ── 4. Insert free subscription ──────────────────────────────────────────
      const { error: subErr } = await supabaseAdmin
        .from('zawaaj_subscriptions')
        .insert({
          user_id: newUserId,
          plan:    'free',
          status:  'active',
        })

      if (subErr) {
        console.error(`[import] subscription insert failed for ${email}:`, subErr.message)
      }

      // ── 5. Send password reset / welcome email ───────────────────────────────
      const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type:       'recovery',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/browse`,
        },
      })

      if (linkErr) {
        console.error(`[import] generateLink failed for ${email}:`, linkErr.message)
        // Non-fatal — account is still created
      }

      results.push({ row: rowNum, email, success: true, error: null })
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
        completed_at:  new Date().toISOString(),
      })
      .eq('id', batchId)

    return NextResponse.json({
      success:  successCount,
      errors:   errorCount,
      batchId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
