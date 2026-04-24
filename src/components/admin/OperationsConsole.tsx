'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ProfileRow,
  ProfileFilters,
  Metrics,
  fetchMetrics,
  fetchProfiles,
  approveProfile,
  rejectProfile,
} from '@/lib/admin/operationsQueries'
import { MetricsRow } from './MetricsRow'
import { FilterBar } from './FilterBar'
import { BulkActionBar } from './BulkActionBar'
import { OperationsTable } from './OperationsTable'
import { ProfilePanel } from './ProfilePanel'
import { IntroModal } from './IntroModal'

const PAGE_SIZE = 50

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

export function OperationsConsole() {
  const supabase = createClient()

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [count, setCount] = useState(0)
  const [metrics, setMetrics] = useState<Metrics>({
    pendingReview: 0,
    needsAction: 0,
    introductionsActive: 0,
    approvedMembers: 0,
    introducedThisWeek: 0,
    needsClaim: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ProfileFilters>({})
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [introModalProfileId, setIntroModalProfileId] = useState<string | null>(null)
  const [pendingFamilyCount, setPendingFamilyCount] = useState(0)
  const [pendingEmailVerificationCount, setPendingEmailVerificationCount] = useState(0)
  const [sinceTimestamp, setSinceTimestamp] = useState<number>(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // ─── Toast helpers ──────────────────────────────────────────────────────────

  function addToast(message: string, type: 'success' | 'error') {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadMetrics = useCallback(async () => {
    try {
      const m = await fetchMetrics(supabase)
      setMetrics(m)
    } catch {
      // Non-critical — don't toast on metrics failure
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfiles = useCallback(async (f: ProfileFilters, p: number) => {
    setLoading(true)
    try {
      const { data, count: total } = await fetchProfiles(supabase, f, p)
      setProfiles(data)
      setCount(total)
    } catch {
      addToast('Failed to load profiles', 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial load
  useEffect(() => {
    // Track since-last-visit for "New" badge
    const storedTs = localStorage.getItem('ops_last_visit')
    const lastVisit = storedTs ? parseInt(storedTs, 10) : Date.now() - 7 * 24 * 60 * 60 * 1000
    localStorage.setItem('ops_last_visit', String(Date.now()))
    setSinceTimestamp(lastVisit)

    loadMetrics()
    loadProfiles(filters, page)
    // Fetch pending family account registrations (not profile rows — shown in Families tab)
    // Count all family accounts that haven't completed activation yet
    supabase
      .from('zawaaj_family_accounts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending_email_verification', 'pending_approval'])
      .then(({ count }) => setPendingFamilyCount(count ?? 0))
    supabase
      .from('zawaaj_family_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_email_verification')
      .then(({ count }) => setPendingEmailVerificationCount(count ?? 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload profiles when filters or page change
  useEffect(() => {
    loadProfiles(filters, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  // Reset page when filters change
  const handleSetFilters = useCallback((f: ProfileFilters) => {
    setPage(0)
    setFilters(f)
  }, [])

  // ─── Selection ──────────────────────────────────────────────────────────────

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(profiles.map(p => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = useCallback(async (id: string) => {
    try {
      await approveProfile(supabase, id)
      setProfiles(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'approved' } : p))
      )
      loadMetrics()
      addToast('Profile approved', 'success')
    } catch {
      addToast('Failed to approve profile', 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReject = useCallback(async (id: string) => {
    try {
      await rejectProfile(supabase, id)
      setProfiles(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'rejected' } : p))
      )
      loadMetrics()
      addToast('Profile rejected', 'success')
    } catch {
      addToast('Failed to reject profile', 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Delete failed')
      }
      setProfiles(prev => prev.filter(p => p.id !== id))
      setOpenProfileId(prev => (prev === id ? null : prev))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      loadMetrics()
      addToast('Profile and account deleted', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete profile'
      addToast(message, 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBulkApprove() {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      await handleApprove(id)
    }
    setSelectedIds(new Set())
  }

  async function handleBulkReject() {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      await handleReject(id)
    }
    setSelectedIds(new Set())
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--admin-bg)',
        color: 'var(--admin-text)',
      }}
    >
      {/* Sticky topbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: 52,
          zIndex: 20,
          background: 'var(--admin-surface)',
          borderBottom: '1px solid var(--admin-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--admin-text)',
            flexShrink: 0,
          }}
        >
          Operations console
        </span>

        {/* Search */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--admin-muted)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search initials, location…"
              value={filters.search ?? ''}
              onChange={e =>
                handleSetFilters({ ...filters, search: e.target.value || undefined })
              }
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 8,
                border: '1px solid var(--admin-border)',
                background: 'var(--admin-bg)',
                color: 'var(--admin-text)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Bell with alert dot */}
          <div style={{ position: 'relative' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              style={{ color: 'var(--admin-muted)' }}
            >
              <path
                d="M9 2a5 5 0 0 0-5 5v3l-1.5 2h13L14 10V7a5 5 0 0 0-5-5ZM7.5 14a1.5 1.5 0 0 0 3 0"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            {(metrics.pendingReview > 0 || metrics.needsClaim > 0) && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: metrics.pendingReview > 0 ? 'var(--status-error)' : '#ca8a04',
                }}
              />
            )}
          </div>

          {/* Admin avatar */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(184,150,12,0.15)',
              border: '1px solid rgba(184,150,12,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--gold)',
            }}
          >
            ZA
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <MetricsRow
          metrics={metrics}
          onFilter={status => handleSetFilters({ ...filters, status })}
          onNeedsClaim={() => handleSetFilters({ needsClaim: true })}
        />

        {/* Pending family accounts notice */}
        {pendingFamilyCount > 0 && (
          <Link
            href="/admin/families"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 9,
              background: 'rgba(184,150,12,0.08)',
              border: '1px solid rgba(184,150,12,0.25)',
              borderLeft: '3px solid var(--gold)',
              textDecoration: 'none',
              color: 'var(--admin-text)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: 'var(--gold)', flexShrink: 0 }}>
              <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7.5 5v3.5M7.5 10v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{pendingFamilyCount}</span>
              {' '}family account{pendingFamilyCount !== 1 ? 's' : ''} pending activation
              {pendingEmailVerificationCount > 0 ? ` (${pendingEmailVerificationCount} awaiting email verification)` : ''} —{' '}
              <span style={{ color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                review in Families →
              </span>
            </span>
          </Link>
        )}

        {/* Awaiting email verification — muted informational note */}
        {pendingEmailVerificationCount > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>
            Awaiting email verification:{' '}
            <span style={{ fontWeight: 600, color: 'var(--admin-text)' }}>{pendingEmailVerificationCount}</span>
          </p>
        )}

        <div style={{ height: 16 }} />
        <FilterBar filters={filters} onChange={handleSetFilters} />
        <div style={{ height: 12 }} />

        {/* Batch-size guidance when browsing needs-claim queue */}
        {filters.needsClaim && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 14px',
              borderRadius: 9,
              background: 'rgba(96,165,250,0.07)',
              border: '1px solid rgba(96,165,250,0.2)',
              borderLeft: '3px solid #60a5fa',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>💬</span>
            <span style={{ fontSize: 13, color: 'var(--admin-text)', lineHeight: 1.5 }}>
              <strong style={{ color: '#60a5fa' }}>Tip:</strong> Invite in batches of 5 — send magic links, copy the WhatsApp template for each, then snooze the rest to pace the queue.
            </span>
          </div>
        )}

        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            onApproveAll={handleBulkApprove}
            onRejectAll={handleBulkReject}
            onDeselect={() => setSelectedIds(new Set())}
          />
        )}

        {/* Main flex: table + side panel */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <OperationsTable
              profiles={profiles}
              loading={loading}
              selectedIds={selectedIds}
              openProfileId={openProfileId}
              sinceTimestamp={sinceTimestamp}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onOpenProfile={setOpenProfileId}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              onClearFilters={() => handleSetFilters({})}
            />

            {/* Pagination */}
            {count > PAGE_SIZE && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 16,
                }}
              >
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color: page === 0 ? 'var(--admin-muted)' : 'var(--admin-text)',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    opacity: page === 0 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 13, color: 'var(--admin-muted)' }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={(page + 1) * PAGE_SIZE >= count}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color:
                      (page + 1) * PAGE_SIZE >= count
                        ? 'var(--admin-muted)'
                        : 'var(--admin-text)',
                    cursor: (page + 1) * PAGE_SIZE >= count ? 'not-allowed' : 'pointer',
                    opacity: (page + 1) * PAGE_SIZE >= count ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Profile panel */}
          {openProfileId && (
            <ProfilePanel
              profile={profiles.find(p => p.id === openProfileId) ?? null}
              onClose={() => setOpenProfileId(null)}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              onNotesUpdate={(id, notes) => {
                setProfiles(prev =>
                  prev.map(p => (p.id === id ? { ...p, admin_notes: notes } : p))
                )
              }}
              onStartIntro={id => setIntroModalProfileId(id)}
            />
          )}
        </div>
      </div>

      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 100,
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              minWidth: 280,
              fontSize: 13,
              background:
                t.type === 'success'
                  ? 'var(--status-success-bg)'
                  : 'var(--status-error-bg)',
              border: `1px solid ${
                t.type === 'success' ? 'var(--status-success)' : 'var(--status-error)'
              }`,
              color:
                t.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Intro modal */}
      {introModalProfileId && (
        <IntroModal
          profile={profiles.find(p => p.id === introModalProfileId) ?? null}
          onClose={() => setIntroModalProfileId(null)}
          onSuccess={(a, b) => {
            addToast(`Introduction started: ${a} × ${b}`, 'success')
            setIntroModalProfileId(null)
          }}
        />
      )}
    </div>
  )
}
