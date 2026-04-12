import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Sidebar from '@/components/Sidebar'
import { UpgradeClient } from './UpgradeClient'

export const dynamic = 'force-dynamic'

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get active profile + current subscription
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileId = settings?.active_profile_id
  if (!profileId) redirect('/pending')

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, gender, status, is_admin')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile) redirect('/pending')
  if (profile.is_admin) redirect('/admin')
  if (profile.status === 'pending') redirect('/pending')

  const { data: subscription } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('plan, status')
    .eq('profile_id', profileId)
    .maybeSingle()

  const currentPlan = (subscription?.plan as string) ?? 'free'

  // Counts for sidebar
  const [{ count: shortlistCount }, { count: introCount }] = await Promise.all([
    supabase.from('zawaaj_saved_profiles').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
    supabase.from('zawaaj_introduction_requests').select('id', { count: 'exact', head: true }).eq('requesting_profile_id', profileId).eq('status', 'pending'),
  ])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute="/upgrade"
        profile={profile}
        shortlistCount={shortlistCount ?? 0}
        introRequestsCount={introCount ?? 0}
      />
      <main style={{ flex: 1, marginLeft: 240 }}>
        <UpgradeClient currentPlan={currentPlan} profileId={profileId} />
      </main>
    </div>
  )
}
