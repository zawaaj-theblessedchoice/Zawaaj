// ─── POST /api/webhooks/gocardless ───────────────────────────────────────────
// Receives and processes GoCardless webhook events.
// Security: HMAC-SHA256 signature verified on every request.
// All events processed idempotently.
// Register this URL in GoCardless Dashboard: https://www.zawaaj.uk/api/webhooks/gocardless
// Events: payments/confirmed, payments/paid_out, payments/failed,
//         subscriptions/cancelled, mandates/cancelled, mandates/failed,
//         mandates/expired, mandates/active
// Founder alerts (to FOUNDER_EMAIL) fire on every failure/revocation path.

import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, FOUNDER_EMAIL } from '@/lib/email'
import {
  premiumActivatedTemplate,
  paymentFailedTemplate,
  paymentFailedFinalTemplate,
  cancellationConfirmedTemplate,
  founderAlertTemplate,
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
  is_provisional: boolean
}

const SUB_COLS =
  'id, family_account_id, gocardless_subscription_id, gocardless_mandate_id, payment_failure_count, renewal_at, billing_cycle, status, is_provisional'

async function getSubByGCSubscriptionId(gcSubId: string | undefined): Promise<SubRow | null> {
  if (!gcSubId) return null
  const { data } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select(SUB_COLS)
    .eq('gocardless_subscription_id', gcSubId)
    .maybeSingle()
  return (data as SubRow | null)
}

