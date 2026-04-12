// POST /api/register/family
//
// Creates a family account + auth user for both registration paths:
//   path = 'parent' — creates family account only; no profile row
//   path = 'child'  — creates family account + profile row linked to it
//
// Runs entirely with the admin client (service role) to:
//   • bypass email confirmation
//   • bypass RLS on INSERT
//   • keep all operations atomic via sequential calls

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateFamilyAccount } from '@/lib/zawaaj/validateFamilyAccount'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileFields {
  firstName:            string
  lastName:             string
  dateOfBirth:          string
  gender:               'male' | 'female'
  height?:              string
  location:             string
  ethnicity?:           string
  nationality?:         string
  languagesSpoken?:     string[]
  educationLevel?:      string
  educationDetail?:     string
  professionDetail?:    string
  schoolOfThought:      string
  religiosity?:         string
  prayerRegularity?:    string
  wearsHijab?:          boolean | null
  wearsNiqab?:          string
  wearsAbaya?:          string
  keepsBeard?:          boolean | null
  quranEngagementLevel?: string
  bio?:                 string
  prefAgeMin?:          number | null
  prefAgeMax?:          number | null
  prefLocation?:        string
  prefEthnicity?:       string
  prefSchoolOfThought?: string
  openToRelocation?:    string
  openToPartnersChildren?: string
  maritalStatus?:       string
  hasChildren?:         boolean | null
}

interface FamilyRegistrationPayload {
  path:                    'parent' | 'child'
  email:                   string
  password:                string
  // Primary contact — all required
  contactFullName:         string
  contactRelationship:     string
  contactNumber:           string
  contactEmail:            string
  // Female fallback (required if male contact)
  femaleContactName?:      string
  femaleContactNumber?:    string
  femaleContactRelationship?: string
  fatherExplanation?:      string
  noFemaleContactFlag?:    boolean
  // Terms
  termsAgreed:             boolean
  // Path B only
  profile?:                ProfileFields
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as FamilyRegistrationPayload

    // ── Validate required fields ──────────────────────────────────────────────

    const { path, email, password,
      contactFullName, contactRelationship, contactNumber, contactEmail,
      femaleContactName, femaleContactNumber, femaleContactRelationship,
      fatherExplanation, noFemaleContactFlag,
      termsAgreed, profile } = body

    if (!email || !password)
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

    if (!termsAgreed)
      return NextResponse.json({ error: 'Terms must be agreed to.' }, { status: 400 })

    // Shared validator — returns per-field errors so the client can highlight fields
    const contactValidation = validateFamilyAccount({
      contact_full_name:    contactFullName    ?? '',
      contact_relationship: contactRelationship ?? '',
      contact_number:       contactNumber      ?? '',
      contact_email:        contactEmail       ?? '',
      female_contact_name:  femaleContactName  ?? null,
      female_contact_number: femaleContactNumber ?? null,
      father_explanation:   fatherExplanation  ?? null,
      no_female_contact_flag: noFemaleContactFlag ?? false,
    })
    if (!contactValidation.valid) {
      return NextResponse.json({ error: 'validation_error', errors: contactValidation.errors }, { status: 400 })
    }

    if (path === 'child') {
      if (!profile)
        return NextResponse.json({ error: 'Profile details are required for child registration.' }, { status: 400 })
      if (!profile.firstName || !profile.lastName || !profile.dateOfBirth || !profile.gender || !profile.location || !profile.schoolOfThought)
        return NextResponse.json({ error: 'Required profile fields are missing.' }, { status: 400 })
    }

    // ── 1. Create auth user ───────────────────────────────────────────────────

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      const msg = authError?.message ?? ''
      const isExisting =
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered') ||
        msg.toLowerCase().includes('already exists') ||
        authError?.status === 422

