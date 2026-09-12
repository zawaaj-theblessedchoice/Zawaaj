// ─── POST /api/payments/gocardless/complete-redirect-flow ────────────────────
// Called on return from GoCardless hosted page.
// Completes the redirect flow, creates GC subscription, upserts zawaaj_subscriptions.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { gocardless } from '@/lib/gocardless/client'
import { completeRedirectFlow } from '@/lib/gocardless/completeRedirectFlow'
import { GC_PRICES, GC_ENABLED } from '@/lib/gocardless/config'
import { premiumPricePence } from '@/lib/launchDiscount'
import { sendEmail, premiumActivatedTemplate, founderAlertTemplate, FOUNDER_EMAIL } from '@/lib/email'

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

    // Complete the redirect flow — validates the session_token matches the one
    // used at creation (both are the authenticated user's id). Uses a direct
    // request with the correct `data` envelope; the SDK's own complete() sends the
    // wrong `redirect_flows` envelope and is rejected 400 by GoCardless.
    const completedFlow = await completeRedirectFlow(redirect_flow_id, user.id)

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

    // Launch discount: the amount is computed from NOW (subscription-creation time)
    // vs the cutoff. Pre-cutoff joiners are created at the discounted amount; since
    // a GoCardless subscription's amount persists across renewals, this LOCKS the
    // discounted price for the life of the subscription — no re-discounting needed.
    const chargeAmount = premiumPricePence({ billingCycle, subscribedAt: new Date() })

    // Create GoCardless subscription
    // GC SDK requires amount and interval as strings (not numbers)
    const subscription = await gocardless.subscriptions.create({
      amount: String(chargeAmount),
      currency: priceConfig.currency,
      name: priceConfig.name,
      interval_unit: priceConfig.interval_unit,
      interval: String(priceConfig.interval),
      links: { mandate: mandateId },
    })

    const nextChargeDate = subscription.upcoming_payments?.[0]?.charge_date ?? null

    // ── CANONICAL WRITE ───────────────────────────────────────────────────────
    // The zawaaj_subscriptions row is the source of truth for entitlement AND
    // Settings (both read it by user_id + status='active'). It MUST be written,
    // and its error MUST be surfaced, before we claim success or touch the family
    // mirror. Provisional Premium is granted immediately: status 'active' (so
    // entitlement passes now) + is_provisional; the first payment_confirmed
    // webhook clears the flag, and the grace-period cron downgrades it if no
    // payment confirms in time.
    //
    // onConflict MUST be 'user_id' — the table's only unique constraint
    // (UNIQUE(user_id), migration 006). A previous version used
    // 'family_account_id', which has only a plain index (025) and no unique
    // constraint, so every upsert failed with Postgres 42P10. supabase-js returns
    // that error (it does not throw) and the code never checked .error, so the
    // failure was silently swallowed and no row was ever created.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: subError } = await (supabaseAdmin as any)
      .from('zawaaj_subscriptions')
      .upsert({
        family_account_id: familyAccountId,
        user_id: user.id,
        plan: 'premium',
        status: 'active',
        is_provisional: true,
        granted_at: new Date().toISOString(),
        payment_provider: 'gocardless',
        gocardless_customer_id: customerId,
        gocardless_mandate_id: mandateId,
        gocardless_subscription_id: subscription.id,
        billing_cycle: billingCycle,
        renewal_at: nextChargeDate,
        cancel_at_period_end: false,
        payment_failure_count: 0,
      }, {
        onConflict: 'user_id',
      })

    if (subError) {
      // The GoCardless subscription already exists, so the member WILL be charged.
      // Do NOT report success and do NOT leave the family mirror claiming Premium.
      // Surface the failure and alert the founder to reconcile manually.
      console.error('[GC complete-redirect-flow] subscription upsert failed:', subError)
      try {
        await sendEmail({
          to: FOUNDER_EMAIL,
          subject: '[Zawaaj] URGENT — DD completed but subscription row NOT recorded',
          html: founderAlertTemplate(
            'Direct Debit completed but the subscription row failed to write',
            [
              { label: 'Family account', value: familyAccountId },
              { label: 'Member', value: `${fam.contact_full_name ?? '—'}${fam.contact_email ? ` <${fam.contact_email}>` : ''}` },
              { label: 'GC subscription', value: subscription.id ?? '—' },
              { label: 'GC mandate', value: mandateId },
              { label: 'DB error', value: (subError as { message?: string }).message ?? String(subError) },
            ],
            'The member will be charged by GoCardless but has NO Premium record. Reconcile the subscription row manually.',
          ),
        })
      } catch { /* best effort */ }
      return NextResponse.json(
        { error: 'We could not finish setting up your membership. Please contact support — no payment has been lost.' },
        { status: 500 },
      )
    }

    // Mirror the plan onto the family account (read by the admin families list).
    // Non-fatal: entitlement already reads the canonical subscription row above,
    // and the payment webhooks keep this in sync afterwards.
    const { error: famError } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({
        plan: 'premium',
        subscription_source: 'gocardless',
        subscription_status: 'active',
        renewal_date: nextChargeDate,
      })
      .eq('id', familyAccountId)
    if (famError) {
      console.error('[GC complete-redirect-flow] family mirror update failed (non-fatal):', famError.message)
    }

    // Send confirmation email
    if (fam.contact_email) {
      const recipientName = fam.contact_full_name?.split(' ')[0] ?? 'there'
      await sendEmail({
        to: fam.contact_email,
        subject: 'Your Zawaaj Premium is active',
        html: premiumActivatedTemplate(recipientName, nextChargeDate, billingCycle, chargeAmount / 100),
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[GC complete-redirect-flow] error:', err)
    return NextResponse.json({ error: 'Failed to complete Direct Debit setup — please try again' }, { status: 500 })
  }
}
