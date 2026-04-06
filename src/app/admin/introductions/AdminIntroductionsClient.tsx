'use client'

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'

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
  status: 'pending' | 'mutual' | 'facilitated' | 'expired'
  created_at: string
  expires_at: string
  mutual_at: string | null
  facilitated_at: string | null
  admin_notes: string | null
}

type FilterTab = 'all' | 'pending' | 'mutual' | 'facilitated' | 'expired'

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

function avatarBg(gender: string | null): string {
  return gender === 'female' ? '#534AB7' : '#185FA5'
}

function avatarBgLight(gender: string | null): string {
  return gender === 'female' ? '#EEEDFE' : '#E6F1FB'
}

// ─── Avatar cell ──────────────────────────────────────────────────────────────

function ProfileCell({ profile }: { profile: IntroRequest['requesting_profile'] }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: avatarBg(profile.gender), color: avatarBgLight(profile.gender) }}
      >
        {profile.display_initials}
      </div>
      <span
        className="text-sm truncate"
        style={{ color: 'var(--text-primary)' }}
      >
        {profileName(profile)}
      </span>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntroRequest['status'] }) {
  const styles: Record<IntroRequest['status'], { bg: string; color: string }> = {
    pending:     { bg: 'var(--surface-3)',              color: 'var(--text-secondary)' },
    mutual:      { bg: 'var(--gold-muted)',              color: 'var(--gold-light)' },
    facilitated: { bg: '#1A3A1A',                        color: '#4CAF50' },
    expired:     { bg: 'var(--surface-3)',               color: 'var(--text-muted)' },
  }
  const s = styles[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

// ─── Facilitate modal ─────────────────────────────────────────────────────────

interface FacilitateModalProps {
  req: IntroRequest
  onClose: () => void
  onFacilitated: (id: string) => void
}

function FacilitateModal({ req, onClose, onFacilitated }: FacilitateModalProps) {
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromName = profileName(req.requesting_profile)
  const toName   = profileName(req.target_profile)

  const emailPreview = `Assalamu alaikum [Name],\n\nWe are pleased to facilitate an introduction between you and [Other Name]. Our team has reviewed both profiles and believe this could be a compatible match, in sha Allah.\n\nPlease reach out at your earliest convenience. We ask that all communication remain respectful and in accordance with Islamic etiquette.\n\nJazakAllah khayran,\nThe Zawaaj Team`

  async function handleSend() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/facilitate-introduction', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: req.id, admin_notes: adminNotes }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Something went wrong')
      } else {
        onFacilitated(req.id)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full mx-4 flex flex-col gap-5 overflow-y-auto"
        style={{
          maxWidth: 500,
          backgroundColor: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 13,
          padding: 28,
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            Facilitate Introduction
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            This will mark the request as facilitated. Emails are not yet sent automatically.
          </p>
        </div>

        {/* Both names side by side */}
        <div className="flex items-center gap-4">
          <div
            className="flex-1 rounded-lg p-3 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--surface-3)', border: '0.5px solid var(--border-default)' }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</span>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: avatarBg(req.requesting_profile.gender), color: avatarBgLight(req.requesting_profile.gender) }}
              >
                {req.requesting_profile.display_initials}
              </div>
              <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{fromName}</span>
            </div>
          </div>

          <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>↔</span>

          <div
            className="flex-1 rounded-lg p-3 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--surface-3)', border: '0.5px solid var(--border-default)' }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</span>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: avatarBg(req.target_profile.gender), color: avatarBgLight(req.target_profile.gender) }}
              >
                {req.target_profile.display_initials}
              </div>
              <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{toName}</span>
            </div>
          </div>
        </div>

        {/* Admin notes */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="admin-notes"
            style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Admin notes (optional)
          </label>
          <textarea
            id="admin-notes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Add any internal notes about this introduction..."
            className="w-full resize-none rounded-lg p-3 text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '0.5px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Email preview */}
        <div className="flex flex-col gap-2">
          <span
            style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Email preview (template)
          </span>
          <pre
            className="text-xs whitespace-pre-wrap rounded-lg p-3 leading-relaxed"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '0.5px solid var(--border-default)',
              color: 'var(--text-muted)',
              fontFamily: 'inherit',
            }}
          >
            {emailPreview}
          </pre>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              border: '0.5px solid var(--border-default)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--gold)',
              color: '#1A1A1A',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Saving…' : 'Send introduction emails'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  requests: IntroRequest[]
}

export default function AdminIntroductionsClient({ requests: initialRequests }: Props) {
  const [requests, setRequests] = useState<IntroRequest[]>(initialRequests)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [facilitatingReq, setFacilitatingReq] = useState<IntroRequest | null>(null)

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all',         label: 'All' },
    { key: 'pending',     label: 'Pending' },
    { key: 'mutual',      label: 'Mutual' },
    { key: 'facilitated', label: 'Facilitated' },
    { key: 'expired',     label: 'Expired' },
  ]

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  function handleFacilitated(id: string) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'facilitated', facilitated_at: new Date().toISOString() }
          : r
      )
    )
    setFacilitatingReq(null)
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
    >
      {/* ── Top nav ── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '0.5px solid var(--border-default)' }}
      >
        <ZawaajLogo size={32} tagline={false} />
        <Link
          href="/admin"
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* ── Page header + filter tabs ── */}
      <div
        className="px-6 pt-8 pb-0"
        style={{ borderBottom: '0.5px solid var(--border-default)' }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
          Introductions
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {filterTabs.map(({ key, label }) => {
            const count = key === 'all' ? requests.length : requests.filter((r) => r.status === key).length
            const isActive = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-4 py-2 text-sm rounded-t-lg flex items-center gap-2"
                style={{
                  backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: isActive ? 'var(--surface-3)' : 'var(--surface-2)',
                    color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="px-6 py-6">
        {filtered.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            No introduction requests{filter !== 'all' ? ` with status "${filter}"` : ''}.
          </p>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '0.5px solid var(--border-default)' }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)' }}>
                  {['From', 'To', 'Status', 'Requested', 'Expires', 'Mutual at', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        borderBottom: '0.5px solid var(--border-default)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, idx) => {
                  const isMutual = req.status === 'mutual'
                  const isLast = idx === filtered.length - 1
                  return (
                    <tr
                      key={req.id}
                      style={{
                        backgroundColor: isMutual ? 'var(--gold-muted)' : (idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'),
                        borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)',
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
                      <td className="px-4 py-3">
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {fmtDate(req.created_at)}
                        </span>
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3">
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {fmtDate(req.expires_at)}
                        </span>
                      </td>

                      {/* Mutual at */}
                      <td className="px-4 py-3">
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {fmtDate(req.mutual_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {req.status === 'mutual' && (
                            <button
                              onClick={() => setFacilitatingReq(req)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ backgroundColor: 'var(--gold)', color: '#1A1A1A' }}
                            >
                              Facilitate introduction
                            </button>
                          )}
                          <Link
                            href={`/admin/sidebyside/${req.requesting_profile.id}__${req.target_profile.id}`}
                            className="px-3 py-1.5 rounded-lg text-xs"
                            style={{
                              border: '0.5px solid var(--border-default)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            View profiles
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Facilitate modal ── */}
      {facilitatingReq && (
        <FacilitateModal
          req={facilitatingReq}
          onClose={() => setFacilitatingReq(null)}
          onFacilitated={handleFacilitated}
        />
      )}
    </div>
  )
}
