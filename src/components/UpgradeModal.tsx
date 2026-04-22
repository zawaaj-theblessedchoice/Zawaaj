'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpgradeTrigger =
  | 'intro_limit'
  | 'who_viewed'
  | 'boost'
  | 'locked_profile'
  | 'premium_match'

interface UpgradeModalProps {
  trigger: UpgradeTrigger
  onClose: () => void
}

// ─── Plan data (compact — 5 key rows) ────────────────────────────────────────

const KEY_ROWS = [
  { feature: 'Monthly expressions', free: '5',    plus: '15',         premium: 'Unlimited' },
  { feature: 'Profile boost',       free: '—',    plus: '1× / month', premium: 'Weekly' },
  { feature: 'Full profile detail', free: 'Basic', plus: '✓',         premium: '✓' },
  { feature: 'See who viewed you',  free: '—',    plus: '—',          premium: '✓' },
  { feature: 'Concierge matching',  free: '—',    plus: '—',          premium: '✓' },
]

const TRIGGER_COPY: Record<UpgradeTrigger, { icon: string; heading: string; sub: string }> = {
  intro_limit:     { icon: '✉️', heading: 'Monthly limit reached', sub: 'Upgrade to express more interest this month.' },
  who_viewed:      { icon: '👁',  heading: 'See who viewed your profile', sub: 'Upgrade to Premium to see exactly who opened your profile, with timestamps.' },
  boost:           { icon: '🚀', heading: 'Boost your profile', sub: 'Upgrade to Plus or Premium to push your profile to the top of browse results.' },
  locked_profile:  { icon: '🔒', heading: 'Unlock full profile details', sub: 'Upgrade to Plus to see the complete bio, faith depth, and lifestyle notes.' },
  premium_match:   { icon: '✦',  heading: 'Premium Match', sub: 'Upgrade to Premium for concierge matching — our admin proactively suggests profiles for you.' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpgradeModal({ trigger, onClose }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(false)
  const copy = TRIGGER_COPY[trigger]

  const plans = [
    { key: 'free',    name: 'Voluntary', monthly: 0,  annual: 0,  highlight: false, col: 0 },
    { key: 'premium', name: 'Premium',   monthly: 19, annual: 15, highlight: true,  col: 1 },
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 520,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '0.5px solid var(--border-default)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{copy.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{copy.heading}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{copy.sub}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Billing toggle */}
        <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-flex', gap: 4,
            background: 'var(--surface-3)', border: '0.5px solid var(--border-default)',
            borderRadius: 10, padding: 4,
          }}>
            {(['Monthly', 'Annual'] as const).map(b => (
              <button
                key={b}
                onClick={() => setAnnual(b === 'Annual')}
                style={{
                  padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  background: (annual ? b === 'Annual' : b === 'Monthly') ? 'var(--gold)' : 'transparent',
                  color: (annual ? b === 'Annual' : b === 'Monthly') ? 'var(--surface)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {b}{b === 'Annual' && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>−20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {plans.map(p => {
            const price = annual ? p.annual : p.monthly
            return (
              <div
                key={p.key}
                style={{
                  borderRadius: 14,
                  padding: '14px 12px',
                  border: p.highlight ? '1px solid rgba(184,150,12,0.5)' : '0.5px solid var(--border-default)',
                  background: p.highlight ? 'rgba(184,150,12,0.06)' : 'var(--surface-3)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div>
                  {p.highlight && (
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--surface)', background: 'var(--gold)', borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginBottom: 6 }}>
                      Recommended
                    </span>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{p.name}</p>
                  <p style={{ fontSize: price === 0 ? 16 : 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {price === 0 ? 'Free' : `£${price}`}
                    {price > 0 && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>}
                  </p>
                  {annual && p.monthly > 0 && (
                    <p style={{ fontSize: 10, color: 'var(--gold)' }}>£{p.annual * 12}/yr</p>
                  )}
                </div>
                <Link
                  href={p.key === 'free' ? '#' : '/settings?tab=membership'}
                  onClick={p.key === 'free' ? onClose : undefined}
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    background: p.highlight ? 'var(--gold)' : 'transparent',
                    color: p.highlight ? 'var(--surface)' : 'var(--text-secondary)',
                    border: p.highlight ? 'none' : '0.5px solid var(--border-default)',
                    textDecoration: 'none', transition: 'opacity 0.15s',
                  }}
                >
                  {p.key === 'free' ? 'Current' : 'Upgrade →'}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Key comparison rows */}
        <div style={{ margin: '0 16px', borderRadius: 10, border: '0.5px solid var(--border-default)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--surface-3)', padding: '8px 12px' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Feature</span>
            {['Free', 'Premium'].map(h => (
              <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
          {KEY_ROWS.map((row, i) => (
            <div key={row.feature} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '7px 12px',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              borderTop: '0.5px solid var(--border-default)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.feature}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{row.free}</span>
              <span style={{ fontSize: 11, color: 'var(--gold)', textAlign: 'center', fontWeight: 500 }}>{row.premium}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
            Maybe later
          </button>
          <Link href="/settings?tab=membership" style={{
            padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--gold)', color: 'var(--surface)', textDecoration: 'none',
          }}>
            See all plans →
          </Link>
        </div>
      </div>
    </div>
  )
}
