'use client'

import { useState } from 'react'
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
  first_name: string | null
  last_name: string | null
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

interface ResponseTemplate {
  id: string
  tone: 'positive' | 'decline'
  text: string
  display_order: number
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
  responseTemplates: ResponseTemplate[]
  plan?: string
}

const ACTIVE_LIMITS: Record<string, number | null> = { free: 1, plus: 2, premium: null }

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
      text: 'var(--status-warning)',
      label: 'Pending',
    },
    mutual: {
      bg: 'var(--gold-muted)',
      text: 'var(--gold)',
      label: 'Mutual interest',
    },
    active: {
      bg: 'rgba(74,222,128,0.12)',
      text: 'var(--status-success)',
      label: 'Active',
    },
    facilitated: {
      bg: 'rgba(96,165,250,0.12)',
      text: 'var(--status-info)',
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
    declined: {
      bg: 'var(--surface-3)',
      text: 'var(--status-error)',
      label: 'Not progressed',
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
  const [withdrawing, setWithdrawing] = useState(false)

  async function handleWithdraw() {
    if (!confirm('Withdraw this introduction request?')) return
    setWithdrawing(true)
    try {
      const res = await fetch(`/api/introduction-requests/${req.id}/withdraw`, { method: 'POST' })
      if (res.ok) window.location.reload()
    } finally {
      setWithdrawing(false)
    }
  }

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
          <Link
            href={`/profile/${req.target_profile_id}`}
            style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}
          >
            {displayName}
          </Link>
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
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--status-warning)' }}>
            Expires in {days} {days === 1 ? 'day' : 'days'}
          </div>
        )}

        {req.status === 'pending' && (
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            style={{
              marginTop: 8,
              padding: '4px 12px',
              borderRadius: 6,
              border: '0.5px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 11,
              cursor: withdrawing ? 'not-allowed' : 'pointer',
            }}
          >
            {withdrawing ? 'Withdrawing…' : 'Withdraw'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', padding: '2px 6px', border: '0.5px solid var(--border-default)', borderRadius: 4 }}>Sent</span>
          <StatusBadge status={req.status} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatDate(req.created_at)}
        </div>
      </div>
    </div>
  )
}

