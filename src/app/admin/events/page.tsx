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
}

type EventForm = typeof EMPTY_FORM

export default function AdminEventsPage() {
  const [events, setEvents] = useState<ZawaajEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Filter
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
      event_date: ev.event_date.slice(0, 16), // datetime-local format
      location_text: ev.location_text ?? '',
      registration_url: ev.registration_url ?? '',
      status: ev.status as EventStatus,
      attendance_note: ev.attendance_note ?? '',
      show_in_history: ev.show_in_history,
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
        <div
          style={{
            padding: '40px 24px',
            borderRadius: 12,
            background: '#1a1a1a',
            border: '0.5px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 13,
          }}
        >
          No events found. Create your first event above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(ev => (
            <div
              key={ev.id}
              style={{
                background: '#1a1a1a',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              {/* Date block */}
              <div
                style={{
                  flexShrink: 0,
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: '#111',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: '#B8960C', lineHeight: 1 }}>
                  {new Date(ev.event_date).getDate()}
                </span>
                <span style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {new Date(ev.event_date).toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{ev.title}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: STATUS_COLORS[ev.status as EventStatus] ?? '#6b7280',
                      background: `${STATUS_COLORS[ev.status as EventStatus] ?? '#6b7280'}20`,
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    {STATUS_LABELS[ev.status as EventStatus] ?? ev.status}
                  </span>
                  {ev.show_in_history && (
                    <span
                      style={{
                        fontSize: 10,
                        color: '#9ca3af',
                        background: 'rgba(255,255,255,0.06)',
                        padding: '2px 8px',
                        borderRadius: 12,
                      }}
                    >
                      Shown in history
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
                  <span>{formatDate(ev.event_date)}</span>
                  {ev.location_text && <span>📍 {ev.location_text}</span>}
                  {ev.registration_url && (
                    <a
                      href={ev.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#B8960C', textDecoration: 'none', fontSize: 12 }}
                    >
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
                  style={{
                    padding: '6px 14px',
                    borderRadius: 7,
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#d1d5db',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                {ev.status !== 'archived' && (
                  <button
                    onClick={() => handleArchive(ev.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 7,
                      fontSize: 12,
                      background: 'rgba(239,68,68,0.08)',
                      border: '0.5px solid rgba(239,68,68,0.2)',
                      color: '#f87171',
                      cursor: 'pointer',
                    }}
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f3f4f6', margin: '0 0 22px' }}>
              {editingId ? 'Edit event' : 'New event'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Title *</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Zawaaj Marriage Event — London"
                />
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date &amp; time *</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                />
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location</label>
                <input
                  style={inputStyle}
                  value={form.location_text}
                  onChange={e => setForm(f => ({ ...f, location_text: e.target.value }))}
                  placeholder="e.g. East London Mosque"
                />
              </div>

              {/* Registration URL */}
              <div>
                <label style={labelStyle}>Registration URL</label>
                <input
                  style={inputStyle}
                  value={form.registration_url}
                  onChange={e => setForm(f => ({ ...f, registration_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as EventStatus }))}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ended">Ended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Attendance note */}
              <div>
                <label style={labelStyle}>Attendance note (optional, shown on past events)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                  value={form.attendance_note}
                  onChange={e => setForm(f => ({ ...f, attendance_note: e.target.value }))}
                  placeholder="e.g. 47 attendees — alhamdulillah"
                />
              </div>

              {/* Show in history */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#d1d5db',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.show_in_history}
                  onChange={e => setForm(f => ({ ...f, show_in_history: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#B8960C' }}
                />
                Show in past events history (member-facing)
              </label>
            </div>

            {saveError && (
              <p style={{ fontSize: 12, color: '#f87171', marginTop: 14 }}>{saveError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2,
                  padding: '10px 0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: saving ? 'rgba(184,150,12,0.4)' : '#B8960C',
                  border: 'none',
                  color: '#111',
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