      if (isExisting) {
        return NextResponse.json(
          { error: 'email_exists', message: 'An account with this email already exists.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: msg || 'Failed to create account.' }, { status: 400 })
    }

    const userId = authData.user.id

    // ── 2. Create family account ──────────────────────────────────────────────

    const { data: familyAccount, error: faError } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .insert({
        primary_user_id:             userId,
        contact_full_name:           contactFullName,
        contact_relationship:        contactRelationship,
        contact_number:              contactNumber,
        contact_email:               contactEmail,
        female_contact_name:         femaleContactName        ?? null,
        female_contact_number:       femaleContactNumber      ?? null,
        female_contact_relationship: femaleContactRelationship ?? null,
        father_explanation:          fatherExplanation        ?? '',
        no_female_contact_flag:      noFemaleContactFlag      ?? false,
        plan:                        'voluntary',
        registration_path:           path,
        terms_agreed:                true,
        terms_agreed_at:             new Date().toISOString(),
        status:                      'pending_approval',
      })
      .select('id')
      .single()

    if (faError || !familyAccount) {
      // Roll back: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: faError?.message ?? 'Failed to create family account.' },
        { status: 500 }
      )
    }

    const familyAccountId = familyAccount.id

    // ── 3. Path B: create profile row ─────────────────────────────────────────

    let profileId: string | null = null

    if (path === 'child' && profile) {
      const initials = (
        (profile.firstName?.[0] ?? '') + (profile.lastName?.[0] ?? '')
      ).toUpperCase() || '??'

      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('zawaaj_profiles')
        .insert({
          user_id:               userId,
          family_account_id:     familyAccountId,
          display_initials:      initials,
          first_name:            profile.firstName,
          last_name:             profile.lastName,
          date_of_birth:         profile.dateOfBirth,
          gender:                profile.gender,
          height:                profile.height            ?? null,
          location:              profile.location,
          ethnicity:             profile.ethnicity         ?? null,
          nationality:           profile.nationality       ?? null,
          languages_spoken:      profile.languagesSpoken   ?? null,
          education_level:       profile.educationLevel    ?? null,
          education_detail:      profile.educationDetail   ?? null,
          profession_detail:     profile.professionDetail  ?? null,
          school_of_thought:     profile.schoolOfThought,
          religiosity:           profile.religiosity       ?? null,
          prayer_regularity:     profile.prayerRegularity  ?? null,
          wears_hijab:           profile.gender === 'female' ? (profile.wearsHijab ?? null) : null,
          wears_niqab:           profile.gender === 'female' ? (profile.wearsNiqab ?? null) : null,
          wears_abaya:           profile.gender === 'female' ? (profile.wearsAbaya ?? null) : null,
          keeps_beard:           profile.gender === 'male'   ? (profile.keepsBeard ?? null) : null,
          quran_engagement_level: profile.quranEngagementLevel ?? null,
          bio:                   profile.bio               ?? null,
          pref_age_min:          profile.prefAgeMin        ?? null,
          pref_age_max:          profile.prefAgeMax        ?? null,
          pref_location:         profile.prefLocation      ?? null,
          pref_ethnicity:        profile.prefEthnicity     ?? null,
          pref_school_of_thought: profile.prefSchoolOfThought ?? null,
          open_to_relocation:    profile.openToRelocation  ?? null,
          open_to_partners_children: profile.openToPartnersChildren ?? null,
          marital_status:        profile.maritalStatus     ?? null,
          has_children:          profile.hasChildren       ?? null,
          status:                'pending',
          profile_complete:      true,
          created_by_child:      true,
          consent_given:         true,
          terms_agreed:          true,
          submitted_date:        new Date().toISOString(),
        })
        .select('id')
        .single()

      if (profileError || !newProfile) {
        // Roll back auth user and family account
        await supabaseAdmin.from('zawaaj_family_accounts').delete().eq('id', familyAccountId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: profileError?.message ?? 'Failed to create profile.' },
          { status: 500 }
        )
      }

      profileId = newProfile.id
    }

    // ── 4. Create user settings ───────────────────────────────────────────────
    // active_profile_id = null for parent path (no profile yet)
    // active_profile_id = profileId for child path

    const { error: settingsError } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .upsert(
        { user_id: userId, active_profile_id: profileId },
        { onConflict: 'user_id' }
      )

    if (settingsError) {
      // Non-fatal — user can still log in; settings row created on next browse visit
      console.error('user_settings upsert failed:', settingsError.message)
    }

    return NextResponse.json({ success: true, path, familyAccountId, profileId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
