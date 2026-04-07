'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 0 — Account
  email: string
  password: string
  confirmPassword: string
  // Step 1 — Basic info
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | ''
  city: string
  country: string
  nationality: string
  maritalStatus: string
  hasChildren: boolean | null
  height: string
  livingSituation: string
  // Step 2 — Background
  ethnicity: string
  languagesSpoken: string
  profession: string
  educationLevel: string
  institution: string
  // Step 3 — Faith
  schoolOfThought: string
  religiosity: string
  prayerRegularity: string
  wearsHijab: boolean | null
  keepsBeard: boolean | null
  // Step 4 — Lifestyle
  openToRelocation: string
  openToPartnersChildren: string
  polygamyOpenness: string
  // Step 5 — Bio
  bio: string
  // Step 6 — Preferences
  prefAgeMin: string
  prefAgeMax: string
  prefLocation: string
  prefEthnicity: string
  prefSchoolOfThought: string[]
  prefRelocation: string
  prefPartnerChildren: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  'Account',
  'Basic info',
  'Background',
  'Faith & practice',
  'Lifestyle',
  'About me',
  'Preferences',
  'Review',
]

const SCHOOL_OPTIONS = [
  'Hanafi',
  "Shafi'i",
  'Maliki',
  'Hanbali',
  'General Sunni',
  'No preference',
]

const ETHNICITY_OPTIONS = [
  // British-raised (grew up in the UK)
  'British Pakistani',
  'British Bangladeshi',
  'British Indian',
  'British Arab',
  'British Somali',
  'British Turkish / Kurdish',
  'British African',
  // Internationally raised
  'Pakistani',
  'Bangladeshi',
  'Indian',
  'Arab',
  'Somali',
  'Turkish / Kurdish',
  'Afghan',
  'Iranian / Persian',
  'Malaysian / Indonesian',
  'West African',
  'East African',
  // Other
  'White British / European',
  'Mixed heritage',
  'Other',
]

const EDUCATION_OPTIONS = [
  'Secondary school',
  'College / A-levels',
  'Undergraduate degree',
  'Postgraduate degree',
  'Doctorate / PhD',
  'Professional qualification',
  'Other',
]

// Heights from 4'8" to 6'8" in 1" increments
const HEIGHT_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let feet = 4; feet <= 6; feet++) {
    const minIn = feet === 4 ? 8 : 0
    const maxIn = feet === 6 ? 8 : 11
    for (let inches = minIn; inches <= maxIn; inches++) {
      out.push(`${feet}'${inches}"`)
    }
  }
  return out
})()

const INITIAL_FORM: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  city: '',
  country: '',
  nationality: '',
  maritalStatus: '',
  hasChildren: null,
  height: '',
  livingSituation: '',
  ethnicity: '',
  languagesSpoken: '',
  profession: '',
  educationLevel: '',
  institution: '',
  schoolOfThought: '',
  religiosity: '',
  prayerRegularity: '',
  wearsHijab: null,
  keepsBeard: null,
  openToRelocation: '',
  openToPartnersChildren: '',
  polygamyOpenness: '',
  bio: '',
  prefAgeMin: '',
  prefAgeMax: '',
  prefLocation: '',
  prefEthnicity: '',
  prefSchoolOfThought: [],
  prefRelocation: '',
  prefPartnerChildren: '',
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isAtLeast18(dob: string): boolean {
  if (!dob) return false
  const birth = new Date(dob)
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 18)
  return birth <= cutoff
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-3)',
  border: '0.5px solid var(--border-default)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '6px',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  marginBottom: '12px',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>
        {label}
        {required && (
          <span style={{ color: 'var(--gold)', marginLeft: 4, fontWeight: 600 }}>*</span>
        )}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '5px 0 0', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--gold-border)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        props.onBlur?.(e)
      }}
    />
  )
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A5752' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '32px',
        cursor: 'pointer',
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--gold-border)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        props.onBlur?.(e)
      }}
    >
      {props.children}
    </select>
  )
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: 'vertical',
        minHeight: '120px',
        fontFamily: 'inherit',
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--gold-border)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        props.onBlur?.(e)
      }}
    />
  )
}

