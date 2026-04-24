import { createClient } from '@/lib/supabase/client'

type SupabaseClient = ReturnType<typeof createClient>

// ─── Family account types ─────────────────────────────────────────────────────

export interface ZawaajFamilyAccount {
  id: string
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  female_contact_name: string | null
  female_contact_number: string | null
  no_female_contact_flag: boolean
  status: string
  // Import / activation fields
  imported_user: boolean
  last_contacted_at: string | null
  snoozed_until: string | null
  assigned_manager_id: string | null
  admin_notes: string | null
}

/** Returns true only if all required contact fields are non-empty. */
export function isContactComplete(account: ZawaajFamilyAccount | null | undefined): boolean {
  if (!account) return true // no family account linked — not a blocking condition
  const base =
    account.contact_full_name?.trim() !== '' &&
    account.contact_relationship?.trim() !== '' &&
    account.contact_number?.trim() !== '' &&
    account.contact_email?.trim() !== ''
  if (!base) return false
  const isMale = ['father', 'male_guardian'].includes(account.contact_relationship)
  if (isMale && !account.no_female_contact_flag) {
    return (
      (account.female_contact_name?.trim() ?? '') !== '' &&
      (account.female_contact_number?.trim() ?? '') !== ''
    )
  }
  return true
}

export interface ProfileRow {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  age_display: string | null
  location: string | null
  status: string
  school_of_thought: string | null
  religiosity: string | null
  profession_sector: string | null
  guardian_name: string | null
  contact_number: string | null
  admin_notes: string | null
  duplicate_flag: boolean
  submitted_date: string | null
  approved_date: string | null
  created_at: string | null
  is_admin: boolean
  marital_status: string | null
  marriage_reason: string | null
  open_to_marital_status: string | null
  family_account: ZawaajFamilyAccount | null
  // Import / activation fields
  needs_claim: boolean
  data_completeness_score: number | null
  imported_user: boolean
  imported_at: string | null
}

export interface ProfileFilters {
  status?: string    // 'all' | 'pending' | 'approved' | 'withdrawn' | 'suspended' | 'rejected'
  gender?: string    // 'all' | 'female' | 'male'
  location?: string
  search?: string    // searches display_initials, first_name, location
  noFamily?: boolean // true = only profiles with no linked family account
  needsClaim?: boolean // true = imported profiles needing claim (needs_claim=true)
}

export interface Metrics {
  pendingReview: number
  needsAction: number
  introductionsActive: number
  approvedMembers: number
  introducedThisWeek: number
  needsClaim: number
}

const PAGE_SIZE = 50

export async function fetchMetrics(supabase: SupabaseClient): Promise<Metrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [pending, flagged, intros, approved, introduced, incompleteAccounts, claimPending] = await Promise.all([
    supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').eq('is_admin', false),
    supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
      .eq('duplicate_flag', true).eq('is_admin', false),
    supabase.from('zawaaj_introduction_requests').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'mutual']),
    supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').eq('is_admin', false),
    supabase.from('zawaaj_matches').select('id', { count: 'exact', head: true })
      .eq('status', 'introduced').gte('introduced_date', sevenDaysAgo),
    supabase.from('zawaaj_family_accounts').select('id', { count: 'exact', head: true })
      .neq('status', 'suspended')
      .or('contact_full_name.eq.,contact_number.eq.,contact_email.eq.,contact_relationship.eq.'),
    supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
      .eq('needs_claim', true).eq('is_admin', false),
  ])

  return {
    pendingReview: pending.count ?? 0,
    needsAction: (flagged.count ?? 0) + (incompleteAccounts.count ?? 0),
    introductionsActive: intros.count ?? 0,
    approvedMembers: approved.count ?? 0,
    introducedThisWeek: introduced.count ?? 0,
    needsClaim: claimPending.count ?? 0,
  }
}

