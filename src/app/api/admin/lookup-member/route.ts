// POST /api/admin/lookup-member
// Accepts { email } and returns the matching user_id + profile info.
// Used by the Add Manager form so admins don't need to copy-paste UUIDs.
// Super admin only.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { email?: string }
  const email = body.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  // List auth users and find by email.
  // This is an admin-only, infrequent operation — listing all users is acceptable
  // for MVP scale. Replace with an indexed lookup (e.g. SQL function) if user count grows.
  const { data: authData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listErr) return NextResponse.json({ error: 'Failed to query users.' }, { status: 500 })

  const authUser = authData.users.find(u => u.email?.toLowerCase() === email)
  if (!authUser) {
    return NextResponse.json({ error: 'No account found with that email address.' }, { status: 404 })
  }

  // Fetch the active profile for this user
  const { data: settings } = await supabaseAdmin
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  const profileId = settings?.active_profile_id

  let profileName: string | null = null
  let gender: string | null = null

  if (profileId) {
    const { data: profile } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('first_name, last_name, display_initials, gender')
      .eq('id', profileId)
      .maybeSingle()

    if (profile) {
      profileName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.display_initials
      gender = profile.gender
    }
  }

  // Check if they already have a manager record
  const { data: existing } = await supabaseAdmin
    .from('zawaaj_managers')
    .select('id, is_active')
    .eq('user_id', authUser.id)
    .maybeSingle()

  // Check current subscription plan
  const { data: sub } = await supabaseAdmin
    .from('zawaaj_subscriptions')
    .select('plan, status')
    .eq('user_id', authUser.id)
    .maybeSingle()

  return NextResponse.json({
    user_id:             authUser.id,
    email:               authUser.email,
    name:                profileName,
    gender,
    profile_id:          profileId ?? null,
    current_plan:        sub?.plan ?? 'free',
    already_manager:     existing ? { id: existing.id, is_active: existing.is_active } : null,
  })
}
