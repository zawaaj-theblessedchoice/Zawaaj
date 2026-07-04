import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FamiliesClient } from './FamiliesClient'

export const dynamic = 'force-dynamic'

export type ClaimStatus = 'not_sent' | 'sent' | 'claimed'

export interface FamilyRow {
  id: string
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  female_contact_name: string | null
  female_contact_number: string | null
  no_female_contact_flag: boolean
  father_explanation: string
  plan: string
  status: string
  readiness_state: string
  registration_path: string
  terms_agreed: boolean
  terms_agreed_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  primary_user_id: string | null
  imported_user: boolean
  archived_at: string | null
  claim_status: ClaimStatus
  last_active: string | null
  profiles: {
    id: string
    display_initials: string
    first_name: string | null
    last_name: string | null
    gender: string | null
    status: string | null
    duplicate_flag: boolean | null
    // The candidate's OWN contact number on zawaaj_profiles (distinct from the
    // family account's contact_number). Admin-only, sensitive. Null for imported
    // parent-registrations that never captured a candidate-own number.
    contact_number: string | null
  }[]
}

// Base columns minus archived_at — used as the fallback when migration 063 has
// not been applied yet, so the page degrades gracefully instead of erroring.
const SELECT_BASE = `
  id, contact_full_name, contact_relationship, contact_number, contact_email,
  female_contact_name, female_contact_number, no_female_contact_flag, father_explanation,
  plan, status, readiness_state, registration_path, terms_agreed, terms_agreed_at,
  approved_at, created_at, updated_at, primary_user_id, assigned_manager_id, imported_user,
  profiles:zawaaj_profiles(
    id, display_initials, first_name, last_name, gender, status, duplicate_flag, contact_number
  )
`
const SELECT_WITH_ARCHIVE = `${SELECT_BASE}, archived_at`

export default async function FamiliesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin' && role !== 'manager') redirect('/admin')
  const isSuperAdmin = role === 'super_admin'

  // Managers see ONLY families assigned to them. family_accounts.assigned_manager_id
  // holds a zawaaj_managers.id (NOT a profile id — see Phase 3 dual-id model), so
  // resolve this manager's managers-row id and scope by it. Super-admins see all.
  let managerRecordId: string | null = null
  if (role === 'manager') {
    const { data: mgrRow } = await supabaseAdmin
      .from('zawaaj_managers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    managerRecordId = (mgrRow?.id as string | null) ?? null
  }

  function buildQuery(select: string) {
    let q = supabaseAdmin
      .from('zawaaj_family_accounts')
      .select(select)
      .order('created_at', { ascending: false })
    if (role === 'manager') {
      // A manager with no managers-row (shouldn't happen) gets an impossible
      // filter → empty list, never the global set.
      q = q.eq('assigned_manager_id', managerRecordId ?? '00000000-0000-0000-0000-000000000000')
    }
    return q
  }

  // Try the archive-aware select first; if migration 063 (archived_at) is not
  // applied yet, fall back to the base select so the page still renders. Archive
  // features stay inert until the column exists.
  let archiveEnabled = true
  let families: Record<string, unknown>[] | null = null
  {
    const { data, error } = await buildQuery(SELECT_WITH_ARCHIVE)
    if (error) {
      archiveEnabled = false
      const { data: base } = await buildQuery(SELECT_BASE)
      families = (base as unknown as Record<string, unknown>[] | null) ?? []
    } else {
      families = (data as unknown as Record<string, unknown>[] | null) ?? []
    }
  }

  // Claim status per family: pending claim_invite tokens (not accepted, not
  // expired) → 'sent'; a linked primary_user_id → 'claimed'; otherwise not sent.
  const famIds = families.map(f => f.id as string)
  const pendingClaim = new Set<string>()
  if (famIds.length > 0) {
    const { data: toks } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .select('family_account_id')
      .in('family_account_id', famIds)
      .eq('purpose', 'claim_invite')
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
    for (const t of toks ?? []) pendingClaim.add(t.family_account_id as string)
  }

  // Fetch last_sign_in_at from auth.users to show "last active" per family account
  const lastSeenMap: Record<string, string | null> = {}
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authData?.users) {
      for (const u of authData.users) {
        lastSeenMap[u.id] = u.last_sign_in_at ?? null
      }
    }
  } catch {
    // Non-critical — last active will show as unknown
  }

  const rows: FamilyRow[] = families.map(f => {
    const primaryUserId = (f.primary_user_id as string | null) ?? null
    const claim_status: ClaimStatus = primaryUserId
      ? 'claimed'
      : pendingClaim.has(f.id as string) ? 'sent' : 'not_sent'
    return {
      ...(f as unknown as FamilyRow),
      imported_user: (f.imported_user as boolean | null) ?? false,
      archived_at: archiveEnabled ? ((f.archived_at as string | null) ?? null) : null,
      claim_status,
      last_active: primaryUserId ? (lastSeenMap[primaryUserId] ?? null) : null,
    }
  })

  return <FamiliesClient families={rows} archiveEnabled={archiveEnabled} isSuperAdmin={isSuperAdmin} />
}
