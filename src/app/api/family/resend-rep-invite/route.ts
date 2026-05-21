// POST /api/family/resend-rep-invite
//
// Member-facing endpoint: sends (or resends) a representative invite for the
// authenticated user's family account.
//
// Eligibility:
//   - Caller must be authenticated
//   - family account must exist and be status = 'active'
//   - readiness_state must be 'candidate_only' or 'representative_invited'
//     (if 'representative_linked' or 'intro_ready' the rep is already linked)
//   - contact_email must be present

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, guardianInviteTemplate } from '@/lib/email'

export async function POST(): Promise<Response> {
  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    // ── 2. Fetch family account ───────────────────────────────────────────────
    const { data: fa, error: faErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_full_name, contact_email, contact_number, contact_relationship, readiness_state, status')
      .eq('primary_user_id', user.id)
      .maybeSingle()

    if (faErr) {
      console.error('[resend-rep-invite] family account lookup error:', faErr.message)
      return NextResponse.json({ error: 'Failed to load family account.' }, { status: 500 })
    }

    // ── 3. Validate ───────────────────────────────────────────────────────────
    if (!fa) {
      return NextResponse.json({ error: 'Family account not found.' }, { status: 404 })
    }

    if (fa.status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is not yet active. Invitations can only be sent once your account is approved.' },
        { status: 400 }
      )
    }

    const invitableStates = ['candidate_only', 'representative_invited']
    if (!invitableStates.includes(fa.readiness_state)) {
      return NextResponse.json(
        { error: 'Representative already linked.' },
        { status: 400 }
      )
    }

    if (!fa.contact_email) {
      return NextResponse.json(
        { error: 'No representative email on file. Please contact support.' },
        { status: 400 }
      )
    }

    // ── 4. Create invite token ────────────────────────────────────────────────
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .insert({
        family_account_id: fa.id,
        created_by:        user.id,
        purpose:           'child_invite',
        invited_name:      fa.contact_full_name ?? null,
        invited_email:     fa.contact_email,
        invited_phone:     fa.contact_number ?? null,
        expires_at:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (tokenErr || !tokenRow) {
      console.error('[resend-rep-invite] token insert error:', tokenErr?.message ?? 'no row returned')
      return NextResponse.json({ error: 'Failed to create invite token.' }, { status: 500 })
    }

    // ── 5. Send invite email ──────────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'
    const inviteLink = `${baseUrl}/register/accept-invite?token=${tokenRow.token}`

    const emailResult = await sendEmail({
      to: fa.contact_email,
      subject: "You've been invited to join Zawaaj",
      html: guardianInviteTemplate(
        inviteLink,
        fa.contact_full_name ?? null,   // candidateName — greeted as the rep
        fa.contact_full_name ?? 'your family', // familyContactName
      ),
    })

    if (!emailResult.ok) {
      console.error('[resend-rep-invite] email send failed:', emailResult.error)
      // Token was created — don't fail the whole request; client can retry
      return NextResponse.json(
        { error: 'Invite token created but email failed to send. Please try again.' },
        { status: 500 }
      )
    }

    // ── 6. Advance readiness_state if still at candidate_only ─────────────────
    const { error: stateErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ readiness_state: 'representative_invited' })
      .eq('id', fa.id)
      .eq('readiness_state', 'candidate_only')

    if (stateErr) {
      // Non-fatal — state may already be 'representative_invited'
      console.warn('[resend-rep-invite] readiness_state update failed (may already be invited):', stateErr.message)
    } else {
      console.log('[resend-rep-invite] readiness_state → representative_invited')
    }

    // ── 7. Return success ─────────────────────────────────────────────────────
    return NextResponse.json({ success: true, invited_email: fa.contact_email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
