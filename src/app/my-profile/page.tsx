'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import AvatarInitials from '@/components/AvatarInitials'

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
  is_admin: boolean
  interests_this_month: number
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
    approved:  { bg: 'rgba(74,222,128,0.12)', text: '#4ADE80' },
    pending:   { bg: 'rgba(251,191,36,0.12)', text: '#FBBF24' },
    paused:    { bg: 'rgba(96,165,250,0.12)', text: '#60A5FA' },
    rejected:  { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
    withdrawn: { bg: 'var(--surface-3)', text: 'var(--text-muted)' },
    suspended: { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    bio: '',
    prefAgeMin: '',
    prefAgeMax: '',
    prefLocation: '',
    prefEthnicity: '',
    prefSchoolOfThought: '',
    prefPartnerChildren: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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
        .select('id, display_initials, first_name, last_name, gender, date_of_birth, age_display, height, ethnicity, nationality, school_of_thought, education_level, education_detail, profession_detail, location, bio, religiosity, prayer_regularity, wears_hijab, keeps_beard, marital_status, has_children, languages_spoken, living_situation, open_to_relocation, pref_age_min, pref_age_max, pref_location, pref_ethnicity, pref_school_of_thought, pref_partner_children, status, is_admin, interests_this_month')
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
          .in('status', ['pending', 'mutual']),
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
      bio: profile.bio ?? '',
      prefAgeMin: profile.pref_age_min?.toString() ?? '',
      prefAgeMax: profile.pref_age_max?.toString() ?? '',
      prefLocation: profile.pref_location ?? '',
      prefEthnicity: profile.pref_ethnicity ?? '',
      prefSchoolOfThought: profile.pref_school_of_thought?.join(', ') ?? '',
      prefPartnerChildren: profile.pref_partner_children ?? '',
    })
    setEditError(null)
    setShowEditModal(true)
  }

  async function saveEdit() {
    if (!profile) return
    setEditLoading(true)
    setEditError(null)
    const sot = editForm.prefSchoolOfThought.split(',').map(s => s.trim()).filter(Boolean)
    const { error } = await supabase.from('zawaaj_profiles').update({
      bio: editForm.bio || null,
      pref_age_min: editForm.prefAgeMin ? parseInt(editForm.prefAgeMin, 10) : null,
      pref_age_max: editForm.prefAgeMax ? parseInt(editForm.prefAgeMax, 10) : null,
      pref_location: editForm.prefLocation || null,
      pref_ethnicity: editForm.prefEthnicity || null,
      pref_school_of_thought: sot.length > 0 ? sot : null,
      pref_partner_children: editForm.prefPartnerChildren || null,
    }).eq('id', profile.id)
    if (error) { setEditError(error.message); setEditLoading(false); return }
    setProfile({
      ...profile,
      bio: editForm.bio || null,
      pref_age_min: editForm.prefAgeMin ? parseInt(editForm.prefAgeMin, 10) : null,
      pref_age_max: editForm.prefAgeMax ? parseInt(editForm.prefAgeMax, 10) : null,
      pref_location: editForm.prefLocation || null,
      pref_ethnicity: editForm.prefEthnicity || null,
      pref_school_of_thought: sot.length > 0 ? sot : null,
      pref_partner_children: editForm.prefPartnerChildren || null,
    })
    setEditLoading(false)
    setShowEditModal(false)
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
            <FieldRow label="Ethnicity" value={profile.ethnicity} />
            <FieldRow label="Marital status" value={displayValue({ never_married: 'Never married', divorced: 'Divorced', widowed: 'Widowed' }, profile.marital_status)} />
            <FieldRow label="Has children" value={profile.has_children === true ? 'Yes' : profile.has_children === false ? 'No' : null} />
            <FieldRow label="Height" value={profile.height} />
            <FieldRow label="Living situation" value={displayValue({ independent: 'Independent', with_family: 'With family', shared: 'Shared accommodation' }, profile.living_situation)} />
            <FieldRow label="Languages" value={profile.languages_spoken} />
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
            <FieldRow label="Prayer regularity" value={displayValue({ yes_regularly: 'Yes, regularly', most_of_time: 'Most of the time', working_on_it: 'Working on it', not_currently: 'Not currently' }, profile.prayer_regularity)} />
            {profile.gender === 'female' && <FieldRow label="Wears hijab" value={profile.wears_hijab === true ? 'Yes' : profile.wears_hijab === false ? 'No' : null} />}
            {profile.gender === 'male' && <FieldRow label="Keeps beard" value={profile.keeps_beard === true ? 'Yes' : profile.keeps_beard === false ? 'No' : null} />}
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
                ✏️ Edit bio & preferences
              </button>
              {(profile.status === 'approved' || profile.status === 'paused') && (
                <button
                  onClick={handlePauseResume}
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--gold)', color: '#111', border: 'none', opacity: actionLoading ? 0.5 : 1 }}
                >
                  {profile.status === 'approved' ? 'Pause profile' : 'Resume profile'}
                </button>
              )}
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={actionLoading}
                style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'none', border: '0.5px solid rgba(248,113,113,0.4)', color: '#F87171', opacity: actionLoading ? 0.5 : 1 }}
              >
                Withdraw profile
              </button>
            </div>
          )}
        </div>

        {/* Monthly introduction allowance */}
        <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>Introduction requests this month</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--surface-4)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((monthlyUsed / 5) * 100, 100)}%`, background: 'var(--gold)', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{monthlyUsed} / 5</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resets on the 1st of each month</div>
        </div>

        {/* Sent introduction requests */}
        <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Introduction requests sent</div>
          {introRequests.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No introduction requests sent yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {introRequests.map(r => {
                const days = daysUntil(r.expires_at)
                const badge = r.status === 'mutual'
                  ? { bg: 'var(--gold-muted)', text: 'var(--gold-light)', label: 'Mutual' }
                  : r.status === 'facilitated'
                  ? { bg: 'rgba(74,222,128,0.12)', text: '#4ADE80', label: 'Facilitated' }
                  : r.status === 'expired'
                  ? { bg: 'var(--surface-3)', text: 'var(--text-muted)', label: 'Expired' }
                  : { bg: 'var(--surface-3)', text: 'var(--text-secondary)', label: 'Pending' }
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 9, border: '0.5px solid var(--border-default)' }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginBottom: 2 }}>Sent {formatDate(r.created_at)}</div>
                      {r.status === 'pending' && days > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires in {days} day{days !== 1 ? 's' : ''}</div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Edit profile</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>Update your bio and partner preferences.</p>

            {/* Bio */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>About me (bio)</div>
              <textarea
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                rows={4}
                placeholder="Tell potential matches a bit about yourself..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Pref age */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Preferred age range</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  value={editForm.prefAgeMin}
                  onChange={e => setEditForm(f => ({ ...f, prefAgeMin: e.target.value }))}
                  placeholder="Min"
                  min={18}
                  max={99}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                <input
                  type="number"
                  value={editForm.prefAgeMax}
                  onChange={e => setEditForm(f => ({ ...f, prefAgeMax: e.target.value }))}
                  placeholder="Max"
                  min={18}
                  max={99}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
              </div>
            </div>

            {/* Pref location */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Preferred location</div>
              <input
                value={editForm.prefLocation}
                onChange={e => setEditForm(f => ({ ...f, prefLocation: e.target.value }))}
                placeholder="e.g. UK, London"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Pref ethnicity */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Ethnicity preference</div>
              <input
                value={editForm.prefEthnicity}
                onChange={e => setEditForm(f => ({ ...f, prefEthnicity: e.target.value }))}
                placeholder="e.g. Any, South Asian, Arab"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Pref school of thought */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>School of thought preference</div>
              <input
                value={editForm.prefSchoolOfThought}
                onChange={e => setEditForm(f => ({ ...f, prefSchoolOfThought: e.target.value }))}
                placeholder="e.g. Sunni, Deobandi (comma-separated)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Separate multiple values with commas</div>
            </div>

            {/* Pref partner children */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Partner&apos;s existing children</div>
              <input
                value={editForm.prefPartnerChildren}
                onChange={e => setEditForm(f => ({ ...f, prefPartnerChildren: e.target.value }))}
                placeholder="e.g. Open to it, Prefer not"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {editError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', fontSize: 12.5, color: '#F87171', marginBottom: 12 }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--gold)', border: 'none', color: '#111', cursor: editLoading ? 'not-allowed' : 'pointer', opacity: editLoading ? 0.6 : 1 }}
              >
                {editLoading ? 'Saving…' : 'Save changes'}
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
              <button onClick={handleWithdraw} disabled={actionLoading} style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(248,113,113,0.15)', border: '0.5px solid rgba(248,113,113,0.4)', color: '#F87171', cursor: 'pointer', opacity: actionLoading ? 0.5 : 1 }}>
                {actionLoading ? 'Withdrawing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
