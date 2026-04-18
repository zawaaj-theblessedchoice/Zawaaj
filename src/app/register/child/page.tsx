'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'
import { createClient } from '@/lib/supabase/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHOOL_OPTIONS   = ['Hanafi', "Shafi'i", 'Maliki', 'Hanbali', 'General Sunni', 'No preference']
const RELIGIOSITY_OPTIONS = [
  { value: 'steadfast',   label: 'Steadfast',   helper: 'Consistently fulfilling religious obligations with structure and commitment' },
  { value: 'practising',  label: 'Practising',  helper: 'Regularly practising and actively working to maintain and improve' },
  { value: 'striving',    label: 'Striving',    helper: 'On a sincere journey of growth — actively working to strengthen practice' },
]

const QURAN_OPTIONS = [
  { value: 'building_connection',      label: 'Building my connection',     helper: 'I read or listen occasionally' },
  { value: 'growing_regularly',        label: 'Growing regularly',          helper: 'I engage regularly and am improving my reading' },
  { value: 'consistent_understanding', label: 'Consistent and learning',    helper: 'I read consistently and am deepening my understanding' },
  { value: 'deeply_engaged',           label: 'Deeply engaged',             helper: "The Qur'an is central to my daily life" },
]
const PRAYER_OPTIONS = [
  { value: 'yes_regularly',   label: 'Yes, regularly' },
  { value: 'most_of_time',    label: 'Most of the time' },
  { value: 'working_on_it',   label: 'Working on it' },
  { value: 'not_currently',   label: 'Not currently' },
]
const EDUCATION_OPTIONS = [
  'No formal qualifications', 'GCSEs / O-Levels', 'A-Levels', 'Diploma / HND',
  "Bachelor's degree", "Master's degree", 'PhD / Doctorate', 'Other',
]
const MARITAL_OPTIONS = [
  { value: 'never_married', label: 'Single (never married)' },
  { value: 'divorced',      label: 'Divorced' },
  { value: 'widowed',       label: 'Widowed' },
]
const RELOCATION_OPTIONS = [
  { value: 'yes_open',      label: 'Yes, open to relocation' },
  { value: 'within_uk',     label: 'Within the UK' },
  { value: 'prefer_local',  label: 'Prefer to stay local' },
  { value: 'not_open',      label: 'Not open to relocation' },
]
const PARTNER_CHILDREN_OPTIONS = [
  { value: 'yes',             label: 'Yes, open to this' },
  { value: 'no_preference',   label: 'No preference' },
  { value: 'prefer_not',      label: 'Would prefer not' },
]
const ETHNICITY_OPTIONS = [
  'British Pakistani', 'British Bangladeshi', 'British Indian', 'British Arab',
  'Pakistani', 'Bangladeshi', 'Indian', 'Arab', 'Somali', 'Turkish', 'Iranian',
  'West African', 'East African', 'Malaysian', 'Indonesian', 'White British',
  'White European', 'Mixed heritage', 'Other',
]
const GUARDIAN_RELATIONSHIP_OPTIONS = [
  // Female — preferred
  { value: 'mother',                label: 'Mother' },
  { value: 'grandmother',           label: 'Grandmother' },
  { value: 'aunt',                  label: 'Aunt' },
  { value: 'sister',                label: 'Sister (aged 18+)' },
  { value: 'female_guardian',       label: 'Other female guardian' },
  { value: 'other_female_relative', label: 'Other female relative' },
  // Male — fallback (admin-flagged)
  { value: 'father',                label: 'Father' },
  { value: 'brother',               label: 'Brother (aged 18+)' },
  { value: 'uncle',                 label: 'Uncle' },
  { value: 'male_guardian',         label: 'Other male guardian' },
]

// When a male relationship is selected, the system automatically flags the account
const MALE_GUARDIAN_RELATIONSHIPS = new Set([
  'father', 'brother', 'uncle', 'male_guardian',
])

const STEP_TITLES = [
  'Create your account',
  "Candidate's personal details",
  'Faith & practice',
  'Preferences',
  "Guardian's contact details",
  'Terms & confirmation',
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? 'var(--gold)' : 'var(--border-default)',
            transition: 'all 0.2s',
          }}
        />
      ))}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '0.5px solid var(--border-default)',
  background: 'var(--surface-3)',
  color: 'var(--text-primary)',
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 5,
  display: 'block',
}

function Field({ label, required, hint, error, fieldId, children }: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  fieldId?: string
  children: React.ReactNode
}) {
  return (
    <div id={fieldId}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: 'var(--gold)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--status-error, #f87171)', margin: '4px 0 0', lineHeight: 1.4 }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        borderBottom: '0.5px solid var(--border-default)',
        paddingBottom: 6,
        marginBottom: 4,
        marginTop: 8,
      }}
    >
      {label}
    </div>
  )
}

// ─── Form data ────────────────────────────────────────────────────────────────

