'use client'

import { ProfileRow, updateAdminNotes, isContactComplete } from '@/lib/admin/operationsQueries'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { StatusBadge } from './OperationsTable'

interface ProfilePanelProps {
  profile: ProfileRow | null
  onClose: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onNotesUpdate: (id: string, notes: string) => void
  onStartIntro: (id: string) => void
}

// ─── Claim status from API ────────────────────────────────────────────────────

interface ClaimStatus {
  has_pending_token: boolean
  claim_link: string | null
  token_created_at: string | null
  token_expires_at: string | null
}

// ─── WhatsApp copy templates ──────────────────────────────────────────────────

function buildWhatsAppTemplate(link: string | null, isReminder: boolean): string {
  if (isReminder) {
    return `Assalamu alaikum. A gentle reminder that your Zawaaj family account is ready to activate. ${link ?? '[link pending]'} Your existing details have already been preserved.`
  }
  return `Assalamu alaikum. Your existing Zawaaj family profile has been securely transferred to our new platform. Please activate your access here: ${link ?? '[link pending]'} This should only take a couple of minutes, in shaa Allah.`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--admin-muted)',
        marginBottom: 10,
        margin: '0 0 10px 0',
      }}
    >
      {children}
    </p>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--admin-muted)', width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--admin-text)', flex: 1 }}>{value}</span>
    </div>
  )
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function Badge({
  label,
  color,
}: {
  label: string
  color: 'amber' | 'blue' | 'red' | 'green' | 'muted'
}) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    amber: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.35)', text: '#ca8a04' },
    blue:  { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.35)', text: '#60a5fa' },
    red:   { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.35)', text: '#f87171' },
    green: { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.35)', text: '#4ade80' },
    muted: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', text: 'var(--admin-muted)' },
  }
  const s = styles[color]
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}

function ActionBtn({
  label,
  onClick,
  busy,
  variant = 'default',
}: {
  label: string
  onClick: () => void
  busy?: boolean
  variant?: 'default' | 'danger' | 'success' | 'gold'
}) {
  const styles = {
    default: { bg: 'rgba(255,255,255,0.05)', border: 'var(--admin-border)', color: 'var(--admin-text)' },
    danger:  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
    success: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.3)', color: '#4ade80' },
    gold:    { bg: 'rgba(184,150,12,0.1)', border: 'rgba(184,150,12,0.3)', color: 'var(--gold)' },
  }
  const s = styles[variant]
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      {busy ? '…' : label}
    </button>
  )
}

// ─── ProfilePanel ─────────────────────────────────────────────────────────────

