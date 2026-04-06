import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IntroductionsClient from './IntroductionsClient'

export default async function IntroductionsPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  // Admin check
  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (isAdmin) redirect('/admin')

  // Get active profile
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) redirect('/pending')

  const activeProfileId = settings.active_profile_id

  // Verify profile is approved
  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('id, status, display_initials, first_name, gender')
    .eq('id', activeProfileId)
    .single()

  if (!profile || profile.status !== 'approved') redirect('/pending')

  // Fetch all sent introduction requests with target profile info
  const { data: sentRows } = await supabase
    .from('zawaaj_introduction_requests')
    .select(
      'id, target_profile_id, status, created_at, expires_at, mutual_at, admin_notes'
    )
    .eq('requesting_profile_id', activeProfileId)
    .order('created_at', { ascending: false })

  // Fetch target profile details for display (only safe public fields)
  const sentTargetIds = (sentRows ?? []).map(r => r.target_profile_id as string)

  const { data: targetProfiles } = sentTargetIds.length > 0
    ? await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, last_name, gender, location, profession_detail, age_display, date_of_birth')
        .in('id', sentTargetIds)
    : { data: [] }

  const targetMap = new Map(
    (targetProfiles ?? []).map(p => [p.id, p])
  )

  const requests = (sentRows ?? []).map(r => ({
    id: r.id as string,
    target_profile_id: r.target_profile_id as string,
    status: r.status as string,
    created_at: r.created_at as string,
    expires_at: r.expires_at as string | null,
    mutual_at: r.mutual_at as string | null,
    admin_notes: r.admin_notes as string | null,
    target: targetMap.get(r.target_profile_id as string) ?? null,
  }))

  return (
    <IntroductionsClient
      requests={requests}
      viewerProfile={{
        id: profile.id,
        display_initials: profile.display_initials,
        first_name: profile.first_name,
        gender: profile.gender,
      }}
    />
  )
}
