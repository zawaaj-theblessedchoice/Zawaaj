'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

interface FamilyAccount {
  id: string
  contact_full_name: string | null
  contact_email: string | null
  contact_number: string | null
  contact_relationship: string | null
  readiness_state: string
}

interface ProfileSnippet {
  display_initials: string
  gender: string | null
  first_name: string | null
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  father:        'Father',
  mother:        'Mother',
  brother:       'Brother',
  sister:        'Sister',
  uncle:         'Uncle',
  aunt:          'Aunt',
  guardian:      'Guardian',
  self:          'Self',
}

export default function RepresentativePage() {
  const router = useRouter()
  const [fa, setFa] = useState<FamilyAccount | null>(null)
  const [profile, setProfile] = useState<ProfileSnippet | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Load profile snippet for Sidebar
      const { data: profileData } = await supabase
        .from('zawaaj_profiles')
        .select('display_initials, gender, first_name')
        .eq('user_id', user.id)
        .maybeSingle()
      setProfile(profileData ?? null)

      const { data, error } = await supabase
        .from('zawaaj_family_accounts')
        .select('id, contact_full_name, contact_email, contact_number, contact_relationship, readiness_state')
        .eq('primary_user_id', user.id)
        .maybeSingle()

      if (error || !data) {
        // No family account — page not relevant, send to settings
        router.replace('/settings')
        return
      }

      // If rep is already linked, this page is no longer needed
      if (data.readiness_state === 'representative_linked' || data.readiness_state === 'intro_ready') {
        router.replace('/settings')
        return
      }

      setFa(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSend() {
    setSending(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/family/resend-rep-invite', { method: 'POST' })
      const json = await res.json() as { success?: boolean; invited_email?: string; error?: string }
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? 'Something went wrong. Please try again.')
      } else {
        setSuccessMsg(`Invitation sent to ${json.invited_email}`)
        // Optimistically flip readiness_state in local state
        setFa(prev => prev ? { ...prev, readiness_state: 'representative_invited' } : prev)
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute="/settings" shortlistCount={0} introRequestsCount={0} profile={profile} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
        </main>
      </div>
    )
  }

  if (!fa) return null

  const alreadyInvited = fa.readiness_state === 'representative_invited'
  const relationshipLabel = fa.contact_relationship
    ? (RELATIONSHIP_LABELS[fa.contact_relationship] ?? fa.contact_relationship)
    : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar activeRoute="/settings" shortlistCount={0} introRequestsCount={0} profile={profile} />

      <main style={{
        flex: 1,
        padding: '32px 24px',
        maxWidth: 560,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>

        {/* Back link */}
        <a
          href="/settings"
          style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}
        >
          ← Back to settings
        </a>

        {/* Heading */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Your family representative
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 28px' }}>
          Your representative needs to accept their invitation before you can express interest in other profiles.
        </p>

        {/* Guardian details card */}
        <div style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 14px' }}>
            Stored representative details
          </p>

          {/* Name */}
          {fa.contact_full_name && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 90 }}>Name</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{fa.contact_full_name}</span>
            </div>
          )}

          {/* Email */}
          {fa.contact_email && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 90 }}>Email</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fa.contact_email}</span>
            </div>
          )}

          {/* Phone */}
          {fa.contact_number && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 90 }}>Phone</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fa.contact_number}</span>
            </div>
          )}

          {/* Relationship */}
          {relationshipLabel && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 90 }}>Relationship</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{relationshipLabel}</span>
            </div>
          )}
        </div>

        {/* Status + action card */}
        <div style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 16,
          padding: 20,
        }}>
          {/* Status badge */}
          {alreadyInvited && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20, marginBottom: 16,
              background: 'rgba(234,179,8,0.12)', border: '0.5px solid rgba(202,138,4,0.4)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#ca8a04' }}>Invite sent</span>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.3)',
              fontSize: 12.5, color: 'var(--status-success)', lineHeight: 1.5,
            }}>
              {successMsg}
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)',
              fontSize: 12.5, color: 'var(--status-error)', lineHeight: 1.5,
            }}>
              {errorMsg}
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--gold)',
              border: 'none',
              color: 'var(--surface)',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.65 : 1,
              transition: 'opacity 0.15s',
              marginBottom: 10,
            }}
          >
            {sending ? 'Sending…' : alreadyInvited ? 'Resend invitation' : 'Send invitation'}
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {alreadyInvited
              ? "Didn't receive it? Send the invite again."
              : "We'll email your representative with a link to join your account."}
          </p>
        </div>

        {/* Contact support note */}
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 20, textAlign: 'center' }}>
          Need to change the representative&apos;s details?{' '}
          <a href="/help" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Contact support →</a>
        </p>

      </main>
    </div>
  )
}
