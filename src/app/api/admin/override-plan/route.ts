import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // ─── Auth + admin guard ───────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: _role } = await supabase.rpc('zawaaj_get_role'); const isSuperAdmin = _role === 'super_admin'
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── Payload ──────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { subscription_id, user_id, plan } = body as {
    subscription_id?: string | null
    user_id?: string
    plan?: string
  }

  if ((!subscription_id && !user_id) || !plan) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['free', 'plus', 'premium'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Track the affected user so we can mirror the plan onto their family account.
  let affectedUserId: string | null = user_id ?? null

  if (subscription_id) {
    // Existing subscription row — simple update
    const { error } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .update({ plan, updated_at: now })
      .eq('id', subscription_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Resolve the user_id from the subscription so the family-account sync below works
    if (!affectedUserId) {
      const { data: subRow } = await supabaseAdmin
        .from('zawaaj_subscriptions')
        .select('user_id')
        .eq('id', subscription_id)
        .maybeSingle()
      affectedUserId = (subRow?.user_id as string | null) ?? null
    }
  } else {
    // No subscription row yet — create one (virtual free account override)
    const { error } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .upsert(
        {
          user_id,
          plan,
          status: 'active',
          cancel_at_period_end: false,
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Keep zawaaj_family_accounts.plan in sync ──────────────────────────────
  // Both columns are canonical: member-facing surfaces read subscriptions.plan,
  // the admin families list reads family_accounts.plan. GoCardless + Stripe both
  // write the pair together; this admin override (incl. the "Grant Premium"
  // manager tickbox) must do the same, or a comped member shows the wrong plan
  // in the families list. Writes the explicit enum — never a boolean — so the
  // Plus tier stays distinct and re-activatable.
  if (affectedUserId) {
    // updated_at is maintained by the zfa_updated_at trigger — no need to set it here.
    const { error: faErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ plan })
      .eq('primary_user_id', affectedUserId)
    if (faErr) {
      // Non-fatal: subscriptions (the payment-side source) was updated successfully.
      // Log so a divergence is visible rather than silent.
      console.error('[override-plan] family_accounts.plan sync failed:', faErr.message)
    }
  }

  return NextResponse.json({ ok: true })
}
