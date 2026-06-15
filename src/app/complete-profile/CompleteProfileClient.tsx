'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MANDATORY_FIELD_LABELS } from '@/lib/zawaaj/profileCompleteness'
import { SCHOOL_OF_THOUGHT_OPTIONS } from '@/lib/config/profileOptions'

interface Props {
  // profileId is intentionally not passed — the save route resolves the caller's
  // active profile server-side from the session (more secure; the client can't
  // target another profile).
  gender: string | null
  missing: string[]
}

// Field keys we collect here map to specific columns on save.
type FormState = {
  candidate_name: string
  gender: string
  city: string
  age: string
  height: string
  ethnicity: string
  education: string
  profession: string
  madhhab: string
  spouse_preferences: string
  consent: boolean
}

export default function CompleteProfileClient({ gender, missing }: Props) {
  const router = useRouter()
  const missingSet = new Set(missing)

  const [form, setForm] = useState<FormState>({
    candidate_name: '', gender: gender ?? '', city: '', age: '', height: '',
    ethnicity: '', education: '', profession: '', madhhab: '',
    spouse_preferences: '', consent: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Validate that every missing field now has a value.
  function firstUnfilled(): string | null {
    for (const k of missing) {
      if (k === 'consent') { if (!form.consent) return k; continue }
      if (k === 'candidate_name' && !form.candidate_name.trim()) return k
      if (k === 'gender' && !form.gender.trim()) return k
      if (k === 'city' && !form.city.trim()) return k
      if (k === 'age' && !form.age.trim()) return k
      if (k === 'height' && !form.height.trim()) return k
      if (k === 'ethnicity' && !form.ethnicity.trim()) return k
      if (k === 'education' && !form.education.trim()) return k
      if (k === 'profession' && !form.profession.trim()) return k
      if (k === 'madhhab' && !form.madhhab.trim()) return k
      if (k === 'spouse_preferences' && !form.spouse_preferences.trim()) return k
    }
    return null
  }

  async function handleSave() {
    const unfilled = firstUnfilled()
    if (unfilled) {
      setError(`Please complete: ${MANDATORY_FIELD_LABELS[unfilled] ?? unfilled}`)
      return
    }
    setSaving(true)
    setError(null)

    // Build update for ONLY the fields that were missing, mapped to columns.
    const update: Record<string, unknown> = {}
    if (missingSet.has('candidate_name')) {
      const parts = form.candidate_name.trim().split(/\s+/)
      update.first_name = parts[0] ?? null
      update.last_name = parts.slice(1).join(' ') || null
      update.display_initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (parts[0]?.[0]?.toUpperCase() ?? 'XX')
    }
    if (missingSet.has('gender')) update.gender = form.gender || null
    if (missingSet.has('city')) update.location = form.city || null
    if (missingSet.has('age')) update.age_display = form.age || null
    if (missingSet.has('height')) update.height = form.height || null
    if (missingSet.has('ethnicity')) update.ethnicity = form.ethnicity || null
    if (missingSet.has('education')) update.education_detail = form.education || null
    if (missingSet.has('profession')) update.profession_detail = form.profession || null
    if (missingSet.has('madhhab')) update.school_of_thought = form.madhhab || null
    if (missingSet.has('spouse_preferences')) {
      const parts = form.spouse_preferences.split(/[\n;]+/).map(s => s.trim()).filter(Boolean)
      update.spouse_preferences = parts.length > 0 ? parts : null
    }
    if (missingSet.has('consent')) update.consent_given = form.consent

    // Persist via the server route (service-role). A CLIENT-side update is
    // silently blocked by RLS for claimed imported profiles (user_id is null on
    // the candidate row → "auth.uid() = user_id" fails), which caused the
    // completion gate to loop forever. The route writes with supabaseAdmin after
    // verifying this is the caller's own active profile.
    let resp: { success?: boolean; complete?: boolean; missing?: string[]; error?: string }
    try {
      const res = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      resp = await res.json()
      if (!res.ok || !resp.success) {
        setError(resp.error ?? 'Could not save. Please try again.')
        setSaving(false)
        return
      }
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
      return
    }

    // Only release to browse when the server confirms the profile is now
    // complete — otherwise show exactly which field is still outstanding rather
    // than bouncing the user blindly.
    if (!resp.complete) {
      const stillMissing = (resp.missing ?? [])
        .map(k => MANDATORY_FIELD_LABELS[k] ?? k)
        .join(', ')
      setError(`Still missing: ${stillMissing || 'some required fields'}. Please contact support if this persists.`)
      setSaving(false)
      return
    }

    // Complete → release to browse.
    router.push('/browse')
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid var(--border-default)', background: 'var(--surface)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'var(--surface)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 20, padding: 36, marginTop: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Complete your profile
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
          A few details are needed before your profile can go live and you can browse, in shaa Allah.
          Please complete the fields below.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {missingSet.has('candidate_name') && (
            <div>
              <label style={labelStyle}>Candidate name</label>
              <input style={inputStyle} value={form.candidate_name} onChange={e => set('candidate_name', e.target.value)} placeholder="Full name" />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                Your candidate&rsquo;s name will not be shown publicly — only initials appear on profiles.
              </p>
            </div>
          )}

          {missingSet.has('gender') && (
            <div>
              <label style={labelStyle}>Gender</label>
              <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          )}

          {missingSet.has('city') && (
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. London" />
            </div>
          )}

          {missingSet.has('age') && (
            <div>
              <label style={labelStyle}>Age</label>
              <input style={inputStyle} type="number" min={18} max={80} value={form.age} onChange={e => set('age', e.target.value)} placeholder="e.g. 27" />
            </div>
          )}

          {missingSet.has('height') && (
            <div>
              <label style={labelStyle}>Height</label>
              <input style={inputStyle} value={form.height} onChange={e => set('height', e.target.value)} placeholder={`e.g. 5'8"`} />
            </div>
          )}

          {missingSet.has('ethnicity') && (
            <div>
              <label style={labelStyle}>Ethnicity</label>
              <input style={inputStyle} value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} placeholder="e.g. South Asian, Arab, Mixed" />
            </div>
          )}

          {missingSet.has('education') && (
            <div>
              <label style={labelStyle}>Education</label>
              <input style={inputStyle} value={form.education} onChange={e => set('education', e.target.value)} placeholder="e.g. BSc Pharmacy, University of Manchester" />
            </div>
          )}

          {missingSet.has('profession') && (
            <div>
              <label style={labelStyle}>Profession</label>
              <input style={inputStyle} value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="e.g. Pharmacist" />
            </div>
          )}

          {missingSet.has('madhhab') && (
            <div>
              <label style={labelStyle}>School of thought</label>
              <select style={inputStyle} value={form.madhhab} onChange={e => set('madhhab', e.target.value)}>
                <option value="">Select…</option>
                {SCHOOL_OF_THOUGHT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {missingSet.has('spouse_preferences') && (
            <div>
              <label style={labelStyle}>Spouse preferences</label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                value={form.spouse_preferences}
                onChange={e => set('spouse_preferences', e.target.value)}
                placeholder="What are you looking for in a spouse? (one per line for multiple)"
              />
            </div>
          )}

          {missingSet.has('consent') && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ marginTop: 3, accentColor: '#B8960C', width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I consent to the specified profile details being shared with potential matches through Zawaaj&rsquo;s facilitated introduction process.
              </span>
            </label>
          )}

          {error && (
            <p style={{ fontSize: 13, color: 'var(--status-error)', margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? 'rgba(184,150,12,0.5)' : '#B8960C', color: '#111',
              marginTop: 4,
            }}
          >
            {saving ? 'Saving…' : 'Complete and continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
