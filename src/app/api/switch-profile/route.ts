import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/switch-profile
 * Body: { profile_id: string }
 *
 * Switches the caller's active profile to a different profile they own.
 * Used by the Sidebar profile switcher for parent/guardian accounts
 * managing multiple candidate profiles.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { profile_id?: string }
    const { profile_id } = body

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    // Verify this profile belongs to the current user — never trust client input
    const { data: profile, error: profileError } = await supabase
      .from('zawaaj_profiles')
      .select('id, status')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found or does not belong to your account' },
        { status: 403 }
      )
    }

    // Update active_profile_id in user settings
    const { error: updateError } = await supabase
      .from('zawaaj_user_settings')
      .upsert(
        { user_id: user.id, active_profile_id: profile_id },
        { onConflict: 'user_id' }
      )

    if (updateError) {
      return NextResponse.json({ error: 'Failed to switch profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, active_profile_id: profile_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
