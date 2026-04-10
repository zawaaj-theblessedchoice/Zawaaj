import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ─── Fetch subscription row ────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('zawaaj_subscriptions')
    .select('plan, status, current_period_start, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // No row → free member
  if (!data) {
    return NextResponse.json({
      plan: 'free',
      status: 'active',
      current_period_end: null,
      cancel_at_period_end: false,
      has_stripe: false,
    })
  }

  return NextResponse.json({
    plan: data.plan,
    status: data.status,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end,
    has_stripe: !!data.stripe_customer_id,
  })
}
