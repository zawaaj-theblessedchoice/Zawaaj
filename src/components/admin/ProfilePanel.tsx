'use client'

import { ProfileRow, updateAdminNotes } from '@/lib/admin/operationsQueries'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from './OperationsTable'

interface ProfilePanelProps {
  profile: ProfileRow | null
  onClose: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
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
  onNotesUpdate,
  onStartIntro,
}: ProfilePanelProps) {
  const supabase = createClient()
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

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
            <button
              onClick={() => onApprove(profile.id)}
              style={{
                padding: '10px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                background: 'rgba(74,222,128,0.1)',
                border: '1px solid var(--status-success)',
                color: 'var(--status-success)',
                cursor: 'pointer',
              }}
            >
              ✓ Approve
            </button>
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
      </div>
    </div>
  )
}
