'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import AvatarInitials, { isNamePending, NAME_PENDING_LABEL } from '@/components/AvatarInitials'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'
import { fetchPlanLimits } from '@/lib/config/profileOptions'
import { RELOCATION_LABELS, EDUCATION_LABELS, RELIGIOSITY_LABELS } from '@/lib/labels'
import { isProfileBrowseVisible, type MandatoryProfileFields } from '@/lib/zawaaj/profileCompleteness'

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
  wears_niqab: string | null
  wears_abaya: string | null
  keeps_beard: boolean | null
  quran_frequency: string | null
  quran_depth: string | null
  quran_application: string | null
  marital_status: string | null
  has_children: boolean | null
  languages_spoken: string[] | null
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
  monthlyLimit,
}: {
  profile: Profile
  activeProfile: ActiveProfile
  monthlyLimit: number
}) {
  const supabase = createClient()
  const [buttonState, setButtonState] = useState<ButtonState>('available')
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [wasReExpressed, setWasReExpressed] = useState(false)
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
      if (activeProfile.interests_this_month >= monthlyLimit) {
        setButtonState('limit_reached')
        setLoading(false)
        return
      }
      const { data: existing } = await supabase
        .from('zawaaj_introduction_requests')
        .select('id')
        .eq('requesting_profile_id', activeProfile.id)
        .eq('target_profile_id', profile.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle()

      setButtonState(existing ? 'already_requested' : 'available')
      setLoading(false)
    }
    determineState()
  }, [activeProfile, profile, monthlyLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRequest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/introduction-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_profile_id: profile.id }),
      })
      const json = await res.json().catch(() => ({})) as { error?: string; wasReExpressed?: boolean }
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
      } else {
        setButtonState('already_requested')
        setSuccess(true)
        setWasReExpressed(json.wasReExpressed === true)
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
          Your profile must be approved before you can express interest
        </div>
      )}
      {buttonState === 'limit_reached' && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Monthly limit reached ({monthlyLimit}/{monthlyLimit === Infinity ? '∞' : monthlyLimit}) — resets on the 1st
        </div>
      )}
      {buttonState === 'already_requested' && !success && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Interest already sent
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.25)', fontSize: 13, color: 'var(--status-success)', textAlign: 'center' }}>
          Interest sent — our team will be in touch with both families.
        </div>
      )}
      {success && wasReExpressed && (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          You previously expressed interest in this profile. Your new request has been sent.
        </p>
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
          {loading ? 'Checking…' : 'Express interest'}
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
  const [monthlyLimit, setMonthlyLimit] = useState(2) // safe fallback; overwritten from zawaaj_plans on load
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: profileData }, { data: { user } }] = await Promise.all([
        supabase
          .from('zawaaj_profiles')
          .select(
            // first_name/date_of_birth/spouse_preferences/consent_given are fetched
            // ONLY to evaluate completeness (CD-010) — they are discarded before the
            // profile is stored in state, never rendered (CD-004 privacy).
            'id, display_initials, gender, age_display, height, ethnicity, nationality, school_of_thought, education_level, education_detail, profession_detail, location, bio, religiosity, prayer_regularity, wears_hijab, wears_niqab, wears_abaya, keeps_beard, quran_frequency, quran_depth, quran_application, marital_status, has_children, languages_spoken, living_situation, open_to_relocation, pref_age_min, pref_age_max, pref_location, pref_ethnicity, pref_school_of_thought, pref_partner_children, status, first_name, date_of_birth, spouse_preferences, consent_given, imported_at'
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

      // A profile not discoverable by browse must also be 404 via direct link.
      // Scoped (Option C): imported legacy-cohort profiles use the light core-field
      // bar; everyone else the full CD-010 bar. Name/DOB fields are fetched only
      // for the check and discarded before render (CD-004 privacy — initials only).
      const { first_name, date_of_birth, spouse_preferences, consent_given, imported_at, ...renderProfile } =
        profileData as Profile & MandatoryProfileFields & { imported_at?: string | null }
      if (!isProfileBrowseVisible({
        first_name, date_of_birth, spouse_preferences, consent_given,
        gender: renderProfile.gender, location: renderProfile.location,
        age_display: renderProfile.age_display, height: renderProfile.height,
        ethnicity: renderProfile.ethnicity, education_level: renderProfile.education_level,
        education_detail: renderProfile.education_detail, profession_detail: renderProfile.profession_detail,
        school_of_thought: renderProfile.school_of_thought,
      }, !!imported_at)) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setProfile(renderProfile)

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

          const [slResult, irCountResult, subRow] = await Promise.all([
            supabase
              .from('zawaaj_saved_profiles')
              .select('id', { count: 'exact', head: true })
              .eq('profile_id', active.id),
            supabase
              .from('zawaaj_introduction_requests')
              .select('id', { count: 'exact', head: true })
              .eq('requesting_profile_id', active.id)
              .in('status', ['pending', 'accepted']),
            supabase
              .from('zawaaj_subscriptions')
              .select('plan')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .maybeSingle(),
          ])
          setShortlistCount(slResult.count ?? 0)
          setIntroRequestsCount(irCountResult.count ?? 0)
          const userPlan = ((subRow.data as { plan?: string } | null)?.plan ?? 'free') as Plan
          // Read monthly limit from zawaaj_plans via fetchPlanLimits — DB is source of truth
          const planKey = userPlan === 'free' ? 'voluntary' : userPlan
          const planLimits = await fetchPlanLimits(supabase)
          const monthlyInterests = planLimits[planKey]?.monthlyInterests
          // Infinity → unlimited; undefined/fallback → static plan-config value
          setMonthlyLimit(monthlyInterests ?? getPlanConfig(userPlan).monthlyLimit)
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
                  {isNamePending(profile.display_initials) ? NAME_PENDING_LABEL : profile.display_initials}
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
              <FieldRow label="Languages" value={profile.languages_spoken?.join(', ') ?? null} />
              <FieldRow label="Open to relocation" value={displayValue(RELOCATION_LABELS, profile.open_to_relocation)} />
            </div>

            {/* Education & profession */}
            <SectionLabel>Education & profession</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FieldRow label="Education level" value={displayValue(EDUCATION_LABELS, profile.education_level)} />
              <FieldRow label="Institution" value={profile.education_detail} />
              <FieldRow label="Profession" value={profile.profession_detail} />
            </div>

            {/* Faith */}
            <SectionLabel>Faith & practice</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FieldRow label="School of thought" value={profile.school_of_thought} />
              <FieldRow label="Religiosity" value={displayValue(RELIGIOSITY_LABELS, profile.religiosity)} />
              <FieldRow label="Prayer regularity" value={displayValue(PRAYER_MAP, profile.prayer_regularity)} />
              {profile.gender === 'female' && (
                <FieldRow label="Wears hijab" value={profile.wears_hijab === true ? 'Yes' : profile.wears_hijab === false ? 'No' : null} />
              )}
              {profile.gender === 'female' && profile.wears_niqab && (
                <FieldRow label="Wears niqab" value={displayValue({ yes: 'Yes', no: 'No', sometimes: 'Sometimes' }, profile.wears_niqab)} />
              )}
              {profile.gender === 'female' && profile.wears_abaya && (
                <FieldRow label="Wears abaya" value={displayValue({ yes: 'Yes', no: 'No', sometimes: 'Sometimes' }, profile.wears_abaya)} />
              )}
              {profile.gender === 'male' && (
                <FieldRow label="Keeps beard" value={profile.keeps_beard === true ? 'Yes' : profile.keeps_beard === false ? 'No' : null} />
              )}
              {profile.quran_frequency && profile.quran_frequency !== 'not_currently' && (
                <FieldRow label="Qur'an frequency" value={displayValue({
                  occasionally: 'Occasionally — a few times a month or less',
                  weekly: 'Weekly — at least once a week',
                  few_times_week: 'Several times a week',
                  daily: "Daily — it's part of my routine",
                  // legacy aliases
                  rarely: 'Occasionally — a few times a month or less',
                  several_weekly: 'Several times a week',
                }, profile.quran_frequency)} />
              )}
              {profile.quran_depth && profile.quran_depth !== 'not_currently' && (
                <FieldRow label="Qur'an depth" value={displayValue({
                  recitation_listening: 'Recitation or listening',
                  reading_reflection: 'Reading with reflection',
                  active_study: 'Active study',
                  structured_tafsir: 'Structured learning with tafsir',
                  // legacy aliases
                  recitation: 'Recitation or listening',
                  reflection: 'Reading with reflection',
                  study: 'Active study',
                  scholarly: 'Structured learning with tafsir',
                }, profile.quran_depth)} />
              )}
              {profile.quran_application && profile.quran_application !== 'not_currently' && (
                <FieldRow label="Qur'an in daily life" value={displayValue({
                  still_learning_apply: 'Still learning to apply it',
                  ongoing_journey: 'Ongoing journey of applying it',
                  guides_decisions: 'Guides key decisions',
                  foundation_character: 'Foundation of character and priorities',
                  // legacy aliases
                  learning: 'Still learning to apply it',
                  trying: 'Ongoing journey of applying it',
                  guiding: 'Guides key decisions',
                  central: 'Foundation of character and priorities',
                }, profile.quran_application)} />
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
                  <FieldRow label="Partner's children" value={displayValue({
                    yes: 'Yes, open to this', no_preference: 'No preference',
                    prefer_not: 'Would prefer not', not_specified: 'Not specified',
                    open: 'Open to it', possibly: 'Possibly', no: 'No',
                  }, profile.pref_partner_children)} />
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
            <RequestIntroductionButton profile={profile} activeProfile={activeProfile} monthlyLimit={monthlyLimit} />
          )}
        </div>
      </main>
    </div>
  )
}
