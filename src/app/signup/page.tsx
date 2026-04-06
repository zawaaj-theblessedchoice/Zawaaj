'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

const TOTAL_STEPS = 5

const ETHNICITIES = ['Arab', 'South Asian', 'African', 'East Asian', 'Southeast Asian', 'Mixed', 'Other']
const SCHOOLS = ['Sunni – Hanafi', 'Sunni – Maliki', 'Sunni – Shafi\'i', 'Sunni – Hanbali', 'Shia', 'Other / Non-denominational']
const EDUCATION_LEVELS = ['Secondary school', 'Diploma / HND', 'Bachelor\'s degree', 'Master\'s degree', 'Doctorate / PhD', 'Other']
const PROFESSION_SECTORS = ['Healthcare', 'Education', 'Technology', 'Finance', 'Law', 'Engineering', 'Business / Entrepreneurship', 'Creative / Arts', 'Public sector', 'Other']
const HEIGHTS = ['Under 5\'0"', '5\'0"–5\'2"', '5\'3"–5\'5"', '5\'6"–5\'8"', '5\'9"–5\'11"', '6\'0"–6\'2"', 'Over 6\'2"']

interface FormData {
  // Step 1 – Account
  email: string
  password: string
  confirmPassword: string
  // Step 2 – Personal
  gender: string
  date_of_birth: string
  location: string
  // Step 3 – Background
  ethnicity: string
  school_of_thought: string
  education_level: string
  education_detail: string
  profession_sector: string
  profession_detail: string
  // Step 4 – Appearance & profile
  height: string
  display_initials: string
  // Step 5 – Preferences & consent
  spouse_preferences: string
  contact_number: string
  guardian_name: string
  consent_given: boolean
  terms_agreed: boolean
}

