'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileStatus =
  | 'pending' | 'approved' | 'paused' | 'rejected'
  | 'withdrawn' | 'suspended' | 'introduced'

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
  is_admin: boolean
  status: ProfileStatus
  withdrawal_reason: string | null
  contact_number: string | null
  guardian_name: string | null
  consent_given: boolean
  terms_agreed: boolean
  interests_this_month: number | null
  submitted_date: string | null
  approved_date: string | null
  created_at: string | null
  duplicate_flag: boolean
}

// Common attributes / preferences options
const ATTRIBUTE_OPTIONS = [
  'Practising', 'Educated', 'Family-oriented', 'Ambitious', 'Homely',
  'Open to relocation', 'Physically active', 'Non-smoker', 'Has children',
  'Widowed', 'Divorced', 'Revert',
]

const PREF_OPTIONS = [
  'Practising', 'Educated', 'Family-oriented', 'Ambitious', 'Homely',
  'Open to relocation', 'Physically active', 'Non-smoker', 'No children',
  'Open to children', 'Widowed / Divorced OK', 'Same ethnicity preferred',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:   { bg: 'var(--status-warning-bg)',  text: 'var(--status-warning)' },
    approved:  { bg: 'var(--status-success-bg)',  text: 'var(--status-success)' },
    rejected:  { bg: 'var(--status-error-bg)',    text: 'var(--status-error)' },
    withdrawn: { bg: 'var(--border-default)',     text: 'rgba(255,255,255,0.45)' },
    suspended: { bg: 'var(--status-warning-bg)',  text: 'var(--status-warning)' },
    introduced:{ bg: 'var(--status-info-bg)',     text: 'var(--status-info)' },
    paused:    { bg: 'var(--status-warning-bg)',  text: 'var(--status-warning)' },
  }
  const s = map[status] ?? { bg: 'var(--border-default)', text: 'rgba(255,255,255,0.45)' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {status}
    </span>
  )
}

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-white/50 font-medium uppercase tracking-wide mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full border-t border-white/10 pt-6 mt-2">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{children}</h2>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

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

  const loadProfile = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('zawaaj_profiles')
      .select('*')
      .eq('id', id)
      .single()
    if (err || !data) { setLoading(false); return }
    setProfile(data as Profile)
    setForm(data as Profile)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { loadProfile() }, [loadProfile])

  const set = (key: keyof Profile, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }))

  function toggleArrayItem(key: 'attributes' | 'spouse_preferences', item: string) {
    const arr: string[] = (form[key] as string[] | null) ?? []
    if (arr.includes(item)) {
      set(key, arr.filter(x => x !== item))
    } else {
      set(key, [...arr, item])
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error: err } = await supabase
      .from('zawaaj_profiles')
      .update({
        display_initials: form.display_initials,
        gender: form.gender,
        age_display: form.age_display,
        height: form.height,
        ethnicity: form.ethnicity,
        school_of_thought: form.school_of_thought,
        education_level: form.education_level,
        education_detail: form.education_detail,
        profession_sector: form.profession_sector,
        profession_detail: form.profession_detail,
        location: form.location,
        attributes: form.attributes,
        spouse_preferences: form.spouse_preferences,
        admin_comments: form.admin_comments,
        admin_notes: form.admin_notes,
        contact_number: form.contact_number,
        guardian_name: form.guardian_name,
        legacy_ref: form.legacy_ref,
        imported_email: form.imported_email,
        status: form.status,
        duplicate_flag: form.duplicate_flag,
        withdrawal_reason: form.withdrawal_reason,
        interests_this_month: form.interests_this_month,
      })
      .eq('id', id)

    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    loadProfile()
  }

  async function setStatus(status: ProfileStatus) {
    setSaving(true)
    const update: Record<string, unknown> = { status }
    if (status === 'approved') update.approved_date = new Date().toISOString()
    await supabase.from('zawaaj_profiles').update(update).eq('id', id)
    setSaving(false)
    loadProfile()
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center" data-theme="dark">
        <div className="bg-surface-2 rounded-2xl p-10 border border-white/10 text-center max-w-sm mx-4">
          <p className="text-2xl mb-2">🔒</p>
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <Link href="/admin" className="text-gold text-sm hover:underline">Back to Admin</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center" data-theme="dark">
        <p className="text-white/40 text-sm">Loading profile…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center" data-theme="dark">
        <div className="text-center">
          <p className="text-white/60 mb-4">Profile not found.</p>
          <Link href="/admin" className="text-gold text-sm hover:underline">Back to Admin</Link>
        </div>
      </div>
    )
  }

  const avatarBg = profile.gender === 'female' ? 'var(--status-purple)' : 'var(--status-info)'

  return (
    <div className="min-h-screen bg-surface" data-theme="dark">
      {/* Header */}
      <header className="bg-surface-2 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZawaajLogo size={30} tagline={false} />
            <span className="text-white/30 text-sm hidden sm:block">Admin — Edit Profile</span>
          </div>
          <Link href="/admin" className="text-white/40 hover:text-white/80 text-xs transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="bg-surface-2 rounded-2xl p-6 border border-white/10 mb-6 flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: avatarBg }}
          >
            {profile.display_initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{profile.display_initials}</h1>
              {profile.legacy_ref && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60 border border-white/10">
                  {profile.legacy_ref}
                </span>
              )}
              <StatusBadge status={profile.status} />
              {profile.duplicate_flag && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                  Possible duplicate
                </span>
              )}
            </div>
            <p className="text-sm text-white/50 mt-0.5 capitalize">
              {profile.gender} · {profile.age_display} · {profile.location}
            </p>
          </div>

          {/* Quick status actions */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {profile.status !== 'approved' && (
              <button onClick={() => setStatus('approved')} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                Approve
              </button>
            )}
            {profile.status === 'approved' && (
              <button onClick={() => setStatus('suspended')} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50">
                Suspend
              </button>
            )}
            {profile.status === 'suspended' && (
              <button onClick={() => setStatus('approved')} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
                Reinstate
              </button>
            )}
            {profile.status !== 'rejected' && (
              <button onClick={() => setStatus('rejected')} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50">
                Reject
              </button>
            )}
            {profile.status !== 'withdrawn' && (
              <button onClick={() => setStatus('withdrawn')} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-50">
                Withdraw
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-surface-2 rounded-2xl p-6 border border-white/10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              Profile saved successfully.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            {/* ── Profile Info ── */}
            <SectionHeading>Profile Information</SectionHeading>

            <Field label="Display Initials">
              <input className="field" value={form.display_initials ?? ''} onChange={e => set('display_initials', e.target.value)} />
            </Field>

            <Field label="Gender">
              <select className="field" value={form.gender ?? ''} onChange={e => set('gender', e.target.value)}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>

            <Field label="Age Display">
              <input className="field" value={form.age_display ?? ''} onChange={e => set('age_display', e.target.value)} />
            </Field>

            <Field label="Height">
              <input className="field" value={form.height ?? ''} onChange={e => set('height', e.target.value)} />
            </Field>

            <Field label="Ethnicity">
              <input className="field" value={form.ethnicity ?? ''} onChange={e => set('ethnicity', e.target.value)} />
            </Field>

            <Field label="School of Thought">
              <input className="field" value={form.school_of_thought ?? ''} onChange={e => set('school_of_thought', e.target.value)} />
            </Field>

            <Field label="Location">
              <input className="field" value={form.location ?? ''} onChange={e => set('location', e.target.value)} />
            </Field>

            {/* ── Education ── */}
            <SectionHeading>Education &amp; Profession</SectionHeading>

            <Field label="Education Level">
              <input className="field" value={form.education_level ?? ''} onChange={e => set('education_level', e.target.value)} />
            </Field>

            <Field label="Education Detail">
              <input className="field" value={form.education_detail ?? ''} onChange={e => set('education_detail', e.target.value)} />
            </Field>

            <Field label="Profession Sector">
              <input className="field" value={form.profession_sector ?? ''} onChange={e => set('profession_sector', e.target.value)} />
            </Field>

            <Field label="Profession Detail">
              <input className="field" value={form.profession_detail ?? ''} onChange={e => set('profession_detail', e.target.value)} />
            </Field>

            {/* ── Attributes ── */}
            <div className="col-span-full border-t border-white/10 pt-6 mt-2">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Attributes</h2>
              <div className="flex flex-wrap gap-2">
                {ATTRIBUTE_OPTIONS.map(opt => {
                  const selected = ((form.attributes as string[] | null) ?? []).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleArrayItem('attributes', opt)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--surface-4)' : 'transparent',
                        color: selected ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
                        borderColor: selected ? 'var(--border-gold)' : 'var(--border-default)',
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2">
                <span className="text-xs text-white/40">Other (comma-separated): </span>
                <input
                  className="field mt-1"
                  placeholder="Any additional attributes…"
                  value={
                    ((form.attributes as string[] | null) ?? [])
                      .filter(a => !ATTRIBUTE_OPTIONS.includes(a))
                      .join(', ')
                  }
                  onChange={e => {
                    const custom = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    const known = ((form.attributes as string[] | null) ?? []).filter(a => ATTRIBUTE_OPTIONS.includes(a))
                    set('attributes', [...known, ...custom])
                  }}
                />
              </div>
            </div>

            {/* ── Spouse Preferences ── */}
            <div className="col-span-full border-t border-white/10 pt-6 mt-2">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Spouse Preferences</h2>
              <div className="flex flex-wrap gap-2">
                {PREF_OPTIONS.map(opt => {
                  const selected = ((form.spouse_preferences as string[] | null) ?? []).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleArrayItem('spouse_preferences', opt)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--surface-4)' : 'transparent',
                        color: selected ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
                        borderColor: selected ? 'var(--border-gold)' : 'var(--border-default)',
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Admin Fields ── */}
            <SectionHeading>Admin-only Fields</SectionHeading>

            <Field label="Contact Number">
              <input className="field" value={form.contact_number ?? ''} onChange={e => set('contact_number', e.target.value)} />
            </Field>

            <Field label="Guardian Name">
              <input className="field" value={form.guardian_name ?? ''} onChange={e => set('guardian_name', e.target.value)} />
            </Field>

            <Field label="Legacy Ref">
              <input className="field" value={form.legacy_ref ?? ''} onChange={e => set('legacy_ref', e.target.value)} />
            </Field>

            <Field label="Imported Email">
              <input type="email" className="field" value={form.imported_email ?? ''} onChange={e => set('imported_email', e.target.value)} />
            </Field>

            <Field label="Status">
              <select className="field" value={form.status ?? ''} onChange={e => set('status', e.target.value as ProfileStatus)}>
                {(['pending','approved','paused','rejected','withdrawn','suspended','introduced'] as ProfileStatus[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Interests This Month">
              <input
                type="number"
                className="field"
                value={form.interests_this_month ?? ''}
                onChange={e => set('interests_this_month', e.target.value ? Number(e.target.value) : null)}
              />
            </Field>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.duplicate_flag ?? false}
                  onChange={e => set('duplicate_flag', e.target.checked)}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm text-white">Flag as possible duplicate</span>
              </label>
            </div>

            <Field label="Withdrawal Reason">
              <input className="field" value={form.withdrawal_reason ?? ''} onChange={e => set('withdrawal_reason', e.target.value)} />
            </Field>

            {/* ── Admin Notes ── */}
            <SectionHeading>Admin Notes</SectionHeading>

            <div className="col-span-full">
              <Field label="Admin Comments (shown to admin, may inform decisions)">
                <textarea className="field resize-none" rows={4} value={form.admin_comments ?? ''} onChange={e => set('admin_comments', e.target.value)} />
              </Field>
            </div>

            <div className="col-span-full">
              <Field label="Admin Notes (private — never shown to members)">
                <textarea className="field resize-none" rows={4} value={form.admin_notes ?? ''} onChange={e => set('admin_notes', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
            <Link href="/admin" className="text-sm text-white/50 hover:text-white transition-colors">
              Cancel — back to dashboard
            </Link>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-3 rounded-2xl text-sm font-semibold bg-surface-2 text-gold hover:bg-surface-3 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </div>
      </main>

      <style>{`
        .field {
          width: 100%;
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: var(--surface);
          color: rgba(255,255,255,0.9);
          outline: none;
          transition: border-color 0.15s;
        }
        .field:focus {
          border-color: var(--gold);
        }
      `}</style>
    </div>
  )
}
