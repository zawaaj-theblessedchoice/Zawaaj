'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_RELATIONSHIP_OPTIONS = [
  { value: 'mother',          label: 'Mother' },
  { value: 'grandmother',     label: 'Grandmother' },
  { value: 'aunt',            label: 'Aunt' },
  { value: 'female_guardian', label: 'Female guardian' },
  { value: 'father',          label: 'Father' },
  { value: 'male_guardian',   label: 'Other male guardian' },
]

const FEMALE_RELATIONSHIP_OPTIONS = [
  { value: 'mother',            label: 'Mother' },
  { value: 'grandmother',       label: 'Grandmother' },
  { value: 'aunt',              label: 'Aunt' },
  { value: 'female_guardian',   label: 'Female guardian' },
  { value: 'sister',            label: 'Sister' },
  { value: 'other_female_relative', label: 'Other female relative' },
]

const MALE_RELATIONSHIPS = ['father', 'male_guardian']

// ─── Step indicator ───────────────────────────────────────────────────────────

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

// ─── Shared input style ───────────────────────────────────────────────────────

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

function Field({ label, required, error, fieldId, children }: {
  label: string
  required?: boolean
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
    </div>
  )
}

// ─── Form data type ───────────────────────────────────────────────────────────

interface FormData {
  // Step 0 — Account
  email:                   string
  password:                string
  confirmPassword:         string
  // Step 1 — Contact
  contactFullName:         string
  contactRelationship:     string
  contactNumber:           string
  contactEmail:            string
  // Step 2 — Female fallback (conditional)
  femaleContactName:       string
  femaleContactNumber:     string
  femaleContactRelationship: string
  fatherExplanation:       string
  noFemaleContactFlag:     boolean
  // Step 3 — Terms
  termsAgreed:             boolean
  detailsAccurate:         boolean
}

