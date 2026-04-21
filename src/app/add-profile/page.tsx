'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

interface AddProfileForm {
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
  ethnicity: string
  languagesSpoken: string[]
  profession: string
  educationLevel: string
  institution: string
  schoolOfThought: string
  religiosity: string
  prayerRegularity: string
  wearsHijab: boolean | null
  keepsBeard: boolean | null
  openToRelocation: string
  openToPartnersChildren: string
  polygamyOpenness: string
  bio: string
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

const LANGUAGE_OPTIONS = [
  'English', 'Arabic', 'Urdu', 'Bengali / Sylheti', 'Punjabi',
  'Somali', 'Turkish', 'French', 'Gujarati', 'Pashto / Dari',
  'Persian / Farsi', 'Tamil', 'Swahili', 'Albanian', 'Polish', 'Other',
]

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

const INITIAL_FORM: AddProfileForm = {
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
  languagesSpoken: [] as string[],
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
        e.currentTarget.style.borderColor = 'var(--border-gold)'
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
        e.currentTarget.style.borderColor = 'var(--border-gold)'
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
        e.currentTarget.style.borderColor = 'var(--border-gold)'
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
              ? '0.5px solid var(--border-gold)'
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
            border: value === v ? '0.5px solid var(--border-gold)' : '0.5px solid var(--border-default)',
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
        <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{title}</span>
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

function Step1({
  form,
  update,
}: {
  form: AddProfileForm
  update: (patch: Partial<AddProfileForm>) => void
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Field label="First name" required>
          <StyledInput
            type="text"
            placeholder="First name"
            value={form.firstName}
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
            value={form.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
          />
        </div>
      </div>
      <Field label="Date of birth" required>
        <StyledInput
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => update({ dateOfBirth: e.target.value })}
        />
      </Field>
      <Field label="Gender" required>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['female', 'male'] as const).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => update({ gender: g })}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 9,
                border: `0.5px solid ${form.gender === g ? 'var(--border-gold)' : 'var(--border-default)'}`,
                background: form.gender === g ? 'var(--gold-muted)' : 'var(--surface-3)',
                color: form.gender === g ? 'var(--gold)' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: form.gender === g ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Field label="City">
          <StyledInput
            type="text"
            placeholder="e.g. London"
            value={form.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </Field>
        <Field label="Country">
          <StyledInput
            type="text"
            placeholder="e.g. UK"
            value={form.country}
            onChange={(e) => update({ country: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Nationality">
        <StyledInput
          type="text"
          placeholder="e.g. British"
          value={form.nationality}
          onChange={(e) => update({ nationality: e.target.value })}
        />
      </Field>
      <Field label="Marital status">
        <ChipGroup
          options={['Never married', 'Divorced', 'Widowed']}
          value={form.maritalStatus}
          onChange={(val) => update({ maritalStatus: val as string })}
        />
      </Field>
      {form.maritalStatus !== 'Never married' && (
        <Field label="Has children?">
          <ToggleGroup
            value={form.hasChildren}
            onChange={(val) => update({ hasChildren: val })}
          />
        </Field>
      )}
      <Field label="Height">
        <StyledSelect
          value={form.height}
          onChange={(e) => update({ height: e.target.value })}
        >
          <option value="">Select height…</option>
          {HEIGHT_OPTIONS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </StyledSelect>
      </Field>
      <Field label="Living situation">
        <ChipGroup
          options={['With family', 'Independently', 'With flatmates']}
          value={form.livingSituation}
          onChange={(val) => update({ livingSituation: val as string })}
        />
      </Field>
    </>
  )
}

function Step2({
  form,
  update,
}: {
  form: AddProfileForm
  update: (patch: Partial<AddProfileForm>) => void
}) {
  return (
    <>
      <Field label="Ethnicity" hint="'British Pakistani' = Pakistani heritage, raised in the UK. Choose whichever best reflects your background.">
        <div style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>British-raised</p>
          <ChipGroup
            options={ETHNICITY_OPTIONS.filter(o => o.startsWith('British'))}
            value={form.ethnicity}
            onChange={(val) => update({ ethnicity: val as string })}
          />
        </div>
        <div style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Internationally raised</p>
          <ChipGroup
            options={ETHNICITY_OPTIONS.filter(o => !o.startsWith('British') && !['White British / European','Mixed heritage','Other'].includes(o))}
            value={form.ethnicity}
            onChange={(val) => update({ ethnicity: val as string })}
          />
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Other</p>
          <ChipGroup
            options={['White British / European','Mixed heritage','Other']}
            value={form.ethnicity}
            onChange={(val) => update({ ethnicity: val as string })}
          />
        </div>
      </Field>
      <Field label="Languages spoken">
        <ChipGroup
          options={LANGUAGE_OPTIONS}
          value={form.languagesSpoken}
          onChange={(val) => update({ languagesSpoken: val as string[] })}
          multi
        />
      </Field>
      <Field label="Profession">
        <StyledInput
          type="text"
          placeholder="e.g. Software engineer"
          value={form.profession}
          onChange={(e) => update({ profession: e.target.value })}
        />
      </Field>
      <Field label="Education level">
        <ChipGroup
          options={EDUCATION_OPTIONS}
          value={form.educationLevel}
          onChange={(val) => update({ educationLevel: val as string })}
        />
      </Field>
      <Field label="Institution" hint="Optional — university, school, or professional body">
        <StyledInput
          type="text"
          placeholder="e.g. University of Manchester"
          value={form.institution}
          onChange={(e) => update({ institution: e.target.value })}
        />
      </Field>
    </>
  )
}

function Step3({
  form,
  update,
}: {
  form: AddProfileForm
  update: (patch: Partial<AddProfileForm>) => void
}) {
  return (
    <>
      <Field label="School of thought" required>
        <ChipGroup
          options={SCHOOL_OPTIONS}
          value={form.schoolOfThought}
          onChange={(val) => update({ schoolOfThought: val as string })}
        />
      </Field>
      <Field label="Religiosity" required>
        <ChipGroup
          options={['steadfast', 'practising', 'striving']}
          value={form.religiosity}
          onChange={(val) => update({ religiosity: val as string })}
        />
      </Field>
      <Field label="Prayer regularity" required>
        <ChipGroup
          options={['Yes, regularly', 'Mostly', 'Working on it']}
          value={form.prayerRegularity}
          onChange={(val) => update({ prayerRegularity: val as string })}
        />
      </Field>
      {form.gender === 'female' && (
        <Field label="Wears hijab?">
          <ToggleGroup
            value={form.wearsHijab}
            onChange={(val) => update({ wearsHijab: val })}
          />
        </Field>
      )}
      {form.gender === 'male' && (
        <Field label="Keeps beard?">
          <ToggleGroup
            value={form.keepsBeard}
            onChange={(val) => update({ keepsBeard: val })}
          />
        </Field>
      )}
    </>
  )
}

function Step4({
  form,
  update,
}: {
  form: AddProfileForm
  update: (patch: Partial<AddProfileForm>) => void
}) {
  return (
    <>
      <Field label="Open to relocation?" required>
        <ChipGroup
          options={['Yes', 'Possibly', 'No']}
          value={form.openToRelocation}
          onChange={(val) => update({ openToRelocation: val as string })}
        />
      </Field>
      <Field label="Open to partner having children?">
        <ChipGroup
          options={['Yes', 'Possibly', 'No']}
          value={form.openToPartnersChildren}
          onChange={(val) => update({ openToPartnersChildren: val as string })}
        />
      </Field>
      {form.gender === 'male' && (
        <Field label="Polygamy openness">
          <ChipGroup
            options={['No', 'Open to discussion', 'Yes']}
            value={form.polygamyOpenness}
            onChange={(val) => update({ polygamyOpenness: val as string })}
          />
        </Field>
      )}
    </>
  )
}

function Step5({
  form,
  update,
}: {
  form: AddProfileForm
  update: (patch: Partial<AddProfileForm>) => void
}) {
  const wc = wordCount(form.bio)
  const tooMany = wc > 500

  return (
    <>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
        This section is optional. Write naturally about yourself — your values, interests, or what
        you&apos;re looking for. Keep it genuine.
      </p>
      <Field label="About me">
        <StyledTextarea
          placeholder="Describe yourself in your own words… (50–500 words)"
          value={form.bio}
          onChange={(e) => update({ bio: e.target.value })}
          rows={8}
        />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: tooMany ? 'var(--status-error)' : 'var(--text-muted)' }}>
          {wc > 0 ? `${wc} / 500 words` : ''}
          {tooMany ? ` — please keep to 500 words or fewer` : ''}
        </span>
      </div>
      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        No contact details, social handles, or external links.
      </p>
    </>
  )
}

function Step6({
  form,
  update,
}: {
  form: AddProfileForm
  update: (patch: Partial<AddProfileForm>) => void
}) {
  return (
    <>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
        All preferences are optional and help us surface more relevant profiles.
      </p>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Preferred age range</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StyledInput
            type="number"
            placeholder="Min"
            min={18}
            max={99}
            value={form.prefAgeMin}
            onChange={(e) => update({ prefAgeMin: e.target.value })}
            style={{ width: '90px' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
          <StyledInput
            type="number"
            placeholder="Max"
            min={18}
            max={99}
            value={form.prefAgeMax}
            onChange={(e) => update({ prefAgeMax: e.target.value })}
            style={{ width: '90px' }}
          />
        </div>
      </div>
      <Field label="Preferred location">
        <StyledInput
          type="text"
          placeholder="e.g. London, UK — or leave blank for open"
          value={form.prefLocation}
          onChange={(e) => update({ prefLocation: e.target.value })}
        />
      </Field>
      <Field label="Preferred ethnicity">
        <StyledInput
          type="text"
          placeholder="e.g. Open, Pakistani, Arab…"
          value={form.prefEthnicity}
          onChange={(e) => update({ prefEthnicity: e.target.value })}
        />
      </Field>
      <Field label="Preferred school of thought">
        <ChipGroup
          options={SCHOOL_OPTIONS}
          value={form.prefSchoolOfThought}
          onChange={(val) => update({ prefSchoolOfThought: val as string[] })}
          multi
        />
      </Field>
      <Field label="Open to partner relocating?">
        <ChipGroup
          options={['Yes', 'Possibly', 'No']}
          value={form.prefRelocation}
          onChange={(val) => update({ prefRelocation: val as string })}
        />
      </Field>
      <Field label="Open to partner having children?">
        <ChipGroup
          options={['Yes', 'Possibly', 'No']}
          value={form.prefPartnerChildren}
          onChange={(val) => update({ prefPartnerChildren: val as string })}
        />
      </Field>
    </>
  )
}

function Step7({
  form,
  onEdit,
}: {
  form: AddProfileForm
  onEdit: (n: number) => void
}) {
  return (
    <>
      <ReviewSection title="Basic info" stepIndex={0} onEdit={onEdit}>
        <ReviewRow label="Name" value={[form.firstName, form.lastName].filter(Boolean).join(' ') || null} />
        <ReviewRow label="Date of birth" value={form.dateOfBirth || null} />
        <ReviewRow label="Gender" value={form.gender || null} />
        <ReviewRow label="Location" value={[form.city, form.country].filter(Boolean).join(', ') || null} />
        <ReviewRow label="Nationality" value={form.nationality || null} />
        <ReviewRow label="Marital status" value={form.maritalStatus || null} />
        {form.maritalStatus !== 'Never married' && (
          <ReviewRow label="Has children" value={form.hasChildren === null ? null : form.hasChildren ? 'Yes' : 'No'} />
        )}
        <ReviewRow label="Height" value={form.height || null} />
        <ReviewRow label="Living situation" value={form.livingSituation || null} />
      </ReviewSection>

      <ReviewSection title="Background" stepIndex={1} onEdit={onEdit}>
        <ReviewRow label="Ethnicity" value={form.ethnicity || null} />
        <ReviewRow label="Languages" value={form.languagesSpoken.length > 0 ? form.languagesSpoken.join(', ') : null} />
        <ReviewRow label="Profession" value={form.profession || null} />
        <ReviewRow label="Education" value={form.educationLevel || null} />
        <ReviewRow label="Institution" value={form.institution || null} />
      </ReviewSection>

      <ReviewSection title="Faith & practice" stepIndex={2} onEdit={onEdit}>
        <ReviewRow label="School of thought" value={form.schoolOfThought || null} />
        <ReviewRow label="Religiosity" value={form.religiosity || null} />
        <ReviewRow label="Prayer regularity" value={form.prayerRegularity || null} />
        {form.gender === 'female' && (
          <ReviewRow label="Wears hijab" value={form.wearsHijab === null ? null : form.wearsHijab ? 'Yes' : 'No'} />
        )}
        {form.gender === 'male' && (
          <ReviewRow label="Keeps beard" value={form.keepsBeard === null ? null : form.keepsBeard ? 'Yes' : 'No'} />
        )}
      </ReviewSection>

      <ReviewSection title="Lifestyle" stepIndex={3} onEdit={onEdit}>
        <ReviewRow label="Open to relocation" value={form.openToRelocation || null} />
        <ReviewRow label="Partner's children" value={form.openToPartnersChildren || null} />
        {form.gender === 'male' && (
          <ReviewRow label="Polygamy openness" value={form.polygamyOpenness || null} />
        )}
      </ReviewSection>

      <ReviewSection title="About me" stepIndex={4} onEdit={onEdit}>
        <div style={{ padding: '10px 0', fontSize: '13px', color: form.bio ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.6, borderBottom: '0.5px solid var(--border-default)' }}>
          {form.bio || 'Not provided'}
        </div>
      </ReviewSection>

      <ReviewSection title="Preferences" stepIndex={5} onEdit={onEdit}>
        <ReviewRow
          label="Age range"
          value={form.prefAgeMin || form.prefAgeMax ? `${form.prefAgeMin || '?'} – ${form.prefAgeMax || '?'}` : null}
        />
        <ReviewRow label="Location" value={form.prefLocation || null} />
        <ReviewRow label="Ethnicity" value={form.prefEthnicity || null} />
        <ReviewRow label="School of thought" value={form.prefSchoolOfThought.length > 0 ? form.prefSchoolOfThought.join(', ') : null} />
        <ReviewRow label="Relocation" value={form.prefRelocation || null} />
        <ReviewRow label="Partner children" value={form.prefPartnerChildren || null} />
      </ReviewSection>
    </>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, form: AddProfileForm): string {
  switch (step) {
    case 0: // Basic info
      if (!form.firstName.trim()) return 'First name is required.'
      if (!form.gender) return 'Please select a gender.'
      if (form.dateOfBirth && !isAtLeast18(form.dateOfBirth)) return 'The family member must be at least 18 years old.'
      return ''
    case 1: // Background
      return ''
    case 2: // Faith
      if (!form.schoolOfThought) return 'Please select a school of thought.'
      if (!form.religiosity) return 'Please select a religiosity level.'
      return ''
    case 3: // Lifestyle
      if (!form.openToRelocation) return 'Please answer the relocation question.'
      return ''
    case 4: // About me
      if (wordCount(form.bio) > 500) return `Bio must be 500 words or fewer. Currently ${wordCount(form.bio)} words.`
      return ''
    case 5: // Preferences
      return ''
    case 6: // Review
      return ''
    default:
      return ''
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddProfilePage() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [sidebarProfile, setSidebarProfile] = useState<{ display_initials: string; gender: string | null; first_name: string | null } | null>(null)
  const [managedProfiles, setManagedProfiles] = useState<ManagedProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introCount, setIntroCount] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)
  const [profileCount, setProfileCount] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const [isChildPath, setIsChildPath] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan>('free')

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<AddProfileForm>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // Post-submit invite flow
  const [inviteStep, setInviteStep] = useState<'prompt' | 'loading' | 'link' | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: profileRows } = await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, gender, status')
        .eq('user_id', user.id)

      if (!profileRows?.length) { router.replace('/pending'); return }

      const activeId = settings?.active_profile_id ?? profileRows[0].id
      const active = profileRows.find(p => p.id === activeId) ?? profileRows[0]
      setSidebarProfile({ display_initials: active.display_initials, gender: active.gender, first_name: active.first_name })
      setActiveProfileId(activeId)
      setManagedProfiles(profileRows.map(p => ({ id: p.id, display_initials: p.display_initials, first_name: p.first_name, gender: p.gender, status: p.status })))
      setProfileCount(profileRows.length)

      // Check registration path — child-path users are self-registered candidates;
      // "Add family member" is not applicable to them (it's for guardian-managed accounts).
      const { data: familyAccount } = await supabase
        .from('zawaaj_family_accounts')
        .select('registration_path')
        .eq('primary_user_id', user.id)
        .maybeSingle()
      if (familyAccount?.registration_path === 'child') {
        setIsChildPath(true)
        setAuthChecked(true)
        return
      }

      // Fetch subscription to determine plan and check family member limit
      const { data: subRow } = await supabase
        .from('zawaaj_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .maybeSingle()
      const plan: Plan = (subRow?.plan as Plan | null) ?? 'free'
      setCurrentPlan(plan)
      if (profileRows.length >= getPlanConfig(plan).maxFamilyMembers) {
        setBlocked(true)
      }

      const [slRes, irRes] = await Promise.all([
        supabase.from('zawaaj_saved_profiles').select('id', { count: 'exact', head: true }).eq('profile_id', active.id),
        supabase.from('zawaaj_introduction_requests').select('id', { count: 'exact', head: true }).eq('requesting_profile_id', active.id).in('status', ['pending', 'accepted']),
      ])
      setShortlistCount(slRes.count ?? 0)
      setIntroCount(irRes.count ?? 0)
      setAuthChecked(true)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch: Partial<AddProfileForm>) {
    setForm(prev => {
      const next = { ...prev, ...patch }
      // Never-married implies no children — clear the field so it's not asked/sent.
      if (patch.maritalStatus === 'Never married') {
        next.hasChildren = false
      }
      return next
    })
  }

  function handleNext() {
    const err = validateStep(step, form)
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  function handleBack() {
    setError(null)
    setStep(s => s - 1)
  }

  function jumpToStep(n: number) {
    setError(null)
    setStep(n)
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/add-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json() as { error?: string; success?: boolean }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return }
    setSuccess(true)
    setInviteStep('prompt')
  }

  async function handleGenerateInvite() {
    setInviteStep('loading')
    setInviteError(null)
    try {
      const res = await fetch('/api/family/invite-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invited_name: form.firstName || null }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        setInviteError(json.error ?? 'Could not create invite link.')
        setInviteStep('prompt')
        return
      }
      setInviteUrl(json.url)
      setInviteStep('link')
    } catch {
      setInviteError('Something went wrong — please try again.')
      setInviteStep('prompt')
    }
  }

  function handleCopyInvite() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).catch(() => {/* ignore */})
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute="/add-profile" shortlistCount={0} introRequestsCount={0} profile={null} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
        </main>
      </div>
    )
  }

  if (isChildPath) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar
          activeRoute="/add-profile"
          shortlistCount={shortlistCount}
          introRequestsCount={introCount}
          profile={sidebarProfile}
          managedProfiles={managedProfiles}
          activeProfileId={activeProfileId}
        />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 440 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="var(--gold)" strokeWidth="1.5" />
                <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
              Your profile is already set up
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 24 }}>
              Adding extra profiles is for guardian accounts that manage multiple family members.
              As a self-registered member, your account is linked to a single candidate profile — yours.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6, marginBottom: 28 }}>
              If a family member needs their own profile, they can register separately at{' '}
              <a href="/signup" style={{ color: 'var(--gold)', textDecoration: 'none' }}>zawaaj.uk/signup</a>.
            </p>
            <a href="/my-profile" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 10,
              background: 'var(--gold-muted)', border: '0.5px solid var(--border-gold)',
              color: 'var(--gold)', fontWeight: 500, fontSize: 13.5, textDecoration: 'none',
            }}>
              View my profile
            </a>
          </div>
        </main>
      </div>
    )
  }

  if (blocked) {
    const maxAllowed = getPlanConfig(currentPlan).maxFamilyMembers
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar
          activeRoute="/add-profile"
          shortlistCount={shortlistCount}
          introRequestsCount={introCount}
          profile={sidebarProfile}
          managedProfiles={managedProfiles}
          activeProfileId={activeProfileId}
        />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Profile limit reached</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              Your current plan allows {maxAllowed} family profile{maxAllowed === 1 ? '' : 's'}.
              Upgrade to Premium to add up to 4 family members.
            </p>
            <a href="/settings?tab=plan" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 10,
              background: 'var(--gold)', color: '#fff', fontWeight: 600, fontSize: 14,
              textDecoration: 'none',
            }}>
              Upgrade to Premium
            </a>
          </div>
        </main>
      </div>
    )
  }

  const totalSteps = STEPS.length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute={pathname ?? '/add-profile'}
        shortlistCount={shortlistCount}
        introRequestsCount={introCount}
        profile={sidebarProfile}
        managedProfiles={managedProfiles}
        activeProfileId={activeProfileId}
      />
      <main style={{ marginLeft: 200, flex: 1, padding: '40px 28px 80px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 28 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Add family member
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 32px' }}>
            Add a profile for a family member. It will be reviewed by our admin team before becoming visible.
          </p>

          {profileCount >= 4 ? (
            <div style={{ padding: '20px 24px', borderRadius: 13, background: 'var(--surface-2)', border: '0.5px solid var(--border-default)' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Maximum reached</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>You can manage up to 4 profiles per account. Please contact admin if you need assistance.</p>
            </div>
          ) : success ? (
            <div style={{ padding: 28, borderRadius: 13, background: 'var(--surface-2)', border: '0.5px solid var(--border-default)' }}>
              {/* Submitted confirmation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 14px', borderRadius: 9, background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.25)' }}>
                <span style={{ fontSize: 18, color: 'var(--status-success)' }}>✓</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-success)', margin: 0 }}>Profile submitted for review</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>The admin team will review and approve the profile shortly.</p>
                </div>
              </div>

              {inviteStep === 'prompt' && (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Invite {form.firstName || 'them'} to access their profile?
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                    You can send {form.firstName || 'them'} a private link so they can create their own login, track introductions, and see their profile as others see it.
                  </p>
                  {inviteError && (
                    <p style={{ fontSize: 12, color: 'var(--status-error)', marginBottom: 12 }}>{inviteError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleGenerateInvite}
                      style={{ flex: '1 1 auto', padding: '11px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: 'var(--surface)', cursor: 'pointer' }}
                    >
                      Yes, create invite link
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/browse')}
                      style={{ flex: '1 1 auto', padding: '11px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      Skip for now
                    </button>
                  </div>
                </>
              )}

              {inviteStep === 'loading' && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Creating invite link…</p>
              )}

              {inviteStep === 'link' && inviteUrl && (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Share this link with {form.firstName || 'them'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
                    This link expires in 7 days. The candidate will be able to create a login and access their profile.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      readOnly
                      value={inviteUrl}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12,
                        background: 'var(--surface-3)', border: '0.5px solid var(--border-default)',
                        color: 'var(--text-secondary)', outline: 'none', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                      onFocus={e => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyInvite}
                      style={{
                        flexShrink: 0, padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: inviteCopied ? 'rgba(74,222,128,0.12)' : 'var(--gold-muted)',
                        border: inviteCopied ? '0.5px solid rgba(74,222,128,0.3)' : '0.5px solid var(--border-gold)',
                        color: inviteCopied ? 'var(--status-success)' : 'var(--gold)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {inviteCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/browse')}
                    style={{ width: '100%', padding: '11px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Step {step + 1} of {totalSteps}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{STEPS[step]}</span>
                </div>
                <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((step + 1) / totalSteps) * 100}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Step card */}
              <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 28 }}>
                {step === 0 && <Step1 form={form} update={update} />}
                {step === 1 && <Step2 form={form} update={update} />}
                {step === 2 && <Step3 form={form} update={update} />}
                {step === 3 && <Step4 form={form} update={update} />}
                {step === 4 && <Step5 form={form} update={update} />}
                {step === 5 && <Step6 form={form} update={update} />}
                {step === 6 && <Step7 form={form} onEdit={jumpToStep} />}
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 9, background: 'var(--status-error-bg)', border: '0.5px solid var(--status-error-br)', fontSize: 13, color: 'var(--status-error)' }}>
                  {error}
                </div>
              )}

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{ flex: 1, padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 500, background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Back
                  </button>
                )}
                {step < totalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{ flex: 1, padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: 'var(--surface)', cursor: 'pointer' }}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ flex: 1, padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: 'var(--surface)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                  >
                    {loading ? 'Submitting…' : 'Submit for review'}
                  </button>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: '16px 0 0' }}>
                The admin team will review and approve the profile. You can manage up to 4 profiles per account.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
