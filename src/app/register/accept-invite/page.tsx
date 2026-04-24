'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ZawaajLogo } from '@/components/ZawaajLogo'

// ─── UUID detection ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUUID(s: string): boolean {
  return UUID_RE.test(s)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenInfo {
  id: string
  family_account_id: string
  purpose: string
  invited_name: string | null
  invited_email: string | null
  expires_at: string
  accepted_at: string | null
  family_accounts: {
    contact_full_name: string
    contact_email: string
  }
}

interface ClaimPreview {
  token_id: string
  family_account_id: string
  contact_full_name: string | null
  contact_email: string | null
  expires_at: string
  profiles: Array<{
    id: string
    first_name: string | null
    last_name: string | null
    gender: string | null
    age_display: string | null
    location: string | null
    data_completeness_score: number | null
    missing_fields: string[]
  }>
}

// ─── Claim flow (claim_invite purpose) ───────────────────────────────────────

function ClaimInviteContent({ tokenId }: { tokenId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [preview, setPreview]         = useState<ClaimPreview | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [claiming, setClaiming]       = useState(false)
  const [done, setDone]               = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/claim?token_id=${tokenId}`)
        const json = await res.json() as ClaimPreview & { error?: string }
        if (!res.ok) {
          setError(json.error ?? 'This claim link is invalid or has expired.')
        } else {
          setPreview(json)
          setEmail(json.contact_email ?? '')
        }
      } catch {
        setError('Could not load claim details. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [tokenId])

  async function handleClaim() {
    if (!preview) return
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError(null)
    setClaiming(true)
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId, email, password }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; code?: string }
      if (!res.ok) {
        if (json.code === 'email_exists') {
          setError('An account with this email already exists. Please sign in to your existing account instead.')
        } else {
          setError(json.error ?? 'Failed to activate account. Please try again.')
        }
        return
      }

      // Sign the user in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) {
        // Account created but sign-in failed — redirect to login
        router.push('/login?message=Account+created+successfully+%E2%80%94+please+sign+in')
        return
      }

      setDone(true)
      setTimeout(() => router.push('/browse'), 2500)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--surface-2)', border: '1px solid var(--border-default)',
        borderRadius: 20, padding: 40,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <ZawaajLogo height={220} />
        </div>

        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>
            Verifying your link…
          </p>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, marginBottom: 8 }}>⚠️</p>
            <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Unable to activate
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {done && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>✓</p>
            <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              Account activated — welcome to Zawaaj!
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Your family profile is all set. Taking you to browse…
            </p>
          </div>
        )}

        {!loading && !error && !done && preview && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', textAlign: 'center' }}>
              Your family profile is ready
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
              We've already set up your family account on Zawaaj. Create a password below to activate your access, in shaa Allah.
            </p>

            {/* Profile summary */}
            {preview.profiles.length > 0 && (
              <div style={{
                marginBottom: 24,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(184,150,12,0.06)',
                border: '1px solid rgba(184,150,12,0.2)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(184,150,12,0.8)', marginBottom: 10 }}>
                  Profiles on your account
                </p>
                {preview.profiles.map((p) => {
                  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Profile'
                  const details = [p.gender, p.age_display, p.location].filter(Boolean).join(' · ')
                  const score = p.data_completeness_score
                  const missingCount = p.missing_fields.length

                  return (
                    <div key={p.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{name}</p>
                          {details && (
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{details}</p>
                          )}
                        </div>
                        {score !== null && (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            padding: '2px 8px', borderRadius: 999,
                            background: score >= 80 ? 'rgba(74,222,128,0.1)' : score >= 60 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                            color: score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171',
                            border: `1px solid ${score >= 80 ? 'rgba(74,222,128,0.3)' : score >= 60 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
                          }}>
                            {score}% complete
                          </span>
                        )}
                      </div>
                      {missingCount > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                          Missing: {p.missing_fields.join(', ')} — you can add these after signing in.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Email field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--border-default)', background: 'var(--surface)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Create a password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--border-default)', background: 'var(--surface)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: `1px solid ${confirm && confirm !== password ? '#f87171' : 'var(--border-default)'}`,
                  background: 'var(--surface)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {confirm && confirm !== password && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            <button
              onClick={handleClaim}
              disabled={claiming || !email || !password || !confirm || password !== confirm}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
                border: 'none',
                cursor: (claiming || !email || !password || !confirm || password !== confirm) ? 'not-allowed' : 'pointer',
                background: (claiming || !email || !password || !confirm || password !== confirm) ? 'rgba(184,150,12,0.4)' : '#B8960C',
                color: '#111', opacity: claiming ? 0.7 : 1,
              }}
            >
              {claiming ? 'Activating…' : 'Activate my account'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
              By activating, you agree to our{' '}
              <a href="/terms" style={{ color: 'var(--gold)', textDecoration: 'none' }}>terms of service</a>.
              Your account will be linked to your family profile.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Standard invite flow (guardian_invite / child_invite) ───────────────────

function StandardInviteContent({ tokenParam }: { tokenParam: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [done, setDone]           = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('zawaaj_invite_tokens')
        .select(`
          id, family_account_id, purpose, invited_name, invited_email, expires_at, accepted_at,
          family_accounts:zawaaj_family_accounts(contact_full_name, contact_email)
        `)
        .eq('token', tokenParam)
        .maybeSingle()

      setLoading(false)

      if (fetchErr || !data) {
        setError('This invite link is invalid or has expired.')
        return
      }
      if (data.accepted_at) {
        setError('This invite link has already been used.')
        return
      }
      if (new Date(data.expires_at as string) < new Date()) {
        setError('This invite link has expired. Please request a new one.')
        return
      }
      setTokenInfo(data as unknown as TokenInfo)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam])

  async function acceptInvite() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=/register/accept-invite?token=${tokenParam}`)
      return
    }
    setAccepting(true)
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenParam }),
    })
    const json = await res.json().catch(() => ({})) as { error?: string }
    setAccepting(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to accept invite. Please try again.')
      return
    }
    setDone(true)
    setTimeout(() => router.push('/browse'), 2500)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--surface-2)', border: '1px solid var(--border-default)',
        borderRadius: 20, padding: 40, textAlign: 'center',
      }}>
        <div style={{ marginBottom: 28 }}>
          <ZawaajLogo height={220} />
        </div>

        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Verifying invite…</p>
        )}

        {error && (
          <>
            <p style={{ fontSize: 22, marginBottom: 8 }}>⚠️</p>
            <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Invalid link
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{error}</p>
          </>
        )}

        {done && (
          <>
            <p style={{ fontSize: 28, marginBottom: 8 }}>✓</p>
            <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              You&rsquo;re linked!
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Your profile is now connected to the family account. Redirecting…
            </p>
          </>
        )}

        {!loading && !error && !done && tokenInfo && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Family invite
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              {tokenInfo.invited_name
                ? `${tokenInfo.invited_name}, you've been`
                : "You've been"} invited to join the family account registered by{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {(tokenInfo.family_accounts as unknown as { contact_full_name: string }).contact_full_name}
              </strong>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
              By accepting, your Zawaaj profile will be linked to this family account.
              The family contact will be able to manage introductions on your behalf.
            </p>
            <button
              onClick={acceptInvite}
              disabled={accepting}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
                border: 'none', cursor: accepting ? 'not-allowed' : 'pointer',
                background: accepting ? 'rgba(184,150,12,0.4)' : '#B8960C',
                color: '#111', transition: 'opacity 0.15s', opacity: accepting ? 0.7 : 1,
              }}
            >
              {accepting ? 'Accepting…' : 'Accept invite'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 16 }}>
              You must be signed in to accept this invite.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Router — decides which flow to use ──────────────────────────────────────

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token') ?? ''

  if (!tokenParam) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)', padding: 24,
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--surface-2)', border: '1px solid var(--border-default)',
          borderRadius: 20, padding: 40, textAlign: 'center',
        }}>
          <ZawaajLogo height={220} />
          <p style={{ fontSize: 22, marginBottom: 8, marginTop: 24 }}>⚠️</p>
          <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            Invalid link
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            No invite token found. Please check your link.
          </p>
        </div>
      </div>
    )
  }

  // Claim invite uses UUID as token param; guardian/child invite uses text token
  if (isUUID(tokenParam)) {
    return <ClaimInviteContent tokenId={tokenParam} />
  }
  return <StandardInviteContent tokenParam={tokenParam} />
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
