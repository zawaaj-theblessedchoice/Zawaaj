'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import AvatarInitials from '@/components/AvatarInitials'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'

// ─── Types ────────────────────────────────────────────────────────────────────

// Family Model v2 — status enum aligned with DB CHECK constraint (migration 019)
export type IntroStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn'

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
  no_female_contact_flag?: boolean | null
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
  assigned_manager_name?: string | null
}

interface ReceivedRequest {
  id: string
  requesting_profile_id: string
  status: IntroStatus
  created_at: string
  expires_at: string | null
  response_deadline: string | null
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

// 'accepted' = team will facilitate introduction
const MATCH_STATUSES: IntroStatus[] = ['accepted']

const PAST_STATUSES: IntroStatus[] = ['declined', 'expired', 'withdrawn']

// ─── Status badge config ──────────────────────────────────────────────────────

interface BadgeConfig {
  bg: string
  text: string
  label: string
  pulse?: boolean
}

const STATUS_CONFIG: Record<IntroStatus, BadgeConfig> = {
  pending: {
    bg: 'var(--status-warning-bg)',
    text: 'var(--status-warning)',
    label: "Awaiting family's response",
  },
  accepted: {
    bg: 'var(--gold-muted)',
    text: 'var(--gold)',
    label: 'Accepted — team notified',
    pulse: true,
  },
  declined: {
    bg: 'var(--surface-3)',
    text: 'var(--text-muted)',
    label: 'Not progressed',
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
    if (!confirm('Withdraw this interest?')) return
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
        border: `0.5px solid ${MATCH_STATUSES.includes(req.status) ? 'var(--border-gold)' : 'var(--border-default)'}`,
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
            Response expected within {days} {days === 1 ? 'day' : 'days'}
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
          <StatusBadge status={req.status} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sent {formatDate(req.created_at)}</div>
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
  const planConfig = getPlanConfig((plan ?? 'free') as Plan)
  const isFreeUser = !planConfig.canUseTemplates
  // 7-day response deadline — shown prominently on pending received requests
  const deadlineDays = daysLeft(req.response_deadline ?? req.expires_at)

  // ── Free user state ────────────────────────────────────────────────────────
  const [simpleSubmitting, setSimpleSubmitting] = useState<'accept' | 'decline' | null>(null)
  const [simpleError, setSimpleError] = useState<string | null>(null)

  // ── Plus/Premium grouped response state ────────────────────────────────────
  type ResponseGroup = 'proceed' | 'needtime' | 'decline'
  const [expandedGroup, setExpandedGroup] = useState<ResponseGroup | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateSubmitting, setTemplateSubmitting] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // Group templates by display_order (fixed seeded data: 1-5 = proceed, 6-7 = needtime, 8-10 = decline)
  const SHORT_LABELS: Record<number, string> = {
    1: 'Request meeting', 2: 'Suggest event', 3: 'Request call',
    4: 'Involve family', 5: 'Request more info',
    6: 'Need more time', 7: 'Revisit later',
    8: 'Respectful decline', 9: 'Not in position', 10: 'Do not proceed',
  }
  const proceedTemplates  = responseTemplates.filter(t => t.tone === 'positive' && t.display_order <= 5).sort((a, b) => a.display_order - b.display_order)
  const needtimeTemplates = responseTemplates.filter(t => t.tone === 'positive' && t.display_order >= 6).sort((a, b) => a.display_order - b.display_order)
  const declineTemplates  = responseTemplates.filter(t => t.tone === 'decline').sort((a, b) => a.display_order - b.display_order)

  const groupTemplates: Record<ResponseGroup, typeof responseTemplates> = {
    proceed: proceedTemplates, needtime: needtimeTemplates, decline: declineTemplates,
  }
  const selectedTemplate = responseTemplates.find(t => t.id === selectedTemplateId) ?? null

  function toggleGroup(g: ResponseGroup) {
    setExpandedGroup(prev => prev === g ? null : g)
    setSelectedTemplateId(null)
    setTemplateError(null)
  }

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

  async function handleTemplateConfirm() {
    if (!selectedTemplate) return
    setTemplateSubmitting(true)
    setTemplateError(null)
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
      setTemplateError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setTemplateSubmitting(false)
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

          {/* Male guardian flag note */}
          {requester?.no_female_contact_flag === true && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: 5,
                background: 'var(--surface-3)',
                border: '0.5px solid var(--border-default)',
                display: 'inline-block',
              }}
            >
              Note: this family&apos;s primary contact is a male guardian.
            </div>
          )}

          {/* Response UI */}
          {isPending && (
            <div style={{ marginTop: 8 }}>
              {isFreeUser ? (
                // ── Free: simple Accept / Decline ──────────────────────────
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSimpleRespond('accept')}
                      disabled={simpleSubmitting !== null}
                      style={{
                        padding: '5px 14px', borderRadius: 7, border: 'none',
                        background: simpleSubmitting !== null ? 'var(--surface-3)' : 'var(--gold)',
                        color: simpleSubmitting !== null ? 'var(--text-muted)' : 'var(--surface)',
                        fontSize: 12, fontWeight: 600,
                        cursor: simpleSubmitting !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {simpleSubmitting === 'accept' ? 'Accepting…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleSimpleRespond('decline')}
                      disabled={simpleSubmitting !== null}
                      style={{
                        padding: '5px 14px', borderRadius: 7,
                        border: '0.5px solid var(--border-default)', background: 'transparent',
                        color: simpleSubmitting !== null ? 'var(--text-muted)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 500,
                        cursor: simpleSubmitting !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {simpleSubmitting === 'decline' ? 'Declining…' : 'Decline'}
                    </button>
                  </div>
                  {simpleError && <div style={{ fontSize: 11, color: 'var(--status-error)' }}>{simpleError}</div>}
                </div>
              ) : (
                // ── Plus/Premium: grouped response buttons ─────────────────
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {/* Primary group buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(
                      [
                        { key: 'proceed' as const,  label: 'Proceed',    accent: 'var(--gold)',          accentBg: 'var(--gold-muted)' },
                        { key: 'needtime' as const, label: 'Need time',  accent: 'var(--text-secondary)', accentBg: 'var(--surface-3)' },
                        { key: 'decline' as const,  label: 'Decline',    accent: 'var(--status-error)',   accentBg: 'var(--status-error-bg)' },
                      ] as { key: ResponseGroup; label: string; accent: string; accentBg: string }[]
                    ).map(({ key, label, accent, accentBg }) => (
                      <button
                        key={key}
                        onClick={() => toggleGroup(key)}
                        style={{
                          padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: expandedGroup === key ? `1.5px solid ${accent}` : '0.5px solid var(--border-default)',
                          background: expandedGroup === key ? accentBg : 'transparent',
                          color: expandedGroup === key ? accent : 'var(--text-secondary)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {label} {expandedGroup === key ? '▲' : '▼'}
                      </button>
                    ))}
                  </div>

                  {/* Expanded template group */}
                  {expandedGroup !== null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {groupTemplates[expandedGroup].map(t => {
                        const isSelected = selectedTemplateId === t.id
                        const isDecline = t.tone === 'decline'
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTemplateId(isSelected ? null : t.id)}
                            style={{
                              textAlign: 'left', borderRadius: 8, padding: '8px 12px',
                              border: isSelected
                                ? `1.5px solid ${isDecline ? 'var(--status-error)' : 'var(--gold)'}`
                                : '0.5px solid var(--border-default)',
                              background: isSelected
                                ? (isDecline ? 'var(--status-error-bg)' : 'var(--gold-muted)')
                                : 'var(--surface-3)',
                              cursor: 'pointer', transition: 'all 0.13s',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                              {SHORT_LABELS[t.display_order] ?? `Option ${t.display_order}`}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                              {t.text}
                            </div>
                          </button>
                        )
                      })}

                      {/* Confirm button — appears once a template is selected */}
                      {selectedTemplateId && (
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            onClick={handleTemplateConfirm}
                            disabled={templateSubmitting}
                            style={{
                              padding: '6px 18px', borderRadius: 7, border: 'none',
                              background: expandedGroup === 'decline' ? 'var(--status-error)' : 'var(--gold)',
                              color: 'var(--surface)', fontSize: 12, fontWeight: 600,
                              cursor: templateSubmitting ? 'not-allowed' : 'pointer',
                              opacity: templateSubmitting ? 0.6 : 1,
                            }}
                          >
                            {templateSubmitting ? 'Sending…' : 'Confirm response'}
                          </button>
                          <button
                            onClick={() => setSelectedTemplateId(null)}
                            disabled={templateSubmitting}
                            style={{
                              background: 'none', border: 'none', fontSize: 12,
                              color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {templateError && <div style={{ fontSize: 11, color: 'var(--status-error)' }}>{templateError}</div>}
                    </div>
                  )}
                </div>
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
          {isPending && deadlineDays !== null && (
            <div style={{ fontSize: 11, color: deadlineDays <= 2 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
              {deadlineDays === 0 ? 'Expires today' : `${deadlineDays} day${deadlineDays !== 1 ? 's' : ''} to respond`}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(req.created_at)}</div>
        </div>
      </div>

    </>
  )
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({ req }: { req: IntroRequest }) {
  const target = req.target
  const displayName = target
    ? buildDisplayName(target.first_name, target.last_name, target.display_initials)
    : '—'

  const helpText = 'Your interest has been accepted. Our team is coordinating the introduction — you will hear from us soon, in shaa Allah.'

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
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {helpText}
        </div>

        {req.assigned_manager_name && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            Handled by {req.assigned_manager_name}
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
        background: active ? 'var(--gold-muted)' : 'transparent',
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
  // Priority: accepted matches > pending received > sent
  const matchCount = requests.filter(r => MATCH_STATUSES.includes(r.status)).length
  const pendingReceivedCount = receivedRequests.filter(r => r.status === 'pending').length
  const defaultTab: 'sent' | 'received' | 'matches' =
    matchCount > 0 ? 'matches' :
    pendingReceivedCount > 0 ? 'received' : 'sent'

  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'matches'>(defaultTab)

  // Active requests = pending sent (awaiting their response)
  const activePendingCount = requests.filter(r => r.status === 'pending').length
  const activePlanConfig = getPlanConfig((plan ?? 'free') as Plan)
  const activeLimit = activePlanConfig.activeLimit === Infinity ? null : activePlanConfig.activeLimit
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

  // Sidebar mutual count — accepted (team notified)
  const mutualCount = requests.filter(r => MATCH_STATUSES.includes(r.status)).length

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
            Respond to introductions and track your progress here.
          </p>

          {/* Active request counter */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 10,
              background: limitReached ? 'var(--status-error-bg)' : 'var(--surface-2)',
              border: `0.5px solid ${limitReached ? 'var(--status-error)' : 'var(--border-default)'}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: limitReached ? 500 : 400,
                color: limitReached ? 'var(--status-error)' : 'var(--text-muted)',
              }}
            >
              {activePendingCount === 0
                ? 'No active introductions awaiting a response'
                : `You have ${activePendingCount} active introduction${activePendingCount !== 1 ? 's' : ''} awaiting a response`}
              {activeLimit !== null ? ` (limit: ${activeLimit})` : ''}
            </span>
            {limitReached && (
              <span style={{ fontSize: 11, color: 'var(--status-error)', fontWeight: 500 }}>
                — withdraw a request to send another
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

        {/* ── Received tab ── */}
        {activeTab === 'received' && (
          <div>
            {activeReceived.length === 0 && pastReceived.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>
                <div>You don&apos;t have any introductions to respond to yet. When someone expresses interest, it will appear here.</div>
                <Link
                  href="/browse"
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    fontSize: 12,
                    color: 'var(--gold)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Browse profiles →
                </Link>
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
        {activeTab === 'sent' && (
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
        {activeTab === 'matches' && (
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
