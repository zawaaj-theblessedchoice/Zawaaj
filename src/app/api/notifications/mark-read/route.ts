import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── POST — Mark one or all notifications as read ────────────────────────────
// Body: { id?: string }  — omit id to mark all unread for the active profile

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as { id?: string }
    const readAt = new Date().toISOString()

    // RLS already restricts UPDATE to the user's own notifications.
    const query = supabase
      .from('zawaaj_notifications')
      .update({ read_at: readAt })
      .eq('profile_id', activeProfileId)
      .is('read_at', null)

    if (body.id) {
      const { error } = await query.eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
