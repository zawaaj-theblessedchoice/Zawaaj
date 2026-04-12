import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/admin/families/link-profile
 * Body: { family_account_id: string, profile_id: string }
 *
 * Manually links an existing profile to a family account.
 * If the profile already belongs to another family account, returns 409.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as { family_account_id: string; profile_id: string }
  const { family_account_id, profile_id } = body

  if (!family_account_id || !profile_id) {
    return NextResponse.json({ error: 'family_account_id and profile_id are required' }, { status: 400 })
  }

  // Check profile isn't already linked to a different family account
  const { data: existing } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('family_account_id')
    .eq('id', profile_id)
    .single()

  if (existing?.family_account_id && existing.family_account_id !== family_account_id) {
    return NextResponse.json(
      { error: 'This profile is already linked to a different family account.' },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ family_account_id })
    .eq('id', profile_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
