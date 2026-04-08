'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
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
  first_name: string | null
  last_name: string | null
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
  submitted_date: string | null
  approved_date: string | null
  created_at: string | null
  duplicate_flag: boolean
  interests_this_month: number | null
  date_of_birth: string | null
  nationality: string | null
  marital_status: string | null
  has_children: boolean | null
  living_situation: string | null
  languages_spoken: string | null
  religiosity: string | null
  prayer_regularity: string | null
  wears_hijab: boolean | null
  keeps_beard: boolean | null
  open_to_relocation: string | null
  open_to_partners_children: string | null
  polygamy_openness: string | null
  bio: string | null
  pref_age_min: number | null
  pref_age_max: number | null
  pref_location: string | null
  pref_ethnicity: string | null
  pref_school_of_thought: string[] | null
  pref_relocation: string | null
  pref_partner_children: string | null
  is_banned: boolean
  ban_id: string | null
}

interface MatchProfile {
  id: string
  display_initials: string
  gender: string | null
  age_display: string | null
  location: string | null
  school_of_thought: string | null
  contact_number: string | null
  guardian_name: string | null
  imported_email: string | null
  legacy_ref: string | null
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
  admin_notified_date: string | null
  created_at: string | null
  profile_a: MatchProfile | null
  profile_b: MatchProfile | null
}

interface ZawaajEvent {
  id: string
  title: string
  event_date: string | null
  location_text: string | null
  registration_url: string | null
  status: 'upcoming' | 'ended' | 'archived'
  attendance_note: string | null
  show_in_history: boolean
  created_at: string | null
}

type Tab = 'queue' | 'mutual' | 'introduced' | 'members' | 'withdrawn' | 'events' | 'import'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function phoneDigits(phone: string | null): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

function avatarBg(gender: string | null): string {
  return gender === 'female' ? '#8B5CF6' : '#2563EB'
}

