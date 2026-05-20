// ─── Resend email sender (direct API, no SMTP) ───────────────────────────────
// Uses RESEND_API_KEY env var. Server-only — never import from client components.

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

interface SendEmailResult {
  ok: boolean
  error?: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set')
    return { ok: false, error: 'Email service not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Zawaaj <noreply@zawaaj.uk>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[email] Resend error ${res.status}:`, body)
    return { ok: false, error: `Resend error: ${res.status}` }
  }

  return { ok: true }
}

// ─── Email templates ──────────────────────────────────────────────────────────

export function passwordResetTemplate(resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Set your password — Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Set your password</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.6;">
                You've been invited to join Zawaaj. Click the button below to set your password and access your account.
              </p>
              <a href="${resetLink}"
                style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                Set my password
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#4b5563;">
                Or copy this link: <a href="${resetLink}" style="color:#B8960C;word-break:break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailVerificationTemplate(verifyLink: string, contactEmail: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Zawaaj account</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Verify your email address</h1>
              <p style="margin:0 0 8px;font-size:14px;color:#9ca3af;line-height:1.6;">
                Thank you for registering with Zawaaj. Please verify your email address to continue.
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Verifying as: <strong style="color:#e5e7eb;">${contactEmail}</strong></p>
              <a href="${verifyLink}"
                style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                Verify my email
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                This link expires in 24 hours. If you did not register with Zawaaj, you can safely ignore this email.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#4b5563;">
                Or copy this link: <a href="${verifyLink}" style="color:#B8960C;word-break:break-all;">${verifyLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Contact sharing email ────────────────────────────────────────────────────
// Sent to each family when admin facilitates an introduction.

interface ContactInfo {
  name: string        // resolved representative contact name (female-preferred)
  phone: string       // resolved representative contact number (female-preferred)
  email?: string      // other family's contact email (optional to share)
  profile: {          // public profile snippet
    displayName: string
    ageDisplay: string | null
    location: string | null
    schoolOfThought: string | null
  }
}

export function contactSharingTemplate(
  recipientName: string,       // "Dear [name]"
  otherContact: ContactInfo,
  adminMessage?: string,
): string {
  const profileSnippet = [
    otherContact.profile.ageDisplay,
    otherContact.profile.location,
    otherContact.profile.schoolOfThought,
  ].filter(Boolean).join(' · ')

  const adminNote = adminMessage
    ? `<p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;border-top:1px solid #2a2a2a;padding-top:16px;">${adminMessage}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Introduction details — Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#ffffff;">Alhamdulillah — an introduction has been arranged</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.6;">
                Dear ${recipientName}, both families have expressed interest and the Zawaaj team has confirmed it is appropriate to proceed. Below are the contact details to facilitate getting to know each other in a halal manner, in shaa Allah.
              </p>

              <!-- Profile snippet -->
              ${profileSnippet ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">${otherContact.profile.displayName} · ${profileSnippet}</p>` : ''}

              <!-- Contact card -->
              <div style="background:#111111;border:1px solid #2a2a2a;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#9ca3af;font-size:13px;width:140px;">Representative</td>
                    <td style="padding:6px 0;color:#e5e7eb;font-size:13px;font-weight:600;">${otherContact.name}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#9ca3af;font-size:13px;">Phone</td>
                    <td style="padding:6px 0;color:#e5e7eb;font-size:13px;font-weight:500;"><a href="tel:${otherContact.phone}" style="color:#B8960C;text-decoration:none;">${otherContact.phone}</a></td>
                  </tr>
                </table>
              </div>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                We ask that all communication remains respectful and within Islamic boundaries. If at any point you wish to withdraw or need support from the Zawaaj team, please do not hesitate to reach out.
              </p>
              ${adminNote}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a> ·
                <a href="https://zawaaj.uk/help" style="color:#6b7280;text-decoration:none;">Contact us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Mutual match notification email ─────────────────────────────────────────
// Sent to both families when a request becomes mutual (accepted status).

export function mutualMatchTemplate(
  recipientName: string,
  role: 'requester' | 'acceptor',   // which side of the match
): string {
  const heading = role === 'requester'
    ? 'Alhamdulillah — your interest has been accepted'
    : 'Alhamdulillah — introduction accepted'

  const body = role === 'requester'
    ? `Dear ${recipientName}, the family you expressed interest in has accepted. The Zawaaj team has been notified and will be in touch shortly to facilitate the introduction, in shaa Allah. Please visit your Introductions page to view the latest status.`
    : `Dear ${recipientName}, you have accepted an introduction interest. The Zawaaj team has been notified and will be in touch shortly to coordinate next steps, in shaa Allah. Please visit your Introductions page for more details.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading} — Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#ffffff;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.7;">${body}</p>
              <a href="https://www.zawaaj.uk/introductions"
                style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                View introductions
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                Please do not contact the other family directly at this stage — our team will reach out to both sides and coordinate appropriately.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a> ·
                <a href="https://zawaaj.uk/help" style="color:#6b7280;text-decoration:none;">Contact us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Admin ad-hoc message to family ──────────────────────────────────────────
// Sent when admin composes a free-form message to a family contact.

export function adminMessageTemplate(
  recipientName: string,
  subject: string,
  messageBody: string,
): string {
  // Preserve newlines by converting to <br> in HTML
  const htmlBody = messageBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject} — Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;">Dear ${recipientName},</p>
              <div style="font-size:14px;color:#e5e7eb;line-height:1.7;">${htmlBody}</div>
              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;border-top:1px solid #2a2a2a;padding-top:16px;">
                This message was sent by the Zawaaj team. If you have any questions, please reply to this email or visit
                <a href="https://zawaaj.uk/help" style="color:#B8960C;text-decoration:none;">zawaaj.uk/help</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a> ·
                <a href="https://zawaaj.uk/help" style="color:#6b7280;text-decoration:none;">Contact us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Guardian / child invite email ───────────────────────────────────────────
// Sent when admin emails an invite link directly to a candidate from the Families page.

export function guardianInviteTemplate(
  inviteLink: string,
  candidateName: string | null,
  familyContactName: string,
): string {
  const greeting = candidateName ? `Dear ${candidateName}` : 'Assalamu Alaikum'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You have been invited to join Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">You have been invited to Zawaaj</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.6;">
                ${greeting}, ${familyContactName} has arranged for you to join Zawaaj, a private Muslim matrimonial platform. Click the link below to create your account and complete your profile.
              </p>
              <a href="${inviteLink}"
                style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                Accept invitation
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                This invitation expires in 7 days. If you were not expecting this, you can safely ignore it.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#4b5563;">
                Or copy this link: <a href="${inviteLink}" style="color:#B8960C;word-break:break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── GoCardless email templates ───────────────────────────────────────────────

// Shared email card wrapper (dark theme, gold top border)
function gcEmailWrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a> ·
                <a href="https://zawaaj.uk/settings?tab=membership" style="color:#6b7280;text-decoration:none;">Manage membership</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return 'a future date'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Sent when a GoCardless payment is confirmed and Premium is activated.
 * Also sent when the redirect flow is completed (pending state).
 */
export function premiumActivatedTemplate(
  recipientName: string,
  renewalAt: string | null,
  billingCycle: 'monthly' | 'annual' | null,
  amountGbp: number | null,
): string {
  const cycleLabel = billingCycle === 'annual' ? 'annually' : 'monthly'
  const priceLine = amountGbp !== null
    ? `<p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">Your Direct Debit of <strong style="color:#e5e7eb;">£${amountGbp.toFixed(2)}</strong> will be collected ${cycleLabel}.</p>`
    : ''
  const renewalLine = renewalAt
    ? `<p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">Your next payment is due on <strong style="color:#e5e7eb;">${fmtDate(renewalAt)}</strong>.</p>`
    : ''

  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Assalamu alaikum, ${recipientName}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Your Zawaaj Premium membership is now active. You now have access to all Premium features including:
    </p>
    <ul style="margin:0 0 20px;padding-left:20px;color:#9ca3af;font-size:13px;line-height:1.8;">
      <li>Up to 8 introductions per month</li>
      <li>Browse filters and recommendations</li>
      <li>Concierge matching service</li>
      <li>Weekly profile boosts and spotlight listing</li>
      <li>See who viewed your profile</li>
    </ul>
    ${priceLine}
    ${renewalLine}
    <a href="https://zawaaj.uk/settings?tab=membership"
      style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;margin-bottom:20px;">
      View membership settings
    </a>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
      You can manage or cancel your membership at any time from Settings.
      If you have any questions, please contact us at
      <a href="mailto:team@zawaaj.uk" style="color:#B8960C;text-decoration:none;">team@zawaaj.uk</a>.
    </p>`

  return gcEmailWrapper('Your Zawaaj Premium is now active', body)
}

/**
 * Sent 7 days before renewal_at (via cron). Reminder email only.
 */
export function renewalReminderTemplate(
  recipientName: string,
  renewalAt: string,
  amountGbp: number,
): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Your Zawaaj Premium renews soon</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Assalamu alaikum, ${recipientName}. This is a reminder that your Zawaaj Premium membership will renew on
      <strong style="color:#e5e7eb;">${fmtDate(renewalAt)}</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;">
      A Direct Debit of <strong style="color:#e5e7eb;">£${amountGbp.toFixed(2)}</strong> will be collected on that date.
      If you'd like to cancel before then, you can do so from your membership settings.
    </p>
    <a href="https://zawaaj.uk/settings?tab=membership"
      style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
      Manage membership
    </a>`

  return gcEmailWrapper('Your Zawaaj Premium renews in 7 days', body)
}

/**
 * Sent on payment failure (attempts 1–2).
 */
export function paymentFailedTemplate(
  recipientName: string,
  attemptNumber: number,
  graceUntil: string,
): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Payment issue with your Zawaaj membership</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Assalamu alaikum, ${recipientName}. We were unable to collect your Direct Debit payment (attempt ${attemptNumber}).
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      Your Premium access continues until <strong style="color:#e5e7eb;">${fmtDate(graceUntil)}</strong> while we retry.
      Please ensure your bank account has sufficient funds and that your Direct Debit mandate is still active.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you need to update your payment details or have any questions, please contact us at
      <a href="mailto:team@zawaaj.uk" style="color:#B8960C;text-decoration:none;">team@zawaaj.uk</a>.
    </p>
    <a href="https://zawaaj.uk/settings?tab=membership"
      style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
      View membership settings
    </a>`

  return gcEmailWrapper('Action needed — payment issue with your Zawaaj membership', body)
}

/**
 * Sent on payment failure (attempt 3+). Final warning before downgrade.
 */
export function paymentFailedFinalTemplate(
  recipientName: string,
  graceUntil: string,
): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Your Zawaaj Premium will end soon</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Assalamu alaikum, ${recipientName}. We have been unable to collect your Direct Debit payment after multiple attempts.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      Your Premium access will end on <strong style="color:#e5e7eb;">${fmtDate(graceUntil)}</strong> unless payment is received.
      After that date your account will return to Community Access.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you believe this is a mistake or would like to arrange payment, please contact us at
      <a href="mailto:team@zawaaj.uk" style="color:#B8960C;text-decoration:none;">team@zawaaj.uk</a> as soon as possible.
    </p>
    <a href="https://zawaaj.uk/settings?tab=membership"
      style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
      View membership settings
    </a>`

  return gcEmailWrapper('Your Zawaaj Premium will end soon', body)
}

/**
 * Sent 3 days before grace_period_until (via cron). Last chance warning.
 */
export function graceWarningTemplate(
  recipientName: string,
  graceUntil: string,
): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Your grace period ends in 3 days</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Assalamu alaikum, ${recipientName}. This is an urgent reminder that your Zawaaj Premium grace period
      ends on <strong style="color:#e5e7eb;">${fmtDate(graceUntil)}</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      If payment is not received by that date, your account will automatically return to Community Access
      and your Premium features will be removed.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      To resolve this urgently, please contact us at
      <a href="mailto:team@zawaaj.uk" style="color:#B8960C;text-decoration:none;">team@zawaaj.uk</a>.
    </p>`

  return gcEmailWrapper('Your grace period ends in 3 days', body)
}

/**
 * Sent when subscription is cancelled (by user or webhook).
 */
export function cancellationConfirmedTemplate(
  recipientName: string,
  accessUntil: string | null,
): string {
  const accessLine = accessUntil
    ? `<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
        Your Premium access will continue until <strong style="color:#e5e7eb;">${fmtDate(accessUntil)}</strong>.
        After that date your account will return to Community Access.
      </p>`
    : `<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
        Your Premium access has been removed.
      </p>`

  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Your Zawaaj Premium cancellation is confirmed</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Assalamu alaikum, ${recipientName}. We've received your cancellation request.
    </p>
    ${accessLine}
    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
      We hope Zawaaj has been helpful in your search. If you'd ever like to reactivate your Premium membership,
      you can do so from your Settings at any time.
    </p>
    <a href="https://zawaaj.uk/settings?tab=membership"
      style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
      View membership settings
    </a>`

  return gcEmailWrapper('Your Zawaaj Premium cancellation is confirmed', body)
}

export function passwordResetRequestTemplate(resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password — Zawaaj</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://zawaaj.uk/logo.png" alt="Zawaaj" width="90" style="display:block;" />
              <p style="margin:8px 0 0;color:#B8960C;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Blessed Choice</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1A1A1A;border:1px solid #2a2a2a;border-top:1px solid rgba(184,150,12,0.3);border-radius:12px;padding:36px 32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;">Reset your password</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.6;">
                We received a request to reset the password for your Zawaaj account. Click the button below to choose a new password.
              </p>
              <a href="${resetLink}"
                style="display:inline-block;padding:12px 28px;background:#B8960C;color:#111111;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                Reset my password
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#4b5563;">
                Or copy this link: <a href="${resetLink}" style="color:#B8960C;word-break:break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                © Zawaaj · <a href="https://zawaaj.uk" style="color:#6b7280;text-decoration:none;">zawaaj.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
