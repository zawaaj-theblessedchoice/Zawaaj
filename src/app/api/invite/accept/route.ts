import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/invite/accept
 * Body: { token: string }
 *
 * Links the current user's active profile to the family account
 * referenced by the invite token. Marks the token as accepted.
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

  // 3. Link the profile to the family account
  const { error: linkErr } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ family_account_id: invite.family_account_id })
    .eq('id', profileId)

  if (linkErr) {
    return NextResponse.json({ error: 'Failed to link profile. Please try again.' }, { status: 500 })
  }

  // 4. Mark token as accepted
  await supabaseAdmin
    .from('zawaaj_invite_tokens')
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 5. Set primary_user_id on family account if not yet set
  const { data: fa } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .select('primary_user_id')
    .eq('id', invite.family_account_id)
    .single()

  if (fa && !fa.primary_user_id) {
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ primary_user_id: user.id })
      .eq('id', invite.family_account_id)
  }

  return NextResponse.json({ success: true, family_account_id: invite.family_account_id })
}
