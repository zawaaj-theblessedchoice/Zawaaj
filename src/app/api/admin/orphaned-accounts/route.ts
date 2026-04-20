import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admin check
    const { data: _role } = await supabase.rpc('zawaaj_get_role'); const isSuperAdmin = _role === 'super_admin'
    if (!isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // List all auth users (up to 1000 — sufficient for an MVP)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

    // Get all user_ids that have at least one zawaaj_profile
    const { data: profileRows, error: profileError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('user_id')
      .not('user_id', 'is', null)

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    // Get all primary_user_ids that have a zawaaj_family_accounts row.
    // Parent accounts legitimately have no profile yet (candidate added separately),
    // so they must NOT be counted as orphaned.
    const { data: familyRows, error: familyError } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('primary_user_id')
      .not('primary_user_id', 'is', null)

    if (familyError) return NextResponse.json({ error: familyError.message }, { status: 500 })

    const profileUserIds = new Set((profileRows ?? []).map(p => p.user_id as string))
    const familyUserIds  = new Set((familyRows  ?? []).map(f => f.primary_user_id as string))

    // Return auth users that have neither a profile row nor a family account row
    const orphaned = users
      .filter(u => !profileUserIds.has(u.id) && !familyUserIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }))

    return NextResponse.json({ orphaned })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
