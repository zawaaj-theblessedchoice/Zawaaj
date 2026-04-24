import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin check
  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    action?: string
    rejection_reason?: string
  }
  const { action, rejection_reason } = body

  if (!['approve', 'reject'].includes(action ?? '')) {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  // Fetch the payment request
  const { data: request, error: fetchErr } = await supabaseAdmin
    .from('zawaaj_payment_requests')
    .select('id, profile_id, family_account_id, plan, billing_cycle, amount_gbp, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !request) {
    return NextResponse.json({ error: 'Payment request not found.' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return NextResponse.json({ error: `Request is already ${request.status}.` }, { status: 409 })
  }

  const now = new Date().toISOString()

  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('zawaaj_payment_requests')
      .update({
        status:           'rejected',
        reviewed_at:      now,
        reviewed_by:      user.id,
        rejection_reason: rejection_reason ?? null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to reject.' }, { status: 500 })
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // ── APPROVE ──────────────────────────────────────────────────────────────────

  // 1. Mark request approved
  const { error: updateErr } = await supabaseAdmin
    .from('zawaaj_payment_requests')
    .update({
      status:      'approved',
      reviewed_at: now,
      reviewed_by: user.id,
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: 'Failed to approve request.' }, { status: 500 })

  // 2. Upsert zawaaj_subscriptions for the profile
  if (request.profile_id) {
    // Find the user_id for this profile
    const { data: profile } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('user_id')
      .eq('id', request.profile_id)
      .maybeSingle()

    if (profile?.user_id) {
      const renewalDate = new Date()
      renewalDate.setMonth(renewalDate.getMonth() + 1)

      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .upsert(
          {
            profile_id:          request.profile_id,
            user_id:             profile.user_id,
            plan:                request.plan,
            status:              'active',
            current_period_end:  renewalDate.toISOString(),
            cancel_at_period_end: false,
            updated_at:          now,
          },
          { onConflict: 'profile_id' }
        )
    }
  }

  // 3. Update family_account.plan if linked
  if (request.family_account_id) {
    const renewalDate = new Date()
    renewalDate.setMonth(renewalDate.getMonth() + 1)

    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({
        plan:                 request.plan,
        subscription_source:  'bank_transfer',
        subscription_status:  'active',
        renewal_date:         renewalDate.toISOString(),
      })
      .eq('id', request.family_account_id)
  }

  return NextResponse.json({ success: true, status: 'approved', plan: request.plan })
}
