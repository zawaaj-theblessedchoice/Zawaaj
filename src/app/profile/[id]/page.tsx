'use client'

import { useEffect, useState, use } from 'react'
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
}

interface ActiveProfile {
  id: string
  status: string
  interests_this_month: number
  user_id: string | null
}

type ButtonState =
  | 'hidden'
  | 'not_approved'
  | 'limit_reached'
  | 'already_requested'
  | 'available'

function InfoField({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#F0EDE7', border: '1px solid #E0DBD1' }}>
      <p className="text-xs text-[#1A1A1A]/50 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-sm font-medium text-[#1A1A1A] flex items-center gap-1.5">
        <span>{icon}</span> {value}
      </p>
    </div>
  )
}

function TagChip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-3 py-1.5 rounded-full font-medium"
      style={{ backgroundColor: '#EDE8DC', color: '#5A4E3A' }}
    >
      {label}
    </span>
  )
}

function RequestIntroductionButton({
  profile,
  activeProfile,
}: {
  profile: Profile
  activeProfile: ActiveProfile
}) {
  const supabase = createClient()
  const [buttonState, setButtonState] = useState<ButtonState>('available')
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function determineState() {
      // Can't request yourself
      if (activeProfile.id === profile.id) {
        setButtonState('hidden')
        setLoading(false)
        return
      }
      // Active profile must be approved
      if (activeProfile.status !== 'approved') {
        setButtonState('not_approved')
        setLoading(false)
        return
      }
      // Monthly limit
      if (activeProfile.interests_this_month >= 5) {
        setButtonState('limit_reached')
        setLoading(false)
        return
      }
      // Check existing active interest
      const { data: existing } = await supabase
        .from('zawaaj_interests')
        .select('id')
        .eq('sender_profile_id', activeProfile.id)
        .eq('recipient_profile_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      if (existing) {
        setButtonState('already_requested')
      } else {
        setButtonState('available')
      }
      setLoading(false)
    }
    determineState()
  }, [activeProfile, profile])

  async function handleRequest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_profile_id: profile.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
      } else {
        setButtonState('already_requested')
        const remaining = json.remainingRequests ?? 0
        if (json.mutual) {
          setSuccess(`Mutual interest! An introduction is being arranged. ${remaining} request${remaining !== 1 ? 's' : ''} remaining this month.`)
        } else {
          setSuccess(`Introduction requested successfully. ${remaining} request${remaining !== 1 ? 's' : ''} remaining this month.`)
        }
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (buttonState === 'hidden') return null

  return (
    <div className="flex flex-col gap-2">
      {buttonState === 'not_approved' && (
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"
        >
          Profile not approved
        </button>
      )}
      {buttonState === 'limit_reached' && (
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"
        >
          Monthly limit reached (5/5)
        </button>
      )}
      {buttonState === 'already_requested' && (
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"
        >
          Introduction requested
        </button>
      )}
      {buttonState === 'available' && (
        <button
          onClick={handleRequest}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#B8960C' }}
        >
          {loading ? 'Requesting…' : 'Request introduction'}
        </button>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: profileData }, { data: { user } }] = await Promise.all([
        supabase
          .from('zawaaj_profiles')
          .select(
            'id, display_initials, gender, age_display, height, ethnicity, school_of_thought, education_level, education_detail, profession_sector, profession_detail, location, attributes, spouse_preferences, status'
          )
          .eq('id', id)
          .eq('status', 'approved')
          .maybeSingle(),
        supabase.auth.getUser(),
      ])

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setProfile(profileData)

      if (user) {
        const { data: settings } = await supabase
          .from('zawaaj_user_settings')
          .select('active_profile_id')
          .eq('user_id', user.id)
          .maybeSingle()

        const { data: userProfiles } = await supabase
          .from('zawaaj_profiles')
          .select('id, status, interests_this_month, user_id')
          .eq('user_id', user.id)

        if (userProfiles && userProfiles.length > 0) {
          const activeId = settings?.active_profile_id ?? userProfiles[0].id
          const active = userProfiles.find((p) => p.id === activeId) ?? userProfiles[0]
          setActiveProfile(active)
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <p className="text-[#1A1A1A]/50 text-sm">Loading profile…</p>
        </div>
      </>
    )
  }

  if (notFound || !profile) {
    return (
      <>
        <NavBar />
        <div className="pt-14 max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-semibold text-[#1A1A1A] mb-2">Profile not found</p>
          <p className="text-sm text-[#1A1A1A]/50 mb-6">
            This profile may not exist or is not currently available.
          </p>
          <Link
            href="/directory"
            className="text-sm font-semibold underline"
            style={{ color: '#B8960C' }}
          >
            ← Back to directory
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <main className="pt-14">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Back link */}
          <Link
            href="/directory"
            className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
            style={{ color: '#B8960C' }}
          >
            ← Back to directory
          </Link>

          {/* Profile header */}
          <div className="flex items-center gap-5 mb-8">
            <AvatarInitials initials={profile.display_initials} gender={profile.gender} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">{profile.display_initials}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {profile.gender && (
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={
                      profile.gender === 'female'
                        ? { backgroundColor: '#EEEDFE', color: '#534AB7' }
                        : { backgroundColor: '#E6F1FB', color: '#185FA5' }
                    }
                  >
                    {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                  </span>
                )}
                {profile.age_display && (
                  <span className="text-sm text-[#1A1A1A]/60">{profile.age_display} years old</span>
                )}
                {profile.location && (
                  <span className="text-sm text-[#1A1A1A]/60">📍 {profile.location}</span>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            <InfoField icon="🌍" label="Ethnicity" value={profile.ethnicity} />
            <InfoField icon="🕌" label="School of thought" value={profile.school_of_thought} />
            <InfoField icon="🎓" label="Education level" value={profile.education_level} />
            <InfoField icon="🎓" label="Education detail" value={profile.education_detail} />
            <InfoField icon="💼" label="Profession sector" value={profile.profession_sector} />
            <InfoField icon="💼" label="Profession detail" value={profile.profession_detail} />
            <InfoField icon="📏" label="Height" value={profile.height} />
            <InfoField icon="📍" label="Location" value={profile.location} />
          </div>

          {/* Attributes */}
          {profile.attributes && profile.attributes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">About me</h2>
              <div className="flex flex-wrap gap-2">
                {profile.attributes.map((attr, i) => (
                  <TagChip key={i} label={attr} />
                ))}
              </div>
            </section>
          )}

          {/* Spouse preferences */}
          {profile.spouse_preferences && profile.spouse_preferences.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Looking for</h2>
              <div className="flex flex-wrap gap-2">
                {profile.spouse_preferences.map((pref, i) => (
                  <TagChip key={i} label={pref} />
                ))}
              </div>
            </section>
          )}

          {/* Contact info locked */}
          <div
            className="rounded-xl p-4 mb-4 flex items-start gap-3"
            style={{ backgroundColor: '#F0EDE7', border: '1px solid #E0DBD1' }}
          >
            <span className="text-xl mt-0.5">🔒</span>
            <p className="text-sm text-[#1A1A1A]/70 leading-relaxed">
              Contact details are only shared after both families have verbally consented to an introduction.
            </p>
          </div>

          {/* Request introduction */}
          {activeProfile && (
            <RequestIntroductionButton profile={profile} activeProfile={activeProfile} />
          )}
        </div>
      </main>
    </>
  )
}
