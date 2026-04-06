'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import AvatarInitials from '@/components/AvatarInitials'

interface TargetProfile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  location: string | null
  profession_detail: string | null
  age_display: string | null
  date_of_birth: string | null
}

interface IntroRequest {
  id: string
  target_profile_id: string
  status: string
  created_at: string
  expires_at: string | null
  mutual_at: string | null
  admin_notes: string | null
  target: TargetProfile | null
}

interface IntroductionsClientProps {
  requests: IntroRequest[]
  viewerProfile: {
    id: string
    display_initials: string
    first_name: string | null
    gender: string | null
  }
}

function calcAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: {
      bg: 'rgba(251,191,36,0.12)',
      text: '#FBBF24',
      label: 'Pending',
    },
    mutual: {
      bg: 'var(--gold-muted)',
      text: 'var(--gold)',
      label: 'Mutual interest',
    },
    active: {
      bg: 'rgba(74,222,128,0.12)',
      text: '#4ADE80',
      label: 'Active',
    },
    facilitated: {
      bg: 'rgba(96,165,250,0.12)',
      text: '#60A5FA',
      label: 'Introduced',
    },
    expired: {
      bg: 'var(--surface-3)',
      text: 'var(--text-muted)',
      label: 'Expired',
    },
  }

  const c = config[status] ?? { bg: 'var(--surface-3)', text: 'var(--text-muted)', label: status }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        background: c.bg,
        color: c.text,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {status === 'mutual' && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--gold)',
            display: 'inline-block',
          }}
        />
      )}
      {c.label}
    </span>
  )
}

function RequestCard({ req }: { req: IntroRequest }) {
  const target = req.target
  const age = target ? calcAge(target.date_of_birth) : null
  const displayName = target
    ? `${target.first_name ?? ''} ${target.last_name ? target.last_name[0] + '.' : ''}`.trim() ||
      target.display_initials
    : '—'
  const subline = target
    ? [age !== null ? `${age}` : target.age_display, target.location]
        .filter(Boolean)
        .join(' · ')
    : null

  const days = daysLeft(req.expires_at)
  const isExpiringSoon = days !== null && days <= 5 && days > 0
  const isActive = req.status === 'pending' || req.status === 'mutual' || req.status === 'active'

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: `0.5px solid ${req.status === 'mutual' ? 'var(--border-gold)' : 'var(--border-default)'}`,
        borderRadius: 13,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Avatar */}
      <AvatarInitials
        initials={target?.display_initials ?? '??'}
        gender={target?.gender ?? null}
        size="sm"
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </div>
        {subline && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subline}
          </div>
        )}
        {target?.profession_detail && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {target.profession_detail}
          </div>
        )}

        {/* Mutual message */}
        {req.status === 'mutual' && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--gold)',
              lineHeight: 1.5,
            }}
          >
            Interest is mutual — the admin team will be in touch to facilitate an introduction.
          </div>
        )}

        {/* Admin notes (once facilitated) */}
        {req.status === 'facilitated' && req.admin_notes && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            {req.admin_notes}
          </div>
        )}

        {/* Expiry warning */}
        {isActive && isExpiringSoon && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: '#FBBF24',
            }}
          >
            Expires in {days} {days === 1 ? 'day' : 'days'}
          </div>
        )}
      </div>

      {/* Right side: status + date */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <StatusBadge status={req.status} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatDate(req.created_at)}
        </div>
      </div>
    </div>
  )
}

export default function IntroductionsClient({
  requests,
  viewerProfile,
}: IntroductionsClientProps) {
  const active = requests.filter(r =>
    ['pending', 'mutual', 'active', 'facilitated'].includes(r.status)
  )
  const past = requests.filter(r => r.status === 'expired')

  const mutualCount = requests.filter(r => r.status === 'mutual').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute="/introductions"
        shortlistCount={0}
        introRequestsCount={mutualCount}
        profile={viewerProfile}
      />

      <main
        style={{
          marginLeft: 200,
          flex: 1,
          padding: '28px 28px 60px',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
            }}
          >
            Introductions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Introduction requests you have sent. You can send up to 5 per calendar month.
          </p>
        </div>

        {/* Empty state */}
        {requests.length === 0 && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 13,
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--text-muted)',
                marginBottom: 16,
              }}
            >
              You haven&apos;t sent any introduction requests yet.
            </div>
            <Link
              href="/browse"
              style={{
                display: 'inline-block',
                padding: '8px 18px',
                borderRadius: 8,
                background: 'var(--gold)',
                color: '#1A1A18',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Browse profiles
            </Link>
          </div>
        )}

        {/* Active / current requests */}
        {active.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}
            >
              Active requests
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.map(r => (
                <RequestCard key={r.id} req={r} />
              ))}
            </div>
          </div>
        )}

        {/* Past requests */}
        {past.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}
            >
              Past requests
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {past.map(r => (
                <RequestCard key={r.id} req={r} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
