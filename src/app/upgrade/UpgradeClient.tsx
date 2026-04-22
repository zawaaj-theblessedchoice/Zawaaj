'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  currentPlan: string
  profileId: string
}

interface PlanFeature {
  label: string
  free: boolean | string
  plus: boolean | string
  premium: boolean | string
}

const FEATURES: PlanFeature[] = [
  { label: 'Monthly introductions',   free: '5',       plus: '15',       premium: 'Unlimited' },
  { label: 'Active requests at once', free: '1',       plus: '2',        premium: 'Unlimited' },
  { label: 'Browse filters',          free: false,     plus: true,       premium: true },
  { label: 'Must-have filters',       free: false,     plus: false,      premium: true },
  { label: 'Response templates',      free: false,     plus: true,       premium: true },
  { label: 'Recommendations',         free: false,     plus: true,       premium: true },
  { label: 'Family profiles',         free: '1',       plus: '4',        premium: '4' },
  { label: 'Concierge service',       free: false,     plus: false,      premium: true },
  { label: 'Profile boosts',          free: '0',       plus: '1/mo',     premium: '4/mo' },
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

export function UpgradeClient({ currentPlan, profileId }: Props) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<{
    valid: boolean
    message?: string
    discount_type?: string
    discount_value?: number
    promo_code_id?: string
  } | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const prices = {
    free:    { monthly: 0,  annual: 0 },
    plus:    { monthly: 9,  annual: 7 },
    premium: { monthly: 19, annual: 15 },
  }

  function applyDiscount(basePrice: number): number {
    if (!promoResult?.valid || basePrice === 0) return basePrice
    if (promoResult.discount_type === 'percent') {
      return Math.max(0, basePrice - (basePrice * (promoResult.discount_value! / 100)))
    }
    return Math.max(0, basePrice - (promoResult.discount_value ?? 0))
  }

  async function validatePromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoResult(null)
    const res = await fetch('/api/promo-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode.trim(), plan: selectedPlan ?? '' }),
    })
    const json = await res.json().catch(() => ({}))
    setPromoLoading(false)
    setPromoResult(json)
  }

  const PLANS = [
    {
      id: 'free',
      label: 'Community',
      monthly: prices.free.monthly,
      annual: prices.free.annual,
      color: 'var(--text-secondary)',
      highlight: false,
      cta: 'Current plan',
      ctaDisabled: true,
    },
    {
      id: 'plus',
      label: 'Zawaaj Plus',
      monthly: prices.plus.monthly,
      annual: prices.plus.annual,
      color: '#818cf8',
      highlight: false,
      cta: currentPlan === 'plus' ? 'Current plan' : 'Get Plus',
      ctaDisabled: currentPlan === 'plus',
    },
    {
      id: 'premium',
      label: 'Zawaaj Premium',
      monthly: prices.premium.monthly,
      annual: prices.premium.annual,
      color: '#B8960C',
      highlight: true,
      cta: currentPlan === 'premium' ? 'Current plan' : 'Get Premium',
      ctaDisabled: currentPlan === 'premium',
    },
  ]

  return (
    <div style={{ padding: '40px 32px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Upgrade your membership
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 10 }}>
          Unlock more introductions, filters, and features to find your match.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', gap: 0, marginTop: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: billing === b ? '#B8960C' : 'transparent',
                color: billing === b ? '#111' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual (save ~20%)'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {PLANS.map(plan => {
          const basePrice = billing === 'monthly' ? plan.monthly : plan.annual
          const discountedPrice = applyDiscount(basePrice)
          const hasDiscount = promoResult?.valid && discountedPrice !== basePrice &&
            (promoResult.discount_type === 'percent' ||
              (Array.isArray(promoResult) ? false : true))

          return (
            <div
              key={plan.id}
              style={{
                background: plan.highlight ? 'rgba(184,150,12,0.06)' : 'var(--surface-2)',
                border: `1px solid ${plan.highlight ? 'rgba(184,150,12,0.35)' : 'var(--border-default)'}`,
                borderRadius: 16,
                padding: '24px 20px',
                display: 'flex', flexDirection: 'column', gap: 16,
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#B8960C', color: '#111', fontSize: 10, fontWeight: 700,
                  padding: '3px 12px', borderRadius: 99, letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </span>
              )}

              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {plan.label}
                </p>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {hasDiscount ? (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                        £{basePrice}
                      </span>
                      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                        £{discountedPrice % 1 === 0 ? discountedPrice : discountedPrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {plan.monthly === 0 ? 'Free' : `£${basePrice}`}
                    </span>
                  )}
                  {plan.monthly > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/mo</span>
                  )}
                </div>
              </div>

              <button
                disabled={plan.ctaDisabled || checkoutLoading}
                onClick={async () => {
                  if (plan.ctaDisabled || checkoutLoading) return
                  setSelectedPlan(plan.id)
                  setCheckoutLoading(true)
                  try {
                    const res = await fetch('/api/stripe/create-checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        plan: plan.id,
                        billing,
                        promo_code_id: promoResult?.valid ? promoResult.promo_code_id : undefined,
                      }),
                    })
                    const json = await res.json().catch(() => ({})) as { url?: string; error?: string }
                    if (json.url) {
                      window.location.href = json.url
                    } else {
                      // Stripe not yet configured — fall back to settings tab
                      router.push('/settings?tab=membership')
                    }
                  } catch {
                    router.push('/settings?tab=membership')
                  } finally {
                    setCheckoutLoading(false)
                  }
                }}
                style={{
                  padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: plan.highlight ? 'none' : '1px solid var(--border-default)',
                  cursor: (plan.ctaDisabled || checkoutLoading) ? 'default' : 'pointer',
                  background: plan.ctaDisabled
                    ? 'rgba(255,255,255,0.05)'
                    : plan.highlight ? '#B8960C' : 'transparent',
                  color: plan.ctaDisabled
                    ? 'var(--text-secondary)'
                    : plan.highlight ? '#111' : 'var(--text-primary)',
                  opacity: (plan.ctaDisabled || checkoutLoading) ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {plan.id === currentPlan ? '✓ Current plan' : checkoutLoading && selectedPlan === plan.id ? 'Redirecting…' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

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
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null) }}
              onKeyDown={e => { if (e.key === 'Enter') validatePromo() }}
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
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
                opacity: 0.5,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
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
              {['Community', 'Plus', 'Premium'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
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
                <td style={{ padding: '12px 16px', textAlign: 'center' }}><Tick yes={f.plus} /></td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}><Tick yes={f.premium} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24 }}>
        Questions? Contact us at{' '}
        <a href="mailto:team@zawaaj.uk" style={{ color: '#B8960C' }}>team@zawaaj.uk</a>
      </p>
    </div>
  )
}
