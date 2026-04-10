'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import AvatarInitials from '@/components/AvatarInitials'

interface Profile {
  id: string
  display_initials: string
  gender: string | null
  age_display: string | null
  height: string | null
  ethnicity: string | null
  nationality: string | null
  school_of_thought: string | null
  education_level: string | null
  education_detail: string | null
  profession_detail: string | null
  location: string | null
  bio: string | null
  religiosity: string | null
  prayer_regularity: string | null
  wears_hijab: boolean | null
  keeps_beard: boolean | null
  marital_status: string | null
  has_children: boolean | null
  languages_spoken: string | null
  living_situation: string | null
  open_to_relocation: string | null
  pref_age_min: number | null
  pref_age_max: number | null
  pref_location: string | null
  pref_ethnicity: string | null
  pref_school_of_thought: string[] | null
  pref_partner_children: string | null
  status: string
}

interface ActiveProfile {
  id: string
  status: string
  interests_this_month: number
  gender: string | null
  display_initials: string
  first_name: string | null
}

type ButtonState = 'hidden' | 'not_approved' | 'limit_reached' | 'already_requested' | 'available'

// ── Display-value maps ────────────────────────────────────────────────────────

const MARITAL_MAP: Record<string, string> = {
  never_married: 'Never married',
  divorced: 'Divorced',
  widowed: 'Widowed',
}
const LIVING_MAP: Record<string, string> = {
  independent: 'Independent',
  with_family: 'With family',
  shared: 'Shared accommodation',
}
const PRAYER_MAP: Record<string, string> = {
  yes_regularly: 'Yes, regularly',
  most_of_time: 'Most of the time',
  working_on_it: 'Working on it',
  not_currently: 'Not currently',
}

