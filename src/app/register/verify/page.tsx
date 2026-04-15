'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'expired' | 'invalid'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [familyAccountId, setFamilyAccountId] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    verifyToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function verifyToken() {
    setStatus('verifying')

    const { data, error } = await supabase
      .from('zawaaj_invite_tokens')
      .select('id, family_account_id, invited_email, expires_at, accepted_at, purpose')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) { setStatus('invalid'); return }
    if (data.purpose !== 'email_verification') { setStatus('invalid'); return }
    if (data.accepted_at) { setStatus('success'); return } // already verified

    if (new Date(data.expires_at) < new Date()) {
      setEmail(data.invited_email)
      setFamilyAccountId(data.family_account_id)
      setStatus('expired')
      return
    }

    setEmail(data.invited_email)
    setFamilyAccountId(data.family_account_id)

    // Mark token accepted
    await supabase
      .from('zawaaj_invite_tokens')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', data.id)

    // Update family account status → pending_approval, onboarding_state → contact_added
    await supabase
      .from('zawaaj_family_accounts')
      .update({ status: 'pending_approval', onboarding_state: 'contact_added' })
      .eq('id', data.family_account_id)

    setStatus('success')
    setTimeout(() => router.push('/browse'), 3000)
  }

  async function handleResend() {
    if (resending || !familyAccountId) return
    setResending(true)
    setResendDone(false)
    try {
      await fetch('/api/register/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyAccountId }),
      })
      setResendDone(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderTop: '1px solid rgba(196,154,16,0.25)', borderRadius: 12, padding: '40px 36px', textAlign: 'center' }}>
        <ZawaajLogo size={56} tagline={false} />

        {(status === 'loading' || status === 'verifying') && (
          <p style={{ marginTop: 28, fontSize: 14, color: 'var(--text-secondary)' }}>Verifying your email…</p>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 0' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-8" stroke="var(--status-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 8px' }}>Email verified</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Your account is now pending review. Our team will be in touch insha&rsquo;Allah. Redirecting you now…
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
              This verification link has expired. Please request a new one.
            </p>
            {resendDone
              ? <p style={{ fontSize: 13, color: 'var(--gold)' }}>New verification email sent to {email}.</p>
              : <button onClick={handleResend} disabled={resending} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#B8960C', color: '#111', fontSize: 13, fontWeight: 600, cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.6 : 1 }}>
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
              This verification link is invalid or has already been used. Please contact the Zawaaj team if you need help.
            </p>
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
