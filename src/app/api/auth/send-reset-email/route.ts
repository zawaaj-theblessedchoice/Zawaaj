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
        redirectTo: `${SITE_URL}/auth/reset-password`,
      },
    })

    if (linkErr || !data?.properties?.action_link) {
      // Don't reveal whether the email exists — return success regardless
      console.error('[send-reset-email] generateLink error:', linkErr?.message)
      return NextResponse.json({ ok: true })
    }

    const resetLink = data.properties.action_link

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