function ReceivedRequestCard({
  req,
  responseTemplates,
}: {
  req: ReceivedRequest
  responseTemplates: ResponseTemplate[]
}) {
  const requester = req.requester
  const displayName = requester
    ? `${requester.first_name ?? ''} ${requester.last_name ? requester.last_name[0] + '.' : ''}`.trim() ||
      requester.display_initials
    : '—'
  const subline = requester
    ? [requester.age_display, requester.location].filter(Boolean).join(' · ')
    : null
  const isActive = req.status === 'pending'

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'positive' | 'decline'>('positive')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const positiveTemplates = responseTemplates
    .filter(t => t.tone === 'positive')
    .sort((a, b) => a.display_order - b.display_order)

  const declineTemplates = responseTemplates
    .filter(t => t.tone === 'decline')
    .sort((a, b) => a.display_order - b.display_order)

  const visibleTemplates = activeTab === 'positive' ? positiveTemplates : declineTemplates

  const selectedTemplate = responseTemplates.find(t => t.id === selectedTemplateId) ?? null

  function openModal() {
    setModalOpen(true)
    setActiveTab('positive')
    setSelectedTemplateId(null)
    setSubmitError(null)
  }

  function closeModal() {
    if (submitting) return
    setModalOpen(false)
    setSelectedTemplateId(null)
    setSubmitError(null)
  }

  function handleTabChange(tab: 'positive' | 'decline') {
    setActiveTab(tab)
    setSelectedTemplateId(null)
  }

  async function handleConfirm() {
    if (!selectedTemplate) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/introduction-requests/${req.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: selectedTemplate.tone, text: selectedTemplate.text }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Something went wrong. Please try again.')
      }

      window.location.reload()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
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
            <Link
              href={`/profile/${req.requesting_profile_id}`}
              style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}
            >
              {displayName}
            </Link>
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
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button
                onClick={openModal}
                style={{
                  padding: '5px 14px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'var(--gold)',
                  color: 'var(--surface)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Respond
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold)', padding: '2px 6px', border: '0.5px solid var(--border-gold)', borderRadius: 4 }}>Received</span>
            <StatusBadge status={req.status} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {formatDate(req.created_at)}
          </div>
        </div>
      </div>

      {/* Response modal */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface-2)',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              border: '0.5px solid var(--border-default)',
            }}
          >
            {/* Modal header */}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Respond to introduction request
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Select a response to send to {displayName}.
              </p>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 16,
                borderBottom: '1px solid var(--border-default)',
                paddingBottom: 12,
              }}
            >
              <button
                onClick={() => handleTabChange('positive')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: activeTab === 'positive' ? '1.5px solid var(--gold)' : '1px solid var(--border-default)',
                  background: activeTab === 'positive' ? 'rgba(184,150,12,0.12)' : 'transparent',
                  color: activeTab === 'positive' ? 'var(--gold)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => handleTabChange('decline')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: activeTab === 'decline' ? `1.5px solid var(--status-error)` : '1px solid var(--border-default)',
                  background: activeTab === 'decline' ? 'rgba(239,68,68,0.08)' : 'transparent',
                  color: activeTab === 'decline' ? 'var(--status-error)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Decline
              </button>
            </div>

            {/* Template list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {visibleTemplates.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  No templates available.
                </p>
              )}
              {visibleTemplates.map(template => {
                const isSelected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    style={{
                      background: isSelected
                        ? activeTab === 'positive'
                          ? 'rgba(184,150,12,0.1)'
                          : 'rgba(239,68,68,0.07)'
                        : 'var(--surface-3)',
                      border: isSelected
                        ? activeTab === 'positive'
                          ? '1.5px solid var(--gold)'
                          : '1.5px solid var(--status-error)'
                        : '1px solid var(--border-default)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {template.text}
                  </button>
                )
              })}
            </div>

            {/* Error */}
            {submitError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid var(--status-error)',
                  color: 'var(--status-error)',
                  fontSize: 12,
                }}
              >
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={closeModal}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  padding: '6px 0',
                  textDecoration: 'underline',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedTemplateId || submitting}
                style={{
                  padding: '8px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    !selectedTemplateId || submitting
                      ? 'var(--surface-3)'
                      : activeTab === 'positive'
                        ? 'var(--gold)'
                        : 'var(--status-error)',
                  color:
                    !selectedTemplateId || submitting
                      ? 'var(--text-muted)'
                      : activeTab === 'positive'
                        ? 'var(--surface)'
                        : '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !selectedTemplateId || submitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {submitting ? 'Sending…' : 'Confirm response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function IntroductionsClient({
  requests,
  receivedRequests,
  shortlistCount,
  viewerProfile,
  managedProfiles,
  activeProfileId,
  responseTemplates,
  plan = 'free',
}: IntroductionsClientProps) {
  // Active = pending requests sent by me (awaiting response)
  const activePendingCount = requests.filter(r => r.status === 'pending').length
  const activeLimit = ACTIVE_LIMITS[plan] ?? null // null = unlimited

  const activeSent = requests.filter(r =>
    ['pending', 'mutual', 'active', 'facilitated'].includes(r.status)
  )
  const pastSent = requests.filter(r => ['expired', 'withdrawn', 'declined'].includes(r.status))

  const activeReceived = receivedRequests.filter(r => r.status === 'pending')
  const pastReceived = receivedRequests.filter(r =>
    ['expired', 'withdrawn', 'declined'].includes(r.status)
  )

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
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
            }}
          >
            Introductions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Respond to received requests, track your sent requests, and view mutual matches.
          </p>

          {/* Active request counter */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 10,
            background: activeLimit !== null && activePendingCount >= activeLimit
              ? 'rgba(239,68,68,0.08)'
              : 'var(--surface-2)',
            border: `0.5px solid ${activeLimit !== null && activePendingCount >= activeLimit ? 'var(--status-error)' : 'var(--border-default)'}`,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active requests:</span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: activeLimit !== null && activePendingCount >= activeLimit ? 'var(--status-error)' : 'var(--text-primary)',
            }}>
              {activePendingCount}{activeLimit !== null ? ` / ${activeLimit}` : ''}
            </span>
            {activeLimit !== null && activePendingCount >= activeLimit && (
              <span style={{ fontSize: 11, color: 'var(--status-error)', fontWeight: 500 }}>
                Limit reached — wait for a response or withdraw a request
              </span>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!hasAnything && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border-default)',
              borderLeft: '3px solid var(--border-gold)',
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
                color: 'var(--surface)',
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
                <ReceivedRequestCard key={r.id} req={r} responseTemplates={responseTemplates} />
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
              Sent ({activeSent.length})
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
                <ReceivedRequestCard key={r.id} req={r} responseTemplates={responseTemplates} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
