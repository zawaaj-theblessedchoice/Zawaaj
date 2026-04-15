// GET  /api/admin/events   — list all non-archived events (admin only)
// POST /api/admin/events   — create a new event (admin only)

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

export async function GET() {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('zawaaj_events')
    .select('id, title, event_date, location_text, registration_url, status, attendance_note, show_in_history, created_at')
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as {
    title: string
    event_date: string
    location_text?: string
    registration_url?: string
    status?: string
    attendance_note?: string
    show_in_history?: boolean
  }

  if (!body.title?.trim() || !body.event_date) {
    return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('zawaaj_events')
    .insert({
      title: body.title.trim(),
      event_date: body.event_date,
      location_text: body.location_text?.trim() || null,
      registration_url: body.registration_url?.trim() || null,
      status: body.status ?? 'upcoming',
      attendance_note: body.attendance_note?.trim() || null,
      show_in_history: body.show_in_history ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}
