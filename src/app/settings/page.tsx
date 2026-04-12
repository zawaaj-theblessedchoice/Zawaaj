'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { PLAN_LABELS, PLAN_PRICES, PLAN_CONFIG } from '@/lib/plan-config'

type Plan = 'free' | 'plus' | 'premium'
type Tab = 'membership' | 'account' | 'privacy'
type ThemeMode = 'light' | 'dark' | 'system'

interface Subscription {
  plan: Plan
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

const PLAN_COLORS: Record<Plan, string> = {
  free:    'rgba(255,255,255,0.08)',
  plus:      'rgba(96,165,250,0.12)',
  premium:   'rgba(184,150,12,0.15)',
}

const PLAN_TEXT: Record<Plan, string> = {
  free:    'rgba(255,255,255,0.5)',
  plus:      'var(--status-info)',
  premium:   'var(--gold-light)',
}

function limitLabel(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n)
}

const COMPARISON_ROWS = [
  { feature: 'Monthly interest expressions', free: limitLabel(PLAN_CONFIG.free.monthlyLimit),    plus: limitLabel(PLAN_CONFIG.plus.monthlyLimit),    premium: limitLabel(PLAN_CONFIG.premium.monthlyLimit) },
  { feature: 'Candidate profiles',           free: 'Up to 2',                                    plus: 'Up to 4',                                    premium: 'Up to 4' },
  { feature: 'Profile boost',                free: '—',                                           plus: '1× / month',                                 premium: 'Weekly' },
  { feature: 'Spotlight listing',            free: '—',                                           plus: '—',                                          premium: '1× / month' },
  { feature: 'Full profile details',         free: 'Summary',                                     plus: '✓',                                          premium: '✓' },
  { feature: 'New profile alerts',           free: '—',                                           plus: PLAN_CONFIG.plus.digestEmail ? '✓' : '—',     premium: PLAN_CONFIG.premium.digestEmail ? '✓' : '—' },
  { feature: 'See who viewed you',           free: '—',                                           plus: '—',                                          premium: PLAN_CONFIG.premium.viewTracking ? '✓' : '—' },
  { feature: 'Dedicated manager',            free: '—',                                           plus: '—',                                          premium: PLAN_CONFIG.premium.concierge ? '✓' : '—' },
  { feature: 'Manager follow-up',            free: '—',                                           plus: '—',                                          premium: PLAN_CONFIG.premium.concierge ? '✓' : '—' },
  { feature: 'Concierge matching',           free: '—',                                           plus: '—',                                          premium: PLAN_CONFIG.premium.concierge ? '✓' : '—' },
  { feature: 'Email support',                free: 'Standard',                                    plus: 'Priority',                                   premium: 'Priority' },
]

function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: PLAN_COLORS[plan],
      color: PLAN_TEXT[plan],
      border: `0.5px solid ${PLAN_TEXT[plan]}40`,
    }}>
      {PLAN_LABELS[plan]}
    </span>
  )
}

function SettingsContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'membership')
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_initials: string; gender: string | null; first_name: string | null } | null>(null)
  const [annual, setAnnual] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')

  // Show success flash if returning from Stripe checkout
  const checkoutSuccess = searchParams.get('checkout') === 'success'

  // Read saved theme on mount (default is light — same as CSS :root)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zawaaj-theme') as ThemeMode | null
      setThemeMode(saved ?? 'light')
    } catch { /* localStorage unavailable */ }
  }, [])

  function applyTheme(mode: ThemeMode) {
    // CSS :root is LIGHT by default — set data-theme="dark" on <html> to enable dark mode
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else if (mode === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    } else {
      // 'light' — remove any dark override
      document.documentElement.removeAttribute('data-theme')
    }
  }

  function handleTheme(mode: ThemeMode) {
    setThemeMode(mode)
    try { localStorage.setItem('zawaaj-theme', mode) } catch { /* ignore */ }
    applyTheme(mode)
  }

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Load profile for sidebar
      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (settings?.active_profile_id) {
        const { data: prof } = await supabase
          .from('zawaaj_profiles')
          .select('display_initials, gender, first_name')
          .eq('id', settings.active_profile_id)
          .maybeSingle()
        if (prof) setProfile(prof)
      }

      // Load subscription
      const { data: subData } = await supabase
        .from('zawaaj_subscriptions')
        .select('plan, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      setSub(subData ?? { plan: 'free', status: 'active', current_period_end: null, cancel_at_period_end: false })
      setLoading(false)
    }
    void load()
  }, [])

  const currentPlan: Plan = (sub?.plan as Plan) ?? 'free'
  const isPaid = currentPlan !== 'free'

  async function startCheckout(plan: 'plus' | 'premium') {
    const billing = annual ? 'annual' : 'monthly'
    const key = `${plan}_${billing}`
    setCheckoutLoading(key)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCheckoutError(json.error ?? 'Failed to start checkout')
        setCheckoutLoading(null)
        return
      }
      if (json.url) {
        window.location.href = json.url
      }
    } catch {
      setCheckoutError('Unexpected error — please try again')
      setCheckoutLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute={pathname}
        shortlistCount={0}
        introRequestsCount={0}
        profile={profile}
      />
      <main style={{ marginLeft: 200, flex: 1, padding: '32px 32px 60px', maxWidth: 760 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Manage your account and membership preferences.</p>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '0.5px solid var(--border-default)', paddingBottom: 0 }}>
          {(['membership', 'account', 'privacy'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--gold)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Membership tab ─────────────────────────────────────────────── */}
        {tab === 'membership' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {checkoutSuccess && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.3)', fontSize: 13, color: 'var(--status-success)' }}>
                ✓ Subscription activated — welcome to {PLAN_LABELS[currentPlan]}!
              </div>
            )}
            {checkoutError && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', fontSize: 13, color: 'var(--status-error)' }}>
                {checkoutError}
              </div>
            )}

            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
            ) : (
              <>
                {/* Current plan card */}
                <div style={{
                  background: 'var(--surface-2)',
                  border: '0.5px solid var(--border-default)',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Current plan</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <PlanBadge plan={currentPlan} />
                      {sub?.status === 'active' && isPaid && (
                        <span style={{ fontSize: 11, color: 'rgba(74,222,128,0.9)' }}>● Active</span>
                      )}
                      {sub?.status === 'past_due' && (
                        <span style={{ fontSize: 11, color: 'var(--status-error)' }}>● Payment due</span>
                      )}
                    </div>
                    {isPaid && sub?.current_period_end && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {sub.cancel_at_period_end
                          ? `Cancels on ${new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : `Renews on ${new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                        }
                      </p>
                    )}
                    {!isPaid && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Free forever — upgrade any time</p>
                    )}
                  </div>
                  {isPaid ? (
                    <Link
                      href="/api/stripe/portal"
                      style={{
                        flexShrink: 0,
                        padding: '9px 18px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        border: '0.5px solid var(--border-default)',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        background: 'var(--surface-3)',
                      }}
                    >
                      Manage billing →
                    </Link>
                  ) : (
                    <Link
                      href="/pricing"
                      style={{
                        flexShrink: 0,
                        padding: '9px 18px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'var(--gold)',
                        color: 'var(--surface)',
                        textDecoration: 'none',
                      }}
                    >
                      Upgrade →
                    </Link>
                  )}
                </div>

                {/* Billing toggle */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                    {isPaid ? 'Other plans' : 'Choose a plan'}
                  </p>
                  <div style={{ display: 'inline-flex', gap: 4, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
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

                  {/* Plan upgrade cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {(['free', 'plus', 'premium'] as const).map(p => {
                      const price = annual ? PLAN_PRICES[p].annual : PLAN_PRICES[p].monthly
                      const isCurrent = p === currentPlan
                      return (
                        <div
                          key={p}
                          style={{
                            borderRadius: 14,
                            padding: 16,
                            border: isCurrent
                              ? `1px solid ${PLAN_TEXT[p]}60`
                              : '0.5px solid var(--border-default)',
                            background: isCurrent ? PLAN_COLORS[p] : 'var(--surface-2)',
                          }}
                        >
                          {isCurrent && (
                            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--surface)', background: PLAN_TEXT[p], borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginBottom: 8 }}>
                              Current
                            </span>
                          )}
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{PLAN_LABELS[p]}</p>
                          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {price === 0 ? 'Free' : `£${price}`}
                            {price > 0 && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>}
                          </p>
                          {annual && PLAN_PRICES[p].monthly > 0 && (
                            <p style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 10 }}>£{PLAN_PRICES[p].annual * 12}/yr · save 20%</p>
                          )}
                          {!isCurrent && p !== 'free' && (
                            <button
                              onClick={() => startCheckout(p)}
                              disabled={checkoutLoading !== null}
                              style={{
                                display: 'block', textAlign: 'center', marginTop: 12, width: '100%',
                                padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                background: 'var(--gold)', color: 'var(--surface)', border: 'none',
                                cursor: checkoutLoading !== null ? 'not-allowed' : 'pointer',
                                opacity: checkoutLoading === `${p}_${annual ? 'annual' : 'monthly'}` ? 0.6 : 1,
                              }}
                            >
                              {checkoutLoading === `${p}_${annual ? 'annual' : 'monthly'}` ? 'Redirecting…' : 'Upgrade →'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Full comparison table */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Full comparison</p>
                  <div style={{ borderRadius: 14, border: '0.5px solid var(--border-default)', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--surface-3)', padding: '8px 16px' }}>
                      {['Feature', 'Free', 'Plus', 'Premium'].map(h => (
                        <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Feature' ? 'left' : 'center' }}>{h}</span>
                      ))}
                    </div>
                    {COMPARISON_ROWS.map((row, i) => (
                      <div key={row.feature} style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        padding: '9px 16px',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        borderTop: '0.5px solid var(--border-default)',
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.feature}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{row.free}</span>
                        <span style={{ fontSize: 12, color: currentPlan === 'plus' ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'center' }}>{row.plus}</span>
                        <span style={{ fontSize: 12, color: currentPlan === 'premium' ? 'var(--gold-light)' : 'var(--text-secondary)', textAlign: 'center', fontWeight: currentPlan === 'premium' ? 500 : 400 }}>{row.premium}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                    All tiers include admin-mediated introductions — contact details are never shared directly between members.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Account tab ────────────────────────────────────────────────── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Password</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Change your account password.</p>
              <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
                Reset password via email →
              </Link>
            </div>
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Your profiles</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Manage all profiles linked to your account, including family members.</p>
              <Link href="/my-profile" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
                Go to My Profile →
              </Link>
            </div>

            {/* Appearance */}
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Appearance</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Choose how Zawaaj looks on this device.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {([
                  { mode: 'light' as ThemeMode, label: 'Light', icon: '☀️' },
                  { mode: 'dark'  as ThemeMode, label: 'Dark',  icon: '🌙' },
                  { mode: 'system' as ThemeMode, label: 'System', icon: '⚙️' },
                ]).map(({ mode, label, icon }) => {
                  const active = themeMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => handleTheme(mode)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: active ? '1.5px solid var(--gold)' : '0.5px solid var(--border-default)',
                        background: active ? 'var(--gold-muted)' : 'var(--surface-3)',
                        color: active ? 'var(--gold)' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Help & support */}
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Help & support</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Browse articles, FAQs, and guidance about using Zawaaj.</p>
              <Link href="/help" target="_blank" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
                Visit help centre →
              </Link>
            </div>
          </div>
        )}

        {/* ── Privacy tab ────────────────────────────────────────────────── */}
        {tab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Profile visibility</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your profile is only visible to other approved members of the opposite gender. Profile links require sign-in to view. Admins can always see your profile.
              </p>
            </div>
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Introduction privacy</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                One-sided interest is completely private. Another member only knows you expressed interest if the interest is mutual. Contact details are never shared without explicit verbal consent.
              </p>
            </div>
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Terms & conditions</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Read our full terms of use and privacy policy.</p>
              <Link href="/terms" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
                Read Terms →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
