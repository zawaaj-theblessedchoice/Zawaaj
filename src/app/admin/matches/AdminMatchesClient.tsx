'use client'

import { useState } from 'react'
import Link from 'next/link'
import AvatarInitials from '@/components/AvatarInitials'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchStatus =
  | 'pending_verification'
  | 'verified'
  | 'contacts_shared'
  | 'in_follow_up'
  | 'closed'

export interface FamilyContact {
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  female_contact_name: string | null
  female_contact_number: string | null
  female_contact_relationship: string | null
  no_female_contact_flag: boolean
  father_explanation: string | null
  registration_path: string
}

export interface MatchProfile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  location: string | null
  profession_detail: string | null
  age_display: string | null
  family_account: FamilyContact | null
}

export interface MatchRow {
  id: string
  status: MatchStatus
  mutual_date: string | null
  profile_a: MatchProfile
  profile_b: MatchProfile
  contact_a_verified: boolean
  contact_b_verified: boolean
  assigned_manager_id: string | null
  assigned_manager_name: string | null
  contacts_shared_at: string | null
  family_a_contact_name: string | null
  family_a_contact_number: string | null
  family_b_contact_name: string | null
  family_b_contact_number: string | null
  followup_due_at: string | null
  followup_notes: string | null
  followup_done_at: string | null
  admin_notes: string | null
}

export interface Manager {
  id: string           // zawaaj_managers.id
  name: string
}

export interface AdminMatchesClientProps {
  matches: MatchRow[]
  managers: Manager[]
  role: 'super_admin' | 'manager'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: MatchStatus; label: string }[] = [
  { id: 'pending_verification', label: 'Pending verification' },
  { id: 'verified',             label: 'Verified' },
  { id: 'contacts_shared',      label: 'Contacts shared' },
  { id: 'in_follow_up',         label: 'In follow-up' },
  { id: 'closed',               label: 'Closed' },
]

const MALE_RELATIONSHIPS = ['father', 'male_guardian']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function profileName(p: MatchProfile): string {
  const n = `${p.first_name ?? ''} ${p.last_name ? p.last_name[0] + '.' : ''}`.trim()
  return n || p.display_initials
}

function contactVerificationLabel(fa: FamilyContact | null): string {
  if (!fa) return 'No account'
  if (fa.registration_path === 'parent') {
    const isMale = MALE_RELATIONSHIPS.includes(fa.contact_relationship)
    if (!isMale) return 'Pre-verified (mother/female)'
    if (isMale && fa.no_female_contact_flag) return 'Male contact — no female fallback'
    if (isMale && fa.female_contact_number) return 'Male contact — female fallback provided'
    return 'Needs review'
  }
  return 'Child-registered — needs review'
}

function contactVerificationBadge(fa: FamilyContact | null): { bg: string; text: string } {
  if (!fa) return { bg: 'rgba(239,68,68,0.12)', text: '#f87171' }
  const label = contactVerificationLabel(fa)
  if (label.startsWith('Pre-verified')) return { bg: 'rgba(74,222,128,0.10)', text: '#4ade80' }
  if (label.includes('no female fallback')) return { bg: 'rgba(239,68,68,0.12)', text: '#f87171' }
  return { bg: 'rgba(251,191,36,0.10)', text: '#fbbf24' }
}

// ─── ContactBlock ─────────────────────────────────────────────────────────────

