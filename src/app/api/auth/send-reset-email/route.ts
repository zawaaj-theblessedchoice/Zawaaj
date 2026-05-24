import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, passwordResetRequestTemplate } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { email } = await req.json() as { email?: string }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalised = email.trim().toLowerCase()

    // Generate the recovery link via admin API
    const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalised,
      options: {
        // generateLink uses the implicit OAuth flow — the redirect appends
        // #access_token=... as a URL hash, which only client-side JS can read.
        // /auth/reset-password is a 'use client' page that already handles this:
        // it reads the hash, calls setSession(), then shows the new-password form.
        // NOTE: add https://zawaaj.uk/auth/reset-password to Supabase →
        // Authentication → URL Configuration → Redirect URLs; until then the
        // LandingPage hash catcher forwards the Site-URL fallback automatically.
        redirectTo: `${SITE_URL}/auth/reset-password`,
      },
    })

    if (linkErr || !data?.properties?.hashed_token) {
      // Don't reveal whether the email exists — return success regardless
      console.error('[send-reset-email] generateLink error:', linkErr?.message)
      return NextResponse.json({ ok: true })
    }

    // ── Scanner-safe link ─────────────────────────────────────────────────────
    // We deliberately do NOT use data.properties.action_link here.
    // action_link is a Supabase-hosted GET endpoint that immediately validates
    // and consumes the OTP token when visited — corporate email security scanners
    // (Barracuda, Cisco IronPort, etc.) pre-fetch every URL in an email, which
    // silently burns the token before the user ever clicks the link.
    //
    // Instead we put the raw hashed_token into our own /auth/reset-password URL.
    // That page is a 'use client' component: email scanners receive only the
    // server-rendered HTML shell and never execute the JavaScript that calls
    // supabase.auth.verifyOtp(). The token is therefore consumed only when a
    // real browser visits the page and hydrates React.
    const resetLink = `${SITE_URL}/auth/reset-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`

    // Send via Resend directly (bypasses Supabase SMTP entirely)
    const result = await sendEmail({
      to: normalised,
      subject: 'Reset your password — Zawaaj',
      html: passwordResetRequestTemplate(resetLink),
    })

    if (!result.ok) {
      console.error('[send-reset-email] email send failed:', result.error)
      // Still return ok — don't reveal internal errors to the client
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    console.error('[send-reset-email]', message)
    return NextResponse.json({ ok: true }) // Always return ok for security
  }
}
