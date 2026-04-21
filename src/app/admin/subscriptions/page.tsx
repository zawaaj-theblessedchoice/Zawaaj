import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminSubscriptionsClient from './AdminSubscriptionsClient'

export interface SubscriptionRow {
  /** null = no subscription row exists yet (virtual free account) */
  id: string | null
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

  // ─── Fetch in 3 parallel queries then merge client-side ─────────────────
  //
  // We intentionally start from profiles (not subscriptions) so that every
  // member appears here — including imported accounts and anyone who signed
  // up before the subscription row was created.

  const [profilesRes, subsRes, settingsRes] = await Promise.all([
    // All non-admin profiles that are active enough to be visible
    supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, user_id, display_initials, first_name, last_name, gender, created_at')
      .eq('is_admin', false)
      .not('status', 'in', '(rejected,withdrawn)')
      .order('created_at', { ascending: false }),

    // All subscription rows
    supabaseAdmin
      .from('zawaaj_subscriptions')
      .select('id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at'),

    // Active profile per user
    supabaseAdmin
      .from('zawaaj_user_settings')
      .select('user_id, active_profile_id'),
  ])

  // Build lookup maps
  type RawSub = NonNullable<typeof subsRes.data>[number]
  const subByUserId = new Map<string, RawSub>()
  for (const s of subsRes.data ?? []) subByUserId.set(s.user_id, s)

  const activeProfileByUserId = new Map<string, string>()
  for (const s of settingsRes.data ?? []) {
    if (s.active_profile_id) activeProfileByUserId.set(s.user_id, s.active_profile_id)
  }

  // One row per unique user_id — prefer the profile that matches user_settings
  const seenUserIds = new Set<string>()
  const subs: SubscriptionRow[] = []

  for (const profile of profilesRes.data ?? []) {
    if (!profile.user_id || seenUserIds.has(profile.user_id)) continue

    const activeId = activeProfileByUserId.get(profile.user_id)
    // Skip this profile row if it's not the active one (a later row will match)
    if (activeId && activeId !== profile.id) continue

    seenUserIds.add(profile.user_id)

    const sub = subByUserId.get(profile.user_id)

    subs.push({
      id:                    sub?.id                    ?? null,
      user_id:               profile.user_id,
      plan:                  (sub?.plan as SubscriptionRow['plan']) ?? 'free',
      status:                (sub?.status as SubscriptionRow['status']) ?? 'active',
      stripe_customer_id:    sub?.stripe_customer_id    ?? null,
      stripe_subscription_id:sub?.stripe_subscription_id ?? null,
      current_period_start:  sub?.current_period_start  ?? null,
      current_period_end:    sub?.current_period_end     ?? null,
      cancel_at_period_end:  sub?.cancel_at_period_end  ?? false,
      created_at:            sub?.created_at             ?? profile.created_at,
      updated_at:            sub?.updated_at             ?? profile.created_at,
      profile: {
        id:               profile.id,
        display_initials: profile.display_initials,
        first_name:       profile.first_name,
        last_name:        profile.last_name,
        gender:           profile.gender,
      },
    })
  }

  // Any user with a sub row but no matching active profile still shows up
  for (const sub of subsRes.data ?? []) {
    if (seenUserIds.has(sub.user_id)) continue
    seenUserIds.add(sub.user_id)
    subs.push({
      id:                    sub.id,
      user_id:               sub.user_id,
      plan:                  sub.plan as SubscriptionRow['plan'],
      status:                sub.status as SubscriptionRow['status'],
      stripe_customer_id:    sub.stripe_customer_id    ?? null,
      stripe_subscription_id:sub.stripe_subscription_id ?? null,
      current_period_start:  sub.current_period_start  ?? null,
      current_period_end:    sub.current_period_end     ?? null,
      cancel_at_period_end:  sub.cancel_at_period_end  ?? false,
      created_at:            sub.created_at,
      updated_at:            sub.updated_at,
      profile: null,
    })
  }

  return <AdminSubscriptionsClient subs={subs} />
}
