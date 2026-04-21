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

  if (subscription_id) {
    // Existing subscription row — simple update
    const { error } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .update({ plan, updated_at: now })
      .eq('id', subscription_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  return NextResponse.json({ ok: true })
}