function ContactBlock({
  label,
  profile,
  verified,
  onVerify,
  verifying,
}: {
  label: 'A' | 'B'
  profile: MatchProfile
  verified: boolean
  onVerify: () => void
  verifying: boolean
}) {
  const fa = profile.family_account
  const badge = contactVerificationBadge(fa)
  const verLabel = contactVerificationLabel(fa)
  const isMale = fa ? MALE_RELATIONSHIPS.includes(fa.contact_relationship) : false

  return (
    <div style={{
      background: '#111',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '12px 14px',
      flex: 1,
      minWidth: 220,
    }}>
      {/* Family label + verification badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
          Family {label} · {profileName(profile)}
        </span>
        {verified ? (
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>✓ Verified</span>
        ) : (
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: badge.bg, color: badge.text, fontWeight: 500 }}>
            {verLabel}
          </span>
        )}
      </div>

      {fa ? (
        <>
          {/* Primary contact */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginBottom: 2 }}>Primary contact</div>
            <div style={{ fontSize: 12.5, color: 'var(--admin-text)', fontWeight: 500 }}>{fa.contact_full_name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--admin-muted)' }}>
              {fa.contact_relationship} · {fa.contact_number}
            </div>
            <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>{fa.contact_email}</div>
          </div>

          {/* Female fallback (shown if male contact) */}
          {isMale && (
            <div style={{ marginBottom: 6, paddingTop: 6, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginBottom: 2 }}>Female contact</div>
              {fa.no_female_contact_flag ? (
                <div style={{ fontSize: 11.5, color: '#f87171' }}>
                  ⚠ No female contact — {fa.father_explanation || 'no explanation provided'}
                </div>
              ) : fa.female_contact_name ? (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--admin-text)', fontWeight: 500 }}>{fa.female_contact_name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--admin-muted)' }}>
                    {fa.female_contact_relationship} · {fa.female_contact_number}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11.5, color: '#fbbf24' }}>Female contact not provided</div>
              )}
            </div>
          )}

          <div style={{ fontSize: 10, color: 'var(--admin-muted)', marginBottom: 8 }}>
            Path: {fa.registration_path === 'parent' ? 'Parent registered' : 'Child registered'}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--admin-muted)', marginBottom: 8 }}>
          No family account linked
        </div>
      )}

      {!verified && (
        <button
          onClick={onVerify}
          disabled={verifying}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: verifying ? 'rgba(255,255,255,0.05)' : 'rgba(74,222,128,0.15)',
            border: '0.5px solid rgba(74,222,128,0.3)',
            color: verifying ? 'rgba(255,255,255,0.3)' : '#4ade80',
            cursor: verifying ? 'not-allowed' : 'pointer',
          }}
        >
          {verifying ? 'Saving…' : 'Mark verified'}
        </button>
      )}
    </div>
  )
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  managers,
  role,
  onUpdate,
}: {
  match: MatchRow
  managers: Manager[]
  role: 'super_admin' | 'manager'
  onUpdate: (matchId: string, updates: Partial<MatchRow>) => void
}) {
  const [verifyingA, setVerifyingA] = useState(false)
  const [verifyingB, setVerifyingB] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [followupNotes, setFollowupNotes] = useState(match.followup_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bothVerified = match.contact_a_verified && match.contact_b_verified
  const isShared = match.status === 'contacts_shared' || match.status === 'in_follow_up' || match.status === 'closed'

  async function callApi(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/matches/${match.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json() as { error?: string }
    if (!res.ok) throw new Error(json.error ?? 'Failed')
  }

  async function handleVerifyA() {
    setVerifyingA(true); setError(null)
    try {
      await callApi({ action: 'verify_a' })
      const newVerified = true
      const bothNow = newVerified && match.contact_b_verified
      onUpdate(match.id, {
        contact_a_verified: true,
        status: bothNow ? 'verified' : match.status,
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setVerifyingA(false) }
  }

  async function handleVerifyB() {
    setVerifyingB(true); setError(null)
    try {
      await callApi({ action: 'verify_b' })
      const newVerified = true
      const bothNow = match.contact_a_verified && newVerified
      onUpdate(match.id, {
        contact_b_verified: true,
        status: bothNow ? 'verified' : match.status,
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setVerifyingB(false) }
  }

  async function handleShareContacts() {
    if (!confirm('Share contact details with both families? This cannot be undone.')) return
    setSharing(true); setError(null)
    try {
      await callApi({ action: 'share_contacts' })
      onUpdate(match.id, { status: 'contacts_shared', contacts_shared_at: new Date().toISOString() })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSharing(false) }
  }

  async function handleAssignManager(managerId: string) {
    setAssigning(true); setError(null)
    try {
      await callApi({ action: 'assign_manager', manager_id: managerId })
      const mgr = managers.find(m => m.id === managerId)
      onUpdate(match.id, {
        assigned_manager_id: managerId,
        assigned_manager_name: mgr?.name ?? null,
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setAssigning(false) }
  }

  async function handleSaveNotes() {
    setSavingNotes(true); setError(null)
    try {
      await callApi({ action: 'log_followup', followup_notes: followupNotes, followup_done: true })
      onUpdate(match.id, { followup_notes: followupNotes, status: 'in_follow_up' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSavingNotes(false) }
  }

  return (
    <div style={{
      background: '#1a1a1a',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 14,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        {/* Profile pair */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AvatarInitials initials={match.profile_a.display_initials} gender={match.profile_a.gender} size="sm" />
            <div>
              <Link href={`/admin/profile/${match.profile_a.id}`} style={{ color: '#B8960C', textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
                {profileName(match.profile_a)}
              </Link>
              <div style={{ fontSize: 11.5, color: 'var(--admin-muted)' }}>
                {[match.profile_a.age_display, match.profile_a.location, match.profile_a.profession_detail].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }}>↔</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AvatarInitials initials={match.profile_b.display_initials} gender={match.profile_b.gender} size="sm" />
            <div>
              <Link href={`/admin/profile/${match.profile_b.id}`} style={{ color: '#B8960C', textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
                {profileName(match.profile_b)}
              </Link>
              <div style={{ fontSize: 11.5, color: 'var(--admin-muted)' }}>
                {[match.profile_b.age_display, match.profile_b.location, match.profile_b.profession_detail].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          <span>Matched: {formatDate(match.mutual_date)}</span>
          {isShared && <span style={{ color: '#4ade80' }}>Contacts shared: {formatDate(match.contacts_shared_at)}</span>}
          {match.followup_due_at && <span>Follow-up due: {formatDate(match.followup_due_at)}</span>}
        </div>
      </div>

      {/* Contact blocks */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <ContactBlock
          label="A"
          profile={match.profile_a}
          verified={match.contact_a_verified}
          onVerify={handleVerifyA}
          verifying={verifyingA}
        />
        <ContactBlock
          label="B"
          profile={match.profile_b}
          verified={match.contact_b_verified}
          onVerify={handleVerifyB}
          verifying={verifyingB}
        />
      </div>

      {/* Cached contact info (shown after sharing) */}
      {isShared && (match.family_a_contact_number || match.family_b_contact_number) && (
        <div style={{
          background: 'rgba(74,222,128,0.05)',
          border: '0.5px solid rgba(74,222,128,0.15)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 14,
          display: 'flex', gap: 24, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--admin-muted)', marginBottom: 3 }}>SHARED WITH FAMILY A</div>
            <div style={{ fontSize: 12.5, color: 'var(--admin-text)' }}>{match.family_b_contact_name} · {match.family_b_contact_number}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--admin-muted)', marginBottom: 3 }}>SHARED WITH FAMILY B</div>
            <div style={{ fontSize: 12.5, color: 'var(--admin-text)' }}>{match.family_a_contact_name} · {match.family_a_contact_number}</div>
          </div>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Share contacts button */}
        {!isShared && (
          <button
            onClick={handleShareContacts}
            disabled={!bothVerified || sharing}
            title={!bothVerified ? 'Both contacts must be verified first' : undefined}
            style={{
              padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: bothVerified && !sharing ? '#B8960C' : 'rgba(255,255,255,0.04)',
              border: `0.5px solid ${bothVerified ? '#B8960C' : 'rgba(255,255,255,0.08)'}`,
              color: bothVerified && !sharing ? '#111' : 'rgba(255,255,255,0.3)',
              cursor: bothVerified && !sharing ? 'pointer' : 'not-allowed',
            }}
          >
            {sharing ? 'Sharing…' : '🤝 Share contact details'}
          </button>
        )}

        {/* Manager assignment */}
        {role === 'super_admin' && (
          <select
            value={match.assigned_manager_id ?? ''}
            onChange={e => handleAssignManager(e.target.value)}
            disabled={assigning}
            style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 11,
              background: '#111', border: '0.5px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            }}
          >
            <option value="">Unassigned</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}

        {/* Side-by-side link */}
        <Link
          href={`/admin/sidebyside/${match.id}`}
          style={{
            padding: '5px 12px', borderRadius: 7, fontSize: 11,
            background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)',
            color: 'var(--admin-muted)', textDecoration: 'none',
          }}
        >
          View side-by-side →
        </Link>
      </div>

      {/* Follow-up notes */}
      {(match.status === 'contacts_shared' || match.status === 'in_follow_up') && (
        <div style={{ marginTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--admin-muted)', marginBottom: 6 }}>
            Follow-up notes
          </div>
          <textarea
            value={followupNotes}
            onChange={e => setFollowupNotes(e.target.value)}
            placeholder="Log what happened after contact details were shared…"
            rows={2}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7,
              background: '#111', border: '0.5px solid rgba(255,255,255,0.10)',
              color: 'var(--admin-text)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            style={{
              marginTop: 6, padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: 'rgba(96,165,250,0.12)', border: '0.5px solid rgba(96,165,250,0.25)',
              color: '#60a5fa', cursor: savingNotes ? 'not-allowed' : 'pointer',
            }}
          >
            {savingNotes ? 'Saving…' : 'Save notes'}
          </button>
          {match.followup_done_at && (
            <span style={{ fontSize: 11, color: '#4ade80', marginLeft: 10 }}>
              ✓ Follow-up logged {formatDate(match.followup_done_at)}
            </span>
          )}
        </div>
      )}

      {error && <div style={{ marginTop: 8, fontSize: 11, color: '#f87171' }}>{error}</div>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminMatchesClient({
  matches: initialMatches,
  managers,
  role,
}: AdminMatchesClientProps) {
  const [activeTab, setActiveTab] = useState<MatchStatus>('pending_verification')
  const [matches, setMatches] = useState<MatchRow[]>(initialMatches)

  function handleUpdate(matchId: string, updates: Partial<MatchRow>) {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...updates } : m))
  }

  const tabCounts = Object.fromEntries(
    TABS.map(t => [t.id, matches.filter(m => m.status === t.id).length])
  ) as Record<MatchStatus, number>

  const visibleMatches = matches.filter(m => m.status === activeTab)

  return (
    <div style={{ minHeight: '100vh', background: '#111111', color: 'var(--admin-text)' }}>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Match Queue</h1>
        <p style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 24 }}>
          Verify contacts and coordinate introductions between matched families.
        </p>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
          {TABS.map(tab => {
            const count = tabCounts[tab.id]
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer',
                  border: active ? '1.5px solid #B8960C' : '0.5px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(184,150,12,0.10)' : 'transparent',
                  color: active ? '#B8960C' : 'rgba(255,255,255,0.5)',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 999, padding: '0 5px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? '#B8960C' : 'rgba(255,255,255,0.08)',
                    color: active ? '#111' : 'rgba(255,255,255,0.4)',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Match list */}
        {visibleMatches.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: 'rgba(255,255,255,0.25)', fontSize: 13,
          }}>
            No matches in this stage.
          </div>
        ) : (
          visibleMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              managers={managers}
              role={role}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}
