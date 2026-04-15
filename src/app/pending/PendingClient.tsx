'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ZawaajLogo from '@/components/ZawaajLogo'
import { createClient } from '@/lib/supabase/client'

interface Props {
  status: string | null
  familyAccountId: string | null
  contactEmail: string | null
}

export default function PendingClient({ status, familyAccountId, contactEmail }: Props) {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleResend() {
    if (resending || !familyAccountId) return
    setResending(true)
    setResendError(null)
    setResendDone(false)
    try {
      const res = await fetch('/api/register/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyAccountId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        setResendError(json.error ?? 'Failed to resend. Please try again.')
      } else {
        setResendDone(true)
      }
    } catch {
      setResendError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  // ── Determine content by status ──────────────────────────────────────────────

  const isEmailVerification = status === 'pending_email_verification'

  const icon = isEmailVerification ? (
    // Envelope icon
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--gold)" strokeWidth="1.5" />
      <path d="M2 8l10 7 10-7" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    // Clock icon
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.5" />
      <path d="M12 7v5l3 3" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const heading = isEmailVerification
    ? 'Verify your email address'
    : 'Application submitted'

  const body = isEmailVerification
    ? (
      <>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 6px' }}>
          We sent a verification link to{' '}
          {contactEmail
            ? <strong style={{ color: 'var(--text-primary)' }}>{contactEmail}</strong>
            : 'your contact email address'
          }.
          Please check your inbox (and spam folder) and click the link to continue.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          Once verified your application will be reviewed by our team, in shaa Allah.
        </p>
      </>
    )
    : (
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
        JazakAllahu Khayran. Your application is being reviewed by our team.
        We will be in touch in shaa Allah.
      </p>
    )

  const badge = isEmailVerification
    ? 'Awaiting email verification'
    : 'Pending approval'

  return (
    <main
      data-theme="dark"
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderTop: '1px solid rgba(196,154,16,0.25)',
          borderRadius: 12,
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <ZawaajLogo size={64} tagline={false} />

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--gold-muted)',
            border: '0.5px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>

        {/* Heading + body */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>
            {heading}
          </h1>
          {body}
        </div>

        {/* Status badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 999,
            background: 'var(--gold-muted)',
            border: '0.5px solid var(--border-gold)',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--gold)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
          {badge}
        </span>

        {/* Resend button — only for email verification state */}
        {isEmailVerification && familyAccountId && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            {resendDone ? (
              <p style={{ fontSize: 12, color: 'var(--status-success, #4ade80)' }}>
                ✓ Verification email resent
              </p>
            ) : (
              <>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: 'none',
                    border: '0.5px solid var(--border-gold)',
                    borderRadius: 8,
                    color: 'var(--gold)',
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: resending ? 'not-allowed' : 'pointer',
                    padding: '7px 18px',
                    opacity: resending ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {resending ? 'Resending…' : 'Resend verification email'}
                </button>
                {resendError && (
                  <p style={{ fontSize: 11, color: 'var(--status-error, #f87171)', marginTop: 6 }}>
                    {resendError}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ width: '100%', height: '0.5px', background: 'var(--border-default)' }} />

        {/* Sign-out */}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 12.5,
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')}
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
