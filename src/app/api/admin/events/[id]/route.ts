// PATCH  /api/admin/events/[id]  — update an event (admin only)
// DELETE /api/admin/events/[id]  — archive an event (admin only, sets status='archived')

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  return profile?.is_admin ? user : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as Partial<{
    title: string
    event_date: string
    location_text: string | null
    registration_url: string | null
    status: string
    attendance_note: string | null
    show_in_history: boolean
    is_online: boolean
    description: string | null
    capacity: number | null
    event_category: string | null
    organiser: string
    organiser_label: string | null
    is_featured: boolean
    price_gbp: number
    tags: string[]
  }>

  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = body.title.trim()
  if (body.event_date !== undefined) patch.event_date = body.event_date
  if (body.location_text !== undefined) patch.location_text = body.location_text?.trim() || null
  if (body.registration_url !== undefined) patch.registration_url = body.registration_url?.trim() || null
  if (body.status !== undefined) patch.status = body.status
  if (body.attendance_note !== undefined) patch.attendance_note = body.attendance_note?.trim() || null
  if (body.show_in_history !== undefined) patch.show_in_history = body.show_in_history
  if (body.is_online !== undefined) patch.is_online = body.is_online
  if (body.description !== undefined) patch.description = body.description?.trim() || null
  if (body.capacity !== undefined) patch.capacity = body.capacity
  if (body.event_category !== undefined) patch.event_category = body.event_category || null
  if (body.organiser !== undefined) patch.organiser = body.organiser
  if (body.organiser_label !== undefined) patch.organiser_label = body.organiser_label?.trim() || null
  if (body.is_featured !== undefined) patch.is_featured = body.is_featured
  if (body.price_gbp !== undefined) patch.price_gbp = body.price_gbp
  if (body.tags !== undefined) patch.tags = body.tags

  const { data, error } = await supabaseAdmin
    .from('zawaaj_events')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('zawaaj_events')
    .update({ status: 'archived' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
