'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

interface ZawaajEvent {
  id: string
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
  organiser: string | null
  organiser_label: string | null
  price_gbp: number
  tags: string[] | null
}

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

const CATEGORY_LABELS: Record<string, string> = {
  workshop: 'Workshop',
  webinar: 'Webinar',
  matrimonial: 'Matrimonial',
  community: 'Community',
}

const CATEGORY_FILTERS = ['All', 'Workshop', 'Webinar', 'Matrimonial', 'Community']

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2.5" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M1 5.5h11M4.5 1v3M8.5 1v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 7.5 6 12 6 12S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1Z" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

function UpcomingEventCard({
  event,
  registeredIds,
  loggedIn,
  onRegister,
  registering,
}: {
  event: ZawaajEvent
  registeredIds: Set<string>
  loggedIn: boolean
  onRegister: (eventId: string) => Promise<void>
  registering: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const showRohBadge = event.organiser === 'radiance_of_hope' || event.organiser === 'both'
  const categoryLabel = event.event_category ? CATEGORY_LABELS[event.event_category] : null
  const locationLabel = event.is_online ? 'Online' : (event.location_text ?? null)
  const isRegistered = registeredIds.has(event.id)

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderLeft: '3px solid var(--gold)',
        borderRadius: 13,
        padding: '20px 20px 18px',
      }}
    >
      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {categoryLabel && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--gold)',
            background: 'var(--gold-muted)',
            border: '0.5px solid var(--border-gold)',
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            {categoryLabel}
          </span>
        )}
        {showRohBadge && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#0d9488',
            background: 'rgba(13,148,136,0.1)',
            border: '0.5px solid rgba(13,148,136,0.3)',
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            {event.organiser_label ?? 'Radiance of Hope'}
          </span>
        )}
        {event.price_gbp > 0 ? (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            background: 'var(--surface-3)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            £{event.price_gbp}
          </span>
        ) : (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#0d9488',
            background: 'rgba(13,148,136,0.08)',
            border: '0.5px solid rgba(13,148,136,0.2)',
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            Free
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.4 }}>
        {event.title}
      </h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <CalendarIcon />
          {formatEventDate(event.event_date)}
        </span>
        {locationLabel && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <PinIcon />
            {locationLabel}
          </span>
        )}
        {event.capacity && (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {event.capacity} places
          </span>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {event.description}
          </p>
          {!expanded && event.description.length > 160 && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                fontSize: 12,
                color: 'var(--gold)',
                background: 'none',
                border: 'none',
                padding: '2px 0 0',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Read more
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {event.registration_url && (
          <a
            href={event.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              background: 'var(--gold)',
              color: 'var(--surface)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.85')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
          >
            Register →
          </a>
        )}

        {loggedIn && (
          <button
            onClick={() => onRegister(event.id)}
            disabled={isRegistered || registering === event.id}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: '0.5px solid',
              borderColor: isRegistered ? 'rgba(13,148,136,0.4)' : 'var(--border-default)',
              background: isRegistered ? 'rgba(13,148,136,0.08)' : 'var(--surface-3)',
              color: isRegistered ? '#0d9488' : 'var(--text-secondary)',
              cursor: isRegistered || registering === event.id ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isRegistered ? '✓ Interested' : registering === event.id ? 'Saving…' : 'Register interest'}
          </button>
        )}

        {!loggedIn && (
          <a
            href="/login"
            style={{
              fontSize: 12.5,
              color: 'var(--text-muted)',
              textDecoration: 'none',
            }}
          >
            Sign in to register interest
          </a>
        )}
      </div>
    </div>
  )
}

function PastEventCard({ event }: { event: ZawaajEvent }) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
          {event.title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{formatEventDate(event.event_date)}</span>
          {event.location_text && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{event.location_text}</span>
          )}
        </div>
        {event.attendance_note && (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
            {event.attendance_note}
          </p>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', flexShrink: 0, paddingTop: 2 }}>
        Past
      </span>
    </div>
  )
}

