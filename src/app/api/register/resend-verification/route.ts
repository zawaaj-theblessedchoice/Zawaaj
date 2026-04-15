import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, emailVerificationTemplate } from '@/lib/email'

export async function POST(request: Request): Promise<Response> {
  try {
    const { familyAccountId } = await request.json() as { familyAccountId?: string }

    if (!familyAccountId) {
      return NextResponse.json({ error: 'familyAccountId is required' }, { status: 400 })
    }

    // Fetch the family account to get contact email
    const { data: account, error: accountError } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, status')
      .eq('id', familyAccountId)
      .maybeSingle()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    if (account.status !== 'pending_email_verification') {
      // Already verified — no need to resend
      return NextResponse.json({ ok: true })
    }

    // Expire any existing unused verification tokens for this account
    await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .update({ accepted_at: new Date().toISOString() })
      .eq('family_account_id', familyAccountId)
      .eq('purpose', 'email_verification')
      .is('accepted_at', null)

    // Create a new token
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .insert({
        family_account_id: familyAccountId,
        purpose: 'email_verification',
        invited_email: account.contact_email,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: 'Failed to create verification token' }, { status: 500 })
    }

    const verifyLink = `https://www.zawaaj.uk/register/verify?token=${tokenRow.token}`
    await sendEmail({
      to: account.contact_email,
      subject: 'Verify your Zawaaj account',
      html: emailVerificationTemplate(verifyLink, account.contact_email),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
