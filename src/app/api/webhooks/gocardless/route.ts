// ─── POST /api/webhooks/gocardless ───────────────────────────────────────────
// Receives and processes GoCardless webhook events.
// Security: HMAC-SHA256 signature verified on every request.
// All events processed idempotently.
// Register this URL in GoCardless Dashboard: https://www.zawaaj.uk/api/webhooks/gocardless
// Events: payments/confirmed, payments/paid_out, payments/failed,
//         subscriptions/cancelled, mandates/cancelled, mandates/active

import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
  premiumActivatedTemplate,
  paymentFailedTemplate,
  paymentFailedFinalTemplate,
  cancellationConfirmedTemplate,
} from '@/lib/email'

// Disable body parsing — we need the raw body for HMAC verification
export const dynamic = 'force-dynamic'

interface GCWebhookEvent {
  id: string
  created_at: string
  resource_type: string
  action: string
  links: {
    payment?: string
    subscription?: string
    mandate?: string
    organisation?: string
    [key: string]: string | undefined
  }
  details?: {
    cause?: string
    description?: string
    origin?: string
    reason_code?: string
  }
  metadata?: Record<string, string>
}

interface GCWebhookPayload {
  events: GCWebhookEvent[]
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

type SubRow = {
  id: string
  family_account_id: string
  gocardless_subscription_id: string | null
  gocardless_mandate_id: string | null
  payment_failure_count: number
  renewal_at: string | null
  billing_cycle: string | null
  status: string
}

async function getSubByGCSubscriptionId(gcSubId: string | undefined): Promise<SubRow | null> {
  if (!gcSubId) return null
  const { data } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, gocardless_subscription_id, gocardless_mandate_id, payment_failure_count, renewal_at, billing_cycle, status')
    .eq('gocardless_subscription_id', gcSubId)
    .maybeSingle()
  return (data as SubRow | null)
}

async function getSubByGCMandateId(gcMandateId: string | undefined): Promise<SubRow | null> {
  if (!gcMandateId) return null
  const { data } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, gocardless_subscription_id, gocardless_mandate_id, payment_failure_count, renewal_at, billing_cycle, status')
    .eq('gocardless_mandate_id', gcMandateId)
    .maybeSingle()
  return (data as SubRow | null)
}

async function getFamilyContactEmail(familyAccountId: string): Promise<{ email: string | null; name: string | null }> {
  const { data } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .select('contact_email, contact_full_name')
    .eq('id', familyAccountId)
    .maybeSingle()
  return {
    email: (data as { contact_email: string | null } | null)?.contact_email ?? null,
    name: (data as { contact_full_name: string | null } | null)?.contact_full_name ?? null,
  }
}

// ─── Event handler ────────────────────────────────────────────────────────────

async function handleGCEvent(event: GCWebhookEvent): Promise<void> {
  const key = `${event.resource_type}/${event.action}`
  console.log(`[GC webhook] processing event ${event.id}: ${key}`)

  switch (key) {

    case 'payments/confirmed':
    case 'payments/paid_out': {
      // Payment succeeded — activate subscription
      const sub = await getSubByGCSubscriptionId(event.links.subscription)
      if (!sub) {
        console.warn(`[GC webhook] No sub found for GC subscription ${event.links.subscription ?? '—'}`)
        break
      }

      // Idempotency: skip if already active
      if (sub.status === 'active') break

      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({
          status: 'active',
          payment_failure_count: 0,
          grace_period_until: null,
        })
        .eq('id', sub.id)

      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({
          plan: 'premium',
          subscription_status: 'active',
        })
        .eq('id', sub.family_account_id)

      const contact = await getFamilyContactEmail(sub.family_account_id)
      if (contact.email) {
        const recipientName = contact.name?.split(' ')[0] ?? 'there'
        await sendEmail({
          to: contact.email,
          subject: 'Your Zawaaj Premium is now active',
          html: premiumActivatedTemplate(recipientName, sub.renewal_at, sub.billing_cycle as 'monthly' | 'annual' | null, null),
        })
      }
      break
    }

    case 'payments/failed': {
      // Payment failed — increment failure count, apply grace period
      const sub = await getSubByGCSubscriptionId(event.links.subscription)
      if (!sub) {
        console.warn(`[GC webhook] No sub found for GC subscription ${event.links.subscription ?? '—'}`)
        break
      }

      const newFailureCount = (sub.payment_failure_count ?? 0) + 1
      const graceUntil = new Date(Date.now() + 7 * 86_400_000).toISOString()
      const isFinal = newFailureCount >= 3

      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({
          status: isFinal ? 'past_due' : 'active',
          payment_failure_count: newFailureCount,
          grace_period_until: graceUntil,
        })
        .eq('id', sub.id)

      const contact = await getFamilyContactEmail(sub.family_account_id)
      if (contact.email) {
        const recipientName = contact.name?.split(' ')[0] ?? 'there'
        await sendEmail({
          to: contact.email,
          subject: isFinal
            ? 'Your Zawaaj Premium will end soon'
            : 'Action needed — payment issue with your Zawaaj membership',
          html: isFinal
            ? paymentFailedFinalTemplate(recipientName, graceUntil)
            : paymentFailedTemplate(recipientName, newFailureCount, graceUntil),
        })
      }
      break
    }

    case 'subscriptions/cancelled': {
      // Subscription cancelled — set cancel_at_period_end, do NOT immediately downgrade
      const sub = await getSubByGCSubscriptionId(event.links.subscription)
      if (!sub) {
        console.warn(`[GC webhook] No sub found for GC subscription ${event.links.subscription ?? '—'}`)
        break
      }

      // Idempotency: skip if already marked for cancellation
      if (sub.status === 'cancelled') break

      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: true,
        })
        .eq('id', sub.id)

      const contact = await getFamilyContactEmail(sub.family_account_id)
      if (contact.email) {
        const recipientName = contact.name?.split(' ')[0] ?? 'there'
        await sendEmail({
          to: contact.email,
          subject: 'Your Zawaaj Premium cancellation is confirmed',
          html: cancellationConfirmedTemplate(recipientName, sub.renewal_at),
        })
      }
      break
    }

    case 'mandates/cancelled': {
      // Mandate cancelled (e.g. bank-initiated) — immediately downgrade
      const sub = await getSubByGCMandateId(event.links.mandate)
      if (!sub) break

      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', sub.id)

      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({
          plan: 'voluntary',
          subscription_status: 'cancelled',
          subscription_source: null,
          renewal_date: null,
        })
        .eq('id', sub.family_account_id)
      break
    }

    case 'mandates/active': {
      // Mandate activated — no action needed, payment event will activate subscription
      console.log(`[GC webhook] mandate active: ${event.links.mandate ?? '—'}`)
      break
    }

    default:
      console.log(`[GC webhook] unhandled event type: ${key}`)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('webhook-signature') ?? ''
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET

  if (!secret) {
    console.error('[GC webhook] GOCARDLESS_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Verify HMAC-SHA256 signature
  const expectedSig = createHmac('sha256', secret).update(body).digest('hex')
  if (signature !== expectedSig) {
    console.warn('[GC webhook] Invalid signature — rejecting request')
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: GCWebhookPayload
  try {
    payload = JSON.parse(body) as GCWebhookPayload
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const events = payload.events ?? []
  console.log(`[GC webhook] received ${events.length} event(s)`)

  for (const event of events) {
    try {
      await handleGCEvent(event)
    } catch (err) {
      console.error(`[GC webhook] error processing event ${event.id}:`, err)
      // Continue processing remaining events — don't fail the whole batch
    }
  }

  return new Response('OK', { status: 200 })
}
