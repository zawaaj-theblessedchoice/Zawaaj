'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import ZawaajLogo from '@/components/ZawaajLogo'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'invalid'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [familyAccountId, setFamilyAccountId] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    verifyToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function verifyToken() {
    try {
      const res = await fetch('/api/register/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json() as {
        ok?: boolean
        error?: string
        email?: string
        family_account_id?: string
        alreadyVerified?: boolean
      }

      if (res.status === 410) {
        // Expired
        setEmail(json.email ?? null)
        setFamilyAccountId(json.family_account_id ?? null)
        setStatus('expired')
        return
      }

      if (!res.ok || json.error) {
        setStatus('invalid')
        return
      }

      setEmail(json.email ?? null)
      setStatus('success')
      setTimeout(() => router.push('/browse'), 3000)
    } catch {
      setStatus('invalid')
    }
  }

  async function handleResend() {
    if (resending || !familyAccountId) return
    setResending(true)
    setResendDone(false)
    setResendError(null)
    try {
      const res = await fetch('/api/register/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyAccountId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        setResendError(json.error ?? 'Failed to resend. Please contact us.')
      } else {
        setResendDone(true)
      }
    } catch {
      setResendError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderTop: '1px solid rgba(196,154,16,0.25)',
        borderRadius: 12, padding: '40px 36px', textAlign: 'center',
      }}>
        <ZawaajLogo size={56} tagline={false} />

        {status === 'loading' && (
          <p style={{ marginTop: 28, fontSize: 14, color: 'var(--text-secondary)' }}>Verifying your email…</p>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 0' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-8" stroke="var(--status-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 8px' }}>Email verified</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Your family account is now active. Redirecting you now…
            </p>
          </>
        )}

        {status === 'expired' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(251,191,36,0.1)', border: '1px solid #ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 0' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="#ca8a04" strokeWidth="1.5"/><path d="M11 7v4.5M11 14v.5" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 8px' }}>Link expired</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 20 }}>
              This verification link has expired. We&rsquo;ll send you a fresh one.
            </p>
            {resendDone
              ? <p style={{ fontSize: 13, color: 'var(--gold)' }}>✓ New link sent{email ? ` to ${email}` : ''}. Check your inbox.</p>
              : resendError
                ? <p style={{ fontSize: 13, color: 'var(--status-error)' }}>{resendError}</p>
                : <button
                    onClick={handleResend}
                    disabled={resending}
                    style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#B8960C', color: '#111', fontSize: 13, fontWeight: 600, cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.6 : 1 }}
                  >
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
            }
          </>
        )}

        {status === 'invalid' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--status-error-bg)', border: '1px solid var(--status-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 0' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 7l8 8M15 7l-8 8" stroke="var(--status-error)" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 8px' }}>Invalid link</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              This verification link is invalid or has already been used. Please contact us if you need help.
            </p>
            <a href="/help" style={{ display: 'inline-block', marginTop: 16, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--border-gold)', background: 'var(--gold-muted)', color: 'var(--gold)', fontSize: 13, textDecoration: 'none' }}>
              Contact us
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
