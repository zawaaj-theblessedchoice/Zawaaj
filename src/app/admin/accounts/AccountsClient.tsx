'use client'

import { useState, useEffect, useTransition } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      whiteSpace: 'nowrap' as const, ...styles[status],
    }}>
      {status}
    </span>
  )
}

function ProfileStatusBadge({ status }: { status: string | null }) {
  const s = status ?? ''
  const colors: Record<string, React.CSSProperties> = {
    pending:    { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24',  border: '0.5px solid rgba(251,191,36,0.3)'  },
    approved:   { background: 'rgba(34,197,94,0.12)',   color: '#4ade80',  border: '0.5px solid rgba(34,197,94,0.3)'   },
    paused:     { background: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: '0.5px solid rgba(148,163,184,0.2)' },
    rejected:   { background: 'rgba(239,68,68,0.12)',   color: '#f87171',  border: '0.5px solid rgba(239,68,68,0.3)'   },
    withdrawn:  { background: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: '0.5px solid rgba(148,163,184,0.2)' },
    suspended:  { background: 'rgba(239,68,68,0.08)',   color: '#f87171',  border: '0.5px solid rgba(239,68,68,0.2)'   },
    introduced: { background: 'rgba(168,85,247,0.12)',  color: '#c084fc',  border: '0.5px solid rgba(168,85,247,0.3)'  },
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      whiteSpace: 'nowrap' as const, ...(colors[s] ?? colors.paused),
    }}>
      {PROFILE_STATUS_LABEL[s] ?? s}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const isPaid = plan === 'plus' || plan === 'premium'
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
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
  const bg   = gender === 'female' ? '#EEEDFE' : '#E6F1FB'
  const col  = gender === 'female' ? '#534AB7' : '#185FA5'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: '50%', fontSize: 10, fontWeight: 700,
      background: bg, color: col, flexShrink: 0,
    }}>
      {initials}
    </span>
  )
}

// ─── Candidate Row ────────────────────────────────────────────────────────────

