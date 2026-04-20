'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import AvatarInitials from '@/components/AvatarInitials'
import UpgradeModal from '@/components/UpgradeModal'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'

interface Profile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  date_of_birth: string | null
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
  quran_engagement_level: string | null
  marital_status: string | null
  has_children: boolean | null
  languages_spoken: string[] | null
  living_situation: string | null
  open_to_relocation: string | null
  open_to_partners_children: string | null
  polygamy_openness: string | null
  pref_age_min: number | null
  pref_age_max: number | null
  pref_location: string | null
  pref_ethnicity: string | null
  pref_school_of_thought: string[] | null
  pref_partner_children: string | null
  pref_relocation: string | null
  status: string
  is_admin: boolean
  interests_this_month: number
  islamic_background: string | null
  smoker: boolean | null
  place_of_birth: string | null
  marriage_reason: string | null
  open_to_marital_status: string | null
}

interface IntroRequest {
  id: string
  target_profile_id: string
  status: string
  created_at: string
  expires_at: string
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

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

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
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14, marginTop: 24 }}>
      {children}
    </div>
  )
}

function statusColour(s: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    approved:  { bg: 'var(--status-success-bg)', text: 'var(--status-success)' },
    pending:   { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)' },
    paused:    { bg: 'var(--status-info-bg)', text: 'var(--status-info)' },
    rejected:  { bg: 'var(--status-error-bg)', text: 'var(--status-error)' },
    withdrawn: { bg: 'var(--surface-3)', text: 'var(--text-muted)' },
    suspended: { bg: 'var(--status-error-bg)', text: 'var(--status-error)' },
    introduced:{ bg: 'var(--gold-muted)', text: 'var(--gold-light)' },
  }
  return map[s] ?? { bg: 'var(--surface-3)', text: 'var(--text-secondary)' }
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function displayValue(map: Record<string, string>, v: string | null): string | null {
  if (!v) return null
  return map[v] ?? v
}

function EditField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}

const LANGUAGE_OPTIONS = [
  'English', 'Arabic', 'Urdu', 'Bengali / Sylheti', 'Punjabi',
  'Somali', 'Turkish', 'French', 'Gujarati', 'Pashto / Dari',
  'Persian / Farsi', 'Tamil', 'Swahili', 'Albanian', 'Polish', 'Other',
]

