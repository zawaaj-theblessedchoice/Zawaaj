import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// PATCH /api/my-profile
//
// Persists edits to the CALLER's own active profile via the service role.
//
// Why this route exists: claimed/imported profiles have zawaaj_profiles.user_id
// = NULL (linked via user_settings.active_profile_id + family_accounts.primary_
// user_id, never via profiles.user_id). The RLS update policy is
// USING (auth.uid() = user_id), so a CLIENT-side update from a claimed member is
// silently rejected (0 rows, no error) — their /my-profile edits, pause/resume,
// and withdraw never persist. We write here with supabaseAdmin (bypasses RLS)
// AFTER verifying the target really is the caller's own active profile.

// Columns a member may edit on their own profile through this route.
const ALLOWED_COLUMNS = new Set<string>([
  'location', 'height', 'languages_spoken', 'living_situation', 'open_to_relocation',
  'open_to_partners_children', 'polygamy_openness', 'profession_detail', 'education_level',
  'education_detail', 'nationality', 'ethnicity', 'school_of_thought', 'religiosity',
  'prayer_regularity', 'wears_hijab', 'wears_niqab', 'wears_abaya', 'keeps_beard',
  'quran_frequency', 'quran_depth', 'quran_application', 'bio', 'pref_age_min',
  'pref_age_max', 'pref_location', 'pref_ethnicity', 'pref_school_of_thought',
  'pref_partner_children', 'pref_relocation', 'islamic_background', 'smoker',
  'place_of_birth', 'marriage_reason', 'open_to_marital_status',
  // Self-service status transitions (pause / resume / withdraw) + reason.
  'status', 'withdrawal_reason',
])

// The only status values a member may set on their OWN profile. Prevents using
// this route to self-approve, mark introduced, etc.
const SELF_STATUS = new Set<string>(['approved', 'paused', 'withdrawn'])

export async function PATCH(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // The ONLY profile a member may edit here is their active profile.
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id as string | null
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // Authorise: the active profile must be directly owned (user_id) OR linked to
    // a family account this user is the primary of (claimed/imported case).
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
    const body = await request.json() as Record<string, unknown>
    const update: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_COLUMNS.has(key)) update[key] = body[key]
    }

    if ('status' in update) {
      const next = update.status
      if (typeof next !== 'string' || !SELF_STATUS.has(next)) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .update(update)
      .eq('id', activeProfileId)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
