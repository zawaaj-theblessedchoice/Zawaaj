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
import { createClient } from '@/lib/supabase/server'
import { validateFamilyAccount } from '@/lib/zawaaj/validateFamilyAccount'
import { sendEmail, emailVerificationTemplate } from '@/lib/email'

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
  islamicBackground?:   string
  smoker?:              boolean | null
  placeOfBirth?:        string
}

interface FamilyRegistrationPayload {
  path:                    'parent' | 'child'
  email:                   string
  password:                string
  // Primary contact — all required (skipped when invite_token is provided)
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
  // Invite token — when provided the family account already exists;
  // skip creation and link the new profile to the existing account instead.
  invite_token?:           string
  // Logged-in parent adding a profile — family account already exists and the
  // caller is authenticated. Skip auth user creation entirely.
  logged_in_family_account_id?: string
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
      termsAgreed, profile, invite_token, logged_in_family_account_id } = body

    // Email/password are not required when a logged-in parent adds a profile —
    // they already have an auth session. All other paths need them.
    if (!logged_in_family_account_id && (!email || !password))
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

    if (!termsAgreed)
      return NextResponse.json({ error: 'Terms must be agreed to.' }, { status: 400 })

    // ── Invite-token path ─────────────────────────────────────────────────────
    // When a valid invite_token is provided the family account already exists —
    // skip family account creation entirely and link directly.
    if (invite_token) {
      // Validate the token
      const { data: tokenRow, error: tokenErr } = await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .select('id, purpose, family_account_id, accepted_at, expires_at')
        .eq('token', invite_token)
        .maybeSingle()

      if (tokenErr || !tokenRow)
        return NextResponse.json({ error: 'Invalid invite link.' }, { status: 404 })
      if (tokenRow.accepted_at)
        return NextResponse.json({ error: 'This invite link has already been used.' }, { status: 409 })
      if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date())
        return NextResponse.json({ error: 'This invite link has expired.' }, { status: 410 })
      if (tokenRow.purpose !== 'child_invite' && tokenRow.purpose !== 'guardian_invite')
        return NextResponse.json({ error: 'Invalid invite link.' }, { status: 404 })

      if (path === 'child') {
        if (!profile)
          return NextResponse.json({ error: 'Profile details are required.' }, { status: 400 })
        if (!profile.firstName || !profile.lastName || !profile.dateOfBirth || !profile.gender || !profile.location || !profile.schoolOfThought)
          return NextResponse.json({ error: 'Required profile fields are missing.' }, { status: 400 })
      }

      const existingFamilyAccountId = tokenRow.family_account_id as string

      // 1. Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (authError || !authData.user) {
        const msg = authError?.message ?? ''
        const isExisting = msg.toLowerCase().includes('already') || authError?.status === 422
        if (isExisting)
          return NextResponse.json({ error: 'email_exists', message: 'An account with this email already exists.' }, { status: 409 })
        return NextResponse.json({ error: msg || 'Failed to create account.' }, { status: 400 })
      }
      const userId = authData.user.id

      // 2. Create profile linked to existing family account
      let profileId: string | null = null
      if (path === 'child' && profile) {
        const initials = ((profile.firstName?.[0] ?? '') + (profile.lastName?.[0] ?? '')).toUpperCase() || '??'
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('zawaaj_profiles')
          .insert({
            user_id: userId, family_account_id: existingFamilyAccountId,
            display_initials: initials, first_name: profile.firstName, last_name: profile.lastName,
            date_of_birth: profile.dateOfBirth, gender: profile.gender, height: profile.height ?? null,
            location: profile.location, ethnicity: profile.ethnicity ?? null, nationality: profile.nationality ?? null,
            languages_spoken: profile.languagesSpoken ?? null, education_level: profile.educationLevel ?? null,
            education_detail: profile.educationDetail ?? null, profession_detail: profile.professionDetail ?? null,
            school_of_thought: profile.schoolOfThought, religiosity: profile.religiosity ?? null,
            prayer_regularity: profile.prayerRegularity ?? null,
            wears_hijab: profile.gender === 'female' ? (profile.wearsHijab ?? null) : null,
            wears_niqab: profile.gender === 'female' ? (profile.wearsNiqab ?? null) : null,
            wears_abaya: profile.gender === 'female' ? (profile.wearsAbaya ?? null) : null,
            keeps_beard: profile.gender === 'male' ? (profile.keepsBeard ?? null) : null,
            quran_engagement_level: profile.quranEngagementLevel ?? null,
            bio: profile.bio ?? null,
            pref_age_min: profile.prefAgeMin ?? null, pref_age_max: profile.prefAgeMax ?? null,
            pref_location: profile.prefLocation ?? null, pref_ethnicity: profile.prefEthnicity ?? null,
            pref_school_of_thought: profile.prefSchoolOfThought ? [profile.prefSchoolOfThought] : null,
            open_to_relocation: profile.openToRelocation ?? null,
            open_to_partners_children: profile.openToPartnersChildren ?? null,
            marital_status: profile.maritalStatus ?? null, has_children: profile.hasChildren ?? null,
            islamic_background: profile.islamicBackground || null,
            smoker: profile.smoker !== undefined ? profile.smoker : null,
            place_of_birth: profile.placeOfBirth || null,
            imported_email: email, // store auth email for admin search
            status: 'pending', profile_complete: true, created_by_child: true,
            consent_given: true, terms_agreed: true, submitted_date: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (profileError || !newProfile) {
          await supabaseAdmin.auth.admin.deleteUser(userId)
          return NextResponse.json({ error: profileError?.message ?? 'Failed to create profile.' }, { status: 500 })
        }
        profileId = newProfile.id
      }

      // 3. User settings
      await supabaseAdmin.from('zawaaj_user_settings')
        .upsert({ user_id: userId, active_profile_id: profileId }, { onConflict: 'user_id' })

      // 4. Mark token accepted
      await supabaseAdmin.from('zawaaj_invite_tokens')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', tokenRow.id)

      return NextResponse.json({
        success: true, path, familyAccountId: existingFamilyAccountId,
        profileId, contactEmail: email, emailSent: false,
      })
    }

    // ── Logged-in parent path ─────────────────────────────────────────────────
    // The caller is already authenticated and already has a family account.
    // Skip auth user creation — use the session's existing user.
    if (logged_in_family_account_id) {
      // Verify the caller is authenticated
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
      }

      // Verify the user actually owns the claimed family account
      const { data: faRow, error: faErr } = await supabaseAdmin
        .from('zawaaj_family_accounts')
        .select('id, primary_user_id')
        .eq('id', logged_in_family_account_id)
        .eq('primary_user_id', user.id)
        .maybeSingle()

      if (faErr || !faRow) {
        return NextResponse.json({ error: 'Family account not found or access denied.' }, { status: 403 })
      }

      if (path === 'child') {
        if (!profile) {
          return NextResponse.json({ error: 'Profile details are required.' }, { status: 400 })
        }
        if (!profile.firstName || !profile.lastName || !profile.dateOfBirth || !profile.gender || !profile.location || !profile.schoolOfThought) {
          return NextResponse.json({ error: 'Required profile fields are missing.' }, { status: 400 })
        }
      }

      // Create profile row linked to the existing family account
      let profileId: string | null = null
      if (path === 'child' && profile) {
        const initials = ((profile.firstName?.[0] ?? '') + (profile.lastName?.[0] ?? '')).toUpperCase() || '??'
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('zawaaj_profiles')
          .insert({
            user_id: user.id, family_account_id: logged_in_family_account_id,
            display_initials: initials, first_name: profile.firstName, last_name: profile.lastName,
            date_of_birth: profile.dateOfBirth, gender: profile.gender, height: profile.height ?? null,
            location: profile.location, ethnicity: profile.ethnicity ?? null, nationality: profile.nationality ?? null,
            languages_spoken: profile.languagesSpoken ?? null, education_level: profile.educationLevel ?? null,
            education_detail: profile.educationDetail ?? null, profession_detail: profile.professionDetail ?? null,
            school_of_thought: profile.schoolOfThought, religiosity: profile.religiosity ?? null,
            prayer_regularity: profile.prayerRegularity ?? null,
            wears_hijab: profile.gender === 'female' ? (profile.wearsHijab ?? null) : null,
            wears_niqab: profile.gender === 'female' ? (profile.wearsNiqab ?? null) : null,
            wears_abaya: profile.gender === 'female' ? (profile.wearsAbaya ?? null) : null,
            keeps_beard: profile.gender === 'male' ? (profile.keepsBeard ?? null) : null,
            quran_engagement_level: profile.quranEngagementLevel ?? null,
            bio: profile.bio ?? null,
            pref_age_min: profile.prefAgeMin ?? null, pref_age_max: profile.prefAgeMax ?? null,
            pref_location: profile.prefLocation ?? null, pref_ethnicity: profile.prefEthnicity ?? null,
            pref_school_of_thought: profile.prefSchoolOfThought ? [profile.prefSchoolOfThought] : null,
            open_to_relocation: profile.openToRelocation ?? null,
            open_to_partners_children: profile.openToPartnersChildren ?? null,
            marital_status: profile.maritalStatus ?? null, has_children: profile.hasChildren ?? null,
            islamic_background: profile.islamicBackground || null,
            smoker: profile.smoker !== undefined ? profile.smoker : null,
            place_of_birth: profile.placeOfBirth || null,
            imported_email: user.email ?? null,
            status: 'pending', profile_complete: true, created_by_child: true,
            consent_given: true, terms_agreed: true, submitted_date: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (profileError || !newProfile) {
          return NextResponse.json({ error: profileError?.message ?? 'Failed to create profile.' }, { status: 500 })
        }
        profileId = newProfile.id
      }

      // Update user settings to point active_profile_id at the new profile
      await supabaseAdmin.from('zawaaj_user_settings')
        .upsert({ user_id: user.id, active_profile_id: profileId }, { onConflict: 'user_id' })

      return NextResponse.json({
        success: true, path, familyAccountId: logged_in_family_account_id, profileId,
      })
    }

    // ── Standard path (no invite token) ──────────────────────────────────────

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
        status:                      'pending_email_verification',
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
          pref_school_of_thought: profile.prefSchoolOfThought ? [profile.prefSchoolOfThought] : null,
          open_to_relocation:    profile.openToRelocation  ?? null,
          open_to_partners_children: profile.openToPartnersChildren ?? null,
          marital_status:        profile.maritalStatus     ?? null,
          has_children:          profile.hasChildren       ?? null,
          islamic_background:    profile.islamicBackground || null,
          smoker:                profile.smoker !== undefined ? profile.smoker : null,
          place_of_birth:        profile.placeOfBirth      || null,
          imported_email:        email, // store auth email for admin search
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

    // ── 5. Create email verification token ───────────────────────────────────
    //
    // child path: verify the candidate's own account email (form.email / `email`)
    // parent path: verify the guardian's contact email (same person, just stored as contactEmail)
    const verificationEmail = path === 'child' ? email : contactEmail

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .insert({
        family_account_id: familyAccountId,
        purpose: 'email_verification',
        invited_email: verificationEmail,
        created_by: userId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (tokenError || !tokenRow) {
      console.error('[register/family] token insert error:', tokenError?.message ?? 'no row returned')
      // Don't block registration — user can resend from holding screen.
      // But signal to client so it can log a warning if needed.
      return NextResponse.json({
        success: true, path, familyAccountId, profileId,
        contactEmail: verificationEmail,
        emailSent: false, emailError: 'token_create_failed',
      })
    }

    const verifyLink = `https://www.zawaaj.uk/register/verify?token=${tokenRow.token}`
    const emailResult = await sendEmail({
      to: verificationEmail,
      subject: 'Verify your Zawaaj account',
      html: emailVerificationTemplate(verifyLink, verificationEmail),
    })

    if (!emailResult.ok) {
      console.error('[register/family] email send failed:', emailResult.error)
    }

    return NextResponse.json({
      success: true, path, familyAccountId, profileId,
      contactEmail: verificationEmail,
      emailSent: emailResult.ok,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