function displayValue(map: Record<string, string>, v: string | null): string | null {
  if (!v) return null
  return map[v] ?? v
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--text-muted)', marginBottom: 14, marginTop: 24,
    }}>
      {children}
    </div>
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
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function determineState() {
      if (activeProfile.id === profile.id) {
        setButtonState('hidden')
        setLoading(false)
        return
      }
      if (activeProfile.status !== 'approved') {
        setButtonState('not_approved')
        setLoading(false)
        return
      }
      if (activeProfile.interests_this_month >= 5) {
        setButtonState('limit_reached')
        setLoading(false)
        return
      }
      const { data: existing } = await supabase
        .from('zawaaj_introduction_requests')
        .select('id')
        .eq('requesting_profile_id', activeProfile.id)
        .eq('target_profile_id', profile.id)
        .in('status', ['pending', 'mutual', 'facilitated'])
        .maybeSingle()

      setButtonState(existing ? 'already_requested' : 'available')
      setLoading(false)
    }
    determineState()
  }, [activeProfile, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRequest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/introduction-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_profile_id: profile.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
      } else {
        setButtonState('already_requested')
        setSuccess(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (buttonState === 'hidden') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {buttonState === 'not_approved' && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Your profile must be approved before you can send introduction requests
        </div>
      )}
      {buttonState === 'limit_reached' && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Monthly limit reached (5/5) — resets on the 1st
        </div>
      )}
      {buttonState === 'already_requested' && !success && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Introduction request already sent
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.25)', fontSize: 13, color: 'var(--status-success)', textAlign: 'center' }}>
          Introduction request sent — our team will be in touch with both families.
        </div>
      )}
      {buttonState === 'available' && (
        <button
          onClick={handleRequest}
          disabled={loading}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 9,
            background: loading ? 'var(--surface-3)' : 'var(--gold)',
            border: 'none',
            color: loading ? 'var(--text-muted)' : 'var(--surface)',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Checking…' : 'Request introduction'}
        </button>
      )}
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', fontSize: 12.5, color: 'var(--status-error)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const pathname = usePathname()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null)
  const [managedProfiles, setManagedProfiles] = useState<Array<{ id: string; display_initials: string; first_name: string | null; gender: string | null; status: string }>>([])
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introRequestsCount, setIntroRequestsCount] = useState(0)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: profileData }, { data: { user } }] = await Promise.all([
        supabase
          .from('zawaaj_profiles')
          .select(
            'id, display_initials, gender, age_display, height, ethnicity, nationality, school_of_thought, education_level, education_detail, profession_detail, location, bio, religiosity, prayer_regularity, wears_hijab, keeps_beard, marital_status, has_children, languages_spoken, living_situation, open_to_relocation, pref_age_min, pref_age_max, pref_location, pref_ethnicity, pref_school_of_thought, pref_partner_children, status'
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
          .select('id, status, interests_this_month, gender, display_initials, first_name')
          .eq('user_id', user.id)

        if (userProfiles && userProfiles.length > 0) {
          const activeId = settings?.active_profile_id ?? userProfiles[0].id
          const active = userProfiles.find(p => p.id === activeId) ?? userProfiles[0]
          setActiveProfile(active)
          setActiveProfileId(activeId)
          setManagedProfiles(userProfiles.map(p => ({
            id: p.id,
            display_initials: p.display_initials,
            first_name: p.first_name,
            gender: p.gender,
            status: p.status,
          })))

          const [slResult, irCountResult] = await Promise.all([
            supabase
              .from('zawaaj_saved_profiles')
              .select('id', { count: 'exact', head: true })
              .eq('profile_id', active.id),
            supabase
              .from('zawaaj_introduction_requests')
              .select('id', { count: 'exact', head: true })
              .eq('requesting_profile_id', active.id)
              .in('status', ['pending', 'mutual']),
          ])
          setShortlistCount(slResult.count ?? 0)
          setIntroRequestsCount(irCountResult.count ?? 0)
        }
      }

      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarProfile = activeProfile
    ? { display_initials: activeProfile.display_initials, gender: activeProfile.gender, first_name: activeProfile.first_name }
    : null

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute={pathname ?? ''} shortlistCount={0} introRequestsCount={0} profile={null} managedProfiles={[]} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
        </main>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute={pathname ?? ''} shortlistCount={shortlistCount} introRequestsCount={introRequestsCount} profile={sidebarProfile} managedProfiles={managedProfiles} activeProfileId={activeProfileId} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Profile not found</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              This profile may not exist or is not currently available.
            </p>
            <Link href="/browse" style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
              Back to browse
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const hasPref = profile.pref_age_min || profile.pref_age_max || profile.pref_location ||
    profile.pref_ethnicity || (profile.pref_school_of_thought?.length ?? 0) > 0 || profile.pref_partner_children

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute={pathname ?? ''}
        shortlistCount={shortlistCount}
        introRequestsCount={introRequestsCount}
        profile={sidebarProfile}
        managedProfiles={managedProfiles}
        activeProfileId={activeProfileId}
      />
      <main style={{ marginLeft: 200, flex: 1 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Back */}
          <Link
            href="/browse"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--gold)', textDecoration: 'none', marginBottom: 28 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to browse
          </Link>

          {/* Profile card */}
          <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24, marginBottom: 16 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <AvatarInitials initials={profile.display_initials} gender={profile.gender} size="xl" goldBorder />
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {profile.display_initials}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {profile.gender && (
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 999,
                      background: profile.gender === 'female' ? 'var(--avatar-female-bg)' : 'var(--avatar-male-bg)',
                      color: profile.gender === 'female' ? 'var(--avatar-female-text)' : 'var(--avatar-male-text)',
                    }}>
                      {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                    </span>
                  )}
                  {profile.age_display && (
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{profile.age_display} years old</span>
                  )}
                  {profile.location && (
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{profile.location}</span>
                  )}
                </div>
              </div>
            </div>

            {/* About */}
            <SectionLabel>About</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FieldRow label="Ethnicity" value={profile.ethnicity} />
              <FieldRow label="Nationality" value={profile.nationality} />
              <FieldRow label="Marital status" value={displayValue(MARITAL_MAP, profile.marital_status)} />
              <FieldRow label="Has children" value={profile.has_children === true ? 'Yes' : profile.has_children === false ? 'No' : null} />
              <FieldRow label="Height" value={profile.height} />
              <FieldRow label="Living situation" value={displayValue(LIVING_MAP, profile.living_situation)} />
              <FieldRow label="Languages" value={profile.languages_spoken} />
              <FieldRow label="Open to relocation" value={profile.open_to_relocation} />
            </div>

            {/* Education & profession */}
            <SectionLabel>Education & profession</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FieldRow label="Education level" value={profile.education_level} />
              <FieldRow label="Institution" value={profile.education_detail} />
              <FieldRow label="Profession" value={profile.profession_detail} />
            </div>

            {/* Faith */}
            <SectionLabel>Faith & practice</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FieldRow label="School of thought" value={profile.school_of_thought} />
              <FieldRow label="Religiosity" value={profile.religiosity} />
              <FieldRow label="Prayer regularity" value={displayValue(PRAYER_MAP, profile.prayer_regularity)} />
              {profile.gender === 'female' && (
                <FieldRow label="Wears hijab" value={profile.wears_hijab === true ? 'Yes' : profile.wears_hijab === false ? 'No' : null} />
              )}
              {profile.gender === 'male' && (
                <FieldRow label="Keeps beard" value={profile.keeps_beard === true ? 'Yes' : profile.keeps_beard === false ? 'No' : null} />
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <>
                <SectionLabel>About me</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{profile.bio}</p>
              </>
            )}

            {/* Looking for */}
            {hasPref && (
              <>
                <SectionLabel>Looking for</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <FieldRow
                    label="Preferred age"
                    value={(profile.pref_age_min || profile.pref_age_max) ? `${profile.pref_age_min ?? '?'} – ${profile.pref_age_max ?? '?'}` : null}
                  />
                  <FieldRow label="Location" value={profile.pref_location} />
                  <FieldRow label="Ethnicity" value={profile.pref_ethnicity} />
                  <FieldRow label="School of thought" value={profile.pref_school_of_thought?.join(', ') ?? null} />
                  <FieldRow label="Partner's children" value={profile.pref_partner_children} />
                </div>
              </>
            )}
          </div>

          {/* Contact privacy notice */}
          <div style={{
            background: 'var(--surface-2)', border: '0.5px solid var(--border-default)',
            borderRadius: 13, padding: '14px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="var(--text-muted)" strokeWidth="1.2" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Contact details are only shared after both families have verbally consented to an introduction.
            </p>
          </div>

          {/* Request introduction */}
          {activeProfile && (
            <RequestIntroductionButton profile={profile} activeProfile={activeProfile} />
          )}
        </div>
      </main>
    </div>
  )
}
