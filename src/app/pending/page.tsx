import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PendingClient from './PendingClient'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Admins who land here (due to missing active_profile_id) should go to admin dashboard
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role === 'super_admin') redirect('/admin')
  if (role === 'manager') redirect('/admin/introductions')

  // Also catch old-style is_admin=true profiles that predate the role column
  const { data: adminProfile } = await supabase
    .from('zawaaj_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_admin', true)
    .maybeSingle()
  if (adminProfile) redirect('/admin')

  // Fetch family account status so the client can show the right message
  const { data: familyAccount } = await supabase
    .from('zawaaj_family_accounts')
    .select('id, status, contact_email')
    .eq('primary_user_id', user.id)
    .maybeSingle()

  // Active family account with no candidate profile yet → prompt to add one
  if (familyAccount?.status === 'active') {
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!settings?.active_profile_id) {
      redirect('/register/child')
    }
  }

  return (
    <PendingClient
      status={familyAccount?.status ?? null}
      familyAccountId={familyAccount?.id ?? null}
      contactEmail={familyAccount?.contact_email ?? null}
    />
  )
}
