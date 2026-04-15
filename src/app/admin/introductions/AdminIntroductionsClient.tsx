'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntroRequest {
  id: string
  requesting_profile: {
    id: string
    display_initials: string
    first_name: string | null
    last_name: string | null
    gender: string | null
  }
  target_profile: {
    id: string
    display_initials: string
    first_name: string | null
    last_name: string | null
    gender: string | null
  }
  status: string
  created_at: string
  expires_at: string | null
  mutual_at: string | null
  responded_at: string | null
  assigned_manager_id: string | null
  handled_by: string | null
  handled_at: string | null
  admin_notes: string | null
}

export interface ManagerProfile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
}

export interface AdminIntroductionsClientProps {
  requests: IntroRequest[]
  managers: ManagerProfile[]
  role: 'super_admin' | 'manager'
}

type FilterTab = 'pending' | 'mutual' | 'active' | 'facilitated' | 'completed' | 'declined'

const VALID_STATUSES = [
  'pending',
  'responded_positive',
  'responded_negative',
  'mutual_confirmed',
  'admin_pending',
  'admin_assigned',
  'admin_in_progress',
  'admin_completed',
  'expired',
  'withdrawn',
] as const

type ValidStatus = typeof VALID_STATUSES[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function profileName(p: IntroRequest['requesting_profile']): string {
  if (!p.first_name && !p.last_name) return p.display_initials
  const last = p.last_name ? `${p.last_name[0]}.` : ''
  return [p.first_name, last].filter(Boolean).join(' ')
}

function managerName(m: ManagerProfile): string {
  if (!m.first_name && !m.last_name) return m.display_initials
  const last = m.last_name ? `${m.last_name[0]}.` : ''
  return [m.first_name, last].filter(Boolean).join(' ')
}

function avatarTextColor(gender: string | null): string {
  return gender === 'female' ? '#534AB7' : '#185FA5'
}

function avatarBgColor(gender: string | null): string {
  return gender === 'female' ? '#EEEDFE' : '#E6F1FB'
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending:            'Pending',
    accepted:           'Mutual — ready to facilitate',
    facilitated:        'Contacts shared',
    responded_positive: 'Responded +',
    responded_negative: 'Declined',
    declined:           'Declined',
    mutual_confirmed:   'Mutual',
    admin_pending:      'Admin Pending',
    admin_assigned:     'Assigned',
    admin_in_progress:  'In Progress',
    admin_completed:    'Completed',
    expired:            'Expired',
    withdrawn:          'Withdrawn',
  }
  return labels[status] ?? status
}

function statusColors(status: string): { bg: string; color: string } {
  switch (status) {
    case 'pending':            return { bg: '#1e1e1e', color: '#9ca3af' }
    case 'accepted':           return { bg: '#2a200a', color: '#B8960C' }
    case 'facilitated':        return { bg: '#052e16', color: '#4ade80' }
    case 'responded_positive': return { bg: '#052e16', color: '#4ade80' }
    case 'responded_negative':
    case 'declined':           return { bg: '#2d1515', color: '#f87171' }
    case 'mutual_confirmed':   return { bg: '#2a200a', color: '#B8960C' }
    case 'admin_pending':      return { bg: '#1e1e2e', color: '#a5b4fc' }
    case 'admin_assigned':     return { bg: '#0f2a3f', color: '#60a5fa' }
    case 'admin_in_progress':  return { bg: '#1a2000', color: '#a3e635' }
    case 'admin_completed':    return { bg: '#052e16', color: '#4ade80' }
    case 'expired':            return { bg: '#1c1c1c', color: '#6b7280' }
    case 'withdrawn':          return { bg: '#1c1c1c', color: '#6b7280' }
    default:                   return { bg: '#1e1e1e', color: '#9ca3af' }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProfileCell({ profile }: { profile: IntroRequest['requesting_profile'] }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          backgroundColor: avatarBgColor(profile.gender),
          color: avatarTextColor(profile.gender),
        }}
      >
        {profile.display_initials}
      </div>
      <span className="text-sm truncate" style={{ color: 'var(--admin-text)' }}>
        {profileName(profile)}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { bg, color } = statusColors(status)
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {statusLabel(status)}
    </span>
  )
}

// ─── Assign Manager inline UI ─────────────────────────────────────────────────

interface AssignManagerDropdownProps {
  reqId: string
  managers: ManagerProfile[]
  currentAssignedId: string | null
  loading: boolean
  onAssign: (reqId: string, managerId: string) => void
}

