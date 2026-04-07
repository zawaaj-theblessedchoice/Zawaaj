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

interface RequesterProfile {
  id: string
  display_initials: string
  gender: string | null
  age_display: string | null
  location: string | null
  profession_detail: string | null
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

interface ReceivedRequest {
  id: string
  requesting_profile_id: string
  status: string
  created_at: string
  expires_at: string | null
  requester: RequesterProfile | null
}

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

interface IntroductionsClientProps {
  requests: IntroRequest[]
  receivedRequests: ReceivedRequest[]
  shortlistCount: number
  viewerProfile: {
    id: string
    display_initials: string
    first_name: string | null
    gender: string | null
  }
  managedProfiles?: ManagedProfile[]
  activeProfileId?: string
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
    withdrawn: {
      bg: 'var(--surface-3)',
      text: 'var(--text-muted)',
      label: 'Withdrawn',
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
      <AvatarInitials
        initials={target?.display_initials ?? '??'}
        gender={target?.gender ?? null}
        size="sm"
      />

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

        {req.status === 'mutual' && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gold)', lineHeight: 1.5 }}>
            Interest is mutual — the admin team will be in touch to facilitate an introduction.
          </div>
        )}

        {req.status === 'facilitated' && req.admin_notes && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
            {req.admin_notes}
          </div>
        )}

        {isActive && isExpiringSoon && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#FBBF24' }}>
            Expires in {days} {days === 1 ? 'day' : 'days'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <StatusBadge status={req.status} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatDate(req.created_at)}
        </div>
      </div>
    </div>
  )
}

function ReceivedRequestCard({ req }: { req: ReceivedRequest }) {
  const requester = req.requester
  const subline = requester
    ? [requester.age_display, requester.location].filter(Boolean).join(' · ')
    : null
  const isActive = req.status === 'pending'

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 13,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: isActive ? 1 : 0.65,
      }}
    >
      <AvatarInitials
        initials={requester?.display_initials ?? '??'}
        gender={requester?.gender ?? null}
        size="sm"
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
          {requester?.display_initials ?? '—'}
        </div>
        {subline && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subline}
          </div>
        )}
        {requester?.profession_detail && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            {requester.profession_detail}
          </div>
        )}
        {isActive && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This member has expressed interest in you. Our admin team will reach out if appropriate.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
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
  receivedRequests,
  shortlistCount,
  viewerProfile,
  managedProfiles,
  activeProfileId,
}: IntroductionsClientProps) {
  const activeSent = requests.filter(r =>
    ['pending', 'mutual', 'active', 'facilitated'].includes(r.status)
  )
  const pastSent = requests.filter(r => ['expired', 'withdrawn'].includes(r.status))

  const activeReceived = receivedRequests.filter(r => r.status === 'pending')
  const pastReceived = receivedRequests.filter(r => ['expired', 'withdrawn'].includes(r.status))

  const mutualCount = requests.filter(r => r.status === 'mutual').length

  const hasAnything = requests.length > 0 || receivedRequests.length > 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute="/introductions"
        shortlistCount={shortlistCount}
        introRequestsCount={mutualCount}
        profile={viewerProfile}
        managedProfiles={managedProfiles}
        activeProfileId={activeProfileId}
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
            Track your sent and received introduction requests. You can send up to 5 per calendar month.
          </p>
        </div>

        {/* Empty state */}
        {!hasAnything && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 13,
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              No introduction activity yet.
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

        {/* Received — active */}
        {activeReceived.length > 0 && (
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
              Received ({activeReceived.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeReceived.map(r => (
                <ReceivedRequestCard key={r.id} req={r} />
              ))}
            </div>
          </div>
        )}

        {/* Sent — active */}
        {activeSent.length > 0 && (
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
              Sent — active
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeSent.map(r => (
                <RequestCard key={r.id} req={r} />
              ))}
            </div>
          </div>
        )}

        {/* Past sent */}
        {pastSent.length > 0 && (
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
              Sent — past
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastSent.map(r => (
                <RequestCard key={r.id} req={r} />
              ))}
            </div>
          </div>
        )}

        {/* Past received */}
        {pastReceived.length > 0 && (
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
              Received — past
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastReceived.map(r => (
                <ReceivedRequestCard key={r.id} req={r} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
