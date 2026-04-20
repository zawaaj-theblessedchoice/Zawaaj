import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  return role === 'super_admin' ? user : null
}

// DELETE /api/admin/families/[id]
// Deletes the family account and all associated profiles + auth users
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Fetch the family account to get primary_user_id and linked profiles
    const { data: family, error: fetchErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, primary_user_id, profiles:zawaaj_profiles(id, user_id)')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !family) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    // Collect auth user IDs to delete
    const authUserIds = new Set<string>()
    if (family.primary_user_id) authUserIds.add(family.primary_user_id)

    const profileRows = (family.profiles ?? []) as { id: string; user_id: string | null }[]
    for (const p of profileRows) {
      if (p.user_id) authUserIds.add(p.user_id)
    }

    // Delete profiles (FK cascades related rows)
    for (const p of profileRows) {
      await supabaseAdmin.from('zawaaj_profiles').delete().eq('id', p.id)
    }

    // Delete the family account
    const { error: delFamilyErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .delete()
      .eq('id', id)

    if (delFamilyErr) throw delFamilyErr

    // Delete auth users (best-effort)
    for (const uid of authUserIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid)
      } catch (e) {
        console.error('[delete-family] auth.deleteUser failed for', uid, e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[delete-family]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
