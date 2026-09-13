// ─── POST /api/boost — grant a 48h profile boost ─────────────────────────────
// Server-enforced: plan is read from the canonical subscription row and the
// monthly allowance from the ledger (service-role, RLS-bypassing). The client
// cannot forge either, so allowances cannot be bypassed client-side.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  BOOST_SPOTLIGHT_ENABLED,
  BOOST_ALLOWANCE,
  BOOST_DURATION_MS,
  currentPeriod,
} from '@/lib/boostSpotlight'

export async function POST() {
  if (!BOOST_SPOTLIGHT_ENABLED) {
    return NextResponse.json({ error: 'Boosts are not available yet.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Active profile + family
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const profileId = settings?.active_profile_id
  if (!profileId) return NextResponse.json({ error: 'No active profile' }, { status: 400 })

  const { data: prof } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, family_account_id, boosted_until')
    .eq('id', profileId)
    .maybeSingle()
  const profile = prof as { id: string; family_account_id: string | null; boosted_until: string | null } | null
  if (!profile?.family_account_id) {
    return NextResponse.json({ error: 'No family account' }, { status: 400 })
  }

  // Canonical plan (provisional Premium counts — it is status='active').
  const { data: sub } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  const plan = ((sub as { plan?: string } | null)?.plan ?? 'free') === 'voluntary'
    ? 'free'
    : ((sub as { plan?: string } | null)?.plan ?? 'free')
  const allowance = BOOST_ALLOWANCE[plan] ?? 0
  if (allowance === 0) {
    return NextResponse.json({ error: 'Your plan does not include boosts.' }, { status: 403 })
  }

  const now = Date.now()

  // Not stackable — one active boost at a time.
  if (profile.boosted_until && new Date(profile.boosted_until).getTime() > now) {
    return NextResponse.json(
      { error: 'You already have an active boost.', boosted_until: profile.boosted_until },
      { status: 409 },
    )
  }

  // Monthly allowance — count grants in the current calendar month.
  const period = currentPeriod()
  const { count: usedCount } = await supabaseAdmin
    .from('zawaaj_boost_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('family_account_id', profile.family_account_id)
    .eq('kind', 'boost')
    .eq('period', period)
  const used = usedCount ?? 0
  if (used >= allowance) {
    return NextResponse.json(
      { error: `No boosts left this month (${used}/${allowance}).`, used, allowance },
      { status: 429 },
    )
  }

  const boostedUntil = new Date(now + BOOST_DURATION_MS).toISOString()

  // Record the grant FIRST (so the allowance can never be under-counted), then
  // apply it to the profile.
  const { error: ledgerErr } = await supabaseAdmin.from('zawaaj_boost_ledger').insert({
    family_account_id: profile.family_account_id,
    profile_id: profile.id,
    kind: 'boost',
    period,
    expires_at: boostedUntil,
  })
  if (ledgerErr) {
    return NextResponse.json({ error: 'Could not grant boost — please try again.' }, { status: 500 })
  }

  await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ boosted_until: boostedUntil })
    .eq('id', profile.id)

  return NextResponse.json({
    ok: true,
    boosted_until: boostedUntil,
    used: used + 1,
    allowance,
    remaining: allowance - (used + 1),
  })
}
