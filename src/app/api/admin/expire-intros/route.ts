import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST() {
  // ─── Auth + admin guard ───────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: isSuperAdmin } = await supabase.rpc('zawaaj_is_super_admin')
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── Bulk-expire overdue pending requests ─────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('zawaaj_introduction_requests')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id, requesting_profile_id, target_profile_id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ─── Notify both parties for every expired request ────────────────────────
  if (data && data.length > 0) {
    const notifications = data.flatMap(r => [
      {
        profile_id: r.requesting_profile_id,
        type: 'request_expired',
        title: 'Interest expired',
        body: 'An interest you sent has expired — no response was received.',
        action_url: '/introductions',
      },
      {
        profile_id: r.target_profile_id,
        type: 'request_expired',
        title: 'Interest expired',
        body: 'An interest you received has expired.',
        action_url: '/introductions',
      },
    ])

    const { error: notifyError } = await supabaseAdmin
      .from('zawaaj_notifications')
      .insert(notifications)

    if (notifyError) {
      console.error('[expire-intros] Failed to insert notifications:', notifyError.message)
    }
  }

  return NextResponse.json({ expired: data?.length ?? 0 })
}
