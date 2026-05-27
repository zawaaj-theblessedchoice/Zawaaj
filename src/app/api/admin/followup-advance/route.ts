import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── POST — Advance a follow-up status ───────────────────────────────────────
//
// Atomically updates an introduction request's status AND inserts a
// zawaaj_intro_followups audit row. Called from the Follow-ups admin page.
//
// Body: { intro_id: string; new_status: string; note?: string }

const VALID_ADVANCE_STATUSES = [
  'contact_made',
  'both_willing',
  'meeting_arranged',
  'met',
  'nikkah_completed',
  'not_proceeded',
] as const

type AdvanceStatus = (typeof VALID_ADVANCE_STATUSES)[number]

type RequestBody = {
  intro_id?: string
  new_status?: string
  note?: string
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Role check
    const { data: role, error: roleError } = await supabase.rpc('zawaaj_get_role')
    if (roleError) {
      return NextResponse.json({ error: 'Failed to determine role' }, { status: 500 })
    }
    if (role !== 'super_admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Parse body
    const body = await request.json() as RequestBody
    const { intro_id, new_status, note } = body

    if (!intro_id || !new_status) {
      return NextResponse.json({ error: 'intro_id and new_status are required' }, { status: 400 })
    }

    if (!(VALID_ADVANCE_STATUSES as readonly string[]).includes(new_status)) {
      return NextResponse.json(
        { error: `Invalid status '${new_status}'. Valid values: ${VALID_ADVANCE_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // 4. Update introduction request status
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .update({ status: new_status as AdvanceStatus })
      .eq('id', intro_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status: ' + updateError.message }, { status: 500 })
    }

    // 5. Insert follow-up audit row
    const { error: insertError } = await supabaseAdmin
      .from('zawaaj_intro_followups')
      .insert({
        introduction_request_id: intro_id,
        created_by: user.id,
        status_set: new_status,
        note: note ?? null,
      })

    if (insertError) {
      // Non-fatal — status was updated, log and continue
      console.error('[followup-advance] Failed to insert followup row:', insertError.message)
    }

    return NextResponse.json({ success: true, new_status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