export async function fetchProfiles(
  supabase: SupabaseClient,
  filters: ProfileFilters,
  page: number
): Promise<{ data: ProfileRow[]; count: number }> {
  let q = supabase
    .from('zawaaj_profiles')
    .select(
      'id,display_initials,first_name,last_name,gender,age_display,location,status,school_of_thought,religiosity,profession_sector,guardian_name,contact_number,admin_notes,duplicate_flag,submitted_date,approved_date,created_at,is_admin,marital_status,marriage_reason,open_to_marital_status,needs_claim,data_completeness_score,imported_user,imported_at,family_account:zawaaj_family_accounts(id,contact_full_name,contact_relationship,contact_number,contact_email,female_contact_name,female_contact_number,no_female_contact_flag,status,imported_user,last_contacted_at,snoozed_until,assigned_manager_id,admin_notes)',
      { count: 'exact' }
    )
    .eq('is_admin', false)
    .order('submitted_date', { ascending: false, nullsFirst: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.status && filters.status !== 'all') {
    q = q.eq('status', filters.status)
  }
  if (filters.gender && filters.gender !== 'all') {
    q = q.eq('gender', filters.gender)
  }
  if (filters.location) {
    q = q.ilike('location', `%${filters.location}%`)
  }
  if (filters.search) {
    q = q.or(
      `display_initials.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
    )
  }
  if (filters.noFamily === true) {
    q = q.is('family_account_id', null)
  }
  if (filters.needsClaim === true) {
    q = q.eq('needs_claim', true)
  }

  const { data, count, error } = await q
  if (error) throw error
  return { data: (data ?? []) as unknown as ProfileRow[], count: count ?? 0 }
}

export async function approveProfile(supabase: SupabaseClient, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('zawaaj_profiles')
    .update({
      status: 'approved',
      approved_date: new Date().toISOString(),
      listed_at: new Date().toISOString(),
    })
    .eq('id', profileId)
  if (error) throw error
}

export async function rejectProfile(supabase: SupabaseClient, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('zawaaj_profiles')
    .update({ status: 'rejected' })
    .eq('id', profileId)
  if (error) throw error
}

export async function fetchSuggestedMatches(
  supabase: SupabaseClient,
  profileId: string,
  gender: string
): Promise<ProfileRow[]> {
  const oppositeGender = gender === 'female' ? 'male' : 'female'

  // Get existing intro targets to exclude
  const { data: existing } = await supabase
    .from('zawaaj_introduction_requests')
    .select('target_profile_id, requesting_profile_id')
    .or(`requesting_profile_id.eq.${profileId},target_profile_id.eq.${profileId}`)

  const excludeIds = new Set<string>([profileId])
  existing?.forEach(r => {
    excludeIds.add(r.target_profile_id)
    excludeIds.add(r.requesting_profile_id)
  })

  const { data } = await supabase
    .from('zawaaj_profiles')
    .select(
      'id,display_initials,first_name,last_name,gender,age_display,location,status,school_of_thought,religiosity,profession_sector,guardian_name,contact_number,admin_notes,duplicate_flag,submitted_date,approved_date,created_at,is_admin,needs_claim,data_completeness_score,imported_user,imported_at,family_account:zawaaj_family_accounts(id,contact_full_name,contact_relationship,contact_number,contact_email,female_contact_name,female_contact_number,no_female_contact_flag,status,imported_user,last_contacted_at,snoozed_until,assigned_manager_id,admin_notes)'
    )
    .eq('status', 'approved')
    .eq('gender', oppositeGender)
    .eq('is_admin', false)
    .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
    .limit(5)

  return (data ?? []) as unknown as ProfileRow[]
}

export async function createIntroductionRequest(
  supabase: SupabaseClient,
  requestingProfileId: string,
  targetProfileId: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('zawaaj_introduction_requests')
    .insert({
      requesting_profile_id: requestingProfileId,
      target_profile_id: targetProfileId,
      status: 'mutual',
      expires_at: expiresAt,
    })
  if (error) throw error
}

export async function updateAdminNotes(
  supabase: SupabaseClient,
  profileId: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from('zawaaj_profiles')
    .update({ admin_notes: notes })
    .eq('id', profileId)
  if (error) throw error
}