interface FormData {
  // Step 0
  email:              string
  password:           string
  confirmPassword:    string
  // Step 1 — Personal
  firstName:          string
  lastName:           string
  dateOfBirth:        string
  gender:             'male' | 'female' | ''
  height:             string
  heightUnit:         'cm' | 'ftin'
  heightCm:           string
  heightFt:           string
  heightIn:           string
  location:           string
  ethnicity:          string
  nationality:        string
  languagesSpoken:    string
  placeOfBirth:       string
  // Step 2 — Faith
  schoolOfThought:    string
  religiosity:        string
  prayerRegularity:   string
  wearsHijab:         string   // 'yes' | 'no' | 'sometimes' | ''
  wearsNiqab:         string   // 'yes' | 'no' | 'sometimes' | ''
  wearsAbaya:         string   // 'yes' | 'no' | 'sometimes' | ''
  keepsBeard:         string   // 'yes' | 'no' | ''
  quranEngagementLevel: string
  islamicBackground:  string   // 'born_muslim' | 'reverted' | ''
  smoker:             string   // 'yes' | 'no' | ''
  educationLevel:     string
  educationDetail:    string
  professionDetail:   string
  bio:                string
  // Step 3 — Preferences
  prefAgeMin:         string
  prefAgeMax:         string
  prefLocation:       string
  prefEthnicity:      string
  prefSchoolOfThought: string
  openToRelocation:   string
  openToPartnersChildren: string
  maritalStatus:      string
  hasChildren:        string   // 'yes' | 'no' | ''
  // Step 4 — Guardian
  guardianFullName:   string
  guardianRelationship: string
  guardianNumber:     string
  guardianEmail:      string
  noFemaleContactFlag: boolean
  fatherExplanation:  string
  // Step 5 — Terms
  termsAgreed:        boolean
  detailsAccurate:    boolean
  guardianConsents:   boolean
}

const EMPTY: FormData = {
  email: '', password: '', confirmPassword: '',
  firstName: '', lastName: '', dateOfBirth: '', gender: '', height: '',
  heightUnit: 'cm', heightCm: '', heightFt: '', heightIn: '',
  location: '', ethnicity: '', nationality: '', languagesSpoken: '', placeOfBirth: '',
  schoolOfThought: '', religiosity: '', prayerRegularity: '', wearsHijab: '',
  wearsNiqab: '', wearsAbaya: '', quranEngagementLevel: '', islamicBackground: '', smoker: '',
  keepsBeard: '', educationLevel: '', educationDetail: '', professionDetail: '', bio: '',
  prefAgeMin: '', prefAgeMax: '', prefLocation: '', prefEthnicity: '',
  prefSchoolOfThought: '', openToRelocation: '', openToPartnersChildren: '',
  maritalStatus: '', hasChildren: '',
  guardianFullName: '', guardianRelationship: '', guardianNumber: '', guardianEmail: '',
  noFemaleContactFlag: false, fatherExplanation: '',
  termsAgreed: false, detailsAccurate: false, guardianConsents: false,
}

const TOTAL_STEPS = 6  // 0–5

// ─── Main ─────────────────────────────────────────────────────────────────────

function RegisterChildPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [familyAccountId, setFamilyAccountId] = useState<string>('')
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  // ── Auth escape hatch — detect logged-in users who are stuck ─────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  // ── Invite token state ────────────────────────────────────────────────────
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'expired' | 'used'>('idle')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return
    setTokenStatus('loading')
    fetch(`/api/register/validate-invite-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((data: {
        ok?: boolean; error?: string
        familyAccountId?: string; invitedEmail?: string; invitedName?: string
        family?: {
          contactFullName: string; contactRelationship: string; contactNumber: string
          contactEmail: string; femaleContactName?: string | null; femaleContactNumber?: string | null
          noFemaleContactFlag?: boolean; fatherExplanation?: string | null
        }
      }) => {
        if (!data.ok) {
          setTokenStatus(
            data.error === 'expired' ? 'expired'
            : data.error === 'already_used' ? 'used'
            : 'invalid'
          )
          return
        }
        setInviteToken(token)
        setTokenStatus('valid')
        // Pre-fill guardian fields from the existing family account
        if (data.family) {
          setForm(f => ({
            ...f,
            guardianFullName:     data.family!.contactFullName,
            guardianRelationship: data.family!.contactRelationship,
            guardianNumber:       data.family!.contactNumber,
            guardianEmail:        data.family!.contactEmail,
            noFemaleContactFlag:  data.family!.noFemaleContactFlag ?? false,
            fatherExplanation:    data.family!.fatherExplanation ?? '',
          }))
        }
        // Pre-fill email if provided in the token
        if (data.invitedEmail) {
          setForm(f => ({ ...f, email: data.invitedEmail! }))
        }
      })
      .catch(() => setTokenStatus('invalid'))
  }, [searchParams])

  // Restore saved progress from sessionStorage on first mount (after token check settled)
  useEffect(() => {
    // Only restore if there's no invite token pre-filling form data
    try {
      const saved = sessionStorage.getItem('zawaaj-register-child')
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormData> & { _step?: number }
        const { password: _p, confirmPassword: _c, _step: savedStep, ...safe } = parsed
        setForm(prev => ({ ...prev, ...safe }))
        // Restore step so a refresh puts the user back where they were
        if (typeof savedStep === 'number' && savedStep > 0) {
          setStep(savedStep)
        }
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist progress (excluding passwords) + current step on every change
  useEffect(() => {
    try {
      const { password: _p, confirmPassword: _c, ...safe } = form
      sessionStorage.setItem('zawaaj-register-child', JSON.stringify({ ...safe, _step: step }))
    } catch { /* ignore */ }
  }, [form, step])

  // When using an invite token, step 4 (guardian details) is skipped
  // because the family account already has those details.
  const EFFECTIVE_TOTAL = inviteToken ? TOTAL_STEPS - 1 : TOTAL_STEPS
  // Map display step to data step (skip step 4 when using token)
  function dataStep(displayStep: number): number {
    if (!inviteToken || displayStep < 4) return displayStep
    return displayStep + 1  // skip guardian step
  }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Never-married implies no children — clear the field so it's not asked/sent.
      if (key === 'maritalStatus' && value === 'never_married') {
        next.hasChildren = ''
      }
      // Auto-flag male guardian — no manual checkbox needed.
      if (key === 'guardianRelationship') {
        next.noFemaleContactFlag = MALE_GUARDIAN_RELATIONSHIPS.has(value as string)
      }
      return next
    })
    setError(null)
  }

  function clearFieldError(fieldKey: string) {
    setFieldErrors(prev => {
      if (!prev[fieldKey]) return prev
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }

  function getHeightCmValue(): string {
    if (form.heightUnit === 'cm') return form.heightCm
    const ft = parseFloat(form.heightFt) || 0
    const inches = parseFloat(form.heightIn) || 0
    const totalCm = Math.round((ft * 30.48) + (inches * 2.54))
    return totalCm > 0 ? String(totalCm) : ''
  }

  function validateStep(): string | null {
    const ds = dataStep(step)
    if (ds === 0) {
      if (!form.email.trim())               return 'Email is required.'
      if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.'
      if (!form.password)                   return 'Password is required.'
      if (form.password.length < 8)         return 'Password must be at least 8 characters.'
      if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    }
    if (ds === 1) {
      if (!form.firstName.trim())       return 'First name is required.'
      if (!form.lastName.trim())        return 'Last name is required.'
      if (!form.dateOfBirth)            return 'Date of birth is required.'
      if (!form.gender)                 return 'Gender is required.'
      if (!form.location.trim())        return 'City / location is required.'
      if (!form.ethnicity)              return 'Ethnicity is required.'
      if (!form.nationality.trim())     return 'Nationality is required.'
      if (!form.languagesSpoken.trim()) return 'Languages spoken is required.'
      if (!form.maritalStatus)          return 'Marital status is required.'
      if (form.maritalStatus !== 'never_married' && !form.hasChildren)
        return 'Please indicate whether you currently have children.'
    }
    if (ds === 2) {
      if (!form.educationLevel)              return 'Education level is required.'
      if (!form.educationDetail.trim())      return 'Field of study / detail is required.'
      if (!form.professionDetail.trim())     return 'Profession / occupation is required.'
      if (!form.schoolOfThought)             return 'School of thought is required.'
      if (!form.religiosity)                 return 'Religiosity level is required.'
      if (!form.prayerRegularity)            return 'Prayer regularity is required.'
      if (form.gender === 'female') {
        if (!form.wearsHijab)                return 'Please indicate your hijab practice.'
        if (!form.wearsNiqab)                return 'Please indicate your niqab practice.'
        if (!form.wearsAbaya)                return 'Please indicate your abaya practice.'
      }
      if (form.gender === 'male' && !form.keepsBeard) return 'Please indicate your beard practice.'
      if (!form.quranEngagementLevel)        return "Please select your Qur'an engagement level."
      if (!form.bio.trim())                  return 'About / bio is required.'
    }
    if (ds === 3) {
      if (!form.prefAgeMin)                  return 'Minimum preferred age is required.'
      if (!form.prefAgeMax)                  return 'Maximum preferred age is required.'
      if (!form.prefLocation.trim())         return 'Preferred location is required.'
      if (!form.openToRelocation)            return 'Please indicate whether you are open to relocation.'
      if (!form.openToPartnersChildren)      return "Please indicate whether you are open to a partner's children."
    }
    if (ds === 4) {
      const step4Errs: Record<string, string> = {}
      if (!form.guardianFullName.trim())
        step4Errs.contact_full_name = 'Please enter the full name of the primary contact'
      if (!form.guardianRelationship)
        step4Errs.contact_relationship = 'Please select a relationship'
      if (!form.guardianNumber.trim())
        step4Errs.contact_number = 'Please enter a contact number'
      if (!form.guardianEmail.trim() || !/\S+@\S+\.\S+/.test(form.guardianEmail))
        step4Errs.contact_email = 'Please enter a valid email address'
      if (form.noFemaleContactFlag && !form.fatherExplanation.trim())
        step4Errs.father_explanation = 'Please explain why no female contact is available'
      if (Object.keys(step4Errs).length > 0) {
        setFieldErrors(step4Errs)
        const firstKey = Object.keys(step4Errs)[0]
        const el = document.getElementById(`field-${firstKey}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return 'Please complete all required fields.'
      }
    }
    if (ds === 5) {
      if (!form.termsAgreed)     return 'You must agree to the Terms of Use.'
      if (!form.detailsAccurate) return 'Please confirm that all details are accurate.'
      if (!form.guardianConsents) return "Please confirm your guardian's consent."
    }
    return null
  }

  function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  // Step titles adjusted for token flow (drop the guardian step label)
  const displayStepTitles = inviteToken
    ? STEP_TITLES.filter((_, i) => i !== 4)
    : STEP_TITLES

  async function handleSubmit() {
    const err = validateStep()
    if (err) { setError(err); return }
    setSubmitting(true)
    setError(null)

    const wearsHijabBool = form.gender === 'female'
      ? (form.wearsHijab === 'yes' ? true : form.wearsHijab === 'no' ? false : null)
      : null
    const keepsBeardBool = form.gender === 'male'
      ? (form.keepsBeard === 'yes' ? true : form.keepsBeard === 'no' ? false : null)
      : null
    // Never married → no children implicitly; otherwise use the form selection.
    const hasChildrenBool = form.maritalStatus === 'never_married'
      ? false
      : form.hasChildren === 'yes' ? true
      : form.hasChildren === 'no' ? false : null
    const languages = form.languagesSpoken.trim()
      ? form.languagesSpoken.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const heightCmValue = getHeightCmValue()

    const res = await fetch('/api/register/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path:                    'child',
        email:                   form.email,
        password:                form.password,
        // When using an invite token, guardian fields come from the existing
        // family account (pre-filled and not editable by the user)
        ...(inviteToken ? { invite_token: inviteToken } : {
          contactFullName:       form.guardianFullName,
          contactRelationship:   form.guardianRelationship,
          contactNumber:         form.guardianNumber,
          contactEmail:          form.guardianEmail || form.email,
          noFemaleContactFlag:   form.noFemaleContactFlag,
          fatherExplanation:     form.fatherExplanation || undefined,
        }),
        termsAgreed:             true,
        profile: {
          firstName:             form.firstName,
          lastName:              form.lastName,
          dateOfBirth:           form.dateOfBirth,
          gender:                form.gender,
          height:                heightCmValue || undefined,
          location:              form.location,
          ethnicity:             form.ethnicity || undefined,
          nationality:           form.nationality || undefined,
          languagesSpoken:       languages.length > 0 ? languages : undefined,
          educationLevel:        form.educationLevel  || undefined,
          educationDetail:       form.educationDetail || undefined,
          professionDetail:      form.professionDetail || undefined,
          schoolOfThought:       form.schoolOfThought,
          religiosity:           form.religiosity     || undefined,
          prayerRegularity:      form.prayerRegularity || undefined,
          wearsHijab:            wearsHijabBool,
          wearsNiqab:            form.gender === 'female' ? (form.wearsNiqab || undefined) : undefined,
          wearsAbaya:            form.gender === 'female' ? (form.wearsAbaya || undefined) : undefined,
          quranEngagementLevel:  form.quranEngagementLevel || undefined,
          keepsBeard:            keepsBeardBool,
          bio:                   form.bio || undefined,
          prefAgeMin:            form.prefAgeMin ? parseInt(form.prefAgeMin, 10) : undefined,
          prefAgeMax:            form.prefAgeMax ? parseInt(form.prefAgeMax, 10) : undefined,
          prefLocation:          form.prefLocation    || undefined,
          prefEthnicity:         form.prefEthnicity   || undefined,
          prefSchoolOfThought:   form.prefSchoolOfThought || undefined,
          openToRelocation:      form.openToRelocation || undefined,
          openToPartnersChildren: form.openToPartnersChildren || undefined,
          maritalStatus:         form.maritalStatus   || undefined,
          hasChildren:           hasChildrenBool,
          islamicBackground:     form.islamicBackground || undefined,
          placeOfBirth:          form.placeOfBirth.trim() || undefined,
          smoker:                form.smoker === 'yes' ? true : form.smoker === 'no' ? false : undefined,
        },
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (json.error === 'validation_error' && json.errors) {
        setFieldErrors(json.errors as Record<string, string>)
        const firstKey = Object.keys(json.errors)[0]
        const el = document.getElementById(`field-${firstKey}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          // Error field is on a previous step — navigate back so it becomes visible
          const guardianStep = inviteToken ? 3 : 4
          setStep(guardianStep)
          setError('Some details need to be corrected. Please review the highlighted fields.')
        }
      } else {
        setError(
          json.error === 'email_exists'
            ? 'An account with this email already exists. Try signing in instead.'
            : json.message ?? json.error ?? 'Something went wrong. Please try again.'
        )
      }
      setSubmitting(false)
      return
    }

    // Clear saved progress now that registration succeeded
    try { sessionStorage.removeItem('zawaaj-register-child') } catch { /* ignore */ }
    setVerificationEmail(json.contactEmail ?? form.guardianEmail ?? form.email)
    setFamilyAccountId(json.familyAccountId ?? '')
    setSubmitting(false)
  }

  async function handleResend() {
    if (resending || !familyAccountId) return
    setResending(true)
    setResendDone(false)
    try {
      await fetch('/api/register/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyAccountId }),
      })
      setResendDone(true)
    } finally {
      setResending(false)
    }
  }

  // ── Invite token loading screen ──────────────────────────────────────────────
  if (tokenStatus === 'loading') {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Validating your invite link…</p>
      </main>
    )
  }

  // ── Invite token error screens ───────────────────────────────────────────────
  if (tokenStatus === 'expired' || tokenStatus === 'invalid' || tokenStatus === 'used') {
    const msg =
      tokenStatus === 'expired' ? 'This invitation link has expired. Please contact the Zawaaj team for a new one.' :
      tokenStatus === 'used'    ? 'This invitation link has already been used. If you already registered, please sign in.' :
                                  'This invitation link is not valid. Please check the link or contact the Zawaaj team.'
    return (
      <main style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface-2)', border: '0.5px solid var(--status-error-br)', borderRadius: 12, padding: '40px 36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <ZawaajLogo size={56} tagline={false} />
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Invalid invitation</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{msg}</p>
          <a href="/login" style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}>Sign in →</a>
        </div>
      </main>
    )
  }

  // ── Email verification holding screen ────────────────────────────────────────
  if (verificationEmail) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 440, background: 'var(--surface-2)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '40px 36px', textAlign: 'center' }}>
          <ZawaajLogo size={56} tagline={false} />
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 0' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--gold)" strokeWidth="1.5"/><path d="M2 7l10 7 10-7" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 8px' }}>Check your inbox</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 6px' }}>We&rsquo;ve sent a verification link to</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>{verificationEmail}</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>Click the link in the email to continue setting up your Zawaaj account.</p>
          {resendDone
            ? <p style={{ fontSize: 13, color: 'var(--gold)' }}>Verification email resent.</p>
            : <button onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: resending ? 'not-allowed' : 'pointer', textDecoration: 'underline', opacity: resending ? 0.6 : 1 }}>
                {resending ? 'Sending…' : 'Didn\'t receive it? Resend email'}
              </button>
          }
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to website
          </Link>
        </div>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-gold)',
          borderRadius: 12,
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <ZawaajLogo height={220} />
          <StepDots total={EFFECTIVE_TOTAL} current={step} />
          {inviteToken && (
            <span style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)', padding: '3px 10px', borderRadius: 999, letterSpacing: '0.06em' }}>
              Invited registration
            </span>
          )}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {displayStepTitles[step]}
            </h2>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>
              Step {step + 1} of {EFFECTIVE_TOTAL}
            </p>
          </div>
        </div>

        {/* ── Step 0: Account ───────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--gold)', fontWeight: 600 }}>You are creating a family account.</strong> This account is managed by a parent or guardian (preferably the mother) on behalf of the candidate. Your login credentials are for the guardian, not the candidate.
            </div>
            <Field label="Email address" required>
              <input type="email" placeholder="your@email.com" value={form.email}
                onChange={e => set('email', e.target.value)} style={inputStyle} autoComplete="email" />
            </Field>
            <Field label="Password" required>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={form.password}
                  autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onChange={e => set('password', e.target.value)}
                  onInput={e => set('password', (e.target as HTMLInputElement).value)}
                />
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setShowPassword(p => !p) }}
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, background: 'none', border: 'none', cursor: 'pointer', color: showPassword ? 'var(--gold)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </Field>
            <Field label="Confirm password" required>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onChange={e => set('confirmPassword', e.target.value)}
                  onInput={e => set('confirmPassword', (e.target as HTMLInputElement).value)}
                />
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setShowConfirmPassword(p => !p) }}
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, background: 'none', border: 'none', cursor: 'pointer', color: showConfirmPassword ? 'var(--gold)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 1: Personal details ──────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              These are the candidate&apos;s personal details — the information that forms their profile. Only initials are shown publicly; full names are never shared with other families. Fields marked * are required.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First name" required>
                <input type="text" value={form.firstName}
                  onChange={e => set('firstName', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Last name" required hint="Your name is kept private — only initials are shown to other members.">
                <input type="text" value={form.lastName}
                  onChange={e => set('lastName', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date of birth" required>
                <input type="date" value={form.dateOfBirth}
                  onChange={e => set('dateOfBirth', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Gender" required>
                <select value={form.gender} onChange={e => set('gender', e.target.value as 'male' | 'female' | '')}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Height</label>
                {/* Unit toggle */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border-default)', width: 'fit-content' }}>
                  {(['cm', 'ftin'] as const).map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => set('heightUnit', unit)}
                      style={{
                        padding: '5px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
                        background: form.heightUnit === unit ? 'var(--gold)' : 'var(--surface-3)',
                        color: form.heightUnit === unit ? '#111' : 'var(--text-primary)',
                        fontWeight: form.heightUnit === unit ? 600 : 400,
                      }}
                    >
                      {unit === 'cm' ? 'cm' : 'ft & in'}
                    </button>
                  ))}
                </div>
                {form.heightUnit === 'cm' ? (
                  <input
                    type="number"
                    placeholder="e.g. 170"
                    value={form.heightCm}
                    onChange={e => set('heightCm', e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" placeholder="ft" value={form.heightFt}
                      onChange={e => set('heightFt', e.target.value)}
                      style={{ ...inputStyle, width: 70, boxSizing: 'border-box' }} />
                    <input type="number" placeholder="in" value={form.heightIn}
                      onChange={e => set('heightIn', e.target.value)}
                      style={{ ...inputStyle, width: 70, boxSizing: 'border-box' }} min={0} max={11} />
                  </div>
                )}
              </div>
              <Field label="City / location" required>
                <input type="text" placeholder="e.g. London" value={form.location}
                  onChange={e => set('location', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Ethnicity" required>
                <select value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {ETHNICITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Nationality" required>
                <input type="text" placeholder="e.g. British" value={form.nationality}
                  onChange={e => set('nationality', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label="Place of birth" hint="Town/city and country where you were born">
              <input type="text" placeholder="e.g. Lahore, Pakistan" value={form.placeOfBirth}
                onChange={e => set('placeOfBirth', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Languages spoken" required hint="Comma-separated, e.g. English, Urdu, Arabic">
              <input type="text" placeholder="e.g. English, Urdu" value={form.languagesSpoken}
                onChange={e => set('languagesSpoken', e.target.value)} style={inputStyle} />
            </Field>
            <SectionLabel label="Status" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: form.maritalStatus === 'never_married' ? '1fr' : '1fr 1fr',
              gap: 12,
            }}>
              <Field label="Marital status" required>
                <select value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {MARITAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              {form.maritalStatus !== 'never_married' && (
                <Field label="Currently has children" required>
                  <select value={form.hasChildren} onChange={e => set('hasChildren', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select…</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </Field>
              )}
            </div>
            <SectionLabel label="Lifestyle" />
            <Field label="Smoker">
              <select value={form.smoker} onChange={e => set('smoker', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select…</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
          </div>
        )}

        {/* ── Step 2: Faith & education ─────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionLabel label="Islamic background" />
            <Field label="Background">
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: 'born_muslim', label: 'Born Muslim' },
                  { value: 'reverted',    label: 'Reverted to Islam' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('islamicBackground', form.islamicBackground === opt.value ? '' : opt.value)}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: `0.5px solid ${form.islamicBackground === opt.value ? 'var(--gold)' : 'var(--border-default)'}`,
                      background: form.islamicBackground === opt.value ? 'var(--gold-muted)' : 'var(--surface-3)',
                      color: form.islamicBackground === opt.value ? 'var(--gold)' : 'var(--text-secondary)',
                      fontWeight: form.islamicBackground === opt.value ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <SectionLabel label="Education & career" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Highest education level" required>
                <select value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Field of study / detail" required>
                <input type="text" placeholder="e.g. Computer Science" value={form.educationDetail}
                  onChange={e => set('educationDetail', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label="Profession / occupation" required>
              <input type="text" placeholder="e.g. Software Engineer" value={form.professionDetail}
                onChange={e => set('professionDetail', e.target.value)} style={inputStyle} />
            </Field>

            <SectionLabel label="Faith & practice" />
            <Field label="School of thought" required>
              <select value={form.schoolOfThought} onChange={e => set('schoolOfThought', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select…</option>
                {SCHOOL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Religiosity level<span style={{ color: 'var(--gold)', marginLeft: 2 }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {RELIGIOSITY_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('religiosity', o.value)}
                      style={{
                        padding: '8px 10px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                        border: `0.5px solid ${form.religiosity === o.value ? 'var(--gold)' : 'var(--border-default)'}`,
                        background: form.religiosity === o.value ? 'var(--gold-muted)' : 'var(--surface-3)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: form.religiosity === o.value ? 600 : 400 }}>{o.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{o.helper}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Prays five times daily" required>
                <select value={form.prayerRegularity} onChange={e => set('prayerRegularity', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {PRAYER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            {form.gender === 'female' && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, marginTop: 4 }}>Modesty practice<span style={{ color: 'var(--gold)', marginLeft: 2 }}>*</span></h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>This information is only shown to potential matches</p>

                {/* Hijab */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>Hijab</label>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 0, marginBottom: 8, lineHeight: 1.4 }}>Headscarf covering the hair</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{val: 'yes', label: 'Yes'}, {val: 'no', label: 'No'}].map(opt => (
                      <button key={opt.val} type="button"
                        onClick={() => set('wearsHijab', opt.val)}
                        style={{ padding: '6px 16px', borderRadius: 8, border: `0.5px solid ${form.wearsHijab === opt.val ? 'var(--gold)' : 'var(--border-default)'}`, background: form.wearsHijab === opt.val ? 'var(--gold-muted)' : 'var(--surface-3)', color: form.wearsHijab === opt.val ? 'var(--gold)' : 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Niqab */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>Niqab</label>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 0, marginBottom: 8, lineHeight: 1.4 }}>Face veil covering the face</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Yes', 'No', 'Sometimes'].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => set('wearsNiqab', opt.toLowerCase())}
                        style={{ padding: '6px 16px', borderRadius: 8, border: `0.5px solid ${form.wearsNiqab === opt.toLowerCase() ? 'var(--gold)' : 'var(--border-default)'}`, background: form.wearsNiqab === opt.toLowerCase() ? 'var(--gold-muted)' : 'var(--surface-3)', color: form.wearsNiqab === opt.toLowerCase() ? 'var(--gold)' : 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Abaya */}
                <div style={{ marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>Abaya</label>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 0, marginBottom: 8, lineHeight: 1.4 }}>Loose outer garment covering the body</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Yes', 'No', 'Sometimes'].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => set('wearsAbaya', opt.toLowerCase())}
                        style={{ padding: '6px 16px', borderRadius: 8, border: `0.5px solid ${form.wearsAbaya === opt.toLowerCase() ? 'var(--gold)' : 'var(--border-default)'}`, background: form.wearsAbaya === opt.toLowerCase() ? 'var(--gold-muted)' : 'var(--surface-3)', color: form.wearsAbaya === opt.toLowerCase() ? 'var(--gold)' : 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {form.gender === 'male' && (
              <Field label="Keeps beard" required>
                <select value={form.keepsBeard} onChange={e => set('keepsBeard', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
            )}
            <div>
              <label style={labelStyle}>Which best describes your current relationship with the Qur&apos;an?<span style={{ color: 'var(--gold)', marginLeft: 2 }}>*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {QURAN_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set('quranEngagementLevel', o.value)}
                    style={{
                      padding: '8px 10px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: `0.5px solid ${form.quranEngagementLevel === o.value ? 'var(--gold)' : 'var(--border-default)'}`,
                      background: form.quranEngagementLevel === o.value ? 'var(--gold-muted)' : 'var(--surface-3)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: form.quranEngagementLevel === o.value ? 600 : 400 }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{o.helper}</div>
                  </button>
                ))}
              </div>
            </div>
            <Field label="About — character, values, and what you are looking for" required
              hint="80–200 words. This is what other families will read about you.">
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                placeholder="Write a short description…" rows={5}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
          </div>
        )}

        {/* ── Step 3: Preferences ───────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              These preferences help us recommend suitable profiles. Fields marked * are required.
            </p>
            <SectionLabel label="Age preference" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Min age" required>
                <input type="number" placeholder="e.g. 22" value={form.prefAgeMin} min={18} max={80}
                  onChange={e => set('prefAgeMin', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Max age" required>
                <input type="number" placeholder="e.g. 35" value={form.prefAgeMax} min={18} max={80}
                  onChange={e => set('prefAgeMax', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <SectionLabel label="Location & background" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Preferred location" required>
                <input type="text" placeholder="e.g. London" value={form.prefLocation}
                  onChange={e => set('prefLocation', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Preferred ethnicity">
                <select value={form.prefEthnicity} onChange={e => set('prefEthnicity', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Open / no preference</option>
                  {ETHNICITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Preferred school of thought">
              <select value={form.prefSchoolOfThought} onChange={e => set('prefSchoolOfThought', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Open / no preference</option>
                {SCHOOL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <SectionLabel label="Lifestyle" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Open to relocation" required>
                <select value={form.openToRelocation} onChange={e => set('openToRelocation', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {RELOCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Open to partner's children" required>
                <select value={form.openToPartnersChildren} onChange={e => set('openToPartnersChildren', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {PARTNER_CHILDREN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 4: Guardian details (skipped when using invite token) ─── */}
        {step === 4 && !inviteToken && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--gold-muted)',
                border: '0.5px solid var(--border-gold)',
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              A guardian is required. The preferred guardian is the candidate&apos;s mother — if unavailable, please select the closest available female relative, or a male relative as a last resort.
              Guardian details are used by our team when connecting families and are never shared publicly.
            </div>
            <Field label="Guardian's full name" required fieldId="field-contact_full_name" error={fieldErrors.contact_full_name}>
              <input type="text" placeholder="e.g. Fatima Hussain" value={form.guardianFullName}
                onChange={e => { set('guardianFullName', e.target.value); clearFieldError('contact_full_name') }}
                style={{ ...inputStyle, borderColor: fieldErrors.contact_full_name ? 'var(--status-error, #f87171)' : undefined }} />
            </Field>
            <Field label="Guardian's relationship to candidate" required fieldId="field-contact_relationship" error={fieldErrors.contact_relationship}>
              <select value={form.guardianRelationship}
                onChange={e => { set('guardianRelationship', e.target.value); clearFieldError('contact_relationship') }}
                style={{ ...inputStyle, cursor: 'pointer', borderColor: fieldErrors.contact_relationship ? 'var(--status-error, #f87171)' : undefined }}>
                <option value="">Select…</option>
                {GUARDIAN_RELATIONSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            {form.noFemaleContactFlag && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--status-warning-bg)', border: '0.5px solid var(--status-warning-br)', fontSize: 12, color: 'var(--status-warning)', lineHeight: 1.5 }}>
                ⚠ A male guardian has been selected. Our team will be notified and will coordinate accordingly.
              </div>
            )}
            <Field label="Guardian's contact number (WhatsApp preferred)" required fieldId="field-contact_number" error={fieldErrors.contact_number}>
              <input type="tel" placeholder="e.g. 07700 900000" value={form.guardianNumber}
                onChange={e => { set('guardianNumber', e.target.value); clearFieldError('contact_number') }}
                style={{ ...inputStyle, borderColor: fieldErrors.contact_number ? 'var(--status-error, #f87171)' : undefined }} />
            </Field>
            <Field label="Guardian's email address" required fieldId="field-contact_email" error={fieldErrors.contact_email} hint="Your guardian will receive an invitation to link to your account.">
              <input type="email" placeholder="guardian@email.com" value={form.guardianEmail}
                onChange={e => { set('guardianEmail', e.target.value); clearFieldError('contact_email') }}
                style={{ ...inputStyle, borderColor: fieldErrors.contact_email ? 'var(--status-error, #f87171)' : undefined }} />
            </Field>
            {form.noFemaleContactFlag && (
              <Field label="Please briefly explain why no female contact is available" required fieldId="field-father_explanation" error={fieldErrors.father_explanation} hint="Seen by our team only — never shared with other families.">
                <textarea
                  placeholder="e.g. The candidate's mother is not available. Father is the family representative."
                  value={form.fatherExplanation}
                  onChange={e => { set('fatherExplanation', e.target.value); clearFieldError('father_explanation') }}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', borderColor: fieldErrors.father_explanation ? 'var(--status-error, #f87171)' : undefined }}
                />
              </Field>
            )}
          </div>
        )}

        {/* ── Step 5: Terms ─────────────────────────────────────────────── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Islamic oath */}
            <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: 'var(--gold)', fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.03em' }}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                In the name of Allah, the Most Gracious, the Most Merciful.<br />
                I affirm, with Allah (SWT) as my witness, that all information I have provided is truthful and accurate to the best of my knowledge, that my intentions are honourable, and that I seek to use this platform in good faith and in accordance with Islamic principles.
              </p>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Your profile will be submitted for review. Our team will be in touch insha&apos;Allah. Your profile will only be visible to other families once approved.
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.termsAgreed}
                onChange={e => set('termsAgreed', e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="/terms" target="_blank" style={{ color: 'var(--gold)' }}>Terms of Use and Privacy Policy</a>
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.detailsAccurate}
                onChange={e => set('detailsAccurate', e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I confirm all details provided are accurate and I make this declaration sincerely before Allah (SWT)
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.guardianConsents}
                onChange={e => set('guardianConsents', e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                My guardian consents to being contacted by the Zawaaj team when an introduction is being facilitated
              </span>
            </label>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--status-error-bg)',
              border: '0.5px solid var(--status-error-br)',
              fontSize: 13, color: 'var(--status-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => { setStep(s => s - 1); setError(null) }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8,
                border: '0.5px solid var(--border-default)',
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)', fontSize: 13.5, cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          {step < EFFECTIVE_TOTAL - 1 ? (
            <button onClick={handleNext}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: 'var(--gold)', color: 'var(--surface)',
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: submitting ? 'var(--surface-3)' : 'var(--gold)',
                color: submitting ? 'var(--text-muted)' : 'var(--surface)',
                fontSize: 13.5, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit my profile →'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          {isLoggedIn ? (
            <>
              Wrong account?{' '}
              <a href="/api/auth/signout" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign out</a>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <a href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign in</a>
            </>
          )}
        </p>
      </div>
      </div>
    </main>
  )
}

export default function RegisterChildPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--surface)' }} />}>
      <RegisterChildPageInner />
    </Suspense>
  )
}