export function ProfilePanel({
  profile,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onNotesUpdate,
  onStartIntro,
}: ProfilePanelProps) {
  const supabase = createClient()
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Activation state
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null)
  const [activationBusy, setActivationBusy] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedWA, setCopiedWA] = useState(false)

  const familyAccountId = profile?.family_account?.id ?? null

  const fetchClaimStatus = useCallback(async () => {
    if (!familyAccountId) return
    try {
      const res = await fetch(`/api/admin/activation?family_account_id=${familyAccountId}`)
      if (res.ok) {
        const json = await res.json() as ClaimStatus
        setClaimStatus(json)
      }
    } catch {
      // non-fatal
    }
  }, [familyAccountId])

  useEffect(() => {
    setClaimStatus(null)
    if (profile?.imported_user && familyAccountId) {
      void fetchClaimStatus()
    }
  }, [profile?.id, familyAccountId, profile?.imported_user, fetchClaimStatus])

  if (!profile) return null

  async function handleSaveNote() {
    if (!profile || !noteText.trim()) return
    setSavingNote(true)
    try {
      const timestamp = new Date().toLocaleString('en-GB')
      const newNotes = `[${timestamp}] ${noteText}\n\n${profile.admin_notes ?? ''}`.trim()
      await updateAdminNotes(supabase, profile.id, newNotes)
      onNotesUpdate(profile.id, newNotes)
      setNoteText('')
    } finally {
      setSavingNote(false)
    }
  }

  async function runActivation(action: string, extra?: Record<string, unknown>) {
    if (!familyAccountId) return
    setActivationBusy(action)
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, family_account_id: familyAccountId, profile_id: profile?.id, ...extra }),
      })
      if (res.ok) {
        await fetchClaimStatus()
      } else {
        const body = await res.json() as { error?: string }
        alert(body.error ?? 'Action failed')
      }
    } catch {
      alert('Network error — action not saved')
    } finally {
      setActivationBusy(null)
    }
  }

  async function copyToClipboard(text: string, which: 'link' | 'wa') {
    try {
      await navigator.clipboard.writeText(text)
      if (which === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else {
        setCopiedWA(true)
        setTimeout(() => setCopiedWA(false), 2000)
      }
    } catch {
      alert('Could not copy to clipboard')
    }
  }

  // Derived flags
  const isImported        = profile.imported_user
  const needsClaim        = profile.needs_claim
  const isActivated       = isImported && !needsClaim
  const hasPendingToken   = claimStatus?.has_pending_token ?? false
  const isMissingData     = (profile.data_completeness_score ?? 100) < 60
  const fa                = profile.family_account
  const lastContacted     = fa?.last_contacted_at ?? null
  const snoozedUntil      = fa?.snoozed_until ?? null
  const isSnoozed         = snoozedUntil ? new Date(snoozedUntil) > new Date() : false
  const followUpDue       = needsClaim && lastContacted && !isSnoozed

  return (
    <div
      style={{
        width: 360,
        flexShrink: 0,
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 90px)',
        overflowY: 'auto',
        position: 'sticky',
        top: 68,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--admin-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: profile.gender === 'female' ? '#2D2455' : '#0D2A3A',
            color: profile.gender === 'female' ? '#C4BCFF' : '#7BBFE8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {profile.display_initials}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--admin-text)',
              marginBottom: 4,
            }}
          >
            {profile.first_name ?? profile.display_initials}
          </div>
          <StatusBadge status={profile.status} />
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--admin-muted)',
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Profile details */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--admin-border)',
        }}
      >
        <SectionTitle>Profile</SectionTitle>
        <DetailRow label="Age" value={profile.age_display} />
        <DetailRow label="Location" value={profile.location} />
        <DetailRow label="School of thought" value={profile.school_of_thought} />
        <DetailRow label="Religiosity" value={profile.religiosity} />
        <DetailRow label="Profession" value={profile.profession_sector} />
        <DetailRow
          label="Marital status"
          value={
            profile.marital_status === 'never_married' ? 'Never married'
            : profile.marital_status === 'divorced'    ? 'Divorced'
            : profile.marital_status === 'widowed'     ? 'Widowed'
            : profile.marital_status === 'married'     ? 'Married'
            : profile.marital_status ?? undefined
          }
        />
        {profile.marital_status === 'married' && profile.marriage_reason && (
          <DetailRow label="Marriage reason" value={profile.marriage_reason} />
        )}
        {profile.gender === 'female' && profile.open_to_marital_status && (
          <DetailRow
            label="Open to proposals from"
            value={
              profile.open_to_marital_status === 'never_married_only'     ? 'Never married only'
              : profile.open_to_marital_status === 'divorced_widowed_only' ? 'Divorced / widowed only'
              : profile.open_to_marital_status === 'married_men_considered'? 'Married men considered'
              : profile.open_to_marital_status === 'case_by_case'          ? 'Case by case'
              : profile.open_to_marital_status
            }
          />
        )}
        <DetailRow label="Submitted" value={fmtDate(profile.submitted_date ?? profile.created_at)} />
        {profile.approved_date && (
          <DetailRow label="Approved" value={fmtDate(profile.approved_date)} />
        )}
        {profile.duplicate_flag && (
          <div
            style={{
              marginTop: 8,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--status-warning-bg)',
              fontSize: 12,
              color: 'var(--status-warning)',
            }}
          >
            ⚑ Duplicate flag set
          </div>
        )}
      </div>

      {/* Contact */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--admin-border)',
        }}
      >
        <SectionTitle>Contact</SectionTitle>
        <DetailRow label="Guardian" value={profile.guardian_name} />
        <DetailRow label="Number" value={profile.contact_number} />
      </div>

      {/* Family account */}
      {profile.family_account && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
          <SectionTitle>Family account</SectionTitle>
          <DetailRow label="Contact name" value={profile.family_account.contact_full_name} />
          <DetailRow label="Relationship" value={profile.family_account.contact_relationship} />
          <DetailRow label="Contact email" value={profile.family_account.contact_email} />
          <DetailRow label="Contact phone" value={profile.family_account.contact_number} />
          <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12 }}>
            <span style={{ color: 'var(--admin-muted)', width: 110, flexShrink: 0 }}>Account status</span>
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: profile.family_account.status === 'active'
                ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
              color: profile.family_account.status === 'active'
                ? 'var(--status-success)' : '#ca8a04',
              border: `1px solid ${profile.family_account.status === 'active' ? 'var(--status-success)' : '#ca8a04'}`,
            }}>
              {profile.family_account.status === 'active' ? 'Email verified' : 'Pending verification'}
            </span>
          </div>
          {lastContacted && (
            <DetailRow label="Last contacted" value={fmtDate(lastContacted)} />
          )}
          {isSnoozed && snoozedUntil && (
            <div style={{ marginTop: 6, padding: '5px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 11, color: '#60a5fa' }}>
              💤 Snoozed until {fmtDate(snoozedUntil)}
            </div>
          )}
          {profile.family_account.no_female_contact_flag && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', fontSize: 12, color: '#ca8a04' }}>
              ⚠ No female contact provided
            </div>
          )}
        </div>
      )}

      {/* ── Manager activation (imported profiles only) ──────────────────────── */}
      {isImported && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
          <SectionTitle>Activation</SectionTitle>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            <Badge label="Imported" color="muted" />
            {needsClaim && !isActivated && (
              <Badge label="Needs claim" color="amber" />
            )}
            {isActivated && (
              <Badge label="Activated" color="green" />
            )}
            {hasPendingToken && !isActivated && (
              <Badge label="Magic link sent" color="blue" />
            )}
            {isMissingData && (
              <Badge label={`Data ${profile.data_completeness_score ?? 0}%`} color="red" />
            )}
            {followUpDue && (
              <Badge label="Follow-up due" color="amber" />
            )}
            {profile.imported_at && (
              <span style={{ fontSize: 10, color: 'var(--admin-muted)', alignSelf: 'center' }}>
                Imported {fmtDate(profile.imported_at)}
              </span>
            )}
          </div>

          {/* Completeness bar */}
          {profile.data_completeness_score !== null && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--admin-muted)', marginBottom: 4 }}>
                <span>Data completeness</span>
                <span style={{ fontWeight: 600, color: isMissingData ? '#f87171' : 'var(--admin-text)' }}>
                  {profile.data_completeness_score}%
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: 'var(--admin-border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${profile.data_completeness_score}%`,
                  borderRadius: 999,
                  background: isMissingData ? '#f87171' : profile.data_completeness_score >= 80 ? '#4ade80' : '#fbbf24',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          {/* Claim link (if pending token) */}
          {hasPendingToken && claimStatus?.claim_link && !isActivated && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginBottom: 4 }}>
                Active claim link · expires {fmtDate(claimStatus.token_expires_at)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  readOnly
                  value={claimStatus.claim_link}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-bg)',
                    color: 'var(--admin-muted)',
                    fontSize: 10,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                />
                <button
                  onClick={() => copyToClipboard(claimStatus.claim_link!, 'link')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    background: copiedLink ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${copiedLink ? 'rgba(74,222,128,0.3)' : 'var(--admin-border)'}`,
                    color: copiedLink ? '#4ade80' : 'var(--admin-muted)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {copiedLink ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isActivated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!hasPendingToken ? (
                <ActionBtn
                  label="✉ Send magic link"
                  variant="gold"
                  busy={activationBusy === 'send_magic_link'}
                  onClick={() => runActivation('send_magic_link')}
                />
              ) : (
                <ActionBtn
                  label="↺ Resend magic link"
                  variant="default"
                  busy={activationBusy === 'resend_magic_link'}
                  onClick={() => runActivation('resend_magic_link')}
                />
              )}

              {/* WhatsApp template copy */}
              <button
                onClick={() => {
                  const isReminder = hasPendingToken
                  const text = buildWhatsAppTemplate(claimStatus?.claim_link ?? null, isReminder)
                  void copyToClipboard(text, 'wa')
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: copiedWA ? 'rgba(74,222,128,0.08)' : 'rgba(37,211,102,0.07)',
                  border: `1px solid ${copiedWA ? 'rgba(74,222,128,0.35)' : 'rgba(37,211,102,0.25)'}`,
                  color: copiedWA ? '#4ade80' : '#25d366',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {copiedWA ? '✓ Copied!' : `💬 Copy WhatsApp ${hasPendingToken ? 'reminder' : 'invite'}`}
              </button>

              <ActionBtn
                label="📞 Mark contacted"
                variant="default"
                busy={activationBusy === 'mark_contacted'}
                onClick={() => runActivation('mark_contacted')}
              />

              <ActionBtn
                label={isSnoozed ? `💤 Snoozed until ${fmtDate(snoozedUntil)}` : '💤 Snooze 7 days'}
                variant="default"
                busy={activationBusy === 'snooze'}
                onClick={() => runActivation('snooze')}
              />

              <ActionBtn
                label="⊘ Mark invalid / suspend"
                variant="danger"
                busy={activationBusy === 'mark_invalid'}
                onClick={() => {
                  const reason = prompt('Reason for marking invalid (optional):')
                  if (reason === null) return // cancelled
                  void runActivation('mark_invalid', { reason })
                }}
              />
            </div>
          )}

          {isActivated && (
            <p style={{ fontSize: 12, color: 'var(--admin-muted)' }}>
              ✓ This family has claimed their account and no further activation steps are needed.
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--admin-border)',
          flex: 1,
        }}
      >
        <SectionTitle>Internal notes</SectionTitle>
        {profile.admin_notes && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--admin-muted)',
              marginBottom: 10,
              whiteSpace: 'pre-wrap',
              background: 'var(--admin-bg)',
              padding: 10,
              borderRadius: 6,
              border: '1px solid var(--admin-border)',
            }}
          >
            {profile.admin_notes}
          </div>
        )}
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--admin-border)',
            background: 'var(--admin-bg)',
            color: 'var(--admin-text)',
            fontSize: 13,
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSaveNote}
          disabled={!noteText.trim() || savingNote}
          style={{
            marginTop: 8,
            padding: '7px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: 'rgba(184,150,12,0.12)',
            border: '1px solid rgba(184,150,12,0.3)',
            color: 'var(--gold)',
            cursor: 'pointer',
            opacity: !noteText.trim() || savingNote ? 0.5 : 1,
          }}
        >
          {savingNote ? 'Saving…' : 'Save note'}
        </button>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {profile.status === 'pending' && (
          <>
            {(() => {
              const contactOk = isContactComplete(profile.family_account)
              const accountVerified = !profile.family_account || profile.family_account.status === 'active'
              const canApprove = contactOk && accountVerified
              const blockReason = !accountVerified
                ? 'Cannot approve — family account not yet email-verified.'
                : !contactOk
                  ? 'Cannot approve — primary contact details incomplete.'
                  : undefined
              return (
                <button
                  onClick={() => canApprove && onApprove(profile.id)}
                  disabled={!canApprove}
                  title={blockReason}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    background: canApprove ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${canApprove ? 'var(--status-success)' : 'var(--admin-border)'}`,
                    color: canApprove ? 'var(--status-success)' : 'var(--admin-muted)',
                    cursor: canApprove ? 'pointer' : 'not-allowed',
                    opacity: canApprove ? 1 : 0.6,
                  }}
                >
                  {canApprove ? '✓ Approve' : '⊘ Approve'}
                </button>
              )
            })()}
            {profile.family_account && profile.family_account.status !== 'active' && (
              <p style={{ fontSize: 11, color: '#ca8a04', marginTop: 4, lineHeight: 1.4 }}>
                ⚠ Family account not yet email-verified. Approve will be available once they verify.
              </p>
            )}
            {isContactComplete(profile.family_account) === false && profile.family_account?.status === 'active' && (
              <p style={{ fontSize: 11, color: '#ca8a04', marginTop: 4, lineHeight: 1.4 }}>
                ⚠ Primary contact details are incomplete. Update the family account before approving.
              </p>
            )}
            <button
              onClick={() => onReject(profile.id)}
              style={{
                padding: '10px',
                borderRadius: 8,
                fontSize: 14,
                background: 'var(--status-error-bg)',
                border: '1px solid var(--status-error)',
                color: 'var(--status-error)',
                cursor: 'pointer',
              }}
            >
              ✕ Reject
            </button>
          </>
        )}
        {profile.status === 'approved' && (
          <button
            onClick={() => onStartIntro(profile.id)}
            style={{
              padding: '10px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              background: 'rgba(184,150,12,0.12)',
              border: '1px solid rgba(184,150,12,0.3)',
              color: 'var(--gold)',
              cursor: 'pointer',
            }}
          >
            Start introduction
          </button>
        )}
        <Link
          href={`/admin/profile/${profile.id}`}
          style={{
            padding: '10px',
            borderRadius: 8,
            fontSize: 14,
            textAlign: 'center',
            background: 'transparent',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-muted)',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          Edit full profile →
        </Link>

        {/* Danger zone — delete */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 12,
            borderTop: '1px solid var(--admin-border)',
          }}
        >
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: 8,
                fontSize: 13,
                background: 'transparent',
                border: '1px solid rgba(248,113,113,0.3)',
                color: 'var(--status-error)',
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              Delete profile &amp; account
            </button>
          ) : (
            <div
              style={{
                background: 'var(--status-error-bg)',
                border: '1px solid var(--status-error)',
                borderRadius: 8,
                padding: '12px',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--status-error)',
                  margin: '0 0 10px',
                  lineHeight: 1.4,
                }}
              >
                This permanently deletes the profile row and the auth account. Cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    try { await onDelete(profile.id) }
                    finally { setDeleting(false); setConfirmDelete(false) }
                  }}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'var(--status-error)',
                    border: 'none',
                    color: '#fff',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    fontSize: 13,
                    background: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
