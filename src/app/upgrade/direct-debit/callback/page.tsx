'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GC_ENABLED } from '@/lib/gocardless/config'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFlowId = searchParams.get('redirect_flow_id')

  const [state, setState] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!GC_ENABLED) { router.replace('/upgrade'); return }
    if (!redirectFlowId) {
      setState('error')
      setErrorMsg('Missing redirect_flow_id — please try again.')
      return
    }

    async function complete() {
      try {
        const res = await fetch('/api/payments/gocardless/complete-redirect-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirect_flow_id: redirectFlowId }),
        })
        const json = await res.json()
        if (!res.ok) {
          setState('error')
          setErrorMsg(json.error ?? 'Something went wrong — please try again.')
          return
        }
        // Persistent success — do NOT auto-redirect. A successful setup that
        // flashes past and dumps the user back on an unchanged page reads as a
        // failure. The user reads the confirmation and navigates themselves.
        setState('success')
      } catch {
        setState('error')
        setErrorMsg('Something went wrong — please try again.')
      }
    }

    void complete()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectFlowId])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%', textAlign: 'center',
        background: 'var(--surface-2)', border: '1px solid var(--border-default)',
        borderRadius: 16, padding: '40px 32px',
      }}>
        {state === 'processing' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Setting up your Direct Debit…
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Please wait while we confirm your authorisation with GoCardless.
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Direct Debit set up successfully
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Your Premium membership will activate once your first payment clears — usually 1–3 working
              days. We&rsquo;ll email you when it&rsquo;s active. There&rsquo;s nothing more you need to do.
            </p>
            <button
              onClick={() => router.push('/settings?tab=membership')}
              style={{
                padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#B8960C', color: '#111', border: 'none', cursor: 'pointer', marginBottom: 10,
              }}
            >
              View my membership
            </button>
            <div>
              <button
                onClick={() => router.push('/browse')}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border-default)', cursor: 'pointer',
                }}
              >
                Back to browsing
              </button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
              {errorMsg ?? 'We couldn\'t complete your Direct Debit setup. Please try again or contact us.'}
            </p>
            <button
              onClick={() => router.push('/upgrade/direct-debit')}
              style={{
                padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#B8960C', color: '#111', border: 'none', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  )
}
