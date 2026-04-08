import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminConciergeClient from './AdminConciergeClient'

export interface ConciergeProfile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  age_display: string | null
  date_of_birth: string | null
  location: string | null
  school_of_thought: string | null
  ethnicity: string | null
  pref_age_min: number | null
  pref_age_max: number | null
  pref_location: string | null
  pref_ethnicity: string | null
  pref_school_of_thought: string[] | null
}

export interface CandidateProfile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  age_display: string | null
  date_of_birth: string | null
  location: string | null
  school_of_thought: string | null
  ethnicity: string | null
  profession_detail: string | null
}

export interface ExistingSuggestion {
  for_profile_id: string
  suggested_profile_id: string
  status: string
}

export default async function AdminConciergePage() {
  // ─── Auth + admin guard ─────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/')

  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) redirect('/')

  // ─── Fetch all Premium members via subscriptions → user_settings → profiles
  const { data: premiumSubs } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('user_id')
    .eq('plan', 'premium')
    .eq('status', 'active')

  const premiumUserIds = (premiumSubs ?? []).map(s => s.user_id as string)

  let premiumProfiles: ConciergeProfile[] = []

  if (premiumUserIds.length > 0) {
    // Get active_profile_id for each premium user
    const { data: settingsRows } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .in('user_id', premiumUserIds)

    const profileIds = (settingsRows ?? [])
      .map(s => s.active_profile_id as string)
      .filter(Boolean)

    if (profileIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('zawaaj_profiles')
        .select(`
          id, display_initials, first_name, last_name, gender, age_display, date_of_birth,
          location, school_of_thought, ethnicity,
          pref_age_min, pref_age_max, pref_location, pref_ethnicity, pref_school_of_thought
        `)
        .in('id', profileIds)
        .eq('status', 'approved')

      premiumProfiles = (profiles ?? []) as ConciergeProfile[]
    }
  }

  // ─── Fetch all approved candidate profiles (for suggestion picker) ─────
  const { data: candidatesRaw } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select(`
      id, display_initials, first_name, last_name, gender, age_display, date_of_birth,
      location, school_of_thought, ethnicity, profession_detail
    `)
    .eq('status', 'approved')

  const candidates = (candidatesRaw ?? []) as CandidateProfile[]

  // ─── Existing suggestions (all, to disable already-suggested pairs) ────
  const { data: existingSugs } = await supabaseAdmin
    .from('zawaaj_concierge_suggestions')
    .select('for_profile_id, suggested_profile_id, status')

  const suggestions = (existingSugs ?? []) as ExistingSuggestion[]

  return (
    <AdminConciergeClient
      premiumProfiles={premiumProfiles}
      candidates={candidates}
      existingSuggestions={suggestions}
    />
  )
}
