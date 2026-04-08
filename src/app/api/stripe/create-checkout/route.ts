import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// ─── Price IDs (set in Vercel env vars) ──────────────────────────────────────
// STRIPE_PLUS_MONTHLY_PRICE_ID, STRIPE_PLUS_ANNUAL_PRICE_ID
// STRIPE_PREMIUM_MONTHLY_PRICE_ID, STRIPE_PREMIUM_ANNUAL_PRICE_ID

const PRICE_MAP: Record<string, string | undefined> = {
  plus_monthly:     process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,
  plus_annual:      process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
  premium_monthly:  process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  premium_annual:   process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
}

export async function POST(req: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ─── Payload ───────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { plan, billing } = body as { plan?: string; billing?: string }

  if (!plan || !billing) {
    return NextResponse.json({ error: 'Missing plan or billing' }, { status: 400 })
  }

  const priceKey = `${plan}_${billing}` // e.g. "plus_monthly"
  const priceId = PRICE_MAP[priceKey]

  if (!priceId) {
    return NextResponse.json({ error: `Price not configured for ${priceKey}` }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'

  // ─── Look up or pass existing Stripe customer ID ──────────────────────────
  const { data: subRow } = await supabase
    .from('zawaaj_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const existingCustomerId = subRow?.stripe_customer_id ?? undefined

  // ─── Create Stripe Checkout session ───────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: existingCustomerId,
    customer_email: existingCustomerId ? undefined : user.email,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${siteUrl}/settings?tab=membership&checkout=success`,
    cancel_url: `${siteUrl}/pricing`,
    allow_promotion_codes: false,
  })

  return NextResponse.json({ url: session.url })
}
