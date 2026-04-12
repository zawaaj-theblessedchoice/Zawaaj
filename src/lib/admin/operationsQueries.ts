import { createClient } from '@/lib/supabase/client'

type SupabaseClient = ReturnType<typeof createClient>

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
}

export interface ProfileFilters {
  status?: string // 'all' | 'pending' | 'approved' | 'withdrawn' | 'suspended' | 'rejected'
  gender?: string // 'all' | 'female' | 'male'
  location?: string
  search?: string // searches display_initials, first_name, location
}

export interface Metrics {
  pendingReview: number
  needsAction: number
  introductionsActive: number
  approvedMembers: number
  introducedThisWeek: number
}

const PAGE_SIZE = 50

export async function fetchMetrics(supabase: SupabaseClient): Promise<Metrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [pending, flagged, intros, approved, introduced] = await Promise.all([
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
  ])

  return {
    pendingReview: pending.count ?? 0,
    needsAction: flagged.count ?? 0,
    introductionsActive: intros.count ?? 0,
    approvedMembers: approved.count ?? 0,
    introducedThisWeek: introduced.count ?? 0,
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
      'id,display_initials,first_name,last_name,gender,age_display,location,status,school_of_thought,religiosity,profession_sector,guardian_name,contact_number,admin_notes,duplicate_flag,submitted_date,approved_date,created_at,is_admin',
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

  const { data, count, error } = await q
  if (error) throw error
  return { data: (data ?? []) as ProfileRow[], count: count ?? 0 }
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
      'id,display_initials,first_name,last_name,gender,age_display,location,status,school_of_thought,religiosity,profession_sector,guardian_name,contact_number,admin_notes,duplicate_flag,submitted_date,approved_date,created_at,is_admin'
    )
    .eq('status', 'approved')
    .eq('gender', oppositeGender)
    .eq('is_admin', false)
    .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
    .limit(5)

  return (data ?? []) as ProfileRow[]
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