function EditChips({ label, selected, onChange }: { label: string; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {LANGUAGE_OPTIONS.map(opt => {
          const active = selected.includes(opt)
          return (
            <button key={opt} onClick={() => toggle(opt)} type="button" style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer',
              border: active ? '0.5px solid var(--border-gold)' : '0.5px solid var(--border-default)',
              background: active ? 'var(--gold-muted)' : 'var(--surface-3)',
              color: active ? 'var(--gold)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EditSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export default function MyProfilePage() {
  const supabase = createClient()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [managedProfiles, setManagedProfiles] = useState<Array<{ id: string; display_initials: string; first_name: string | null; gender: string | null; status: string }>>([])
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introRequestsCount, setIntroRequestsCount] = useState(0)
  const [introRequests, setIntroRequests] = useState<IntroRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState(WITHDRAWAL_REASONS[0])
  const [withdrawn, setWithdrawn] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [plan, setPlan] = useState<'free' | 'plus' | 'premium'>('free')
  const [showViewsUpgrade, setShowViewsUpgrade] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSection, setEditSection] = useState<string>('about')
  const [editForm, setEditForm] = useState({
    // Personal & lifestyle
    location: '',
    height: '',
    languagesSpoken: [] as string[],
    livingSituation: '',
    openToRelocation: '',
    openToPartnersChildren: '',
    polygamyOpenness: '',
    // Background
    professionDetail: '',
    educationLevel: '',
    educationDetail: '',
    nationality: '',
    ethnicity: '',
    // Faith
    schoolOfThought: '',
    religiosity: '',
    prayerRegularity: '',
    wearsHijab: '',
    wearsNiqab: '',
    wearsAbaya: '',
    keepsBeard: '',
    quranEngagement: '',
    // Bio
    bio: '',
    // Partner preferences
    prefAgeMin: '',
    prefAgeMax: '',
    prefLocation: '',
    prefEthnicity: '',
    prefSchoolOfThought: '',
    prefPartnerChildren: '',
    prefRelocation: '',
    islamicBackground: '',
    placeOfBirth: '',
    smoker: '',
    marriageReason: '',
    openToMaritalStatus: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  // Change password
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: profileRows } = await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, last_name, gender, date_of_birth, age_display, height, ethnicity, nationality, school_of_thought, education_level, education_detail, profession_detail, location, bio, religiosity, prayer_regularity, wears_hijab, wears_niqab, wears_abaya, keeps_beard, quran_engagement_level, marital_status, has_children, languages_spoken, living_situation, open_to_relocation, open_to_partners_children, polygamy_openness, pref_age_min, pref_age_max, pref_location, pref_ethnicity, pref_school_of_thought, pref_partner_children, pref_relocation, status, is_admin, interests_this_month, islamic_background, smoker, place_of_birth, marriage_reason, open_to_marital_status')
        .eq('user_id', user.id)

      if (!profileRows?.length) { setLoading(false); return }
      const activeId = settings?.active_profile_id ?? profileRows[0].id
      const active = profileRows.find(p => p.id === activeId) ?? profileRows[0]
      setProfile(active)
      setActiveProfileId(activeId)
      // Populate managed profiles for the Sidebar switcher
      setManagedProfiles(profileRows.map(p => ({
        id: p.id,
        display_initials: p.display_initials,
        first_name: p.first_name,
        gender: p.gender,
        status: p.status,
      })))

      const { data: irRows } = await supabase
        .from('zawaaj_introduction_requests')
        .select('id, target_profile_id, status, created_at, expires_at')
        .eq('requesting_profile_id', active.id)
        .order('created_at', { ascending: false })
        .limit(15)

      setIntroRequests(irRows ?? [])

      // Subscription plan
      const { data: subData } = await supabase
        .from('zawaaj_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      const rawPlanValue = (subData?.plan as string | null) ?? 'free'
      setPlan((['free', 'plus', 'premium'].includes(rawPlanValue) ? rawPlanValue : 'free') as 'free' | 'plus' | 'premium')

      // Sidebar counts
      const [slResult, irCountResult] = await Promise.all([
        supabase
          .from('zawaaj_saved_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', active.id),
        supabase
          .from('zawaaj_introduction_requests')
          .select('id', { count: 'exact', head: true })
          .eq('requesting_profile_id', active.id)
          .in('status', ['pending', 'accepted']),
      ])
      setShortlistCount(slResult.count ?? 0)
      setIntroRequestsCount(irCountResult.count ?? 0)

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePauseResume() {
    if (!profile) return
    setActionLoading(true)
    const newStatus = profile.status === 'approved' ? 'paused' : 'approved'
    const { error } = await supabase.from('zawaaj_profiles').update({ status: newStatus }).eq('id', profile.id)
    if (!error) setProfile({ ...profile, status: newStatus })
    setActionLoading(false)
  }

  function openEdit() {
    if (!profile) return
    setEditForm({
      location: profile.location ?? '',
      height: profile.height ?? '',
      languagesSpoken: profile.languages_spoken ?? [],
      livingSituation: profile.living_situation ?? '',
      openToRelocation: profile.open_to_relocation ?? '',
      openToPartnersChildren: profile.open_to_partners_children ?? '',
      polygamyOpenness: profile.polygamy_openness ?? '',
      professionDetail: profile.profession_detail ?? '',
      educationLevel: profile.education_level ?? '',
      educationDetail: profile.education_detail ?? '',
      nationality: profile.nationality ?? '',
      ethnicity: profile.ethnicity ?? '',
      schoolOfThought: profile.school_of_thought ?? '',
      religiosity: profile.religiosity ?? '',
      prayerRegularity: profile.prayer_regularity ?? '',
      wearsHijab: profile.wears_hijab === true ? 'true' : profile.wears_hijab === false ? 'false' : '',
      wearsNiqab: profile.wears_niqab ?? '',
      wearsAbaya: profile.wears_abaya ?? '',
      keepsBeard: profile.keeps_beard === true ? 'true' : profile.keeps_beard === false ? 'false' : '',
      quranEngagement: profile.quran_engagement_level ?? '',
      bio: profile.bio ?? '',
      prefAgeMin: profile.pref_age_min?.toString() ?? '',
      prefAgeMax: profile.pref_age_max?.toString() ?? '',
      prefLocation: profile.pref_location ?? '',
      prefEthnicity: profile.pref_ethnicity ?? '',
      prefSchoolOfThought: profile.pref_school_of_thought?.join(', ') ?? '',
      prefPartnerChildren: profile.pref_partner_children ?? '',
      prefRelocation: profile.pref_relocation ?? '',
      islamicBackground: profile.islamic_background ?? '',
      placeOfBirth: profile.place_of_birth ?? '',
      smoker: profile.smoker === true ? 'yes' : profile.smoker === false ? 'no' : '',
      marriageReason: profile.marriage_reason ?? '',
      openToMaritalStatus: profile.open_to_marital_status ?? '',
    })
    setEditError(null)
    setEditSection('about')
    setShowEditModal(true)
  }

  async function saveEdit() {
    if (!profile) return
    setEditLoading(true)
    setEditError(null)
    const sotPref = editForm.prefSchoolOfThought.split(',').map(s => s.trim()).filter(Boolean)
    const { error } = await supabase.from('zawaaj_profiles').update({
      location: editForm.location || null,
      height: editForm.height || null,
      languages_spoken: editForm.languagesSpoken.length > 0 ? editForm.languagesSpoken : null,
      living_situation: editForm.livingSituation || null,
      open_to_relocation: editForm.openToRelocation || null,
      open_to_partners_children: editForm.openToPartnersChildren || null,
      polygamy_openness: editForm.polygamyOpenness || null,
      profession_detail: editForm.professionDetail || null,
      education_level: editForm.educationLevel || null,
      education_detail: editForm.educationDetail || null,
      nationality: editForm.nationality || null,
      ethnicity: editForm.ethnicity || null,
      school_of_thought: editForm.schoolOfThought || null,
      religiosity: editForm.religiosity || null,
      prayer_regularity: editForm.prayerRegularity || null,
      wears_hijab: profile.gender === 'female' && editForm.wearsHijab !== '' ? editForm.wearsHijab === 'true' : null,
      wears_niqab: profile.gender === 'female' ? (editForm.wearsNiqab || null) : null,
      wears_abaya: profile.gender === 'female' ? (editForm.wearsAbaya || null) : null,
      keeps_beard: profile.gender === 'male' && editForm.keepsBeard !== '' ? editForm.keepsBeard === 'true' : null,
      quran_engagement_level: editForm.quranEngagement || null,
      bio: editForm.bio || null,
      pref_age_min: editForm.prefAgeMin ? parseInt(editForm.prefAgeMin, 10) : null,
      pref_age_max: editForm.prefAgeMax ? parseInt(editForm.prefAgeMax, 10) : null,
      pref_location: editForm.prefLocation || null,
      pref_ethnicity: editForm.prefEthnicity || null,
      pref_school_of_thought: sotPref.length > 0 ? sotPref : null,
      pref_partner_children: editForm.prefPartnerChildren || null,
      pref_relocation: editForm.prefRelocation || null,
      islamic_background: editForm.islamicBackground || null,
      smoker: editForm.smoker === 'yes' ? true : editForm.smoker === 'no' ? false : null,
      place_of_birth: editForm.placeOfBirth || null,
      marriage_reason: profile.gender === 'male' && editForm.marriageReason ? editForm.marriageReason : null,
      open_to_marital_status: profile.gender === 'female' ? (editForm.openToMaritalStatus || null) : null,
    }).eq('id', profile.id)
    if (error) { setEditError(error.message); setEditLoading(false); return }
    setProfile({
      ...profile,
      location: editForm.location || null,
      height: editForm.height || null,
      languages_spoken: editForm.languagesSpoken.length > 0 ? editForm.languagesSpoken : null,
      living_situation: editForm.livingSituation || null,
      open_to_relocation: editForm.openToRelocation || null,
      open_to_partners_children: editForm.openToPartnersChildren || null,
      polygamy_openness: editForm.polygamyOpenness || null,
      profession_detail: editForm.professionDetail || null,
      education_level: editForm.educationLevel || null,
      education_detail: editForm.educationDetail || null,
      nationality: editForm.nationality || null,
      ethnicity: editForm.ethnicity || null,
      school_of_thought: editForm.schoolOfThought || null,
      religiosity: editForm.religiosity || null,
      prayer_regularity: editForm.prayerRegularity || null,
      wears_hijab: profile.gender === 'female' && editForm.wearsHijab !== '' ? editForm.wearsHijab === 'true' : null,
      wears_niqab: profile.gender === 'female' ? (editForm.wearsNiqab || null) : null,
      wears_abaya: profile.gender === 'female' ? (editForm.wearsAbaya || null) : null,
      keeps_beard: profile.gender === 'male' && editForm.keepsBeard !== '' ? editForm.keepsBeard === 'true' : null,
      quran_engagement_level: editForm.quranEngagement || null,
      bio: editForm.bio || null,
      pref_age_min: editForm.prefAgeMin ? parseInt(editForm.prefAgeMin, 10) : null,
      pref_age_max: editForm.prefAgeMax ? parseInt(editForm.prefAgeMax, 10) : null,
      pref_location: editForm.prefLocation || null,
      pref_ethnicity: editForm.prefEthnicity || null,
      pref_school_of_thought: sotPref.length > 0 ? sotPref : null,
      pref_partner_children: editForm.prefPartnerChildren || null,
      pref_relocation: editForm.prefRelocation || null,
      islamic_background: editForm.islamicBackground || null,
      smoker: editForm.smoker === 'yes' ? true : editForm.smoker === 'no' ? false : null,
      place_of_birth: editForm.placeOfBirth || null,
      marriage_reason: profile.gender === 'male' && editForm.marriageReason ? editForm.marriageReason : null,
      open_to_marital_status: profile.gender === 'female' ? (editForm.openToMaritalStatus || null) : null,
    })
    setEditLoading(false)
    setShowEditModal(false)
  }

  async function savePassword() {
    if (!pwForm.newPassword || pwForm.newPassword !== pwForm.confirm) {
      setPwError(pwForm.newPassword !== pwForm.confirm ? 'Passwords do not match.' : 'Please enter a new password.')
      return
    }
    if (pwForm.newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    setPwLoading(true)
    setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword })
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwSuccess(true)
    setPwForm({ newPassword: '', confirm: '' })
    setTimeout(() => { setPwSuccess(false); setShowPasswordModal(false) }, 2000)
  }

  async function handleWithdraw() {
    if (!profile) return
    setActionLoading(true)
    const { error } = await supabase.from('zawaaj_profiles').update({ status: 'withdrawn', withdrawal_reason: withdrawReason }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, status: 'withdrawn' })
      setWithdrawn(true)
      setShowWithdrawModal(false)
    }
    setActionLoading(false)
  }

  const sidebarProfile = profile
    ? { display_initials: profile.display_initials, gender: profile.gender, first_name: profile.first_name }
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

  if (!profile) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute={pathname ?? ''} shortlistCount={0} introRequestsCount={0} profile={null} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No profile found</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Please contact the admin team.</p>
          </div>
        </main>
      </div>
    )
  }

  const age = calcAge(profile.date_of_birth)
  const { bg: statusBg, text: statusText } = statusColour(profile.status)
  const monthlyUsed = introRequests.filter(r => {
    const d = new Date(r.created_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)', color: 'var(--text-primary)' }}>
      <Sidebar
        activeRoute={pathname ?? ''}
        shortlistCount={shortlistCount}
        introRequestsCount={introRequestsCount}
        profile={sidebarProfile}
        managedProfiles={managedProfiles}
        activeProfileId={activeProfileId}
      />
      <main style={{ marginLeft: 200, flex: 1 }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>My profile</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {profile.status === 'pending' ? 'Under review — not yet visible to other members.' : profile.status === 'approved' ? 'Your profile is live and visible to approved members.' : ''}
          </div>
        </div>

        {/* Profile card */}
        <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24, marginBottom: 16 }}>
          {/* Avatar + name + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <AvatarInitials initials={profile.display_initials} gender={profile.gender} size="xl" goldBorder />
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                {profile.first_name ? `${profile.first_name} ${profile.last_name?.[0] ?? ''}.` : profile.display_initials}
              </div>
              <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999, background: statusBg, color: statusText }}>
                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
              </span>
            </div>
          </div>

          {/* About */}
          <SectionLabel>About</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <FieldRow label="Age" value={age ? `${age} years old` : profile.age_display} />
            <FieldRow label="Location" value={profile.location} />
            <FieldRow label="Nationality" value={profile.nationality} />
            <FieldRow label="Place of birth" value={profile.place_of_birth} />
            <FieldRow label="Ethnicity" value={profile.ethnicity} />
            <FieldRow label="Marital status" value={displayValue({ never_married: 'Never married', divorced: 'Divorced', widowed: 'Widowed', married: 'Married' }, profile.marital_status)} />
            {profile.gender === 'male' && profile.marriage_reason && (
              <FieldRow label="Reason for seeking marriage" value={profile.marriage_reason} />
            )}
            {profile.gender === 'female' && profile.open_to_marital_status && (
              <FieldRow label="Open to proposals from" value={displayValue({ never_married_only: 'Never married only', divorced_widowed_only: 'Divorced / widowed only', married_men_considered: 'Married men considered', case_by_case: 'Case by case' }, profile.open_to_marital_status)} />
            )}
            <FieldRow label="Has children" value={profile.has_children === true ? 'Yes' : profile.has_children === false ? 'No' : null} />
            <FieldRow label="Height" value={profile.height} />
            <FieldRow label="Living situation" value={displayValue({ independent: 'Independent', with_family: 'With family', shared: 'Shared accommodation' }, profile.living_situation)} />
            <FieldRow label="Languages" value={profile.languages_spoken?.join(', ') ?? null} />
            <FieldRow label="Open to relocation" value={profile.open_to_relocation} />
            <FieldRow label="Open to partner's children" value={profile.open_to_partners_children} />
            <FieldRow label="Polygamy openness" value={profile.polygamy_openness} />
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
            <FieldRow label="Islamic background" value={
              profile.islamic_background === 'born_muslim' ? 'Born Muslim'
              : profile.islamic_background === 'reverted' ? 'Reverted to Islam'
              : null
            } />
            <FieldRow label="Religiosity" value={profile.religiosity} />
            <FieldRow label="Prayer regularity" value={displayValue({ yes_regularly: 'Yes, regularly', most_of_time: 'Most of the time', working_on_it: 'Working on it', not_currently: 'Not currently' }, profile.prayer_regularity)} />
            {profile.gender === 'female' && <FieldRow label="Wears hijab" value={profile.wears_hijab === true ? 'Yes' : profile.wears_hijab === false ? 'No' : null} />}
            {profile.gender === 'female' && profile.wears_niqab && <FieldRow label="Wears niqab" value={displayValue({ yes: 'Yes', no: 'No', sometimes: 'Sometimes' }, profile.wears_niqab)} />}
            {profile.gender === 'female' && profile.wears_abaya && <FieldRow label="Wears abaya" value={displayValue({ yes: 'Yes', no: 'No', sometimes: 'Sometimes' }, profile.wears_abaya)} />}
            {profile.gender === 'male' && <FieldRow label="Keeps beard" value={profile.keeps_beard === true ? 'Yes' : profile.keeps_beard === false ? 'No' : null} />}
            <FieldRow label="Smoker" value={profile.smoker === true ? 'Yes' : profile.smoker === false ? 'No' : null} />
            {profile.quran_engagement_level && <FieldRow label="Quran engagement" value={displayValue({ memorised: 'Hafiz/Hafiza', regularly: 'Read regularly', occasionally: 'Occasionally', learning: 'Currently learning', not_currently: 'Not currently' }, profile.quran_engagement_level)} />}
          </div>

          {/* Bio */}
          {profile.bio && (
            <>
              <SectionLabel>About me</SectionLabel>
              {bioExpanded ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{profile.bio}</p>
                  <button onClick={() => setBioExpanded(false)} style={{ fontSize: 12, color: 'var(--gold-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Read less</button>
                </>
              ) : (
                <button onClick={() => setBioExpanded(true)} style={{ fontSize: 12, color: 'var(--gold-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Read more</button>
              )}
            </>
          )}

          {/* Preferences */}
          <SectionLabel>Looking for</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <FieldRow label="Preferred age" value={(profile.pref_age_min || profile.pref_age_max) ? `${profile.pref_age_min ?? '?'} – ${profile.pref_age_max ?? '?'}` : null} />
            <FieldRow label="Preferred location" value={profile.pref_location} />
            <FieldRow label="Ethnicity preference" value={profile.pref_ethnicity} />
            <FieldRow label="School of thought pref" value={profile.pref_school_of_thought?.join(', ') ?? null} />
            <FieldRow label="Partner's children" value={profile.pref_partner_children} />
          </div>

          {/* Actions */}
          {!withdrawn && (
            <div style={{ display: 'flex', gap: 10, paddingTop: 20, marginTop: 20, borderTop: '0.5px solid var(--border-default)', flexWrap: 'wrap' }}>
              <button
                onClick={openEdit}
                style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                ✏️ Edit profile
              </button>
              <button
                onClick={() => { setPwError(null); setPwSuccess(false); setPwForm({ newPassword: '', confirm: '' }); setShowPasswordModal(true) }}
                style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                🔑 Change password
              </button>
              {(profile.status === 'approved' || profile.status === 'paused') && (
                <button
                  onClick={handlePauseResume}
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--gold)', color: 'var(--surface)', border: 'none', opacity: actionLoading ? 0.5 : 1 }}
                >
                  {profile.status === 'approved' ? 'Pause profile' : 'Resume profile'}
                </button>
              )}
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={actionLoading}
                style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'none', border: '0.5px solid var(--status-error-br)', color: 'var(--status-error)', opacity: actionLoading ? 0.5 : 1 }}
              >
                Withdraw profile
              </button>
            </div>
          )}
        </div>

        {/* Monthly introduction allowance */}
        {(() => {
          const cfg = getPlanConfig(plan as Plan)
          const limit = cfg.monthlyLimit === Infinity ? null : cfg.monthlyLimit
          const pct = limit ? Math.min((monthlyUsed / limit) * 100, 100) : 0
          const atLimit = limit !== null && monthlyUsed >= limit
          return (
            <div style={{ background: 'var(--surface-2)', border: `0.5px solid ${atLimit ? 'var(--status-error)' : 'var(--border-default)'}`, borderRadius: 13, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Introduction requests this month</div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: atLimit ? 'var(--status-error)' : 'var(--text-primary)' }}>
                  {limit !== null ? `${monthlyUsed} of ${limit} used` : `${monthlyUsed} sent`}
                </span>
              </div>
              {limit !== null && (
                <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-4)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: atLimit ? 'var(--status-error)' : 'var(--gold)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
              )}
              <div style={{ fontSize: 11, color: atLimit ? 'var(--status-error)' : 'var(--text-muted)' }}>
                {atLimit ? 'Limit reached — resets on the 1st of next month' : 'Resets on the 1st of each month'}
              </div>
            </div>
          )
        })()}

        {/* Who viewed your profile — teaser for voluntary/plus, data for premium */}
        <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Who viewed your profile</div>
            {getPlanConfig(plan as Plan).viewTracking && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 30 days</span>
            )}
          </div>

          {!getPlanConfig(plan as Plan).viewTracking ? (
            /* Locked teaser */
            <div>
              {/* Blurred ghost rows */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0',
                      borderBottom: i < 2 ? '0.5px solid var(--border-default)' : undefined,
                      filter: 'blur(5px)',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: i % 2 === 0 ? 'var(--avatar-female-bg)' : 'var(--avatar-male-bg)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: 80 + i * 20, height: 11, borderRadius: 4, background: 'var(--surface-3)', marginBottom: 5 }} />
                      <div style={{ width: 50 + i * 10, height: 9, borderRadius: 4, background: 'var(--surface-3)' }} />
                    </div>
                    <div style={{ width: 48, height: 9, borderRadius: 4, background: 'var(--surface-3)' }} />
                  </div>
                ))}
              </div>
              {/* Upgrade CTA */}
              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Upgrade to Premium to see who viewed your profile — with timestamps.
                </p>
                <button
                  onClick={() => setShowViewsUpgrade(true)}
                  style={{
                    padding: '8px 20px', borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                    background: 'var(--gold)', color: 'var(--surface)', border: 'none', cursor: 'pointer',
                  }}
                >
                  👁 See who viewed you →
                </button>
              </div>
            </div>
          ) : (
            /* Premium — actual view data placeholder */
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              View tracking active. Data will appear as members visit your profile.
            </p>
          )}
        </div>

        {/* Sent interests */}
        <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Interests sent</div>
          {introRequests.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No interests sent yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {introRequests.map(r => {
                const days = daysUntil(r.expires_at)
                const badge = r.status === 'accepted'
                  ? { bg: 'var(--gold-muted)', text: 'var(--gold-light)', label: 'Accepted — team notified' }
                  : r.status === 'declined'
                  ? { bg: 'var(--surface-3)', text: 'var(--text-muted)', label: 'Not progressed' }
                  : r.status === 'expired'
                  ? { bg: 'var(--surface-3)', text: 'var(--text-muted)', label: 'Expired' }
                  : r.status === 'withdrawn'
                  ? { bg: 'var(--surface-3)', text: 'var(--text-muted)', label: 'Withdrawn' }
                  : { bg: 'var(--surface-3)', text: 'var(--text-secondary)', label: "Awaiting family's response" }
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 9, border: '0.5px solid var(--border-default)' }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginBottom: 2 }}>Sent {formatDate(r.created_at)}</div>
                      {r.status === 'pending' && days > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Response expected within {days} day{days !== 1 ? 's' : ''}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999, background: badge.bg, color: badge.text }}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </main>

      {/* Edit modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}>

            {/* Modal header */}
            <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Edit profile</div>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>✕</button>
              </div>
              {/* Section tabs */}
              <div style={{ display: 'flex', gap: 2, borderBottom: '0.5px solid var(--border-default)', marginBottom: 0 }}>
                {(['about', 'background', 'faith', 'bio', 'preferences'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setEditSection(s)}
                    style={{ padding: '7px 12px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', borderBottom: `2px solid ${editSection === s ? 'var(--gold)' : 'transparent'}`, color: editSection === s ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', textTransform: 'capitalize', transition: 'color 0.15s' }}
                  >
                    {s === 'background' ? 'Background' : s === 'preferences' ? 'Looking for' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

              {/* ABOUT */}
              {editSection === 'about' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <EditField label="Location" placeholder="e.g. London, UK" value={editForm.location} onChange={v => setEditForm(f => ({ ...f, location: v }))} />
                  <EditField label="Place of birth" placeholder="e.g. Lahore, Pakistan" value={editForm.placeOfBirth} onChange={v => setEditForm(f => ({ ...f, placeOfBirth: v }))} />
                  <EditField label="Height" placeholder="e.g. 5'8&quot;" value={editForm.height} onChange={v => setEditForm(f => ({ ...f, height: v }))} />
                  <EditChips label="Languages spoken" selected={editForm.languagesSpoken} onChange={v => setEditForm(f => ({ ...f, languagesSpoken: v }))} />
                  <EditSelect label="Living situation" value={editForm.livingSituation} onChange={v => setEditForm(f => ({ ...f, livingSituation: v }))} options={[
                    { value: '', label: 'Not specified' },
                    { value: 'independent', label: 'Living independently' },
                    { value: 'with_family', label: 'With family' },
                    { value: 'shared', label: 'Shared accommodation' },
                  ]} />
                  <EditField label="Open to relocation?" placeholder="e.g. Yes, No, Maybe" value={editForm.openToRelocation} onChange={v => setEditForm(f => ({ ...f, openToRelocation: v }))} />
                  <EditField label="Open to partner&apos;s children?" placeholder="e.g. Yes, Open to discuss" value={editForm.openToPartnersChildren} onChange={v => setEditForm(f => ({ ...f, openToPartnersChildren: v }))} />
                  <EditField label="Polygamy openness" placeholder="e.g. Not open, Open to discuss" value={editForm.polygamyOpenness} onChange={v => setEditForm(f => ({ ...f, polygamyOpenness: v }))} />
                  <EditSelect label="Smoker" value={editForm.smoker} onChange={v => setEditForm(f => ({ ...f, smoker: v }))} options={[
                    { value: '', label: 'Select…' },
                    { value: 'no', label: 'No' },
                    { value: 'yes', label: 'Yes' },
                  ]} />
                </div>
              )}

              {/* BACKGROUND */}
              {editSection === 'background' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <EditField label="Profession" placeholder="e.g. Software Engineer" value={editForm.professionDetail} onChange={v => setEditForm(f => ({ ...f, professionDetail: v }))} />
                  <EditField label="Education level" placeholder="e.g. Bachelor's degree, Master's degree" value={editForm.educationLevel} onChange={v => setEditForm(f => ({ ...f, educationLevel: v }))} />
                  <EditField label="Institution" placeholder="e.g. University of Manchester" value={editForm.educationDetail} onChange={v => setEditForm(f => ({ ...f, educationDetail: v }))} />
                  <EditField label="Nationality" placeholder="e.g. British, Pakistani" value={editForm.nationality} onChange={v => setEditForm(f => ({ ...f, nationality: v }))} />
                  <EditField label="Ethnicity" placeholder="e.g. South Asian, Arab, Mixed" value={editForm.ethnicity} onChange={v => setEditForm(f => ({ ...f, ethnicity: v }))} />
                </div>
              )}

              {/* FAITH */}
              {editSection === 'faith' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <EditSelect label="Islamic background" value={editForm.islamicBackground} onChange={v => setEditForm(f => ({ ...f, islamicBackground: v }))} options={[
                    { value: '', label: 'Not specified' },
                    { value: 'born_muslim', label: 'Born Muslim' },
                    { value: 'reverted', label: 'Reverted to Islam' },
                  ]} />
                  <EditField label="School of thought" placeholder="e.g. Sunni, Deobandi, Barelwi" value={editForm.schoolOfThought} onChange={v => setEditForm(f => ({ ...f, schoolOfThought: v }))} />
                  <EditField label="Religiosity" placeholder="e.g. Practising, Moderately practising" value={editForm.religiosity} onChange={v => setEditForm(f => ({ ...f, religiosity: v }))} />
                  <EditSelect label="Prayer regularity" value={editForm.prayerRegularity} onChange={v => setEditForm(f => ({ ...f, prayerRegularity: v }))} options={[
                    { value: '', label: 'Not specified' },
                    { value: 'yes_regularly', label: 'Yes, regularly' },
                    { value: 'most_of_time', label: 'Most of the time' },
                    { value: 'working_on_it', label: 'Working on it' },
                    { value: 'not_currently', label: 'Not currently' },
                  ]} />
                  {profile?.gender === 'female' && (
                    <EditSelect label="Wears hijab" value={editForm.wearsHijab} onChange={v => setEditForm(f => ({ ...f, wearsHijab: v }))} options={[
                      { value: '', label: 'Not specified' },
                      { value: 'true', label: 'Yes' },
                      { value: 'false', label: 'No' },
                    ]} />
                  )}
                  {profile?.gender === 'female' && (
                    <EditSelect label="Wears niqab" value={editForm.wearsNiqab} onChange={v => setEditForm(f => ({ ...f, wearsNiqab: v }))} options={[
                      { value: '', label: 'Not specified' },
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                      { value: 'sometimes', label: 'Sometimes' },
                    ]} />
                  )}
                  {profile?.gender === 'female' && (
                    <EditSelect label="Wears abaya" value={editForm.wearsAbaya} onChange={v => setEditForm(f => ({ ...f, wearsAbaya: v }))} options={[
                      { value: '', label: 'Not specified' },
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                      { value: 'sometimes', label: 'Sometimes' },
                    ]} />
                  )}
                  {profile?.gender === 'male' && (
                    <EditSelect label="Keeps beard" value={editForm.keepsBeard} onChange={v => setEditForm(f => ({ ...f, keepsBeard: v }))} options={[
                      { value: '', label: 'Not specified' },
                      { value: 'true', label: 'Yes' },
                      { value: 'false', label: 'No' },
                    ]} />
                  )}
                  <EditSelect label="Quran engagement" value={editForm.quranEngagement} onChange={v => setEditForm(f => ({ ...f, quranEngagement: v }))} options={[
                    { value: '', label: 'Not specified' },
                    { value: 'memorised', label: 'Memorised (Hafiz/Hafiza)' },
                    { value: 'regularly', label: 'Read regularly' },
                    { value: 'occasionally', label: 'Read occasionally' },
                    { value: 'learning', label: 'Currently learning' },
                    { value: 'not_currently', label: 'Not currently' },
                  ]} />
                </div>
              )}

              {/* BIO */}
              {editSection === 'bio' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>About me</div>
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    rows={8}
                    placeholder="Write a few sentences about yourself — your personality, what you're looking for, and what makes you who you are."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{editForm.bio.length} characters</div>
                </div>
              )}

              {/* PREFERENCES */}
              {editSection === 'preferences' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Preferred age range</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" value={editForm.prefAgeMin} onChange={e => setEditForm(f => ({ ...f, prefAgeMin: e.target.value }))} placeholder="Min" min={18} max={99} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>–</span>
                      <input type="number" value={editForm.prefAgeMax} onChange={e => setEditForm(f => ({ ...f, prefAgeMax: e.target.value }))} placeholder="Max" min={18} max={99} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                    </div>
                  </div>
                  <EditField label="Preferred location" placeholder="e.g. UK, London" value={editForm.prefLocation} onChange={v => setEditForm(f => ({ ...f, prefLocation: v }))} />
                  <EditField label="Ethnicity preference" placeholder="e.g. Any, South Asian, Arab" value={editForm.prefEthnicity} onChange={v => setEditForm(f => ({ ...f, prefEthnicity: v }))} />
                  <div>
                    <EditField label="School of thought preference" placeholder="e.g. Sunni, Deobandi (comma-separated)" value={editForm.prefSchoolOfThought} onChange={v => setEditForm(f => ({ ...f, prefSchoolOfThought: v }))} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Separate multiple with commas</div>
                  </div>
                  <EditField label="Open to partner relocating?" placeholder="e.g. Yes, Flexible" value={editForm.prefRelocation} onChange={v => setEditForm(f => ({ ...f, prefRelocation: v }))} />
                  <EditField label="Partner&apos;s existing children" placeholder="e.g. Open to it, Prefer not" value={editForm.prefPartnerChildren} onChange={v => setEditForm(f => ({ ...f, prefPartnerChildren: v }))} />
                  {profile?.gender === 'female' && (
                    <EditSelect label="Open to proposals from" value={editForm.openToMaritalStatus} onChange={v => setEditForm(f => ({ ...f, openToMaritalStatus: v }))} options={[
                      { value: '', label: 'Not specified' },
                      { value: 'never_married_only',     label: 'Never married only' },
                      { value: 'divorced_widowed_only',  label: 'Divorced / widowed only' },
                      { value: 'married_men_considered', label: 'Married men considered' },
                      { value: 'case_by_case',           label: 'Case by case' },
                    ]} />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px 20px', borderTop: '0.5px solid var(--border-default)', flexShrink: 0 }}>
              {editError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--status-error-bg)', border: '0.5px solid var(--status-error-br)', fontSize: 12.5, color: 'var(--status-error)', marginBottom: 10 }}>
                  {editError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowEditModal(false)} disabled={editLoading} style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={editLoading} style={{ flex: 2, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: 'var(--surface)', cursor: editLoading ? 'not-allowed' : 'pointer', opacity: editLoading ? 0.6 : 1 }}>
                  {editLoading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Change password</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>New password</div>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Minimum 8 characters" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Confirm password</div>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {pwError && <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--status-error-bg)', border: '0.5px solid var(--status-error-br)', fontSize: 12.5, color: 'var(--status-error)', marginBottom: 12 }}>{pwError}</div>}
            {pwSuccess && <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--status-success-bg)', border: '0.5px solid var(--status-success-br)', fontSize: 12.5, color: 'var(--status-success)', marginBottom: 12 }}>Password updated ✓</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={savePassword} disabled={pwLoading} style={{ flex: 2, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: 'var(--surface)', cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.6 : 1 }}>
                {pwLoading ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal modal */}
      {showWithdrawModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Withdraw your profile</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Your profile will no longer be visible. Please let us know why.
            </p>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Reason</div>
            <select
              value={withdrawReason}
              onChange={e => setWithdrawReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 20, outline: 'none' }}
            >
              {WITHDRAWAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleWithdraw} disabled={actionLoading} style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--status-error-bg)', border: '0.5px solid var(--status-error-br)', color: 'var(--status-error)', cursor: 'pointer', opacity: actionLoading ? 0.5 : 1 }}>
                {actionLoading ? 'Withdrawing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade modal — "who viewed you" surface */}
      {showViewsUpgrade && (
        <UpgradeModal trigger="who_viewed" onClose={() => setShowViewsUpgrade(false)} />
      )}
    </div>
  )
}
