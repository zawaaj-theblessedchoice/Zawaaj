import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchPlanLimits, PLAN_LIMITS_FALLBACK } from '@/lib/config/profileOptions'

// Fallback cap in case plan lookup fails
const HARD_MAX_PROFILES = 6

function ageDisplay(dob: string | undefined): string | null {
  if (!dob) return null
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return `${age}`
}

function toSnakeCase(val: string | undefined): string | undefined {
  if (!val) return undefined
  return val.toLowerCase().replace(/ \/ /g, '_').replace(/ /g, '_')
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      firstName: string
      lastName?: string
      dateOfBirth?: string
      gender: string
      city?: string
      country?: string
      nationality?: string
      maritalStatus?: string
      hasChildren?: boolean | null
      height?: string
      livingSituation?: string
      ethnicity?: string
      languagesSpoken?: string[]
      profession?: string
      educationLevel?: string
      institution?: string
      schoolOfThought?: string
      religiosity?: string
      prayerRegularity?: string
      wearsHijab?: boolean | null
      keepsBeard?: boolean | null
      openToRelocation?: string
      openToPartnersChildren?: string
      polygamyOpenness?: string
      bio?: string
      prefAgeMin?: string
      prefAgeMax?: string
      prefLocation?: string
      prefEthnicity?: string
      prefSchoolOfThought?: string[]
      prefRelocation?: string
      prefPartnerChildren?: string
    }

    const { firstName, lastName, gender } = body
    if (!firstName?.trim() || !gender) {
      return NextResponse.json({ error: 'First name and gender are required.' }, { status: 400 })
    }

    // Determine max profiles allowed for this user's plan
    const { data: subRow } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    // Map legacy 'free' key to 'voluntary' (DB uses 'voluntary')
    const rawPlan = (subRow?.plan ?? 'voluntary') as string
    const planKey = rawPlan === 'free' ? 'voluntary' : rawPlan

    const planLimits = await fetchPlanLimits(supabaseAdmin)
    const maxProfiles = planLimits[planKey]?.maxProfiles ?? PLAN_LIMITS_FALLBACK[planKey as keyof typeof PLAN_LIMITS_FALLBACK]?.maxProfiles ?? HARD_MAX_PROFILES

    // Enforce max profiles per account
    const { count } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= maxProfiles) {
      return NextResponse.json(
        { error: `Maximum of ${maxProfiles} profiles allowed on your current plan.` },
        { status: 409 }
      )
    }

    const initials = (
      (firstName.trim()[0] ?? '') + (lastName?.trim()[0] ?? '')
    ).toUpperCase() || firstName.trim()[0].toUpperCase()

    // Build location string
    const locationParts = [body.city?.trim(), body.country?.trim()].filter(Boolean)
    const location = locationParts.length > 0 ? locationParts.join(', ') : null

    // Map marital status display values to DB snake_case
    const maritalStatusMap: Record<string, string> = {
      'Never married': 'never_married',
      'Divorced': 'divorced',
      'Widowed': 'widowed',
    }
    const marital_status = body.maritalStatus
      ? (maritalStatusMap[body.maritalStatus] ?? toSnakeCase(body.maritalStatus))
      : null

    // Map living situation display values to DB snake_case
    const livingSituationMap: Record<string, string> = {
      'With family': 'with_family',
      'Independently': 'independently',
      'With flatmates': 'with_flatmates',
    }
    const living_situation = body.livingSituation
      ? (livingSituationMap[body.livingSituation] ?? toSnakeCase(body.livingSituation))
      : null

    // Education level → snake_case
    const education_level = body.educationLevel ? toSnakeCase(body.educationLevel) : null

    // openTo fields → snake_case ('Yes'→'yes', 'Possibly'→'possibly', 'No'→'no')
    const open_to_relocation = body.openToRelocation ? body.openToRelocation.toLowerCase() : null
    const open_to_partners_children = body.openToPartnersChildren ? body.openToPartnersChildren.toLowerCase() : null
    const polygamy_openness = body.polygamyOpenness ? body.polygamyOpenness.toLowerCase() : null

    // Age from dob
    const age_display = ageDisplay(body.dateOfBirth)

    // Pref age
    const pref_age_min = body.prefAgeMin ? parseInt(body.prefAgeMin, 10) || null : null
    const pref_age_max = body.prefAgeMax ? parseInt(body.prefAgeMax, 10) || null : null

    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .insert({
        user_id: user.id,
        display_initials: initials,
        first_name: firstName.trim() || null,
        last_name: lastName?.trim() || null,
        date_of_birth: body.dateOfBirth || null,
        age_display,
        gender,
        location,
        nationality: body.nationality?.trim() || null,
        marital_status,
        has_children: body.hasChildren ?? null,
        height: body.height || null,
        living_situation,
        ethnicity: body.ethnicity || null,
        languages_spoken: body.languagesSpoken?.length ? body.languagesSpoken : null,
        profession_detail: body.profession?.trim() || null,
        education_level,
        education_detail: body.institution?.trim() || null,
        school_of_thought: body.schoolOfThought || null,
        religiosity: body.religiosity || null,
        prayer_regularity: body.prayerRegularity || null,
        wears_hijab: body.wearsHijab || null,
        keeps_beard: body.keepsBeard || null,
        open_to_relocation,
        open_to_partners_children,
        polygamy_openness,
        bio: body.bio?.trim() || null,
        pref_age_min,
        pref_age_max,
        pref_location: body.prefLocation?.trim() || null,
        pref_ethnicity: body.prefEthnicity?.trim() || null,
        pref_school_of_thought: body.prefSchoolOfThought?.length ? body.prefSchoolOfThought : null,
        pref_relocation: body.prefRelocation || null,
        pref_partner_children: body.prefPartnerChildren || null,
        status: 'pending',
        submitted_date: new Date().toISOString(),
        consent_given: true,
        terms_agreed: true,
      })
      .select('id')
      .single()

    if (insertError || !newProfile) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile_id: newProfile.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
