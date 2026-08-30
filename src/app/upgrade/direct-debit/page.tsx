'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { GC_PRICES, GC_ENABLED } from '@/lib/gocardless/config'

// The DD subscription can only be created once the family is 'intro_ready' (the
// representative has joined) — Premium is moot before then. Map the readiness
// state to a SPECIFIC, actionable message instead of a vague "complete setup".
function accountSetupIssue(
  readiness: string | null,
  isRep: boolean,
): { message: string; href: string; label: string } | null {
  if (!isRep) {
    return {
      message: 'Only the family representative can set up payments. Please ask your representative to upgrade.',
      href: '/family-account', label: 'View family account',
    }
  }
  switch (readiness) {
    case 'intro_ready':
      return null
    case 'candidate_only':
      return {
        message: 'Add a representative to your family account first — introductions and Premium features need a representative in place before you can upgrade.',
        href: '/family-account', label: 'Add a representative',
      }
    case 'representative_invited':
      return {
        message: 'Your representative hasn’t accepted their invitation yet. Once they join, you can upgrade to Premium.',
        href: '/family-account', label: 'View representative invite',
      }
    case 'representative_linked':
      return {
        message: 'One more step to finish setting up your family account before you can upgrade.',
        href: '/family-account', label: 'Finish account setup',
      }
    default:
      return {
        message: 'Please finish setting up your family account before upgrading.',
        href: '/family-account', label: 'Complete account setup',
      }
  }
}

function DirectDebitContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const billing = (searchParams.get('billing') ?? 'monthly') as 'monthly' | 'annual'
  const plan = searchParams.get('plan') ?? 'premium'

  // Hard gate — if GC not enabled, redirect immediately to /upgrade
  useEffect(() => {
    if (!GC_ENABLED) router.replace('/upgrade')
  }, [router])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_initials: string; gender: string | null; first_name: string | null } | null>(null)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introCount, setIntroCount] = useState(0)
  // Pre-emptive account-setup gate (readiness must be 'intro_ready' to pay).
  const [setupIssue, setSetupIssue] = useState<{ message: string; href: string; label: string } | null>(null)

  useEffect(() => {
    if (!GC_ENABLED) return  // already redirecting
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!settings?.active_profile_id) { router.push('/pending'); return }

      const [{ data: prof }, { count: sl }, { count: ic }] = await Promise.all([
        supabase
          .from('zawaaj_profiles')
          .select('display_initials, gender, first_name, family_account_id')
          .eq('id', settings.active_profile_id)
          .maybeSingle(),
        supabase
          .from('zawaaj_saved_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', settings.active_profile_id),
        supabase
          .from('zawaaj_introduction_requests')
          .select('id', { count: 'exact', head: true })
          .eq('requesting_profile_id', settings.active_profile_id)
          .eq('status', 'pending'),
      ])

      setProfile(prof)
      setShortlistCount(sl ?? 0)
      setIntroCount(ic ?? 0)

      // Pre-emptively surface the account-setup gate so the user sees exactly
      // what's missing before clicking (rather than a vague error after).
      const familyAccountId = (prof as { family_account_id?: string | null } | null)?.family_account_id ?? null
      if (familyAccountId) {
        const { data: fam } = await supabase
          .from('zawaaj_family_accounts')
          .select('readiness_state, primary_user_id')
          .eq('id', familyAccountId)
          .maybeSingle()
        const isRep = (fam as { primary_user_id?: string | null } | null)?.primary_user_id === user.id
        setSetupIssue(accountSetupIssue((fam as { readiness_state?: string | null } | null)?.readiness_state ?? null, isRep))
      } else {
        setSetupIssue({ message: 'Complete your family account setup before upgrading.', href: '/family-account', label: 'Complete account setup' })
      }
    }
    void load()
  }, [router])

  // All hooks are called above this line unconditionally. Only now is it safe to
  // short-circuit the render — returning before any hook would violate the Rules
  // of Hooks (hook order must be identical on every render).
  if (!GC_ENABLED) return null

  const priceConfig = GC_PRICES.premium[billing]

  async function handleSetupDirectDebit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/gocardless/create-redirect-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing_cycle: billing }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong — please try again.')
        return
      }
      // Redirect to GoCardless hosted page
      window.location.href = json.redirect_url
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const displayPrice = billing === 'monthly'
    ? `£${priceConfig.amount / 100}/month`
    : `£${priceConfig.amount / 100}/year`

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute="/upgrade"
        profile={profile}
        shortlistCount={shortlistCount}
        introRequestsCount={introCount}
      />
      <main style={{ flex: 1, marginLeft: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => router.back()}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20 }}
            >
              ← Back
            </button>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Set up Direct Debit
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
              Secure, recurring payment via GoCardless.
            </p>
          </div>

          {/* Plan summary card */}
          <div style={{
            background: 'rgba(184,150,12,0.06)',
            border: '1px solid rgba(184,150,12,0.3)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 24,
          }}>
            <p style={{ fontSize: 11, color: '#B8960C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
              Your selection
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Zawaaj Premium — {billing === 'monthly' ? 'Monthly' : 'Annual'}
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
              {displayPrice}
            </p>
            {billing === 'annual' && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Billed as a single payment of £{(priceConfig.amount / 100).toFixed(0)}/year
              </p>
            )}
          </div>

          {/* What happens next */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border-default)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 24,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>What happens next</p>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'You\'ll be taken to GoCardless to securely authorise your Direct Debit',
                'Your details are entered on GoCardless\'s secure, FCA-regulated platform',
                'Once confirmed, you\'ll be redirected back here',
                'Your Premium membership activates when the first payment clears',
              ].map((step, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Protected by DD Guarantee */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>🛡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                Protected by the Direct Debit Guarantee
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                You can cancel your Direct Debit at any time and receive a full refund for any incorrect payments.
              </p>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'var(--status-error-bg)', border: '0.5px solid var(--status-error-br)',
              fontSize: 13, color: 'var(--status-error)',
            }}>
              {error}
            </div>
          )}

          {/* Specific account-setup gate — names the missing step + links to fix it. */}
          {setupIssue && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'var(--status-warning-bg)', border: '0.5px solid var(--status-warning-br)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--status-warning)', margin: 0, lineHeight: 1.5 }}>
                {setupIssue.message}
              </p>
              <Link href={setupIssue.href} style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>
                {setupIssue.label} →
              </Link>
            </div>
          )}

          <button
            onClick={handleSetupDirectDebit}
            disabled={loading || !!setupIssue}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: 'none', cursor: (loading || setupIssue) ? 'not-allowed' : 'pointer',
              background: (loading || setupIssue) ? 'rgba(184,150,12,0.5)' : '#B8960C',
              color: '#111', transition: 'all 0.15s',
            }}
          >
            {loading ? 'Redirecting to GoCardless…' : 'Continue to Direct Debit setup →'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
            By continuing you authorise Zawaaj to collect recurring payments via GoCardless.
            You can cancel at any time from Settings.
          </p>
        </div>
      </main>
    </div>
  )
}

export default function DirectDebitPage() {
  return (
    <Suspense>
      <DirectDebitContent />
    </Suspense>
  )
}
