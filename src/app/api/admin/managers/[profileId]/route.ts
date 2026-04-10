import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
): Promise<Response> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: role } = await supabase.rpc('zawaaj_get_role')
    if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { profileId } = await params

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    // Delete all scope rows for this manager
    const { error: scopesError } = await supabaseAdmin
      .from('zawaaj_manager_scopes')
      .delete()
      .eq('manager_profile_id', profileId)

    if (scopesError) {
      return NextResponse.json({ error: scopesError.message }, { status: 500 })
    }

    // Demote profile back to member only if currently a manager
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .update({ role: 'member' })
      .eq('id', profileId)
      .eq('role', 'manager')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
