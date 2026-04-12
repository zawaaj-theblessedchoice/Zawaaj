'use client'

// /register/link-guardian
//
// Mother / guardian clicks the invitation link sent to her email.
// URL format: /register/link-guardian?account=<family_account_id>
//
// Flow:
//  - If she already has an account: sign in, then we link her user_id
//    as primary_user_id on the family account.
//  - If she doesn't have an account: she creates one here, then we link.
//
// This screen is intentionally public (no auth required) so the link works
// regardless of whether she is logged in.

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ZawaajLogo from '@/components/ZawaajLogo'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '0.5px solid var(--border-default)',
  background: 'var(--surface-3)',
  color: 'var(--text-primary)',
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 5,
  display: 'block',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: 'var(--gold)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function LinkGuardianContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const accountId = searchParams.get('account')

  const [mode, setMode] = useState<'choose' | 'signin' | 'register' | 'done'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!accountId) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
        This link is invalid or has expired. Please contact the Zawaaj team.
      </div>
    )
  }

  async function linkAccountToUser(userId: string) {
    // Update the family account to set primary_user_id to this user
    const supabase = createClient()
    const { error: linkError } = await supabase
      .from('zawaaj_family_accounts')
      .update({ primary_user_id: userId })
      .eq('id', accountId!)
      .is('primary_user_id', null) // Only allow if not yet claimed

    if (linkError) {
      // If primary_user_id is already set, this is fine — account already linked
      // (could be the child, or a previous attempt)
    }

    // Upsert user_settings so this user can access the family account
    await supabase
      .from('zawaaj_user_settings')
      .upsert({ user_id: userId, active_profile_id: null }, { onConflict: 'user_id' })
  }

  async function handleSignIn() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError('Could not sign in. Please check your email and password.')
      setLoading(false)
      return
    }

    await linkAccountToUser(data.user.id)
    setMode('done')
    setLoading(false)
  }

  async function handleRegister() {
    if (!email.trim())               { setError('Email is required.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return }
    if (!password)                   { setError('Password is required.'); return }
    if (password.length < 8)         { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)

    // Use the family registration API — but we only need to create an auth user here.
    // We call Supabase signUp directly then link.
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Could not create account. Please try again.')
      setLoading(false)
      return
    }

    await linkAccountToUser(data.user.id)
    setMode('done')
    setLoading(false)
  }

  if (mode === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--gold-muted)',
            border: '0.5px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.5" />
            <path d="M8 12l3 3 5-5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Account linked
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            JazakAllahu khairan. Your account has been linked to the family profile. The Zawaaj team will be in touch once the account is approved.
          </p>
        </div>
        <button
          onClick={() => router.push('/browse')}
          style={{
            padding: '9px 22px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--gold)',
            color: 'var(--surface)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go to browse
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Accept your invitation
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          You have been listed as the contact person for a family profile on Zawaaj. Link your account to confirm your role.
        </p>
      </div>

      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setMode('signin')}
            style={{
              padding: '12px 0',
              borderRadius: 8,
              border: '0.5px solid var(--border-gold)',
              background: 'var(--gold-muted)',
              color: 'var(--gold)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            I already have an account — sign in
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              padding: '12px 0',
              borderRadius: 8,
              border: '0.5px solid var(--border-default)',
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)',
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Create a new account
          </button>
        </div>
      )}

      {mode === 'signin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email" required>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="your@email.com" style={inputStyle} autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Your password" style={inputStyle} autoComplete="current-password" />
          </Field>
          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--status-error)', padding: '8px 12px', borderRadius: 6,
              background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.3)' }}>
              {error}
            </div>
          )}
          <button onClick={handleSignIn} disabled={loading}
            style={{
              padding: '10px 0', borderRadius: 8, border: 'none',
              background: loading ? 'var(--surface-3)' : 'var(--gold)',
              color: loading ? 'var(--text-muted)' : 'var(--surface)',
              fontSize: 13.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in and link account →'}
          </button>
          <button onClick={() => { setMode('choose'); setError(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      )}

      {mode === 'register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email" required>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="your@email.com" style={inputStyle} autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="At least 8 characters" style={inputStyle} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" required>
            <input type="password" value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
              placeholder="Repeat password" style={inputStyle} autoComplete="new-password" />
          </Field>
          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--status-error)', padding: '8px 12px', borderRadius: 6,
              background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.3)' }}>
              {error}
            </div>
          )}
          <button onClick={handleRegister} disabled={loading}
            style={{
              padding: '10px 0', borderRadius: 8, border: 'none',
              background: loading ? 'var(--surface-3)' : 'var(--gold)',
              color: loading ? 'var(--text-muted)' : 'var(--surface)',
              fontSize: 13.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account…' : 'Create account and link →'}
          </button>
          <button onClick={() => { setMode('choose'); setError(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}

export default function LinkGuardianPage() {
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
          maxWidth: 440,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderTop: '1px solid rgba(196,154,16,0.25)',
          borderRadius: 12,
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ZawaajLogo size={52} tagline={false} />
        </div>
        <Suspense fallback={<div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Loading…</div>}>
          <LinkGuardianContent />
        </Suspense>
      </div>
    </main>
  )
}
