import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminIntroductionsClient from './AdminIntroductionsClient'
import type { IntroRequest, ManagerProfile } from './AdminIntroductionsClient'

export default async function AdminIntroductionsPage() {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/')

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) redirect('/')

  // 2. Role check via RPC
  const { data: role, error: roleError } = await supabase.rpc('zawaaj_get_role')
  if (roleError || (role !== 'super_admin' && role !== 'manager')) redirect('/')

  const adminRole = role as 'super_admin' | 'manager'

  // 3. Fetch manager profiles for assignment dropdown
  const { data: managersData } = await supabase
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, last_name')
    .eq('role', 'manager')
    .order('first_name', { ascending: true })

  const managers: ManagerProfile[] = (managersData ?? []) as ManagerProfile[]

  // 4. Fetch all introduction requests with related profiles and new columns
  const { data } = await supabase
    .from('zawaaj_introduction_requests')
    .select(`
      id,
      status,
      created_at,
      expires_at,
      mutual_at,
      responded_at,
      assigned_manager_id,
      handled_by,
      handled_at,
      admin_notes,
      requesting_profile:zawaaj_profiles!requesting_profile_id(id, display_initials, first_name, last_name, gender),
      target_profile:zawaaj_profiles!target_profile_id(id, display_initials, first_name, last_name, gender)
    `)
    .order('created_at', { ascending: false })

  return (
    <AdminIntroductionsClient
      requests={(data ?? []) as unknown as IntroRequest[]}
      managers={managers}
      role={adminRole}
    />
  )
}
