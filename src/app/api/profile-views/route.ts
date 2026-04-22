import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── POST /api/profile-views ──────────────────────────────────────────────────
// Records a profile view. Called fire-and-forget from BrowseClient when a
// profile card is opened. Silent — never surfaces errors to the user.
//
// Skips recording if:
//   • viewer has no active profile
//   • viewer is the same profile as viewed
//   • viewer and viewed are in the same family account

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { viewed_profile_id?: string }
  const { viewed_profile_id } = body
  if (!viewed_profile_id) return NextResponse.json({ ok: false }, { status: 400 })

  // Resolve viewer's active profile
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const viewerProfileId = settings?.active_profile_id
  if (!viewerProfileId) return NextResponse.json({ ok: false })

  // Do not record self-views
  if (viewerProfileId === viewed_profile_id) {
    return NextResponse.json({ ok: false })
  }

  // Do not record intra-family views
  const [viewerRes, viewedRes] = await Promise.all([
    supabaseAdmin
      .from('zawaaj_profiles')
      .select('family_account_id')
      .eq('id', viewerProfileId)
      .maybeSingle(),
    supabaseAdmin
      .from('zawaaj_profiles')
      .select('family_account_id')
      .eq('id', viewed_profile_id)
      .maybeSingle(),
  ])

  const viewerFam = viewerRes.data?.family_account_id
  const viewedFam = viewedRes.data?.family_account_id

  if (viewerFam && viewedFam && viewerFam === viewedFam) {
    return NextResponse.json({ ok: false })
  }

  // Insert view — use admin client to bypass RLS (SELECT-only policy on this table)
  await supabaseAdmin
    .from('zawaaj_profile_views')
    .insert({
      profile_id: viewed_profile_id,
      viewed_by: viewerProfileId,
      viewed_at: new Date().toISOString(),
    })

  return NextResponse.json({ ok: true })
}

// ─── GET /api/profile-views ───────────────────────────────────────────────────
// Returns view data for the current user's active profile.
// Non-premium: returns count + gated:true (no viewer identities)
// Premium: returns full viewer list (last 30 days, max 20)

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve active profile
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const activeProfileId = settings?.active_profile_id
  if (!activeProfileId) return NextResponse.json({ views: [], gated: false, count: 0 })

  // Resolve plan via subscription
  const { data: sub } = await supabase
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  const plan = (sub?.plan as string | null) ?? 'free'

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Count views in last 30 days
  const { count } = await supabaseAdmin
    .from('zawaaj_profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', activeProfileId)
    .gte('viewed_at', thirtyDaysAgo)

  // Non-premium: gate the list
  if (plan !== 'premium') {
    return NextResponse.json({ gated: true, count: count ?? 0 })
  }

  // Premium: return viewer details
  const { data: views } = await supabaseAdmin
    .from('zawaaj_profile_views')
    .select('viewed_at, viewed_by')
    .eq('profile_id', activeProfileId)
    .gte('viewed_at', thirtyDaysAgo)
    .order('viewed_at', { ascending: false })
    .limit(20)

  if (!views?.length) {
    return NextResponse.json({ gated: false, count: count ?? 0, views: [] })
  }

  // Resolve viewer profile details
  const viewerIds = [...new Set(views.map(v => v.viewed_by))]
  const { data: viewerProfiles } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, display_initials, age_display, location, gender')
    .in('id', viewerIds)

  const viewerMap = new Map(
    (viewerProfiles ?? []).map(p => [p.id, p])
  )

  const enriched = views.map(v => ({
    viewed_at: v.viewed_at,
    viewer: viewerMap.get(v.viewed_by) ?? null,
  }))

  return NextResponse.json({ gated: false, count: count ?? 0, views: enriched })
}
