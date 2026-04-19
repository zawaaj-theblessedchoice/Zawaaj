import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Called by Vercel Cron (vercel.json) — secured via CRON_SECRET header.
// Marks overdue pending introduction requests as 'expired' and inserts
// notifications for both the requester and the target.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Bulk-expire overdue pending requests
  const { data, error } = await supabaseAdmin
    .from('zawaaj_introduction_requests')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id, requesting_profile_id, target_profile_id')

  if (error) {
    console.error('[cron/expire-intros] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const expired = data?.length ?? 0

  // Insert notifications for both parties on each expired request
  if (expired > 0) {
    const notifications = data!.flatMap(r => [
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
      console.error('[cron/expire-intros] Failed to insert notifications:', notifyError.message)
    }
  }

  console.log(`[cron/expire-intros] Expired ${expired} requests`)
  return NextResponse.json({ expired })
}
