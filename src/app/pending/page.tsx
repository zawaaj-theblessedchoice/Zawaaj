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

  return <PendingClient />
}
