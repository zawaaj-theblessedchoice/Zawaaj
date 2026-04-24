'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PaymentRequestRow } from './page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function profileName(p: PaymentRequestRow['profile']): string {
  if (!p) return 'Unknown'
  if (!p.first_name) return p.display_initials
  const last = p.last_name ? `${p.last_name[0]}.` : ''
  return [p.first_name, last].filter(Boolean).join(' ')
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  plus:    { bg: 'var(--status-info-bg)',  text: 'var(--status-info)' },
  premium: { bg: 'var(--gold-muted)',      text: 'var(--gold)' },
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', label: 'Pending' },
  approved:  { bg: 'var(--status-success-bg)', text: 'var(--status-success)', label: 'Approved' },
  rejected:  { bg: 'var(--status-error-bg)',   text: 'var(--status-error)',   label: 'Rejected' },
  cancelled: { bg: 'var(--admin-border)',       text: 'var(--admin-muted)',    label: 'Cancelled' },
}

// ─── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  requestId,
  memberName,
  onClose,
  onDone,
}: {
  requestId:  string
  memberName: string
  onClose:    () => void
  onDone:     (id: string) => void
}) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/payments/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejection_reason: reason || null }),
    })
    const json = await res.json().catch(() => ({})) as { error?: string }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to reject.'); return }
    onDone(requestId)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--admin-border)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--admin-text)', margin: '0 0 4px' }}>
          Reject payment request
        </p>
        <p style={{ fontSize: 12, color: 'var(--admin-muted)', margin: '0 0 20px' }}>
          {memberName} — you can optionally provide a reason.
        </p>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13,
            background: 'var(--surface-3, rgba(255,255,255,0.05))',
            border: '0.5px solid var(--admin-border)',
            color: 'var(--admin-text)', outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        {error && (
          <p style={{ fontSize: 12, color: 'var(--status-error)', marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '9px 0', borderRadius: 9, background: 'var(--admin-border)', border: '0.5px solid var(--admin-border)', color: 'var(--admin-muted)', fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            style={{ flex: 2, padding: '9px 0', borderRadius: 9, background: 'rgba(248,113,113,0.15)', border: '0.5px solid rgba(248,113,113,0.4)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Rejecting…' : 'Reject request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'approved' | 'rejected'

export default function AdminPaymentsClient({ requests: initial }: { requests: PaymentRequestRow[] }) {
  const [requests,    setRequests]    = useState(initial)
  const [tab,         setTab]         = useState<Tab>('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [approving,   setApproving]   = useState<string | null>(null)
  const [actionError, setActionError] = useState<Record<string, string>>({})

  const filtered = requests.filter(r => r.status === tab)

  const pending  = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length
  const rejected = requests.filter(r => r.status === 'rejected').length

  async function approve(id: string) {
    setApproving(id)
    setActionError(prev => { const n = { ...prev }; delete n[id]; return n })
    const res = await fetch(`/api/admin/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    const json = await res.json().catch(() => ({})) as { error?: string }
    setApproving(null)
    if (!res.ok) {
      setActionError(prev => ({ ...prev, [id]: json.error ?? 'Failed to approve.' }))
      return
    }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', reviewed_at: new Date().toISOString() } : r))
  }

  function handleRejected(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', reviewed_at: new Date().toISOString() } : r))
  }

  const rejectingRow = rejectingId ? requests.find(r => r.id === rejectingId) : null

  return (
    <div style={{ minHeight: '100vh', padding: '36px 40px', color: 'var(--admin-text)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href="/admin" style={{ color: 'var(--admin-muted)', fontSize: 13, textDecoration: 'none' }}>
          ← Admin
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
          Payment Requests
        </h1>
        {pending > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
            border: '0.5px solid rgba(251,191,36,0.35)',
          }}>
            {pending} pending
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Pending review',  value: pending,  color: '#fbbf24' },
          { label: 'Approved',        value: approved, color: 'var(--status-success)' },
          { label: 'Rejected',        value: rejected, color: 'var(--status-error)' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--surface-2)', border: '0.5px solid var(--admin-border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['pending', 'approved', 'rejected'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '5px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: tab === t ? 'var(--gold)' : 'var(--admin-border)',
              color: tab === t ? 'var(--surface)' : 'var(--admin-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {' '}<span style={{ opacity: 0.7 }}>
              {t === 'pending' ? pending : t === 'approved' ? approved : rejected}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--admin-border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: tab === 'pending' ? '2fr 1fr 1fr 1fr 1.4fr 1.6fr' : '2fr 1fr 1fr 1fr 1.4fr 1.4fr',
          padding: '10px 20px',
          background: 'var(--admin-surface)',
          borderBottom: '0.5px solid var(--admin-border)',
        }}>
          {['Member', 'Plan', 'Amount', 'Method', 'Submitted', tab === 'pending' ? 'Actions' : 'Reviewed'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: 13 }}>
            No {tab} payment requests.
          </div>
        ) : (
          filtered.map((req, i) => {
            const planBadge   = PLAN_BADGE[req.plan]   ?? PLAN_BADGE.plus
            const statusBadge = STATUS_BADGE[req.status] ?? STATUS_BADGE.pending
            const isApproving = approving === req.id
            const rowError    = actionError[req.id]

            return (
              <div key={req.id}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: tab === 'pending' ? '2fr 1fr 1fr 1fr 1.4fr 1.6fr' : '2fr 1fr 1fr 1fr 1.4fr 1.4fr',
                    padding: '13px 20px',
                    alignItems: 'center',
                    borderTop: i > 0 ? '0.5px solid var(--admin-border)' : undefined,
                  }}
                >
                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: req.profile?.gender === 'female' ? 'var(--avatar-female-bg)' : 'var(--avatar-male-bg)',
                      color:      req.profile?.gender === 'female' ? 'var(--avatar-female-text)' : 'var(--avatar-male-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600,
                    }}>
                      {req.profile?.display_initials ?? '??'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--admin-text)', fontWeight: 500 }}>
                        {profileName(req.profile)}
                      </p>
                      {req.reference && (
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--admin-muted)', fontFamily: 'monospace' }}>
                          {req.reference}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Plan */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                    background: planBadge.bg, color: planBadge.text, display: 'inline-block',
                    textTransform: 'capitalize',
                  }}>
                    {req.plan}
                  </span>

                  {/* Amount */}
                  <span style={{ fontSize: 13, color: 'var(--admin-text)', fontWeight: 600 }}>
                    £{req.amount_gbp}<span style={{ fontSize: 11, color: 'var(--admin-muted)', fontWeight: 400 }}>/mo</span>
                  </span>

                  {/* Method */}
                  <span style={{ fontSize: 12, color: 'var(--admin-muted)', textTransform: 'capitalize' }}>
                    {req.method.replace('_', ' ')}
                  </span>

                  {/* Submitted */}
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-muted)' }}>{fmtDate(req.submitted_at)}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--admin-muted)', opacity: 0.6 }}>{fmtTime(req.submitted_at)}</p>
                  </div>

                  {/* Actions or Reviewed */}
                  {tab === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => approve(req.id)}
                        disabled={isApproving}
                        style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                          background: 'rgba(74,222,128,0.12)', border: '0.5px solid rgba(74,222,128,0.35)',
                          color: '#4ade80', cursor: isApproving ? 'not-allowed' : 'pointer',
                          opacity: isApproving ? 0.6 : 1,
                        }}
                      >
                        {isApproving ? '…' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => setRejectingId(req.id)}
                        disabled={isApproving}
                        style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 11.5,
                          background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)',
                          color: '#f87171', cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                        background: statusBadge.bg, color: statusBadge.text, display: 'inline-block',
                      }}>
                        {statusBadge.label}
                      </span>
                      {req.reviewed_at && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
                          {fmtDate(req.reviewed_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Rejection reason */}
                {req.status === 'rejected' && req.rejection_reason && (
                  <div style={{ padding: '0 20px 12px', marginTop: -4 }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-muted)', fontStyle: 'italic' }}>
                      Reason: {req.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Row error */}
                {rowError && (
                  <div style={{ padding: '0 20px 10px' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>{rowError}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Reject modal */}
      {rejectingId && rejectingRow && (
        <RejectModal
          requestId={rejectingId}
          memberName={profileName(rejectingRow.profile)}
          onClose={() => setRejectingId(null)}
          onDone={handleRejected}
        />
      )}
    </div>
  )
}
