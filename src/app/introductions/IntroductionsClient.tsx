'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import AvatarInitials from '@/components/AvatarInitials'

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntroStatus =
  | 'pending'
  | 'responded_positive'
  | 'responded_negative'
  | 'mutual_confirmed'
  | 'admin_pending'
  | 'admin_assigned'
  | 'admin_in_progress'
  | 'admin_completed'
  | 'expired'
  | 'withdrawn'

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
  status: IntroStatus
  created_at: string
  expires_at: string | null
  mutual_at: string | null
  admin_notes: string | null
  target: TargetProfile | null
}

interface ReceivedRequest {
  id: string
  requesting_profile_id: string
  status: IntroStatus
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
  viewerProfile: { id: string; display_initials: string; first_name: string | null; gender: string | null }
  managedProfiles?: ManagedProfile[]
  activeProfileId?: string
  responseTemplates: ResponseTemplate[]
  plan?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_LIMITS: Record<string, number | null> = { free: 1, plus: 2, premium: null }

const MATCH_STATUSES: IntroStatus[] = [
  'mutual_confirmed',
  'admin_pending',
  'admin_assigned',
  'admin_in_progress',
  'admin_completed',
]

const PAST_STATUSES: IntroStatus[] = ['responded_negative', 'expired', 'withdrawn']

// ─── Status badge config ──────────────────────────────────────────────────────

interface BadgeConfig {
  bg: string
  text: string
  label: string
  pulse?: boolean
}

const STATUS_CONFIG: Record<IntroStatus, BadgeConfig> = {
  pending: {
    bg: 'rgba(251,191,36,0.12)',
    text: 'var(--status-warning)',
    label: 'Awaiting response',
  },
  responded_positive: {
    bg: 'rgba(184,150,12,0.14)',
    text: 'var(--gold)',
    label: 'Awaiting confirmation',
  },
  responded_negative: {
    bg: 'var(--surface-3)',
    text: 'var(--text-muted)',
    label: 'Not progressed',
  },
  mutual_confirmed: {
    bg: 'rgba(184,150,12,0.14)',
    text: 'var(--gold)',
    label: 'Mutual interest',
    pulse: true,
  },
  admin_pending: {
    bg: 'rgba(96,165,250,0.12)',
    text: 'var(--status-info)',
    label: 'Admin notified',
  },
  admin_assigned: {
    bg: 'rgba(96,165,250,0.12)',
    text: 'var(--status-info)',
    label: 'Manager assigned',
  },
  admin_in_progress: {
    bg: 'rgba(96,165,250,0.12)',
    text: 'var(--status-info)',
    label: 'Introduction in progress',
  },
  admin_completed: {
    bg: 'rgba(74,222,128,0.12)',
    text: 'var(--status-success)',
    label: 'Introduction complete',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function buildDisplayName(
  first_name: string | null,
  last_name: string | null,
  display_initials: string
): string {
  const name = `${first_name ?? ''} ${last_name ? last_name[0] + '.' : ''}`.trim()
  return name || display_initials
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntroStatus }) {
  const c = STATUS_CONFIG[status]

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
      {c.pulse && (
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

// ─── SentRequestCard ──────────────────────────────────────────────────────────

function SentRequestCard({ req }: { req: IntroRequest }) {
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
  const displayName = target
    ? buildDisplayName(target.first_name, target.last_name, target.display_initials)
    : '—'
  const age = target ? calcAge(target.date_of_birth) : null
  const subline = target
    ? [age !== null ? `${age}` : target.age_display, target.location].filter(Boolean).join(' · ')
    : null

  const days = daysLeft(req.expires_at)
  const isExpiringSoon = days !== null && days <= 5 && days > 0
  const isPast = PAST_STATUSES.includes(req.status)

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: `0.5px solid ${req.status === 'mutual_confirmed' ? 'var(--border-gold)' : 'var(--border-default)'}`,
        borderRadius: 13,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: isPast ? 0.65 : 1,
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

        {req.status === 'pending' && isExpiringSoon && (
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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              padding: '2px 6px',
              border: '0.5px solid var(--border-default)',
              borderRadius: 4,
            }}
          >
            Sent
          </span>
          <StatusBadge status={req.status} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(req.created_at)}</div>
      </div>
    </div>
  )
}

// ─── ReceivedRequestCard ──────────────────────────────────────────────────────

function ReceivedRequestCard({
  req,
  responseTemplates,
  plan,
}: {
  req: ReceivedRequest
  responseTemplates: ResponseTemplate[]
  plan: string
}) {
  const requester = req.requester
  const displayName = requester
    ? buildDisplayName(requester.first_name, requester.last_name, requester.display_initials)
    : '—'
  const subline = requester
    ? [requester.age_display, requester.location].filter(Boolean).join(' · ')
    : null

  const isPast = PAST_STATUSES.includes(req.status)
  const isPending = req.status === 'pending'
  const isFreeUser = plan === 'free'

  // Simple respond state (free users)
  const [simpleSubmitting, setSimpleSubmitting] = useState<'accept' | 'decline' | null>(null)
  const [simpleError, setSimpleError] = useState<string | null>(null)

  // Modal state (plus/premium users)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'positive' | 'decline'>('positive')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const positiveTemplates = responseTemplates
    .filter(t => t.tone === 'positive')
    .sort((a, b) => a.display_order - b.display_order)

  const declineTemplates = responseTemplates
    .filter(t => t.tone === 'decline')
    .sort((a, b) => a.display_order - b.display_order)

  const visibleTemplates = modalTab === 'positive' ? positiveTemplates : declineTemplates
  const selectedTemplate = responseTemplates.find(t => t.id === selectedTemplateId) ?? null

  async function handleSimpleRespond(action: 'accept' | 'decline') {
    setSimpleSubmitting(action)
    setSimpleError(null)
    try {
      const res = await fetch(`/api/introduction-requests/${req.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Something went wrong. Please try again.')
      }
      window.location.reload()
    } catch (err) {
      setSimpleError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSimpleSubmitting(null)
    }
  }

  function openModal() {
    setModalOpen(true)
    setModalTab('positive')
    setSelectedTemplateId(null)
    setModalError(null)
  }

  function closeModal() {
    if (modalSubmitting) return
    setModalOpen(false)
    setSelectedTemplateId(null)
    setModalError(null)
  }

  function handleModalTabChange(tab: 'positive' | 'decline') {
    setModalTab(tab)
    setSelectedTemplateId(null)
  }

  async function handleModalConfirm() {
    if (!selectedTemplate) return
    setModalSubmitting(true)
    setModalError(null)
    try {
      const res = await fetch(`/api/introduction-requests/${req.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedTemplate.id }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Something went wrong. Please try again.')
      }
      window.location.reload()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setModalSubmitting(false)
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
          opacity: isPast ? 0.65 : 1,
        }}
      >
        <AvatarInitials
          initials={requester?.display_initials ?? '??'}
          gender={requester?.gender ?? null}
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
              href={`/profile/${req.requesting_profile_id}`}
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

          {requester?.profession_detail && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {requester.profession_detail}
            </div>
          )}

          {/* Response UI */}
          {isPending && (
            <div style={{ marginTop: 8 }}>
              {isFreeUser ? (
                // Free users: simple Accept / Decline buttons directly on card
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSimpleRespond('accept')}
                      disabled={simpleSubmitting !== null}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 7,
                        border: 'none',
                        background: simpleSubmitting !== null ? 'var(--surface-3)' : 'var(--gold)',
                        color: simpleSubmitting !== null ? 'var(--text-muted)' : 'var(--surface)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: simpleSubmitting !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {simpleSubmitting === 'accept' ? 'Accepting…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleSimpleRespond('decline')}
                      disabled={simpleSubmitting !== null}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 7,
                        border: '0.5px solid var(--border-default)',
                        background: 'transparent',
                        color: simpleSubmitting !== null ? 'var(--text-muted)' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: simpleSubmitting !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {simpleSubmitting === 'decline' ? 'Declining…' : 'Decline'}
                    </button>
                  </div>
                  {simpleError && (
                    <div style={{ fontSize: 11, color: 'var(--status-error)' }}>{simpleError}</div>
                  )}
                </div>
              ) : (
                // Plus/Premium: "Respond" button opens template modal
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
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--gold)',
                padding: '2px 6px',
                border: '0.5px solid var(--border-gold)',
                borderRadius: 4,
              }}
            >
              Received
            </span>
            <StatusBadge status={req.status} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(req.created_at)}</div>
        </div>
      </div>