function AssignManagerDropdown({
  reqId,
  managers,
  currentAssignedId,
  loading,
  onAssign,
}: AssignManagerDropdownProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
        style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
      >
        {currentAssignedId ? 'Reassign' : 'Assign manager'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        autoFocus
        className="text-xs rounded px-2 py-1 outline-none"
        style={{ background: 'var(--admin-surface)', border: '0.5px solid var(--admin-border)', color: 'var(--admin-text)' }}
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            onAssign(reqId, e.target.value)
            setOpen(false)
          }
        }}
        onBlur={() => setOpen(false)}
      >
        <option value="" disabled>Select manager…</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>{managerName(m)}</option>
        ))}
      </select>
      <button
        onClick={() => setOpen(false)}
        className="text-xs" style={{ color: 'var(--admin-muted)' }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Override Status dropdown (super_admin only) ──────────────────────────────

interface OverrideStatusDropdownProps {
  reqId: string
  currentStatus: string
  loading: boolean
  onOverride: (reqId: string, status: ValidStatus) => void
}

function OverrideStatusDropdown({ reqId, currentStatus, loading, onOverride }: OverrideStatusDropdownProps) {
  return (
    <select
      disabled={loading}
      value={currentStatus}
      onChange={(e) => {
        const val = e.target.value as ValidStatus
        onOverride(reqId, val)
      }}
      className="text-xs rounded px-2 py-1 outline-none disabled:opacity-50"
      style={{ background: 'var(--admin-surface)', border: '0.5px solid var(--admin-border)', color: 'var(--admin-muted)' }}
    >
      {VALID_STATUSES.map((s) => (
        <option key={s} value={s}>{statusLabel(s)}</option>
      ))}
    </select>
  )
}

// ─── Request row ──────────────────────────────────────────────────────────────

interface RequestRowProps {
  req: IntroRequest
  managers: ManagerProfile[]
  role: 'super_admin' | 'manager'
  loadingIds: Set<string>
  errors: Map<string, string>
  onAssignManager: (reqId: string, managerId: string) => void
  onSetInProgress: (reqId: string) => void
  onComplete: (reqId: string) => void
  onOverrideStatus: (reqId: string, status: ValidStatus) => void
  onFacilitate: (reqId: string, adminMessage?: string) => void
  onRecordOutcome: (reqId: string, outcome: string) => void
  isLast: boolean
}

const OUTCOMES = [
  { value: 'in_conversation',   label: 'In conversation' },
  { value: 'meeting_arranged',  label: 'Meeting arranged' },
  { value: 'engaged',           label: 'Engaged' },
  { value: 'married',           label: 'Married — alhamdulillah' },
  { value: 'unsuccessful',      label: 'Unsuccessful' },
  { value: 'withdrawn',         label: 'Withdrawn' },
]

function RequestRow({
  req,
  managers,
  role,
  loadingIds,
  errors,
  onAssignManager,
  onSetInProgress,
  onComplete,
  onOverrideStatus,
  onFacilitate,
  onRecordOutcome,
  isLast,
}: RequestRowProps) {
  const loading = loadingIds.has(req.id)
  const rowError = errors.get(req.id)
  const [facilMessage, setFacilMessage] = useState('')
  const [showFacilNote, setShowFacilNote] = useState(false)

  const assignedManager = req.assigned_manager_id
    ? managers.find((m) => m.id === req.assigned_manager_id)
    : null

  const canAssign =
    role === 'super_admin' &&
    (req.status === 'mutual_confirmed' || req.status === 'admin_pending')

  const canSetInProgress =
    req.status === 'admin_assigned' &&
    (role === 'super_admin' || req.assigned_manager_id === req.assigned_manager_id) // manager scope enforced at API

  const canComplete = req.status === 'admin_in_progress'
  const canFacilitate = req.status === 'accepted'
  const canRecordOutcome = req.status === 'facilitated'

  return (
    <>
      <tr
        style={{
          borderBottom: isLast && !rowError ? 'none' : '0.5px solid var(--admin-border)',
        }}
      >
        {/* From */}
        <td className="px-4 py-3">
          <ProfileCell profile={req.requesting_profile} />
        </td>

        {/* To */}
        <td className="px-4 py-3">
          <ProfileCell profile={req.target_profile} />
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={req.status} />
        </td>

        {/* Requested */}
        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
          {fmtDate(req.created_at)}
        </td>

        {/* Mutual at */}
        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
          {fmtDate(req.mutual_at)}
        </td>

        {/* Assigned (super_admin only) */}
        {role === 'super_admin' && (
          <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
            {assignedManager ? (
              <span style={{ color: 'var(--admin-text)' }}>{managerName(assignedManager)}</span>
            ) : (
              <span style={{ color: 'var(--admin-muted)', opacity: 0.5 }}>—</span>
            )}
          </td>
        )}

        {/* handled_by / handled_at (super_admin only) */}
        {role === 'super_admin' && (
          <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
            {req.handled_at ? (
              <span title={req.handled_by ?? undefined}>{fmtDate(req.handled_at)}</span>
            ) : (
              <span style={{ color: 'var(--admin-muted)', opacity: 0.5 }}>—</span>
            )}
          </td>
        )}

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Assign manager button (mutual_confirmed or admin_pending, super_admin only) */}
            {canAssign && (
              <AssignManagerDropdown
                reqId={req.id}
                managers={managers}
                currentAssignedId={req.assigned_manager_id}
                loading={loading}
                onAssign={onAssignManager}
              />
            )}

            {/* Mark in progress (admin_assigned) */}
            {canSetInProgress && (
              <button
                onClick={() => onSetInProgress(req.id)}
                disabled={loading}
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#0f2a3f] text-[#60a5fa] border border-[#60a5fa]/20 hover:bg-[#1a3d56] transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Mark in progress'}
              </button>
            )}

            {/* Mark complete (admin_in_progress) */}
            {canComplete && (
              <button
                onClick={() => onComplete(req.id)}
                disabled={loading}
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#052e16] text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#0a4a25] transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Mark complete'}
              </button>
            )}

            {/* Override status dropdown (super_admin only) */}
            {role === 'super_admin' && (
              <OverrideStatusDropdown
                reqId={req.id}
                currentStatus={req.status}
                loading={loading}
                onOverride={onOverrideStatus}
              />
            )}

            {/* ── SHARE CONTACTS — primary action for 'accepted' status ── */}
            {canFacilitate && !showFacilNote && (
              <button
                onClick={() => setShowFacilNote(true)}
                disabled={loading}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                style={{ background: 'rgba(184,150,12,0.15)', color: '#B8960C', border: '1px solid rgba(184,150,12,0.35)' }}
              >
                ✉ Share contacts
              </button>
            )}

            {/* ── Record outcome — for facilitated requests ── */}
            {canRecordOutcome && (
              <select
                defaultValue=""
                disabled={loading}
                onChange={e => { if (e.target.value) onRecordOutcome(req.id, e.target.value) }}
                className="text-xs rounded px-2 py-1 outline-none disabled:opacity-50"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', cursor: 'pointer' }}
              >
                <option value="">Record outcome…</option>
                {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}

            {/* View profiles link */}
            <Link
              href={`/admin/sidebyside/${req.requesting_profile.id}__${req.target_profile.id}`}
              className="px-2.5 py-1 rounded text-xs transition-colors"
              style={{ color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}
            >
              View profiles
            </Link>
          </div>

          {/* ── Inline facilitation note panel ── */}
          {showFacilNote && (
            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(184,150,12,0.3)', background: 'rgba(184,150,12,0.06)' }}>
              <p style={{ fontSize: 11, color: '#B8960C', marginBottom: 6, fontWeight: 500 }}>
                This will send contact details to both families. Add an optional personal message:
              </p>
              <input
                type="text"
                value={facilMessage}
                onChange={e => setFacilMessage(e.target.value)}
                placeholder="e.g. Please be in touch by the end of the week, insha'Allah."
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(184,150,12,0.25)', background: '#111', color: '#e5e7eb', fontSize: 12, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { onFacilitate(req.id, facilMessage || undefined); setShowFacilNote(false) }}
                  disabled={loading}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#B8960C', color: '#111', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Sending…' : 'Send & share contacts'}
                </button>
                <button
                  onClick={() => setShowFacilNote(false)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-muted)', fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </td>
      </tr>

      {/* Inline error row */}
      {rowError && (
        <tr style={{ borderBottom: isLast ? 'none' : '0.5px solid var(--admin-border)' }}>
          <td
            colSpan={role === 'super_admin' ? 8 : 6}
            className="px-4 pb-3 text-xs"
            style={{ color: '#f87171' }}
          >
            {rowError}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminIntroductionsClient({
  requests: initialRequests,
  managers,
  role,
}: AdminIntroductionsClientProps) {
  const [requests, setRequests] = useState<IntroRequest[]>(initialRequests)
  const [filter, setFilter] = useState<FilterTab>('mutual')
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  // ─── Tab filtering ────────────────────────────────────────────────────────

  const tabDefs: { key: FilterTab; label: string; statuses: string[] }[] = [
    { key: 'pending',    label: 'Pending',           statuses: ['pending'] },
    { key: 'mutual',     label: 'Mutual ✦',          statuses: ['accepted', 'mutual_confirmed', 'admin_pending'] },
    { key: 'facilitated',label: 'Facilitated',       statuses: ['facilitated', 'admin_in_progress', 'admin_completed'] },
    { key: 'active',     label: 'Legacy active',     statuses: ['admin_assigned'] },
    { key: 'completed',  label: 'Completed',         statuses: [] },
    { key: 'declined',   label: 'Declined / Expired', statuses: ['declined', 'responded_negative', 'expired', 'withdrawn'] },
  ]

  const filtered = requests.filter((r) => {
    const tab = tabDefs.find((t) => t.key === filter)
    return tab ? tab.statuses.includes(r.status) : false
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function setRowLoading(id: string, val: boolean) {
    setLoadingIds((prev) => {
      const next = new Set(prev)
      if (val) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setRowError(id: string, msg: string | null) {
    setErrors((prev) => {
      const next = new Map(prev)
      if (msg === null) next.delete(id)
      else next.set(id, msg)
      return next
    })
  }

  function applyUpdate(id: string, patch: Partial<IntroRequest>) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  async function callApi(
    reqId: string,
    body: Record<string, string | undefined>
  ): Promise<boolean> {
    setRowLoading(reqId, true)
    setRowError(reqId, null)
    try {
      const res = await fetch(`/api/admin/introductions/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setRowError(reqId, json.error ?? 'Something went wrong')
        return false
      }
      return true
    } catch {
      setRowError(reqId, 'Network error — please try again')
      return false
    } finally {
      setRowLoading(reqId, false)
    }
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  async function handleAssignManager(reqId: string, managerId: string) {
    const ok = await callApi(reqId, { action: 'assign_manager', manager_profile_id: managerId })
    if (ok) {
      applyUpdate(reqId, {
        status: 'admin_assigned',
        assigned_manager_id: managerId,
        handled_at: new Date().toISOString(),
      })
    }
  }

  async function handleSetInProgress(reqId: string) {
    const ok = await callApi(reqId, { action: 'set_in_progress' })
    if (ok) {
      applyUpdate(reqId, {
        status: 'admin_in_progress',
        handled_at: new Date().toISOString(),
      })
    }
  }

  async function handleComplete(reqId: string) {
    const ok = await callApi(reqId, { action: 'complete' })
    if (ok) {
      applyUpdate(reqId, {
        status: 'admin_completed',
        handled_at: new Date().toISOString(),
      })
    }
  }

  async function handleFacilitate(reqId: string, adminMessage?: string) {
    const body: Record<string, string | undefined> = { action: 'facilitate' }
    if (adminMessage) body.admin_message = adminMessage
    const ok = await callApi(reqId, body)
    if (ok) {
      applyUpdate(reqId, {
        status: 'facilitated',
        handled_at: new Date().toISOString(),
      })
    }
  }

  async function handleRecordOutcome(reqId: string, outcome: string) {
    const ok = await callApi(reqId, { action: 'record_outcome', outcome })
    if (ok) {
      applyUpdate(reqId, { admin_notes: `Outcome: ${outcome}` })
    }
  }

  async function handleOverrideStatus(reqId: string, status: ValidStatus) {
    const ok = await callApi(reqId, { action: 'override_status', status })
    if (ok) {
      applyUpdate(reqId, {
        status,
        handled_at: new Date().toISOString(),
      })
    }
  }

  // ─── Columns ──────────────────────────────────────────────────────────────

  const baseColumns = ['From', 'To', 'Status', 'Requested', 'Mutual at']
  const superAdminColumns = role === 'super_admin' ? ['Assigned to', 'Handled at'] : []
  const columns = [...baseColumns, ...superAdminColumns, 'Actions']

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>

      {/* Page header */}
      <div className="px-6 pt-8 pb-0" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Introductions</h1>
          {role === 'super_admin' && (
            <span className="text-xs px-2 py-1 rounded-full bg-[#B8960C]/10 text-[#B8960C] border border-[#B8960C]/20">
              Super Admin
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0.5">
          {tabDefs.map(({ key, label, statuses }) => {
            const count = requests.filter((r) => statuses.includes(r.status)).length
            const isActive = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-4 py-2 text-sm rounded-t-lg flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--admin-surface)' : 'transparent',
                  color: isActive ? 'var(--admin-text)' : 'var(--admin-muted)',
                  borderBottom: isActive ? '2px solid #B8960C' : '2px solid transparent',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs min-w-[20px] text-center"
                  style={{
                    backgroundColor: 'var(--admin-border)',
                    color: isActive ? 'var(--admin-text)' : 'var(--admin-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>
            No introduction requests in this category.
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--admin-border)' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--admin-surface)' }}>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--admin-muted)', borderBottom: '1px solid var(--admin-border)' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, idx) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    managers={managers}
                    role={role}
                    loadingIds={loadingIds}
                    errors={errors}
                    onAssignManager={handleAssignManager}
                    onSetInProgress={handleSetInProgress}
                    onComplete={handleComplete}
                    onOverrideStatus={handleOverrideStatus}
                    onFacilitate={handleFacilitate}
                    onRecordOutcome={handleRecordOutcome}
                    isLast={idx === filtered.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
