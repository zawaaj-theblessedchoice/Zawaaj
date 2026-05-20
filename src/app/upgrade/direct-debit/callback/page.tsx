'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFlowId = searchParams.get('redirect_flow_id')

  const [state, setState] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
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
        setState('success')
        // Wait briefly so the user sees the success message, then redirect
        setTimeout(() => router.push('/settings?tab=membership'), 2500)
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
              Direct Debit authorised
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Your Direct Debit is set up. Your Premium membership will activate once the first payment clears — usually within 1–3 working days.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Redirecting to your membership settings…
            </p>
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
