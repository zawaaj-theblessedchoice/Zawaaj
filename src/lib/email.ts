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
