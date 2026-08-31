'use client'
// Trigger rebuild: picks up NEXT_PUBLIC_GOCARDLESS_ENABLED from Vercel env
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { planDisplayName } from '@/lib/zawaaj/planDisplayName'
import { PLAN_PRICES } from '@/lib/plan-config'
import { GC_ENABLED } from '@/lib/gocardless/config'

interface Props {
  currentPlan: string
  profileId: string
}

interface PlanFeature {
  label: string
  free: boolean | string
  premium: boolean | string
}

const FEATURES: PlanFeature[] = [
  { label: 'Monthly introductions',   free: '2',   premium: '8' },
  { label: 'Browse filters',          free: false, premium: true },
  { label: 'Response templates',      free: false, premium: true },
  { label: 'Recommendations',         free: false, premium: true },
  { label: 'Family profiles',         free: '1',   premium: 'Up to 4' },
  { label: 'Concierge service',       free: false, premium: true },
  { label: 'Profile boosts',          free: '—',   premium: 'Weekly' },
  { label: 'Spotlight listing',       free: false, premium: true },
  { label: 'See who viewed you',      free: false, premium: true },
]

function Tick({ yes }: { yes: boolean | string }) {
  if (yes === false) {
    return <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>—</span>
  }
  if (yes === true) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8l3.5 3.5L13 4" stroke="#B8960C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{yes}</span>
}

export function UpgradeClient({ currentPlan, profileId: _profileId }: Props) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [promoCode, setPromoCode] = useState('')

  const isPremium = currentPlan === 'premium'
  const premiumPrice = billing === 'monthly' ? PLAN_PRICES.premium.monthly : PLAN_PRICES.premium.annual

  return (
    <div style={{ padding: '40px 32px', maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Upgrade your membership
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 10 }}>
          Unlock more introductions, filters, and features to find your match.
        </p>

        {/* Billing toggle */}
        <div style={{
          display: 'inline-flex', gap: 0, marginTop: 24,
          borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-default)',
        }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: 500, userSelect: 'none',
                background: b === billing ? '#B8960C' : 'transparent',
                color: b === billing ? '#111' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual (save ~20%)'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>
        {/* Community Access */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: 16, padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              {planDisplayName('voluntary')}
            </p>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Free</span>
            </div>
          </div>
          <button
            disabled
            style={{
              padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--border-default)', cursor: 'default',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', opacity: 0.6,
            }}
          >
            {currentPlan === 'free' ? '✓ Current plan' : 'Community Access'}
          </button>
        </div>

        {/* Premium */}
        <div style={{
          background: 'rgba(184,150,12,0.06)',
          border: '1px solid rgba(184,150,12,0.35)',
          borderRadius: 16, padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            background: '#B8960C', color: '#111', fontSize: 10, fontWeight: 700,
            padding: '3px 12px', borderRadius: 99, letterSpacing: '0.08em', whiteSpace: 'nowrap',
          }}>
            MOST POPULAR
          </span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#B8960C', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              {planDisplayName('premium')}
            </p>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>£{premiumPrice}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/mo</span>
            </div>
            {billing === 'annual' && (
              <p style={{ fontSize: 11, color: '#B8960C', margin: '4px 0 0' }}>
                Billed as £{PLAN_PRICES.premium.annual * 12}/yr
              </p>
            )}
          </div>
          {isPremium ? (
            <button disabled style={{
              padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'default',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', opacity: 0.6,
            }}>
              ✓ Current plan
            </button>
          ) : (
            <button
              onClick={() => {
                if (GC_ENABLED) {
                  router.push(`/upgrade/direct-debit?plan=premium&billing=${billing}`)
                } else {
                  router.push(`/upgrade/bank-transfer?plan=premium`)
                }
              }}
              style={{
                padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', background: '#B8960C', color: '#111',
                transition: 'all 0.15s',
              }}
            >
              Get Premium
            </button>
          )}
        </div>
      </div>

      {/* ── Payment method section ─────────────────────────────────────────── */}
      {!isPremium && (
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
          }}>
            How would you like to pay?
          </p>

          {/* Direct Debit — primary */}
          {GC_ENABLED && (
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid rgba(184,150,12,0.3)',
              borderRadius: 14, padding: '22px 20px',
              display: 'flex', flexDirection: 'column', gap: 10,
              marginBottom: 12, position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: -10, left: 16,
                background: '#B8960C', color: '#111',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 10px', borderRadius: 99,
              }}>
                ★ RECOMMENDED
              </span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                Secure Direct Debit
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Set up a recurring Direct Debit via GoCardless. Cancel anytime.
                Protected by the Direct Debit Guarantee.
              </p>
              <button
                onClick={() => router.push(`/upgrade/direct-debit?plan=premium&billing=${billing}`)}
                style={{
                  marginTop: 4, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer', background: '#B8960C', color: '#111',
                  transition: 'opacity 0.15s',
                }}
              >
                Set up Direct Debit →
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {GC_ENABLED ? 'Prefer to pay by bank transfer?' : 'Payment method'}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          </div>

          {/* Bank Transfer — secondary */}
          <button
            onClick={() => router.push('/upgrade/bank-transfer')}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 500,
              border: '1px solid var(--border-default)', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            Pay by Bank Transfer
          </button>
        </div>
      )}

      <p style={{
        fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
        marginBottom: 32, lineHeight: 1.6,
      }}>
        Premium memberships are currently available via Direct Debit or Bank Transfer.
        We do not accept card payments at this time.
      </p>

      {/* Promo code */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border-default)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 40,
        display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Promo code
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: 'var(--surface-3, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-default)', color: 'var(--text-primary)', outline: 'none',
              }}
            />
            <button
              disabled
              title="Apply your code at checkout in Settings"
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'not-allowed',
                background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)',
                opacity: 0.5, transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              Apply
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
            Apply your code at checkout in{' '}
            <a href="/settings?tab=membership" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              Settings
            </a>
            .
          </p>
        </div>
      </div>

      {/* Feature comparison */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border-default)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Feature</th>
              {(['voluntary', 'premium'] as const).map(slug => (
                <th key={slug} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {planDisplayName(slug)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f, i) => (
              <tr
                key={f.label}
                style={{ borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border-default)' : 'none' }}
              >
                <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-primary)' }}>{f.label}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}><Tick yes={f.free} /></td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}><Tick yes={f.premium} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24 }}>
        Questions? Contact us at{' '}
        <a href="mailto:zawaaj.theblessedchoice@gmail.com" style={{ color: '#B8960C' }}>zawaaj.theblessedchoice@gmail.com</a>
      </p>
    </div>
  )
}
