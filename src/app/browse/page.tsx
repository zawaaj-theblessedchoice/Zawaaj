import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BrowseClient from './BrowseClient'
import Sidebar from '@/components/Sidebar'
import type { ProfileRecord } from '@/components/ProfileModal'
import type { FilterState } from '@/lib/filter-types'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'
import Link from 'next/link'

const FILTER_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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

  // 2. Admin check — use zawaaj_get_role() so managers route correctly.
  //    super_admin → /admin dashboard, manager → /admin/introductions.
  //    Exception: ?preview=1 lets an admin see the member-facing browse view.
  if (params.preview !== '1') {
    const { data: role } = await supabase.rpc('zawaaj_get_role')
    if (role === 'super_admin') redirect('/admin')
    if (role === 'manager') redirect('/admin/introductions')
  }

  // 3. Get active_profile_id
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) {
    // Check if they have a family account so we can route them correctly.
    const { data: familyAccount } = await supabase
      .from('zawaaj_family_accounts')
      .select('id, status, registration_path')
      .eq('primary_user_id', user.id)
      .maybeSingle()

    // Parent account that is active but has no candidate profile yet →
    // show a role-aware onboarding prompt inside the sidebar layout instead of hard-redirecting.
    if (familyAccount?.status === 'active' && familyAccount?.registration_path === 'parent') {
      return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
          <Sidebar
            activeRoute="/browse"
            shortlistCount={0}
            introRequestsCount={0}
            profile={{ display_initials: 'FA', gender: null, first_name: null }}
            profileApproved={false}
          />
          <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <div style={{ maxWidth: 460, textAlign: 'center' }}>
              {/* Icon */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="var(--gold)" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>

              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>
                Add a candidate profile
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 6px' }}>
                Your family account is set up. The next step is to create a candidate profile so you can begin browsing.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 32px' }}>
                You can also complete this later — your account will remain active.
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/register/child"
                  style={{ padding: '10px 22px', borderRadius: 8, border: '0.5px solid var(--border-gold)', background: 'var(--gold-muted)', color: 'var(--gold)', fontSize: 13.5, fontWeight: 500, textDecoration: 'none' }}
                >
                  Create candidate profile
                </Link>
                <a
                  href="mailto:hello@zawaaj.uk?subject=Family%20account%20enquiry"
                  style={{ padding: '10px 22px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-secondary)', fontSize: 13.5, textDecoration: 'none' }}
                >
                  Contact us
                </a>
              </div>
            </div>
          </main>
        </div>
      )
    }

    // All other no-profile cases (child path, pending email verification, no account) → /pending
    redirect('/pending')
  }

  const activeProfileId = settings.active_profile_id

  // 3b. Get family account id (if any) — used for sibling exclusion and profile switcher
  const { data: activeFamilyAccount } = await supabase
    .from('zawaaj_family_accounts')
    .select('id')
    .eq('primary_user_id', user.id)
    .maybeSingle()
  const familyAccountId: string | null = activeFamilyAccount?.id ?? null

  // 3c. Get all profile IDs linked to this family account (or this user) so we can exclude
  //     siblings from browse. Uses family_account_id when available so cross-user linked
  //     profiles (e.g. child registered under their own auth account) are also excluded.
  const siblingQuery = familyAccountId
    ? supabase.from('zawaaj_profiles').select('id').eq('family_account_id', familyAccountId)
    : supabase.from('zawaaj_profiles').select('id').eq('user_id', user.id)
  const { data: siblingRows } = await siblingQuery

  const siblingIds: string[] = (siblingRows ?? []).map(r => r.id as string)

  // 4. Get viewer's own profile
  const { data: viewerProfile, error: viewerError } = await supabase
    .from('zawaaj_profiles')
    .select(
      `id, display_initials, first_name, last_name, gender, date_of_birth, age_display,
       location, profession_detail, education_level, school_of_thought, ethnicity,
       languages_spoken, nationality, marital_status, has_children, height, living_situation,
       religiosity, prayer_regularity, wears_hijab, keeps_beard, wears_niqab, wears_abaya,
       quran_engagement_level, bio, open_to_relocation,
       open_to_partners_children, pref_age_min, pref_age_max, pref_location, pref_ethnicity,
       pref_school_of_thought, pref_relocation, pref_partner_children, status, listed_at,
       islamic_background, smoker, place_of_birth`
    )
    .eq('id', activeProfileId)
    .single()

  if (viewerError || !viewerProfile) {
    redirect('/pending')
  }

  if (viewerProfile.status !== 'approved') {
    // Show pending review dashboard — sidebar visible with greyed-out nav items
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar
          activeRoute="/browse"
          shortlistCount={0}
          introRequestsCount={0}
          profile={{ display_initials: viewerProfile.display_initials, gender: viewerProfile.gender, first_name: viewerProfile.first_name }}
          profileApproved={false}
        />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.5"/><path d="M12 7v5l3 3" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Your profile is being reviewed
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 8px' }}>
              Our team reviews every profile to ensure the platform remains private and trustworthy. This typically takes 1–2 working days.
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 28px' }}>
              You&rsquo;ll receive an email as soon as your profile is approved.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/my-profile" style={{ padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, textDecoration: 'none' }}>
                Edit my profile
              </a>
              <a href="mailto:hello@zawaaj.uk?subject=Profile%20review%20enquiry" style={{ padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--border-gold)', background: 'var(--gold-muted)', color: 'var(--gold)', fontSize: 13, textDecoration: 'none' }}>
                Contact us
              </a>
            </div>
          </div>
        </main>
      </div>
    )
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
       religiosity, prayer_regularity, wears_hijab, keeps_beard, wears_niqab, wears_abaya,
       quran_engagement_level, bio, open_to_relocation,
       open_to_partners_children, pref_age_min, pref_age_max, pref_location, pref_ethnicity,
       pref_school_of_thought, pref_relocation, pref_partner_children, status, listed_at,
       islamic_background, smoker, place_of_birth`
    )
    .eq('status', 'approved')
    .order('listed_at', { ascending: false })

  if (oppositeGender) {
    profilesQuery = profilesQuery.eq('gender', oppositeGender)
  }

  // Exclude all profiles linked to the same family account (siblings).
  // Only applied when there are siblings — an empty IN() is invalid SQL.
  if (siblingIds.length > 0) {
    profilesQuery = profilesQuery.not('id', 'in', `(${siblingIds.join(',')})`)
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
    wears_niqab: p.wears_niqab ?? null,
    wears_abaya: p.wears_abaya ?? null,
    quran_engagement_level: p.quran_engagement_level ?? null,
    has_children: p.has_children ?? null,
    pref_school_of_thought: p.pref_school_of_thought ?? null,
    open_to_partners_children: p.open_to_partners_children ?? null,
    islamic_background: p.islamic_background ?? null,
    smoker: p.smoker ?? null,
    place_of_birth: p.place_of_birth ?? null,
  }))

  // 4b. Get all profiles linked to this account (for profile switcher)
  // Minimal fields only — used for the Sidebar switcher UI.
  // Prefer querying by family_account_id so cross-user linked profiles (e.g. a child
  // who registered under their own auth account) appear in the switcher for the parent.
  const managedQuery = familyAccountId
    ? supabase.from('zawaaj_profiles').select('id, display_initials, first_name, gender, status').eq('family_account_id', familyAccountId)
    : supabase.from('zawaaj_profiles').select('id, display_initials, first_name, gender, status').eq('user_id', user.id)
  const { data: managedProfilesRaw } = await managedQuery.order('created_at', { ascending: true })

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
    .select('last_browsed_at, filters_json, filters_updated_at')
    .eq('profile_id', activeProfileId)
    .single()

  const lastBrowsedAt: string | null = existingBrowseState?.last_browsed_at ?? null

  // 7. Get sent intro requests — include recent declined/expired so we can show
  //    the 48-hour status label before the card reverts to "Express interest"
  const { data: introRows } = await supabase
    .from('zawaaj_introduction_requests')
    .select('target_profile_id, status, created_at, responded_at')
    .eq('requesting_profile_id', activeProfileId)
    .in('status', ['pending', 'accepted', 'declined', 'expired'])

  const introRequests = (introRows ?? []).map(r => ({
    target_profile_id: r.target_profile_id as string,
    status: r.status as string,
    created_at: r.created_at as string,
    responded_at: (r.responded_at as string | null) ?? null,
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

  // Member's subscription plan (falls back to 'free' if no active subscription)
  const { data: subData } = await supabase
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  // Normalise legacy 'voluntary' plan key → 'free'; guard against any unknown value
  const rawPlan = (subData?.plan as string | null) ?? 'free'
  const plan: Plan = (['free', 'plus', 'premium'].includes(rawPlan) ? rawPlan : 'free') as Plan

  // Active (pending) introduction request count for this profile
  const { count: activeCountRaw } = await supabase
    .from('zawaaj_introduction_requests')
    .select('id', { count: 'exact', head: true })
    .eq('requesting_profile_id', activeProfileId)
    .eq('status', 'pending')
  const activeCount: number = activeCountRaw ?? 0
  const planConfig = getPlanConfig(plan)
  const activeLimit: number | null = planConfig.activeLimit === Infinity ? null : planConfig.activeLimit

  // Restore persisted filters for Plus/Premium — Free always gets null (no filters)
  let initialFilters: FilterState | null = null
  if (
    planConfig.advancedFilters &&
    existingBrowseState?.filters_json &&
    existingBrowseState?.filters_updated_at
  ) {
    const ageMs = Date.now() - new Date(existingBrowseState.filters_updated_at as string).getTime()
    if (ageMs < FILTER_EXPIRY_MS) {
      initialFilters = existingBrowseState.filters_json as FilterState
    }
    // Expired: initialFilters stays null — filters cleared on next Apply
  }

  const typedViewerProfile: ProfileRecord = {
    ...viewerProfile,
    wears_hijab: viewerProfile.wears_hijab ?? null,
    keeps_beard: viewerProfile.keeps_beard ?? null,
    wears_niqab: (viewerProfile as Record<string, unknown>).wears_niqab as string | null ?? null,
    wears_abaya: (viewerProfile as Record<string, unknown>).wears_abaya as string | null ?? null,
    quran_engagement_level: (viewerProfile as Record<string, unknown>).quran_engagement_level as string | null ?? null,
    has_children: viewerProfile.has_children ?? null,
    pref_school_of_thought: viewerProfile.pref_school_of_thought ?? null,
    open_to_partners_children: viewerProfile.open_to_partners_children ?? null,
    islamic_background: (viewerProfile as Record<string, unknown>).islamic_background as string | null ?? null,
    smoker: (viewerProfile as Record<string, unknown>).smoker as boolean | null ?? null,
    place_of_birth: (viewerProfile as Record<string, unknown>).place_of_birth as string | null ?? null,
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
      hasFamilyAccount={!!familyAccountId}
      plan={plan}
      activeCount={activeCount}
      activeLimit={activeLimit}
      initialFilters={initialFilters}
    />
  )
}
