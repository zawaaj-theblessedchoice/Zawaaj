import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/delete-account
 * Body: { user_id: string } — deletes the auth user and detaches all their profiles
 *       { profile_id: string } — deletes a single profile row (for unlinked profiles)
 *
 * Admin-only. Caller must have is_admin = true.
 *
 * When deleting by user_id:
 *  1. Nullify user_id on all their profiles (so profiles become unlinked, not deleted)
 *  2. Delete zawaaj_user_settings row
 *  3. Delete the Supabase auth user
 *
 * This preserves profile data for audit purposes. An admin can then decide
 * whether to keep, reassign, or delete the profiles separately.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // Verify caller is admin
    const { data: isSuperAdmin } = await supabase.rpc('zawaaj_is_super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as { user_id?: string; profile_id?: string }
    const { user_id, profile_id } = body

    if (user_id) {
      // 1. Detach all profiles from this auth user (set user_id = NULL)
      await supabaseAdmin
        .from('zawaaj_profiles')
        .update({ user_id: null })
        .eq('user_id', user_id)

      // 2. Delete user settings
      await supabaseAdmin
        .from('zawaaj_user_settings')
        .delete()
        .eq('user_id', user_id)

      // 3. Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'account_deleted' })
    }

    if (profile_id) {
      // Delete a single profile row (typically an unlinked profile)
      const { error: deleteError } = await supabaseAdmin
        .from('zawaaj_profiles')
        .delete()
        .eq('id', profile_id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'profile_deleted' })
    }

    return NextResponse.json(
      { error: 'Either user_id or profile_id is required' },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
