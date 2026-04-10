import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Stripe requires the raw body for signature verification.
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // ─── Verify signature ──────────────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ─── Handle events ─────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── New checkout completed → provision subscription ────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.user_id
        if (!userId) { console.warn('[stripe/webhook] checkout.session.completed missing user_id'); break }

        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        // Retrieve full subscription
        const rawSub = await stripe.subscriptions.retrieve(subscriptionId)
        const sub = rawSub as SubWithPeriod

        await upsertSubscription({
          userId,
          plan: resolvePlan(rawSub),
          status: rawSub.status as SubscriptionStatus,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          periodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          periodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          cancelAtPeriodEnd: rawSub.cancel_at_period_end,
        })
        break
      }

      // ── Subscription changed (renewal, plan change, cancel toggle) ─────────
      case 'customer.subscription.updated': {
        const rawSub = event.data.object as Stripe.Subscription
        const sub = rawSub as SubWithPeriod
        const userId = rawSub.metadata?.user_id
        if (!userId) { console.warn('[stripe/webhook] subscription.updated missing user_id'); break }

        await upsertSubscription({
          userId,
          plan: resolvePlan(rawSub),
          status: rawSub.status as SubscriptionStatus,
          stripeCustomerId: rawSub.customer as string,
          stripeSubscriptionId: rawSub.id,
          periodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          periodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          cancelAtPeriodEnd: rawSub.cancel_at_period_end,
        })
        break
      }

      // ── Subscription deleted → downgrade to free ──────────────────────────
      case 'customer.subscription.deleted': {
        const rawSub = event.data.object as Stripe.Subscription
        const userId = rawSub.metadata?.user_id
        if (!userId) { console.warn('[stripe/webhook] subscription.deleted missing user_id'); break }

        await upsertSubscription({
          userId,
          plan: 'free',
          status: 'cancelled',
          stripeCustomerId: rawSub.customer as string,
          stripeSubscriptionId: rawSub.id,
          periodStart: null,
          periodEnd: null,
          cancelAtPeriodEnd: false,
        })
        break
      }

      // ── Invoice paid → renewal confirmed ──────────────────────────────────
      case 'invoice.payment_succeeded': {
        // In Stripe v22, subscription is under parent.subscription_details.subscription
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceAny = invoice as any
        const subId: string | null =
          invoiceAny.parent?.subscription_details?.subscription ??
          invoiceAny.subscription ??   // fallback for older API versions
          null
        if (!subId) break

        const rawSub = await stripe.subscriptions.retrieve(typeof subId === 'string' ? subId : subId)
        const sub = rawSub as SubWithPeriod
        const userId = rawSub.metadata?.user_id
        if (!userId) break

        // Use invoice period dates if available, fall back to subscription fields
        const periodEnd = invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null

        const periodStart = invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : null

        await upsertSubscription({
          userId,
          plan: resolvePlan(rawSub),
          status: 'active',
          stripeCustomerId: rawSub.customer as string,
          stripeSubscriptionId: rawSub.id,
          periodStart,
          periodEnd,
          cancelAtPeriodEnd: rawSub.cancel_at_period_end,
        })
        break
      }

      // ── Payment failed → mark past_due ────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceAny = invoice as any
        const subId: string | null =
          invoiceAny.parent?.subscription_details?.subscription ??
          invoiceAny.subscription ??
          null
        if (!subId) break

        const rawSub = await stripe.subscriptions.retrieve(typeof subId === 'string' ? subId : subId)
        const userId = rawSub.metadata?.user_id
        if (!userId) break

        await supabaseAdmin
          .from('zawaaj_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Error handling event:', event.type, err)
    // Always 200 so Stripe doesn't retry on a permanent error
  }

  return NextResponse.json({ received: true })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Stripe v22 TypeScript types removed current_period_start/end but the fields
// still exist in older API versions and may be present at runtime via fallback.
// We use a local type extension to access them safely.
interface SubWithPeriod {
  current_period_start?: number
  current_period_end?: number
}

type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'

/** Determine Zawaaj plan from subscription price IDs */
function resolvePlan(sub: Stripe.Subscription): 'free' | 'plus' | 'premium' {
  const priceId = sub.items.data[0]?.price?.id ?? ''

  const premiumPrices = [
    process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
  ].filter(Boolean)

  const plusPrices = [
    process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,
    process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
  ].filter(Boolean)

  if (premiumPrices.includes(priceId)) return 'premium'
  if (plusPrices.includes(priceId)) return 'plus'
  return 'free'
}

interface UpsertArgs {
  userId: string
  plan: 'free' | 'plus' | 'premium'
  status: SubscriptionStatus
  stripeCustomerId: string
  stripeSubscriptionId: string
  periodStart: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
}

async function upsertSubscription(args: UpsertArgs) {
  const { error } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .upsert(
      {
        user_id: args.userId,
        plan: args.plan,
        status: args.status,
        stripe_customer_id: args.stripeCustomerId,
        stripe_subscription_id: args.stripeSubscriptionId,
        current_period_start: args.periodStart,
        current_period_end: args.periodEnd,
        cancel_at_period_end: args.cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[stripe/webhook] upsertSubscription failed:', error.message)
    throw error
  }
}