// ─── DetailRow (used in QueueTab expanded panel) ──────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | boolean | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 130, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{display}</span>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:              { bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24' },
    approved:             { bg: 'rgba(74,222,128,0.12)',  text: '#4ADE80' },
    rejected:             { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
    withdrawn:            { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.45)' },
    suspended:            { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
    introduced:           { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA' },
    paused:               { bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24' },
    awaiting_admin:       { bg: 'rgba(167,139,250,0.12)', text: '#A78BFA' },
    admin_reviewing:      { bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24' },
    nikah:                { bg: 'rgba(74,222,128,0.12)',  text: '#4ADE80' },
    no_longer_proceeding: { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
    dismissed:            { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.45)' },
    in_discussion:        { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA' },
    upcoming:             { bg: 'rgba(74,222,128,0.12)',  text: '#4ADE80' },
    ended:                { bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24' },
    archived:             { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.45)' },
    banned:               { bg: 'rgba(220,38,38,0.18)',   text: '#FCA5A5' },
  }
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.45)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function Avatar({ initials, gender, size = 40 }: { initials: string; gender: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
      style={{ width: size, height: size, backgroundColor: avatarBg(gender) }}
    >
      {initials}
    </div>
  )
}

function Confirm({
  message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1E1E1E] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-white mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-white/10 text-white hover:bg-white/5">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm bg-[#1A1A1A] text-white hover:bg-[#333]">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile Edit Modal ───────────────────────────────────────────────────────

// ─── Ban Modal ────────────────────────────────────────────────────────────────

const BAN_REASONS = [
  { value: 'misconduct',   label: 'Misconduct / inappropriate behaviour' },
  { value: 'harassment',   label: 'Harassment of another member' },
  { value: 'spam',         label: 'Spam / unsolicited contact attempts' },
  { value: 'immorality',   label: 'Immorality / content violations' },
  { value: 'fake_profile', label: 'Fake or misleading profile' },
  { value: 'other',        label: 'Other' },
] as const

type BanReason = typeof BAN_REASONS[number]['value']

function BanModal({ profile, onClose, onDone }: {
  profile: Profile
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState<BanReason | ''>('')
  const [notes, setNotes] = useState('')
  const [severity, setSeverity] = useState<'permanent' | 'temporary'>('permanent')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function confirmBan() {
    if (!reason) { setErr('Please select a reason.'); return }
    if (severity === 'temporary' && !expiresAt) { setErr('Please set an expiry date.'); return }
    setSaving(true); setErr(null)
    const res = await fetch('/api/admin/ban-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: profile.id,
        user_id: profile.user_id,
        reason,
        reason_detail: notes || null,
        severity,
        expires_at: severity === 'temporary' ? new Date(expiresAt).toISOString() : null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json() as { error?: string }
      setErr(d.error ?? 'Ban failed')
      return
    }
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-red-400">Ban Member — {profile.display_initials}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {err && <p className="text-sm text-red-400 bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

          <div>
            <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">Reason (required)</p>
            <div className="space-y-2">
              {BAN_REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="ban_reason" value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-red-500" />
                  <span className="text-sm text-white/70 group-hover:text-white">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">Admin notes (private — never shown to member)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional context or evidence…"
              className="field w-full text-sm resize-none"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">Duration</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="severity" value="permanent"
                  checked={severity === 'permanent'}
                  onChange={() => setSeverity('permanent')}
                  className="accent-red-500" />
                <span className="text-sm text-white">Permanent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="severity" value="temporary"
                  checked={severity === 'temporary'}
                  onChange={() => setSeverity('temporary')}
                  className="accent-red-500" />
                <span className="text-sm text-white">Temporary</span>
              </label>
            </div>
            {severity === 'temporary' && (
              <input
                type="date"
                value={expiresAt}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setExpiresAt(e.target.value)}
                className="field mt-3 text-sm"
              />
            )}
          </div>

          <div className="rounded-xl bg-red-950/20 border border-red-900/40 p-3 text-xs text-red-300">
            ⚠ This will immediately block their login and hide their profile from all members. Their introduction requests will be expired.
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border border-white/10 text-white hover:bg-white/5">Cancel</button>
          <button
            onClick={confirmBan}
            disabled={saving || !reason}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-700 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Banning…' : 'Confirm ban'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lift Ban Modal ───────────────────────────────────────────────────────────

function LiftBanModal({ profile, onClose, onDone }: {
  profile: Profile
  onClose: () => void
  onDone: () => void
}) {
  const [liftReason, setLiftReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function confirmLift() {
    if (!liftReason.trim()) { setErr('Please provide a reason for lifting the ban.'); return }
    setSaving(true); setErr(null)
    const res = await fetch('/api/admin/lift-ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profile.id, lift_reason: liftReason }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json() as { error?: string }
      setErr(d.error ?? 'Failed to lift ban')
      return
    }
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Lift Ban — {profile.display_initials}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div>
            <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">Reason for lifting ban (required)</p>
            <textarea
              value={liftReason}
              onChange={e => setLiftReason(e.target.value)}
              rows={3}
              placeholder="e.g. Member provided satisfactory explanation…"
              className="field w-full text-sm resize-none"
            />
          </div>
          <p className="text-xs text-white/40">Their profile will be relisted if it was previously approved. Login will be re-enabled.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border border-white/10 text-white hover:bg-white/5">Cancel</button>
          <button
            onClick={confirmLift}
            disabled={saving || !liftReason.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#B8960C] text-white hover:bg-[#9a7a0a] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Lifting…' : 'Lift ban'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function ProfileEditModal({ profile, onClose, onSave, onDeleteProfile, onDeleteAccount, canDeleteAccount }: {
  profile: Profile
  onClose: () => void
  onSave: () => void
  onDeleteProfile?: () => void
  onDeleteAccount?: () => void
  canDeleteAccount?: boolean
}) {
  const supabase = createClient()
  const [form, setForm] = useState<Partial<Profile>>({ ...profile })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof Profile, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }))

  async function save() {
    setSaving(true)
    setError(null)
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
      })
      .eq('id', profile.id)

    if (err) { setError(err.message); setSaving(false); return }
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-start justify-center py-8 px-4">
      <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Edit Profile — {profile.display_initials}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Display Initials</span>
              <input className="field" value={form.display_initials ?? ''} onChange={e => set('display_initials', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Gender</span>
              <select className="field" value={form.gender ?? ''} onChange={e => set('gender', e.target.value)}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Age Display</span>
              <input className="field" value={form.age_display ?? ''} onChange={e => set('age_display', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Height</span>
              <input className="field" value={form.height ?? ''} onChange={e => set('height', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Ethnicity</span>
              <input className="field" value={form.ethnicity ?? ''} onChange={e => set('ethnicity', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">School of Thought</span>
              <input className="field" value={form.school_of_thought ?? ''} onChange={e => set('school_of_thought', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Education Level</span>
              <input className="field" value={form.education_level ?? ''} onChange={e => set('education_level', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Education Detail</span>
              <input className="field" value={form.education_detail ?? ''} onChange={e => set('education_detail', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Profession Sector</span>
              <input className="field" value={form.profession_sector ?? ''} onChange={e => set('profession_sector', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Profession Detail</span>
              <input className="field" value={form.profession_detail ?? ''} onChange={e => set('profession_detail', e.target.value)} />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-white/60 mb-1 block">Location</span>
              <input className="field" value={form.location ?? ''} onChange={e => set('location', e.target.value)} />
            </label>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Admin-only Fields</p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-white/60 mb-1 block">Contact Number</span>
                <input className="field" value={form.contact_number ?? ''} onChange={e => set('contact_number', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-white/60 mb-1 block">Guardian Name</span>
                <input className="field" value={form.guardian_name ?? ''} onChange={e => set('guardian_name', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-white/60 mb-1 block">Legacy Ref</span>
                <input className="field" value={form.legacy_ref ?? ''} onChange={e => set('legacy_ref', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-white/60 mb-1 block">Imported Email</span>
                <input className="field" value={form.imported_email ?? ''} onChange={e => set('imported_email', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-white/60 mb-1 block">Status</span>
                <select className="field" value={form.status ?? ''} onChange={e => set('status', e.target.value as ProfileStatus)}>
                  {(['pending','approved','paused','rejected','withdrawn','suspended','introduced'] as ProfileStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block mt-4">
              <span className="text-xs text-white/60 mb-1 block">Admin Comments (visible notes)</span>
              <textarea className="field resize-none" rows={3} value={form.admin_comments ?? ''} onChange={e => set('admin_comments', e.target.value)} />
            </label>
            <label className="block mt-4">
              <span className="text-xs text-white/60 mb-1 block">Admin Notes (private)</span>
              <textarea className="field resize-none" rows={3} value={form.admin_notes ?? ''} onChange={e => set('admin_notes', e.target.value)} />
            </label>
          </div>
        </div>
        {/* Footer: destructive left, save/cancel right */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-white/10">
          {/* Destructive actions */}
          <div className="flex gap-2">
            {onDeleteProfile && (
              <button
                onClick={onDeleteProfile}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-red-950/50 text-red-400 border border-red-900/40 hover:bg-red-900/60"
                title="Delete this profile row only — login account is preserved"
              >
                🗑 Delete profile
              </button>
            )}
            {onDeleteAccount && (
              <button
                onClick={onDeleteAccount}
                disabled={!canDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-red-950/80 text-red-300 border border-red-800/60 hover:bg-red-900/80 disabled:opacity-30 disabled:cursor-not-allowed"
                title={canDeleteAccount ? 'Delete login account — profile data preserved but unlinked' : 'Cannot delete your own account'}
              >
                ⛔ Delete account
              </button>
            )}
          </div>
          {/* Save / cancel */}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border border-white/10 text-white hover:bg-white/5">Cancel</button>
            <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Contact Popup ────────────────────────────────────────────────────────────

function ContactPopup({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const digits = phoneDigits(profile.contact_number)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1E1E1E] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-white">Contact — {profile.display_initials}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-white/40 text-xs">Phone</dt>
            <dd className="font-medium text-white">{profile.contact_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-white/40 text-xs">Guardian</dt>
            <dd className="font-medium text-white">{profile.guardian_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-white/40 text-xs">Email</dt>
            <dd className="font-medium text-white">{profile.imported_email ?? '—'}</dd>
          </div>
        </dl>
        {digits && (
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700"
          >
            <span>WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Facilitate Introduction Modal ───────────────────────────────────────────

function FacilitateModal({ match, onClose, onDone }: {
  match: Match
  onClose: () => void
  onDone: () => void
}) {
  const supabase = createClient()
  const [consentA, setConsentA] = useState(match.family_a_consented)
  const [consentB, setConsentB] = useState(match.family_b_consented)
  const [saving, setSaving] = useState(false)

  async function toggleConsent(side: 'a' | 'b', value: boolean) {
    const field = side === 'a' ? 'family_a_consented' : 'family_b_consented'
    await supabase.from('zawaaj_matches').update({ [field]: value }).eq('id', match.id)
    if (side === 'a') setConsentA(value)
    else setConsentB(value)
  }

  async function markIntroduced() {
    setSaving(true)
    await supabase
      .from('zawaaj_matches')
      .update({ status: 'introduced', introduced_date: new Date().toISOString() })
      .eq('id', match.id)
    onDone()
    onClose()
  }

  const pA = match.profile_a
  const pB = match.profile_b
  const digitsA = phoneDigits(pA?.contact_number ?? null)
  const digitsB = phoneDigits(pB?.contact_number ?? null)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-start justify-center py-8 px-4">
      <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Facilitate Introduction</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-[#2A2200] border border-yellow-700/40 rounded-xl p-4 flex gap-3">
            <span className="text-amber-600 text-lg">⚠</span>
            <p className="text-sm text-amber-800 font-medium">Never share contact details without explicit verbal consent from both families.</p>
          </div>

          {/* Family A */}
          <div className="border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar initials={pA?.display_initials ?? '?'} gender={pA?.gender ?? null} size={40} />
              <div>
                <p className="font-semibold text-white">Family A — {pA?.display_initials}</p>
                <p className="text-xs text-white/50">{pA?.legacy_ref}</p>
              </div>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="text-white/40 w-20">Phone:</dt><dd>{pA?.contact_number ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-white/40 w-20">Guardian:</dt><dd>{pA?.guardian_name ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-white/40 w-20">Email:</dt><dd>{pA?.imported_email ?? '—'}</dd></div>
            </dl>
            <div className="flex items-center gap-3">
              {digitsA && (
                <a href={`https://wa.me/${digitsA}`} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700">
                  WhatsApp Family A
                </a>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={consentA} onChange={e => toggleConsent('a', e.target.checked)}
                  className="w-4 h-4 accent-[#B8960C]" />
                <span className="text-sm text-white">Family A verbally confirmed consent</span>
              </label>
            </div>
          </div>

          {/* Family B */}
          <div className="border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar initials={pB?.display_initials ?? '?'} gender={pB?.gender ?? null} size={40} />
              <div>
                <p className="font-semibold text-white">Family B — {pB?.display_initials}</p>
                <p className="text-xs text-white/50">{pB?.legacy_ref}</p>
              </div>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="text-white/40 w-20">Phone:</dt><dd>{pB?.contact_number ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-white/40 w-20">Guardian:</dt><dd>{pB?.guardian_name ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-white/40 w-20">Email:</dt><dd>{pB?.imported_email ?? '—'}</dd></div>
            </dl>
            <div className="flex items-center gap-3">
              {digitsB && (
                <a href={`https://wa.me/${digitsB}`} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700">
                  WhatsApp Family B
                </a>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={consentB} onChange={e => toggleConsent('b', e.target.checked)}
                  className="w-4 h-4 accent-[#B8960C]" />
                <span className="text-sm text-white">Family B verbally confirmed consent</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border border-white/10 text-white hover:bg-white/5">Close</button>
          <button
            onClick={markIntroduced}
            disabled={!consentA || !consentB || saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#B8960C] text-white hover:bg-[#9a7a0a] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Mark as Introduced'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 1: Queue ─────────────────────────────────────────────────────────────

function QueueTab({ profiles, onRefresh, currentUserId }: { profiles: Profile[]; onRefresh: () => void; currentUserId: string | null }) {
  const supabase = createClient()
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'approve' | 'reject'; note?: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const pending = profiles.filter(p => p.status === 'pending')

  async function deleteProfileOnly(p: Profile) {
    if (!window.confirm(
      `Permanently delete the profile for ${p.first_name ?? p.display_initials}? This cannot be undone. Their login account will be preserved.`
    )) return
    setDeletingId(p.id)
    const res = await fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: p.id }),
    })
    setDeletingId(null)
    if (res.ok) onRefresh()
    else {
      const err = await res.json() as { error?: string }
      alert(err.error ?? 'Delete failed')
    }
  }

  async function deleteAccount(p: Profile) {
    if (p.user_id && p.user_id === currentUserId) {
      alert('You cannot delete your own account.')
      return
    }
    if (!window.confirm(
      p.user_id
        ? `Delete the LOGIN ACCOUNT for ${p.first_name ?? p.display_initials}? This will permanently remove their ability to sign in. Their profiles will be preserved but unlinked. This cannot be undone.`
        : `Delete profile ${p.display_initials}? This cannot be undone.`
    )) return
    setDeletingId(p.user_id ?? p.id)
    const body = p.user_id ? { user_id: p.user_id } : { profile_id: p.id }
    const res = await fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setDeletingId(null)
    if (res.ok) onRefresh()
    else {
      const err = await res.json() as { error?: string }
      alert(err.error ?? 'Delete failed')
    }
  }

  void deletingId // suppress unused-var (used in future loading state)

  async function approve(id: string) {
    const res = await fetch('/api/admin/approve-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: id }),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: string }
      alert(err.error ?? 'Approval failed')
      return
    }
    onRefresh()
  }

  async function reject(id: string, note: string) {
    await supabase.from('zawaaj_profiles').update({ status: 'rejected', admin_comments: note || null }).eq('id', id)
    onRefresh()
  }

  if (pending.length === 0)
    return <p className="text-white/30 py-16 text-center text-sm">No applications pending review.</p>

  return (
    <>
      {editProfile && (
        <ProfileEditModal
          profile={editProfile}
          onClose={() => setEditProfile(null)}
          onSave={onRefresh}
          onDeleteProfile={() => { setEditProfile(null); deleteProfileOnly(editProfile) }}
          onDeleteAccount={editProfile.user_id ? () => { setEditProfile(null); deleteAccount(editProfile) } : undefined}
          canDeleteAccount={!!editProfile.user_id && editProfile.user_id !== currentUserId}
        />
      )}
      {confirmAction?.type === 'approve' && (
        <Confirm
          message={`Approve this profile?`}
          onConfirm={() => { approve(confirmAction.id); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      <div className="space-y-3">
        {pending.map(p => (
          <div key={p.id} className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/10">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                <Avatar initials={p.display_initials} gender={p.gender} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{p.display_initials}</span>
                    {(p.first_name || p.last_name) && (
                      <span className="text-white/60 text-sm">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {p.legacy_ref && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60 border border-white/10">
                        {p.legacy_ref}
                      </span>
                    )}
                    {p.duplicate_flag && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 text-xs font-medium">
                        Possible duplicate
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-sm text-white/60">
                    {p.gender && <span className="capitalize">{p.gender}</span>}
                    {p.age_display && <span>{p.age_display}</span>}
                    {p.location && <span>{p.location}</span>}
                    {p.ethnicity && <span>{p.ethnicity}</span>}
                    {p.profession_detail && <span>{p.profession_detail}</span>}
                    {p.education_level && <span>{p.education_level}</span>}
                    {p.school_of_thought && <span>{p.school_of_thought}</span>}
                    {p.religiosity && <span>{p.religiosity}</span>}
                  </div>
                  {p.contact_number && (
                    <p className="text-xs mt-1" style={{ color: 'var(--gold, #B8960C)' }}>
                      {p.contact_number}{p.guardian_name ? ` · ${p.guardian_name}` : ''}
                    </p>
                  )}
                  <p className="text-xs text-white/40 mt-1">Submitted {daysAgo(p.submitted_date)}</p>
                  {p.admin_comments && (
                    <div className="mt-2 bg-[#2A2200] border border-yellow-700/40 rounded-lg px-3 py-2 text-xs text-yellow-400">
                      <span className="font-medium">Admin note:</span> {p.admin_comments}
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    style={{ fontSize: 11, color: 'var(--gold, #B8960C)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                  >
                    {expandedId === p.id ? '▲ Hide details' : '▼ Full profile'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0 sm:w-28">
                <button onClick={() => setEditProfile(p)}
                  className="px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-white hover:bg-white/5">
                  Edit
                </button>
                <button onClick={() => setConfirmAction({ id: p.id, type: 'approve' })}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-green-600 text-white hover:bg-green-700">
                  Approve
                </button>
                {showRejectInput === p.id ? (
                  <div className="space-y-1">
                    <input
                      className="field text-xs py-1"
                      placeholder="Optional note…"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                    />
                    <button onClick={() => { reject(p.id, rejectNote); setShowRejectInput(null); setRejectNote('') }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700">
                      Confirm Reject
                    </button>
                    <button onClick={() => setShowRejectInput(null)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60 hover:bg-white/5">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowRejectInput(p.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-red-950/60 text-red-400 hover:bg-red-900/60">
                    Reject
                  </button>
                )}
              </div>
            </div>

            {/* Expanded full profile panel */}
            {expandedId === p.id && (
              <div style={{
                marginTop: 12,
                paddingTop: 16,
                borderTop: '0.5px solid rgba(255,255,255,0.1)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0 32px',
              }}>
                {/* Left column: Personal, Contact, About */}
                <div>
                  {/* Personal */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                      Personal
                    </p>
                    <DetailRow label="First Name" value={p.first_name} />
                    <DetailRow label="Last Name" value={p.last_name} />
                    <DetailRow label="Date of Birth" value={p.date_of_birth} />
                    <DetailRow label="Age Display" value={p.age_display} />
                    <DetailRow label="Gender" value={p.gender} />
                    <DetailRow label="Location" value={p.location} />
                    <DetailRow label="Nationality" value={p.nationality} />
                    <DetailRow label="Height" value={p.height} />
                    <DetailRow label="Marital Status" value={p.marital_status} />
                    <DetailRow label="Has Children" value={p.has_children} />
                    <DetailRow label="Living Situation" value={p.living_situation} />
                  </div>

                  {/* Contact (admin-only) */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold, #B8960C)', marginBottom: 4 }}>
                      Contact (Admin Only)
                    </p>
                    <DetailRow label="Contact Number" value={p.contact_number} />
                    <DetailRow label="Guardian Name" value={p.guardian_name} />
                    <DetailRow label="Imported Email" value={p.imported_email} />
                  </div>

                  {/* About */}
                  {p.bio && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                        About
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{p.bio}</p>
                    </div>
                  )}
                </div>

                {/* Right column: Background, Faith, Lifestyle, Preferences, Admin Notes */}
                <div>
                  {/* Background */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                      Background
                    </p>
                    <DetailRow label="Ethnicity" value={p.ethnicity} />
                    <DetailRow label="Languages" value={p.languages_spoken} />
                    <DetailRow label="Profession" value={p.profession_detail ?? p.profession_sector} />
                    <DetailRow label="Education Level" value={p.education_level} />
                    <DetailRow label="Institution" value={p.education_detail} />
                  </div>

                  {/* Faith & Practice */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                      Faith &amp; Practice
                    </p>
                    <DetailRow label="School of Thought" value={p.school_of_thought} />
                    <DetailRow label="Religiosity" value={p.religiosity} />
                    <DetailRow label="Prayer Regularity" value={p.prayer_regularity} />
                    {p.gender === 'female' && <DetailRow label="Wears Hijab" value={p.wears_hijab} />}
                    {p.gender === 'male' && <DetailRow label="Keeps Beard" value={p.keeps_beard} />}
                  </div>

                  {/* Lifestyle */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                      Lifestyle
                    </p>
                    <DetailRow label="Open to Relocation" value={p.open_to_relocation} />
                    <DetailRow label="Partner's Children" value={p.open_to_partners_children} />
                    <DetailRow label="Polygamy Openness" value={p.polygamy_openness} />
                  </div>

                  {/* Preferences */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                      Preferences
                    </p>
                    <DetailRow label="Pref Age Min" value={p.pref_age_min} />
                    <DetailRow label="Pref Age Max" value={p.pref_age_max} />
                    <DetailRow label="Pref Location" value={p.pref_location} />
                    <DetailRow label="Pref Ethnicity" value={p.pref_ethnicity} />
                    <DetailRow label="Pref School" value={p.pref_school_of_thought?.join(', ')} />
                    <DetailRow label="Pref Relocation" value={p.pref_relocation} />
                    <DetailRow label="Pref Partner Kids" value={p.pref_partner_children} />
                  </div>

                  {/* Admin Notes */}
                  {(p.admin_comments || p.admin_notes) && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                        Admin Notes
                      </p>
                      <DetailRow label="Admin Comments" value={p.admin_comments} />
                      <DetailRow label="Admin Notes" value={p.admin_notes} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Manual Match Modal ───────────────────────────────────────────────────────

function ManualMatchModal({ profiles, onClose, onDone }: {
  profiles: Profile[]
  onClose: () => void
  onDone: () => void
}) {
  const supabase = createClient()
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [profileA, setProfileA] = useState<Profile | null>(null)
  const [profileB, setProfileB] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const approved = profiles.filter(p => p.status === 'approved')

  const listA = approved.filter(p => {
    if (!searchA) return true
    const q = searchA.toLowerCase()
    return (
      p.display_initials.toLowerCase().includes(q) ||
      (p.first_name ?? '').toLowerCase().includes(q) ||
      (p.last_name ?? '').toLowerCase().includes(q) ||
      (p.legacy_ref ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 12)

  const listB = approved.filter(p => {
    if (profileA && p.gender === profileA.gender) return false // opposite gender only
    if (profileA && p.id === profileA.id) return false
    if (!searchB) return true
    const q = searchB.toLowerCase()
    return (
      p.display_initials.toLowerCase().includes(q) ||
      (p.first_name ?? '').toLowerCase().includes(q) ||
      (p.last_name ?? '').toLowerCase().includes(q) ||
      (p.legacy_ref ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 12)

  async function createMatch() {
    if (!profileA || !profileB) return
    if (profileA.gender === profileB.gender) {
      setErr('Profiles must be opposite gender.')
      return
    }
    setSaving(true)
    setErr(null)
    // Determine male/female for profile_a/profile_b convention
    const male = profileA.gender === 'male' ? profileA : profileB
    const female = profileA.gender === 'female' ? profileA : profileB
    const { error } = await supabase.from('zawaaj_matches').insert({
      profile_a_id: male.id,
      profile_b_id: female.id,
      status: 'awaiting_admin',
      family_a_consented: false,
      family_b_consented: false,
    })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Create Manual Match</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-6">
          {/* Profile A */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Profile A</p>
            {profileA ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <Avatar initials={profileA.display_initials} gender={profileA.gender} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{profileA.display_initials}</p>
                  <p className="text-xs text-white/40">{[profileA.first_name, profileA.last_name].filter(Boolean).join(' ')}</p>
                </div>
                <button onClick={() => { setProfileA(null); setSearchA('') }} className="text-white/30 hover:text-white text-xs">✕</button>
              </div>
            ) : (
              <>
                <input
                  placeholder="Search by name or ref…"
                  value={searchA}
                  onChange={e => setSearchA(e.target.value)}
                  className="field w-full text-sm"
                />
                {searchA && (
                  <div className="rounded-xl border border-white/10 overflow-hidden max-h-48 overflow-y-auto">
                    {listA.length === 0 ? (
                      <p className="text-white/30 text-xs p-3">No results</p>
                    ) : listA.map(p => (
                      <button key={p.id} onClick={() => { setProfileA(p); setSearchA('') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left border-b border-white/5 last:border-0">
                        <Avatar initials={p.display_initials} gender={p.gender} size={28} />
                        <div>
                          <p className="text-sm text-white">{p.display_initials} {p.first_name && <span className="text-white/50">{p.first_name} {p.last_name}</span>}</p>
                          <p className="text-xs text-white/30">{p.legacy_ref} · {p.gender} · {p.age_display}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Profile B */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">
              Profile B {profileA && <span className="normal-case text-white/30">({profileA.gender === 'male' ? 'female' : profileA.gender === 'female' ? 'male' : 'opposite gender'})</span>}
            </p>
            {profileB ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <Avatar initials={profileB.display_initials} gender={profileB.gender} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{profileB.display_initials}</p>
                  <p className="text-xs text-white/40">{[profileB.first_name, profileB.last_name].filter(Boolean).join(' ')}</p>
                </div>
                <button onClick={() => { setProfileB(null); setSearchB('') }} className="text-white/30 hover:text-white text-xs">✕</button>
              </div>
            ) : (
              <>
                <input
                  placeholder={profileA ? 'Search opposite gender…' : 'Select Profile A first'}
                  value={searchB}
                  onChange={e => setSearchB(e.target.value)}
                  disabled={!profileA}
                  className="field w-full text-sm disabled:opacity-40"
                />
                {searchB && profileA && (
                  <div className="rounded-xl border border-white/10 overflow-hidden max-h-48 overflow-y-auto">
                    {listB.length === 0 ? (
                      <p className="text-white/30 text-xs p-3">No results</p>
                    ) : listB.map(p => (
                      <button key={p.id} onClick={() => { setProfileB(p); setSearchB('') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left border-b border-white/5 last:border-0">
                        <Avatar initials={p.display_initials} gender={p.gender} size={28} />
                        <div>
                          <p className="text-sm text-white">{p.display_initials} {p.first_name && <span className="text-white/50">{p.first_name} {p.last_name}</span>}</p>
                          <p className="text-xs text-white/30">{p.legacy_ref} · {p.gender} · {p.age_display}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {err && <p className="px-6 pb-2 text-sm text-red-400">{err}</p>}

        {profileA && profileB && (
          <div className="px-6 pb-4">
            <div className="rounded-xl bg-[#B8960C]/10 border border-[#B8960C]/30 p-3 text-sm text-amber-300 flex items-center gap-2">
              <span>💛</span>
              <span>Creating a manual match for <strong>{profileA.display_initials}</strong> &amp; <strong>{profileB.display_initials}</strong> — this will appear in the Introductions queue for facilitation.</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border border-white/10 text-white hover:bg-white/5">Cancel</button>
          <button
            onClick={createMatch}
            disabled={!profileA || !profileB || saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#B8960C] text-white hover:bg-[#9a7a0a] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating…' : 'Create Match'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2: Mutual Matches ────────────────────────────────────────────────────

function MutualTab({ matches, onRefresh, profiles }: { matches: Match[]; onRefresh: () => void; profiles: Profile[] }) {
  const supabase = createClient()
  const [facilitateMatch, setFacilitateMatch] = useState<Match | null>(null)
  const [dismissId, setDismissId] = useState<string | null>(null)
  const [showManualMatch, setShowManualMatch] = useState(false)

  const relevant = matches.filter(m => ['awaiting_admin', 'admin_reviewing'].includes(m.status))

  async function dismiss(id: string) {
    await supabase.from('zawaaj_matches').update({ status: 'dismissed' }).eq('id', id)
    onRefresh()
  }

  return (
    <>
      {showManualMatch && (
        <ManualMatchModal profiles={profiles} onClose={() => setShowManualMatch(false)} onDone={onRefresh} />
      )}
      {facilitateMatch && (
        <FacilitateModal match={facilitateMatch} onClose={() => setFacilitateMatch(null)} onDone={onRefresh} />
      )}
      {dismissId && (
        <Confirm
          message="Dismiss this match? This cannot be undone."
          onConfirm={() => { dismiss(dismissId); setDismissId(null) }}
          onCancel={() => setDismissId(null)}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">
          {relevant.length === 0 ? 'No mutual matches awaiting review.' : `${relevant.length} awaiting review`}
        </p>
        <button
          onClick={() => setShowManualMatch(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[#B8960C]/50 text-[#B8960C] hover:bg-[#B8960C]/10"
        >
          <span>＋</span> Manual Match
        </button>
      </div>

      <div className="space-y-4">
        {relevant.map(m => {
          const pA = m.profile_a
          const pB = m.profile_b
          return (
            <div key={m.id} className="bg-[#1E1E1E] rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E4DC]">
                {/* Profile A */}
                <div className="p-5 flex gap-4">
                  <Avatar initials={pA?.display_initials ?? '?'} gender={pA?.gender ?? null} size={44} />
                  <div>
                    <p className="font-semibold text-white">{pA?.display_initials ?? 'Unknown'}</p>
                    {pA?.legacy_ref && <p className="text-xs text-white/40">{pA.legacy_ref}</p>}
                    <div className="mt-1 text-sm text-white/60 space-y-0.5">
                      {pA?.age_display && <p>{pA.age_display}</p>}
                      {pA?.location && <p>{pA.location}</p>}
                      {pA?.school_of_thought && <p>{pA.school_of_thought}</p>}
                    </div>
                  </div>
                </div>
                {/* Profile B */}
                <div className="p-5 flex gap-4">
                  <Avatar initials={pB?.display_initials ?? '?'} gender={pB?.gender ?? null} size={44} />
                  <div>
                    <p className="font-semibold text-white">{pB?.display_initials ?? 'Unknown'}</p>
                    {pB?.legacy_ref && <p className="text-xs text-white/40">{pB.legacy_ref}</p>}
                    <div className="mt-1 text-sm text-white/60 space-y-0.5">
                      {pB?.age_display && <p>{pB.age_display}</p>}
                      {pB?.location && <p>{pB.location}</p>}
                      {pB?.school_of_thought && <p>{pB.school_of_thought}</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-[#171717] border-t border-white/10 flex flex-wrap items-center gap-3">
                <StatusBadge status={m.status} />
                <span className="text-xs text-white/50">Mutual {daysAgo(m.mutual_date)}</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button onClick={() => setFacilitateMatch(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B8960C] text-white hover:bg-[#9a7a0a]">
                    Facilitate Introduction
                  </button>
                  <Link href={`/admin/sidebyside/${m.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white hover:bg-[#1E1E1E]">
                    View Side by Side
                  </Link>
                  <button onClick={() => setDismissId(m.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/60 text-red-400 hover:bg-red-900/60">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── TAB 3: Introduced ───────────────────────────────────────────────────────

function IntroducedTab({ matches, onRefresh }: { matches: Match[]; onRefresh: () => void }) {
  const supabase = createClient()

  const relevant = matches.filter(m =>
    ['introduced', 'nikah', 'no_longer_proceeding', 'dismissed'].includes(m.status)
  )

  async function updateOutcome(id: string, outcome: string) {
    await supabase.from('zawaaj_matches').update({ outcome, outcome_date: new Date().toISOString() }).eq('id', id)
    onRefresh()
  }

  if (relevant.length === 0)
    return <p className="text-white/30 py-16 text-center text-sm">No introduced matches yet.</p>

  return (
    <div className="space-y-3">
      {relevant.map(m => {
        const pA = m.profile_a
        const pB = m.profile_b
        return (
          <div key={m.id} className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex -space-x-2">
                <Avatar initials={pA?.display_initials ?? '?'} gender={pA?.gender ?? null} size={36} />
                <Avatar initials={pB?.display_initials ?? '?'} gender={pB?.gender ?? null} size={36} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white text-sm">
                  {pA?.display_initials ?? '?'} &amp; {pB?.display_initials ?? '?'}
                </p>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {pA?.legacy_ref && <span className="text-xs text-white/40">{pA.legacy_ref}</span>}
                  {pB?.legacy_ref && <span className="text-xs text-white/40">{pB.legacy_ref}</span>}
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  Introduced {fmtDate(m.introduced_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge status={m.status} />
              <select
                className="field text-xs py-1.5 px-2"
                value={m.outcome ?? 'unknown'}
                onChange={e => updateOutcome(m.id, e.target.value)}
              >
                <option value="unknown">Outcome: Unknown</option>
                <option value="in_discussion">In Discussion</option>
                <option value="nikah">Nikah</option>
                <option value="no_longer_proceeding">No Longer Proceeding</option>
              </select>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── TAB 4: All Members ───────────────────────────────────────────────────────

function MembersTab({ profiles, onRefresh, currentUserId }: { profiles: Profile[]; onRefresh: () => void; currentUserId: string | null }) {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'introduced' | 'paused' | 'suspended' | 'rejected' | 'banned'>('all')
  const [contactProfile, setContactProfile] = useState<Profile | null>(null)
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [banProfile, setBanProfile] = useState<Profile | null>(null)
  const [liftBanProfile, setLiftBanProfile] = useState<Profile | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Map user_id → profile count to identify parent/guardian accounts
  const userProfileCount = profiles.reduce<Record<string, number>>((acc, p) => {
    if (p.user_id) acc[p.user_id] = (acc[p.user_id] ?? 0) + 1
    return acc
  }, {})

  const filtered = profiles.filter(p => {
    if (statusFilter === 'banned') { if (!p.is_banned) return false }
    else if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.display_initials.toLowerCase().includes(q) ||
      (p.first_name ?? '').toLowerCase().includes(q) ||
      (p.last_name ?? '').toLowerCase().includes(q) ||
      (p.legacy_ref ?? '').toLowerCase().includes(q) ||
      (p.location ?? '').toLowerCase().includes(q) ||
      (p.imported_email ?? '').toLowerCase().includes(q) ||
      (p.contact_number ?? '').toLowerCase().includes(q) ||
      (p.guardian_name ?? '').toLowerCase().includes(q)
    )
  })

  async function deleteProfileOnly(p: Profile) {
    if (!window.confirm(
      `Permanently delete the profile for ${p.first_name ?? p.display_initials}? This cannot be undone. Their login account will be preserved.`
    )) return
    setDeletingUserId(p.id)
    const res = await fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: p.id }),
    })
    setDeletingUserId(null)
    if (res.ok) onRefresh()
    else {
      const err = await res.json() as { error?: string }
      alert(err.error ?? 'Delete failed')
    }
  }

  async function deleteAccount(p: Profile) {
    if (p.user_id && p.user_id === currentUserId) {
      alert('You cannot delete your own account.')
      return
    }
    if (!window.confirm(
      p.user_id
        ? `Delete the LOGIN ACCOUNT for ${p.first_name ?? p.display_initials}? This will permanently remove their ability to sign in. Their profiles will be preserved but unlinked. This cannot be undone.`
        : `Delete profile ${p.display_initials}? This cannot be undone.`
    )) return

    setDeletingUserId(p.user_id ?? p.id)
    const body = p.user_id ? { user_id: p.user_id } : { profile_id: p.id }
    const res = await fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setDeletingUserId(null)
    if (res.ok) onRefresh()
    else {
      const err = await res.json() as { error?: string }
      alert(err.error ?? 'Delete failed')
    }
  }

  async function changeStatus(id: string, status: ProfileStatus) {
    if (status === 'approved') {
      const res = await fetch('/api/admin/approve-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: id }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        alert(err.error ?? 'Approval failed')
        onRefresh()
        return
      }
    } else {
      await supabase.from('zawaaj_profiles').update({ status }).eq('id', id)
    }
    onRefresh()
  }

  const statusOptions: ProfileStatus[] = ['approved', 'suspended', 'rejected']

  return (
    <>
      {contactProfile && <ContactPopup profile={contactProfile} onClose={() => setContactProfile(null)} />}
      {editProfile && (
        <ProfileEditModal
          profile={editProfile}
          onClose={() => setEditProfile(null)}
          onSave={() => { onRefresh(); setEditProfile(null) }}
          onDeleteProfile={() => { setEditProfile(null); deleteProfileOnly(editProfile) }}
          onDeleteAccount={editProfile.user_id ? () => { setEditProfile(null); deleteAccount(editProfile) } : undefined}
          canDeleteAccount={!!editProfile.user_id && editProfile.user_id !== currentUserId}
        />
      )}
      {banProfile && (
        <BanModal
          profile={banProfile}
          onClose={() => setBanProfile(null)}
          onDone={() => { onRefresh(); setBanProfile(null) }}
        />
      )}
      {liftBanProfile && (
        <LiftBanModal
          profile={liftBanProfile}
          onClose={() => setLiftBanProfile(null)}
          onDone={() => { onRefresh(); setLiftBanProfile(null) }}
        />
      )}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by initials, ref, or location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field flex-1"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'approved', 'introduced', 'paused', 'suspended', 'rejected', 'banned'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.15s',
              background: statusFilter === s ? 'var(--gold, #B8960C)' : 'transparent',
              color: statusFilter === s ? '#111' : 'rgba(255,255,255,0.5)',
              borderColor: statusFilter === s ? 'var(--gold, #B8960C)' : 'rgba(255,255,255,0.15)',
              fontWeight: statusFilter === s ? 600 : 400,
            }}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#171717] text-white/40 text-left text-xs">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DC] bg-[#1E1E1E]">
            {filtered.map(p => {
              const isParentAccount = p.user_id ? (userProfileCount[p.user_id] ?? 0) > 1 : false
              const isDeleting = deletingUserId === (p.user_id ?? p.id)
              const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ')
              return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar initials={p.display_initials} gender={p.gender} size={32} />
                    <div className="min-w-0">
                      {fullName && <p className="font-medium text-white text-sm truncate">{fullName}</p>}
                      <p className="text-xs text-white/50">{p.display_initials}{p.legacy_ref ? ` · ${p.legacy_ref}` : ''}</p>
                      {p.imported_email && <p className="text-xs text-white/30 truncate">{p.imported_email}</p>}
                      {p.contact_number && (
                        <a href={`tel:${p.contact_number}`} className="text-xs text-[#B8960C]/70 hover:text-[#B8960C]">{p.contact_number}</a>
                      )}
                      {p.guardian_name && <p className="text-xs text-white/40">Guardian: {p.guardian_name}</p>}
                      {isParentAccount && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-xs bg-purple-950/60 text-purple-300 border border-purple-700/30">
                          👨‍👩‍👧 {userProfileCount[p.user_id!]} profiles
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/70 capitalize">{p.gender ?? '—'}</td>
                <td className="px-4 py-3 text-white/70">{p.age_display ?? '—'}</td>
                <td className="px-4 py-3 text-white/70">{p.location ?? '—'}</td>
                <td className="px-4 py-3 text-white/70">{p.profession_sector ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={p.status} />
                    {p.is_banned && <StatusBadge status="banned" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setContactProfile(p)}
                      className="px-2 py-1 rounded text-xs border border-white/10 text-white hover:bg-white/5">
                      Contact
                    </button>
                    <button onClick={() => setEditProfile(p)}
                      className="px-2 py-1 rounded text-xs border border-white/10 text-white hover:bg-white/5">
                      Edit
                    </button>
                    {p.status !== 'approved' && (
                      <button onClick={() => changeStatus(p.id, 'approved')}
                        className="px-2 py-1 rounded text-xs bg-green-950/60 text-green-400 hover:bg-green-900/60">
                        Approve
                      </button>
                    )}
                    {p.status === 'approved' && (
                      <button onClick={() => changeStatus(p.id, 'suspended')}
                        className="px-2 py-1 rounded text-xs bg-yellow-950/60 text-yellow-400 hover:bg-yellow-900/60">
                        Suspend
                      </button>
                    )}
                    {p.status === 'suspended' && (
                      <button onClick={() => changeStatus(p.id, 'approved')}
                        className="px-2 py-1 rounded text-xs bg-blue-950/60 text-blue-400 hover:bg-blue-900/60">
                        Reinstate
                      </button>
                    )}
                    {!['rejected'].includes(p.status) && (
                      <button onClick={() => changeStatus(p.id, 'rejected')}
                        className="px-2 py-1 rounded text-xs bg-red-950/60 text-red-400 hover:bg-red-900/60">
                        Reject
                      </button>
                    )}
                    {/* Delete actions are in the Edit modal footer */}
                    {/* Ban / Lift ban */}
                    {p.is_banned ? (
                      <button onClick={() => setLiftBanProfile(p)}
                        className="px-2 py-1 rounded text-xs bg-amber-950/60 text-amber-400 hover:bg-amber-900/60">
                        Lift ban
                      </button>
                    ) : (
                      <button onClick={() => setBanProfile(p)}
                        className="px-2 py-1 rounded text-xs bg-red-950/40 text-red-400/80 hover:bg-red-950/70 hover:text-red-300">
                        Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-white/40 py-10 text-sm">No members found.</p>
        )}
      </div>
    </>
  )
}

// ─── TAB 5: Withdrawn ─────────────────────────────────────────────────────────

function WithdrawnTab({ profiles, onRefresh }: { profiles: Profile[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const withdrawn = profiles.filter(p => p.status === 'withdrawn')

  async function reinstate(id: string) {
    await fetch('/api/admin/approve-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: id }),
    })
    onRefresh()
  }

  async function hardDelete(id: string) {
    await supabase.from('zawaaj_profiles').delete().eq('id', id)
    onRefresh()
  }

  if (withdrawn.length === 0)
    return <p className="text-white/30 py-16 text-center text-sm">No withdrawn profiles.</p>

  return (
    <>
      {deleteId && (
        <Confirm
          message="Permanently delete this profile? This cannot be undone."
          onConfirm={() => { hardDelete(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)}
        />
      )}
      <div className="space-y-3">
        {withdrawn.map(p => (
          <div key={p.id} className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/10 flex items-center gap-4">
            <Avatar initials={p.display_initials} gender={p.gender} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">{p.display_initials}</span>
                {p.legacy_ref && <span className="text-xs text-white/40">{p.legacy_ref}</span>}
              </div>
              {p.withdrawal_reason && (
                <p className="text-sm text-white/60 mt-0.5">Reason: {p.withdrawal_reason}</p>
              )}
              <p className="text-xs text-white/40 mt-0.5">Withdrawn {daysAgo(p.submitted_date)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => reinstate(p.id)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-[#B8960C] text-white hover:bg-[#9a7a0a]">
                Reinstate
              </button>
              <button onClick={() => setDeleteId(p.id)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-red-950/60 text-red-400 hover:bg-red-900/60">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TAB 6: Unlinked ─────────────────────────────────────────────────────────

function UnlinkedTab({ profiles, onRefresh }: { profiles: Profile[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [linkId, setLinkId] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const unlinked = profiles.filter(p => p.user_id === null && p.status === 'approved')

  async function linkProfile() {
    if (!linkId || !userId.trim()) return
    setLinking(true)
    setLinkError(null)
    const { error } = await supabase
      .from('zawaaj_profiles')
      .update({ user_id: userId.trim() })
      .eq('id', linkId)

    if (error) { setLinkError(error.message); setLinking(false); return }

    // Only create user_settings if none exists yet — never overwrite active_profile_id
    // (parent may already have another profile as active)
    const { data: existingSettings } = await supabase
      .from('zawaaj_user_settings')
      .select('id')
      .eq('user_id', userId.trim())
      .maybeSingle()

    if (!existingSettings) {
      await supabase.from('zawaaj_user_settings').insert({
        user_id: userId.trim(),
        active_profile_id: linkId,
      })
    }
    // If settings already exist, the profile is now linked to the account
    // but the active profile is unchanged — the user can switch via the Sidebar

    setLinkId(null)
    setUserId('')
    setLinking(false)
    onRefresh()
  }

  if (unlinked.length === 0)
    return (
      <div className="py-16 text-center">
        <p className="text-white/30 text-sm">All approved profiles are linked to user accounts.</p>
      </div>
    )

  return (
    <>
      {linkId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1E1E1E] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-white mb-2">Link Profile to User</h3>
            <p className="text-xs text-white/50 mb-3">
              Enter the user&apos;s Supabase Auth UUID. You can find this in the Supabase dashboard under Authentication &gt; Users.
            </p>
            <input
              className="field mb-1"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
            {linkError && <p className="text-red-600 text-xs mb-2">{linkError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setLinkId(null); setUserId(''); setLinkError(null) }}
                className="flex-1 px-4 py-2 rounded-xl text-sm border border-white/10 text-white hover:bg-white/5">
                Cancel
              </button>
              <button onClick={linkProfile} disabled={!userId.trim() || linking}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] disabled:opacity-50">
                {linking ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 bg-[#2A2200] border border-yellow-700/40 rounded-xl px-5 py-4">
        <p className="text-sm font-medium text-amber-800">
          {unlinked.length} approved {unlinked.length === 1 ? 'profile has' : 'profiles have'} not yet been claimed by a user account.
        </p>
      </div>

      <div className="space-y-3">
        {unlinked.map(p => (
          <div key={p.id} className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/10 flex items-center gap-4">
            <Avatar initials={p.display_initials} gender={p.gender} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">{p.display_initials}</span>
                {p.legacy_ref && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60 border border-white/10">
                    {p.legacy_ref}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-white/60">
                {p.imported_email && <span>{p.imported_email}</span>}
                {p.contact_number && <span>{p.contact_number}</span>}
                {p.age_display && <span>{p.age_display}</span>}
                {p.location && <span>{p.location}</span>}
              </div>
            </div>
            <button onClick={() => setLinkId(p.id)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] flex-shrink-0">
              Link to User
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TAB 7: Events ────────────────────────────────────────────────────────────

function EventsTab({ events, onRefresh }: { events: ZawaajEvent[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [editUrl, setEditUrl] = useState<Record<string, string>>({})
  const [editNote, setEditNote] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [newForm, setNewForm] = useState({
    title: '', event_date: '', location_text: '', registration_url: '', attendance_note: '',
  })
  const [creating, setCreating] = useState(false)

  async function updateHistory(id: string, show: boolean) {
    await supabase.from('zawaaj_events').update({ show_in_history: show }).eq('id', id)
    onRefresh()
  }

  async function updateUrl(id: string) {
    await supabase.from('zawaaj_events').update({ registration_url: editUrl[id] ?? '' }).eq('id', id)
    onRefresh()
  }

  async function updateNote(id: string) {
    await supabase.from('zawaaj_events').update({ attendance_note: editNote[id] ?? '' }).eq('id', id)
    onRefresh()
  }

  async function archive(id: string) {
    await supabase.from('zawaaj_events').update({ status: 'archived' }).eq('id', id)
    onRefresh()
  }

  async function hardDelete(id: string) {
    await supabase.from('zawaaj_events').delete().eq('id', id)
    onRefresh()
  }

  const [editDetails, setEditDetails] = useState<Record<string, { title: string; event_date: string; location_text: string }>>({})

  async function markEnded(id: string) {
    await supabase.from('zawaaj_events').update({ status: 'ended', show_in_history: true }).eq('id', id)
    onRefresh()
  }

  async function updateDetails(id: string) {
    const d = editDetails[id]
    if (!d) return
    await supabase.from('zawaaj_events').update({
      title: d.title || undefined,
      event_date: d.event_date || null,
      location_text: d.location_text || null,
    }).eq('id', id)
    onRefresh()
  }

  async function createEvent() {
    if (!newForm.title) return
    setCreating(true)
    // Auto-detect past events: if date is set and in the past, mark as ended + show in history
    const isPast = newForm.event_date
      ? new Date(newForm.event_date) < new Date()
      : false
    await supabase.from('zawaaj_events').insert({
      title: newForm.title,
      event_date: newForm.event_date || null,
      location_text: newForm.location_text || null,
      registration_url: newForm.registration_url || null,
      attendance_note: newForm.attendance_note || null,
      status: isPast ? 'ended' : 'upcoming',
      show_in_history: isPast,
    })
    setNewForm({ title: '', event_date: '', location_text: '', registration_url: '', attendance_note: '' })
    setCreating(false)
    onRefresh()
  }

  return (
    <>
      {deleteId && (
        <Confirm
          message="Permanently delete this event?"
          onConfirm={() => { hardDelete(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* New Event Form */}
      <div className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/10 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Add New Event</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-white/60 mb-1 block">Title *</span>
            <input className="field" value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1 block">Date &amp; Time</span>
            <input type="datetime-local" className="field" value={newForm.event_date} onChange={e => setNewForm(f => ({ ...f, event_date: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1 block">Location</span>
            <input className="field" value={newForm.location_text} onChange={e => setNewForm(f => ({ ...f, location_text: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1 block">Registration URL</span>
            <input type="url" className="field" value={newForm.registration_url} onChange={e => setNewForm(f => ({ ...f, registration_url: e.target.value }))} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/60 mb-1 block">Note (optional)</span>
            <input className="field" placeholder="e.g. Hosted by Zawaaj – The Blessed Choice. 11am–1pm." value={newForm.attendance_note} onChange={e => setNewForm(f => ({ ...f, attendance_note: e.target.value }))} />
          </label>
        </div>
        <p className="text-xs text-white/30 mt-3">Past dates are automatically saved as ended events in history.</p>
        <button onClick={createEvent} disabled={!newForm.title || creating}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] disabled:opacity-50">
          {creating ? 'Creating…' : 'Create Event'}
        </button>
      </div>

      {/* Event List */}
      {events.length === 0 && (
        <p className="text-white/30 py-8 text-center text-sm">No events yet.</p>
      )}
      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="bg-[#1E1E1E] rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{ev.title}</span>
                  <StatusBadge status={ev.status} />
                </div>
                <div className="flex flex-wrap gap-x-3 mt-1 text-sm text-white/60">
                  {ev.event_date && <span>{fmtDate(ev.event_date)}</span>}
                  {ev.location_text && <span>{ev.location_text}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ev.show_in_history}
                    onChange={e => updateHistory(ev.id, e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#B8960C]"
                  />
                  Show in history
                </label>
                {ev.status === 'upcoming' && (
                  <button onClick={() => markEnded(ev.id)}
                    className="px-2.5 py-1 rounded-lg text-xs border border-white/10 text-white/70 hover:bg-white/5">
                    Mark ended
                  </button>
                )}
                {ev.status !== 'archived' && (
                  <button onClick={() => archive(ev.id)}
                    className="px-2.5 py-1 rounded-lg text-xs border border-white/10 text-white hover:bg-white/5">
                    Archive
                  </button>
                )}
                <button onClick={() => setDeleteId(ev.id)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-red-950/60 text-red-400 hover:bg-red-900/60">
                  Delete
                </button>
              </div>
            </div>
            {/* Core details edit */}
            <div className="px-5 py-3 border-t border-white/10 bg-[#171717] grid sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40 flex-shrink-0 w-12">Title:</span>
                <input
                  className="field text-xs py-1 flex-1"
                  defaultValue={ev.title}
                  onChange={e => setEditDetails(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], title: e.target.value, event_date: prev[ev.id]?.event_date ?? ev.event_date ?? '', location_text: prev[ev.id]?.location_text ?? ev.location_text ?? '' } }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40 flex-shrink-0 w-12">Date:</span>
                <input
                  type="datetime-local"
                  className="field text-xs py-1 flex-1"
                  defaultValue={ev.event_date ? ev.event_date.slice(0, 16) : ''}
                  onChange={e => setEditDetails(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], title: prev[ev.id]?.title ?? ev.title, event_date: e.target.value, location_text: prev[ev.id]?.location_text ?? ev.location_text ?? '' } }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40 flex-shrink-0 w-14">Location:</span>
                <input
                  className="field text-xs py-1 flex-1"
                  defaultValue={ev.location_text ?? ''}
                  onChange={e => setEditDetails(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], title: prev[ev.id]?.title ?? ev.title, event_date: prev[ev.id]?.event_date ?? ev.event_date ?? '', location_text: e.target.value } }))}
                />
                <button onClick={() => updateDetails(ev.id)}
                  className="px-3 py-1 rounded-lg text-xs bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] flex-shrink-0">
                  Save
                </button>
              </div>
            </div>
            {/* URL edit */}
            <div className="px-5 py-3 border-t border-white/10 bg-[#171717] flex items-center gap-2">
              <span className="text-xs text-white/50 flex-shrink-0">Registration URL:</span>
              <input
                className="field flex-1 text-xs py-1"
                defaultValue={ev.registration_url ?? ''}
                onBlur={e => setEditUrl(prev => ({ ...prev, [ev.id]: e.target.value }))}
                onChange={e => setEditUrl(prev => ({ ...prev, [ev.id]: e.target.value }))}
              />
              <button onClick={() => updateUrl(ev.id)}
                className="px-3 py-1 rounded-lg text-xs bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] flex-shrink-0">
                Save
              </button>
            </div>
            {/* Attendance note (only for ended/archived) */}
            {(ev.status === 'ended' || ev.status === 'archived') && (
              <div className="px-5 py-3 border-t border-white/10 bg-[#171717] flex items-center gap-2">
                <span className="text-xs text-white/50 flex-shrink-0">Attendance note:</span>
                <input
                  className="field flex-1 text-xs py-1"
                  defaultValue={ev.attendance_note ?? ''}
                  onChange={e => setEditNote(prev => ({ ...prev, [ev.id]: e.target.value }))}
                />
                <button onClick={() => updateNote(ev.id)}
                  className="px-3 py-1 rounded-lg text-xs bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333] flex-shrink-0">
                  Save
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TAB 8: Orphaned Accounts ─────────────────────────────────────────────────

interface OrphanedUser {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
}

function OrphanedTab() {
  const [orphaned, setOrphaned] = useState<OrphanedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orphaned-accounts')
      .then(r => r.json() as Promise<{ orphaned?: OrphanedUser[]; error?: string }>)
      .then(data => {
        if (data.error) { setFetchError(data.error); setLoading(false); return }
        setOrphaned(data.orphaned ?? [])
        setLoading(false)
      })
      .catch(() => { setFetchError('Network error'); setLoading(false) })
  }, [])

  async function deleteOrphan(u: OrphanedUser) {
    if (!window.confirm(
      `Delete auth account for ${u.email ?? u.id}? This cannot be undone.`
    )) return
    setDeletingId(u.id)
    const res = await fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id }),
    })
    setDeletingId(null)
    if (res.ok) {
      setOrphaned(prev => prev.filter(o => o.id !== u.id))
    } else {
      const err = await res.json() as { error?: string }
      alert(err.error ?? 'Delete failed')
    }
  }

  if (loading) return <div className="py-16 text-center text-white/30 text-sm">Loading…</div>
  if (fetchError) return <div className="py-16 text-center text-red-400 text-sm">{fetchError}</div>

  if (orphaned.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-2xl mb-3">✅</div>
        <p className="text-white/30 text-sm">No orphaned accounts — every auth user has a linked profile.</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 bg-[#2A1A1A] border border-red-900/40 rounded-xl px-5 py-4">
        <p className="text-sm font-medium text-red-400">
          {orphaned.length} auth {orphaned.length === 1 ? 'account has' : 'accounts have'} no linked profile.
          These may be from failed or abandoned sign-ups.
        </p>
      </div>

      <div className="space-y-3">
        {orphaned.map(u => (
          <div key={u.id} className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#2A2A2A] border border-white/10 flex items-center justify-center text-white/30 text-sm flex-shrink-0">
              ?
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{u.email ?? '(no email)'}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-white/40">
                <span>ID: {u.id.slice(0, 8)}…</span>
                <span>Created: {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {u.last_sign_in_at && (
                  <span>Last sign-in: {new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteOrphan(u)}
              disabled={deletingId === u.id}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/40 flex-shrink-0 disabled:opacity-40"
            >
              {deletingId === u.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TAB 9: Import ────────────────────────────────────────────────────────────

function ImportTab() {
  // Legacy column reference kept for SQL-based imports
  const [copied, setCopied] = useState<string | null>(null)

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const csvColumns = [
    { col: 'legacy_ref', req: false, note: 'Reference ID, e.g. ZWJ-001' },
    { col: 'imported_email', req: true, note: 'Used for auto-linking when member registers' },
    { col: 'display_initials', req: true, note: 'e.g. AS — shown to other members' },
    { col: 'first_name', req: false, note: '' },
    { col: 'last_name', req: false, note: '' },
    { col: 'gender', req: true, note: '"male" or "female"' },
    { col: 'date_of_birth', req: false, note: 'YYYY-MM-DD format' },
    { col: 'age_display', req: false, note: 'e.g. "28" — shown to members if no dob' },
    { col: 'height', req: false, note: 'e.g. "5\'8\'"' },
    { col: 'ethnicity', req: false, note: '' },
    { col: 'nationality', req: false, note: '' },
    { col: 'school_of_thought', req: false, note: '' },
    { col: 'education_level', req: false, note: '' },
    { col: 'education_detail', req: false, note: 'Institution name' },
    { col: 'profession_detail', req: false, note: '' },
    { col: 'location', req: false, note: 'e.g. "London, UK"' },
    { col: 'languages_spoken', req: false, note: '' },
    { col: 'bio', req: false, note: 'Free text' },
    { col: 'religiosity', req: false, note: '' },
    { col: 'prayer_regularity', req: false, note: 'e.g. "yes_regularly"' },
    { col: 'wears_hijab', req: false, note: '"true" or "false" — female only' },
    { col: 'keeps_beard', req: false, note: '"true" or "false" — male only' },
    { col: 'marital_status', req: false, note: '"never_married" | "divorced" | "widowed"' },
    { col: 'has_children', req: false, note: '"true" or "false"' },
    { col: 'living_situation', req: false, note: '"independent" | "with_family" | "shared"' },
    { col: 'open_to_relocation', req: false, note: '' },
    { col: 'open_to_partners_children', req: false, note: '' },
    { col: 'polygamy_openness', req: false, note: '' },
    { col: 'pref_age_min', req: false, note: 'Integer' },
    { col: 'pref_age_max', req: false, note: 'Integer' },
    { col: 'pref_location', req: false, note: '' },
    { col: 'pref_ethnicity', req: false, note: '' },
    { col: 'pref_school_of_thought', req: false, note: 'Comma-separated, wrapped in "{}" for array, e.g. {Sunni,Shia}' },
    { col: 'contact_number', req: false, note: 'Admin-only — never shown to members' },
    { col: 'guardian_name', req: false, note: 'Admin-only' },
    { col: 'status', req: true, note: '"pending" | "approved"' },
    { col: 'consent_given', req: false, note: '"true" — default false if omitted' },
    { col: 'terms_agreed', req: false, note: '"true" — default false if omitted' },
  ]

  const sqlTemplate = `INSERT INTO zawaaj_profiles (
  legacy_ref, imported_email, display_initials, first_name, last_name,
  gender, date_of_birth, age_display, height, ethnicity, nationality,
  school_of_thought, education_level, education_detail, profession_detail,
  location, languages_spoken, bio, religiosity, prayer_regularity,
  wears_hijab, keeps_beard, marital_status, has_children, living_situation,
  open_to_relocation, open_to_partners_children, polygamy_openness,
  pref_age_min, pref_age_max, pref_location, pref_ethnicity,
  pref_school_of_thought, contact_number, guardian_name,
  status, consent_given, terms_agreed
) VALUES (
  'ZWJ-001', 'member@example.com', 'AS', 'Amina', 'Saleh',
  'female', '1996-03-15', '28', '5''5"', 'Arab', 'British',
  'Sunni', 'Bachelor''s degree', 'UCL', 'Teacher',
  'London, UK', 'English, Arabic', 'Bio text here...', 'Practising', 'yes_regularly',
  true, null, 'never_married', false, 'with_family',
  'Yes', 'Yes', 'Not open',
  24, 34, 'UK', 'Any',
  '{Sunni}', '+44 7xxx xxxxxx', 'Father: Omar Saleh',
  'approved', true, true
);`

  return (
    <div className="max-w-3xl space-y-8">
      {/* New CSV import tool */}
      <div className="bg-[#1A1500] border border-[#B8960C]/30 rounded-2xl p-5 flex items-center gap-5">
        <div className="text-3xl">📥</div>
        <div className="flex-1">
          <p className="font-semibold text-white mb-1">New: CSV Import Tool</p>
          <p className="text-sm text-white/50">Upload a CSV, preview validation errors, then run the real import to create member accounts automatically.</p>
        </div>
        <Link href="/admin/import"
          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#B8960C] text-black hover:bg-[#9a7a0a] transition-colors">
          Open import tool →
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-1">SQL Import Reference</h2>
        <p className="text-white/50 text-sm">
          Manual SQL import via the Supabase SQL Editor. Profiles with a matching{' '}
          <code className="bg-white/10 px-1 rounded text-xs">imported_email</code>{' '}
          will be automatically linked when that member registers.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {[
          {
            n: 1,
            title: 'Open the SQL Editor',
            body: (
              <p className="text-sm text-white/50">
                Go to{' '}
                <a
                  href="https://supabase.com/dashboard/project/nxytwfbzoxatyupqccba/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B8960C] hover:underline"
                >
                  Supabase → SQL Editor → New query
                </a>
              </p>
            ),
          },
          {
            n: 2,
            title: 'Use INSERT statements',
            body: (
              <div>
                <p className="text-sm text-white/50 mb-3">
                  One INSERT per profile row. Copy this example as a starting template:
                </p>
                <div className="relative">
                  <pre className="bg-[#111] border border-white/10 rounded-xl p-4 text-xs text-white/70 overflow-x-auto whitespace-pre-wrap">
                    {sqlTemplate}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(sqlTemplate, 'sql')}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                  >
                    {copied === 'sql' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ),
          },
          {
            n: 3,
            title: 'Review imported profiles',
            body: (
              <p className="text-sm text-white/50">
                After importing, use the <strong className="text-white/70">Members</strong> tab to review
                each imported profile. Profiles set to{' '}
                <code className="bg-white/10 px-1 rounded text-xs">approved</code> will be visible
                immediately when they register and log in.
              </p>
            ),
          },
          {
            n: 4,
            title: 'When members register',
            body: (
              <p className="text-sm text-white/50">
                If a registering member&apos;s email matches an{' '}
                <code className="bg-white/10 px-1 rounded text-xs">imported_email</code>,
                their account is automatically linked to the imported profile. Their wizard data
                enriches the imported record. Parent/guardian accounts with multiple children
                sharing the same email are all linked at once.
              </p>
            ),
          },
        ].map(step => (
          <div key={step.n} className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center text-xs font-semibold text-[#B8960C] flex-shrink-0 mt-0.5">
              {step.n}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-1.5">{step.title}</div>
              {step.body}
            </div>
          </div>
        ))}
      </div>

      {/* Column reference */}
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-white/30 mb-3">Column reference</div>
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">Column</th>
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">Required</th>
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {csvColumns.map((c, i) => (
                <tr key={c.col} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                  <td className="px-4 py-2 font-mono text-white/70">{c.col}</td>
                  <td className="px-4 py-2">
                    {c.req ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/40 text-amber-400">Required</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-white/40">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const supabase = createClient()
  const [accessChecked, setAccessChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('queue')

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [events, setEvents] = useState<ZawaajEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Check admin access
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAccessChecked(true); return }
      setCurrentUserId(user.id)
      const { data } = await supabase
        .from('zawaaj_profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .eq('is_admin', true)
        .maybeSingle()
      setIsAdmin(!!data)
      setAccessChecked(true)
    }
    checkAdmin()
  }, [supabase])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [
      { data: profileData },
      { data: matchData },
      { data: eventData },
    ] = await Promise.all([
      supabase
        .from('zawaaj_profiles')
        .select('*')
        .order('submitted_date', { ascending: false }),
      supabase
        .from('zawaaj_matches')
        .select(`
          *,
          profile_a:zawaaj_profiles!zawaaj_matches_profile_a_id_fkey(
            id, display_initials, gender, age_display, location, school_of_thought,
            contact_number, guardian_name, imported_email, legacy_ref
          ),
          profile_b:zawaaj_profiles!zawaaj_matches_profile_b_id_fkey(
            id, display_initials, gender, age_display, location, school_of_thought,
            contact_number, guardian_name, imported_email, legacy_ref
          )
        `)
        .order('mutual_date', { ascending: false }),
      supabase
        .from('zawaaj_events')
        .select('*')
        .order('event_date', { ascending: false }),
    ])

    setProfiles((profileData as Profile[]) ?? [])
    setMatches((matchData as unknown as Match[]) ?? [])
    setEvents((eventData as ZawaajEvent[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (isAdmin) loadData()
  }, [isAdmin, loadData])

  // Counts for badges
  const pendingCount = profiles.filter(p => p.status === 'pending').length
  const mutualCount = matches.filter(m => ['awaiting_admin', 'admin_reviewing'].includes(m.status)).length
  const introducedCount = matches.filter(m => ['introduced', 'nikah', 'no_longer_proceeding', 'dismissed'].includes(m.status)).length
  const withdrawnCount = profiles.filter(p => p.status === 'withdrawn').length
  const unlinkedCount = profiles.filter(p => p.user_id === null && p.status === 'approved').length

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'queue',      label: 'Queue',          badge: pendingCount },
    { key: 'members',    label: 'Members',         badge: profiles.length },
    { key: 'mutual',     label: 'Introductions',   badge: mutualCount },
    { key: 'introduced', label: 'Matches',         badge: introducedCount },
    { key: 'withdrawn',  label: 'Withdrawn',       badge: withdrawnCount },
    { key: 'events',     label: 'Events',          badge: events.length },
    { key: 'import',     label: 'Import' },
  ]

  if (!accessChecked) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <p className="text-white/30 text-sm">Checking access…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center gap-4">
        <div className="bg-[#1E1E1E] rounded-2xl p-10 border border-white/10 text-center max-w-sm mx-4">
          <p className="text-2xl mb-2">🔒</p>
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-white/50 text-sm mb-6">You do not have admin access to this page.</p>
          <Link href="/browse" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1A1A1A] text-[#B8960C] hover:bg-[#333]">
            Return to Browse
          </Link>
        </div>
      </div>
    )
  }

  // Stats
  const totalProfiles = profiles.length
  const approvedCount = profiles.filter(p => p.status === 'approved').length

  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Header */}
      <header className="bg-[#1A1A1A] sticky top-0 z-30" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZawaajLogo size={40} tagline={false} />
            <div>
              <div className="text-white text-sm font-semibold leading-tight">Admin Dashboard</div>
              <div className="text-white/30 text-xs leading-tight">Zawaaj – The Blessed Choice</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/browse" className="text-white/40 hover:text-white/80 text-xs transition-colors">
              Browse
            </Link>
            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="text-white/40 hover:text-white/80 text-xs transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">Manage applications, matches and members.</p>
        </div>

        {/* Stats Row — each card navigates to the relevant tab */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {([
            { label: 'Pending review',  value: pendingCount,    tab: 'queue'      as Tab, accent: '#F59E0B' },
            { label: 'Approved',        value: approvedCount,   tab: 'members'    as Tab, accent: '#4ADE80' },
            { label: 'Awaiting admin',  value: mutualCount,     tab: 'mutual'     as Tab, accent: '#A78BFA' },
            { label: 'Introduced',      value: introducedCount, tab: 'introduced' as Tab, accent: '#60A5FA' },
            { label: 'Withdrawn',       value: withdrawnCount,  tab: 'withdrawn'  as Tab, accent: '#6B7280' },
            { label: 'Total members',   value: totalProfiles,   tab: 'members'    as Tab, accent: '#B8960C' },
          ] as const).map(stat => (
            <button
              key={stat.label}
              onClick={() => setTab(stat.tab)}
              className="bg-[#1E1E1E] rounded-2xl p-4 text-left hover:bg-[#252525] transition-colors w-full"
              style={{ border: `1px solid rgba(255,255,255,0.08)`, borderLeft: `3px solid ${stat.accent}` }}
            >
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-1 mb-6 bg-[#1E1E1E] rounded-2xl p-1.5 border border-white/10 w-fit">
          {tabs.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === key ? '#1A1A1A' : 'transparent',
                color: tab === key ? '#B8960C' : 'rgba(255,255,255,0.5)',
              }}
            >
              {label}
              {badge !== undefined && badge > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: tab === key ? '#B8960C' : '#E8E4DC',
                    color: tab === key ? '#1A1A1A' : '#1A1A1A',
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-white/40 text-sm">
            Loading…
          </div>
        ) : (
          <>
            {tab === 'queue'      && <QueueTab      profiles={profiles} onRefresh={loadData} currentUserId={currentUserId} />}
            {tab === 'mutual'     && <MutualTab     matches={matches}   onRefresh={loadData} profiles={profiles} />}
            {tab === 'introduced' && <IntroducedTab  matches={matches}   onRefresh={loadData} />}
            {tab === 'members'    && <MembersTab     profiles={profiles} onRefresh={loadData} currentUserId={currentUserId} />}
            {tab === 'withdrawn'  && <WithdrawnTab   profiles={profiles} onRefresh={loadData} />}
            {tab === 'events'     && <EventsTab      events={events}     onRefresh={loadData} />}
            {tab === 'import'     && <ImportTab />}
          </>
        )}
      </main>

      {/* Global field styles — scoped via inline style tag */}
      <style>{`
        .field {
          width: 100%;
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: #141414;
          color: rgba(255,255,255,0.9);
          outline: none;
          transition: border-color 0.15s;
        }
        .field:focus {
          border-color: #B8960C;
        }
        .field option {
          background: #1E1E1E;
          color: rgba(255,255,255,0.9);
        }
      `}</style>
    </div>
  )
}