async function getSubByGCMandateId(gcMandateId: string | undefined): Promise<SubRow | null> {
  if (!gcMandateId) return null
  const { data } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select(SUB_COLS)
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

// ─── Shared actions ───────────────────────────────────────────────────────────

/** Send an ops alert to the founder inbox. Never throws (best-effort). */
async function alertFounder(
  heading: string,
  sub: SubRow,
  actionTaken: string,
  extra: { label: string; value: string }[] = [],
): Promise<void> {
  try {
    const contact = await getFamilyContactEmail(sub.family_account_id)
    const rows = [
      { label: 'Family account', value: sub.family_account_id },
      { label: 'Member', value: `${contact.name ?? '—'}${contact.email ? ` <${contact.email}>` : ''}` },
      { label: 'Subscription', value: sub.gocardless_subscription_id ?? '—' },
      { label: 'Current status', value: `${sub.status}${sub.is_provisional ? ' (provisional)' : ''}` },
      ...extra,
    ]
    await sendEmail({
      to: FOUNDER_EMAIL,
      subject: `[Zawaaj] ${heading}`,
      html: founderAlertTemplate(heading, rows, actionTaken),
    })
  } catch (err) {
    console.error('[GC webhook] founder alert failed:', err)
  }
}

/** Revoke Premium immediately — subscription cancelled + family back to free. */
async function downgradeFamilyToFree(sub: SubRow, subStatus: 'cancelled' | 'past_due' = 'cancelled'): Promise<void> {
  await supabaseAdmin
    .from('zawaaj_subscriptions')
    .update({
      status: subStatus,
      is_provisional: false,
      cancelled_at: new Date().toISOString(),
      grace_period_until: null,
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
}

/** True when the sub has a paid period still running (don't yank access early). */
function hasPaidPeriodRemaining(sub: SubRow): boolean {
  return !sub.is_provisional && !!sub.renewal_at && new Date(sub.renewal_at).getTime() > Date.now()
}

// ─── Event handler ────────────────────────────────────────────────────────────

// We integrate via the Redirect Flows API, not the Billing Requests API, so any
// billing_requests* events GoCardless emits are irrelevant to us. Acknowledge and
// ignore them quietly rather than logging them as "unhandled".
const IGNORED_RESOURCE_TYPES = new Set([
  'billing_requests',
  'billing_request_flows',
  'billing_request_templates',
])

async function handleGCEvent(event: GCWebhookEvent): Promise<void> {
  const key = `${event.resource_type}/${event.action}`

  if (IGNORED_RESOURCE_TYPES.has(event.resource_type)) {
    console.log(`[GC webhook] ignoring ${key} — Billing Requests API not used`)
    return
  }

  console.log(`[GC webhook] processing event ${event.id}: ${key}`)

  switch (key) {

    case 'payments/confirmed':
    case 'payments/paid_out': {
      // Payment succeeded — activate subscription
      const sub = await getSubByGCSubscriptionId(event.links.subscription)
      if (!sub) {
        // A confirmed payment with NO matching subscription row means a member is
        // being charged with nothing recorded — must never be silent. Alert.
        console.error(`[GC webhook] CONFIRMED PAYMENT with no subscription row — GC subscription ${event.links.subscription ?? '—'}`)
        try {
          await sendEmail({
            to: FOUNDER_EMAIL,
            subject: '[Zawaaj] URGENT — confirmed payment with no subscription record',
            html: founderAlertTemplate(
              'GoCardless confirmed a payment but no subscription row exists',
              [
                { label: 'GC subscription', value: event.links.subscription ?? '—' },
                { label: 'GC payment', value: event.links.payment ?? '—' },
                { label: 'Event', value: event.id },
              ],
              'A member is being charged but has no Premium record. Create the subscription row manually to grant access.',
            ),
          })
        } catch { /* best effort */ }
        break
      }

      // Idempotency: skip only if ALREADY CONFIRMED (active + not provisional).
      // A provisional row is status 'active' too — it must still be converted.
      if (sub.status === 'active' && !sub.is_provisional) break

      // Provisional → confirmed. Premium was already live; just clear the flag.
      await supabaseAdmin
        .from('zawaaj_subscriptions')
        .update({
          status: 'active',
          is_provisional: false,
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

      // Only email the member the first time (on conversion from provisional).
      if (sub.is_provisional) {
        const contact = await getFamilyContactEmail(sub.family_account_id)
        if (contact.email) {
          const recipientName = contact.name?.split(' ')[0] ?? 'there'
          await sendEmail({
            to: contact.email,
            subject: 'Your Zawaaj Premium payment is confirmed',
            html: premiumActivatedTemplate(recipientName, sub.renewal_at, sub.billing_cycle as 'monthly' | 'annual' | null, null),
          })
        }
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
      // GoCardless auto-retries, so we do NOT revoke on the first failures. Once
      // retries are exhausted (>= 3) the payment has failed terminally → revoke.
      const isTerminal = newFailureCount >= 3

      const contact = await getFamilyContactEmail(sub.family_account_id)
      const recipientName = contact.name?.split(' ')[0] ?? 'there'

      if (isTerminal) {
        // Terminal — revoke Premium to free, alert founder, email the member.
        await downgradeFamilyToFree(sub, 'past_due')
        if (contact.email) {
          await sendEmail({
            to: contact.email,
            subject: 'Your Zawaaj Premium has ended — payment could not be collected',
            html: paymentFailedFinalTemplate(recipientName, graceUntil),
          })
        }
        await alertFounder(
          'Premium revoked — terminal payment failure',
          sub,
          'GoCardless retries exhausted. Premium revoked to free and the member has been emailed.',
          [{ label: 'Failed attempts', value: String(newFailureCount) }],
        )
      } else {
        // Retrying — keep access, log, alert founder, nudge the member.
        await supabaseAdmin
          .from('zawaaj_subscriptions')
          .update({
            status: 'active',
            payment_failure_count: newFailureCount,
            grace_period_until: graceUntil,
          })
          .eq('id', sub.id)
        if (contact.email) {
          await sendEmail({
            to: contact.email,
            subject: 'Action needed — payment issue with your Zawaaj membership',
            html: paymentFailedTemplate(recipientName, newFailureCount, graceUntil),
          })
        }
        await alertFounder(
          'Payment failed (GoCardless retrying)',
          sub,
          'Access retained while GoCardless retries. No revocation yet.',
          [{ label: 'Failed attempts', value: `${newFailureCount} of 3` }],
        )
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

      // Idempotency: skip if already scheduled for cancellation.
      if (sub.status === 'cancelled') break

      if (hasPaidPeriodRemaining(sub)) {
        // CD-002: keep Premium (status stays 'active') until the paid period ends;
        // the daily cron downgrades once renewal_at passes.
        await supabaseAdmin
          .from('zawaaj_subscriptions')
          .update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() })
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
        await alertFounder(
          'Subscription cancelled — access until period end',
          sub,
          `Premium retained until ${sub.renewal_at ?? 'period end'}, then auto-downgraded by the cron.`,
        )
      } else {
        // No paid period remaining (e.g. provisional) — downgrade now.
        await downgradeFamilyToFree(sub)
        await alertFounder(
          'Subscription cancelled — downgraded now',
          sub,
          'No paid period remaining; Premium revoked to free.',
        )
      }
      break
    }

    case 'mandates/cancelled':
    case 'mandates/failed':
    case 'mandates/expired': {
      // The customer can no longer be charged. Revoke — but respect any period
      // already paid for (don't yank a confirmed member's paid period early).
      const sub = await getSubByGCMandateId(event.links.mandate)
      if (!sub) break
      if (sub.status === 'cancelled' && !hasPaidPeriodRemaining(sub)) break // already down

      const reason = event.action // cancelled | failed | expired

      if (hasPaidPeriodRemaining(sub)) {
        await supabaseAdmin
          .from('zawaaj_subscriptions')
          .update({ cancel_at_period_end: true })
          .eq('id', sub.id)
        await alertFounder(
          `Mandate ${reason} — access until period end`,
          sub,
          `Customer can no longer be charged. Premium kept until the paid period ends (${sub.renewal_at ?? '—'}), then the cron downgrades.`,
        )
      } else {
        await downgradeFamilyToFree(sub)
        await alertFounder(
          `Mandate ${reason} — Premium revoked`,
          sub,
          'Customer can no longer be charged and no paid period remained. Premium revoked to free.',
        )
      }
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
