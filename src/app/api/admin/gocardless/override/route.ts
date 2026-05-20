// ─── POST /api/admin/gocardless/override ─────────────────────────────────────
// Admin-only: manually override a GoCardless subscription's state.
// Does NOT interact with GoCardless API — DB-only adjustments for edge cases.
// Actions: activate | downgrade | reset_failures

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { GC_ENABLED } from '@/lib/gocardless/config'

export async function POST(req: Request) {
  if (!GC_ENABLED) {
    return NextResponse.json({ error: 'Direct Debit payments are not available yet' }, { status: 503 })
  }
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json() as { subscription_id?: string; action?: string }
    const { subscription_id, action } = body

    if (!subscription_id || !action) {
      return NextResponse.json({ error: 'Missing subscription_id or action' }, { status: 400 })
    }

    if (!['activate', 'downgrade', 'reset_failures'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Fetch the subscription row
    const { data: subRow } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .select('id, family_account_id, status')
      .eq('id', subscription_id)
      .eq('payment_provider', 'gocardless')
      .maybeSingle()

    if (!subRow) {
      return NextResponse.json({ error: 'GoCardless subscription not found' }, { status: 404 })
    }

    const sub = subRow as { id: string; family_account_id: string; status: string }

    if (action === 'activate') {
      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({ status: 'active', payment_failure_count: 0, grace_period_until: null, cancel_at_period_end: false })
        .eq('id', sub.id)

      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ plan: 'premium', subscription_status: 'active' })
        .eq('id', sub.family_account_id)
    }

    if (action === 'downgrade') {
      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', sub.id)

      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ plan: 'voluntary', subscription_status: 'cancelled', subscription_source: null, renewal_date: null })
        .eq('id', sub.family_account_id)
    }

    if (action === 'reset_failures') {
      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({ payment_failure_count: 0, grace_period_until: null })
        .eq('id', sub.id)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[admin/gocardless/override] error:', err)
    return NextResponse.json({ error: 'Override failed — please try again' }, { status: 500 })
  }
}
