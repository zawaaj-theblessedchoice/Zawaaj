import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth + admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: _role } = await supabase.rpc('zawaaj_get_role'); const isSuperAdmin = _role === 'super_admin'
  if (!isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profile_id, lift_reason } =
    await req.json() as { profile_id: string; lift_reason: string }

  if (!profile_id || !lift_reason?.trim()) {
    return NextResponse.json({ error: 'profile_id and lift_reason are required' }, { status: 400 })
  }

  // 1. Get profile to find ban_id and user_id
  const { data: profile, error: profileFetchErr } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, user_id, ban_id, status')
    .eq('id', profile_id)
    .single()

  if (profileFetchErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 2. Update the ban record — mark as lifted
  if (profile.ban_id) {
    await supabaseAdmin
      .from('zawaaj_member_bans')
      .update({
        lifted_at: new Date().toISOString(),
        lifted_by: user.id,
        lift_reason,
      })
      .eq('id', profile.ban_id)
  }

  // 3. Clear ban on profile — restore to approved if it was suspended due to ban
  const { error: profileErr } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({
      is_banned: false,
      ban_id: null,
      // Restore to approved (was approved before ban → suspended by ban)
      status: 'approved',
    })
    .eq('id', profile_id)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // 4. Re-enable login at Auth layer
  if (profile.user_id) {
    await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
      ban_duration: 'none',
    })
  }

  return NextResponse.json({ success: true })
}
