'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import AvatarInitials from '@/components/AvatarInitials'

interface Profile {
  id: string
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
  status: string
  interests_this_month: number
  is_admin: boolean
}

interface Interest {
  id: string
  sent_date: string
  expires_date: string | null
  status: string
}

interface Match {
  id: string
  status: string
}

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paused: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-200 text-gray-600',
  suspended: 'bg-red-200 text-red-800',
  introduced: 'bg-purple-100 text-purple-800',
}

const WITHDRAWAL_REASONS = [
  'Found a spouse through Zawaaj',
  'Found a spouse elsewhere',
  'Taking a break',
  'Not ready at this time',
  'Technical issues',
  'Concerns about the platform',
  'Family decision',
  'Other',
]

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/40 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-white/80 flex items-center gap-1.5">
        <span>{icon}</span> {value}
      </p>
    </div>
  )
}

function InterestStatusBadge({ status }: { status: string }) {
  if (status === 'active') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#B8960C', color: '#fff' }}>Active</span>
  if (status === 'matched') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Matched</span>
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Expired</span>
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function MyProfilePage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [interests, setInterests] = useState<Interest[]>([])
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Withdrawal modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState(WITHDRAWAL_REASONS[0])
  const [withdrawn, setWithdrawn] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get active profile
      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: userProfiles } = await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, gender, age_display, height, ethnicity, school_of_thought, education_level, education_detail, profession_sector, profession_detail, location, attributes, spouse_preferences, status, interests_this_month, is_admin')
        .eq('user_id', user.id)

      if (!userProfiles || userProfiles.length === 0) { setLoading(false); return }

      const activeId = settings?.active_profile_id ?? userProfiles[0].id
      const active = userProfiles.find((p) => p.id === activeId) ?? userProfiles[0]
      setProfile(active)

      // Sent interests
      const { data: interestRows } = await supabase
        .from('zawaaj_interests')
        .select('id, sent_date, expires_date, status')
        .eq('sender_profile_id', active.id)
        .in('status', ['active', 'matched', 'expired'])
        .order('sent_date', { ascending: false })
        .limit(10)

      setInterests(interestRows ?? [])

      // Active match
      const { data: matchRows } = await supabase
        .from('zawaaj_matches')
        .select('id, status')
        .or(`profile_a_id.eq.${active.id},profile_b_id.eq.${active.id}`)
        .in('status', ['awaiting_admin', 'admin_reviewing', 'introduced'])
        .maybeSingle()

      setMatch(matchRows)
      setLoading(false)
    }
    load()
  }, [])

  async function handlePauseResume() {
    if (!profile) return
    setActionLoading(true)
    const newStatus = profile.status === 'approved' ? 'paused' : 'approved'
    const { error } = await supabase
      .from('zawaaj_profiles')
      .update({ status: newStatus })
      .eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, status: newStatus })
    }
    setActionLoading(false)
  }

  async function handleWithdraw() {
    if (!profile) return
    setActionLoading(true)
    const { error } = await supabase
      .from('zawaaj_profiles')
      .update({ status: 'withdrawn' })
      .eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, status: 'withdrawn' })
      setWithdrawn(true)
      setShowWithdrawModal(false)
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <p className="text-[#1A1A1A]/50 text-sm">Loading…</p>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <NavBar />
        <div className="pt-14 max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-semibold text-[#1A1A1A] mb-2">No profile found</p>
          <p className="text-sm text-[#1A1A1A]/50">You don't have a profile yet. Please contact the admin.</p>
        </div>
      </>
    )
  }

  const used = profile.interests_this_month
  const progressPct = Math.min((used / 5) * 100, 100)

  return (
    <>
      <NavBar />
      <main className="pt-14">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">My Profile</h1>

          {/* Withdrawn state */}
          {withdrawn && (
            <div className="rounded-xl p-5 mb-6 bg-gray-100 border border-gray-200 text-center">
              <p className="text-base font-semibold text-gray-700 mb-1">Profile withdrawn</p>
              <p className="text-sm text-gray-500 mb-4">Your profile has been withdrawn from the platform.</p>
              <button
                onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
                className="text-sm underline text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Match status banner */}
          {match && (match.status === 'awaiting_admin' || match.status === 'admin_reviewing') && (
            <div className="rounded-xl p-4 mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200">
              <span className="text-lg">⏳</span>
              <p className="text-sm text-amber-800">
                An introduction is being arranged — our admin team will be in touch.
              </p>
            </div>
          )}
          {match && match.status === 'introduced' && (
            <div className="rounded-xl p-4 mb-6 flex items-start gap-3 bg-green-50 border border-green-200">
              <span className="text-lg">✅</span>
              <p className="text-sm text-green-800">
                Introduction has been facilitated — the admin will share contact details.
              </p>
            </div>
          )}

          {/* Profile card */}
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#1A1A1A' }}>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <AvatarInitials initials={profile.display_initials} gender={profile.gender} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-white">{profile.display_initials}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={profile.status} />
                  {profile.gender && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={
                        profile.gender === 'female'
                          ? { backgroundColor: '#EEEDFE', color: '#534AB7' }
                          : { backgroundColor: '#E6F1FB', color: '#185FA5' }
                      }
                    >
                      {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <InfoRow icon="🌍" label="Ethnicity" value={profile.ethnicity} />
              <InfoRow icon="🕌" label="School of thought" value={profile.school_of_thought} />
              <InfoRow icon="🎓" label="Education level" value={profile.education_level} />
              <InfoRow icon="🎓" label="Education detail" value={profile.education_detail} />
              <InfoRow icon="💼" label="Profession sector" value={profile.profession_sector} />
              <InfoRow icon="💼" label="Profession detail" value={profile.profession_detail} />
              <InfoRow icon="📏" label="Height" value={profile.height} />
              <InfoRow icon="📍" label="Location" value={profile.location} />
              {profile.age_display && <InfoRow icon="🎂" label="Age" value={`${profile.age_display} years old`} />}
            </div>

            {/* Attributes */}
            {profile.attributes && profile.attributes.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wide text-white/40 font-medium mb-2">About me</p>
                <div className="flex flex-wrap gap-2">
                  {profile.attributes.map((attr, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70">{attr}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Spouse preferences */}
            {profile.spouse_preferences && profile.spouse_preferences.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-wide text-white/40 font-medium mb-2">Looking for</p>
                <div className="flex flex-wrap gap-2">
                  {profile.spouse_preferences.map((pref, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70">{pref}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!withdrawn && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                <Link
                  href="/my-profile/edit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white border border-white/30 hover:border-white/60 transition-colors"
                >
                  Edit profile
                </Link>

                {(profile.status === 'approved' || profile.status === 'paused') && (
                  <button
                    onClick={handlePauseResume}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    style={
                      profile.status === 'approved'
                        ? { backgroundColor: '#B8960C', color: '#fff' }
                        : { backgroundColor: '#185FA5', color: '#fff' }
                    }
                  >
                    {profile.status === 'approved' ? 'Pause profile' : 'Resume profile'}
                  </button>
                )}

                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                >
                  Withdraw profile
                </button>
              </div>
            )}
          </div>

          {/* Monthly allowance */}
          <section className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Introduction requests this month</h2>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, backgroundColor: '#B8960C' }}
                />
              </div>
              <span className="text-sm font-semibold text-[#1A1A1A]">{used}/5</span>
            </div>
            <p className="text-xs text-[#1A1A1A]/50">Resets on the 1st of each month</p>
          </section>

          {/* Sent introductions */}
          <section className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-4">Introduction requests sent</h2>
            {interests.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/50">No introduction requests sent yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {interests.map((interest) => {
                  const days = interest.status === 'active' ? daysUntil(interest.expires_date) : null
                  return (
                    <li
                      key={interest.id}
                      className="flex items-center justify-between rounded-lg px-4 py-3"
                      style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E4DC' }}
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          Sent {new Date(interest.sent_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {days !== null && days > 0 && (
                          <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Expires in {days} day{days !== 1 ? 's' : ''}</p>
                        )}
                        {days !== null && days <= 0 && (
                          <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Expired</p>
                        )}
                      </div>
                      <InterestStatusBadge status={interest.status} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      {/* Withdrawal modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 className="text-base font-bold text-[#1A1A1A] mb-1">Withdraw your profile</h3>
            <p className="text-sm text-[#1A1A1A]/60 mb-5">
              Please let us know why you are withdrawing. Your profile will no longer be visible on the platform.
            </p>
            <label className="block text-xs font-semibold text-[#1A1A1A]/70 uppercase tracking-wide mb-1.5">
              Reason
            </label>
            <select
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1A1A1A] mb-5 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#B8960C' } as React.CSSProperties}
            >
              {WITHDRAWAL_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-[#1A1A1A] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Withdrawing…' : 'Confirm withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
