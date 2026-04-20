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

  // Fetch family account + user settings so the client can show the right message
  const [{ data: familyAccount }, { data: userSettings }] = await Promise.all([
    supabase
      .from('zawaaj_family_accounts')
      .select('id, status, registration_path, contact_email')
      .eq('primary_user_id', user.id)
      .maybeSingle(),
    supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // Active parent account with no candidate profile yet → redirect to browse
  // (browse page now shows a friendly onboarding prompt instead of hard-redirecting to /register/child)
  if (
    familyAccount?.status === 'active' &&
    familyAccount?.registration_path === 'parent' &&
    !userSettings?.active_profile_id
  ) {
    redirect('/browse')
  }

  return (
    <PendingClient
      status={familyAccount?.status ?? null}
      registrationPath={(familyAccount?.registration_path as 'parent' | 'child' | null) ?? null}
      familyAccountId={familyAccount?.id ?? null}
      contactEmail={familyAccount?.contact_email ?? null}
      hasProfile={!!userSettings?.active_profile_id}
    />
  )
}
