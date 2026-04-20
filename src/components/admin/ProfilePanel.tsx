'use client'

import { ProfileRow, updateAdminNotes, isContactComplete } from '@/lib/admin/operationsQueries'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
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
          {profile.family_account.no_female_contact_flag && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', fontSize: 12, color: '#ca8a04' }}>
              ⚠ No female contact provided
            </div>
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
