// ─── POST /api/spotlight — grant a spotlight (Premium, 1/month) ──────────────
// Same server-side enforcement as /api/boost: canonical plan + ledger via the
// service-role client. Cannot be bypassed client-side.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  BOOST_SPOTLIGHT_ENABLED,
  SPOTLIGHT_ALLOWANCE,
  SPOTLIGHT_DURATION_MS,
  currentPeriod,
} from '@/lib/boostSpotlight'

export async function POST() {
  if (!BOOST_SPOTLIGHT_ENABLED) {
    return NextResponse.json({ error: 'Spotlights are not available yet.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const profileId = settings?.active_profile_id
  if (!profileId) return NextResponse.json({ error: 'No active profile' }, { status: 400 })

  const { data: prof } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, family_account_id, spotlighted_until')
    .eq('id', profileId)
    .maybeSingle()
  const profile = prof as { id: string; family_account_id: string | null; spotlighted_until: string | null } | null
  if (!profile?.family_account_id) {
    return NextResponse.json({ error: 'No family account' }, { status: 400 })
  }

  const { data: sub } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  const plan = ((sub as { plan?: string } | null)?.plan ?? 'free') === 'voluntary'
    ? 'free'
    : ((sub as { plan?: string } | null)?.plan ?? 'free')
  const allowance = SPOTLIGHT_ALLOWANCE[plan] ?? 0
  if (allowance === 0) {
    return NextResponse.json({ error: 'Your plan does not include spotlights.' }, { status: 403 })
  }

  const now = Date.now()
  if (profile.spotlighted_until && new Date(profile.spotlighted_until).getTime() > now) {
    return NextResponse.json(
      { error: 'You already have an active spotlight.', spotlighted_until: profile.spotlighted_until },
      { status: 409 },
    )
  }

  const period = currentPeriod()
  const { count: usedCount } = await supabaseAdmin
    .from('zawaaj_boost_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('family_account_id', profile.family_account_id)
    .eq('kind', 'spotlight')
    .eq('period', period)
  const used = usedCount ?? 0
  if (used >= allowance) {
    return NextResponse.json(
      { error: `No spotlights left this month (${used}/${allowance}).`, used, allowance },
      { status: 429 },
    )
  }

  const spotlightedUntil = new Date(now + SPOTLIGHT_DURATION_MS).toISOString()

  const { error: ledgerErr } = await supabaseAdmin.from('zawaaj_boost_ledger').insert({
    family_account_id: profile.family_account_id,
    profile_id: profile.id,
    kind: 'spotlight',
    period,
    expires_at: spotlightedUntil,
  })
  if (ledgerErr) {
    return NextResponse.json({ error: 'Could not grant spotlight — please try again.' }, { status: 500 })
  }

  await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ spotlighted_until: spotlightedUntil })
    .eq('id', profile.id)

  return NextResponse.json({
    ok: true,
    spotlighted_until: spotlightedUntil,
    used: used + 1,
    allowance,
    remaining: allowance - (used + 1),
  })
}
