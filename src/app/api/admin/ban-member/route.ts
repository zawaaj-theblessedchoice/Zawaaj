import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth + admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profile_id, user_id, reason, reason_detail, severity, expires_at } =
    await req.json() as {
      profile_id: string
      user_id: string | null
      reason: string
      reason_detail: string | null
      severity: 'permanent' | 'temporary'
      expires_at: string | null
    }

  if (!profile_id || !reason) {
    return NextResponse.json({ error: 'profile_id and reason are required' }, { status: 400 })
  }

  // 1. Insert ban record
  const { data: ban, error: banErr } = await supabaseAdmin
    .from('zawaaj_member_bans')
    .insert({
      profile_id,
      user_id: user_id ?? null,
      banned_by: user.id,
      reason,
      reason_detail: reason_detail ?? null,
      severity,
      expires_at: expires_at ?? null,
    })
    .select('id')
    .single()

  if (banErr || !ban) {
    return NextResponse.json({ error: banErr?.message ?? 'Failed to create ban record' }, { status: 500 })
  }

  // 2. Mark profile as banned
  const { error: profileErr } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ is_banned: true, ban_id: ban.id, status: 'suspended' })
    .eq('id', profile_id)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // 3. Expire all their active introduction requests
  await supabaseAdmin
    .from('zawaaj_introduction_requests')
    .update({ status: 'expired' })
    .eq('requesting_profile_id', profile_id)
    .in('status', ['pending', 'mutual'])

  await supabaseAdmin
    .from('zawaaj_introduction_requests')
    .update({ status: 'expired' })
    .eq('target_profile_id', profile_id)
    .in('status', ['pending', 'mutual'])

  // 4. Ban at Supabase Auth layer (blocks login)
  if (user_id) {
    // permanent = far future date; temporary = expires_at
    const banUntil = severity === 'permanent'
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() // 100 years
      : expires_at!

    await supabaseAdmin.auth.admin.updateUserById(user_id, {
      ban_duration: `${Math.ceil((new Date(banUntil).getTime() - Date.now()) / 1000)}s`,
    })
  }

  return NextResponse.json({ success: true, ban_id: ban.id })
}
