// ─── Supabase Edge Function: process-subscription-renewals ───────────────────
// Scheduled daily at 02:00 UTC via pg_cron.
//
// Owner: after deploying this function, run the following SQL to schedule it:
//
//   SELECT cron.schedule(
//     'process-subscription-renewals',
//     '0 2 * * *',
//     $$
//     SELECT net.http_post(
//       url := 'https://nxytwfbzoxatyupqccba.supabase.co/functions/v1/process-subscription-renewals',
//       headers := '{"Authorization": "Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
//       body := '{}'::jsonb
//     );
//     $$
//   );
//
// This function:
// 1. Downgrades families whose cancel_at_period_end=true AND renewal_at is past
// 2. Downgrades families past grace_period_until with 3+ payment failures
// 3. Sends renewal_reminder emails 7 days before renewal_at
// 4. Sends grace_warning emails 3 days before grace_period_until

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

interface SubRow {
  id: string
  family_account_id: string
  renewal_at: string | null
  grace_period_until: string | null
  payment_failure_count: number
  cancel_at_period_end: boolean
  billing_cycle: string | null
}

interface FamilyRow {
  id: string
  contact_email: string | null
  contact_full_name: string | null
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) { console.error('[cron] RESEND_API_KEY not set'); return }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Zawaaj <noreply@zawaaj.uk>', to: [to], subject, html }),
  })
  if (!res.ok) console.error('[cron] Resend error:', await res.text())
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return 'a future date'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function renewalReminderHtml(name: string, renewalAt: string): string {
  return `<html><body style="font-family:sans-serif;background:#111;color:#9ca3af;padding:40px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0 0 12px;">Your Zawaaj Premium renews in 7 days</h1>
      <p style="margin:0 0 16px;line-height:1.6;">Assalamu alaikum, ${name}. Your Zawaaj Premium membership will renew on <strong style="color:#e5e7eb;">${fmtDate(renewalAt)}</strong>.</p>
      <p style="margin:0 0 20px;">You can manage or cancel your membership from <a href="https://zawaaj.uk/settings?tab=membership" style="color:#B8960C;">Settings</a>.</p>
    </div>
  </body></html>`
}

function graceWarningHtml(name: string, graceUntil: string): string {
  return `<html><body style="font-family:sans-serif;background:#111;color:#9ca3af;padding:40px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0 0 12px;">Your grace period ends in 3 days</h1>
      <p style="margin:0 0 16px;line-height:1.6;">Assalamu alaikum, ${name}. Your Zawaaj Premium grace period ends on <strong style="color:#e5e7eb;">${fmtDate(graceUntil)}</strong>. After this date your account will return to Community Access unless payment is received.</p>
      <p>Please contact us at <a href="mailto:team@zawaaj.uk" style="color:#B8960C;">team@zawaaj.uk</a> urgently.</p>
    </div>
  </body></html>`
}

Deno.serve(async () => {
  const now = new Date()
  let processed = 0

  // ── 1. Downgrade: cancel_at_period_end + renewal_at past ──────────────────
  const { data: expired } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, renewal_at, grace_period_until, payment_failure_count, cancel_at_period_end, billing_cycle')
    .lte('renewal_at', now.toISOString())
    .eq('cancel_at_period_end', true)
    .eq('payment_provider', 'gocardless')
    .neq('status', 'cancelled')

  for (const sub of (expired ?? []) as SubRow[]) {
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ plan: 'voluntary', subscription_status: 'cancelled', subscription_source: null, renewal_date: null })
      .eq('id', sub.family_account_id)

    await supabaseAdmin
      .from('zawaaj_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', sub.id)

    processed++
    console.log(`[cron] downgraded (period end) family_account_id=${sub.family_account_id}`)
  }

  // ── 2. Downgrade: grace_period_until past + 3+ payment failures ───────────
  const { data: graceExpired } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, renewal_at, grace_period_until, payment_failure_count, cancel_at_period_end, billing_cycle')
    .lte('grace_period_until', now.toISOString())
    .gte('payment_failure_count', 3)
    .eq('payment_provider', 'gocardless')
    .neq('status', 'cancelled')

  for (const sub of (graceExpired ?? []) as SubRow[]) {
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ plan: 'voluntary', subscription_status: 'past_due', renewal_date: null })
      .eq('id', sub.family_account_id)

    await supabaseAdmin
      .from('zawaaj_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', sub.id)

    processed++
    console.log(`[cron] downgraded (grace expired) family_account_id=${sub.family_account_id}`)
  }

  // ── 3. Renewal reminders — 7 days before renewal_at ──────────────────────
  const in7Days = new Date(now.getTime() + 7 * 86_400_000)
  const in6Days = new Date(now.getTime() + 6 * 86_400_000)

  const { data: renewingSoon } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, renewal_at, grace_period_until, payment_failure_count, cancel_at_period_end, billing_cycle')
    .gte('renewal_at', in6Days.toISOString())
    .lte('renewal_at', in7Days.toISOString())
    .eq('payment_provider', 'gocardless')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)

  for (const sub of (renewingSoon ?? []) as SubRow[]) {
    const { data: fam } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, contact_full_name')
      .eq('id', sub.family_account_id)
      .maybeSingle()

    const f = fam as FamilyRow | null
    if (f?.contact_email) {
      const name = f.contact_full_name?.split(' ')[0] ?? 'there'
      await sendEmail(
        f.contact_email,
        'Your Zawaaj Premium renews in 7 days',
        renewalReminderHtml(name, sub.renewal_at!),
      )
    }
  }

  // ── 4. Grace period warnings — 3 days before grace_period_until ──────────
  const in3Days = new Date(now.getTime() + 3 * 86_400_000)
  const in2Days = new Date(now.getTime() + 2 * 86_400_000)

  const { data: graceWarningSubs } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('id, family_account_id, renewal_at, grace_period_until, payment_failure_count, cancel_at_period_end, billing_cycle')
    .gte('grace_period_until', in2Days.toISOString())
    .lte('grace_period_until', in3Days.toISOString())
    .eq('payment_provider', 'gocardless')
    .neq('status', 'cancelled')

  for (const sub of (graceWarningSubs ?? []) as SubRow[]) {
    const { data: fam } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, contact_full_name')
      .eq('id', sub.family_account_id)
      .maybeSingle()

    const f = fam as FamilyRow | null
    if (f?.contact_email) {
      const name = f.contact_full_name?.split(' ')[0] ?? 'there'
      await sendEmail(
        f.contact_email,
        'Your grace period ends in 3 days',
        graceWarningHtml(name, sub.grace_period_until!),
      )
    }
  }

  console.log(`[cron] process-subscription-renewals complete. Downgraded: ${processed}`)
  return new Response(JSON.stringify({ ok: true, downgraded: processed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
