'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountRow {
  id: string
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  plan: string
  status: string
  created_at: string
  updated_at: string
  primary_user_id: string | null
  last_active: string | null
  profiles: {
    id: string
    display_initials: string
    first_name: string | null
    last_name: string | null
    gender: string | null
    status: string | null
    age_display: string | null
    location: string | null
    duplicate_flag: boolean | null
  }[]
}

interface Props {
  accounts: AccountRow[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RELATIONSHIP_LABEL: Record<string, string> = {
  mother: 'Mother', father: 'Father', grandmother: 'Grandmother',
  aunt: 'Aunt', male_guardian: 'Guardian', female_guardian: 'Guardian',
  self: 'Self', candidate: 'Self',
}

const PLAN_LABEL: Record<string, string> = {
  voluntary: 'Free', free: 'Free', plus: 'Plus', premium: 'Premium',
}

const PROFILE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Review', approved: 'Approved', paused: 'Paused',
  rejected: 'Rejected', withdrawn: 'Withdrawn', suspended: 'Suspended',
  introduced: 'Introduced',
}

type AccountStatus = 'Active' | 'Invited' | 'Inactive'

function accountStatus(raw: string): AccountStatus {
  if (raw === 'active') return 'Active'
  if (raw === 'pending_email_verification' || raw === 'pending_contact_details') return 'Invited'
  return 'Inactive'
}

// ─── Theme helpers ─────────────────────────────────────────────────────────────

function getTheme(): boolean {
  try {
    const stored = localStorage.getItem('zawaaj-theme')
    if (stored === 'light') return false
    if (stored === 'dark') return true
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch { return true }
}

// Centralise all theme-derived colours so every component uses the same source
function themeColors(isDark: boolean) {
  return {
    text:       isDark ? 'rgba(255,255,255,0.88)' : '#1a1a1a',
    textMuted:  isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)',
    textDim:    isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.30)',
    cardBg:     isDark ? '#1a1a1a' : '#ffffff',
    subRowBg:   isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
    border:     isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    btnBorder:  isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    btnBg:      isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    inputBg:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const styles: Record<AccountStatus, React.CSSProperties> = {
    Active:   { background: 'rgba(34,197,94,0.12)',  color: '#4ade80',  border: '0.5px solid rgba(34,197,94,0.3)'  },
    Invited:  { background: 'rgba(96,165,250,0.12)', color: '#60a5fa',  border: '0.5px solid rgba(96,165,250,0.3)' },
    Inactive: { background: 'rgba(148,163,184,0.1)', color: '#94a3b8',  border: '0.5px solid rgba(148,163,184,0.2)' },
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' as const, ...styles[status] }}>
      {status}
    </span>
  )
}

function ProfileStatusBadge({ status }: { status: string | null }) {
  const s = status ?? ''
  const colors: Record<string, React.CSSProperties> = {
    pending:    { background: 'rgba(251,191,36,0.15)',  color: '#f59e0b',  border: '0.5px solid rgba(251,191,36,0.35)'  },
    approved:   { background: 'rgba(34,197,94,0.12)',   color: '#4ade80',  border: '0.5px solid rgba(34,197,94,0.3)'   },
    paused:     { background: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: '0.5px solid rgba(148,163,184,0.2)' },
    rejected:   { background: 'rgba(239,68,68,0.12)',   color: '#f87171',  border: '0.5px solid rgba(239,68,68,0.3)'   },
    withdrawn:  { background: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: '0.5px solid rgba(148,163,184,0.2)' },
    suspended:  { background: 'rgba(239,68,68,0.08)',   color: '#f87171',  border: '0.5px solid rgba(239,68,68,0.2)'   },
    introduced: { background: 'rgba(168,85,247,0.12)',  color: '#c084fc',  border: '0.5px solid rgba(168,85,247,0.3)'  },
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' as const, ...(colors[s] ?? colors.paused) }}>
      {PROFILE_STATUS_LABEL[s] ?? s}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const isPaid = plan === 'plus' || plan === 'premium'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
      background: isPaid ? 'rgba(184,150,12,0.12)' : 'rgba(148,163,184,0.1)',
      color: isPaid ? '#B8960C' : '#94a3b8',
      border: isPaid ? '0.5px solid rgba(184,150,12,0.3)' : '0.5px solid rgba(148,163,184,0.2)',
      whiteSpace: 'nowrap' as const,
    }}>
      {PLAN_LABEL[plan] ?? plan}
    </span>
  )
}

function GenderAvatar({ initials, gender }: { initials: string; gender: string | null }) {
  const bg  = gender === 'female' ? '#EEEDFE' : '#E6F1FB'
  const col = gender === 'female' ? '#534AB7' : '#185FA5'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%', fontSize: 10, fontWeight: 700,
      background: bg, color: col, flexShrink: 0,
    }}>
      {initials}
    </span>
  )
}

