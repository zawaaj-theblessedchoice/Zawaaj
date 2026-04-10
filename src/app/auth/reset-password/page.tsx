'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    // With @supabase/ssr (PKCE), the code was already exchanged by /auth/callback
    // before this page loaded. The recovery session lives in cookies.
    // We just verify a session exists and show the form.
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/browse'), 2000)
  }

  /* ── Loading ── */
  if (checking) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
      </main>
    )
  }

  /* ── No session — link was expired or already used ── */
  if (!hasSession) {
    return (
      <main
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
            maxWidth: 400,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 16,
            padding: '36px 32px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 10px',
            }}
          >
            Link expired or already used
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 20px',
            }}
          >
            Reset links are single-use and expire after one hour. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            style={{
              display: 'inline-block',
              padding: '9px 20px',
              borderRadius: 8,
              background: 'var(--gold)',
              color: 'var(--surface)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Request new link
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <ZawaajLogo size={72} tagline={false} />
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 16,
            padding: '36px 32px',
          }}
        >
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(74,222,128,0.12)',
                  border: '0.5px solid rgba(74,222,128,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="var(--status-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Password updated
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Redirecting you now…
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Set a new password
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
                Choose a strong password you haven&apos;t used before.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="password"
                    style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '0.5px solid var(--border-default)',
                      background: 'var(--surface-3)',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                    onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-gold)')}
                    onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-default)')}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="confirm"
                    style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `0.5px solid ${confirm && password !== confirm ? 'rgba(248,113,113,0.5)' : 'var(--border-default)'}`,
                      background: 'var(--surface-3)',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                    onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-gold)')}
                    onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = confirm && password !== confirm ? 'rgba(248,113,113,0.5)' : 'var(--border-default)')}
                  />
                  {confirm && password !== confirm && (
                    <p style={{ fontSize: 11.5, color: 'var(--status-error)', margin: '4px 0 0' }}>Passwords do not match</p>
                  )}
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
                  disabled={loading || !password || !confirm}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 8,
                    background: 'var(--gold)',
                    border: 'none',
                    color: 'var(--surface)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
                    opacity: loading || !password || !confirm ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
