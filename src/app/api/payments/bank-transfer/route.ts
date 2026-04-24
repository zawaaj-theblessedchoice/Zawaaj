import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const PLAN_AMOUNTS: Record<string, number> = {
  plus: 9,
  premium: 19,
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    plan?: string
    method?: string
  }
  const plan   = body.plan   ?? ''
  const method = body.method ?? 'bank_transfer'

  if (!['plus', 'premium'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan. Must be "plus" or "premium".' }, { status: 400 })
  }
  if (!['bank_transfer', 'direct_debit'].includes(method)) {
    return NextResponse.json({ error: 'Invalid method.' }, { status: 400 })
  }

  // Resolve active profile
  const { data: settings } = await supabaseAdmin
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileId = settings?.active_profile_id
  if (!profileId) {
    return NextResponse.json({ error: 'No active profile found.' }, { status: 400 })
  }

  // Check for a duplicate pending request
  const { data: existing } = await supabaseAdmin
    .from('zawaaj_payment_requests')
    .select('id, reference, plan, amount_gbp')
    .eq('profile_id', profileId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      id: existing.id,
      reference: existing.reference,
      already_exists: true,
    })
  }

  const amountGbp = PLAN_AMOUNTS[plan]

  // Insert the request (reference generated from the UUID after insert)
  const { data: request, error } = await supabaseAdmin
    .from('zawaaj_payment_requests')
    .insert({
      profile_id:    profileId,
      plan,
      billing_cycle: 'monthly',
      amount_gbp:    amountGbp,
      method,
      status:        'pending',
    })
    .select('id')
    .single()

  if (error || !request) {
    console.error('[bank-transfer] insert error:', error)
    return NextResponse.json({ error: 'Failed to create payment request.' }, { status: 500 })
  }

  // Derive a short, memorable reference from the UUID
  const reference = `ZWJ-${request.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

  await supabaseAdmin
    .from('zawaaj_payment_requests')
    .update({ reference })
    .eq('id', request.id)

  return NextResponse.json({ id: request.id, reference })
}
