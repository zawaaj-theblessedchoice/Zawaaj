import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminSubscriptionsClient from './AdminSubscriptionsClient'

export interface SubscriptionRow {
  id: string
  user_id: string
  plan: 'free' | 'plus' | 'premium'
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
  profile: {
    id: string
    display_initials: string
    first_name: string | null
    last_name: string | null
    gender: string | null
  } | null
}

export default async function AdminSubscriptionsPage() {
  // ─── Auth + admin guard ─────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/')

  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) redirect('/')

  // ─── Fetch all subscriptions with linked profile ─────────────────────────
  const { data: rawSubs } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select(`
      id, user_id, plan, status, stripe_customer_id, stripe_subscription_id,
      current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
    `)
    .order('created_at', { ascending: false })

  // ─── For each sub, find the active profile via zawaaj_user_settings ──────
  const subs: SubscriptionRow[] = []
  for (const sub of rawSubs ?? []) {
    const { data: settings } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', sub.user_id)
      .maybeSingle()

    let profile = null
    if (settings?.active_profile_id) {
      const { data: p } = await supabaseAdmin
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, last_name, gender')
        .eq('id', settings.active_profile_id)
        .maybeSingle()
      profile = p ?? null
    }

    subs.push({ ...(sub as Omit<SubscriptionRow, 'profile'>), profile })
  }

  return <AdminSubscriptionsClient subs={subs} />
}
