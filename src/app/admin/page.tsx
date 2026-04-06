'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────
interface Profile {
  id: string
  display_initials: string
  gender: string | null
  age_display: string | null
  location: string | null
  school_of_thought: string | null
  profession_sector: string | null
  status: string
  submitted_date: string | null
  contact_number: string | null
  admin_comments: string | null
  duplicate_flag: boolean
  user_id: string | null
  imported_email: string | null
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
  admin_notes: string | null
  profile_a?: { display_initials: string; gender: string | null; location: string | null }
  profile_b?: { display_initials: string; gender: string | null; location: string | null }
}

type Tab = 'queue' | 'matches' | 'members' | 'unlinked'

// ─── Sub-components ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:   { bg: '#FEF3C7', text: '#92400E' },
    approved:  { bg: '#D1FAE5', text: '#065F46' },
    rejected:  { bg: '#FEE2E2', text: '#991B1B' },
    withdrawn: { bg: '#F3F4F6', text: '#374151' },
    unlinked:  { bg: '#EDE9FE', text: '#5B21B6' },
    active:    { bg: '#DBEAFE', text: '#1E40AF' },
    introduced:{ bg: '#D1FAE5', text: '#065F46' },
    closed:    { bg: '#F3F4F6', text: '#374151' },
  }
  const style = map[status] ?? { bg: '#F3F4F6', text: '#374151' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl p-5 bg-white border border-[#E8E4DC]">
      <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-sm text-[#1A1A1A]/60 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Queue Tab ────────────────────────────────────────────
function QueueTab({ profiles, onRefresh }: { profiles: Profile[]; onRefresh: () => void }) {
  const pending = profiles.filter((p) => p.status === 'pending')
  const supabase = createClient()

  async function approve(id: string) {
    await supabase
      .from('zawaaj_profiles')
      .update({ status: 'approved', approved_date: new Date().toISOString() })
      .eq('id', id)
    onRefresh()
  }

  async function reject(id: string) {
    await supabase.from('zawaaj_profiles').update({ status: 'rejected' }).eq('id', id)
    onRefresh()
  }

  if (pending.length === 0)
    return <p className="text-[#1A1A1A]/50 py-12 text-center">No applications pending review.</p>

  return (
    <div className="space-y-3">
      {pending.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-xl p-5 border border-[#E8E4DC] flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[#1A1A1A]">{p.display_initials}</span>
              <span className="text-[#1A1A1A]/50 text-sm capitalize">{p.gender}</span>
              {p.duplicate_flag && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                  Possible duplicate
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[#1A1A1A]/60">
              {p.location && <span>📍 {p.location}</span>}
              {p.profession_sector && <span>💼 {p.profession_sector}</span>}
              {p.school_of_thought && <span>🕌 {p.school_of_thought}</span>}
              {p.contact_number && <span>📞 {p.contact_number}</span>}
            </div>
            {p.submitted_date && (
              <p className="text-xs text-[#1A1A1A]/40 mt-1">
                Submitted {new Date(p.submitted_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => approve(p.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => reject(p.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Matches Tab ─────────────────────────────────────────
function MatchesTab({ matches }: { matches: Match[] }) {
  if (matches.length === 0)
    return <p className="text-[#1A1A1A]/50 py-12 text-center">No mutual matches yet.</p>

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <div
          key={m.id}
          className="bg-white rounded-xl p-5 border border-[#E8E4DC]"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: '#2563EB' }}
              >
                {m.profile_a?.display_initials ?? '?'}
              </span>
              <span className="text-lg text-[#1A1A1A]/30">↔</span>
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                {m.profile_b?.display_initials ?? '?'}
              </span>
            </div>
            <StatusBadge status={m.status} />
            {m.outcome && (
              <span className="text-xs text-[#1A1A1A]/50 capitalize">
                Outcome: {m.outcome.replace('_', ' ')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#1A1A1A]/60">
            {m.mutual_date && (
              <span>Matched {new Date(m.mutual_date).toLocaleDateString()}</span>
            )}
            <span>
              Family consent: {m.family_a_consented ? 'A ✓' : 'A ✗'} &nbsp;
              {m.family_b_consented ? 'B ✓' : 'B ✗'}
            </span>
            {m.introduced_date && (
              <span>Introduced {new Date(m.introduced_date).toLocaleDateString()}</span>
            )}
          </div>
          {m.admin_notes && (
            <p className="mt-2 text-sm italic text-[#1A1A1A]/50">{m.admin_notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── All Members Tab ──────────────────────────────────────
function MembersTab({ profiles }: { profiles: Profile[] }) {
  const [search, setSearch] = useState('')

  const filtered = profiles.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.display_initials.toLowerCase().includes(q) ||
      (p.location ?? '').toLowerCase().includes(q) ||
      (p.status ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <input
        type="search"
        placeholder="Search members…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:border-[#B8960C] transition-colors bg-white border-[#E8E4DC] text-[#1A1A1A]"
      />
      <div className="overflow-x-auto rounded-xl border border-[#E8E4DC]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F6F1] text-[#1A1A1A]/60 text-left">
              <th className="px-4 py-3 font-medium">Initials</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DC] bg-white">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#F8F6F1] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1A1A1A]">
                  {p.display_initials}
                  {p.duplicate_flag && (
                    <span className="ml-2 text-xs text-yellow-600">⚠</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#1A1A1A]/70 capitalize">{p.gender ?? '—'}</td>
                <td className="px-4 py-3 text-[#1A1A1A]/70">{p.age_display ?? '—'}</td>
                <td className="px-4 py-3 text-[#1A1A1A]/70">{p.location ?? '—'}</td>
                <td className="px-4 py-3 text-[#1A1A1A]/70">{p.profession_sector ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-[#1A1A1A]/50">
                  {p.submitted_date ? new Date(p.submitted_date).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-[#1A1A1A]/40 py-8">No members found.</p>
        )}
      </div>
    </div>
  )
}

// ─── Unlinked Profiles Tab ────────────────────────────────
function UnlinkedTab({ profiles }: { profiles: Profile[] }) {
  const unlinked = profiles.filter((p) => p.status === 'unlinked' || !p.user_id)

  if (unlinked.length === 0)
    return <p className="text-[#1A1A1A]/50 py-12 text-center">No unlinked profiles.</p>

  return (
    <div className="space-y-3">
      {unlinked.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-xl p-5 border border-[#E8E4DC] flex items-center gap-4"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: p.gender === 'female' ? '#8B5CF6' : '#2563EB' }}
          >
            {p.display_initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#1A1A1A]">{p.display_initials}</p>
            <p className="text-sm text-[#1A1A1A]/50">
              {p.imported_email ?? 'No email on file'} · {p.location ?? 'Unknown location'}
            </p>
            {p.legacy_ref && (
              <p className="text-xs text-[#1A1A1A]/30 mt-0.5">Legacy ref: {p.legacy_ref}</p>
            )}
          </div>
          <StatusBadge status={p.status} />
        </div>
      ))}
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('queue')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const [{ data: profileData }, { data: matchData }] = await Promise.all([
      supabase
        .from('zawaaj_profiles')
        .select('id,display_initials,gender,age_display,location,school_of_thought,profession_sector,status,submitted_date,contact_number,admin_comments,duplicate_flag,user_id,imported_email')
        .order('submitted_date', { ascending: false }),
      supabase
        .from('zawaaj_matches')
        .select(`
          id,profile_a_id,profile_b_id,mutual_date,status,
          family_a_consented,family_b_consented,introduced_date,outcome,admin_notes,
          profile_a:zawaaj_profiles!zawaaj_matches_profile_a_id_fkey(display_initials,gender,location),
          profile_b:zawaaj_profiles!zawaaj_matches_profile_b_id_fkey(display_initials,gender,location)
        `)
        .order('mutual_date', { ascending: false }),
    ])

    setProfiles((profileData as Profile[]) ?? [])
    setMatches((matchData as unknown as Match[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const pendingCount = profiles.filter((p) => p.status === 'pending').length
  const approvedCount = profiles.filter((p) => p.status === 'approved').length
  const unlinkedCount = profiles.filter((p) => p.status === 'unlinked' || !p.user_id).length

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'queue',   label: 'Review Queue',     badge: pendingCount },
    { key: 'matches', label: 'Mutual Matches',   badge: matches.length },
    { key: 'members', label: 'All Members',       badge: profiles.length },
    { key: 'unlinked',label: 'Unlinked Profiles', badge: unlinkedCount },
  ]

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      {/* Header */}
      <header style={{ backgroundColor: '#1A1A1A' }} className="shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-widest" style={{ color: '#B8960C' }}>
            زواج Zawaaj
          </span>
          <span className="text-white/40 text-sm">Admin Dashboard</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Dashboard</h1>
        <p className="text-[#1A1A1A]/50 mb-8">Manage applications, matches and members.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <Stat label="Pending review" value={pendingCount} />
          <Stat label="Approved members" value={approvedCount} />
          <Stat label="Mutual matches" value={matches.length} />
          <Stat label="Unlinked profiles" value={unlinkedCount} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-[#E8E4DC] w-fit flex-wrap">
          {tabs.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === key ? '#1A1A1A' : 'transparent',
                color: tab === key ? '#B8960C' : '#1A1A1A',
              }}
            >
              {label}
              {badge !== undefined && badge > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: tab === key ? '#B8960C' : '#1A1A1A',
                    color: tab === key ? '#1A1A1A' : '#FFFFFF',
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-[#1A1A1A]/40">
            Loading…
          </div>
        ) : (
          <>
            {tab === 'queue'   && <QueueTab   profiles={profiles} onRefresh={loadData} />}
            {tab === 'matches' && <MatchesTab  matches={matches} />}
            {tab === 'members' && <MembersTab  profiles={profiles} />}
            {tab === 'unlinked'&& <UnlinkedTab profiles={profiles} />}
          </>
        )}
      </main>
    </div>
  )
}
