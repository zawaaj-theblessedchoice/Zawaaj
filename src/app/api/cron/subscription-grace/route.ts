import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, FOUNDER_EMAIL, founderAlertTemplate } from '@/lib/email'

export const dynamic = 'force-dynamic'

// ─── Subscription grace-period safety net ────────────────────────────────────
// Called daily by Vercel Cron (vercel.json) — secured via CRON_SECRET header.
//
// Backs up the webhook state machine in case an event is ever missed:
//   1. PROVISIONAL EXPIRY — a subscription granted provisionally on DD setup whose
//      first payment never confirmed within GRACE_WORKING_DAYS is downgraded to
//      free. Guarantees no one keeps Premium indefinitely without paying.
//   2. PERIOD-END DOWNGRADE — a cancelled subscription (cancel_at_period_end) whose
//      paid period has now ended is downgraded to free (CD-002: access until end
//      of the paid period, then free).
// Every downgrade emails the founder.

const GRACE_WORKING_DAYS = 5

/** Subtract `n` working days (Mon–Fri) from `from`. */
function subtractWorkingDays(from: Date, n: number): Date {
  const d = new Date(from)
  let remaining = n
  while (remaining > 0) {
    d.setDate(d.getDate() - 1)
    const day = d.getDay() // 0 Sun … 6 Sat
    if (day !== 0 && day !== 6) remaining--
  }
  return d
}

type GraceSub = {
  id: string
  family_account_id: string
  gocardless_subscription_id: string | null
  granted_at: string | null
  renewal_at: string | null
  status: string
  is_provisional: boolean
}

async function downgradeToFree(sub: GraceSub): Promise<void> {
  await supabaseAdmin
    .from('zawaaj_subscriptions')
    .update({
      status: 'cancelled',
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

async function alertFounder(heading: string, sub: GraceSub, actionTaken: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('contact_email, contact_full_name')
      .eq('id', sub.family_account_id)
      .maybeSingle()
    const c = data as { contact_email: string | null; contact_full_name: string | null } | null
    const rows = [
      { label: 'Family account', value: sub.family_account_id },
      { label: 'Member', value: `${c?.contact_full_name ?? '—'}${c?.contact_email ? ` <${c.contact_email}>` : ''}` },
      { label: 'Subscription', value: sub.gocardless_subscription_id ?? '—' },
      { label: 'Granted at', value: sub.granted_at ?? '—' },
    ]
    await sendEmail({
      to: FOUNDER_EMAIL,
      subject: `[Zawaaj] ${heading}`,
      html: founderAlertTemplate(heading, rows, actionTaken),
    })
  } catch (err) {
    console.error('[cron/subscription-grace] founder alert failed:', err)
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const graceCutoff = subtractWorkingDays(new Date(), GRACE_WORKING_DAYS).toISOString()

  let provisionalExpired = 0
  let periodEnded = 0

  // 1. Provisional grants past the grace window with no confirmed payment.
  const { data: provisional, error: provErr } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, gocardless_subscription_id, granted_at, renewal_at, status, is_provisional')
    .eq('is_provisional', true)
    .eq('status', 'active')
    .lt('granted_at', graceCutoff)

  if (provErr) {
    console.error('[cron/subscription-grace] provisional query error:', provErr.message)
    return NextResponse.json({ error: provErr.message }, { status: 500 })
  }

  for (const sub of (provisional ?? []) as GraceSub[]) {
    await downgradeToFree(sub)
    await alertFounder(
      'Provisional Premium auto-downgraded (grace window elapsed)',
      sub,
      `No payment confirmed within ${GRACE_WORKING_DAYS} working days of the provisional grant. Premium downgraded to free.`,
    )
    provisionalExpired++
  }

  // 2. Cancelled subscriptions whose paid period has now ended.
  const { data: ended, error: endErr } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, gocardless_subscription_id, granted_at, renewal_at, status, is_provisional')
    .eq('cancel_at_period_end', true)
    .eq('status', 'active')
    .lt('renewal_at', nowIso)

  if (endErr) {
    console.error('[cron/subscription-grace] period-end query error:', endErr.message)
    return NextResponse.json({ error: endErr.message }, { status: 500 })
  }

  for (const sub of (ended ?? []) as GraceSub[]) {
    await downgradeToFree(sub)
    await alertFounder(
      'Premium downgraded at end of paid period',
      sub,
      'The cancelled subscription reached the end of its paid period. Premium downgraded to free.',
    )
    periodEnded++
  }

  console.log(`[cron/subscription-grace] provisionalExpired=${provisionalExpired} periodEnded=${periodEnded}`)
  return NextResponse.json({ provisionalExpired, periodEnded })
}
