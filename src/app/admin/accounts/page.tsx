import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AccountsClient } from './AccountsClient'
import type { AccountRow } from './AccountsClient'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
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
      plan, status, created_at, updated_at, primary_user_id,
      profiles:zawaaj_profiles(
        id, display_initials, first_name, last_name, gender, status,
        age_display, location, duplicate_flag
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch last_sign_in_at from auth.users for active accounts
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

  const rows: AccountRow[] = (families ?? []).map(f => ({
    id: f.id,
    contact_full_name: f.contact_full_name,
    contact_relationship: f.contact_relationship,
    contact_number: f.contact_number,
    contact_email: f.contact_email,
    plan: f.plan,
    status: f.status,
    created_at: f.created_at,
    updated_at: f.updated_at,
    primary_user_id: f.primary_user_id ?? null,
    last_active: f.primary_user_id ? (lastSeenMap[f.primary_user_id] ?? null) : null,
    profiles: (f.profiles ?? []) as AccountRow['profiles'],
  }))

  return <AccountsClient accounts={rows} />
}
