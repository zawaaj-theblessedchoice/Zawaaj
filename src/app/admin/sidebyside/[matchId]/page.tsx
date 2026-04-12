'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  user_id: string | null
  legacy_ref: string | null
  imported_email: string | null
  display_initials: string
  gender: string | null
  age_display: string | null
  height: string | null
  ethnicity: string | null
  school_of_thought: string | null
  education_level: string | null
  education_detail: string | null
  profession_sector: string | null
  profession_detail: string | null
  location: string | null
  attributes: string[] | null
  spouse_preferences: string[] | null
  admin_comments: string | null
  admin_notes: string | null
  status: string
  contact_number: string | null
  guardian_name: string | null
  submitted_date: string | null
  approved_date: string | null
  created_at: string | null
}

interface Match {
  id: string
  profile_a_id: string
  profile_b_id: string
  mutual_date: string | null
  status: string
  family_a_consented: boolean
  family_b_consented: boolean
  introduced_date: string | null
  outcome: string | null
  outcome_date: string | null
  admin_notes: string | null
  admin_notified_date: string | null
  created_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function phoneDigits(phone: string | null): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:              { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)' },
    approved:             { bg: 'var(--status-success-bg)', text: 'var(--status-success)' },
    rejected:             { bg: 'var(--status-error-bg)', text: 'var(--status-error)' },
    withdrawn:            { bg: 'var(--surface-3)', text: 'var(--text-muted)' },
    suspended:            { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)' },
    introduced:           { bg: 'var(--status-info-bg)', text: 'var(--status-info)' },
    awaiting_admin:       { bg: 'var(--status-purple-bg)', text: 'var(--status-purple)' },
    admin_reviewing:      { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)' },
    nikah:                { bg: 'var(--status-success-bg)', text: 'var(--status-success)' },
    no_longer_proceeding: { bg: 'var(--status-error-bg)', text: 'var(--status-error)' },
    dismissed:            { bg: 'var(--surface-3)', text: 'var(--text-muted)' },
    in_discussion:        { bg: 'var(--status-info-bg)', text: 'var(--status-info)' },
  }
  const s = map[status] ?? { bg: 'var(--surface-3)', text: 'var(--text-muted)' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Profile Column ───────────────────────────────────────────────────────────

function ProfileColumn({
  profile, label, consented, onConsentChange,
}: {
  profile: Profile
  label: string
  consented: boolean
  onConsentChange: (value: boolean) => void
}) {
  const bg = profile.gender === 'female' ? 'var(--status-purple)' : 'var(--status-info)'
  const digits = phoneDigits(profile.contact_number)

  function Row({ title, value }: { title: string; value: string | null | undefined }) {
    return value ? (
      <div className="flex gap-3 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <dt className="text-xs w-36 flex-shrink-0 pt-0.5" style={{ color: 'var(--admin-muted)' }}>{title}</dt>
        <dd className="text-sm break-words" style={{ color: 'var(--admin-text)' }}>{value}</dd>
      </div>
    ) : null
  }

  return (
    <div className="bg-surface-2 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--admin-border)' }}>
      {/* Avatar header */}
      <div
        className="px-6 py-8 flex flex-col items-center gap-2"
        style={{ backgroundColor: `${bg}18` }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl"
          style={{ backgroundColor: bg, color: 'white' }}
        >
          {profile.display_initials}
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--admin-muted)' }}>{label}</p>
        <p className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>{profile.display_initials}</p>
        {profile.legacy_ref && (
          <span className="px-2.5 py-0.5 rounded-full text-xs bg-surface-2" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-muted)' }}>
            {profile.legacy_ref}
          </span>
        )}
        <StatusBadge status={profile.status} />
      </div>

      {/* Fields */}
      <div className="px-6 py-4">
        <dl>
          <Row title="Gender" value={profile.gender} />
          <Row title="Age" value={profile.age_display} />
          <Row title="Height" value={profile.height} />
          <Row title="Ethnicity" value={profile.ethnicity} />
          <Row title="Location" value={profile.location} />
          <Row title="School of Thought" value={profile.school_of_thought} />
          <Row title="Education Level" value={profile.education_level} />
          <Row title="Education Detail" value={profile.education_detail} />
          <Row title="Profession Sector" value={profile.profession_sector} />
          <Row title="Profession Detail" value={profile.profession_detail} />
          <Row title="Submitted" value={fmtDate(profile.submitted_date)} />
          <Row title="Approved" value={fmtDate(profile.approved_date)} />
        </dl>

        {/* Attributes */}
        {profile.attributes && profile.attributes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>Attributes</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.attributes.map(a => (
                <span key={a} className="px-2.5 py-1 rounded-full text-xs bg-surface-3" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spouse Preferences */}
        {profile.spouse_preferences && profile.spouse_preferences.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>Spouse Preferences</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.spouse_preferences.map(p => (
                <span key={p} className="px-2.5 py-1 rounded-full text-xs bg-surface-3" style={{ color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin-only contact section */}
      <div className="bg-surface-3 px-6 py-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--admin-muted)' }}>Contact Details</p>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-24 flex-shrink-0" style={{ color: 'var(--admin-muted)' }}>Phone:</dt>
            <dd className="font-medium" style={{ color: 'var(--admin-text)' }}>{profile.contact_number ?? '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 flex-shrink-0" style={{ color: 'var(--admin-muted)' }}>Guardian:</dt>
            <dd className="font-medium" style={{ color: 'var(--admin-text)' }}>{profile.guardian_name ?? '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 flex-shrink-0" style={{ color: 'var(--admin-muted)' }}>Email:</dt>
            <dd className="font-medium break-all" style={{ color: 'var(--admin-text)' }}>{profile.imported_email ?? '—'}</dd>
          </div>
        </dl>
        {digits && (
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            WhatsApp {label}
          </a>
        )}
      </div>

      {/* Admin notes */}
      {(profile.admin_comments || profile.admin_notes) && (
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
          {profile.admin_comments && (
            <div className="mb-3">
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-muted)' }}>Admin Comments</p>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{profile.admin_comments}</p>
            </div>
          )}
          {profile.admin_notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-muted)' }}>Admin Notes</p>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{profile.admin_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Consent checkbox */}
      <div className="px-6 py-4 bg-surface-2" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consented}
            onChange={e => onConsentChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-gold flex-shrink-0"
          />
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
            {label} has verbally confirmed consent to introduction
          </span>
        </label>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SideBySidePage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = use(params)
  const supabase = createClient()

  const [match, setMatch] = useState<Match | null>(null)
  const [profileA, setProfileA] = useState<Profile | null>(null)
  const [profileB, setProfileB] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  const [consentA, setConsentA] = useState(false)
  const [consentB, setConsentB] = useState(false)
  const [introducing, setIntroducing] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [confirmDismiss, setConfirmDismiss] = useState(false)
  const [outcomeValue, setOutcomeValue] = useState('')
  const [adminNotesValue, setAdminNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // Check admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAccessDenied(true); return }
      const { data } = await supabase
        .from('zawaaj_profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .eq('is_admin', true)
        .maybeSingle()
      if (!data) setAccessDenied(true)
    }
    checkAdmin()
  }, [supabase])

  const loadMatch = useCallback(async () => {
    const { data: matchData, error: matchErr } = await supabase
      .from('zawaaj_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchErr || !matchData) { setLoading(false); return }

    const m = matchData as Match
    setMatch(m)
    setConsentA(m.family_a_consented)
    setConsentB(m.family_b_consented)
    setOutcomeValue(m.outcome ?? 'unknown')
    setAdminNotesValue(m.admin_notes ?? '')

    const [{ data: pA }, { data: pB }] = await Promise.all([
      supabase.from('zawaaj_profiles').select('*').eq('id', m.profile_a_id).single(),
      supabase.from('zawaaj_profiles').select('*').eq('id', m.profile_b_id).single(),
    ])

    setProfileA((pA as Profile) ?? null)
    setProfileB((pB as Profile) ?? null)
    setLoading(false)
  }, [matchId, supabase])

  useEffect(() => { loadMatch() }, [loadMatch])

  async function updateConsent(side: 'a' | 'b', value: boolean) {
    const field = side === 'a' ? 'family_a_consented' : 'family_b_consented'
    if (side === 'a') setConsentA(value)
    else setConsentB(value)
    await supabase.from('zawaaj_matches').update({ [field]: value }).eq('id', matchId)
  }

  async function markIntroduced() {
    setIntroducing(true)
    await supabase
      .from('zawaaj_matches')
      .update({ status: 'introduced', introduced_date: new Date().toISOString() })
      .eq('id', matchId)
    setIntroducing(false)
    loadMatch()
  }

  async function dismissMatch() {
    setDismissing(true)
    await supabase.from('zawaaj_matches').update({ status: 'dismissed' }).eq('id', matchId)
    setDismissing(false)
    setConfirmDismiss(false)
    loadMatch()
  }

  async function updateOutcome(outcome: string) {
    setOutcomeValue(outcome)
    await supabase.from('zawaaj_matches').update({ outcome, outcome_date: new Date().toISOString() }).eq('id', matchId)
  }

  async function saveNotes() {
    setSavingNotes(true)
    await supabase.from('zawaaj_matches').update({ admin_notes: adminNotesValue }).eq('id', matchId)
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2500)
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="bg-surface-2 rounded-2xl p-10 text-center max-w-sm mx-4" style={{ border: '1px solid var(--admin-border)' }}>
          <p className="text-2xl mb-2">🔒</p>
          <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>Access Denied</h1>
          <Link href="/admin" className="text-gold text-sm hover:underline">Back to Admin</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Loading match…</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--admin-muted)' }}>Match not found.</p>
          <Link href="/admin" className="text-gold text-sm hover:underline">Back to Admin</Link>
        </div>
      </div>
    )
  }

  const canIntroduce = consentA && consentB && match.status !== 'introduced'

  return (
    <div className="min-h-screen bg-surface">
      {/* Confirm Dismiss Modal */}
      {confirmDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-2 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-white mb-6">Dismiss this match? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDismiss(false)}
                className="px-4 py-2 rounded-lg text-sm hover:bg-surface-3" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                Cancel
              </button>
              <button onClick={dismissMatch} disabled={dismissing}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {dismissing ? 'Dismissing…' : 'Dismiss Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-surface-2 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZawaajLogo size={30} tagline={false} />
            <span className="text-sm hidden sm:block" style={{ color: 'var(--admin-muted)' }}>Side-by-Side Match View</span>
          </div>
          <Link href="/admin" className="text-xs transition-colors" style={{ color: 'var(--admin-muted)' }}>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Match Summary Bar */}
        <div className="bg-surface-2 rounded-2xl p-5 flex flex-wrap items-center gap-4" style={{ border: '1px solid var(--admin-border)' }}>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--admin-muted)' }}>Match Status</p>
            <StatusBadge status={match.status} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--admin-muted)' }}>Mutual Date</p>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{fmtDate(match.mutual_date)} <span className="font-normal" style={{ color: 'var(--admin-muted)' }}>({daysAgo(match.mutual_date)})</span></p>
          </div>
          {match.introduced_date && (
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--admin-muted)' }}>Introduced</p>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{fmtDate(match.introduced_date)}</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--admin-muted)' }}>Consent</p>
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
              <span className={consentA ? 'text-green-400 font-medium' : 'text-red-400'}>
                Family A {consentA ? '✓' : '✗'}
              </span>
              {' · '}
              <span className={consentB ? 'text-green-400 font-medium' : 'text-red-400'}>
                Family B {consentB ? '✓' : '✗'}
              </span>
            </p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <select
              className="rounded-lg px-3 py-1.5 text-xs bg-surface-3 outline-none focus:border-gold"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
              value={outcomeValue}
              onChange={e => updateOutcome(e.target.value)}
            >
              <option value="unknown">Outcome: Unknown</option>
              <option value="in_discussion">In Discussion</option>
              <option value="nikah">Nikah</option>
              <option value="no_longer_proceeding">No Longer Proceeding</option>
            </select>
          </div>
        </div>

        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
          <span className="text-amber-600 text-lg flex-shrink-0">⚠</span>
          <p className="text-sm text-amber-800 font-medium">
            Never share contact details without explicit verbal consent from both families.
            All contact information on this page is admin-only.
          </p>
        </div>

        {/* Two-column profiles */}
        <div className="grid sm:grid-cols-2 gap-5">
          {profileA && (
            <ProfileColumn
              profile={profileA}
              label="Family A"
              consented={consentA}
              onConsentChange={v => updateConsent('a', v)}
            />
          )}
          {profileB && (
            <ProfileColumn
              profile={profileB}
              label="Family B"
              consented={consentB}
              onConsentChange={v => updateConsent('b', v)}
            />
          )}
        </div>

        {/* Facilitate Introduction Section */}
        <div className="bg-surface-2 rounded-2xl p-6" style={{ border: '1px solid var(--admin-border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>Facilitate Introduction</h2>

          {match.status === 'introduced' ? (
            <div className="bg-green-950/40 border border-green-800/40 rounded-xl px-5 py-4">
              <p className="text-sm font-medium text-green-400">
                This match has been introduced on {fmtDate(match.introduced_date)}.
              </p>
            </div>
          ) : match.status === 'dismissed' ? (
            <div className="bg-surface-3 rounded-xl px-5 py-4" style={{ border: '1px solid var(--admin-border)' }}>
              <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>This match has been dismissed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 grid sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 bg-surface-3 rounded-xl p-4 cursor-pointer">
                    <input type="checkbox" checked={consentA} onChange={e => updateConsent('a', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-gold flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Family A consent confirmed</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>Verbal confirmation received from {profileA?.display_initials ?? 'Family A'}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 bg-surface-3 rounded-xl p-4 cursor-pointer">
                    <input type="checkbox" checked={consentB} onChange={e => updateConsent('b', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-gold flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Family B consent confirmed</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>Verbal confirmation received from {profileB?.display_initials ?? 'Family B'}</p>
                    </div>
                  </label>
                </div>
              </div>

              {!canIntroduce && (
                <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                  Both families must verbally confirm consent before marking as introduced.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={markIntroduced}
                  disabled={!canIntroduce || introducing}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-gold text-white hover:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {introducing ? 'Saving…' : 'Mark as Introduced'}
                </button>
                <button
                  onClick={() => setConfirmDismiss(true)}
                  className="px-6 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Dismiss Match
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Notes */}
        <div className="bg-surface-2 rounded-2xl p-6" style={{ border: '1px solid var(--admin-border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>Admin Notes</h2>
          <textarea
            className="w-full rounded-xl px-4 py-3 text-sm bg-surface-3 outline-none focus:border-gold resize-none transition-colors"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            rows={4}
            placeholder="Private notes about this match…"
            value={adminNotesValue}
            onChange={e => setAdminNotesValue(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-surface-3 text-gold hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </button>
            {notesSaved && <p className="text-xs text-green-600">Saved.</p>}
          </div>
        </div>

        {/* Back link */}
        <div className="pb-4">
          <Link href="/admin" className="text-sm transition-colors" style={{ color: 'var(--admin-muted)' }}>
            ← Back to Admin Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
