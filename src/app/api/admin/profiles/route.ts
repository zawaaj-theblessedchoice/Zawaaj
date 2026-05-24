import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// PATCH /api/admin/profiles
// Body: { ids: string[], action: 'approve' | 'reject' }
// Batch-approves or batch-rejects profiles in a single request.
export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: adminCheck } = await supabase
      .from('zawaaj_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminCheck?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as { ids?: string[]; action?: string }
    const { ids, action } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    const now = new Date().toISOString()
    let processed = 0

    if (action === 'approve') {
      // For approve: set approved_date and listed_at (first-time only) per profile
      for (const id of ids) {
        const updateData: Record<string, unknown> = {
          status: 'approved',
          approved_date: now,
        }

        // Set listed_at only on first approval
        const { data: existing } = await supabaseAdmin
          .from('zawaaj_profiles')
          .select('listed_at')
          .eq('id', id)
          .maybeSingle()

        if (existing && !existing.listed_at) {
          updateData.listed_at = now
        }

        const { error } = await supabaseAdmin
          .from('zawaaj_profiles')
          .update(updateData)
          .eq('id', id)

        if (error) {
          console.error(`[batch approve] profile ${id}:`, error.message)
          continue
        }

        // In-app notification
        await supabaseAdmin.from('zawaaj_notifications').insert({
          profile_id: id,
          type: 'profile_approved',
          title: 'Profile approved',
          body: 'Your profile has been reviewed and approved. You can now browse and express interest in other profiles.',
          action_url: '/browse',
        }).then(({ error: e }) => { if (e) console.warn('[batch notify approved]', e.message) })

        processed++
      }
    } else {
      // Reject: bulk update is safe since no per-row conditional logic needed
      const { error } = await supabaseAdmin
        .from('zawaaj_profiles')
        .update({ status: 'rejected' })
        .in('id', ids)

      if (error) {
        console.error('[batch reject]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Notifications for each
      const notifications = ids.map(id => ({
        profile_id: id,
        type: 'profile_rejected',
        title: 'Profile update',
        body: 'Your profile has been reviewed and was not approved at this time. Please contact us if you have any questions.',
        action_url: null as string | null,
      }))
      await supabaseAdmin.from('zawaaj_notifications').insert(notifications)
        .then(({ error: e }) => { if (e) console.warn('[batch notify rejected]', e.message) })

      processed = ids.length
    }

    return NextResponse.json({ ok: true, processed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[admin/profiles batch PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
