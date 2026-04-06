'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'

interface ZawaajEvent {
  id: string
  title: string
  event_date: string
  location_text: string | null
  registration_url: string | null
  status: string
  attendance_note: string | null
  show_in_history: boolean
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function UpcomingEventCard({ event }: { event: ZawaajEvent }) {
  return (
    <div
      className="rounded-2xl p-6 bg-white shadow-sm"
      style={{ borderLeft: '4px solid #B8960C', border: '1px solid #E8E4DC', borderLeftWidth: '4px', borderLeftColor: '#B8960C' }}
    >
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{event.title}</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        <span className="text-sm text-[#1A1A1A]/70 flex items-center gap-1.5">
          📅 {formatEventDate(event.event_date)}
        </span>
        {event.location_text && (
          <span className="text-sm text-[#1A1A1A]/70 flex items-center gap-1.5">
            📍 {event.location_text}
          </span>
        )}
      </div>
      <p className="text-sm text-[#1A1A1A]/60 mb-4 leading-relaxed">
        A free monthly marriage event for serious candidates only. Places are limited — registration required.
      </p>
      {event.registration_url ? (
        <a
          href={event.registration_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#B8960C' }}
        >
          Register Now →
        </a>
      ) : (
        <p className="text-sm text-[#1A1A1A]/40 italic">Registration details coming soon</p>
      )}
    </div>
  )
}

function PastEventCard({ event }: { event: ZawaajEvent }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#F0EDE7', border: '1px solid #E0DBD1' }}
    >
      <h3 className="text-sm font-semibold text-[#1A1A1A]/70 mb-1">{event.title}</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-1">
        <span className="text-xs text-[#1A1A1A]/50">
          📅 {formatEventDate(event.event_date)}
        </span>
        {event.location_text && (
          <span className="text-xs text-[#1A1A1A]/50">📍 {event.location_text}</span>
        )}
      </div>
      {event.attendance_note && (
        <p className="text-xs text-[#1A1A1A]/50 mt-1 italic">{event.attendance_note}</p>
      )}
    </div>
  )
}

export default function EventsPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<ZawaajEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('zawaaj_events')
        .select('id, title, event_date, location_text, registration_url, status, attendance_note, show_in_history')
        .neq('status', 'archived')
        .order('event_date', { ascending: false })

      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const upcomingEvents = events.filter((e) => e.status === 'upcoming')
  const pastEvents = events.filter((e) => e.status === 'ended' && e.show_in_history)

  return (
    <>
      <NavBar />
      <main className="pt-14">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Events</h1>
            <p className="text-[#1A1A1A]/60 mb-3">Monthly marriage events for serious candidates</p>
            <p className="text-sm text-[#1A1A1A]/50 italic">
              Voluntary contributions are welcome to support Radiance of Hope.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-[#1A1A1A]/50">Loading events…</p>
          ) : (
            <>
              {/* Upcoming events */}
              <section className="mb-10">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Upcoming events</h2>
                {upcomingEvents.length === 0 ? (
                  <div
                    className="rounded-2xl p-8 text-center"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}
                  >
                    <p className="text-2xl mb-3">📅</p>
                    <p className="text-base font-semibold text-[#1A1A1A] mb-1">
                      No upcoming events at the moment
                    </p>
                    <p className="text-sm text-[#1A1A1A]/50">Check back soon.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {upcomingEvents.map((event) => (
                      <UpcomingEventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>

              {/* Past events */}
              {pastEvents.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold text-[#1A1A1A]/60 mb-3">Past events</h2>
                  <div className="flex flex-col gap-3">
                    {pastEvents.map((event) => (
                      <PastEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