// ─── Candidate Row ────────────────────────────────────────────────────────────

function CandidateRow({
  profile,
  isDark,
  onStatusChange,
}: {
  profile: AccountRow['profiles'][number]
  isDark: boolean
  onStatusChange: (id: string, newStatus: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(profile.status)
  const [error, setError] = useState<string | null>(null)
  const c = themeColors(isDark)

  const updateStatus = (next: string) => {
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/admin/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setLocalStatus(next)
        onStatusChange(profile.id, next)
      } else {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Update failed')
      }
    })
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.display_initials
  const meta = [
    profile.gender ? (profile.gender === 'female' ? 'Female' : 'Male') : null,
    profile.age_display ?? null,
    profile.location ?? null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px 8px 44px',
      borderTop: `0.5px solid ${c.divider}`,
      background: c.subRowBg,
      flexWrap: 'wrap' as const,
    }}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 160px', minWidth: 0 }}>
        <GenderAvatar initials={profile.display_initials} gender={profile.gender} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: c.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {name}
          </div>
          {meta && (
            <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.3 }}>{meta}</div>
          )}
        </div>
      </div>

      {/* Status badge */}
      <ProfileStatusBadge status={localStatus} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' as const }}>
        {error && <span style={{ fontSize: 11, color: '#f87171' }}>{error}</span>}

        <Link
          href={`/admin/profile/${profile.id}`}
          style={{
            fontSize: 11, fontWeight: 500, color: c.textMuted, textDecoration: 'none',
            padding: '3px 8px', border: `0.5px solid ${c.btnBorder}`, borderRadius: 6,
          }}
        >
          View
        </Link>

        {localStatus === 'pending' && (
          <>
            <button onClick={() => updateStatus('approved')} disabled={isPending} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.3)', opacity: isPending ? 0.5 : 1 }}>
              Approve
            </button>
            <button onClick={() => updateStatus('rejected')} disabled={isPending} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '0.5px solid rgba(239,68,68,0.2)', opacity: isPending ? 0.5 : 1 }}>
              Reject
            </button>
          </>
        )}
        {localStatus === 'approved' && (
          <button onClick={() => updateStatus('paused')} disabled={isPending} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: c.btnBg, color: c.textMuted, border: `0.5px solid ${c.btnBorder}`, opacity: isPending ? 0.5 : 1 }}>
            Pause
          </button>
        )}
        {(localStatus === 'paused' || localStatus === 'rejected') && (
          <button onClick={() => updateStatus('approved')} disabled={isPending} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.3)', opacity: isPending ? 0.5 : 1 }}>
            Approve
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Account Row Card ─────────────────────────────────────────────────────────

function AccountRowCard({ account, isDark }: { account: AccountRow; isDark: boolean }) {
  const [expanded, setExpanded] = useState(account.profiles.some(p => p.status === 'pending'))
  const [profiles, setProfiles] = useState(account.profiles)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const c = themeColors(isDark)

  const handleProfileStatusChange = (id: string, newStatus: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  const handleDelete = async () => {
    if (!confirm(`Delete this family account?\n\nContact: ${account.contact_full_name}\n\nThis cannot be undone.`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/families/${account.id}`, { method: 'DELETE' })
      if (res.ok) { setDeleted(true) }
      else {
        const body = await res.json() as { error?: string }
        setDeleteError(body.error ?? 'Delete failed')
      }
    } catch { setDeleteError('Network error') }
    finally { setDeleting(false) }
  }

  if (deleted) return null

  const acctStatus = accountStatus(account.status)
  const pendingCount = profiles.filter(p => p.status === 'pending').length

  return (
    <div style={{
      border: `0.5px solid ${c.border}`,
      borderLeft: pendingCount > 0 ? '2px solid rgba(251,191,36,0.6)' : `0.5px solid ${c.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      background: c.cardBg,
    }}>
      {/* ── Main row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', flexWrap: 'wrap' as const }}>

        {/* Contact name + relationship */}
        <div style={{ flex: '1 1 180px', minWidth: 120 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {account.contact_full_name || '—'}
          </div>
          <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.3 }}>
            {RELATIONSHIP_LABEL[account.contact_relationship] ?? account.contact_relationship || '—'}
          </div>
        </div>

        {/* Email + phone */}
        <div style={{ flex: '1 1 160px', minWidth: 120 }}>
          {account.contact_email ? (
            <div style={{ fontSize: 11, color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {account.contact_email}
            </div>
          ) : null}
          {account.contact_number ? (
            <div style={{ fontSize: 11, color: c.textMuted }}>{account.contact_number}</div>
          ) : null}
          {!account.contact_email && !account.contact_number && (
            <div style={{ fontSize: 11, color: c.textDim }}>No contact info</div>
          )}
        </div>

        {/* Plan */}
        <div style={{ flexShrink: 0 }}>
          <PlanBadge plan={account.plan} />
        </div>

        {/* Status */}
        <div style={{ flexShrink: 0 }}>
          <AccountStatusBadge status={acctStatus} />
        </div>

        {/* Candidates expand button */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: c.btnBg, border: `0.5px solid ${c.btnBorder}`,
            borderRadius: 6, padding: '4px 10px', color: c.textMuted,
          }}
        >
          <span style={{ color: c.text }}>{profiles.length}</span>
          &nbsp;candidate{profiles.length !== 1 ? 's' : ''}
          {pendingCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#f59e0b', color: '#000', borderRadius: 10, padding: '1px 5px', lineHeight: '14px' }}>
              {pendingCount}
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: c.textDim, transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Last active */}
        <div style={{ flexShrink: 0, textAlign: 'right' as const, minWidth: 62 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: c.text }}>{fmtRelative(account.last_active)}</div>
          <div style={{ fontSize: 10, color: c.textDim }}>last active</div>
        </div>

        {/* Registered */}
        <div style={{ flexShrink: 0, textAlign: 'right' as const, minWidth: 64 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: c.text }}>{fmtDate(account.created_at)}</div>
          <div style={{ fontSize: 10, color: c.textDim }}>registered</div>
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete family account"
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.45)', padding: 4, opacity: deleting ? 0.4 : 1 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M5.5 6v4M8.5 6v4M3 3.5l.8 7.5a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.8-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {deleteError && (
        <div style={{ padding: '0 14px 8px', fontSize: 11, color: '#f87171' }}>{deleteError}</div>
      )}

      {/* Candidate sub-rows */}
      {expanded && profiles.map(p => (
        <CandidateRow key={p.id} profile={p} isDark={isDark} onStatusChange={handleProfileStatusChange} />
      ))}
      {expanded && profiles.length === 0 && (
        <div style={{ padding: '10px 44px', fontSize: 12, color: c.textMuted, borderTop: `0.5px solid ${c.divider}` }}>
          No candidate profiles yet
        </div>
      )}
    </div>
  )
}

// ─── AccountsClient ───────────────────────────────────────────────────────────

type FilterTab = 'all' | 'active' | 'invited' | 'inactive'

export function AccountsClient({ accounts }: Props) {
  const [tab, setTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setIsDark(getTheme())
  }, [])

  const statusForFilter = (a: AccountRow): FilterTab => {
    const s = accountStatus(a.status)
    if (s === 'Active')  return 'active'
    if (s === 'Invited') return 'invited'
    return 'inactive'
  }

  const counts = {
    all:      accounts.length,
    active:   accounts.filter(a => accountStatus(a.status) === 'Active').length,
    invited:  accounts.filter(a => accountStatus(a.status) === 'Invited').length,
    inactive: accounts.filter(a => accountStatus(a.status) === 'Inactive').length,
  }

  const candidateCount = accounts.reduce((n, a) => n + a.profiles.length, 0)
  const pendingCount   = accounts.reduce((n, a) => n + a.profiles.filter(p => p.status === 'pending').length, 0)

  const filtered = accounts.filter(a => {
    if (tab !== 'all' && statusForFilter(a) !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.contact_full_name.toLowerCase().includes(q) ||
        a.contact_email.toLowerCase().includes(q) ||
        (a.contact_number ?? '').includes(q)
      )
    }
    return true
  })

  const c = themeColors(isDark)
  const gold = '#B8960C'

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'active',   label: `Active (${counts.active})` },
    { key: 'invited',  label: `Invited (${counts.invited})` },
    { key: 'inactive', label: `Inactive (${counts.inactive})` },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: c.text }}>Accounts</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: c.textMuted }}>
              {counts.all} {counts.all === 1 ? 'family' : 'families'} · {candidateCount} candidate{candidateCount !== 1 ? 's' : ''}
              {pendingCount > 0 && (
                <span style={{ marginLeft: 10, background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>
                  {pendingCount} pending review
                </span>
              )}
            </p>
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 13,
              background: c.inputBg, border: `0.5px solid ${c.border}`,
              color: c.text, outline: 'none', width: 240,
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 18, borderBottom: `0.5px solid ${c.border}` }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? gold : c.textMuted,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? `2px solid ${gold}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center' as const, color: c.textMuted, fontSize: 13 }}>
              {search ? 'No accounts match your search.' : 'No accounts in this category.'}
            </div>
          )}
          {filtered.map(account => (
            <AccountRowCard key={account.id} account={account} isDark={isDark} />
          ))}
        </div>
    </div>
  )
}
