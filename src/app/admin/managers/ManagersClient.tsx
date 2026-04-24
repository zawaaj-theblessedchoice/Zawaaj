'use client'

// /admin/managers — Manager admin UI (Section 7, Family Model v2)
// Super admin only.

import { useState } from 'react'

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
  backgroundColor: 'var(--admin-bg)',
  border: '0.5px solid var(--admin-border)',
  color: 'var(--admin-text)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--admin-muted)',
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
          style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text)', border: '0.5px solid var(--admin-border)' }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Add Manager Form ─────────────────────────────────────────────────────────

interface LookupResult {
  user_id:         string
  email:           string
  name:            string | null
  gender:          string | null
  profile_id:      string | null
  current_plan:    string
  already_manager: { id: string; is_active: boolean } | null
}

interface AddManagerFormProps {
  onCreated: (m: ManagerRow) => void
}

function AddManagerForm({ onCreated }: AddManagerFormProps) {
  const [open, setOpen] = useState(false)

  // Step 1 — lookup
  const [emailQuery,     setEmailQuery]     = useState('')
  const [lookupLoading,  setLookupLoading]  = useState(false)
  const [lookupErr,      setLookupErr]      = useState<string | null>(null)
  const [found,          setFound]          = useState<LookupResult | null>(null)

  // Step 2 — form fields (pre-filled after lookup)
  const [fullName,    setFullName]    = useState('')
  const [phone,       setPhone]       = useState('')
  const [role,        setRole]        = useState<'manager' | 'senior_manager'>('manager')
  const [cities,      setCities]      = useState<string[]>([])
  const [genders,     setGenders]     = useState<string[]>([])
  const [ethnicities, setEthnicities] = useState<string[]>([])
  const [languages,   setLanguages]   = useState<string[]>([])
  const [notes,       setNotes]       = useState('')
  const [grantPremium, setGrantPremium] = useState(true)

  // Step 2 — submit
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  function reset() {
    setEmailQuery(''); setLookupErr(null); setFound(null)
    setFullName(''); setPhone(''); setRole('manager')
    setCities([]); setGenders([]); setEthnicities([]); setLanguages([])
    setNotes(''); setGrantPremium(true); setErr(null)
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!emailQuery.trim()) return
    setLookupLoading(true); setLookupErr(null); setFound(null)
    try {
      const res = await fetch('/api/admin/lookup-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailQuery.trim() }),
      })
      const json = await res.json() as LookupResult & { error?: string }
      if (!res.ok) { setLookupErr(json.error ?? 'Not found'); return }
      setFound(json)
      setFullName(json.name ?? '')
    } catch {
      setLookupErr('Network error')
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!found) return
    if (!fullName.trim()) { setErr('Full name is required'); return }
    setLoading(true); setErr(null)
    try {
      // 1. Create manager record
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:           found.user_id,
          full_name:         fullName.trim(),
          email:             found.email,
          contact_number:    phone.trim() || undefined,
          role,
          scope_cities:      cities.length      ? cities      : undefined,
          scope_genders:     genders.length     ? genders     : undefined,
          scope_ethnicities: ethnicities.length ? ethnicities : undefined,
          scope_languages:   languages.length   ? languages   : undefined,
          notes:             notes.trim()        || undefined,
        }),
      })
      const json = await res.json() as { id?: string; error?: string }
      if (!res.ok || !json.id) { setErr(json.error ?? 'Failed to create manager'); return }

      // 2. Optionally grant premium
      if (grantPremium && found.current_plan !== 'premium') {
        await fetch('/api/admin/override-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: found.user_id, plan: 'premium' }),
        })
      }

      window.location.reload()
      onCreated({
        id:                json.id,
        user_id:           found.user_id,
        full_name:         fullName.trim(),
        email:             found.email ?? null,
        contact_number:    phone.trim() || null,
        scope_cities:      cities.length      ? cities      : null,
        scope_genders:     genders.length     ? genders     : null,
        scope_ethnicities: ethnicities.length ? ethnicities : null,
        scope_languages:   languages.length   ? languages   : null,
        role,
        is_active:    true,
        notes:        notes.trim() || null,
        appointed_at: new Date().toISOString(),
        created_at:   new Date().toISOString(),
      })
      reset(); setOpen(false)
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
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) { setOpen(false); reset() } }}
    >
      <div style={{
        width: 440, height: '100vh', overflowY: 'auto',
        backgroundColor: 'var(--admin-surface)',
        borderLeft: '0.5px solid var(--admin-border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--admin-text)' }}>Add manager</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>Look up an existing member by email</p>
          </div>
          <button onClick={() => { setOpen(false); reset() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-muted)', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Step 1: Email lookup ── */}
          <div>
            <label style={LABEL_STYLE}>Member email *</label>
            <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={emailQuery}
                onChange={e => { setEmailQuery(e.target.value); setFound(null); setLookupErr(null) }}
                placeholder="member@example.com"
                style={{ ...INPUT_STYLE, flex: 1 }}
                disabled={lookupLoading}
              />
              <button
                type="submit"
                disabled={lookupLoading || !emailQuery.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: '#B8960C', color: '#111', border: 'none',
                  cursor: lookupLoading || !emailQuery.trim() ? 'not-allowed' : 'pointer',
                  opacity: !emailQuery.trim() ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {lookupLoading ? '…' : 'Look up'}
              </button>
            </form>
            {lookupErr && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f87171' }}>{lookupErr}</p>
            )}
          </div>

          {/* ── Found member card ── */}
          {found && (
            <div style={{
              borderRadius: 10, border: '0.5px solid rgba(184,150,12,0.4)',
              background: 'rgba(184,150,12,0.06)', padding: '14px 16px',
            }}>
              {found.already_manager && (
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '0.5px solid rgba(251,191,36,0.3)', borderRadius: 6, padding: '6px 10px' }}>
                  ⚠ This person is already a {found.already_manager.is_active ? 'active' : 'inactive'} manager.
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: found.gender === 'female' ? 'var(--avatar-female-bg)' : 'var(--avatar-male-bg)',
                  color: found.gender === 'female' ? 'var(--avatar-female-text)' : 'var(--avatar-male-text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {(found.name ?? found.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--admin-text)' }}>
                    {found.name ?? '(no name on profile)'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>{found.email}</p>
                </div>
                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                    background: found.current_plan === 'premium' ? 'var(--gold-muted)' : found.current_plan === 'plus' ? 'var(--status-info-bg)' : 'var(--admin-border)',
                    color: found.current_plan === 'premium' ? 'var(--gold)' : found.current_plan === 'plus' ? 'var(--status-info)' : 'var(--admin-muted)',
                  }}>
                    {found.current_plan.charAt(0).toUpperCase() + found.current_plan.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Manager details (shown after lookup) ── */}
          {found && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label style={LABEL_STYLE}>Full name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Fatima Ahmed"
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Contact number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="07xxx xxxxxx"
                  style={INPUT_STYLE}
                />
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ScopeChips label="Scope — cities"      value={cities}      onChange={setCities}      placeholder="e.g. London" />
                <ScopeChips label="Scope — genders"     value={genders}     onChange={setGenders}     placeholder="Male / Female / All" />
                <ScopeChips label="Scope — ethnicities" value={ethnicities} onChange={setEthnicities} placeholder="e.g. South Asian" />
                <ScopeChips label="Scope — languages"   value={languages}   onChange={setLanguages}   placeholder="e.g. Urdu" />
              </div>

              <div>
                <label style={LABEL_STYLE}>Notes (private)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes visible only to super admins"
                  style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 60 }}
                />
              </div>

              {/* Premium toggle */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                border: `0.5px solid ${grantPremium ? 'rgba(184,150,12,0.4)' : 'var(--admin-border)'}`,
                background: grantPremium ? 'rgba(184,150,12,0.06)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={grantPremium}
                  onChange={e => setGrantPremium(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#B8960C', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
                    Grant Premium access
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>
                    {found.current_plan === 'premium'
                      ? 'Already on Premium — no change needed.'
                      : 'Upgrades their membership to Premium at no charge.'}
                  </p>
                </div>
              </label>

              {err && (
                <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.25)', borderRadius: 7, padding: '8px 12px' }}>
                  {err}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset() }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 9, background: 'var(--admin-border)', border: '0.5px solid var(--admin-border)', color: 'var(--admin-muted)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !fullName.trim()}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: 9,
                    background: '#B8960C', color: '#111',
                    border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: loading || !fullName.trim() ? 'not-allowed' : 'pointer',
                    opacity: !fullName.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Creating…' : 'Create manager'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
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
        border: `0.5px solid var(--admin-border)`,
        opacity: manager.is_active ? 1 : 0.6,
      }}
    >
      {/* Card header — always visible */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ backgroundColor: 'var(--admin-surface)' }}
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
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--admin-text)' }}>{manager.full_name}</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(184,150,12,0.15)', color: '#B8960C' }}
            >
              {manager.role === 'senior_manager' ? 'Senior manager' : 'Manager'}
            </span>
            {!manager.is_active && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: 'var(--admin-surface)', border: '0.5px solid var(--admin-border)', color: 'var(--admin-muted)' }}
              >
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            {manager.email && (
              <span style={{ fontSize: 12, color: 'var(--admin-muted)' }}>{manager.email}</span>
            )}
            {manager.contact_number && (
              <span style={{ fontSize: 12, color: 'var(--admin-muted)' }}>{manager.contact_number}</span>
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
              backgroundColor: manager.is_active ? 'var(--admin-border)' : 'rgba(74,222,128,0.1)',
              border: `0.5px solid ${manager.is_active ? 'var(--admin-border)' : 'rgba(74,222,128,0.3)'}`,
              color: manager.is_active ? 'var(--admin-muted)' : '#4ade80',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {manager.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ border: '0.5px solid var(--admin-border)', color: 'var(--admin-text)' }}
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
          style={{ backgroundColor: 'var(--admin-bg)', borderTop: '0.5px solid var(--admin-border)' }}
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
              style={{ border: '0.5px solid var(--admin-border)', color: 'var(--admin-muted)' }}
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text)' }}>

      {/* ── Page header ── */}
      <div className="px-6 pt-8 pb-6 flex items-start justify-between gap-4" style={{ borderBottom: '0.5px solid var(--admin-border)' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--admin-text)', marginBottom: 4 }}>
            Managers
          </h1>
          <p style={{ fontSize: 14, color: 'var(--admin-muted)' }}>
            Super admin only. Managers are assigned matches based on their scope.
          </p>
        </div>
        <AddManagerForm onCreated={m => setManagers(prev => [m, ...prev])} />
      </div>

      <div className="px-6 py-8 flex flex-col gap-8 max-w-4xl">

        {/* Auto-assignment note */}
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(184,150,12,0.07)', border: '0.5px solid rgba(184,150,12,0.2)' }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: 13, color: 'var(--admin-muted)', lineHeight: 1.6 }}>
            Matches are auto-assigned to the manager whose scope best matches the profiles&apos; locations and genders.
            Super admin can override the assignment at any time from the Match Queue.
          </p>
        </div>

        {/* Active managers */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--admin-text)' }}>Active</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-muted)' }}
            >
              {active.length}
            </span>
          </div>

          {active.length === 0 ? (
            <div
              className="rounded-xl px-5 py-8 text-center"
              style={{ backgroundColor: 'var(--admin-surface)', border: '0.5px solid var(--admin-border)' }}
            >
              <p style={{ fontSize: 14, color: 'var(--admin-muted)' }}>
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
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--admin-muted)' }}>Inactive</h2>
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: 'var(--admin-surface)', border: '0.5px solid var(--admin-border)', color: 'var(--admin-muted)' }}
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