      {/* Template modal (plus/premium only) */}
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
            padding: 16,
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
            <div style={{ marginBottom: 20 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 4px',
                }}
              >
                Respond to introduction request
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Select a response to send to {displayName}.
              </p>
            </div>

            {/* Tone tabs */}
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
                onClick={() => handleModalTabChange('positive')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border:
                    modalTab === 'positive'
                      ? '1.5px solid var(--gold)'
                      : '1px solid var(--border-default)',
                  background:
                    modalTab === 'positive' ? 'rgba(184,150,12,0.12)' : 'transparent',
                  color: modalTab === 'positive' ? 'var(--gold)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => handleModalTabChange('decline')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border:
                    modalTab === 'decline'
                      ? '1.5px solid var(--status-error)'
                      : '1px solid var(--border-default)',
                  background:
                    modalTab === 'decline' ? 'rgba(239,68,68,0.08)' : 'transparent',
                  color: modalTab === 'decline' ? 'var(--status-error)' : 'var(--text-secondary)',
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
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: '16px 0',
                  }}
                >
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
                        ? modalTab === 'positive'
                          ? 'rgba(184,150,12,0.1)'
                          : 'rgba(239,68,68,0.07)'
                        : 'var(--surface-3)',
                      border: isSelected
                        ? modalTab === 'positive'
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

            {modalError && (
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
                {modalError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={closeModal}
                disabled={modalSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  cursor: modalSubmitting ? 'not-allowed' : 'pointer',
                  padding: '6px 0',
                  textDecoration: 'underline',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleModalConfirm}
                disabled={!selectedTemplateId || modalSubmitting}
                style={{
                  padding: '8px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    !selectedTemplateId || modalSubmitting
                      ? 'var(--surface-3)'
                      : modalTab === 'positive'
                        ? 'var(--gold)'
                        : 'var(--status-error)',
                  color:
                    !selectedTemplateId || modalSubmitting
                      ? 'var(--text-muted)'
                      : modalTab === 'positive'
                        ? 'var(--surface)'
                        : '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !selectedTemplateId || modalSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {modalSubmitting ? 'Sending…' : 'Confirm response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({ req }: { req: IntroRequest }) {
  const target = req.target
  const displayName = target
    ? buildDisplayName(target.first_name, target.last_name, target.display_initials)
    : '—'

  const isCompleted = req.status === 'admin_completed'
  const helpText = isCompleted
    ? 'Your introduction has been facilitated. We hope it goes well.'
    : 'Our admin team is coordinating your introduction. You will hear from us soon.'

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-gold)',
        borderRadius: 13,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'flex-start',
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

        {target?.location && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {target.location}
          </div>
        )}

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: isCompleted ? 'var(--status-success)' : 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {helpText}
        </div>
      </div>

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
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(req.created_at)}</div>
      </div>
    </div>
  )
}

// ─── TabButton ────────────────────────────────────────────────────────────────

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: 999,
        border: active ? '1.5px solid var(--gold)' : '1px solid var(--border-default)',
        background: active ? 'rgba(184,150,12,0.10)' : 'transparent',
        color: active ? 'var(--gold)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {label}
      {count > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            background: active ? 'var(--gold)' : 'var(--surface-3)',
            color: active ? 'var(--surface)' : 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 700,
            padding: '0 5px',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
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
      {text}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  // Derive counts for default tab selection
  const pendingReceivedCount = receivedRequests.filter(r => r.status === 'pending').length
  const defaultTab: 'sent' | 'received' | 'matches' =
    pendingReceivedCount > 0 ? 'received' : 'sent'

  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'matches'>(defaultTab)

  // Active requests = pending sent (awaiting their response)
  const activePendingCount = requests.filter(r => r.status === 'pending').length
  const activeLimit = ACTIVE_LIMITS[plan] ?? null
  const limitReached = activeLimit !== null && activePendingCount >= activeLimit

  // Sent tab partitions
  const activeSent = requests.filter(r => !PAST_STATUSES.includes(r.status) && !MATCH_STATUSES.includes(r.status))
  const pastSent = requests.filter(r => PAST_STATUSES.includes(r.status))

  // Received tab partitions
  const activeReceived = receivedRequests.filter(r => !PAST_STATUSES.includes(r.status))
  const pastReceived = receivedRequests.filter(r => PAST_STATUSES.includes(r.status))

  // Matches tab
  const matchRequests = requests.filter(r => MATCH_STATUSES.includes(r.status))

  // Tab counts (for badge)
  const sentCount = requests.filter(r => !MATCH_STATUSES.includes(r.status)).length
  const receivedCount = receivedRequests.length
  const matchesCount = matchRequests.length

  // Sidebar mutual count
  const mutualCount = requests.filter(r => r.status === 'mutual_confirmed').length

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
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
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
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 18px' }}>
            Respond to received requests, track your sent requests, and view mutual matches.
          </p>

          {/* Active request counter */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 10,
              background: limitReached ? 'rgba(239,68,68,0.08)' : 'var(--surface-2)',
              border: `0.5px solid ${limitReached ? 'var(--status-error)' : 'var(--border-default)'}`,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active requests:</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: limitReached ? 'var(--status-error)' : 'var(--text-primary)',
              }}
            >
              {activePendingCount}
              {activeLimit !== null ? ` / ${activeLimit}` : ''}
            </span>
            {limitReached && (
              <span style={{ fontSize: 11, color: 'var(--status-error)', fontWeight: 500 }}>
                Limit reached — wait for a response or withdraw a request
              </span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <TabButton
            label="Received"
            count={receivedCount}
            active={activeTab === 'received'}
            onClick={() => setActiveTab('received')}
          />
          <TabButton
            label="Sent"
            count={sentCount}
            active={activeTab === 'sent'}
            onClick={() => setActiveTab('sent')}
          />
          <TabButton
            label="Matches"
            count={matchesCount}
            active={activeTab === 'matches'}
            onClick={() => setActiveTab('matches')}
          />
        </div>

        {/* Empty state (only when no activity at all) */}
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

        {/* ── Received tab ── */}
        {activeTab === 'received' && hasAnything && (
          <div>
            {activeReceived.length === 0 && pastReceived.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>
                No received requests yet.
              </div>
            )}

            {activeReceived.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionLabel text={`Received (${activeReceived.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeReceived.map(r => (
                    <ReceivedRequestCard
                      key={r.id}
                      req={r}
                      responseTemplates={responseTemplates}
                      plan={plan}
                    />
                  ))}
                </div>
              </div>
            )}

            {pastReceived.length > 0 && (
              <div>
                <SectionLabel text="Past received" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pastReceived.map(r => (
                    <ReceivedRequestCard
                      key={r.id}
                      req={r}
                      responseTemplates={responseTemplates}
                      plan={plan}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sent tab ── */}
        {activeTab === 'sent' && hasAnything && (
          <div>
            {activeSent.length === 0 && pastSent.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>
                No sent requests yet.{' '}
                <Link href="/browse" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                  Browse profiles
                </Link>{' '}
                to send an introduction.
              </div>
            )}

            {activeSent.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionLabel text={`Sent (${activeSent.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeSent.map(r => (
                    <SentRequestCard key={r.id} req={r} />
                  ))}
                </div>
              </div>
            )}

            {pastSent.length > 0 && (
              <div>
                <SectionLabel text="Past sent" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pastSent.map(r => (
                    <SentRequestCard key={r.id} req={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Matches tab ── */}
        {activeTab === 'matches' && hasAnything && (
          <div>
            {matchRequests.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>
                No matches yet. When both parties express interest, it will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matchRequests.map(r => (
                  <MatchCard key={r.id} req={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
