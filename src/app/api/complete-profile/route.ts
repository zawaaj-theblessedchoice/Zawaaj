import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  missingMandatoryFields,
  MANDATORY_SELECT,
  type MandatoryProfileFields,
} from '@/lib/zawaaj/profileCompleteness'

// POST /api/complete-profile
//
// Persists the CD-010 completion-form fields for the caller's OWN active profile.
//
// Why this route exists (the infinite-loop fix): claimed/imported profiles have
// zawaaj_profiles.user_id = null (the claim links via user_settings.active_profile_id
// + family_accounts.primary_user_id, never sets the profile's user_id). The RLS
// policy "Users can update their own profile" is USING (auth.uid() = user_id), so a
// CLIENT-side update from the claiming user is silently rejected (0 rows, no error)
// → nothing persists → the gate re-reads incomplete → loop. Writing here via
// supabaseAdmin (service role) bypasses RLS, after we verify the target really is
// the caller's active profile.

interface Body {
  first_name?: string
  last_name?: string
  display_initials?: string
  gender?: string
  location?: string
  age_display?: string
  height?: string
  ethnicity?: string
  education_detail?: string
  profession_detail?: string
  school_of_thought?: string
  spouse_preferences?: string[]
  consent_given?: boolean
}

// Only these columns may be written through this route.
const ALLOWED_COLUMNS = new Set<keyof Body>([
  'first_name', 'last_name', 'display_initials', 'gender', 'location',
  'age_display', 'height', 'ethnicity', 'education_detail', 'profession_detail',
  'school_of_thought', 'spouse_preferences', 'consent_given',
])

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve the caller's active profile — the ONLY profile they may complete here.
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id as string | null
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // Authorisation: confirm this active profile belongs to the caller's family
    // (claimed via primary_user_id) OR is directly owned (user_id). Prevents a
    // caller writing to a profile that isn't theirs even though we use the admin
    // client.
    const { data: target } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, user_id, family_account_id')
      .eq('id', activeProfileId)
      .maybeSingle()

    if (!target) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let authorised = target.user_id === user.id
    if (!authorised && target.family_account_id) {
      const { data: fa } = await supabaseAdmin
        .from('zawaaj_family_accounts')
        .select('primary_user_id')
        .eq('id', target.family_account_id as string)
        .maybeSingle()
      authorised = fa?.primary_user_id === user.id
    }
    if (!authorised) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Sanitise body → only allowed columns.
    const body = await request.json() as Body
    const update: Record<string, unknown> = {}
    for (const key of Object.keys(body) as (keyof Body)[]) {
      if (ALLOWED_COLUMNS.has(key)) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Persist via service role (bypasses the user_id-based RLS that blocks
    // claimed imported profiles).
    const { error: updErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .update(update)
      .eq('id', activeProfileId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Re-read fresh and report whether the profile is now complete, so the client
    // only redirects to /browse when the gate will actually pass.
    const { data: fresh } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select(MANDATORY_SELECT)
      .eq('id', activeProfileId)
      .single()

    const stillMissing = fresh ? missingMandatoryFields(fresh as MandatoryProfileFields) : ['unknown']

    return NextResponse.json({ success: true, complete: stillMissing.length === 0, missing: stillMissing })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
