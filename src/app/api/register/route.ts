import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// All registration logic runs server-side with the admin client so that:
//  1. Email confirmation is bypassed (private invite-only platform — admin review
//     replaces email gating)
//  2. Profile INSERT is not blocked by RLS (no session exists at signup time)
//  3. Auto-linking to an existing imported profile works regardless of RLS

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as RegistrationPayload
    const { email, password, ...fields } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    // ── 1. Create auth user (email_confirm: true skips the confirmation email) ──
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Members sign in immediately; admin review gates access
    })

    if (authError || !authData.user) {
      // Detect "email already registered" and return a specific, friendly error code
      const msg = authError?.message ?? ''
      const isAlreadyRegistered =
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered') ||
        msg.toLowerCase().includes('already exists') ||
        authError?.status === 422

      if (isAlreadyRegistered) {
        return NextResponse.json(
          { error: 'email_exists', message: 'An account with this email already exists.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: msg || 'Failed to create account.' }, { status: 400 })
    }

    const userId = authData.user.id
    const initials = ((fields.firstName?.[0] ?? '') + (fields.lastName?.[0] ?? '')).toUpperCase() || '??'

    // ── 2. Check for an existing imported profile matching this email ──────────
    // Find unclaimed imported profiles (user_id IS NULL) matching this email.
    // If multiple exist (data anomaly), skip auto-link and create new pending profile.
    const { data: importedProfiles } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, status')
      .eq('imported_email', email)
      .is('user_id', null)

    const existingProfile =
      importedProfiles && importedProfiles.length === 1 ? importedProfiles[0] : null

    const sharedFields = buildSharedFields(userId, initials, fields)
    let profileId: string
    let linked = false

    if (existingProfile) {
      // 2a. Link existing imported profile — preserve status, enrich with wizard data
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_profiles')
        .update(sharedFields)
        .eq('id', existingProfile.id)

      if (updateError) throw new Error(updateError.message)
      profileId = existingProfile.id
      linked = true
    } else {
      // 2b. Brand-new member — create a pending profile for admin review
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('zawaaj_profiles')
        .insert({
          ...sharedFields,
          status: 'pending',
          submitted_date: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError || !newProfile) throw new Error(insertError?.message ?? 'Profile creation failed.')
      profileId = newProfile.id
    }

    // ── 3. Upsert user settings (handles any duplicate from a previous attempt) ─
    const { error: settingsError } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .upsert(
        { user_id: userId, active_profile_id: profileId },
        { onConflict: 'user_id' }
      )

    if (settingsError) throw new Error(settingsError.message)

    return NextResponse.json({ success: true, linked })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface RegistrationPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  gender: string
  dateOfBirth: string
  city: string
  country: string
  nationality: string
  maritalStatus: string
  hasChildren: boolean | null
  height: string
  livingSituation: string
  ethnicity: string
  languagesSpoken: string
  profession: string
  educationLevel: string
  institution: string
  schoolOfThought: string
  religiosity: string
  prayerRegularity: string
  wearsHijab: boolean | null
  keepsBeard: boolean | null
  openToRelocation: string
  openToPartnersChildren: string
  polygamyOpenness: string
  bio: string
  prefAgeMin: string
  prefAgeMax: string
  prefLocation: string
  prefEthnicity: string
  prefSchoolOfThought: string[]
  prefRelocation: string
  prefPartnerChildren: string
}

function buildSharedFields(userId: string, initials: string, f: Omit<RegistrationPayload, 'email' | 'password'>) {
  return {
    user_id: userId,
    display_initials: initials,
    first_name: f.firstName || null,
    last_name: f.lastName || null,
    gender: f.gender || null,
    date_of_birth: f.dateOfBirth || null,
    nationality: f.nationality || null,
    marital_status: f.maritalStatus || null,
    has_children: f.hasChildren,
    languages_spoken: f.languagesSpoken || null,
    height: f.height || null,
    living_situation: f.livingSituation || null,
    ethnicity: f.ethnicity || null,
    school_of_thought: f.schoolOfThought || null,
    education_level: f.educationLevel || null,
    education_detail: f.institution || null,
    profession_detail: f.profession || null,
    location: f.city && f.country ? `${f.city}, ${f.country}` : f.city || f.country || null,
    bio: f.bio || null,
    religiosity: f.religiosity || null,
    prayer_regularity: f.prayerRegularity || null,
    wears_hijab: f.gender === 'female' ? f.wearsHijab : null,
    keeps_beard: f.gender === 'male' ? f.keepsBeard : null,
    open_to_relocation: f.openToRelocation || null,
    open_to_partners_children: f.openToPartnersChildren || null,
    polygamy_openness: f.polygamyOpenness || null,
    pref_age_min: f.prefAgeMin ? parseInt(f.prefAgeMin, 10) : null,
    pref_age_max: f.prefAgeMax ? parseInt(f.prefAgeMax, 10) : null,
    pref_location: f.prefLocation || null,
    pref_ethnicity: f.prefEthnicity || null,
    pref_school_of_thought: f.prefSchoolOfThought?.length > 0 ? f.prefSchoolOfThought : null,
    pref_relocation: f.prefRelocation || null,
    pref_partner_children: f.prefPartnerChildren || null,
    consent_given: true,
    terms_agreed: true,
  }
}
