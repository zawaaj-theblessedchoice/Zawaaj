// ─── POST /api/payments/gocardless/cancel-subscription ───────────────────────
// Cancels the active GoCardless subscription at period end.
// Does NOT immediately downgrade — downgrade happens at renewal_at (Phase G cron).
// Only callable by the family's primary_user_id.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { gocardless } from '@/lib/gocardless/client'
import { sendEmail } from '@/lib/email'
import { cancellationConfirmedTemplate } from '@/lib/email'

export async function POST(_req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Get active profile + family account
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!settings?.active_profile_id) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    const { data: profRow } = await supabase
      .from('zawaaj_profiles')
      .select('family_account_id')
      .eq('id', settings.active_profile_id)
      .maybeSingle()

    const familyAccountId = (profRow as { family_account_id?: string | null } | null)?.family_account_id
    if (!familyAccountId) {
      return NextResponse.json({ error: 'No family account found' }, { status: 400 })
    }

    const { data: famRow } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, primary_user_id, contact_email, contact_full_name')
      .eq('id', familyAccountId)
      .maybeSingle()

    const fam = famRow as {
      id: string
      primary_user_id: string | null
      contact_email: string | null
      contact_full_name: string | null
    } | null

    if (!fam || fam.primary_user_id !== user.id) {
      return NextResponse.json({ error: 'Only the family representative can cancel the subscription' }, { status: 403 })
    }

    // Fetch the active GoCardless subscription row
    const { data: subRow } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .select('id, gocardless_subscription_id, cancel_at_period_end, renewal_at, status')
      .eq('family_account_id', familyAccountId)
      .eq('payment_provider', 'gocardless')
      .in('status', ['active', 'pending'])
      .maybeSingle()

    const sub = subRow as {
      id: string
      gocardless_subscription_id: string | null
      cancel_at_period_end: boolean
      renewal_at: string | null
      status: string
    } | null

    if (!sub) {
      return NextResponse.json({ error: 'No active GoCardless subscription found' }, { status: 404 })
    }

    if (sub.cancel_at_period_end) {
      return NextResponse.json({
        error: 'Subscription is already scheduled for cancellation',
        access_until: sub.renewal_at,
      }, { status: 400 })
    }

    if (!sub.gocardless_subscription_id) {
      return NextResponse.json({ error: 'GoCardless subscription ID not found' }, { status: 500 })
    }

    // Cancel on GoCardless — this stops future payments
    await gocardless.subscriptions.cancel(sub.gocardless_subscription_id)

    const now = new Date().toISOString()

    // Mark as cancelled in DB — plan stays premium until renewal_at (handled by cron)
    await supabaseAdmin
      .from('zawaaj_subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: now,
      })
      .eq('id', sub.id)

    // Send confirmation email
    if (fam.contact_email) {
      const recipientName = fam.contact_full_name?.split(' ')[0] ?? 'there'
      await sendEmail({
        to: fam.contact_email,
        subject: 'Your Zawaaj Premium cancellation is confirmed',
        html: cancellationConfirmedTemplate(recipientName, sub.renewal_at),
      })
    }

    return NextResponse.json({ success: true, access_until: sub.renewal_at }, { status: 200 })
  } catch (err) {
    console.error('[GC cancel-subscription] error:', err)
    return NextResponse.json({ error: 'Failed to cancel subscription — please try again' }, { status: 500 })
  }
}
