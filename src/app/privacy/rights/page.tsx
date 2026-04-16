import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import RightsClient from './RightsClient'

export default async function PrivacyRightsPage({
  searchParams,
}: {
  searchParams: Promise<{ cancel?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: requests } = await supabaseAdmin
    .from('zawaaj_privacy_requests')
    .select('id, type, status, field_name, requested_value, statutory_deadline, completed_at, rejection_reason, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('first_name, status')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <RightsClient
      userEmail={user.email ?? ''}
      firstName={profile?.first_name ?? null}
      profileStatus={profile?.status ?? null}
      initialRequests={requests ?? []}
      cancelParam={params.cancel ?? null}
    />
  )
}
