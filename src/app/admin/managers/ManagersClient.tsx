'use client'

// /admin/managers — Manager admin UI (Section 7, Family Model v2)
// Super admin only.

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagerRow {
  id: string
  user_id: string
  full_name: string
  email: string | null
  contact_number: string | null
  scope_cities: string[] | null
  scope_genders: string[] | null
  scope_ethnicities: string[] | null
  scope_languages: string[] | null
  role: 'manager' | 'senior_manager'
  is_active: boolean
  notes: string | null
  appointed_at: string | null
  created_at: string
}

export interface AdminManagersClientProps {
  managers: ManagerRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#111111',
  border: '0.5px solid rgba(255,255,255,0.12)',
  color: 'white',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
  display: 'block',
}

function ScopeChips({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setInput('')
  }

  return (
    <div>
      <span style={LABEL_STYLE}>{label}</span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(v => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: 'rgba(184,150,12,0.15)', color: '#B8960C', border: '0.5px solid rgba(184,150,12,0.3)' }}
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter(x => x !== v))}
              style={{ color: 'rgba(184,150,12,0.7)', lineHeight: 1, marginLeft: 2 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          style={{ ...INPUT_STYLE, width: 'auto', flex: 1 }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(255,255,255,0.12)' }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Add Manager Form ─────────────────────────────────────────────────────────

interface AddManagerFormProps {
  onCreated: (m: ManagerRow) => void
}

function AddManagerForm({ onCreated }: AddManagerFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [userId, setUserId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'manager' | 'senior_manager'>('manager')
  const [cities, setCities] = useState<string[]>([])
  const [genders, setGenders] = useState<string[]>([])
  const [ethnicities, setEthnicities] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  function reset() {
    setUserId(''); setFullName(''); setEmail(''); setPhone('')
    setRole('manager'); setCities([]); setGenders([]); setEthnicities([])
    setLanguages([]); setNotes(''); setErr(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId.trim() || !fullName.trim()) {
      setErr('User ID and full name are required')
      return
    }
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId.trim(),
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          contact_number: phone.trim() || undefined,
          role,
          scope_cities: cities.length ? cities : undefined,
          scope_genders: genders.length ? genders : undefined,
          scope_ethnicities: ethnicities.length ? ethnicities : undefined,
          scope_languages: languages.length ? languages : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json() as { id?: string; error?: string }
      if (!res.ok || !json.id) {
        setErr(json.error ?? 'Failed to create manager')
        return
      }
      // Reload page to fetch the new row from DB
      window.location.reload()
      onCreated({
        id: json.id,
        user_id: userId.trim(),
        full_name: fullName.trim(),
        email: email.trim() || null,
        contact_number: phone.trim() || null,
        scope_cities: cities.length ? cities : null,
        scope_genders: genders.length ? genders : null,
        scope_ethnicities: ethnicities.length ? ethnicities : null,
        scope_languages: languages.length ? languages : null,
        role,
        is_active: true,
        notes: notes.trim() || null,
        appointed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      reset()
      setOpen(false)
    } catch {
      setErr('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ backgroundColor: '#B8960C', color: '#111111' }}
      >
        + Add manager
      </button>
    )
  }

  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-5"
      style={{ backgroundColor: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Add manager</h3>
        <button onClick={() => { setOpen(false); reset() }} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <div>
            <label style={LABEL_STYLE}>Auth user ID (UUID) *</label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-…"
              style={{ ...INPUT_STYLE, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Full name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Fatima Ahmed" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@example.com" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Contact number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xxx xxxxxx" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Role *</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'manager' | 'senior_manager')}
              style={INPUT_STYLE}
            >
              <option value="manager">Manager</option>
              <option value="senior_manager">Senior manager</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <ScopeChips label="Scope — cities" value={cities} onChange={setCities} placeholder="e.g. London" />
          <ScopeChips label="Scope — genders" value={genders} onChange={setGenders} placeholder="Male / Female / All" />
          <ScopeChips label="Scope — ethnicities" value={ethnicities} onChange={setEthnicities} placeholder="e.g. South Asian" />
          <ScopeChips label="Scope — languages" value={languages} onChange={setLanguages} placeholder="e.g. Urdu" />
        </div>

        <div>
          <label style={LABEL_STYLE}>Notes (private)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes visible only to super admins"
            style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 64 }}
          />
        </div>

        {err && <p style={{ fontSize: 13, color: '#f87171' }}>{err}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#B8960C', color: '#111111', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Creating…' : 'Create manager'}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); reset() }}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Manager Card ─────────────────────────────────────────────────────────────

interface ManagerCardProps {
  manager: ManagerRow
  onUpdate: (id: string, updates: Partial<ManagerRow>) => void
  onRemove: (id: string) => void
}

function ManagerCard({ manager, onUpdate, onRemove }: ManagerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Edit state — initialised from manager row when expanded
  const [fullName, setFullName] = useState(manager.full_name)
  const [email, setEmail] = useState(manager.email ?? '')
  const [phone, setPhone] = useState(manager.contact_number ?? '')
  const [role, setRole] = useState<'manager' | 'senior_manager'>(manager.role)
  const [cities, setCities] = useState<string[]>(manager.scope_cities ?? [])
  const [genders, setGenders] = useState<string[]>(manager.scope_genders ?? [])
  const [ethnicities, setEthnicities] = useState<string[]>(manager.scope_ethnicities ?? [])
  const [languages, setLanguages] = useState<string[]>(manager.scope_languages ?? [])
  const [notes, setNotes] = useState(manager.notes ?? '')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/managers/${manager.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim() || null,
          contact_number: phone.trim() || null,
          role,
          scope_cities: cities.length ? cities : null,
          scope_genders: genders.length ? genders : null,
          scope_ethnicities: ethnicities.length ? ethnicities : null,
          scope_languages: languages.length ? languages : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) { setErr(json.error ?? 'Failed to save'); return }
      onUpdate(manager.id, {
        full_name: fullName.trim(),
        email: email.trim() || null,
        contact_number: phone.trim() || null,
        role,
        scope_cities: cities.length ? cities : null,
        scope_genders: genders.length ? genders : null,
        scope_ethnicities: ethnicities.length ? ethnicities : null,
        scope_languages: languages.length ? languages : null,
        notes: notes.trim() || null,
      })
      setExpanded(false)
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    setSaving(true); setErr(null)
    const newActive = !manager.is_active
    try {
      const res = await fetch(`/api/admin/managers/${manager.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) { setErr(json.error ?? 'Failed to update'); return }
      onUpdate(manager.id, { is_active: newActive })
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${manager.full_name}? This will permanently delete their manager record if they have no assigned matches.`)) return
    setRemoving(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/managers/${manager.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hard: true }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) { setErr(json.error ?? 'Failed to remove'); return }
      onRemove(manager.id)
    } catch {
      setErr('Network error')
    } finally {
      setRemoving(false)
    }
  }

  const allScopes = [
    ...(manager.scope_cities ?? []).map(v => ({ label: v, dim: 'City' })),
    ...(manager.scope_genders ?? []).map(v => ({ label: v, dim: 'Gender' })),
    ...(manager.scope_ethnicities ?? []).map(v => ({ label: v, dim: 'Ethnicity' })),
    ...(manager.scope_languages ?? []).map(v => ({ label: v, dim: 'Language' })),
  ]

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `0.5px solid ${manager.is_active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        opacity: manager.is_active ? 1 : 0.6,
      }}
    >
      {/* Card header — always visible */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ backgroundColor: '#1A1A1A' }}
      >
        {/* Avatar */}
        <div
          className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
          style={{ width: 40, height: 40, fontSize: 14, backgroundColor: '#185FA5', color: '#E6F1FB' }}
        >
          {manager.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{manager.full_name}</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(184,150,12,0.15)', color: '#B8960C' }}
            >
              {manager.role === 'senior_manager' ? 'Senior manager' : 'Manager'}
            </span>
            {!manager.is_active && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            {manager.email && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{manager.email}</span>
            )}
            {manager.contact_number && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{manager.contact_number}</span>
            )}
          </div>
          {allScopes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allScopes.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(184,150,12,0.1)', color: '#B8960C', border: '0.5px solid rgba(184,150,12,0.25)' }}
                >
                  <span style={{ opacity: 0.6 }}>{s.dim}:</span>
                  <span className="font-medium">{s.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggleActive}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: manager.is_active ? 'rgba(255,255,255,0.06)' : 'rgba(74,222,128,0.1)',
              border: `0.5px solid ${manager.is_active ? 'rgba(255,255,255,0.12)' : 'rgba(74,222,128,0.3)'}`,
              color: manager.is_active ? 'rgba(255,255,255,0.5)' : '#4ade80',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {manager.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            {expanded ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '0.5px solid rgba(239,68,68,0.25)',
              color: '#f87171',
              opacity: removing ? 0.6 : 1,
            }}
          >
            {removing ? '…' : 'Remove'}
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="px-5 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
          <p style={{ fontSize: 12, color: '#f87171' }}>{err}</p>
        </div>
      )}

      {/* Expanded edit form */}
      {expanded && (
        <form
          onSubmit={handleSave}
          className="px-5 py-5 flex flex-col gap-4"
          style={{ backgroundColor: '#111111', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            <div>
              <label style={LABEL_STYLE}>Full name *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Contact number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as 'manager' | 'senior_manager')} style={INPUT_STYLE}>
                <option value="manager">Manager</option>
                <option value="senior_manager">Senior manager</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            <ScopeChips label="Scope — cities" value={cities} onChange={setCities} placeholder="e.g. London" />
            <ScopeChips label="Scope — genders" value={genders} onChange={setGenders} placeholder="Male / Female" />
            <ScopeChips label="Scope — ethnicities" value={ethnicities} onChange={setEthnicities} placeholder="e.g. South Asian" />
            <ScopeChips label="Scope — languages" value={languages} onChange={setLanguages} placeholder="e.g. Urdu" />
          </div>

          <div>
            <label style={LABEL_STYLE}>Notes (private)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 60 }}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#B8960C', color: '#111111', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminManagersClient({ managers: initial }: AdminManagersClientProps) {
  const [managers, setManagers] = useState<ManagerRow[]>(initial)

  function handleUpdate(id: string, updates: Partial<ManagerRow>) {
    setManagers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  function handleRemove(id: string) {
    setManagers(prev => prev.filter(m => m.id !== id))
  }

  const active = managers.filter(m => m.is_active)
  const inactive = managers.filter(m => !m.is_active)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111', color: 'white' }}>

      {/* ── Top nav ── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}
      >
        <ZawaajLogo size={32} tagline={false} />
        <Link href="/admin" className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          ← Back to dashboard
        </Link>
      </div>

      {/* ── Page header ── */}
      <div className="px-6 pt-8 pb-6 flex items-start justify-between gap-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 4 }}>
            Managers
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            Super admin only. Managers are assigned matches based on their scope.
          </p>
        </div>
        <AddManagerForm onCreated={() => {}} />
      </div>

      <div className="px-6 py-8 flex flex-col gap-8 max-w-4xl">

        {/* Auto-assignment note */}
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(184,150,12,0.07)', border: '0.5px solid rgba(184,150,12,0.2)' }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            Matches are auto-assigned to the manager whose scope best matches the profiles&apos; locations and genders.
            Super admin can override the assignment at any time from the Match Queue.
          </p>
        </div>

        {/* Active managers */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Active</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              {active.length}
            </span>
          </div>

          {active.length === 0 ? (
            <div
              className="rounded-xl px-5 py-8 text-center"
              style={{ backgroundColor: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)' }}
            >
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                No active managers. Add one using the button above.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map(m => (
                <ManagerCard
                  key={m.id}
                  manager={m}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </section>

        {/* Inactive managers */}
        {inactive.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Inactive</h2>
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
              >
                {inactive.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {inactive.map(m => (
                <ManagerCard
                  key={m.id}
                  manager={m}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
