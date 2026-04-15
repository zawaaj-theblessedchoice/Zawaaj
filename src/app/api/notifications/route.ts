import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── GET — List recent notifications + unread count ──────────────────────────

export async function GET(): Promise<Response> {
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
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    // Latest 20; unread count separately (only reads what user is entitled to via RLS)
    const [{ data: rows }, { count: unreadCount }] = await Promise.all([
      supabase
        .from('zawaaj_notifications')
        .select('id, type, title, body, action_url, read_at, created_at')
        .eq('profile_id', activeProfileId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('zawaaj_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', activeProfileId)
        .is('read_at', null),
    ])

    return NextResponse.json({
      notifications: rows ?? [],
      unreadCount: unreadCount ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
