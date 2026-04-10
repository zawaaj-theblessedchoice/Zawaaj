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

  const { data: isSuperAdmin } = await supabase.rpc('zawaaj_is_super_admin')
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── Payload ──────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { subscription_id, plan } = body as { subscription_id?: string; plan?: string }

  if (!subscription_id || !plan) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['free', 'plus', 'premium'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', subscription_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
