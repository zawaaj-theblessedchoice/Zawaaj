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
  'No preference',
  'General Sunni',
]

const ETHNICITY_OPTIONS = [
  'British-Pakistani',
  'British-Bangladeshi',
  'British-Indian',
  'British-Arab',
  'British-Somali',
  'British-Turkish',
  'White British',
  'White European',
  'African',
  'Other/mixed',
]

const EDUCATION_OPTIONS = [
  'Secondary school',
  'College/A-levels',
  'Undergraduate degree',
  'Postgraduate degree',
  'Doctorate/PhD',
  'Professional qualification',
  'Other',
]

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
  borderRadius: '9px',
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
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
      <span
        style={{
          fontSize: '13px',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          textAlign: 'right',
        }}
      >
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
          style={{
            fontSize: '11px',
            color: 'var(--gold)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
            fontWeight: 500,
          }}
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
      <Field label="Email address">
        <StyledInput
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => update({ email: e.target.value })}
          autoComplete="email"
        />
      </Field>
      <Field label="Password">
        <StyledInput
          type="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={(e) => update({ password: e.target.value })}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm password">
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
        <Field label="First name">
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
            <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>
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
      <Field label="Date of birth">
        <StyledInput
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => update({ dateOfBirth: e.target.value })}
        />
      </Field>
      <Field label="Gender">
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
        <Field label="City">
          <StyledInput
            type="text"
            placeholder="e.g. London"
            value={formData.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </Field>
        <Field label="Country">
          <StyledInput
            type="text"
            placeholder="e.g. UK"
            value={formData.country}
            onChange={(e) => update({ country: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Nationality">
        <StyledInput
          type="text"
          placeholder="e.g. British"
          value={formData.nationality}
          onChange={(e) => update({ nationality: e.target.value })}
        />
      </Field>
      <Field label="Marital status">
        <StyledSelect
          value={formData.maritalStatus}
          onChange={(e) => update({ maritalStatus: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="Never married">Never married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </StyledSelect>
      </Field>
      <Field label="Do you have children?">
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
      <Field label="Height (optional)">
        <StyledInput
          type="text"
          placeholder={`e.g. 5'8"`}
          value={formData.height}
          onChange={(e) => update({ height: e.target.value })}
        />
      </Field>
      <Field label="Living situation">
        <StyledSelect
          value={formData.livingSituation}
          onChange={(e) => update({ livingSituation: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="Independent">Independent</option>
          <option value="With family">With family</option>
          <option value="Shared accommodation">Shared accommodation</option>
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
      <Field label="Ethnicity">
        <StyledSelect
          value={formData.ethnicity}
          onChange={(e) => update({ ethnicity: e.target.value })}
        >
          <option value="">Select…</option>
          {ETHNICITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </StyledSelect>
      </Field>
      <Field label="Languages spoken">
        <StyledInput
          type="text"
          placeholder="English, Urdu, Arabic"
          value={formData.languagesSpoken}
          onChange={(e) => update({ languagesSpoken: e.target.value })}
        />
      </Field>
      <Field label="Profession">
        <StyledInput
          type="text"
          placeholder="e.g. Software engineer"
          value={formData.profession}
          onChange={(e) => update({ profession: e.target.value })}
        />
      </Field>
      <Field label="Education level">
        <StyledSelect
          value={formData.educationLevel}
          onChange={(e) => update({ educationLevel: e.target.value })}
        >
          <option value="">Select…</option>
          {EDUCATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </StyledSelect>
      </Field>
      <Field label="Institution (optional)">
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
      <Field label="School of thought">
        <ChipGroup
          options={SCHOOL_OPTIONS}
          value={formData.schoolOfThought}
          onChange={(val) => update({ schoolOfThought: val as string })}
        />
      </Field>
      <Field label="Religiosity">
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
      <Field label="Prayer regularity">
        <StyledSelect
          value={formData.prayerRegularity}
          onChange={(e) => update({ prayerRegularity: e.target.value })}
        >
          <option value="">Select…</option>
          <option value="Yes regularly">Yes regularly</option>
          <option value="Most of the time">Most of the time</option>
          <option value="Working on it">Working on it</option>
          <option value="Not currently">Not currently</option>
        </StyledSelect>
      </Field>
      {formData.gender === 'female' && (
        <Field label="Do you wear hijab?">
          <ToggleGroup
            value={formData.wearsHijab}
            onChange={(val) => update({ wearsHijab: val })}
          />
        </Field>
      )}
      {formData.gender === 'male' && (
        <Field label="Do you keep a beard?">
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
      <Field label="Open to relocation?">
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
      <Field label="Open to partner having children?">
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
            Optional — skip if preferred
          </span>
        </div>
        <StyledSelect
          value={formData.polygamyOpenness}
          onChange={(e) => update({ polygamyOpenness: e.target.value })}
        >
          <option value="">Skip / no answer</option>
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
  const tooFew = wc < 80
  const tooMany = wc > 200

  return (
    <>
      <div
        style={{
          background: 'var(--surface-3)',
          border: '0.5px solid var(--border-default)',
          borderRadius: '9px',
          padding: '12px 14px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginBottom: '20px',
        }}
      >
        Write naturally. No contact details, social handles, or external links permitted.
      </div>
      <Field label="About me">
        <StyledTextarea
          placeholder="Describe yourself, your values, what you're looking for…"
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
            color: tooFew || tooMany ? '#e07070' : 'var(--text-muted)',
          }}
        >
          {wc} / 200 words
          {tooFew && wc > 0 && ` — minimum 80 words`}
          {tooMany && ` — over the 200 word limit`}
        </span>
        {!tooFew && !tooMany && wc >= 80 && (
          <span style={{ fontSize: '11px', color: 'var(--gold)' }}>Looks good</span>
        )}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        Your bio will be reviewed before your profile is approved.
      </div>
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
      <Field label="Preferred location (optional)">
        <StyledInput
          type="text"
          placeholder="e.g. London, UK"
          value={formData.prefLocation}
          onChange={(e) => update({ prefLocation: e.target.value })}
        />
      </Field>
      <Field label="Preferred ethnicity">
        <StyledSelect
          value={formData.prefEthnicity}
          onChange={(e) => update({ prefEthnicity: e.target.value })}
        >
          <option value="">No preference</option>
          <option value="No preference">No preference</option>
          <option value="Open">Open</option>
          <option value="Same ethnicity preferred">Same ethnicity preferred</option>
          <option value="South Asian preferred">South Asian preferred</option>
          <option value="Arab preferred">Arab preferred</option>
          <option value="Other">Other</option>
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
          <option value="Yes open">Yes open</option>
          <option value="Within UK only">Within UK only</option>
          <option value="No relocation preferred">No relocation preferred</option>
        </StyledSelect>
      </Field>
      <Field label="Partner having children?">
        <StyledSelect
          value={formData.prefPartnerChildren}
          onChange={(e) => update({ prefPartnerChildren: e.target.value })}
        >
          <option value="">No preference</option>
          <option value="Open">Open</option>
          <option value="Prefer no children">Prefer no children</option>
          <option value="No preference">No preference</option>
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
        <ReviewRow label="Marital status" value={formData.maritalStatus} />
        <ReviewRow
          label="Has children"
          value={formData.hasChildren === null ? null : formData.hasChildren ? 'Yes' : 'No'}
        />
        <ReviewRow label="Height" value={formData.height || null} />
        <ReviewRow label="Living situation" value={formData.livingSituation} />
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
        <ReviewRow label="Prayer regularity" value={formData.prayerRegularity} />
        {formData.gender === 'female' && (
          <ReviewRow
            label="Wears hijab"
            value={formData.wearsHijab === null ? null : formData.wearsHijab ? 'Yes' : 'No'}
          />
        )}
        {formData.gender === 'male' && (
          <ReviewRow
            label="Keeps beard"
            value={formData.keepsBeard === null ? null : formData.keepsBeard ? 'Yes' : 'No'}
          />
        )}
      </ReviewSection>

      <ReviewSection title="Lifestyle" stepIndex={4} onEdit={onEdit}>
        <ReviewRow label="Open to relocation" value={formData.openToRelocation} />
        <ReviewRow label="Partner's children" value={formData.openToPartnersChildren} />
        <ReviewRow label="Polygamy openness" value={formData.polygamyOpenness || null} />
      </ReviewSection>

      <ReviewSection title="About me" stepIndex={5} onEdit={onEdit}>
        <div
          style={{
            padding: '10px 0',
            fontSize: '13px',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          {formData.bio || <span style={{ color: 'var(--text-muted)' }}>—</span>}
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
          value={
            formData.prefSchoolOfThought.length > 0
              ? formData.prefSchoolOfThought.join(', ')
              : null
          }
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
      return ''
    case 4:
      if (!formData.openToRelocation) return 'Please answer the relocation question.'
      if (!formData.openToPartnersChildren) return "Please answer the partner's children question."
      return ''
    case 5: {
      const wc = wordCount(formData.bio)
      if (wc < 80) return `Bio must be at least 80 words. Currently ${wc} words.`
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
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)

  function update(patch: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  function handleNext() {
    const err = validateStep(step, formData)
    if (err) {
      setError(err)
      return
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
      const supabase = createClient()

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })
      if (authError || !authData.user) throw authError ?? new Error('Signup failed')

      const userId = authData.user.id
      const initials = (formData.firstName[0] + formData.lastName[0]).toUpperCase()

      // Shared profile fields collected from the wizard
      const wizardFields = {
        display_initials: initials,
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        nationality: formData.nationality,
        marital_status: formData.maritalStatus,
        has_children: formData.hasChildren,
        languages_spoken: formData.languagesSpoken,
        height: formData.height || null,
        living_situation: formData.livingSituation,
        ethnicity: formData.ethnicity,
        school_of_thought: formData.schoolOfThought,
        education_level: formData.educationLevel,
        education_detail: formData.institution || null,
        profession_detail: formData.profession,
        location: `${formData.city}, ${formData.country}`,
        bio: formData.bio,
        religiosity: formData.religiosity,
        prayer_regularity: formData.prayerRegularity,
        wears_hijab: formData.gender === 'female' ? formData.wearsHijab : null,
        keeps_beard: formData.gender === 'male' ? formData.keepsBeard : null,
        open_to_relocation: formData.openToRelocation,
        open_to_partners_children: formData.openToPartnersChildren,
        polygamy_openness: formData.polygamyOpenness || null,
        pref_age_min: formData.prefAgeMin ? parseInt(formData.prefAgeMin, 10) : null,
        pref_age_max: formData.prefAgeMax ? parseInt(formData.prefAgeMax, 10) : null,
        pref_location: formData.prefLocation || null,
        pref_ethnicity: formData.prefEthnicity || null,
        pref_school_of_thought:
          formData.prefSchoolOfThought.length > 0 ? formData.prefSchoolOfThought : null,
        pref_relocation: formData.prefRelocation || null,
        pref_partner_children: formData.prefPartnerChildren || null,
        consent_given: true,
        terms_agreed: true,
      }

      let profileId: string

      // 2. Check for an existing imported profile with the same email (unlinked)
      //    This allows members from the old Google Form to claim their profile
      //    without admin intervention.
      const { data: existingProfile } = await supabase
        .from('zawaaj_profiles')
        .select('id, status')
        .eq('imported_email', formData.email)
        .is('user_id', null)
        .maybeSingle()

      if (existingProfile) {
        // 2a. Link existing profile — preserve status + legacy fields, enrich with wizard data
        const { error: updateError } = await supabase
          .from('zawaaj_profiles')
          .update({ user_id: userId, ...wizardFields })
          .eq('id', existingProfile.id)

        if (updateError) throw updateError
        profileId = existingProfile.id
      } else {
        // 2b. No matching imported profile — create a fresh one pending admin review
        const { data: newProfile, error: profileError } = await supabase
          .from('zawaaj_profiles')
          .insert({
            user_id: userId,
            ...wizardFields,
            status: 'pending',
            submitted_date: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (profileError || !newProfile) throw profileError ?? new Error('Profile creation failed')
        profileId = newProfile.id
      }

      // 3. Create user settings pointing to the active profile
      const { error: settingsError } = await supabase
        .from('zawaaj_user_settings')
        .insert({ user_id: userId, active_profile_id: profileId })

      if (settingsError) throw settingsError

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
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}
          >
            Profile submitted
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            Thank you. Your profile is now under review. You will receive an email when approved
            and your profile becomes visible to other members.
          </p>
          <Link
            href="/login"
            style={{
              fontSize: '13px',
              color: 'var(--gold)',
              textDecoration: 'none',
            }}
          >
            Already approved? Sign in →
          </Link>
        </div>
      </div>
    )
  }

  // ── Wizard layout ───────────────────────────────────────────────────────────

  const isBioStep = step === 5
  const bioContinueDisabled = isBioStep
    ? wordCount(formData.bio) < 80 || wordCount(formData.bio) > 200
    : false

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
          {/* Logo */}
          <div style={{ padding: '0 24px 32px' }}>
            <ZawaajLogo size={60} tagline={false} />
          </div>

          {/* Steps list */}
          <nav>
            {STEPS.map((label, i) => {
              const isDone = completedSteps.has(i)
              const isActive = i === step
              const isClickable = isDone || completedSteps.has(i)

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
                    borderLeft: isActive
                      ? '2px solid var(--gold)'
                      : '2px solid transparent',
                    cursor: isClickable ? 'pointer' : 'default',
                    textAlign: 'left',
                  }}
                >
                  {/* Step dot */}
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
                      background: isDone
                        ? 'var(--gold)'
                        : isActive
                        ? 'var(--gold-muted)'
                        : 'var(--surface-3)',
                      border: isActive && !isDone
                        ? '1px solid var(--gold-border)'
                        : 'none',
                      color: isDone ? '#111' : isActive ? 'var(--gold)' : 'var(--text-muted)',
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? 'var(--gold-light)'
                        : isDone
                        ? 'var(--text-secondary)'
                        : 'var(--text-muted)',
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
        <div
          style={{
            flex: 1,
            padding: '48px',
            maxWidth: '648px',
            overflowY: 'auto',
          }}
        >
          {/* Step header */}
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
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '28px',
            }}
          >
            {STEPS[step]}
          </h1>

          {/* Step content */}
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
              }}
            >
              {error}
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
                disabled={bioContinueDisabled}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'var(--gold)',
                  border: 'none',
                  borderRadius: '9px',
                  color: '#111',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: bioContinueDisabled ? 'not-allowed' : 'pointer',
                  opacity: bioContinueDisabled ? 0.4 : 1,
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'var(--gold)',
                  border: 'none',
                  borderRadius: '9px',
                  color: '#111',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.4 : 1,
                }}
              >
                {loading ? 'Submitting…' : 'Submit application'}
              </button>
            )}
          </div>

          {/* Sign-in link */}
          <p
            style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            Already registered?{' '}
            <Link
              href="/login"
              style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
