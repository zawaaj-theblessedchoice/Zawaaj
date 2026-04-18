'use client'

import { useEffect, useState } from 'react'

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
  organiser: string
  organiser_label: string | null
  is_featured: boolean
  price_gbp: number
  tags: string[] | null
  created_at: string
}

type EventStatus = 'upcoming' | 'ended' | 'archived'

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: 'Upcoming',
  ended: 'Ended',
  archived: 'Archived',
}

const STATUS_COLORS: Record<EventStatus, string> = {
  upcoming: '#B8960C',
  ended: '#6b7280',
  archived: '#374151',
}

const ORGANISER_OPTIONS = [
  { value: 'zawaaj', label: 'Zawaaj' },
  { value: 'radiance_of_hope', label: 'Radiance of Hope' },
  { value: 'both', label: 'Both' },
]

const ORGANISER_DEFAULT_LABELS: Record<string, string> = {
  zawaaj: 'Zawaaj',
  radiance_of_hope: 'Radiance of Hope',
  both: 'Zawaaj & Radiance of Hope',
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const EMPTY_FORM = {
  title: '',
  event_date: '',
  location_text: '',
  registration_url: '',
  status: 'upcoming' as EventStatus,
  attendance_note: '',
  show_in_history: false,
  is_online: false,
  description: '',
  capacity: '',
  event_category: '',
  organiser: 'zawaaj',
  organiser_label: '',
  is_featured: false,
  price_gbp: '0',
  tags: '',
}

type EventForm = typeof EMPTY_FORM

export default function AdminEventsPage() {
  const [events, setEvents] = useState<ZawaajEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/events')
    if (!res.ok) {
      setError('Failed to load events')
      setLoading(false)
      return
    }
    const json = await res.json() as { events: ZawaajEvent[] }
    setEvents(json.events ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setShowModal(true)
  }

  function openEdit(ev: ZawaajEvent) {
    setEditingId(ev.id)
    setForm({
      title: ev.title,
      event_date: ev.event_date.slice(0, 16),
      location_text: ev.location_text ?? '',
      registration_url: ev.registration_url ?? '',
      status: ev.status as EventStatus,
      attendance_note: ev.attendance_note ?? '',
      show_in_history: ev.show_in_history,
      is_online: ev.is_online,
      description: ev.description ?? '',
      capacity: ev.capacity != null ? String(ev.capacity) : '',
      event_category: ev.event_category ?? '',
      organiser: ev.organiser ?? 'zawaaj',
      organiser_label: ev.organiser_label ?? '',
      is_featured: ev.is_featured,
      price_gbp: String(ev.price_gbp ?? 0),
      tags: ev.tags?.join(', ') ?? '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.event_date) {
      setSaveError('Title and date are required')
      return
    }
    setSaving(true)
    setSaveError(null)

    const payload = {
      title: form.title.trim(),
      event_date: form.event_date,
      location_text: form.location_text.trim() || null,
      registration_url: form.registration_url.trim() || null,
      status: form.status,
      attendance_note: form.attendance_note.trim() || null,
      show_in_history: form.show_in_history,
      is_online: form.is_online,
      description: form.description.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      event_category: form.event_category || null,
      organiser: form.organiser,
      organiser_label: form.organiser_label.trim() || ORGANISER_DEFAULT_LABELS[form.organiser] || null,
      is_featured: form.is_featured,
      price_gbp: parseFloat(form.price_gbp) || 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }

    const url = editingId ? `/api/admin/events/${editingId}` : '/api/admin/events'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const j = await res.json() as { error?: string }
      setSaveError(j.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    setShowModal(false)
    await load()
    setSaving(false)
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this event? It will no longer appear to members.')) return
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    await load()
  }

  const filtered = statusFilter === 'all'
    ? events
    : events.filter(e => e.status === statusFilter)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    background: '#1f1f1f',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: '#f3f4f6',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#9ca3af',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6', margin: '0 0 4px' }}>Events</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage community events shown to members</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            background: '#B8960C',
            border: 'none',
            color: '#111',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New event
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['all', 'upcoming', 'ended', 'archived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              border: '0.5px solid',
              borderColor: statusFilter === s ? '#B8960C' : 'rgba(255,255,255,0.1)',
              background: statusFilter === s ? 'rgba(184,150,12,0.12)' : 'transparent',
              color: statusFilter === s ? '#B8960C' : '#9ca3af',
              cursor: 'pointer',
              fontWeight: statusFilter === s ? 600 : 400,
            }}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: '#6b7280', fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 24px', borderRadius: 12, background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          No events found. Create your first event above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(ev => (
            <div
              key={ev.id}
              style={{
                background: '#1a1a1a',
                border: ev.is_featured ? '0.5px solid rgba(184,150,12,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              {/* Date block */}
              <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 10, background: '#111', border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#B8960C', lineHeight: 1 }}>
                  {new Date(ev.event_date).getDate()}
                </span>
                <span style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {new Date(ev.event_date).toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{ev.title}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: STATUS_COLORS[ev.status as EventStatus] ?? '#6b7280',
                    background: `${STATUS_COLORS[ev.status as EventStatus] ?? '#6b7280'}20`,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}>
                    {STATUS_LABELS[ev.status as EventStatus] ?? ev.status}
                  </span>
                  {ev.is_featured && (
                    <span style={{ fontSize: 10, color: '#B8960C', background: 'rgba(184,150,12,0.12)', padding: '2px 8px', borderRadius: 12 }}>
                      ⭐ Featured
                    </span>
                  )}
                  {ev.event_category && (
                    <span style={{ fontSize: 10, color: '#9ca3af', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>
                      {ev.event_category}
                    </span>
                  )}
                  {ev.price_gbp > 0 ? (
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>£{ev.price_gbp}</span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#10b981' }}>Free</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
                  <span>{formatDate(ev.event_date)}</span>
                  {ev.is_online ? <span>🌐 Online</span> : ev.location_text && <span>📍 {ev.location_text}</span>}
                  {ev.capacity && <span>{ev.capacity} places</span>}
                  {ev.registration_url && (
                    <a href={ev.registration_url} target="_blank" rel="noopener noreferrer" style={{ color: '#B8960C', textDecoration: 'none', fontSize: 12 }}>
                      Registration link ↗
                    </a>
                  )}
                </div>
                {ev.attendance_note && (
                  <p style={{ fontSize: 11.5, color: '#6b7280', margin: '6px 0 0', fontStyle: 'italic' }}>
                    {ev.attendance_note}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(ev)}
                  style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#d1d5db', cursor: 'pointer' }}
                >
                  Edit
                </button>
                {ev.status !== 'archived' && (
                  <button
                    onClick={() => handleArchive(ev.id)}
                    style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer' }}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f3f4f6', margin: '0 0 22px' }}>
              {editingId ? 'Edit event' : 'New event'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Title */}
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Zawaaj Marriage Event — London" />
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date &amp; time *</label>
                <input type="datetime-local" style={inputStyle} value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>

              {/* Category & Organiser (2-col) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.event_category} onChange={e => setForm(f => ({ ...f, event_category: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="workshop">Workshop</option>
                    <option value="webinar">Webinar</option>
                    <option value="matrimonial">Matrimonial</option>
                    <option value="community">Community</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Organiser</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.organiser}
                    onChange={e => setForm(f => ({
                      ...f,
                      organiser: e.target.value,
                      organiser_label: ORGANISER_DEFAULT_LABELS[e.target.value] ?? '',
                    }))}
                  >
                    {ORGANISER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Organiser label (override) */}
              <div>
                <label style={labelStyle}>Organiser label (display override)</label>
                <input style={inputStyle} value={form.organiser_label} onChange={e => setForm(f => ({ ...f, organiser_label: e.target.value }))} placeholder="Auto-filled from organiser selection" />
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} value={form.location_text} onChange={e => setForm(f => ({ ...f, location_text: e.target.value }))} placeholder="e.g. East London Mosque" />
              </div>

              {/* Registration URL */}
              <div>
                <label style={labelStyle}>Registration URL</label>
                <input style={inputStyle} value={form.registration_url} onChange={e => setForm(f => ({ ...f, registration_url: e.target.value }))} placeholder="https://…" />
              </div>

              {/* Price & Capacity (2-col) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Price (£)</label>
                  <input type="number" min="0" step="0.01" style={inputStyle} value={form.price_gbp} onChange={e => setForm(f => ({ ...f, price_gbp: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Capacity</label>
                  <input type="number" min="0" style={inputStyle} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Unlimited" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description shown on the events page…" />
              </div>

              {/* Tags */}
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input style={inputStyle} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. sisters-only, london, beginner" />
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EventStatus }))}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ended">Ended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Attendance note */}
              <div>
                <label style={labelStyle}>Attendance note (shown on past events)</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.attendance_note} onChange={e => setForm(f => ({ ...f, attendance_note: e.target.value }))} placeholder="e.g. 47 attendees — alhamdulillah" />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d1d5db' }}>
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#B8960C' }} />
                  Feature on homepage (shows in homepage events section)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d1d5db' }}>
                  <input type="checkbox" checked={form.is_online} onChange={e => setForm(f => ({ ...f, is_online: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#B8960C' }} />
                  Online event (hides location, shows &quot;Online&quot; label)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d1d5db' }}>
                  <input type="checkbox" checked={form.show_in_history} onChange={e => setForm(f => ({ ...f, show_in_history: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#B8960C' }} />
                  Show in past events history (member-facing)
                </label>
              </div>
            </div>

            {saveError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 14 }}>{saveError}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: saving ? 'rgba(184,150,12,0.4)' : '#B8960C', border: 'none', color: '#111', cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
