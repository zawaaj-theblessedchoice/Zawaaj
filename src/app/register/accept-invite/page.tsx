'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ZawaajLogo } from '@/components/ZawaajLogo'

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

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const token = searchParams.get('token') ?? ''
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invite token found. Please check your link.')
      setLoading(false)
      return
    }
    loadToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadToken() {
    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('zawaaj_invite_tokens')
      .select(`
        id, family_account_id, purpose, invited_name, invited_email, expires_at, accepted_at,
        family_accounts:zawaaj_family_accounts(contact_full_name, contact_email)
      `)
      .eq('token', token)
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

    if (new Date(data.expires_at) < new Date()) {
      setError('This invite link has expired. Please request a new one.')
      return
    }

    setTokenInfo(data as unknown as TokenInfo)
  }

  async function acceptInvite() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=/register/accept-invite?token=${token}`)
      return
    }

    setAccepting(true)
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const json = await res.json().catch(() => ({}))
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
