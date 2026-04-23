'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FamilyAccount {
  id: string
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  female_contact_name: string | null
  female_contact_number: string | null
  female_contact_relationship: string | null
  father_explanation: string
  no_female_contact_flag: boolean
  status: string
  readiness_state: string
}

interface CandidateProfile {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  status: string
}

interface SidebarProfile {
  display_initials: string
  gender: string | null
  first_name: string | null
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  { value: 'mother',           label: 'Mother' },
  { value: 'grandmother',      label: 'Grandmother' },
  { value: 'aunt',             label: 'Aunt' },
  { value: 'female_guardian',  label: 'Female guardian' },
  { value: 'father',           label: 'Father' },
  { value: 'male_guardian',    label: 'Male guardian' },
]

const FEMALE_REL_OPTIONS = [
  { value: '',                        label: 'Not specified' },
  { value: 'grandmother',             label: 'Grandmother' },
  { value: 'aunt',                    label: 'Aunt' },
  { value: 'female_guardian',         label: 'Female guardian' },
  { value: 'sister',                  label: 'Sister' },
  { value: 'other_female_relative',   label: 'Other female relative' },
]

const READINESS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  candidate_only:         { label: 'Awaiting representative',   color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)' },
  representative_invited: { label: 'Invite sent',               color: 'var(--status-info)',     bg: 'var(--status-info-bg)' },
  representative_linked:  { label: 'Representative linked',     color: 'var(--gold)',             bg: 'var(--gold-muted)' },
  intro_ready:            { label: 'Ready to express interest', color: 'var(--status-success)',  bg: 'var(--status-success-bg)' },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  approved:   { label: 'Approved',  color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  pending:    { label: 'Pending',   color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
  paused:     { label: 'Paused',    color: 'var(--status-info)',    bg: 'var(--status-info-bg)' },
  rejected:   { label: 'Rejected',  color: 'var(--status-error)',   bg: 'var(--status-error-bg)' },
  withdrawn:  { label: 'Withdrawn', color: 'var(--text-muted)',     bg: 'var(--surface-3)' },
  suspended:  { label: 'Suspended', color: 'var(--status-error)',   bg: 'var(--status-error-bg)' },
  introduced: { label: 'Introduced', color: 'var(--gold)',           bg: 'var(--gold-muted)' },
}

const MALE_RELATIONSHIPS = new Set(['father', 'male_guardian'])

// ─── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

function EditInput({
  value, onChange, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 9,
        border: '0.5px solid var(--border-default)',
        background: disabled ? 'var(--surface-4, var(--surface-3))' : 'var(--surface-3)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: 13, outline: 'none', boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

function EditSelect({
  value, onChange, options, disabled,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 9,
        border: '0.5px solid var(--border-default)',
        background: disabled ? 'var(--surface-4, var(--surface-3))' : 'var(--surface-3)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: 13, outline: 'none', boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FamilyAccountPage() {
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()

  // Data
  const [familyAccount, setFamilyAccount] = useState<FamilyAccount | null>(null)
  const [candidates, setCandidates] = useState<CandidateProfile[]>([])
  const [planLabel, setPlanLabel] = useState<string>('Free')
  const [sidebarProfile, setSidebarProfile] = useState<SidebarProfile | null>(null)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introRequestsCount, setIntroRequestsCount] = useState(0)
  const [managedProfiles, setManagedProfiles] = useState<CandidateProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined)

  // Edit form
  const [form, setForm] = useState({
    contactFullName: '',
    contactRelationship: '',
    contactNumber: '',
    femaleContactName: '',
    femaleContactNumber: '',
    femaleContactRelationship: '',
    fatherExplanation: '',
    noFemaleContactFlag: false,
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const activeId = settings?.active_profile_id ?? undefined
      setActiveProfileId(activeId)

      // Fetch family account where this user is the primary_user_id
      const { data: fa } = await supabase
        .from('zawaaj_family_accounts')
        .select('id, contact_full_name, contact_relationship, contact_number, contact_email, female_contact_name, female_contact_number, female_contact_relationship, father_explanation, no_female_contact_flag, status, readiness_state')
        .eq('primary_user_id', user.id)
        .maybeSingle()

      if (!fa) {
        // Not a representative — redirect to my-profile
        setAccessDenied(true)
        setLoading(false)
        return
      }

      setFamilyAccount(fa)
      setForm({
        contactFullName: fa.contact_full_name,
        contactRelationship: fa.contact_relationship,
        contactNumber: fa.contact_number,
        femaleContactName: fa.female_contact_name ?? '',
        femaleContactNumber: fa.female_contact_number ?? '',
        femaleContactRelationship: fa.female_contact_relationship ?? '',
        fatherExplanation: fa.father_explanation ?? '',
        noFemaleContactFlag: fa.no_female_contact_flag,
      })

      // Fetch candidate profiles linked to this family account
      const { data: profileRows } = await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, last_name, gender, status')
        .eq('family_account_id', fa.id)
        .order('created_at', { ascending: false })

      const profiles = profileRows ?? []
      setCandidates(profiles)
      setManagedProfiles(profiles)

      // Sidebar profile — use active profile, or first candidate, or null
      const activeCand = profiles.find(p => p.id === activeId) ?? profiles[0] ?? null
      if (activeCand) {
        setSidebarProfile({
          display_initials: activeCand.display_initials,
          gender: activeCand.gender,
          first_name: activeCand.first_name,
        })
      }

      // Plan — read subscription
      const { data: sub } = await supabase
        .from('zawaaj_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      const plan = (sub?.plan as string | null) ?? 'free'
      setPlanLabel(plan === 'premium' ? 'Premium' : plan === 'plus' ? 'Plus' : 'Voluntary (free)')

      // Sidebar counts using active candidate profile
      if (activeCand) {
        const [slRes, irRes] = await Promise.all([
          supabase
            .from('zawaaj_saved_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('profile_id', activeCand.id),
          supabase
            .from('zawaaj_introduction_requests')
            .select('id', { count: 'exact', head: true })
            .eq('requesting_profile_id', activeCand.id)
            .in('status', ['pending', 'accepted']),
        ])
        setShortlistCount(slRes.count ?? 0)
        setIntroRequestsCount(irRes.count ?? 0)
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isMaleContact = MALE_RELATIONSHIPS.has(form.contactRelationship)

  async function handleSave() {
    if (!familyAccount) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const body = {
      contact_full_name: form.contactFullName.trim(),
      contact_relationship: form.contactRelationship,
      contact_number: form.contactNumber.trim(),
      female_contact_name: isMaleContact && !form.noFemaleContactFlag ? form.femaleContactName.trim() || null : null,
      female_contact_number: isMaleContact && !form.noFemaleContactFlag ? form.femaleContactNumber.trim() || null : null,
      female_contact_relationship: isMaleContact && !form.noFemaleContactFlag ? form.femaleContactRelationship || null : null,
      father_explanation: form.noFemaleContactFlag ? form.fatherExplanation.trim() : '',
      no_female_contact_flag: form.noFemaleContactFlag,
    }

    const res = await fetch('/api/family-account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({})) as { error?: string }

    setSaving(false)
    if (!res.ok) { setSaveError(json.error ?? 'Failed to save'); return }
    setSaveSuccess(true)
    setFamilyAccount(prev => prev ? { ...prev, ...body, no_female_contact_flag: form.noFemaleContactFlag } : prev)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute={pathname ?? ''} shortlistCount={0} introRequestsCount={0} profile={null} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
        </main>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute={pathname ?? ''} shortlistCount={0} introRequestsCount={0} profile={null} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Not a family representative</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This page is for family representatives only.</p>
          </div>
        </main>
      </div>
    )
  }

  const readiness = READINESS_LABELS[familyAccount?.readiness_state ?? ''] ?? READINESS_LABELS.candidate_only

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
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Family account</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Manage your contact details and family account settings.
            </div>
          </div>

          {/* Account status + plan */}
          <div style={{
            background: 'var(--surface-2)', border: '0.5px solid var(--border-default)',
            borderRadius: 13, padding: 20, marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: readiness.bg, color: readiness.color,
              }}>
                {readiness.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Plan: <strong style={{ color: 'var(--text-primary)' }}>{planLabel}</strong></span>
              <a
                href="/settings?tab=membership"
                style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}
              >
                Manage →
              </a>
            </div>
          </div>

          {/* Contact details form */}
          <div style={{
            background: 'var(--surface-2)', border: '0.5px solid var(--border-default)',
            borderRadius: 13, padding: 24, marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 20 }}>
              Contact details
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <FieldLabel>Full name</FieldLabel>
                <EditInput
                  value={form.contactFullName}
                  onChange={v => setForm(f => ({ ...f, contactFullName: v }))}
                  placeholder="e.g. Fatima Ahmed"
                />
              </div>

              <div>
                <FieldLabel>Relationship to candidate</FieldLabel>
                <EditSelect
                  value={form.contactRelationship}
                  onChange={v => setForm(f => ({ ...f, contactRelationship: v, noFemaleContactFlag: false }))}
                  options={RELATIONSHIP_OPTIONS}
                />
              </div>

              <div>
                <FieldLabel>Contact phone number</FieldLabel>
                <EditInput
                  value={form.contactNumber}
                  onChange={v => setForm(f => ({ ...f, contactNumber: v }))}
                  placeholder="+44 7700 000000"
                />
              </div>
            </div>
          </div>

          {/* Female representative section — shown for male contacts */}
          {isMaleContact && (
            <div style={{
              background: 'var(--surface-2)', border: '0.5px solid var(--border-default)',
              borderRadius: 13, padding: 24, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Female representative
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                Zawaaj requires a female family member who can speak with our team and with the candidate's family on your behalf.
              </p>

              {/* No female contact flag */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.noFemaleContactFlag}
                  onChange={e => setForm(f => ({ ...f, noFemaleContactFlag: e.target.checked }))}
                  style={{ marginTop: 2, accentColor: 'var(--gold)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  I do not have a female family member who can act as representative
                </span>
              </label>

              {form.noFemaleContactFlag ? (
                <div>
                  <FieldLabel>Explanation (required)</FieldLabel>
                  <textarea
                    value={form.fatherExplanation}
                    onChange={e => setForm(f => ({ ...f, fatherExplanation: e.target.value }))}
                    rows={3}
                    placeholder="Please explain your situation so our team can accommodate your needs."
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 9,
                      border: '0.5px solid var(--border-default)',
                      background: 'var(--surface-3)', color: 'var(--text-primary)',
                      fontSize: 13, resize: 'vertical', outline: 'none',
                      boxSizing: 'border-box', lineHeight: 1.6,
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <FieldLabel>Female representative name</FieldLabel>
                    <EditInput
                      value={form.femaleContactName}
                      onChange={v => setForm(f => ({ ...f, femaleContactName: v }))}
                      placeholder="e.g. Amina Ahmed"
                    />
                  </div>
                  <div>
                    <FieldLabel>Female representative phone</FieldLabel>
                    <EditInput
                      value={form.femaleContactNumber}
                      onChange={v => setForm(f => ({ ...f, femaleContactNumber: v }))}
                      placeholder="+44 7700 000001"
                    />
                  </div>
                  <div>
                    <FieldLabel>Relationship to candidate</FieldLabel>
                    <EditSelect
                      value={form.femaleContactRelationship}
                      onChange={v => setForm(f => ({ ...f, femaleContactRelationship: v }))}
                      options={FEMALE_REL_OPTIONS}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save button */}
          <div style={{ marginBottom: 24 }}>
            {saveError && (
              <div style={{
                padding: '9px 14px', borderRadius: 9,
                background: 'var(--status-error-bg)', border: '0.5px solid var(--status-error-br)',
                fontSize: 12.5, color: 'var(--status-error)', marginBottom: 10,
              }}>
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div style={{
                padding: '9px 14px', borderRadius: 9,
                background: 'var(--status-success-bg)', border: '0.5px solid var(--status-success-br)',
                fontSize: 12.5, color: 'var(--status-success)', marginBottom: 10,
              }}>
                Contact details saved ✓
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: saving ? 'var(--surface-3)' : 'var(--gold)',
                color: saving ? 'var(--text-muted)' : 'var(--surface)',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {/* Candidate profiles */}
          <div style={{
            background: 'var(--surface-2)', border: '0.5px solid var(--border-default)',
            borderRadius: 13, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                Candidate profiles
              </div>
              <a
                href="/add-profile"
                style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}
              >
                Add profile →
              </a>
            </div>

            {candidates.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                No candidate profiles linked to this account yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {candidates.map(c => {
                  const statusMeta = STATUS_LABELS[c.status] ?? { label: c.status, color: 'var(--text-muted)', bg: 'var(--surface-3)' }
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', background: 'var(--surface-3)',
                        borderRadius: 9, border: '0.5px solid var(--border-default)',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: c.gender === 'female' ? 'var(--avatar-female-bg)' : 'var(--avatar-male-bg)',
                        color: c.gender === 'female' ? 'var(--avatar-female-text)' : 'var(--avatar-male-text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {c.display_initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.first_name ? `${c.first_name}${c.last_name ? ` ${c.last_name[0]}.` : ''}` : c.display_initials}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 9px',
                        borderRadius: 999, background: statusMeta.bg, color: statusMeta.color,
                        flexShrink: 0,
                      }}>
                        {statusMeta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      <BottomNav
        activeRoute={pathname ?? ''}
        introRequestsCount={introRequestsCount}
        shortlistCount={shortlistCount}
      />
    </div>
  )
}
