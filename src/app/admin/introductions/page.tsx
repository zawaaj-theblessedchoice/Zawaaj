import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminIntroductionsClient from './AdminIntroductionsClient'
import type { IntroRequest } from './AdminIntroductionsClient'

export default async function AdminIntroductionsPage() {
  const supabase = await createClient()

  // 1. Auth + admin check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/')

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) redirect('/')

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('id', settings.active_profile_id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/')

  // 2. Fetch all introduction requests with both profile names
  const { data } = await supabase
    .from('zawaaj_introduction_requests')
    .select(`
      *,
      requesting_profile:zawaaj_profiles!requesting_profile_id(id, display_initials, first_name, last_name, gender),
      target_profile:zawaaj_profiles!target_profile_id(id, display_initials, first_name, last_name, gender)
    `)
    .order('created_at', { ascending: false })

  return <AdminIntroductionsClient requests={(data ?? []) as IntroRequest[]} />
}
