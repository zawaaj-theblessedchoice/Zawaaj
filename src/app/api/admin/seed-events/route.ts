/**
 * TEMPORARY — seed the two Zawaaj events. DELETE after first call.
 * POST https://zawaaj.uk/api/admin/seed-events
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
  const { data, error } = await supabaseAdmin
    .from('zawaaj_events')
    .insert([
      // ── Past event (Feb 7 2026) ───────────────────────────────────
      {
        title: 'Zawaaj Marriage Event',
        event_date: '2026-02-07T11:00:00+00:00',
        location_text: '15 Albert Rd (Opp. Ilford Mosque), Ilford, IG1 1NG',
        registration_url:
          'https://www.eventbrite.co.uk/e/zawaaj-marriage-event-tickets-1982391048992',
        attendance_note: 'Hosted by Zawaaj – The Blessed Choice. 11am–1pm. Free entry.',
        status: 'ended',
        show_in_history: true,
      },
      // ── Upcoming event (2 May 2026) ───────────────────────────────
      {
        title: 'Zawaaj Marriage Event',
        event_date: '2026-05-02T11:00:00+01:00',
        location_text: '15 Albert Rd (Opp. Ilford Mosque), Ilford, IG1 1NG',
        registration_url:
          'https://www.eventbrite.co.uk/e/zawaaj-marriage-event-registration-1982585993075',
        attendance_note: 'Free event for mothers/female representatives & daughters seeking marriage. 18+. Waitlist available — register via Eventbrite.',
        status: 'upcoming',
        show_in_history: false,
      },
    ])
    .select('id, title, event_date, status')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, inserted: data })
}
