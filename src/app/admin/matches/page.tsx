// /admin/matches — Admin Match Queue (Section 6, Family Model v2)
// Server component: fetches matches with profile + family contact details

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminMatchesClient, {
  type MatchRow,
  type MatchProfile,
  type FamilyContact,
  type Manager,
} from './AdminMatchesClient'

export default async function AdminMatchesPage() {
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ── Role check ────────────────────────────────────────────────────────────
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin' && role !== 'manager') redirect('/admin')

  // ── If manager, get their manager row id for scope filtering ──────────────
  let managerRowId: string | null = null
  if (role === 'manager') {
    const { data: managerRow } = await supabaseAdmin
      .from('zawaaj_managers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    managerRowId = managerRow?.id ?? null
  }

  // ── Fetch matches ─────────────────────────────────────────────────────────
  let matchQuery = supabaseAdmin
    .from('zawaaj_matches')
    .select(`
      id, status, mutual_date,
      profile_a_id, profile_b_id,
      contact_a_verified, contact_b_verified,
      assigned_manager_id,
      contacts_shared_at,
      family_a_contact_name, family_a_contact_number,
      family_b_contact_name, family_b_contact_number,
      followup_due_at, followup_notes, followup_done_at,
      admin_notes
    `)
    .order('mutual_date', { ascending: false })

  // Managers only see their assigned matches
  if (role === 'manager' && managerRowId) {
    matchQuery = matchQuery.eq('assigned_manager_id', managerRowId)
  }

  const { data: matchRows } = await matchQuery

  if (!matchRows || matchRows.length === 0) {
    const { data: managersData } = role === 'super_admin'
      ? await supabaseAdmin
          .from('zawaaj_managers')
          .select('id, full_name')
          .eq('is_active', true)
      : { data: [] }

    const managers: Manager[] = (managersData ?? []).map(m => ({
      id: m.id as string,
      name: (m.full_name as string | null) ?? m.id as string,
    }))

    return (
      <AdminMatchesClient
        matches={[]}
        managers={managers}
        role={role as 'super_admin' | 'manager'}
      />
    )
  }

  // ── Batch fetch profiles ──────────────────────────────────────────────────
  const allProfileIds = [
    ...new Set([
      ...matchRows.map(m => m.profile_a_id as string),
      ...matchRows.map(m => m.profile_b_id as string),
    ]),
  ]

  const { data: profileRows } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, last_name, gender, location, profession_detail, age_display, family_account_id')
    .in('id', allProfileIds)

  // ── Batch fetch family accounts ───────────────────────────────────────────
  const familyAccountIds = [
    ...new Set(
      (profileRows ?? [])
        .map(p => (p as { family_account_id?: string | null }).family_account_id)
        .filter((id): id is string => id != null)
    ),
  ]

  const { data: familyAccountRows } = familyAccountIds.length > 0
    ? await supabaseAdmin
        .from('zawaaj_family_accounts')
        .select(`
          id,
          contact_full_name, contact_relationship, contact_number, contact_email,
          female_contact_name, female_contact_number, female_contact_relationship,
          no_female_contact_flag, father_explanation, registration_path
        `)
        .in('id', familyAccountIds)
    : { data: [] }

  const familyAccountMap = new Map(
    (familyAccountRows ?? []).map(fa => [fa.id as string, fa])
  )

  // ── Build profile map ─────────────────────────────────────────────────────
  const profileMap = new Map(
    (profileRows ?? []).map(p => {
      const faId = (p as { family_account_id?: string | null }).family_account_id
      const fa = faId ? familyAccountMap.get(faId) : undefined

      const familyAccount: FamilyContact | null = fa
        ? {
            contact_full_name: fa.contact_full_name as string,
            contact_relationship: fa.contact_relationship as string,
            contact_number: fa.contact_number as string,
            contact_email: fa.contact_email as string,
            female_contact_name: (fa.female_contact_name as string | null) ?? null,
            female_contact_number: (fa.female_contact_number as string | null) ?? null,
            female_contact_relationship: (fa.female_contact_relationship as string | null) ?? null,
            no_female_contact_flag: (fa.no_female_contact_flag as boolean) ?? false,
            father_explanation: (fa.father_explanation as string | null) ?? null,
            registration_path: fa.registration_path as string,
          }
        : null

      const profile: MatchProfile = {
        id: p.id as string,
        display_initials: p.display_initials as string,
        first_name: (p.first_name as string | null) ?? null,
        last_name: (p.last_name as string | null) ?? null,
        gender: (p.gender as string | null) ?? null,
        location: (p.location as string | null) ?? null,
        profession_detail: (p.profession_detail as string | null) ?? null,
        age_display: (p.age_display as string | null) ?? null,
        family_account: familyAccount,
      }

      return [p.id as string, profile]
    })
  )

  // ── Fetch managers list (super_admin only) ────────────────────────────────
  const { data: managersData } = role === 'super_admin'
    ? await supabaseAdmin
        .from('zawaaj_managers')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
    : { data: [] }

  const managers: Manager[] = (managersData ?? []).map(m => ({
    id: m.id as string,
    name: (m.full_name as string | null) ?? (m.id as string),
  }))

  // ── Build assigned manager name map ──────────────────────────────────────
  const managerNameMap = new Map(managers.map(m => [m.id, m.name]))

  // ── Assemble MatchRow objects ─────────────────────────────────────────────
  const matches: MatchRow[] = matchRows.map(m => {
    const profileA = profileMap.get(m.profile_a_id as string)
    const profileB = profileMap.get(m.profile_b_id as string)

    // Fallback ghost profiles in case of data issues
    const ghostProfile = (id: string): MatchProfile => ({
      id,
      display_initials: '??',
      first_name: null,
      last_name: null,
      gender: null,
      location: null,
      profession_detail: null,
      age_display: null,
      family_account: null,
    })

    return {
      id: m.id as string,
      status: m.status as MatchRow['status'],
      mutual_date: (m.mutual_date as string | null) ?? null,
      profile_a: profileA ?? ghostProfile(m.profile_a_id as string),
      profile_b: profileB ?? ghostProfile(m.profile_b_id as string),
      contact_a_verified: (m.contact_a_verified as boolean) ?? false,
      contact_b_verified: (m.contact_b_verified as boolean) ?? false,
      assigned_manager_id: (m.assigned_manager_id as string | null) ?? null,
      assigned_manager_name: m.assigned_manager_id
        ? (managerNameMap.get(m.assigned_manager_id as string) ?? null)
        : null,
      contacts_shared_at: (m.contacts_shared_at as string | null) ?? null,
      family_a_contact_name: (m.family_a_contact_name as string | null) ?? null,
      family_a_contact_number: (m.family_a_contact_number as string | null) ?? null,
      family_b_contact_name: (m.family_b_contact_name as string | null) ?? null,
      family_b_contact_number: (m.family_b_contact_number as string | null) ?? null,
      followup_due_at: (m.followup_due_at as string | null) ?? null,
      followup_notes: (m.followup_notes as string | null) ?? null,
      followup_done_at: (m.followup_done_at as string | null) ?? null,
      admin_notes: (m.admin_notes as string | null) ?? null,
    }
  })

  return (
    <AdminMatchesClient
      matches={matches}
      managers={managers}
      role={role as 'super_admin' | 'manager'}
    />
  )
}
