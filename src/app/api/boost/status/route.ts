// ─── GET /api/boost/status — remaining allowances + active windows ───────────
// Powers the settings/membership UI. Reads the canonical plan + ledger + the
// profile's active windows (service-role). Returns zeros/false when the feature
// is disabled so the UI can hide itself.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  BOOST_SPOTLIGHT_ENABLED,
  BOOST_ALLOWANCE,
  SPOTLIGHT_ALLOWANCE,
  currentPeriod,
} from '@/lib/boostSpotlight'

export async function GET() {
  if (!BOOST_SPOTLIGHT_ENABLED) {
    return NextResponse.json({ enabled: false })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ enabled: true, error: 'Unauthorised' }, { status: 401 })

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const profileId = settings?.active_profile_id
  if (!profileId) return NextResponse.json({ enabled: true, plan: 'free', boost: null, spotlight: null })

  const { data: prof } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('family_account_id, boosted_until, spotlighted_until')
    .eq('id', profileId)
    .maybeSingle()
  const profile = prof as { family_account_id: string | null; boosted_until: string | null; spotlighted_until: string | null } | null
  const familyId = profile?.family_account_id
  if (!familyId) return NextResponse.json({ enabled: true, plan: 'free', boost: null, spotlight: null })

  const { data: sub } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  const raw = (sub as { plan?: string } | null)?.plan ?? 'free'
  const plan = raw === 'voluntary' ? 'free' : raw

  const period = currentPeriod()
  const [{ count: boostUsed }, { count: spotUsed }] = await Promise.all([
    supabaseAdmin.from('zawaaj_boost_ledger').select('id', { count: 'exact', head: true })
      .eq('family_account_id', familyId).eq('kind', 'boost').eq('period', period),
    supabaseAdmin.from('zawaaj_boost_ledger').select('id', { count: 'exact', head: true })
      .eq('family_account_id', familyId).eq('kind', 'spotlight').eq('period', period),
  ])

  const now = Date.now()
  const activeBoost = profile?.boosted_until && new Date(profile.boosted_until).getTime() > now
    ? profile.boosted_until : null
  const activeSpotlight = profile?.spotlighted_until && new Date(profile.spotlighted_until).getTime() > now
    ? profile.spotlighted_until : null

  const boostAllowance = BOOST_ALLOWANCE[plan] ?? 0
  const spotAllowance = SPOTLIGHT_ALLOWANCE[plan] ?? 0

  return NextResponse.json({
    enabled: true,
    plan,
    boost: {
      allowance: boostAllowance,
      used: boostUsed ?? 0,
      remaining: Math.max(0, boostAllowance - (boostUsed ?? 0)),
      activeUntil: activeBoost,
    },
    spotlight: {
      allowance: spotAllowance,
      used: spotUsed ?? 0,
      remaining: Math.max(0, spotAllowance - (spotUsed ?? 0)),
      activeUntil: activeSpotlight,
    },
  })
}
