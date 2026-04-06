import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── PATCH — Facilitate an introduction ──────────────────────────────────────

export async function PATCH(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Admin check — look up the active profile and verify is_admin
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile } = await supabase
      .from('zawaaj_profiles')
      .select('is_admin')
      .eq('id', activeProfileId)
      .maybeSingle()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Parse body
    const body = await request.json() as { request_id?: string; admin_notes?: string }
    const { request_id, admin_notes } = body

    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    // 4. Update the introduction request
    const { error: updateError } = await supabase
      .from('zawaaj_introduction_requests')
      .update({
        status: 'facilitated',
        facilitated_at: new Date().toISOString(),
        admin_notes: admin_notes ?? null,
      })
      .eq('id', request_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update introduction request' }, { status: 500 })
    }

    // TODO: Send introduction emails to both parties

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
