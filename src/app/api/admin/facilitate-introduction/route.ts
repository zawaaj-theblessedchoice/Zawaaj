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

    const now = new Date().toISOString()

    // 4. Update the introduction request — mark as following_up (contacts shared)
    const { error: updateError } = await supabase
      .from('zawaaj_introduction_requests')
      .update({
        status: 'following_up',
        facilitated_at: now,
        admin_notes: admin_notes ?? null,
      })
      .eq('id', request_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update introduction request' }, { status: 500 })
    }

    // 5. Insert follow-up audit row
    const { error: followupError } = await supabase
      .from('zawaaj_intro_followups')
      .insert({
        introduction_request_id: request_id,
        created_by: user.id,
        status_set: 'following_up',
        note: 'Contacts shared — follow-up started',
      })

    if (followupError) {
      // Non-fatal — status was updated successfully, just log
      console.error('[facilitate-introduction] Failed to insert followup row:', followupError.message)
    }

    // TODO: Send introduction emails to both parties

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
