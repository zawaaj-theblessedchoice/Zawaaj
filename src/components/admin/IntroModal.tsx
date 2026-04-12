'use client'

import {
  ProfileRow,
  fetchSuggestedMatches,
  createIntroductionRequest,
} from '@/lib/admin/operationsQueries'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface IntroModalProps {
  profile: ProfileRow | null
  onClose: () => void
  onSuccess: (initialsA: string, initialsB: string) => void
}

export function IntroModal({ profile, onClose, onSuccess }: IntroModalProps) {
  const supabase = createClient()
  const [suggestions, setSuggestions] = useState<ProfileRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    fetchSuggestedMatches(supabase, profile.id, profile.gender ?? 'male')
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function handleConfirm() {
    if (!profile || !selectedId) return
    setSubmitting(true)
    try {
      await createIntroductionRequest(supabase, profile.id, selectedId)
      const selected = suggestions.find(s => s.id === selectedId)
      onSuccess(profile.display_initials, selected?.display_initials ?? selectedId)
    } finally {
      setSubmitting(false)
    }
  }

  if (!profile) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--admin-text)',
              margin: 0,
            }}
          >
            Start introduction for {profile.display_initials}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--admin-muted)',
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        {/* Suggestions */}
        <div style={{ padding: '16px 20px' }}>
          <p
            style={{
              fontSize: 12,
              color: 'var(--admin-muted)',
              marginBottom: 14,
              margin: '0 0 14px 0',
            }}
          >
            Select a suggested {profile.gender === 'female' ? 'brother' : 'sister'} to introduce:
          </p>

          {loading && (
            <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>Loading…</p>
          )}
          {!loading && suggestions.length === 0 && (
            <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>
              No suitable suggestions found.
            </p>
          )}

          {suggestions.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 8,
                cursor: 'pointer',
                border:
                  selectedId === s.id
                    ? '1px solid rgba(184,150,12,0.4)'
                    : '1px solid var(--admin-border)',
                background:
                  selectedId === s.id ? 'rgba(184,150,12,0.08)' : 'transparent',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: s.gender === 'female' ? '#2D2455' : '#0D2A3A',
                  color: s.gender === 'female' ? '#C4BCFF' : '#7BBFE8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {s.display_initials}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--admin-text)',
                  }}
                >
                  {s.display_initials}
                </div>
                <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                  {[s.age_display, s.location, s.school_of_thought]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {selectedId === s.id && (
                <span style={{ color: 'var(--gold)', fontSize: 16 }}>✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--admin-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              background: 'transparent',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-muted)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || submitting}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: selectedId ? 'rgba(184,150,12,0.12)' : 'var(--admin-border)',
              border: `1px solid ${selectedId ? 'rgba(184,150,12,0.3)' : 'transparent'}`,
              color: selectedId ? 'var(--gold)' : 'var(--admin-muted)',
              cursor: selectedId ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Starting…' : 'Confirm introduction'}
          </button>
        </div>
      </div>
    </div>
  )
}
