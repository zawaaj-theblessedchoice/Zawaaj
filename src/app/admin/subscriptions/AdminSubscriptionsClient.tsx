'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SubscriptionRow } from './page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function profileName(p: SubscriptionRow['profile']): string {
  if (!p) return 'Unknown'
  if (!p.first_name) return p.display_initials
  const last = p.last_name ? `${p.last_name[0]}.` : ''
  return [p.first_name, last].filter(Boolean).join(' ')
}

const PLAN_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  voluntary: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.45)', label: 'Free' },
  plus:      { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA',                label: 'Plus' },
  premium:   { bg: 'rgba(184,150,12,0.15)',  text: '#B8960C',                label: 'Premium' },
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active:    { bg: 'rgba(74,222,128,0.12)', text: '#4ADE80' },
  cancelled: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.35)' },
  past_due:  { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
  trialing:  { bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24' },
}

const PLAN_PRICES = { voluntary: 0, plus: 9, premium: 19 }

// ─── Override modal ───────────────────────────────────────────────────────────

function OverrideModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: SubscriptionRow
  onClose: () => void
  onSaved: (id: string, newPlan: string) => void
}) {
  const [plan, setPlan] = useState(sub.plan)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/override-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: sub.id, plan }),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to update'); return }
    onSaved(sub.id, plan)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 380, padding: 24 }}>
        <p className="text-white font-semibold mb-1" style={{ fontSize: 14, color: 'white', fontWeight: 600, marginBottom: 4 }}>
          Override plan — {profileName(sub.profile)}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
          Admin override bypasses Stripe. Use for test accounts or courtesy upgrades.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['voluntary', 'plus', 'premium'] as const).map(p => {
            const b = PLAN_BADGE[p]
            return (
              <button
                key={p}
                onClick={() => setPlan(p)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: plan === p ? '1px solid rgba(184,150,12,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
                  background: plan === p ? 'rgba(184,150,12,0.08)' : 'rgba(255,255,255,0.04)',
                  color: b.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {b.label}
              </button>
            )
          })}
        </div>

        {error && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={loading || plan === sub.plan} style={{ flex: 2, padding: '9px 0', borderRadius: 9, background: '#B8960C', color: '#111', fontSize: 13, fontWeight: 600, cursor: loading || plan === sub.plan ? 'not-allowed' : 'pointer', opacity: plan === sub.plan ? 0.5 : 1, border: 'none' }}>
            {loading ? 'Saving…' : 'Save override'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function AdminSubscriptionsClient({ subs: initialSubs }: { subs: SubscriptionRow[] }) {
  const [subs, setSubs] = useState(initialSubs)
  const [overrideSub, setOverrideSub] = useState<SubscriptionRow | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'past_due'>('all')

  // ─── MRR calculation ───────────────────────────────────────────────────────
  const activeSubs = subs.filter(s => s.status === 'active')
  const plusActive = activeSubs.filter(s => s.plan === 'plus').length
  const premiumActive = activeSubs.filter(s => s.plan === 'premium').length
  const estimatedMRR = plusActive * PLAN_PRICES.plus + premiumActive * PLAN_PRICES.premium

  const filtered = statusFilter === 'all' ? subs : subs.filter(s => s.status === statusFilter)

  function handleOverrideSaved(id: string, newPlan: string) {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, plan: newPlan as SubscriptionRow['plan'] } : s))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111111', color: 'white', padding: '36px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href="/admin" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
          ← Admin
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Subscriptions</h1>
      </div>

      {/* MRR summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Plus active', value: `${plusActive}`, sub: `${plusActive} × £${PLAN_PRICES.plus}/mo` },
          { label: 'Premium active', value: `${premiumActive}`, sub: `${premiumActive} × £${PLAN_PRICES.premium}/mo` },
          { label: 'Estimated MRR', value: `£${estimatedMRR}`, sub: 'Monthly recurring' },
          { label: 'Total members', value: `${subs.length}`, sub: `${activeSubs.length} active` },
        ].map(card => (
          <div key={card.label} style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 2 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['all', 'active', 'cancelled', 'past_due'] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: statusFilter === f ? '#B8960C' : 'rgba(255,255,255,0.06)',
              color: statusFilter === f ? '#111' : 'rgba(255,255,255,0.5)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {f === 'all' ? 'All' : f === 'past_due' ? 'Past due' : f.charAt(0).toUpperCase() + f.slice(1)}
            {' '}
            <span style={{ opacity: 0.6 }}>
              {f === 'all' ? subs.length : subs.filter(s => s.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr 1.4fr 1fr', padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
          {['Member', 'Plan', 'Status', 'Since', 'Next renewal', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            No subscriptions found.
          </div>
        ) : (
          filtered.map((sub, i) => {
            const planBadge = PLAN_BADGE[sub.plan]
            const statusBadge = STATUS_BADGE[sub.status] ?? STATUS_BADGE.cancelled
            return (
              <div
                key={sub.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr 1.4fr 1fr',
                  padding: '13px 20px', alignItems: 'center',
                  borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}
              >
                {/* Member */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: sub.profile?.gender === 'female' ? '#EEEDFE' : '#E6F1FB',
                    color: sub.profile?.gender === 'female' ? '#534AB7' : '#185FA5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                  }}>
                    {sub.profile?.display_initials ?? '??'}
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{profileName(sub.profile)}</span>
                </div>

                {/* Plan */}
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: planBadge.bg, color: planBadge.text, display: 'inline-block' }}>
                  {planBadge.label}
                </span>

                {/* Status */}
                <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: statusBadge.bg, color: statusBadge.text, display: 'inline-block' }}>
                  {sub.status === 'past_due' ? 'Past due' : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                  {sub.cancel_at_period_end && sub.status === 'active' ? ' (ends)' : ''}
                </span>

                {/* Since */}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(sub.created_at)}</span>

                {/* Next renewal */}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  {sub.cancel_at_period_end ? '—' : fmtDate(sub.current_period_end)}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setOverrideSub(sub)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    Override
                  </button>
                  {sub.stripe_customer_id && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.3)', color: '#818CF8', textDecoration: 'none' }}
                    >
                      Stripe ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Override modal */}
      {overrideSub && (
        <OverrideModal
          sub={overrideSub}
          onClose={() => setOverrideSub(null)}
          onSaved={handleOverrideSaved}
        />
      )}
    </div>
  )
}
