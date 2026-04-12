import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/AdminShell'
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

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/admin')

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

  return (
    <AdminShell role="super_admin">
      <FamiliesClient families={(families as FamilyRow[]) ?? []} />
    </AdminShell>
  )
}
