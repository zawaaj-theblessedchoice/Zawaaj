'use client'

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)

    try {
      await fetch('/api/auth/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
    } catch {
      // Silently ignore network errors — always show the sent state
    }

    setLoading(false)
    setSent(true)
  }

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
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <ZawaajLogo height={220} />
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-default)',
            borderTop: '1px solid rgba(196,154,16,0.2)',
            borderRadius: 12,
            padding: '36px 32px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          {sent ? (
            /* ── Sent state ── */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--gold-muted)',
                  border: '0.5px solid var(--border-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M2 5l8 5.5L18 5M2 5h16v12H2V5Z"
                    stroke="var(--gold)"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 10px',
                }}
              >
                Check your email
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 24px',
                }}
              >
                If an account exists for{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, you
                will receive a password reset link shortly. Check your spam folder if it
                doesn&apos;t arrive within a few minutes.
              </p>
              <Link
                href="/login"
                style={{
                  fontSize: 13,
                  color: 'var(--gold)',
                  textDecoration: 'none',
                }}
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 6px',
                }}
              >
                Reset your password
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  margin: '0 0 24px',
                  lineHeight: 1.5,
                }}
              >
                Enter your email address and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="email"
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '0.5px solid var(--border-default)',
                      background: 'var(--surface-3)',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-gold)')}
                    onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-default)')}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--status-error)',
                      background: 'rgba(248,113,113,0.1)',
                      border: '0.5px solid rgba(248,113,113,0.3)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginBottom: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    border: 'none',
                    color: 'var(--surface)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !email.trim() ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(196,154,16,0.25)',
                  }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div
                style={{
                  marginTop: 20,
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: 'var(--text-muted)',
                }}
              >
                Remembered it?{' '}
                <Link
                  href="/login"
                  style={{ color: 'var(--gold)', textDecoration: 'none' }}
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