const initial: FormData = {
  email: '', password: '', confirmPassword: '',
  gender: '', date_of_birth: '', location: '',
  ethnicity: '', school_of_thought: '', education_level: '', education_detail: '', profession_sector: '', profession_detail: '',
  height: '', display_initials: '',
  spouse_preferences: '', contact_number: '', guardian_name: '', consent_given: false, terms_agreed: false,
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
            style={{
              backgroundColor: i < step ? '#B8960C' : i === step ? '#B8960C' : 'transparent',
              border: i <= step ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
              color: i <= step ? '#1A1A1A' : 'rgba(255,255,255,0.3)',
            }}
          >
            {i < step ? '✓' : i + 1}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div
              className="w-8 h-0.5"
              style={{ backgroundColor: i < step ? '#B8960C' : 'rgba(255,255,255,0.1)' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg px-4 py-3 bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#B8960C] transition-colors text-sm'

const selectCls =
  'w-full rounded-lg px-4 py-3 bg-[#2a2a2a] text-white border border-white/10 focus:outline-none focus:border-[#B8960C] transition-colors text-sm'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(initial)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function next() {
    setError('')
    if (step === 0) {
      if (!form.email || !form.password) return setError('Email and password are required.')
      if (form.password.length < 8) return setError('Password must be at least 8 characters.')
      if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    }
    if (step === 1) {
      if (!form.gender || !form.date_of_birth || !form.location) return setError('All fields are required.')
    }
    if (step === 2) {
      if (!form.ethnicity || !form.school_of_thought || !form.education_level || !form.profession_sector)
        return setError('Please complete all required fields.')
    }
    if (step === 3) {
      if (!form.display_initials) return setError('Display initials are required.')
    }
    setStep((s) => s + 1)
  }

  function back() {
    setError('')
    setStep((s) => s - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.consent_given || !form.terms_agreed)
      return setError('You must give consent and agree to the terms.')

    setLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setError('Account created — please check your email to verify then sign in.')
      setLoading(false)
      return
    }

    // Calculate approximate age display
    const dob = new Date(form.date_of_birth)
    const ageDiff = Date.now() - dob.getTime()
    const age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25))

    const { error: profileError } = await supabase.from('zawaaj_profiles').insert({
      user_id: userId,
      display_initials: form.display_initials.toUpperCase().slice(0, 3),
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      age_display: `${age}`,
      height: form.height,
      ethnicity: form.ethnicity,
      school_of_thought: form.school_of_thought,
      education_level: form.education_level,
      education_detail: form.education_detail,
      profession_sector: form.profession_sector,
      profession_detail: form.profession_detail,
      location: form.location,
      spouse_preferences: form.spouse_preferences,
      contact_number: form.contact_number,
      guardian_name: form.guardian_name,
      consent_given: form.consent_given,
      terms_agreed: form.terms_agreed,
      status: 'pending',
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/directory')
    router.refresh()
  }

  const stepTitles = [
    'Create your account',
    'Personal details',
    'Background & education',
    'Your profile',
    'Preferences & consent',
  ]
  const stepSubtitles = [
    'Choose a secure email and password',
    'Help us understand who you are',
    'Your heritage and career',
    'How you will appear in the directory',
    'What you are looking for',
  ]

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8F6F1] px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <ZawaajLogo size={90} tagline={true} />
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-xl px-8 py-10" style={{ backgroundColor: '#1A1A1A' }}>
          <StepIndicator step={step} />

          <h1 className="text-2xl font-semibold text-white mb-1">{stepTitles[step]}</h1>
          <p className="text-white/50 text-sm mb-8">{stepSubtitles[step]}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Step 1: Account ── */}
            {step === 0 && (
              <>
                <Field label="Email address">
                  <input type="email" required className={inputCls} placeholder="you@example.com"
                    value={form.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Password">
                  <input type="password" required className={inputCls} placeholder="At least 8 characters"
                    value={form.password} onChange={(e) => set('password', e.target.value)} />
                </Field>
                <Field label="Confirm password">
                  <input type="password" required className={inputCls} placeholder="Repeat password"
                    value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
                </Field>
              </>
            )}

            {/* ── Step 2: Personal ── */}
            {step === 1 && (
              <>
                <Field label="Gender">
                  <select className={selectCls} value={form.gender} onChange={(e) => set('gender', e.target.value)} required>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input type="date" required className={inputCls}
                    value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Location (city, country)">
                  <input type="text" required className={inputCls} placeholder="e.g. London, UK"
                    value={form.location} onChange={(e) => set('location', e.target.value)} />
                </Field>
              </>
            )}

            {/* ── Step 3: Background ── */}
            {step === 2 && (
              <>
                <Field label="Ethnicity">
                  <select className={selectCls} value={form.ethnicity} onChange={(e) => set('ethnicity', e.target.value)} required>
                    <option value="">Select…</option>
                    {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </Field>
                <Field label="School of thought">
                  <select className={selectCls} value={form.school_of_thought} onChange={(e) => set('school_of_thought', e.target.value)} required>
                    <option value="">Select…</option>
                    {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Education level">
                  <select className={selectCls} value={form.education_level} onChange={(e) => set('education_level', e.target.value)} required>
                    <option value="">Select…</option>
                    {EDUCATION_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </Field>
                <Field label="Education detail (optional)">
                  <input type="text" className={inputCls} placeholder="e.g. BSc Computer Science"
                    value={form.education_detail} onChange={(e) => set('education_detail', e.target.value)} />
                </Field>
                <Field label="Profession sector">
                  <select className={selectCls} value={form.profession_sector} onChange={(e) => set('profession_sector', e.target.value)} required>
                    <option value="">Select…</option>
                    {PROFESSION_SECTORS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Profession detail (optional)">
                  <input type="text" className={inputCls} placeholder="e.g. Software engineer at NHS"
                    value={form.profession_detail} onChange={(e) => set('profession_detail', e.target.value)} />
                </Field>
              </>
            )}

            {/* ── Step 4: Profile ── */}
            {step === 3 && (
              <>
                <Field label="Display initials (shown on your card)">
                  <input type="text" required className={inputCls} placeholder="e.g. A.M.K"
                    maxLength={5}
                    value={form.display_initials} onChange={(e) => set('display_initials', e.target.value)} />
                </Field>
                <Field label="Height">
                  <select className={selectCls} value={form.height} onChange={(e) => set('height', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    {HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
                <Field label="Contact number">
                  <input type="tel" className={inputCls} placeholder="+44 7700 000000"
                    value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} />
                </Field>
                <Field label="Guardian / Wali name (optional)">
                  <input type="text" className={inputCls} placeholder="Full name of guardian"
                    value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
                </Field>
              </>
            )}

            {/* ── Step 5: Preferences & consent ── */}
            {step === 4 && (
              <>
                <Field label="Spouse preferences (optional)">
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={4}
                    placeholder="Describe what you are looking for in a spouse…"
                    value={form.spouse_preferences}
                    onChange={(e) => set('spouse_preferences', e.target.value)}
                  />
                </Field>
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#B8960C]"
                      checked={form.consent_given}
                      onChange={(e) => set('consent_given', e.target.checked)}
                    />
                    <span className="text-sm text-white/70 leading-relaxed">
                      I consent to Zawaaj sharing my profile with compatible matches on my behalf.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#B8960C]"
                      checked={form.terms_agreed}
                      onChange={(e) => set('terms_agreed', e.target.checked)}
                    />
                    <span className="text-sm text-white/70 leading-relaxed">
                      I agree to the Zawaaj terms of service and privacy policy.
                    </span>
                  </label>
                </div>
              </>
            )}

            {error && (
              <p className="text-red-400 text-sm rounded-lg bg-red-400/10 px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm border border-white/20 text-white/70 hover:border-white/40 transition-colors"
                >
                  Back
                </button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm transition-opacity"
                  style={{ backgroundColor: '#B8960C', color: '#1A1A1A' }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: '#B8960C', color: '#1A1A1A' }}
                >
                  {loading ? 'Submitting…' : 'Submit application'}
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already registered?{' '}
            <Link href="/login" className="font-medium hover:opacity-80 transition-opacity" style={{ color: '#B8960C' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
