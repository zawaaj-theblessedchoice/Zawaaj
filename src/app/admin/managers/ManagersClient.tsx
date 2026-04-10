'use client'

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuperAdmin {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  status: string
  role: string
}

export interface Manager {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  status: string
  role: string
}

export interface ManagerScope {
  id: string
  manager_profile_id: string
  scope_type: 'geographic' | 'workflow' | 'user_segment' | 'all'
  scope_value: string
  created_at: string
}

type ScopeType = 'geographic' | 'workflow' | 'user_segment' | 'all'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function profileName(p: Pick<SuperAdmin, 'first_name' | 'last_name' | 'display_initials'>): string {
  if (!p.first_name && !p.last_name) return p.display_initials
  const last = p.last_name ? `${p.last_name[0]}.` : ''
  return [p.first_name, last].filter(Boolean).join(' ')
}

function avatarBg(gender: string | null): string {
  return gender === 'female' ? '#534AB7' : '#185FA5'
}

function avatarBgLight(gender: string | null): string {
  return gender === 'female' ? '#EEEDFE' : '#E6F1FB'
}

const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  geographic:    'Geographic',
  workflow:      'Workflow',
  user_segment:  'User segment',
  all:           'All',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 36 }: { profile: Pick<SuperAdmin, 'display_initials' | 'gender'>; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size < 32 ? 11 : 13,
        backgroundColor: avatarBg(profile.gender),
        color: avatarBgLight(profile.gender),
      }}
    >
      {profile.display_initials}
    </div>
  )
}

// ─── Scope badge ──────────────────────────────────────────────────────────────

function ScopeBadge({ scope }: { scope: ManagerScope }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        backgroundColor: 'rgba(184,150,12,0.12)',
        color: '#B8960C',
        border: '0.5px solid rgba(184,150,12,0.3)',
      }}
    >
      <span style={{ opacity: 0.7 }}>{SCOPE_TYPE_LABELS[scope.scope_type]}:</span>
      <span className="font-medium">{scope.scope_value}</span>
    </span>
  )
}

// ─── Inline assign-scope form ─────────────────────────────────────────────────

interface AssignScopeFormProps {
  managerId: string
  onAssigned: (scope: ManagerScope) => void
  onCancel: () => void
}

function AssignScopeForm({ managerId, onAssigned, onCancel }: AssignScopeFormProps) {
  const [scopeType, setScopeType] = useState<ScopeType>('geographic')
  const [scopeValue, setScopeValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scopeValue.trim()) {
      setError('Scope value is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: managerId,
          scope_type: scopeType,
          scope_value: scopeValue.trim(),
        }),
      })
      const json = await res.json() as { scope?: ManagerScope; error?: string }
      if (!res.ok || !json.scope) {
        setError(json.error ?? 'Failed to assign scope')
      } else {
        onAssigned(json.scope)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3 rounded-lg flex flex-col gap-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}
    >
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Assign scope
      </p>
      <div className="flex gap-2 flex-wrap">
        <select
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as ScopeType)}
          className="rounded-lg px-3 py-1.5 text-sm outline-none flex-shrink-0"
          style={{
            backgroundColor: '#1A1A1A',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'white',
          }}
        >
          <option value="geographic">Geographic</option>
          <option value="workflow">Workflow</option>
          <option value="user_segment">User segment</option>
          <option value="all">All</option>
        </select>
        <input
          type="text"
          value={scopeValue}
          onChange={(e) => setScopeValue(e.target.value)}
          placeholder={
            scopeType === 'geographic' ? 'e.g. London' :
            scopeType === 'workflow'   ? 'e.g. introductions' :
            scopeType === 'user_segment' ? 'e.g. events' : 'all'
          }
          className="rounded-lg px-3 py-1.5 text-sm outline-none flex-1 min-w-[140px]"
          style={{
            backgroundColor: '#1A1A1A',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'white',
          }}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: '#B8960C',
              color: '#111111',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>
      )}
    </form>
  )
}

// ─── Promote-to-manager form ───────────────────────────────────────────────────

interface PromoteFormProps {
  onPromoted: (manager: Manager, scope: ManagerScope) => void
}