function CandidateRow({
  profile,
  onStatusChange,
}: {
  profile: AccountRow['profiles'][number]
  onStatusChange: (id: string, newStatus: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(profile.status)
  const [error, setError] = useState<string | null>(null)

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
      padding: '8px 16px 8px 48px',
      borderTop: '0.5px solid rgba(255,255,255,0.05)',
      background: 'rgba(255,255,255,0.015)',
      flexWrap: 'wrap' as const,
    }}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 180px', minWidth: 0 }}>
        <GenderAvatar initials={profile.display_initials} gender={profile.gender} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--admin-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {name}
          </div>
          {meta && (
            <div style={{ fontSize: 11, color: 'var(--admin-muted)', lineHeight: 1.3 }}>{meta}</div>
          )}
        </div>
      </div>

      {/* Status badge */}
      <ProfileStatusBadge status={localStatus} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        {error && <span style={{ fontSize: 11, color: '#f87171' }}>{error}</span>}

        <Link
          href={`/admin/profile/${profile.id}`}
          style={{ fontSize: 11, color: 'var(--admin-muted)', textDecoration: 'none', padding: '3px 8px', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
        >
          View
        </Link>

        {localStatus === 'pending' && (
          <>
            <button
              onClick={() => updateStatus('approved')}
              disabled={isPending}
              style={{
                fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.3)',
                opacity: isPending ? 0.5 : 1,
              }}
            >
              Approve
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={isPending}
              style={{
                fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '0.5px solid rgba(239,68,68,0.2)',
                opacity: isPending ? 0.5 : 1,
              }}
            >
              Reject
            </button>
          </>
        )}

        {localStatus === 'approved' && (
          <button
            onClick={() => updateStatus('paused')}
            disabled={isPending}
            style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: '0.5px solid rgba(148,163,184,0.2)',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Pause
          </button>
        )}

        {(localStatus === 'paused' || localStatus === 'rejected') && (
          <button
            onClick={() => updateStatus('approved')}
            disabled={isPending}
            style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.3)',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Approve
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Account Row ──────────────────────────────────────────────────────────────

function AccountRowCard({ account, isDark }: { account: AccountRow; isDark: boolean }) {
  const [expanded, setExpanded] = useState(account.profiles.some(p => p.status === 'pending'))
  const [profiles, setProfiles] = useState(account.profiles)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  const handleProfileStatusChange = (id: string, newStatus: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  const handleDelete = async () => {
    if (!confirm(`Delete this family account?\n\nContact: ${account.contact_full_name}\n\nThis cannot be undone.`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/families/${account.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleted(true)
      } else {
        const body = await res.json() as { error?: string }
        setDeleteError(body.error ?? 'Delete failed')
      }
    } catch {
      setDeleteError('Network error')
    } finally {
      setDeleting(false)
    }
  }

  if (deleted) return null

  const acctStatus = accountStatus(account.status)
  const pendingCount = profiles.filter(p => p.status === 'pending').length
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{
      border: `0.5px solid ${border}`,
      borderRadius: 10,
      overflow: 'hidden',
      background: isDark ? '#161616' : '#ffffff',
    }}>
      {/* Main row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', flexWrap: 'wrap' as const,
      }}>

        {/* Contact info */}
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {account.contact_full_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--admin-muted)', lineHeight: 1.3 }}>
            {RELATIONSHIP_LABEL[account.contact_relationship] ?? account.contact_relationship}
          </div>
        </div>

        {/* Email / phone */}
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          {account.contact_email && (
            <div style={{ fontSize: 11, color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {account.contact_email}
            </div>
          )}
          {account.contact_number && (
            <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>{account.contact_number}</div>
          )}
        </div>

        {/* Plan */}
        <div style={{ flexShrink: 0 }}>
          <PlanBadge plan={account.plan} />
        </div>

        {/* Account status */}
        <div style={{ flexShrink: 0 }}>
          <AccountStatusBadge status={acctStatus} />
        </div>

        {/* Candidates toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '4px 10px', color: 'var(--admin-muted)',
            transition: 'background 0.15s',
          }}
        >
          {profiles.length} candidate{profiles.length !== 1 ? 's' : ''}
          {pendingCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, background: '#fbbf24', color: '#000',
              borderRadius: 10, padding: '0 5px', lineHeight: '16px',
            }}>
              {pendingCount}
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Last active */}
        <div style={{ flexShrink: 0, minWidth: 60, textAlign: 'right' as const }}>
          <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
            {fmtRelative(account.last_active)}
          </div>
          <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }}>last active</div>
        </div>

        {/* Registered */}
        <div style={{ flexShrink: 0, minWidth: 70, textAlign: 'right' as const }}>
          <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
            {fmtDate(account.created_at)}
          </div>
          <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }}>registered</div>
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete family account"
          style={{
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.5)',
            padding: 4, opacity: deleting ? 0.4 : 1, transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M5.5 6v4M8.5 6v4M3 3.5l.8 7.5a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.8-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {deleteError && (
        <div style={{ padding: '4px 16px 8px', fontSize: 11, color: '#f87171' }}>{deleteError}</div>
      )}

      {/* Candidate sub-rows */}
      {expanded && profiles.length > 0 && (
        <div>
          {profiles.map(p => (
            <CandidateRow
              key={p.id}
              profile={p}
              onStatusChange={handleProfileStatusChange}
            />
          ))}
        </div>
      )}

      {expanded && profiles.length === 0 && (
        <div style={{ padding: '10px 48px', fontSize: 12, color: 'var(--admin-muted)', borderTop: `0.5px solid rgba(255,255,255,0.05)` }}>
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
    try {
      const stored = localStorage.getItem('zawaaj-theme')
      if (stored === 'light') { setIsDark(false); return }
      if (stored === 'dark') { setIsDark(true); return }
      // system preference
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    } catch { /* ignore */ }
  }, [])

  const statusForFilter = (a: AccountRow): FilterTab => {
    const s = accountStatus(a.status)
    if (s === 'Active')   return 'active'
    if (s === 'Invited')  return 'invited'
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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'active',   label: `Active (${counts.active})` },
    { key: 'invited',  label: `Invited (${counts.invited})` },
    { key: 'inactive', label: `Inactive (${counts.inactive})` },
  ]

  const gold   = '#B8960C'
  const muted  = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <AdminShell role="super_admin">
      <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--admin-text)' }}>Accounts</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: muted }}>
              {counts.all} {counts.all === 1 ? 'family' : 'families'} &middot; {candidateCount} candidates
              {pendingCount > 0 && (
                <span style={{ marginLeft: 8, background: '#fbbf24', color: '#000', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
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
              padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4',
              border: `0.5px solid ${border}`,
              color: 'var(--admin-text)', outline: 'none', width: 240,
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `0.5px solid ${border}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? gold : muted,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? `2px solid ${gold}` : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center' as const, color: muted, fontSize: 13 }}>
              {search ? 'No accounts match your search.' : 'No accounts in this category.'}
            </div>
          )}
          {filtered.map(account => (
            <AccountRowCard key={account.id} account={account} isDark={isDark} />
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
