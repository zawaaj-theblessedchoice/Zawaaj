import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['approved', 'rejected', 'paused', 'suspended', 'pending'] as const
type AllowedStatus = (typeof ALLOWED_STATUSES)[number]

// PATCH /api/admin/profiles/[id]
// Body: { status: AllowedStatus }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: adminCheck } = await supabase
      .from('zawaaj_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminCheck?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as { status?: string }
    const newStatus = body.status as AllowedStatus | undefined
    if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'approved') {
      updateData.approved_date = new Date().toISOString()
      // Set listed_at on first approval only
      const { data: existing } = await supabaseAdmin
        .from('zawaaj_profiles')
        .select('listed_at')
        .eq('id', id)
        .maybeSingle()
      if (existing && !existing.listed_at) {
        updateData.listed_at = new Date().toISOString()
      }
    }

    const { error } = await supabaseAdmin
      .from('zawaaj_profiles')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[admin/profiles PATCH]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[admin/profiles PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check — caller must be an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: adminCheck } = await supabase
      .from('zawaaj_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the profile so we can grab user_id for auth deletion
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Delete the profile row — FK cascades clean up related rows
    const { error: deleteProfileErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .delete()
      .eq('id', id)

    if (deleteProfileErr) throw deleteProfileErr

    // Delete the auth user (best-effort — profile is already gone)
    if (profile.user_id) {
      const { error: deleteUserErr } =
        await supabaseAdmin.auth.admin.deleteUser(profile.user_id)
      if (deleteUserErr) {
        console.error('[delete-profile] auth.deleteUser error:', deleteUserErr.message)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    console.error('[delete-profile]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
