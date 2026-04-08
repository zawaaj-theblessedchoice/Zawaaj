import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // ─── Auth + admin guard ───────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── Payload ──────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { for_profile_id, suggested_profile_id, admin_note } = body as {
    for_profile_id?: string
    suggested_profile_id?: string
    admin_note?: string
  }

  if (!for_profile_id || !suggested_profile_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (for_profile_id === suggested_profile_id) {
    return NextResponse.json({ error: 'Cannot suggest a profile to themselves' }, { status: 400 })
  }

  // ─── Insert suggestion (unique constraint catches duplicates) ─────────────
  const { data, error } = await supabaseAdmin
    .from('zawaaj_concierge_suggestions')
    .insert({
      for_profile_id,
      suggested_profile_id,
      admin_note: admin_note?.trim() || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already suggested this profile' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
