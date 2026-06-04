import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { evaluateReadiness } from '@/lib/zawaaj/evaluateReadiness'

/**
 * POST /api/invite/accept
 * Body: { token: string }
 *
 * Links the current user's active profile to the family account
 * referenced by the invite token. Marks the token as accepted.
 *
 * State machine:
 *   After linking, advances readiness_state:
 *     representative_invited → representative_linked  (Step A, always)
 *     representative_linked  → intro_ready            (Step B, if eligibility passes)
 *
 * Eligibility for intro_ready (all four must pass):
 *   1. family account status = 'active'
 *   2. primary_user_id is not null
 *   3. at least one profile in the family has status = 'approved'
 *   4. rep's profile has first_name, last_name, and a contact field
 *      (profile contact_number or family account contact_email / contact_number)
 *
 * State update failures are logged but never surfaced to the caller —
 * the rep is already linked and the invite is accepted at that point.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await request.json() as { token?: string }
  const token = (body.token ?? '').trim()
  if (!token) return NextResponse.json({ error: 'Token is required.' }, { status: 400 })

  // 1. Validate the token
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('zawaaj_invite_tokens')
    .select('id, family_account_id, purpose, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link.' }, { status: 404 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired.' }, { status: 410 })
  }

  // 2. Get the user's active profile
  const { data: settings } = await supabaseAdmin
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileId = settings?.active_profile_id
  if (!profileId) {
    return NextResponse.json({ error: 'No active profile found. Please complete registration first.' }, { status: 400 })
  }

  const familyAccountId = invite.family_account_id as string

  // 3. Link the profile to the family account
  const { error: linkErr } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ family_account_id: familyAccountId })
    .eq('id', profileId)

  if (linkErr) {
    return NextResponse.json({ error: 'Failed to link profile. Please try again.' }, { status: 500 })
  }

  // 4. Mark token as accepted
  await supabaseAdmin
    .from('zawaaj_invite_tokens')
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 5. Fetch family account (status + contact fields for eligibility); set primary_user_id if unset
  const { data: fa } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .select('primary_user_id, status, contact_email, contact_number')
    .eq('id', familyAccountId)
    .single()

  if (fa && !fa.primary_user_id) {
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ primary_user_id: user.id })
      .eq('id', familyAccountId)
  }

  // ── State machine advancement ────────────────────────────────────────────────
  // Runs after all success actions. Errors are logged but never returned to the
  // caller — the rep is already linked at this point.

  try {
    // STEP A — advance representative_invited → representative_linked
    const { error: stateErrA } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ readiness_state: 'representative_linked' })
      .eq('id', familyAccountId)
      .eq('readiness_state', 'representative_invited')

    if (stateErrA) {
      console.error('[invite/accept] failed to set representative_linked:', stateErrA.message)
    } else {
      console.log('[invite/accept] readiness_state → representative_linked')
    }

    // STEP B — derived readiness. Auto-promote to intro_ready IF eligible NOW.
    // The same evaluateReadiness() is also called from the profile-approval paths,
    // so a family that links before approval still advances when approval lands
    // later (the previously-missed async case).
    await evaluateReadiness(familyAccountId)

  } catch (stateErr) {
    // Safety net — state advancement must never break the success response
    console.error('[invite/accept] unexpected error during state advancement:', stateErr)
  }

  return NextResponse.json({ success: true, family_account_id: familyAccountId })
}
