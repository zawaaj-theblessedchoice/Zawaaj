import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, emailVerificationTemplate } from '@/lib/email'

export async function POST(request: Request): Promise<Response> {
  try {
    const { familyAccountId } = await request.json() as { familyAccountId?: string }

    if (!familyAccountId) {
      return NextResponse.json({ error: 'familyAccountId is required' }, { status: 400 })
    }

    // Fetch the family account — include registration_path and primary_user_id so we
    // can determine which email to verify: for child path it's the candidate's own auth
    // email; for parent path it's the guardian's contact email (same person).
    const { data: account, error: accountError } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, status, registration_path, primary_user_id')
      .eq('id', familyAccountId)
      .maybeSingle()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    if (account.status !== 'pending_email_verification') {
      // Already verified — no need to resend
      return NextResponse.json({ ok: true })
    }

    // For the child (self-registration) path the verification email must go to the
    // candidate's own account email, not the guardian's contact email.
    let verificationEmail = account.contact_email
    if (account.registration_path === 'child' && account.primary_user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(account.primary_user_id)
      if (authUser?.user?.email) {
        verificationEmail = authUser.user.email
      }
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
        invited_email: verificationEmail,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (tokenError || !tokenRow) {
      console.error('[resend-verification] token insert error:', tokenError?.message, tokenError?.details, tokenError?.hint)
      return NextResponse.json({ error: 'Failed to create verification token. Please try again.' }, { status: 500 })
    }

    const verifyLink = `https://www.zawaaj.uk/register/verify?token=${tokenRow.token}`
    await sendEmail({
      to: verificationEmail,
      subject: 'Verify your Zawaaj account',
      html: emailVerificationTemplate(verifyLink, verificationEmail),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