export default function EventsPage() {
  const pathname = usePathname()
  const supabase = createClient()

  const [events, setEvents] = useState<ZawaajEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
  const [registering, setRegistering] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined)
  const [familyAccountId, setFamilyAccountId] = useState<string | null>(null)
  const [sidebarProfile, setSidebarProfile] = useState<{ display_initials: string; gender: string | null; first_name: string | null } | null>(null)
  const [managedProfiles, setManagedProfiles] = useState<ManagedProfile[]>([])
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introCount, setIntroCount] = useState(0)

  useEffect(() => {
    async function load() {
      const [{ data: eventsData }, { data: { user } }] = await Promise.all([
        supabase
          .from('zawaaj_events')
          .select(`
            id, title, event_date, location_text, registration_url, status,
            attendance_note, show_in_history, is_online, description, capacity,
            event_category, organiser, organiser_label, price_gbp, tags
          `)
          .neq('status', 'archived')
          .order('event_date', { ascending: true }),
        supabase.auth.getUser(),
      ])

      setEvents(eventsData ?? [])

      if (user) {
        setLoggedIn(true)
        const [{ data: settings }, { data: profileRows }, { data: familyAccount }] = await Promise.all([
          supabase.from('zawaaj_user_settings').select('active_profile_id').eq('user_id', user.id).maybeSingle(),
          supabase.from('zawaaj_profiles').select('id, display_initials, first_name, gender, status').eq('user_id', user.id),
          supabase.from('zawaaj_family_accounts').select('id').eq('primary_user_id', user.id).maybeSingle(),
        ])

        if (familyAccount?.id) {
          setFamilyAccountId(familyAccount.id)
          // Load existing registrations
          const { data: regs } = await supabase
            .from('zawaaj_event_registrations')
            .select('event_id')
            .eq('family_account_id', familyAccount.id)
          if (regs) {
            setRegisteredIds(new Set(regs.map(r => r.event_id)))
          }
        }

        if (profileRows?.length) {
          const activeId = settings?.active_profile_id ?? profileRows[0].id
          const active = profileRows.find(p => p.id === activeId) ?? profileRows[0]
          setSidebarProfile({ display_initials: active.display_initials, gender: active.gender, first_name: active.first_name })
          setActiveProfileId(activeId)
          setManagedProfiles(profileRows.map(p => ({ id: p.id, display_initials: p.display_initials, first_name: p.first_name, gender: p.gender, status: p.status })))

          const [slRes, irRes] = await Promise.all([
            supabase.from('zawaaj_saved_profiles').select('id', { count: 'exact', head: true }).eq('profile_id', active.id),
            supabase.from('zawaaj_introduction_requests').select('id', { count: 'exact', head: true }).eq('requesting_profile_id', active.id).in('status', ['pending', 'accepted']),
          ])
          setShortlistCount(slRes.count ?? 0)
          setIntroCount(irRes.count ?? 0)
        }
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRegister(eventId: string) {
    if (!familyAccountId || registering) return
    setRegistering(eventId)
    const { error } = await supabase
      .from('zawaaj_event_registrations')
      .insert({ event_id: eventId, family_account_id: familyAccountId })
    if (!error) {
      setRegisteredIds(prev => new Set([...prev, eventId]))
    }
    setRegistering(null)
  }

  const upcomingEvents = events.filter(e => e.status === 'upcoming')
  const pastEvents = events.filter(e => e.status === 'ended' && e.show_in_history)

  const filteredUpcoming = categoryFilter === 'All'
    ? upcomingEvents
    : upcomingEvents.filter(e => {
        if (!e.event_category) return false
        return CATEGORY_LABELS[e.event_category] === categoryFilter
      })

  const content = (
    <main
      style={{
        marginLeft: loggedIn ? 200 : 0,
        flex: 1,
        padding: loggedIn ? '28px 28px 60px' : '40px 24px 60px',
        minHeight: '100vh',
        maxWidth: loggedIn ? undefined : 760,
        margin: loggedIn ? undefined : '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Events
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Community sessions and workshops delivered in partnership with Radiance of Hope.
        </p>
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '5px 14px',
              borderRadius: 999,
              fontSize: 12.5,
              border: '0.5px solid',
              borderColor: categoryFilter === cat ? 'var(--gold)' : 'var(--border-default)',
              background: categoryFilter === cat ? 'var(--gold-muted)' : 'transparent',
              color: categoryFilter === cat ? 'var(--gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: categoryFilter === cat ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {/* Upcoming */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>
              Upcoming events
            </div>

            {filteredUpcoming.length === 0 ? (
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '0.5px solid var(--border-default)',
                  borderLeft: '3px solid var(--border-gold)',
                  borderRadius: 13,
                  padding: '40px 24px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 10 }}>📅</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {categoryFilter === 'All' ? 'No upcoming events at the moment' : `No upcoming ${categoryFilter.toLowerCase()} events`}
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  Check back soon insha&apos;Allah.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredUpcoming.map(event => (
                  <UpcomingEventCard
                    key={event.id}
                    event={event}
                    registeredIds={registeredIds}
                    loggedIn={loggedIn}
                    onRegister={handleRegister}
                    registering={registering}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          {pastEvents.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Past events
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastEvents.map(event => (
                  <PastEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )

  if (!loggedIn && !loading) {
    // Public layout — no sidebar
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
        {content}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      {loggedIn && (
        <Sidebar
          activeRoute={pathname ?? '/events'}
          shortlistCount={shortlistCount}
          introRequestsCount={introCount}
          profile={sidebarProfile}
          managedProfiles={managedProfiles}
          activeProfileId={activeProfileId}
        />
      )}
      {content}
    </div>
  )
}
