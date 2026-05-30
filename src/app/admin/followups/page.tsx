'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaRow { contact_full_name: string | null }
interface ProfileRow {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  family_account: FaRow | FaRow[] | null
}
interface FollowupRow {
  id: string
  created_at: string
  status_set: string | null
  note: string | null
}
interface IntroEntry {
  id: string
  status: string
  facilitated_at: string | null
  created_at: string
  assigned_manager_id: string | null
  requesting_profile: ProfileRow | ProfileRow[] | null
  target_profile: ProfileRow | ProfileRow[] | null
  followups: FollowupRow[] | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['following_up', 'contact_made', 'both_willing', 'meeting_arranged', 'met']
const ALL_STATUSES = [...ACTIVE_STATUSES, 'nikkah_completed', 'not_proceeded']

const FOLLOW_STATUS_LABELS: Record<string, string> = {
  following_up:     'Awaiting first contact',
  contact_made:     'Contacted both families',
  both_willing:     'Both families willing to proceed',
  meeting_arranged: 'Meeting being arranged',
  met:              'Families have met',
  nikkah_completed: 'Alhamdulillah — Nikkah completed',
  not_proceeded:    'Did not proceed — may Allah grant ease',
}

const STATUS_STEP: Record<string, number> = {
  following_up: 1, contact_made: 1,
  both_willing: 2, meeting_arranged: 3, met: 4,
  nikkah_completed: 5, not_proceeded: 5,
}

// status order for button state calculation
const STATUS_ORDER = ['following_up', 'contact_made', 'both_willing', 'meeting_arranged', 'met']

const ADVANCE_STEPS = [
  { fromStatus: 'following_up',     newStatus: 'contact_made',    label: 'Contacted both families' },
  { fromStatus: 'contact_made',     newStatus: 'both_willing',    label: 'Both willing to proceed' },
  { fromStatus: 'both_willing',     newStatus: 'meeting_arranged', label: 'Meeting being arranged' },
  { fromStatus: 'meeting_arranged', newStatus: 'met',             label: 'Families have met' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function lastActivityDate(entry: IntroEntry): string {
  const followups = entry.followups ?? []
  if (followups.length === 0) return entry.facilitated_at ?? entry.created_at
  const sorted = [...followups].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return sorted[0].created_at
}

function isOverdue(entry: IntroEntry): boolean {
  return ACTIVE_STATUSES.includes(entry.status) && daysSince(lastActivityDate(entry)) > 14
}

function resolveProfile(raw: ProfileRow | ProfileRow[] | null): ProfileRow | null {
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

// Candidate's display name: "Muhammad Ibrahim K."
function candidateName(raw: ProfileRow | ProfileRow[] | null): string {
  const p = resolveProfile(raw)
  if (!p) return '?'
  if (!p.first_name) return p.display_initials
  const lastInitial = p.last_name ? ` ${p.last_name[0]}.` : ''
  return `${p.first_name}${lastInitial}`
}

// Family representative's name from the family account
function repName(raw: ProfileRow | ProfileRow[] | null): string | null {
  const p = resolveProfile(raw)
  if (!p) return null
  const fa = Array.isArray(p.family_account) ? (p.family_account[0] ?? null) : p.family_account
  return fa?.contact_full_name ?? null
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, overdue }: { step: number; overdue: boolean }) {
  const activeColor = overdue ? '#d97706' : '#B8960C'
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <div
          key={s}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: s <= step ? activeColor : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  )
}

// ─── FollowupCard ─────────────────────────────────────────────────────────────

function FollowupCard({
  entry,
  advancing,
  onAdvance,
}: {
  entry: IntroEntry
  advancing: string | null
  onAdvance: (id: string, newStatus: string) => void
}) {
  const overdue = isOverdue(entry)
  const step = STATUS_STEP[entry.status] ?? 1
  const currentOrderIdx = STATUS_ORDER.indexOf(entry.status)
  const days = daysSince(lastActivityDate(entry))
  const isBusy = advancing === entry.id
  const isOutcomeStatus = ACTIVE_STATUSES.includes(entry.status)

  const gold   = '#B8960C'
  const border = 'rgba(255,255,255,0.08)'
  const text   = 'rgba(255,255,255,0.85)'
  const muted  = 'rgba(255,255,255,0.4)'

  return (
    <div style={{
      background: '#1a1a1a',
      border: `1px solid ${overdue ? 'rgba(217,119,6,0.35)' : border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: text }}>
              {candidateName(entry.requesting_profile)} ↔ {candidateName(entry.target_profile)}
            </div>
            {(repName(entry.requesting_profile) || repName(entry.target_profile)) && (
              <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>
                Rep: {repName(entry.requesting_profile) ?? '—'} · {repName(entry.target_profile) ?? '—'}
              </div>
            )}
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: overdue ? '#d97706' : muted,
            background: overdue ? 'rgba(217,119,6,0.12)' : 'transparent',
            border: overdue ? '1px solid rgba(217,119,6,0.3)' : 'none',
            borderRadius: 6,
            padding: overdue ? '2px 7px' : '0',
          }}>
            {overdue ? `⚠ Overdue (${days}d)` : `${days}d`}
          </span>
        </div>
        <ProgressBar step={step} overdue={overdue} />
      </div>

      {/* Status + meta */}
      <div style={{ padding: '10px 18px', borderBottom: `1px solid ${border}`, fontSize: 12, color: muted }}>
        <span>
          <span style={{ color: text, fontWeight: 500 }}>{FOLLOW_STATUS_LABELS[entry.status] ?? entry.status}</span>
          {' '}· Manager: {entry.assigned_manager_id ? 'Assigned' : 'Unassigned'}
        </span>
      </div>

      {/* Advance buttons — only for active statuses */}
      {ACTIVE_STATUSES.includes(entry.status) && (
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}` }}>
          <p style={{ fontSize: 11, color: muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tap to advance
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {ADVANCE_STEPS.map((step) => {
              const newIdx = STATUS_ORDER.indexOf(step.newStatus)
              const isCompleted = newIdx <= currentOrderIdx
              const isNext = step.fromStatus === entry.status
              const isFuture = !isCompleted && !isNext

              return (
                <button
                  key={step.newStatus}
                  disabled={isCompleted || isFuture || isBusy}
                  onClick={() => isNext ? onAdvance(entry.id, step.newStatus) : undefined}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: isNext ? 600 : 400,
                    cursor: isNext && !isBusy ? 'pointer' : 'default',
                    border: isCompleted
                      ? '1px solid rgba(74,222,128,0.2)'
                      : isNext
                      ? `1px solid ${gold}`
                      : `1px solid ${border}`,
                    background: isCompleted
                      ? 'rgba(74,222,128,0.06)'
                      : isNext
                      ? 'rgba(184,150,12,0.1)'
                      : 'transparent',
                    color: isCompleted
                      ? '#4ade80'
                      : isNext
                      ? gold
                      : muted,
                    textAlign: 'left' as const,
                    opacity: isBusy ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {isCompleted ? '✓ ' : ''}{step.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Outcome buttons */}
      {isOutcomeStatus && (
        <div style={{ padding: '12px 18px', display: 'flex', gap: 8 }}>
          <button
            disabled={isBusy}
            onClick={() => onAdvance(entry.id, 'nikkah_completed')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: isBusy ? 'default' : 'pointer',
              border: '1px solid rgba(74,222,128,0.25)',
              background: 'rgba(74,222,128,0.06)',
              color: '#4ade80',
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            🤍 Alhamdulillah — Nikkah completed
          </button>
          <button
            disabled={isBusy}
            onClick={() => onAdvance(entry.id, 'not_proceeded')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              cursor: isBusy ? 'default' : 'pointer',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: muted,
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            Did not proceed — may Allah grant ease
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = 'active' | 'nikkah' | 'not_proceeded'

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'active',         label: 'Following up',     statuses: ACTIVE_STATUSES },
  { key: 'nikkah',         label: 'Nikkah completed', statuses: ['nikkah_completed'] },
  { key: 'not_proceeded',  label: 'Did not proceed',  statuses: ['not_proceeded'] },
]

export default function FollowupsPage() {
  const supabase = createClient()

  const [entries, setEntries] = useState<IntroEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('active')
  const [advancing, setAdvancing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const FA_COLS = 'contact_full_name'
    const PROFILE_COLS = `id, display_initials, first_name, last_name, family_account:zawaaj_family_accounts!family_account_id(${FA_COLS})`
    const { data, error: fetchError } = await supabase
      .from('zawaaj_introduction_requests')
      .select(`
        id, status, facilitated_at, created_at, assigned_manager_id,
        requesting_profile:zawaaj_profiles!requesting_profile_id(${PROFILE_COLS}),
        target_profile:zawaaj_profiles!target_profile_id(${PROFILE_COLS}),
        followups:zawaaj_intro_followups(id, created_at, status_set, note)
      `)
      .in('status', ALL_STATUSES)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError('Failed to load follow-ups: ' + fetchError.message)
      setLoading(false)
      return
    }

    setEntries((data ?? []) as unknown as IntroEntry[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleAdvance(entryId: string, newStatus: string) {
    setAdvancing(entryId)
    try {
      const res = await fetch('/api/admin/followup-advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intro_id: entryId, new_status: newStatus }),
      })
      if (!res.ok) {
        const { error: apiError } = await res.json() as { error?: string }
        console.error('[followups] advance failed:', apiError)
        return
      }
      // Update local state inline — no reload needed
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: newStatus } : e))
    } finally {
      setAdvancing(null)
    }
  }

  const isDark = true // admin shell always dark
  const bg      = '#111111'
  const border  = 'rgba(255,255,255,0.08)'
  const text    = 'rgba(255,255,255,0.85)'
  const muted   = 'rgba(255,255,255,0.4)'
  const gold    = '#B8960C'

  const filtered = entries.filter(e => {
    const tab = TABS.find(t => t.key === activeTab)
    return tab ? tab.statuses.includes(e.status) : false
  })

  const tabCount = (tab: typeof TABS[number]) =>
    entries.filter(e => tab.statuses.includes(e.status)).length

  const hasOverdue = entries.some(isOverdue)

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: bg }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>Follow-ups</h1>
            <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>
              Track introductions after contacts are shared
              {hasOverdue && (
                <span style={{ marginLeft: 10, color: '#d97706', fontWeight: 600 }}>
                  ⚠ Some introductions need attention
                </span>
              )}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              border: `1px solid ${border}`,
              background: 'transparent',
              color: muted,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key
          const count = tabCount(tab)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                border: 'none',
                cursor: 'pointer',
                background: active ? (isDark ? '#2a2a2a' : '#fff') : 'transparent',
                color: active ? gold : muted,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  background: active ? gold : 'rgba(255,255,255,0.15)',
                  color: active ? '#fff' : muted,
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 160, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${border}`, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>
            {activeTab === 'nikkah' ? '🤍' : activeTab === 'not_proceeded' ? '🌿' : '✅'}
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 4 }}>
            {activeTab === 'active'
              ? 'No active follow-ups'
              : activeTab === 'nikkah'
              ? 'No nikkah outcomes recorded'
              : 'No withdrawn introductions'}
          </p>
          <p style={{ fontSize: 13, color: muted }}>
            {activeTab === 'active'
              ? 'Introductions appear here once contacts have been shared with both families.'
              : 'Outcomes are recorded from the Following up tab.'}
          </p>
          <Link href="/admin/introductions" style={{ color: gold, fontSize: 13, marginTop: 12, display: 'inline-block' }}>
            View introductions →
          </Link>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {filtered.map(entry => (
            <FollowupCard
              key={entry.id}
              entry={entry}
              advancing={advancing}
              onAdvance={handleAdvance}
            />
          ))}
        </div>
      )}
    </div>
  )
}