function PromoteToManagerForm({ onPromoted }: PromoteFormProps) {
  const [profileId, setProfileId] = useState('')
  const [scopeType, setScopeType] = useState<ScopeType>('geographic')
  const [scopeValue, setScopeValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId.trim()) {
      setError('Profile ID is required')
      return
    }
    if (!scopeValue.trim()) {
      setError('Scope value is required')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId.trim(),
          scope_type: scopeType,
          scope_value: scopeValue.trim(),
        }),
      })
      const json = await res.json() as { manager?: Manager; scope?: ManagerScope; error?: string }
      if (!res.ok || !json.manager || !json.scope) {
        setError(json.error ?? 'Failed to promote profile')
      } else {
        onPromoted(json.manager, json.scope)
        setProfileId('')
        setScopeType('geographic')
        setScopeValue('')
        setSuccess(`Profile promoted to manager.`)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)' }}
    >
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 4 }}>
          Promote profile to manager
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Paste a profile UUID and assign an initial scope. The profile&apos;s role will be set to &apos;manager&apos;.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Profile ID */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="promote-profile-id"
            style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Profile ID (UUID)
          </label>
          <input
            id="promote-profile-id"
            type="text"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="rounded-lg px-3 py-2 text-sm outline-none font-mono"
            style={{
              backgroundColor: '#111111',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'white',
            }}
          />
        </div>

        {/* Scope type */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="promote-scope-type"
            style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Scope type
          </label>
          <select
            id="promote-scope-type"
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as ScopeType)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: '#111111',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'white',
            }}
          >
            <option value="geographic">Geographic</option>
            <option value="workflow">Workflow</option>
            <option value="user_segment">User segment</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Scope value */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="promote-scope-value"
            style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Scope value
          </label>
          <input
            id="promote-scope-value"
            type="text"
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
            placeholder={
              scopeType === 'geographic' ? 'e.g. London' :
              scopeType === 'workflow'   ? 'e.g. introductions' :
              scopeType === 'user_segment' ? 'e.g. events' : 'all'
            }
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: '#111111',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'white',
            }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#f87171' }}>{error}</p>
        )}
        {success && (
          <p style={{ fontSize: 13, color: '#4ade80' }}>{success}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: '#B8960C',
            color: '#111111',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Promoting…' : 'Promote to manager'}
        </button>
      </form>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  superAdmins: SuperAdmin[]
  managers: Manager[]
  scopes: ManagerScope[]
}

export default function ManagersClient({ superAdmins: initialSuperAdmins, managers: initialManagers, scopes: initialScopes }: Props) {
  const [managers, setManagers] = useState<Manager[]>(initialManagers)
  const [scopes, setScopes] = useState<ManagerScope[]>(initialScopes)

  // Track which manager row has the assign-scope form open
  const [assigningFor, setAssigningFor] = useState<string | null>(null)

  // Per-row revoke loading + error state
  const [revoking, setRevoking] = useState<Record<string, boolean>>({})
  const [revokeError, setRevokeError] = useState<Record<string, string>>({})

  // ─── Revoke manager ─────────────────────────────────────────────────────────
  async function handleRevoke(profileId: string) {
    setRevoking((prev) => ({ ...prev, [profileId]: true }))
    setRevokeError((prev) => ({ ...prev, [profileId]: '' }))
    try {
      const res = await fetch(`/api/admin/managers/${profileId}`, { method: 'DELETE' })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setRevokeError((prev) => ({ ...prev, [profileId]: json.error ?? 'Failed to revoke' }))
      } else {
        setManagers((prev) => prev.filter((m) => m.id !== profileId))
        setScopes((prev) => prev.filter((s) => s.manager_profile_id !== profileId))
      }
    } catch {
      setRevokeError((prev) => ({ ...prev, [profileId]: 'Network error' }))
    } finally {
      setRevoking((prev) => ({ ...prev, [profileId]: false }))
    }
  }

  // ─── Scope assigned callback ────────────────────────────────────────────────
  function handleScopeAssigned(scope: ManagerScope) {
    setScopes((prev) => [...prev, scope])
    setAssigningFor(null)
  }

  // ─── Manager promoted callback ──────────────────────────────────────────────
  function handlePromoted(manager: Manager, scope: ManagerScope) {
    setManagers((prev) => [...prev, manager])
    setScopes((prev) => [...prev, scope])
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111', color: 'white' }}>

      {/* ── Top nav ── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}
      >
        <ZawaajLogo size={32} tagline={false} />
        <Link
          href="/admin"
          className="text-sm"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* ── Page header ── */}
      <div className="px-6 pt-8 pb-6" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 4 }}>
          Managers
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
          Manage super admins and scoped managers. Super admin promotion is done via SQL.
        </p>
      </div>

      <div className="px-6 py-8 flex flex-col gap-10 max-w-4xl">

        {/* ── A. Super Admins ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
              Super admins
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              {initialSuperAdmins.length}
            </span>
          </div>

          {/* Lockout warning */}
          {initialSuperAdmins.length < 2 && (
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>
                There must be at least 2 Super Admins to prevent lockout. Add another Super Admin immediately.
              </p>
            </div>
          )}

          {/* Super admin cards */}
          {initialSuperAdmins.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No super admins found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {initialSuperAdmins.map((sa) => (
                <div
                  key={sa.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)' }}
                >
                  <Avatar profile={sa} size={38} />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>
                      {profileName(sa)}
                    </span>
                    <span
                      className="font-mono text-xs truncate"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {sa.id}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{ backgroundColor: 'rgba(184,150,12,0.15)', color: '#B8960C' }}
                  >
                    super_admin
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* SQL snippet for promotion */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ backgroundColor: '#0d0d0d', border: '0.5px solid rgba(255,255,255,0.08)' }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Promote via SQL (run in Supabase SQL editor)
            </p>
            <pre
              className="text-xs overflow-x-auto"
              style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'ui-monospace, monospace', lineHeight: 1.7 }}
            >
{`UPDATE zawaaj_profiles
SET role = 'super_admin', status = 'approved'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);`}
            </pre>
          </div>
        </section>

        {/* ── B. Managers ─────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
              Managers
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              {managers.length}
            </span>
          </div>

          {managers.length === 0 ? (
            <div
              className="rounded-xl px-5 py-8 text-center"
              style={{ backgroundColor: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)' }}
            >
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                No managers yet. Use the form below to promote a profile.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '0.5px solid rgba(255,255,255,0.1)' }}
            >
              {/* Table header */}
              <div
                className="grid px-4 py-2.5"
                style={{
                  gridTemplateColumns: '1fr 1fr auto',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                }}
              >
                {['Name', 'Scopes', 'Actions'].map((col) => (
                  <span
                    key={col}
                    style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' }}
                  >
                    {col}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {managers.map((manager, idx) => {
                const managerScopes = scopes.filter((s) => s.manager_profile_id === manager.id)
                const isLast = idx === managers.length - 1
                const isRevoking = revoking[manager.id] ?? false
                const rowRevokeError = revokeError[manager.id]

                return (
                  <div key={manager.id}>
                    <div
                      className="px-4 py-3 flex flex-col gap-2"
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#111111' : '#1A1A1A',
                        borderBottom: isLast && !assigningFor ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        className="grid items-start"
                        style={{ gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}
                      >
                        {/* Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar profile={manager} size={30} />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>
                              {profileName(manager)}
                            </span>
                            <span
                              className="font-mono text-xs truncate"
                              style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                            >
                              {manager.id}
                            </span>
                          </div>
                        </div>

                        {/* Scopes */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {managerScopes.length === 0 ? (
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No scopes</span>
                          ) : (
                            managerScopes.map((s) => <ScopeBadge key={s.id} scope={s} />)
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setAssigningFor(assigningFor === manager.id ? null : manager.id)}
                            className="px-3 py-1.5 rounded-lg text-xs"
                            style={{
                              border: '0.5px solid rgba(255,255,255,0.15)',
                              color: 'rgba(255,255,255,0.7)',
                            }}
                          >
                            {assigningFor === manager.id ? 'Cancel' : '+ Assign scope'}
                          </button>
                          <button
                            onClick={() => handleRevoke(manager.id)}
                            disabled={isRevoking}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: 'rgba(239,68,68,0.1)',
                              border: '0.5px solid rgba(239,68,68,0.3)',
                              color: '#f87171',
                              opacity: isRevoking ? 0.6 : 1,
                            }}
                          >
                            {isRevoking ? 'Revoking…' : 'Revoke'}
                          </button>
                        </div>
                      </div>

                      {/* Inline error */}
                      {rowRevokeError && (
                        <p style={{ fontSize: 12, color: '#f87171' }}>{rowRevokeError}</p>
                      )}

                      {/* Inline assign-scope form */}
                      {assigningFor === manager.id && (
                        <AssignScopeForm
                          managerId={manager.id}
                          onAssigned={handleScopeAssigned}
                          onCancel={() => setAssigningFor(null)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── C. Promote to manager form ───────────────────────────────────────── */}
        <section>
          <PromoteToManagerForm onPromoted={handlePromoted} />
        </section>

      </div>
    </div>
  )
}
