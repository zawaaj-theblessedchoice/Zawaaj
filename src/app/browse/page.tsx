import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BrowseClient from './BrowseClient'
import type { ProfileRecord } from '@/components/ProfileModal'
import type { Plan } from '@/lib/plans'

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; tab?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 2. Admin check — use the SECURITY DEFINER RPC so it's always authoritative.
  //    Admins never use the member browse UI; send them straight to /admin.
  //    Exception: ?preview=1 lets an admin see the member-facing browse view.
  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (isAdmin && params.preview !== '1') redirect('/admin')

  // 3. Get active_profile_id
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) {
    redirect('/pending')
  }

  const activeProfileId = settings.active_profile_id

  // 3b. Get all profile IDs linked to this account (siblings) so we can exclude them all from browse
  const { data: siblingRows } = await supabase
    .from('zawaaj_profiles')
    .select('id')
    .eq('user_id', user.id)

  const siblingIds: string[] = (siblingRows ?? []).map(r => r.id as string)

  // 4. Get viewer's own profile
  const { data: viewerProfile, error: viewerError } = await supabase
    .from('zawaaj_profiles')
    .select(
      `id, display_initials, first_name, last_name, gender, date_of_birth, age_display,
       location, profession_detail, education_level, school_of_thought, ethnicity,
       languages_spoken, nationality, marital_status, has_children, height, living_situation,
       religiosity, prayer_regularity, wears_hijab, keeps_beard, bio, open_to_relocation,
       open_to_partners_children, pref_age_min, pref_age_max, pref_location, pref_ethnicity,
       pref_school_of_thought, pref_relocation, pref_partner_children, status, listed_at`
    )
    .eq('id', activeProfileId)
    .single()

  if (viewerError || !viewerProfile) {
    redirect('/pending')
  }

  if (viewerProfile.status !== 'approved') {
    redirect('/pending')
  }

  // 4. Get all approved profiles (excluding own, filtered by opposite gender)
  const oppositeGender =
    viewerProfile.gender === 'male'
      ? 'female'
      : viewerProfile.gender === 'female'
      ? 'male'
      : null

  let profilesQuery = supabase
    .from('zawaaj_profiles')
    .select(
      `id, display_initials, first_name, last_name, gender, date_of_birth, age_display,
       location, profession_detail, education_level, school_of_thought, ethnicity,
       languages_spoken, nationality, marital_status, has_children, height, living_situation,
       religiosity, prayer_regularity, wears_hijab, keeps_beard, bio, open_to_relocation,
       open_to_partners_children, pref_age_min, pref_age_max, pref_location, pref_ethnicity,
       pref_school_of_thought, pref_relocation, pref_partner_children, status, listed_at`
    )
    .eq('status', 'approved')
    .not('id', 'in', `(${siblingIds.join(',')})`)
    .order('listed_at', { ascending: false })

  if (oppositeGender) {
    profilesQuery = profilesQuery.eq('gender', oppositeGender)
  }

  const { data: rawProfiles, error: profilesError } = await profilesQuery

  if (profilesError) {
    redirect('/pending')
  }

  const profiles: ProfileRecord[] = (rawProfiles ?? []).map(p => ({
    ...p,
    // Ensure nulls for missing fields
    wears_hijab: p.wears_hijab ?? null,
    keeps_beard: p.keeps_beard ?? null,
    has_children: p.has_children ?? null,
    pref_school_of_thought: p.pref_school_of_thought ?? null,
    open_to_partners_children: p.open_to_partners_children ?? null,
  }))

  // 4b. Get all profiles linked to this account (for profile switcher)
  // Minimal fields only — used for the Sidebar switcher UI
  const { data: managedProfilesRaw } = await supabase
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, gender, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const managedProfiles = (managedProfilesRaw ?? []).map(p => ({
    id: p.id as string,
    display_initials: p.display_initials as string,
    first_name: p.first_name as string | null,
    gender: p.gender as string | null,
    status: p.status as string,
  }))

  // 5. Get saved profile IDs
  const { data: savedRows } = await supabase
    .from('zawaaj_saved_profiles')
    .select('profile_id')
    .eq('saved_by', activeProfileId)

  const savedIds = new Set<string>((savedRows ?? []).map(r => r.profile_id as string))

  // 6. Get existing browse state (before upserting)
  const { data: existingBrowseState } = await supabase
    .from('zawaaj_browse_state')
    .select('last_browsed_at')
    .eq('profile_id', activeProfileId)
    .single()

  const lastBrowsedAt: string | null = existingBrowseState?.last_browsed_at ?? null

  // 7. Get sent intro requests (all non-expired/withdrawn)
  const { data: introRows } = await supabase
    .from('zawaaj_introduction_requests')
    .select('target_profile_id, status, created_at')
    .eq('requesting_profile_id', activeProfileId)
    .in('status', ['pending', 'active', 'mutual', 'facilitated'])

  const introRequests = (introRows ?? []).map(r => ({
    target_profile_id: r.target_profile_id as string,
    status: r.status as string,
    created_at: r.created_at as string,
  }))

  // 8. Upsert browse_state (update last_browsed_at to now)
  await supabase.from('zawaaj_browse_state').upsert(
    {
      profile_id: activeProfileId,
      last_browsed_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  )

  // 9. Count "new" profiles since last visit
  let newCount = 0
  if (lastBrowsedAt) {
    newCount = profiles.filter(
      p => p.listed_at !== null && p.listed_at > lastBrowsedAt
    ).length
  }

  // Monthly used count
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthlyUsed = introRequests.filter(
    r => r.created_at && r.created_at >= monthStart
  ).length

  // Member's subscription plan (falls back to 'voluntary' if no active subscription)
  const { data: subData } = await supabase
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  const plan: Plan = (subData?.plan ?? 'voluntary') as Plan

  const typedViewerProfile: ProfileRecord = {
    ...viewerProfile,
    wears_hijab: viewerProfile.wears_hijab ?? null,
    keeps_beard: viewerProfile.keeps_beard ?? null,
    has_children: viewerProfile.has_children ?? null,
    pref_school_of_thought: viewerProfile.pref_school_of_thought ?? null,
    open_to_partners_children: viewerProfile.open_to_partners_children ?? null,
  }

  return (
    <BrowseClient
      profiles={profiles}
      viewerProfile={typedViewerProfile}
      savedIds={savedIds}
      introRequests={introRequests}
      newCount={newCount}
      monthlyUsed={monthlyUsed}
      newSince={lastBrowsedAt}
      managedProfiles={managedProfiles}
      activeProfileId={activeProfileId}
      plan={plan}
    />
  )
}
