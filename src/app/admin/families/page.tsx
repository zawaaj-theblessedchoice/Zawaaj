import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FamiliesClient } from './FamiliesClient'

export const dynamic = 'force-dynamic'

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
  registration_path: string
  terms_agreed: boolean
  terms_agreed_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  primary_user_id: string | null
  last_active: string | null
  profiles: {
    id: string
    display_initials: string
    first_name: string | null
    last_name: string | null
    gender: string | null
    status: string | null
    duplicate_flag: boolean | null
  }[]
}

export default async function FamiliesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin' && role !== 'manager') redirect('/admin')

  const { data: families } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .select(`
      id, contact_full_name, contact_relationship, contact_number, contact_email,
      female_contact_name, female_contact_number, no_female_contact_flag, father_explanation,
      plan, status, registration_path, terms_agreed, terms_agreed_at,
      approved_at, created_at, updated_at, primary_user_id,
      profiles:zawaaj_profiles(
        id, display_initials, first_name, last_name, gender, status, duplicate_flag
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch last_sign_in_at from auth.users to show "last active" per family account
  let lastSeenMap: Record<string, string | null> = {}
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

  const rows: FamilyRow[] = (families ?? []).map(f => ({
    ...(f as unknown as FamilyRow),
    last_active: f.primary_user_id ? (lastSeenMap[f.primary_user_id] ?? null) : null,
  }))

  return <FamiliesClient families={rows} />
}
