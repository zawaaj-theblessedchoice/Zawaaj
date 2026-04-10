import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_SCOPE_TYPES = ['geographic', 'workflow', 'user_segment', 'all'] as const
type ScopeType = (typeof VALID_SCOPE_TYPES)[number]

interface PostBody {
  profile_id: string
  scope_type: string
  scope_value?: string
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: role } = await supabase.rpc('zawaaj_get_role')
    if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as PostBody
    const { profile_id, scope_type, scope_value } = body

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    if (!VALID_SCOPE_TYPES.includes(scope_type as ScopeType)) {
      return NextResponse.json(
        { error: `scope_type must be one of: ${VALID_SCOPE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get the caller's active profile id
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.active_profile_id) {
      return NextResponse.json({ error: 'Caller profile not found' }, { status: 500 })
    }

    const callerProfileId = settings.active_profile_id

    // Promote profile to manager only if currently a member
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .update({ role: 'manager' })
      .eq('id', profile_id)
      .eq('role', 'member')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Insert scope record
    const { data: scope, error: scopeError } = await supabaseAdmin
      .from('zawaaj_manager_scopes')
      .insert({
        manager_profile_id: profile_id,
        scope_type: scope_type as ScopeType,
        scope_value: scope_value ?? null,
        granted_by: callerProfileId,
      })
      .select()
      .single()

    if (scopeError) {
      return NextResponse.json({ error: scopeError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, scope })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