function ChipGroup({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: string[]
  value: string | string[]
  onChange: (val: string | string[]) => void
  multi?: boolean
}) {
  function isSelected(opt: string): boolean {
    if (multi) return (value as string[]).includes(opt)
    return value === opt
  }

  function handleClick(opt: string) {
    if (multi) {
      const arr = value as string[]
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
    } else {
      onChange(value === opt ? '' : opt)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => handleClick(opt)}
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            cursor: 'pointer',
            border: isSelected(opt)
              ? '0.5px solid var(--gold-border)'
              : '0.5px solid var(--border-default)',
            background: isSelected(opt) ? 'var(--gold-muted)' : 'var(--surface-3)',
            color: isSelected(opt) ? 'var(--gold-light)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function ToggleGroup({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (val: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          style={{
            padding: '6px 20px',
            borderRadius: '9px',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500,
            border: value === v ? '0.5px solid var(--gold-border)' : '0.5px solid var(--border-default)',
            background: value === v ? 'var(--gold-muted)' : 'var(--surface-3)',
            color: value === v ? 'var(--gold-light)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

// ─── Review helpers ───────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '8px 0',
        borderBottom: '0.5px solid var(--border-default)',
        gap: '16px',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function ReviewSection({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string
  stepIndex: number
  onEdit: (n: number) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={sectionLabelStyle}>{title}</span>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
          style={{ fontSize: '11px', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: 500 }}
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step0({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  return (
    <>
      <Field label="Email address" required>
        <StyledInput
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => update({ email: e.target.value })}
          autoComplete="email"
        />
      </Field>
      <Field label="Password" required>
        <StyledInput
          type="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={(e) => update({ password: e.target.value })}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm password" required>
        <StyledInput
          type="password"
          placeholder="Repeat password"
          value={formData.confirmPassword}
          onChange={(e) => update({ confirmPassword: e.target.value })}
          autoComplete="new-password"
        />
      </Field>
      <div
        style={{
          background: 'var(--surface-3)',
          border: '0.5px solid var(--border-default)',
          borderRadius: '9px',
          padding: '12px 14px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        Your profile will be reviewed by an admin before becoming visible to other members.
      </div>
    </>
  )
}

function Step1({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Field label="First name" required>
          <StyledInput
            type="text"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => update({ firstName: e.target.value })}
          />
        </Field>
        <div>
          <label style={labelStyle}>
            Last name{' '}
            <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>
              (kept private)
            </span>
          </label>
          <StyledInput
            type="text"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
          />
        </div>
      </div>
      <Field label="Date of birth" required>
        <StyledInput
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => update({ dateOfBirth: e.target.value })}
        />
      </Field>
      <Field label="Gender" required>
        <StyledSelect
          value={formData.gender}
          onChange={(e) => update({ gender: e.target.value as 'male' | 'female' | '' })}
        >
          <option value="">Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </StyledSelect>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Field label="City" required>
          <StyledInput
            type="text"
            placeholder="e.g. London"
            value={formData.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </Field>
        <Field label="Country" required>
          <StyledInput
            type="text"
            placeholder="e.g. UK"
            value={formData.country}
            onChange={(e) => update({ country: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Nationality" required>
        <StyledInput
          type="text"
          placeholder="e.g. British"
          value={formData.nationality}
          onChange={(e) => update({ nationality: e.target.value })}
        />
      </Field>
      <Field label="Marital status" required>
        <StyledSelect
          value={formData.maritalStatus}
          onChange={(e) => update({ maritalStatus: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="never_married">Never married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
        </StyledSelect>
      </Field>
      <Field label="Do you have children?" required>
        <StyledSelect
          value={formData.hasChildren === null ? '' : String(formData.hasChildren)}
          onChange={(e) =>
            update({ hasChildren: e.target.value === '' ? null : e.target.value === 'true' })
          }
        >
          <option value="">Select…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </StyledSelect>
      </Field>
      <Field label="Height" required>
        <StyledSelect
          value={formData.height}
          onChange={(e) => update({ height: e.target.value })}
        >
          <option value="">Select height…</option>
          {HEIGHT_OPTIONS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </StyledSelect>
      </Field>
      <Field label="Living situation" required>
        <StyledSelect
          value={formData.livingSituation}
          onChange={(e) => update({ livingSituation: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="independent">Independent</option>
          <option value="with_family">With family</option>
          <option value="shared">Shared accommodation</option>
        </StyledSelect>
      </Field>
    </>
  )
}

function Step2({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  return (
    <>
      <Field label="Ethnicity" required hint="'British Pakistani' = Pakistani heritage, raised in the UK. Choose whichever best reflects your background.">
        <StyledSelect
          value={formData.ethnicity}
          onChange={(e) => update({ ethnicity: e.target.value })}
        >
          <option value="">Select…</option>
          <optgroup label="── British-raised ──" disabled />
          {ETHNICITY_OPTIONS.filter(o => o.startsWith('British')).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <optgroup label="── Internationally raised ──" disabled />
          {ETHNICITY_OPTIONS.filter(o => !o.startsWith('British') && !['White British / European','Mixed heritage','Other'].includes(o)).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <optgroup label="── Other ──" disabled />
          {['White British / European','Mixed heritage','Other'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </StyledSelect>
      </Field>
      <Field label="Languages spoken" required>
        <StyledInput
          type="text"
          placeholder="e.g. English, Urdu, Arabic"
          value={formData.languagesSpoken}
          onChange={(e) => update({ languagesSpoken: e.target.value })}
        />
      </Field>
      <Field label="Profession" required>
        <StyledInput
          type="text"
          placeholder="e.g. Software engineer"
          value={formData.profession}
          onChange={(e) => update({ profession: e.target.value })}
        />
      </Field>
      <Field label="Education level" required>
        <StyledSelect
          value={formData.educationLevel}
          onChange={(e) => update({ educationLevel: e.target.value })}
        >
          <option value="">Select…</option>
          {EDUCATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </StyledSelect>
      </Field>
      <Field label="Institution" hint="Optional — university, school, or professional body">
        <StyledInput
          type="text"
          placeholder="e.g. University of Manchester"
          value={formData.institution}
          onChange={(e) => update({ institution: e.target.value })}
        />
      </Field>
    </>
  )
}

function Step3({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  return (
    <>
      <Field label="School of thought" required>
        <ChipGroup
          options={SCHOOL_OPTIONS}
          value={formData.schoolOfThought}
          onChange={(val) => update({ schoolOfThought: val as string })}
        />
      </Field>
      <Field label="Religiosity" required>
        <StyledSelect
          value={formData.religiosity}
          onChange={(e) => update({ religiosity: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="Practising">Practising</option>
          <option value="Moderately practising">Moderately practising</option>
          <option value="Cultural Muslim">Cultural Muslim</option>
        </StyledSelect>
      </Field>
      <Field label="Prayer regularity" required>
        <StyledSelect
          value={formData.prayerRegularity}
          onChange={(e) => update({ prayerRegularity: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="yes_regularly">Yes, regularly</option>
          <option value="most_of_time">Most of the time</option>
          <option value="working_on_it">Working on it</option>
          <option value="not_currently">Not currently</option>
        </StyledSelect>
      </Field>
      {formData.gender === 'female' && (
        <Field label="Do you wear hijab?" required>
          <ToggleGroup
            value={formData.wearsHijab}
            onChange={(val) => update({ wearsHijab: val })}
          />
        </Field>
      )}
      {formData.gender === 'male' && (
        <Field label="Do you keep a beard?" required>
          <ToggleGroup
            value={formData.keepsBeard}
            onChange={(val) => update({ keepsBeard: val })}
          />
        </Field>
      )}
    </>
  )
}

function Step4({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  return (
    <>
      <Field label="Open to relocation?" required>
        <StyledSelect
          value={formData.openToRelocation}
          onChange={(e) => update({ openToRelocation: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="Yes, open to relocating">Yes, open to relocating</option>
          <option value="Within UK only">Within UK only</option>
          <option value="Prefer to stay local">Prefer to stay local</option>
          <option value="Not open to relocating">Not open to relocating</option>
        </StyledSelect>
      </Field>
      <Field label="Open to partner having children?" required>
        <StyledSelect
          value={formData.openToPartnersChildren}
          onChange={(e) => update({ openToPartnersChildren: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="Yes, open">Yes, open</option>
          <option value="No preference">No preference</option>
          <option value="Prefer not">Prefer not</option>
        </StyledSelect>
      </Field>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Polygamy openness</label>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              background: 'var(--surface-3)',
              border: '0.5px solid var(--border-default)',
              borderRadius: '4px',
              padding: '2px 6px',
            }}
          >
            Optional
          </span>
        </div>
        <StyledSelect
          value={formData.polygamyOpenness}
          onChange={(e) => update({ polygamyOpenness: e.target.value })}
        >
          <option value="">Skip / prefer not to say</option>
          <option value="No">No</option>
          <option value="Open to discussion">Open to discussion</option>
        </StyledSelect>
      </div>
    </>
  )
}

function Step5({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  const wc = wordCount(formData.bio)
  const tooMany = wc > 200

  return (
    <>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: '20px',
        }}
      >
        This section is optional. Write naturally about yourself — your values, interests, or what
        you&apos;re looking for. Keep it genuine.
      </p>
      <Field label="About me">
        <StyledTextarea
          placeholder="Describe yourself in your own words…"
          value={formData.bio}
          onChange={(e) => update({ bio: e.target.value })}
          rows={8}
        />
      </Field>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '-8px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: tooMany ? '#e07070' : 'var(--text-muted)',
          }}
        >
          {wc > 0 ? `${wc} / 200 words` : ''}
          {tooMany ? ` — please keep to 200 words or fewer` : ''}
        </span>
      </div>
      <p
        style={{
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        No contact details, social handles, or external links.
      </p>
    </>
  )
}

function Step6({
  formData,
  update,
}: {
  formData: FormData
  update: (patch: Partial<FormData>) => void
}) {
  return (
    <>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
        All preferences are optional and help us surface more relevant profiles for you.
      </p>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Preferred age range</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StyledInput
            type="number"
            placeholder="Min"
            min={18}
            max={99}
            value={formData.prefAgeMin}
            onChange={(e) => update({ prefAgeMin: e.target.value })}
            style={{ width: '90px' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
          <StyledInput
            type="number"
            placeholder="Max"
            min={18}
            max={99}
            value={formData.prefAgeMax}
            onChange={(e) => update({ prefAgeMax: e.target.value })}
            style={{ width: '90px' }}
          />
        </div>
      </div>
      <Field label="Preferred location">
        <StyledInput
          type="text"
          placeholder="e.g. London, UK — or leave blank for open"
          value={formData.prefLocation}
          onChange={(e) => update({ prefLocation: e.target.value })}
        />
      </Field>
      <Field label="Ethnicity preference">
        <StyledSelect
          value={formData.prefEthnicity}
          onChange={(e) => update({ prefEthnicity: e.target.value })}
        >
          <option value="">No preference</option>
          <option value="Same ethnicity preferred">Same ethnicity preferred</option>
          <option value="South Asian preferred">South Asian preferred</option>
          <option value="Arab preferred">Arab preferred</option>
          <option value="Open to any">Open to any</option>
        </StyledSelect>
      </Field>
      <Field label="Preferred school of thought">
        <ChipGroup
          options={SCHOOL_OPTIONS}
          value={formData.prefSchoolOfThought}
          onChange={(val) => update({ prefSchoolOfThought: val as string[] })}
          multi
        />
      </Field>
      <Field label="Partner open to relocation?">
        <StyledSelect
          value={formData.prefRelocation}
          onChange={(e) => update({ prefRelocation: e.target.value })}
        >
          <option value="">No preference</option>
          <option value="Yes, open">Yes — open to relocating</option>
          <option value="Within UK only">Within UK only</option>
          <option value="No relocation preferred">Prefer local</option>
        </StyledSelect>
      </Field>
      <Field label="Partner having children?">
        <StyledSelect
          value={formData.prefPartnerChildren}
          onChange={(e) => update({ prefPartnerChildren: e.target.value })}
        >
          <option value="">No preference</option>
          <option value="Prefer no children">Prefer no children</option>
          <option value="Open">Open to it</option>
        </StyledSelect>
      </Field>
    </>
  )
}

function Step7({
  formData,
  onEdit,
}: {
  formData: FormData
  onEdit: (n: number) => void
}) {
  const maritalLabels: Record<string, string> = {
    never_married: 'Never married',
    divorced: 'Divorced',
    widowed: 'Widowed',
  }
  const livingLabels: Record<string, string> = {
    independent: 'Independent',
    with_family: 'With family',
    shared: 'Shared accommodation',
  }
  const prayerLabels: Record<string, string> = {
    yes_regularly: 'Yes, regularly',
    most_of_time: 'Most of the time',
    working_on_it: 'Working on it',
    not_currently: 'Not currently',
  }

  return (
    <>
      <ReviewSection title="Account" stepIndex={0} onEdit={onEdit}>
        <ReviewRow label="Email" value={formData.email} />
        <ReviewRow label="Password" value="••••••••" />
      </ReviewSection>

      <ReviewSection title="Basic info" stepIndex={1} onEdit={onEdit}>
        <ReviewRow label="Name" value={`${formData.firstName} ${formData.lastName}`} />
        <ReviewRow label="Date of birth" value={formData.dateOfBirth} />
        <ReviewRow label="Gender" value={formData.gender} />
        <ReviewRow label="Location" value={`${formData.city}, ${formData.country}`} />
        <ReviewRow label="Nationality" value={formData.nationality} />
        <ReviewRow label="Marital status" value={maritalLabels[formData.maritalStatus] ?? formData.maritalStatus} />
        <ReviewRow label="Has children" value={formData.hasChildren === null ? null : formData.hasChildren ? 'Yes' : 'No'} />
        <ReviewRow label="Height" value={formData.height} />
        <ReviewRow label="Living situation" value={livingLabels[formData.livingSituation] ?? formData.livingSituation} />
      </ReviewSection>

      <ReviewSection title="Background" stepIndex={2} onEdit={onEdit}>
        <ReviewRow label="Ethnicity" value={formData.ethnicity} />
        <ReviewRow label="Languages" value={formData.languagesSpoken} />
        <ReviewRow label="Profession" value={formData.profession} />
        <ReviewRow label="Education" value={formData.educationLevel} />
        <ReviewRow label="Institution" value={formData.institution || null} />
      </ReviewSection>

      <ReviewSection title="Faith & practice" stepIndex={3} onEdit={onEdit}>
        <ReviewRow label="School of thought" value={formData.schoolOfThought} />
        <ReviewRow label="Religiosity" value={formData.religiosity} />
        <ReviewRow label="Prayer regularity" value={prayerLabels[formData.prayerRegularity] ?? formData.prayerRegularity} />
        {formData.gender === 'female' && (
          <ReviewRow label="Wears hijab" value={formData.wearsHijab === null ? null : formData.wearsHijab ? 'Yes' : 'No'} />
        )}
        {formData.gender === 'male' && (
          <ReviewRow label="Keeps beard" value={formData.keepsBeard === null ? null : formData.keepsBeard ? 'Yes' : 'No'} />
        )}
      </ReviewSection>

      <ReviewSection title="Lifestyle" stepIndex={4} onEdit={onEdit}>
        <ReviewRow label="Open to relocation" value={formData.openToRelocation} />
        <ReviewRow label="Partner&apos;s children" value={formData.openToPartnersChildren} />
        <ReviewRow label="Polygamy openness" value={formData.polygamyOpenness || null} />
      </ReviewSection>

      <ReviewSection title="About me" stepIndex={5} onEdit={onEdit}>
        <div
          style={{
            padding: '10px 0',
            fontSize: '13px',
            color: formData.bio ? 'var(--text-primary)' : 'var(--text-muted)',
            lineHeight: 1.6,
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          {formData.bio || 'Not provided'}
        </div>
      </ReviewSection>

      <ReviewSection title="Preferences" stepIndex={6} onEdit={onEdit}>
        <ReviewRow
          label="Age range"
          value={
            formData.prefAgeMin || formData.prefAgeMax
              ? `${formData.prefAgeMin || '?'} – ${formData.prefAgeMax || '?'}`
              : null
          }
        />
        <ReviewRow label="Location" value={formData.prefLocation || null} />
        <ReviewRow label="Ethnicity" value={formData.prefEthnicity || null} />
        <ReviewRow
          label="School of thought"
          value={formData.prefSchoolOfThought.length > 0 ? formData.prefSchoolOfThought.join(', ') : null}
        />
        <ReviewRow label="Relocation" value={formData.prefRelocation || null} />
        <ReviewRow label="Partner children" value={formData.prefPartnerChildren || null} />
      </ReviewSection>
    </>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, formData: FormData): string {
  switch (step) {
    case 0:
      if (!formData.email) return 'Email is required.'
      if (!formData.password) return 'Password is required.'
      if (formData.password.length < 8) return 'Password must be at least 8 characters.'
      if (formData.password !== formData.confirmPassword) return 'Passwords do not match.'
      return ''
    case 1:
      if (!formData.firstName) return 'First name is required.'
      if (!formData.lastName) return 'Last name is required.'
      if (!formData.dateOfBirth) return 'Date of birth is required.'
      if (!isAtLeast18(formData.dateOfBirth)) return 'You must be at least 18 years old.'
      if (!formData.gender) return 'Please select your gender.'
      if (!formData.city) return 'City is required.'
      if (!formData.country) return 'Country is required.'
      if (!formData.nationality) return 'Nationality is required.'
      if (!formData.maritalStatus) return 'Marital status is required.'
      if (formData.hasChildren === null) return 'Please indicate whether you have children.'
      if (!formData.height) return 'Height is required.'
      if (!formData.livingSituation) return 'Living situation is required.'
      return ''
    case 2:
      if (!formData.ethnicity) return 'Ethnicity is required.'
      if (!formData.languagesSpoken) return 'Please list at least one language.'
      if (!formData.profession) return 'Profession is required.'
      if (!formData.educationLevel) return 'Education level is required.'
      return ''
    case 3:
      if (!formData.schoolOfThought) return 'Please select your school of thought.'
      if (!formData.religiosity) return 'Religiosity is required.'
      if (!formData.prayerRegularity) return 'Prayer regularity is required.'
      if (formData.gender === 'female' && formData.wearsHijab === null)
        return 'Please indicate whether you wear hijab.'
      if (formData.gender === 'male' && formData.keepsBeard === null)
        return 'Please indicate whether you keep a beard.'
      return ''
    case 4:
      if (!formData.openToRelocation) return 'Please answer the relocation question.'
      if (!formData.openToPartnersChildren) return "Please answer the partner's children question."
      return ''
    case 5: {
      // Bio is optional — only validate max length
      const wc = wordCount(formData.bio)
      if (wc > 200) return `Bio must be 200 words or fewer. Currently ${wc} words.`
      return ''
    }
    case 6:
      return ''
    default:
      return ''
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SignupPage() {
  const [step, setStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [linkedProfile, setLinkedProfile] = useState(false)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)

  function update(patch: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  async function handleNext() {
    const err = validateStep(step, formData)
    if (err) {
      setError(err)
      return
    }

    // At step 0 (Account), check email availability before the user fills 7 more steps
    if (step === 0) {
      setLoading(true)
      try {
        const res = await fetch('/api/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        })
        const json = await res.json() as { exists?: boolean }
        if (json.exists) {
          setError('An account with this email already exists. Please sign in, or use "Forgot password?" if you need to reset your password.')
          setLoading(false)
          return
        }
      } catch {
        // Network error — allow user to proceed; duplicate caught at submission
      } finally {
        setLoading(false)
      }
    }

    setError('')
    setCompletedSteps((prev) => new Set([...prev, step]))
    setStep((s) => s + 1)
  }

  function handleBack() {
    setError('')
    setStep((s) => s - 1)
  }

  function jumpToStep(n: number) {
    setError('')
    setStep(n)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const json = await res.json() as { success?: boolean; linked?: boolean; error?: string; message?: string }

      // Specific handling for duplicate email
      if (res.status === 409) {
        setError(
          'An account with this email already exists. ' +
          'Please sign in, or use "Forgot password?" if you need to reset your password.'
        )
        setLoading(false)
        return
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? json.message ?? 'Registration failed. Please try again.')
      }

      // Sign in to establish the browser session
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (signInError) throw signInError

      setLinkedProfile(json.linked === true)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    const initials =
      formData.firstName && formData.lastName
        ? (formData.firstName[0] + formData.lastName[0]).toUpperCase()
        : '?'

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '2px solid var(--gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--gold)',
              background: 'var(--gold-muted)',
            }}
          >
            {initials}
          </div>
          <h1
            style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}
          >
            {linkedProfile ? 'Profile connected' : 'Profile submitted'}
          </h1>
          <p
            style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}
          >
            {linkedProfile
              ? 'We matched your details to an existing profile. Your profile will be reviewed and you\'ll be notified once approved, insha\'Allah.'
              : 'JazakAllahu Khayran. Your profile is under review. You will be notified once approved, insha\'Allah.'}
          </p>
          <Link href="/pending" style={{ fontSize: '13px', color: 'var(--gold)', textDecoration: 'none' }}>
            View application status →
          </Link>
        </div>
      </div>
    )
  }

  // ── Wizard layout ───────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--surface-3)', flexShrink: 0 }}>
        <div
          style={{
            height: '100%',
            background: 'var(--gold)',
            width: `${((step + 1) / 8) * 100}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left stepper */}
        <div
          style={{
            width: '200px',
            minHeight: '100vh',
            background: 'var(--surface-2)',
            borderRight: '0.5px solid var(--border-default)',
            padding: '40px 0',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '0 24px 32px' }}>
            <ZawaajLogo size={60} tagline={false} />
          </div>

          <nav>
            {STEPS.map((label, i) => {
              const isDone = completedSteps.has(i)
              const isActive = i === step
              const isClickable = isDone

              return (
                <button
                  key={label}
                  type="button"
                  disabled={!isClickable && !isActive}
                  onClick={() => isClickable && jumpToStep(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 24px',
                    background: isActive ? 'var(--gold-muted)' : 'none',
                    border: 'none',
                    borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                    cursor: isClickable ? 'pointer' : 'default',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: isDone ? 'var(--gold)' : isActive ? 'var(--gold-muted)' : 'var(--surface-3)',
                      border: isActive && !isDone ? '1px solid var(--gold-border)' : 'none',
                      color: isDone ? '#111' : isActive ? 'var(--gold)' : 'var(--text-muted)',
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--gold-light)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)',
                    }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main form content */}
        <div style={{ flex: 1, padding: '48px', maxWidth: '648px', overflowY: 'auto' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}
          >
            Step {step + 1} of 8
          </p>
          <h1
            style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '28px' }}
          >
            {STEPS[step]}
          </h1>

          <div>
            {step === 0 && <Step0 formData={formData} update={update} />}
            {step === 1 && <Step1 formData={formData} update={update} />}
            {step === 2 && <Step2 formData={formData} update={update} />}
            {step === 3 && <Step3 formData={formData} update={update} />}
            {step === 4 && <Step4 formData={formData} update={update} />}
            {step === 5 && <Step5 formData={formData} update={update} />}
            {step === 6 && <Step6 formData={formData} update={update} />}
            {step === 7 && <Step7 formData={formData} onEdit={jumpToStep} />}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: 'rgba(220, 80, 80, 0.1)',
                border: '0.5px solid rgba(220, 80, 80, 0.3)',
                borderRadius: '9px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#e07070',
                marginBottom: '20px',
                marginTop: '12px',
                lineHeight: 1.5,
              }}
            >
              {error}
              {error.includes('already exists') && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                  <Link href="/login" style={{ color: 'var(--gold)', fontSize: '12px' }}>Sign in →</Link>
                  <Link href="/forgot-password" style={{ color: 'var(--gold)', fontSize: '12px' }}>Forgot password? →</Link>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'var(--surface-3)',
                  border: '0.5px solid var(--border-default)',
                  borderRadius: '9px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}

            {step < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'linear-gradient(135deg, #C49A10, #D9AF2E)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#111',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                  boxShadow: '0 2px 8px rgba(196,154,16,0.25)',
                }}
              >
                {loading && step === 0 ? 'Checking…' : 'Continue'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'linear-gradient(135deg, #C49A10, #D9AF2E)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#111',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.4 : 1,
                  boxShadow: '0 2px 8px rgba(196,154,16,0.25)',
                }}
              >
                {loading ? 'Submitting…' : 'Submit application'}
              </button>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
