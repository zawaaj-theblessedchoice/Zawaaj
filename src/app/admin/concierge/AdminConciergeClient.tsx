'use client'

import { useState } from 'react'
import type { ConciergeProfile, CandidateProfile, ExistingSuggestion } from './page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

function profileName(p: { first_name: string | null; last_name: string | null; display_initials: string }): string {
  if (!p.first_name) return p.display_initials
  const last = p.last_name ? `${p.last_name[0]}.` : ''
  return [p.first_name, last].filter(Boolean).join(' ')
}

function avatarStyle(gender: string | null) {
  return {
    background: gender === 'female' ? 'var(--avatar-female-bg)' : 'var(--avatar-male-bg)',
    color: gender === 'female' ? 'var(--avatar-female-text)' : 'var(--avatar-male-text)',
  }
}

// ─── Suggest picker ───────────────────────────────────────────────────────────

function SuggestPicker({
  forProfile,
  candidates,
  existingSuggestions,
  onSuggested,
}: {
  forProfile: ConciergeProfile
  candidates: CandidateProfile[]
  existingSuggestions: ExistingSuggestion[]
  onSuggested: (forId: string, suggestedId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const alreadySuggested = new Set(
    existingSuggestions
      .filter(s => s.for_profile_id === forProfile.id)
      .map(s => s.suggested_profile_id)
  )

  // Opposite gender + not self + search
  const oppositeGender = forProfile.gender === 'male' ? 'female' : 'male'
  const filtered = candidates.filter(c => {
    if (c.id === forProfile.id) return false
    if (c.gender !== oppositeGender) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (c.first_name ?? '').toLowerCase().includes(q) ||
      (c.location ?? '').toLowerCase().includes(q) ||
      (c.ethnicity ?? '').toLowerCase().includes(q) ||
      (c.profession_detail ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 20)

  async function suggest(candidate: CandidateProfile) {
    setLoadingId(candidate.id)
    const res = await fetch('/api/admin/concierge-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        for_profile_id: forProfile.id,
        suggested_profile_id: candidate.id,
        admin_note: note.trim() || undefined,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setLoadingId(null)
    if (!res.ok) {
      setToast(json.error ?? 'Failed to suggest')
      setTimeout(() => setToast(null), 3000)
      return
    }
    onSuggested(forProfile.id, candidate.id)
    setToast(`${profileName(candidate)} suggested ✓`)
    setTimeout(() => setToast(null), 2500)
    setNote('')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search candidates…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '0.5px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontSize: 12, outline: 'none' }}
        />
        <input
          type="text"
          placeholder="Optional admin note…"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ flex: 1.5, padding: '7px 12px', borderRadius: 8, border: '0.5px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontSize: 12, outline: 'none' }}
        />
      </div>

      {toast && (
        <div style={{ fontSize: 12, color: 'var(--status-success)', marginBottom: 10, padding: '6px 12px', background: 'var(--status-success-bg)', borderRadius: 7, border: '0.5px solid var(--status-success-br)' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--admin-muted)', padding: '8px 0' }}>No candidates found.</p>
        )}
        {filtered.map(c => {
          const age = calcAge(c.date_of_birth)
          const suggested = alreadySuggested.has(c.id)
          return (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: suggested ? 'rgba(74,222,128,0.05)' : 'transparent',
                borderRadius: 9, border: `0.5px solid ${suggested ? 'rgba(74,222,128,0.2)' : 'var(--admin-border)'}`,
              }}
            >
              <div style={{ ...avatarStyle(c.gender), width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>
                {c.display_initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--admin-text)', fontWeight: 500 }}>{profileName(c)}</div>
                <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                  {[age && `${age}y`, c.location, c.ethnicity, c.school_of_thought].filter(Boolean).join(' · ')}
                </div>
              </div>
              {suggested ? (
                <span style={{ fontSize: 11, color: 'var(--status-success)', flexShrink: 0 }}>✓ Suggested</span>
              ) : (
                <button
                  onClick={() => suggest(c)}
                  disabled={loadingId === c.id}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                    background: 'var(--gold)', color: 'var(--surface)', border: 'none',
                    cursor: loadingId === c.id ? 'not-allowed' : 'pointer',
                    opacity: loadingId === c.id ? 0.5 : 1, flexShrink: 0,
                  }}
                >
                  {loadingId === c.id ? '…' : 'Suggest'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminConciergeClient({
  premiumProfiles,
  candidates,
  existingSuggestions: initialSuggestions,
}: {
  premiumProfiles: ConciergeProfile[]
  candidates: CandidateProfile[]
  existingSuggestions: ExistingSuggestion[]
}) {
  const [suggestions, setSuggestions] = useState<ExistingSuggestion[]>(initialSuggestions)
  const [expandedId, setExpandedId] = useState<string | null>(
    premiumProfiles.length > 0 ? premiumProfiles[0].id : null
  )

  function handleSuggested(forId: string, suggestedId: string) {
    setSuggestions(prev => [...prev, { for_profile_id: forId, suggested_profile_id: suggestedId, status: 'pending' }])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text)', padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Concierge matching</h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 24 }}>
        Proactively suggest profiles to Premium members. Each suggestion is sent as a notification.
      </p>

      {premiumProfiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--admin-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No Premium members yet</p>
          <p style={{ fontSize: 12 }}>Members who subscribe to Premium will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {premiumProfiles.map(member => {
            const age = calcAge(member.date_of_birth)
            const suggestionCount = suggestions.filter(s => s.for_profile_id === member.id).length
            const isExpanded = expandedId === member.id

            return (
              <div
                key={member.id}
                style={{
                  background: 'var(--admin-surface)', border: `0.5px solid ${isExpanded ? 'var(--gold-border)' : 'var(--admin-border)'}`,
                  borderRadius: 14, overflow: 'hidden',
                }}
              >
                {/* Member row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : member.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ ...avatarStyle(member.gender), width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                    {member.display_initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 3 }}>
                      {profileName(member)}
                      <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'var(--gold-muted)', color: 'var(--gold)', fontWeight: 600 }}>Premium</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {[age && `${age}y`, member.location, member.ethnicity].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {/* Preferences summary */}
                  <div style={{ fontSize: 11, color: 'var(--admin-muted)', textAlign: 'right', lineHeight: 1.6 }}>
                    {member.pref_age_min && member.pref_age_max && (
                      <div>Age {member.pref_age_min}–{member.pref_age_max}</div>
                    )}
                    {member.pref_location && <div>{member.pref_location}</div>}
                    {member.pref_school_of_thought?.length ? <div>{member.pref_school_of_thought.join(', ')}</div> : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {suggestionCount} suggested
                    </span>
                    <span style={{ color: 'var(--admin-muted)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded picker */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid var(--admin-border)' }}>
                    <div style={{ marginTop: 16 }}>
                      <SuggestPicker
                        forProfile={member}
                        candidates={candidates}
                        existingSuggestions={suggestions}
                        onSuggested={handleSuggested}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
