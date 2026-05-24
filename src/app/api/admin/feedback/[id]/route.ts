import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// PATCH /api/admin/feedback/[id]
// Body: { status?: 'new' | 'reviewed' | 'resolved', admin_notes?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: adminCheck } = await supabase
      .from('zawaaj_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminCheck?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as { status?: string; admin_notes?: string }
    const VALID = ['new', 'reviewed', 'resolved']

    const update: Record<string, unknown> = {}
    if (body.status !== undefined) {
      if (!VALID.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      update.status = body.status
    }
    if (body.admin_notes !== undefined) {
      update.admin_notes = body.admin_notes
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('zawaaj_bug_reports')
      .update(update)
      .eq('id', id)

    if (error) {
      console.error('[admin/feedback PATCH]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[admin/feedback PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
