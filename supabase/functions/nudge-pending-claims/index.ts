/**
 * nudge-pending-claims — Supabase Edge Function
 *
 * Runs daily (scheduled via pg_cron → net.http_post) to send reminder emails
 * to imported family accounts whose claim invite has not been accepted.
 *
 * Schedule:
 *   Day 7  after magic link sent → first reminder email
 *   Day 14 after magic link sent → second (escalation) email
 *   Day 21+ with no claim       → appends stale notice to admin_notes for manager review
 *
 * Environment variables required:
 *   SUPABASE_URL              — set automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — set automatically by Supabase
 *   RESEND_API_KEY            — Resend.com API key for transactional email
 *   SITE_URL                  — e.g. https://zawaaj.uk
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingToken {
  id: string
  family_account_id: string
  created_at: string
  invited_email: string | null
  // Joined from zawaaj_family_accounts
  contact_email: string | null
  contact_full_name: string | null
  snoozed_until: string | null
  nudge_7_sent_at: string | null
  nudge_14_sent_at: string | null
  admin_notes: string | null
}

interface NudgeResult {
  total_checked: number
  day7_sent: number
  day14_sent: number
  stale_flagged: number
  skipped_snoozed: number
  errors: string[]
}

// ─── Email sending via Resend ─────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  resendKey: string,
): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Zawaaj <noreply@zawaaj.uk>',
        to:      [to],
        subject,
        html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function day7EmailHtml(claimLink: string, name: string | null): string {
  const greeting = name ? `Dear ${name}` : 'Assalamu alaikum'
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#B8960C">Zawaaj — Your account is ready</h2>
      <p>${greeting},</p>
      <p>A gentle reminder that your Zawaaj family account has been set up and is waiting for you to activate it.</p>
      <p>Your existing profile details have already been saved — activation should only take a couple of minutes, in shaa Allah.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${claimLink}"
           style="background:#B8960C;color:#111;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">
          Activate my account
        </a>
      </p>
      <p style="color:#666;font-size:13px">
        This link expires in 30 days from when it was first sent. If you have any questions,
        please contact us at <a href="mailto:info@zawaaj.uk">info@zawaaj.uk</a>.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#999;font-size:11px">Zawaaj · Private Muslim matrimonial · zawaaj.uk</p>
    </div>
  `
}

function day14EmailHtml(claimLink: string, name: string | null): string {
  const greeting = name ? `Dear ${name}` : 'Assalamu alaikum'
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#B8960C">Zawaaj — Final reminder</h2>
      <p>${greeting},</p>
      <p>We've noticed your Zawaaj family account hasn't been activated yet. This is our final automated reminder.</p>
      <p>Your profile details are saved and ready. If you'd like to proceed, please activate before the link expires.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${claimLink}"
           style="background:#B8960C;color:#111;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">
          Activate my account
        </a>
      </p>
      <p style="color:#666;font-size:13px">
        If you no longer wish to proceed or received this in error, please reply to this email and we will remove your details.
        Contact: <a href="mailto:info@zawaaj.uk">info@zawaaj.uk</a>.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#999;font-size:11px">Zawaaj · Private Muslim matrimonial · zawaaj.uk</p>
    </div>
  `
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey       = Deno.env.get('RESEND_API_KEY') ?? ''
  const siteUrl         = Deno.env.get('SITE_URL') ?? 'https://zawaaj.uk'

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now      = new Date()

  const result: NudgeResult = {
    total_checked:   0,
    day7_sent:       0,
    day14_sent:      0,
    stale_flagged:   0,
    skipped_snoozed: 0,
    errors:          [],
  }

  // ── 1. Load all pending claim invite tokens ──────────────────────────────────
  // Join via family_account_id to get contact details and nudge state
  const { data: tokens, error: queryErr } = await supabase
    .from('zawaaj_invite_tokens')
    .select(`
      id, family_account_id, created_at, invited_email,
      zawaaj_family_accounts!inner(
        contact_email, contact_full_name, snoozed_until,
        nudge_7_sent_at, nudge_14_sent_at, admin_notes
      )
    `)
    .eq('purpose', 'claim_invite')
    .is('accepted_at', null)
    .gt('expires_at', now.toISOString())

  if (queryErr) {
    return new Response(
      JSON.stringify({ error: queryErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const rows = (tokens ?? []) as unknown as Array<{
    id: string
    family_account_id: string
    created_at: string
    invited_email: string | null
    zawaaj_family_accounts: {
      contact_email: string | null
      contact_full_name: string | null
      snoozed_until: string | null
      nudge_7_sent_at: string | null
      nudge_14_sent_at: string | null
      admin_notes: string | null
    }
  }>

  result.total_checked = rows.length

  for (const row of rows) {
    const fa = row.zawaaj_family_accounts

    // Skip snoozed accounts
    if (fa.snoozed_until && new Date(fa.snoozed_until) > now) {
      result.skipped_snoozed++
      continue
    }

    const email = fa.contact_email ?? row.invited_email
    if (!email) continue

    const tokenCreated = new Date(row.created_at)
    const daysSince    = Math.floor((now.getTime() - tokenCreated.getTime()) / (1000 * 60 * 60 * 24))
    const claimLink    = `${siteUrl}/register/accept-invite?token=${row.id}`
    const contactName  = fa.contact_full_name ?? null
    const faId         = row.family_account_id

    // ── Day 7 nudge ──────────────────────────────────────────────────────────
    if (daysSince >= 7 && !fa.nudge_7_sent_at) {
      let sent = false
      if (resendKey) {
        sent = await sendEmail(
          email,
          'Zawaaj — Your account is ready to activate',
          day7EmailHtml(claimLink, contactName),
          resendKey,
        )
      } else {
        // No email service configured — log only
        console.log(`[nudge-day7] Would email ${email} (no RESEND_API_KEY)`)
        sent = true // mark as sent so we don't retry endlessly
      }

      if (sent) {
        await supabase
          .from('zawaaj_family_accounts')
          .update({ nudge_7_sent_at: now.toISOString() })
          .eq('id', faId)

        result.day7_sent++
      } else {
        result.errors.push(`Day-7 email failed for family_account_id=${faId}`)
      }
    }

    // ── Day 14 nudge ─────────────────────────────────────────────────────────
    else if (daysSince >= 14 && fa.nudge_7_sent_at && !fa.nudge_14_sent_at) {
      let sent = false
      if (resendKey) {
        sent = await sendEmail(
          email,
          'Zawaaj — Final reminder to activate your account',
          day14EmailHtml(claimLink, contactName),
          resendKey,
        )
      } else {
        console.log(`[nudge-day14] Would email ${email} (no RESEND_API_KEY)`)
        sent = true
      }

      if (sent) {
        await supabase
          .from('zawaaj_family_accounts')
          .update({ nudge_14_sent_at: now.toISOString() })
          .eq('id', faId)

        result.day14_sent++
      } else {
        result.errors.push(`Day-14 email failed for family_account_id=${faId}`)
      }
    }

    // ── Day 21+ stale — flag for manager review ───────────────────────────────
    else if (daysSince >= 21 && fa.nudge_14_sent_at) {
      const staleNote = fa.admin_notes?.includes('[stale-claim]')
      if (!staleNote) {
        const timestamp = now.toLocaleString('en-GB')
        const prevNotes = fa.admin_notes ?? ''
        const note = `[${timestamp}] [stale-claim] No response after Day-14 reminder. Consider manual outreach or marking invalid.`

        await supabase
          .from('zawaaj_family_accounts')
          .update({ admin_notes: `${note}\n\n${prevNotes}`.trim() })
          .eq('id', faId)

        result.stale_flagged++
      }
    }
  }

  console.log('[nudge-pending-claims] result:', result)

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
