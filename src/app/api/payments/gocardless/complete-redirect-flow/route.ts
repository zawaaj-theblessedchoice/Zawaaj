// ─── POST /api/payments/gocardless/complete-redirect-flow ────────────────────
// Called on return from GoCardless hosted page.
// Completes the redirect flow, creates GC subscription, upserts zawaaj_subscriptions.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { gocardless } from '@/lib/gocardless/client'
import { GC_PRICES, GC_ENABLED } from '@/lib/gocardless/config'
import { sendEmail, premiumActivatedTemplate } from '@/lib/email'

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

    const body = await req.json() as { redirect_flow_id?: string }
    const { redirect_flow_id } = body

    if (!redirect_flow_id) {
      return NextResponse.json({ error: 'Missing redirect_flow_id' }, { status: 400 })
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
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    // Complete the redirect flow — validates session_token matches
    const completedFlow = await gocardless.redirectFlows.complete(redirect_flow_id, {
      session_token: user.id,
    })

    const mandateId = completedFlow.links?.mandate
    const customerId = completedFlow.links?.customer

    if (!mandateId || !customerId) {
      return NextResponse.json({ error: 'GoCardless did not return mandate/customer IDs' }, { status: 500 })
    }

    // Determine billing_cycle from the redirect flow description
    // We infer from the redirect flow description — default to monthly if ambiguous
    const description = (completedFlow as { description?: string }).description ?? ''
    const billingCycle: 'monthly' | 'annual' = description.toLowerCase().includes('annual') ? 'annual' : 'monthly'
    const priceConfig = GC_PRICES.premium[billingCycle]

    // Create GoCardless subscription
    // GC SDK requires amount and interval as strings (not numbers)
    const subscription = await gocardless.subscriptions.create({
      amount: String(priceConfig.amount),
      currency: priceConfig.currency,
      name: priceConfig.name,
      interval_unit: priceConfig.interval_unit,
      interval: String(priceConfig.interval),
      links: { mandate: mandateId },
    })

    const nextChargeDate = subscription.upcoming_payments?.[0]?.charge_date ?? null

    // Upsert zawaaj_subscriptions row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('zawaaj_subscriptions')
      .upsert({
        family_account_id: familyAccountId,
        user_id: user.id,
        plan: 'premium',
        status: 'pending',  // → 'active' on first payment_confirmed webhook
        payment_provider: 'gocardless',
        gocardless_customer_id: customerId,
        gocardless_mandate_id: mandateId,
        gocardless_subscription_id: subscription.id,
        billing_cycle: billingCycle,
        renewal_at: nextChargeDate,
        cancel_at_period_end: false,
        payment_failure_count: 0,
      }, {
        onConflict: 'family_account_id',
      })

    // Update family account
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({
        plan: 'premium',
        subscription_source: 'gocardless',
        subscription_status: 'pending',
        renewal_date: nextChargeDate,
      })
      .eq('id', familyAccountId)

    // Send confirmation email
    if (fam.contact_email) {
      const recipientName = fam.contact_full_name?.split(' ')[0] ?? 'there'
      await sendEmail({
        to: fam.contact_email,
        subject: 'Your Zawaaj Premium Direct Debit is set up',
        html: premiumActivatedTemplate(recipientName, nextChargeDate, billingCycle, priceConfig.amount / 100),
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[GC complete-redirect-flow] error:', err)
    return NextResponse.json({ error: 'Failed to complete Direct Debit setup — please try again' }, { status: 500 })
  }
}