const EMPTY: FormData = {
  email: '', password: '', confirmPassword: '',
  contactFullName: '', contactRelationship: '', contactNumber: '', contactEmail: '',
  femaleContactName: '', femaleContactNumber: '', femaleContactRelationship: '',
  fatherExplanation: '', noFemaleContactFlag: false,
  termsAgreed: false, detailsAccurate: false,
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterParentPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isMale = MALE_RELATIONSHIPS.includes(form.contactRelationship)

  // Number of steps depends on whether male contact / female-flag screens show
  const totalSteps = isMale ? 4 : 3

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
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

  function validateStep(): boolean {
    const errs: Record<string, string> = {}

    if (step === 0) {
      if (!form.email.trim())               errs.email = 'Email is required.'
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address.'
      if (!form.password)                   errs.password = 'Password is required.'
      else if (form.password.length < 8)    errs.password = 'Password must be at least 8 characters.'
      if (form.password && form.password !== form.confirmPassword)
        errs.confirmPassword = 'Passwords do not match.'
    }

    if (step === 1) {
      if (!form.contactFullName.trim())
        errs.contact_full_name = 'Please enter the full name of the primary contact'
      if (!form.contactRelationship)
        errs.contact_relationship = 'Please select a relationship'
      if (!form.contactNumber.trim())
        errs.contact_number = 'Please enter a contact number'
      if (!form.contactEmail.trim() || !/\S+@\S+\.\S+/.test(form.contactEmail))
        errs.contact_email = 'Please enter a valid email address'
    }

    if (step === 2 && isMale) {
      if (!form.noFemaleContactFlag) {
        if (!form.femaleContactName.trim())
          errs.female_contact_name = 'Please enter the name of the female contact'
        if (!form.femaleContactNumber.trim())
          errs.female_contact_number = "Please enter the female contact's number"
        if (!form.femaleContactRelationship)
          errs.female_contact_relationship = 'Please select her relationship'
      }
      if (!form.fatherExplanation.trim())
        errs.father_explanation = 'Please explain why no female contact is available'
    }

    const termsStep = isMale ? 3 : 2
    if (step === termsStep) {
      if (!form.termsAgreed)     errs.termsAgreed = 'You must agree to the Terms of Use.'
      if (!form.detailsAccurate) errs.detailsAccurate = 'Please confirm that all details are accurate.'
    }

    setFieldErrors(errs)

    if (Object.keys(errs).length > 0) {
      // Scroll to the first field with an error
      const firstKey = Object.keys(errs)[0]
      const el = document.getElementById(`field-${firstKey}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  function handleNext() {
    if (!validateStep()) return
    setFieldErrors({})
    setError(null)
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    if (!validateStep()) return
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/register/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path:                    'parent',
        email:                   form.email,
        password:                form.password,
        contactFullName:         form.contactFullName,
        contactRelationship:     form.contactRelationship,
        contactNumber:           form.contactNumber,
        contactEmail:            form.contactEmail,
        femaleContactName:       form.femaleContactName || undefined,
        femaleContactNumber:     form.femaleContactNumber || undefined,
        femaleContactRelationship: form.femaleContactRelationship || undefined,
        fatherExplanation:       form.fatherExplanation || undefined,
        noFemaleContactFlag:     form.noFemaleContactFlag,
        termsAgreed:             true,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (json.error === 'validation_error' && json.errors) {
        setFieldErrors(json.errors as Record<string, string>)
        // Scroll to first error
        const firstKey = Object.keys(json.errors)[0]
        const el = document.getElementById(`field-${firstKey}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

    router.push('/register/pending?path=parent')
  }

  const termsStep = isMale ? 3 : 2

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
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderTop: '1px solid rgba(196,154,16,0.25)',
          borderRadius: 12,
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <ZawaajLogo size={52} tagline={false} />
          <StepDots total={totalSteps} current={step} />
        </div>

        {/* ── Step 0: Account ───────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 5px' }}>
                Create your account
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                You will use these credentials to log in and manage your family account.
              </p>
            </div>
            <Field label="Email address" required>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                style={inputStyle}
                autoComplete="email"
              />
            </Field>
            <Field label="Password" required>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: showPassword ? 'var(--gold)' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: showConfirmPassword ? 'var(--gold)' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center' }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 1: Contact details ───────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 5px' }}>
                Your contact details
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                These details will be used by our team when facilitating introductions. They are never shared with other families until a verified match is confirmed.
              </p>
            </div>
            <Field label="Your full name" required fieldId="field-contact_full_name" error={fieldErrors.contact_full_name}>
              <input
                type="text"
                placeholder="e.g. Fatima Ahmed"
                value={form.contactFullName}
                onChange={e => { set('contactFullName', e.target.value); clearFieldError('contact_full_name') }}
                style={{ ...inputStyle, borderColor: fieldErrors.contact_full_name ? 'var(--status-error, #f87171)' : undefined }}
                autoComplete="name"
              />
            </Field>
            <Field label="Your relationship to the candidate(s)" required fieldId="field-contact_relationship" error={fieldErrors.contact_relationship}>
              <select
                value={form.contactRelationship}
                onChange={e => { set('contactRelationship', e.target.value); clearFieldError('contact_relationship') }}
                style={{ ...inputStyle, cursor: 'pointer', borderColor: fieldErrors.contact_relationship ? 'var(--status-error, #f87171)' : undefined }}
              >
                <option value="">Select relationship…</option>
                {PRIMARY_RELATIONSHIP_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Your contact number (WhatsApp preferred)" required fieldId="field-contact_number" error={fieldErrors.contact_number}>
              <input
                type="tel"
                placeholder="e.g. 07700 900000"
                value={form.contactNumber}
                onChange={e => { set('contactNumber', e.target.value); clearFieldError('contact_number') }}
                style={{ ...inputStyle, borderColor: fieldErrors.contact_number ? 'var(--status-error, #f87171)' : undefined }}
                autoComplete="tel"
              />
            </Field>
            <Field label="Your email address" required fieldId="field-contact_email" error={fieldErrors.contact_email}>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.contactEmail}
                onChange={e => { set('contactEmail', e.target.value); clearFieldError('contact_email') }}
                style={{ ...inputStyle, borderColor: fieldErrors.contact_email ? 'var(--status-error, #f87171)' : undefined }}
                autoComplete="email"
              />
            </Field>
          </div>
        )}

        {/* ── Step 2: Female contact (male primary only) ────────────────── */}
        {step === 2 && isMale && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 5px' }}>
                Female contact
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                We require a female family member to act as the primary contact for all introductions. This keeps the process dignified and appropriate for all families.
              </p>
            </div>

            {!form.noFemaleContactFlag && (
              <>
                <Field label="Her full name" required fieldId="field-female_contact_name" error={fieldErrors.female_contact_name}>
                  <input
                    type="text"
                    placeholder="e.g. Aisha Ahmed"
                    value={form.femaleContactName}
                    onChange={e => { set('femaleContactName', e.target.value); clearFieldError('female_contact_name') }}
                    style={{ ...inputStyle, borderColor: fieldErrors.female_contact_name ? 'var(--status-error, #f87171)' : undefined }}
                  />
                </Field>
                <Field label="Her relationship to the candidate(s)" required fieldId="field-female_contact_relationship" error={fieldErrors.female_contact_relationship}>
                  <select
                    value={form.femaleContactRelationship}
                    onChange={e => { set('femaleContactRelationship', e.target.value); clearFieldError('female_contact_relationship') }}
                    style={{ ...inputStyle, cursor: 'pointer', borderColor: fieldErrors.female_contact_relationship ? 'var(--status-error, #f87171)' : undefined }}
                  >
                    <option value="">Select relationship…</option>
                    {FEMALE_RELATIONSHIP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Her contact number (WhatsApp preferred)" required fieldId="field-female_contact_number" error={fieldErrors.female_contact_number}>
                  <input
                    type="tel"
                    placeholder="e.g. 07700 900001"
                    value={form.femaleContactNumber}
                    onChange={e => { set('femaleContactNumber', e.target.value); clearFieldError('female_contact_number') }}
                    style={{ ...inputStyle, borderColor: fieldErrors.female_contact_number ? 'var(--status-error, #f87171)' : undefined }}
                  />
                </Field>
                <Field label="Please explain why the mother is not the primary contact" required fieldId="field-father_explanation" error={fieldErrors.father_explanation}>
                  <textarea
                    placeholder="This is seen by admin only and will never be shared with other families."
                    value={form.fatherExplanation}
                    onChange={e => { set('fatherExplanation', e.target.value); clearFieldError('father_explanation') }}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', borderColor: fieldErrors.father_explanation ? 'var(--status-error, #f87171)' : undefined }}
                  />
                </Field>
              </>
            )}

            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                cursor: 'pointer',
                padding: '12px 14px',
                borderRadius: 8,
                background: form.noFemaleContactFlag ? 'rgba(184,150,12,0.06)' : 'var(--surface-3)',
                border: `0.5px solid ${form.noFemaleContactFlag ? 'rgba(184,150,12,0.35)' : 'var(--border-default)'}`,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={form.noFemaleContactFlag}
                onChange={e => set('noFemaleContactFlag', e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I am unable to provide a female contact at this time.
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  A flag will be shown to other families indicating the primary contact is a male guardian.
                </span>
              </span>
            </label>

            {form.noFemaleContactFlag && (
              <Field label="Please explain" required fieldId="field-father_explanation" error={fieldErrors.father_explanation}>
                <textarea
                  placeholder="This is seen by admin only."
                  value={form.fatherExplanation}
                  onChange={e => { set('fatherExplanation', e.target.value); clearFieldError('father_explanation') }}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', borderColor: fieldErrors.father_explanation ? 'var(--status-error, #f87171)' : undefined }}
                />
              </Field>
            )}
          </div>
        )}

        {/* ── Terms step ────────────────────────────────────────────────── */}
        {step === termsStep && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 5px' }}>
                Terms & confirmation
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Please review and confirm before creating your family account.
              </p>
            </div>

            {/* Islamic oath */}
            <div style={{ padding: '14px 16px', borderRadius: 8, background: 'rgba(184,150,12,0.05)', border: '0.5px solid rgba(184,150,12,0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: 'var(--gold)', fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.03em' }}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                In the name of Allah, the Most Gracious, the Most Merciful.<br />
                I affirm, with Allah (SWT) as my witness, that all information I have provided is truthful and accurate to the best of my knowledge, that my intentions are honourable, and that I seek to use this platform in good faith and in accordance with Islamic principles.
              </p>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Your family account will be submitted for review. Our team will be in touch insha&apos;Allah. Once approved you can add profiles for your children.
            </div>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.termsAgreed}
                onChange={e => set('termsAgreed', e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="/terms" target="_blank" style={{ color: 'var(--gold)' }}>
                  Terms of Use and Privacy Policy
                </a>
              </span>
            </label>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.detailsAccurate}
                onChange={e => set('detailsAccurate', e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I confirm all details provided are accurate and I make this declaration sincerely before Allah (SWT)
              </span>
            </label>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(248,113,113,0.08)',
              border: '0.5px solid rgba(248,113,113,0.3)',
              fontSize: 13,
              color: 'var(--status-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => { setStep(s => s - 1); setError(null) }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: '0.5px solid var(--border-default)',
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)',
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          {step < termsStep ? (
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: 'var(--gold)',
                color: 'var(--surface)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: submitting ? 'var(--surface-3)' : 'var(--gold)',
                color: submitting ? 'var(--text-muted)' : 'var(--surface)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Creating account…' : 'Create family account →'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}
