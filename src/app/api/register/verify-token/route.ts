import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST /api/register/verify-token
// Body: { token: string }
//
// Server-side verification: validates the token, marks it accepted,
// and activates the family account (no admin approval needed for family accounts).
// Uses service role to bypass RLS — the token itself is the credential.

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { token?: string }
    const token = (body.token ?? '').trim()

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    // 1. Fetch and validate the token (service role bypasses RLS)
    const { data: invite, error: fetchErr } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .select('id, family_account_id, purpose, invited_email, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (fetchErr) {
      console.error('[verify-token] fetch error:', fetchErr.message)
      return NextResponse.json({ error: 'Failed to look up token' }, { status: 500 })
    }

    if (!invite) {
      return NextResponse.json({ error: 'invalid' }, { status: 404 })
    }

    if (invite.purpose !== 'email_verification') {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }

    // Already verified — idempotent success
    if (invite.accepted_at) {
      return NextResponse.json({ ok: true, alreadyVerified: true, email: invite.invited_email })
    }

    // Expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'expired',
        family_account_id: invite.family_account_id,
        email: invite.invited_email,
      }, { status: 410 })
    }

    // 2. Mark token as accepted
    const { error: tokenUpdateErr } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (tokenUpdateErr) {
      console.error('[verify-token] token update error:', tokenUpdateErr.message)
      return NextResponse.json({ error: 'Failed to mark token accepted' }, { status: 500 })
    }

    // 3. Activate family account — no manual approval needed for family accounts,
    //    only profiles require admin approval.
    const { error: accountUpdateErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({
        status: 'active',
        onboarding_state: 'contact_added',
        approved_at: new Date().toISOString(),
      })
      .eq('id', invite.family_account_id)

    if (accountUpdateErr) {
      console.error('[verify-token] account update error:', accountUpdateErr.message)
      // Token is already marked — return partial success so the user isn't stuck
      return NextResponse.json({ ok: true, accountUpdateFailed: true, email: invite.invited_email })
    }

    return NextResponse.json({ ok: true, email: invite.invited_email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[verify-token] unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
