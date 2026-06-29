'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { FamilyRow } from './page'

// ─── Constants ────────────────────────────────────────────────────────────────

const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: 'Mother',
  grandmother: 'Grandmother',
  aunt: 'Aunt',
  female_guardian: 'Female Guardian',
  father: 'Father',
  male_guardian: 'Male Guardian',
}

const MALE_RELATIONSHIPS = ['father', 'male_guardian']

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_email_verification: { bg: 'rgba(251,146,60,0.15)',  text: '#ea580c' },
  pending_approval:           { bg: 'rgba(234,179,8,0.15)',   text: '#ca8a04' },
  active:                     { bg: 'rgba(34,197,94,0.15)',   text: '#16a34a' },
  suspended:                  { bg: 'rgba(239,68,68,0.15)',   text: '#dc2626' },
  pending_contact_details:    { bg: 'rgba(99,102,241,0.15)',  text: '#6366f1' },
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  voluntary: { bg: 'rgba(255,255,255,0.05)', text: 'var(--admin-muted)' },
  plus:      { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  premium:   { bg: 'rgba(184,150,12,0.15)',  text: '#B8960C' },
}

// ─── Small reusable components ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.08)', text: 'var(--admin-muted)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

const PLAN_DISPLAY: Record<string, string> = {
  voluntary: 'Free',
  free:      'Free',
  plus:      'Plus',
  premium:   'Premium',
}

function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_COLORS[plan] ?? PLAN_COLORS.voluntary
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, whiteSpace: 'nowrap',
    }}>
      {PLAN_DISPLAY[plan] ?? plan}
    </span>
  )
}

const READINESS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  candidate_only:           { label: 'Candidate only',        bg: 'rgba(239,68,68,0.12)',    text: '#dc2626' },
  representative_invited:   { label: 'Rep invited',           bg: 'rgba(234,179,8,0.15)',    text: '#ca8a04' },
  representative_linked:    { label: 'Rep linked',            bg: 'rgba(99,102,241,0.15)',   text: '#818cf8' },
  intro_ready:              { label: 'Intro ready',           bg: 'rgba(34,197,94,0.15)',    text: '#16a34a' },
}

function ReadinessBadge({ state }: { state: string }) {
  const c = READINESS_CONFIG[state] ?? { label: state.replace(/_/g, ' '), bg: 'rgba(255,255,255,0.08)', text: 'var(--admin-muted)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

const CLAIM_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  not_sent: { label: 'Not invited', bg: 'rgba(255,255,255,0.06)', text: 'var(--admin-muted)' },
  sent:     { label: 'Invite sent', bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6' },
  claimed:  { label: 'Claimed',     bg: 'rgba(34,197,94,0.15)',   text: '#16a34a' },
}

function ClaimStatusBadge({ status }: { status: string }) {
  const c = CLAIM_CONFIG[status] ?? CLAIM_CONFIG.not_sent
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
      background: c.bg, color: c.text, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

function ImportedBadge() {
  return (
    <span title="Created via CSV import" style={{
      fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
      background: 'rgba(184,150,12,0.15)', color: '#B8960C', whiteSpace: 'nowrap',
      letterSpacing: '0.06em',
    }}>
      IMPORTED
    </span>
  )
}

// Build a wa.me URL. Best-effort UK normalisation of the contact number; falls
// back to a recipient-less share (Khalil picks the chat) when no usable number.
function whatsappUrl(rawNumber: string | null, message: string): string {
  const text = encodeURIComponent(message)
  let digits = (rawNumber ?? '').replace(/[^\d]/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0') && digits.length === 11) digits = `44${digits.slice(1)}` // UK mobile
  if (digits.length >= 10 && digits.length <= 15) return `https://wa.me/${digits}?text=${text}`
  return `https://wa.me/?text=${text}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function Detail({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: 'var(--admin-muted)', minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: warning ? '#dc2626' : 'var(--admin-text)' }}>{value}</span>
    </div>
  )
}

function ActionBtn({ label, color, bg, loading, onClick }: {
  label: string; color: string; bg: string; loading: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
      background: bg, color, opacity: loading ? 0.6 : 1,
    }}>
      {loading ? 'Saving…' : label}
    </button>
  )
}

// ─── Input helpers ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
  borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'block',
}

// ─── Create Family Account Modal ──────────────────────────────────────────────

interface CreateFamilyForm {
  contact_full_name: string
  contact_relationship: string
  contact_number: string
  contact_email: string
  female_contact_name: string
  female_contact_number: string
  female_contact_relationship: string
  father_explanation: string
  no_female_contact_flag: boolean
  plan: string
  registration_path: string
  terms_agreed: boolean
}

const BLANK_CREATE: CreateFamilyForm = {
  contact_full_name: '',
  contact_relationship: 'mother',
  contact_number: '',
  contact_email: '',
  female_contact_name: '',
  female_contact_number: '',
  female_contact_relationship: '',
  father_explanation: '',
  no_female_contact_flag: false,
  plan: 'voluntary',
  registration_path: 'parent',
  terms_agreed: true,
}

// Hoisted out of CreateFamilyModal so they are stable module-level components
// (defining components inside render remounts inputs every keystroke → focus loss,
// and trips react-hooks/static-components).
function FField({ label, field, form, setForm, type = 'text', placeholder = '' }: {
  label: string; field: keyof CreateFamilyForm
  form: CreateFamilyForm; setForm: React.Dispatch<React.SetStateAction<CreateFamilyForm>>
  type?: string; placeholder?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  )
}

function FSelect({ label, field, form, setForm, options }: {
  label: string; field: keyof CreateFamilyForm
  form: CreateFamilyForm; setForm: React.Dispatch<React.SetStateAction<CreateFamilyForm>>
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={form[field] as string}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{ ...inputStyle, appearance: 'none' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function CreateFamilyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (row: FamilyRow) => void
}) {
  const [form, setForm] = useState<CreateFamilyForm>({ ...BLANK_CREATE })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMale = MALE_RELATIONSHIPS.includes(form.contact_relationship)

  async function save() {
    if (!form.contact_full_name.trim()) { setError('Contact name is required'); return }
    if (!form.contact_number.trim())    { setError('Contact number is required'); return }
    if (!form.contact_email.trim())     { setError('Contact email is required'); return }
    if (isMale && !form.no_female_contact_flag &&
        (!form.female_contact_name.trim() || !form.female_contact_number.trim())) {
      setError('Female contact details are required, or tick "No female contact"'); return
    }
    if (isMale && form.no_female_contact_flag && !form.father_explanation.trim()) {
      setError('Please explain why there is no female contact'); return
    }

    setLoading(true); setError(null)
    const res = await fetch('/api/admin/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        female_contact_name: form.female_contact_name || null,
        female_contact_number: form.female_contact_number || null,
        female_contact_relationship: form.female_contact_relationship || null,
        father_explanation: form.father_explanation || '',
      }),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to create'); return }
    onCreated(json.family as FamilyRow)
    onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 16, width: '100%', maxWidth: 520, padding: 28,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 20px' }}>
          Create Family Account
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FField form={form} setForm={setForm} label="Full name" field="contact_full_name" placeholder="Fatima Khan" />
            <FSelect form={form} setForm={setForm} label="Relationship" field="contact_relationship" options={[
              { value: 'mother',          label: 'Mother'           },
              { value: 'grandmother',     label: 'Grandmother'      },
              { value: 'aunt',            label: 'Aunt'             },
              { value: 'female_guardian', label: 'Female Guardian'  },
              { value: 'father',          label: 'Father'           },
              { value: 'male_guardian',   label: 'Male Guardian'    },
            ]} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FField form={form} setForm={setForm} label="Contact number" field="contact_number" placeholder="+44 7700 900000" />
            <FField form={form} setForm={setForm} label="Contact email" field="contact_email" type="email" placeholder="family@email.com" />
          </div>

          {isMale && (
            <>
              <p style={{ fontSize: 12, color: '#ca8a04', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                Male primary contact — female contact details required (Islamic safeguarding).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FField form={form} setForm={setForm} label="Female contact name" field="female_contact_name" placeholder="Aisha Khan" />
                <FField form={form} setForm={setForm} label="Female contact number" field="female_contact_number" placeholder="+44 7700 900001" />
              </div>

              <FSelect form={form} setForm={setForm} label="Female contact relationship" field="female_contact_relationship" options={[
                { value: '',                 label: '— Select —'        },
                { value: 'grandmother',      label: 'Grandmother'       },
                { value: 'aunt',             label: 'Aunt'              },
                { value: 'female_guardian',  label: 'Female Guardian'   },
                { value: 'sister',           label: 'Sister'            },
                { value: 'other_female_relative', label: 'Other female relative' },
              ]} />

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.no_female_contact_flag}
                    onChange={e => setForm(f => ({ ...f, no_female_contact_flag: e.target.checked }))}
                  />
                  <span style={{ fontSize: 13, color: 'var(--admin-text)' }}>
                    No female contact available
                  </span>
                </label>
                {form.no_female_contact_flag && (
                  <div style={{ marginTop: 8 }}>
                    <FField form={form} setForm={setForm} label="Explanation" field="father_explanation" placeholder="Brief explanation why no female contact is available" />
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FSelect form={form} setForm={setForm} label="Plan" field="plan" options={[
              { value: 'voluntary', label: 'Voluntary (free)' },
              { value: 'plus',      label: 'Plus'             },
              { value: 'premium',   label: 'Premium'          },
            ]} />
            <FSelect form={form} setForm={setForm} label="Registration path" field="registration_path" options={[
              { value: 'parent', label: 'Parent-led' },
              { value: 'child',  label: 'Child-led'  },
            ]} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.terms_agreed}
              onChange={e => setForm(f => ({ ...f, terms_agreed: e.target.checked }))}
            />
            <span style={{ fontSize: 13, color: 'var(--admin-text)' }}>Terms agreed (admin-confirmed)</span>
          </label>
        </div>

        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--admin-border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--admin-muted)',
          }}>
            Cancel
          </button>
          <button onClick={save} disabled={loading} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: '#B8960C', color: '#111', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Generate Invite Modal ────────────────────────────────────────────────────

function InviteModal({
  family,
  onClose,
}: {
  family: FamilyRow
  onClose: () => void
}) {
  const [invitedName, setInvitedName]   = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  const [invitedPhone, setInvitedPhone] = useState('')
  const [loading, setLoading]           = useState(false)
  const [inviteUrl, setInviteUrl]       = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent]       = useState(false)
  const [emailError, setEmailError]     = useState<string | null>(null)

  async function generate() {
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/invite-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_account_id: family.id,
        purpose: 'child_invite',
        invited_name:  invitedName  || null,
        invited_email: invitedEmail || null,
        invited_phone: invitedPhone || null,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to generate token'); return }
    setInviteUrl(json.url as string)
  }

  function copy() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  async function emailToCandidate() {
    if (!inviteUrl || !invitedEmail) return
    setEmailSending(true); setEmailError(null)
    const res = await fetch('/api/admin/invite-tokens/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invite_url: inviteUrl,
        candidate_email: invitedEmail,
        candidate_name: invitedName || null,
        family_contact_name: family.contact_full_name,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setEmailSending(false)
    if (!res.ok) { setEmailError(json.error ?? 'Failed to send email'); return }
    setEmailSent(true)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 16, width: '100%', maxWidth: 460, padding: 28,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 6px' }}>
          Generate invite link
        </h2>
        <p style={{ fontSize: 13, color: 'var(--admin-muted)', margin: '0 0 20px' }}>
          For <strong style={{ color: 'var(--admin-text)' }}>{family.contact_full_name}</strong> — the link lets a candidate sign in and link their profile to this family account.
        </p>

        {!inviteUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Candidate name (optional)</label>
              <input value={invitedName} onChange={e => setInvitedName(e.target.value)} placeholder="e.g. Mariam Khan" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Candidate email (optional)</label>
                <input type="email" value={invitedEmail} onChange={e => setInvitedEmail(e.target.value)} placeholder="mariam@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Candidate phone (optional)</label>
                <input value={invitedPhone} onChange={e => setInvitedPhone(e.target.value)} placeholder="+44 7700 900000" style={inputStyle} />
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--admin-border)', cursor: 'pointer',
                background: 'transparent', color: 'var(--admin-muted)',
              }}>Cancel</button>
              <button onClick={generate} disabled={loading} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: '#B8960C', color: '#111', opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Generating…' : 'Generate link'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 12 }}>
              ✓ Invite link created — expires in 7 days
            </p>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--admin-text)', flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {inviteUrl}
              </span>
              <button
                onClick={copy}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.1)',
                  color: copied ? '#16a34a' : 'var(--admin-text)',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--admin-muted)', marginTop: 10 }}>
              Share this link with the candidate. They must sign in to Zawaaj to accept.
            </p>

            {/* Email button — only shown if candidate email was provided */}
            {invitedEmail && (
              <div style={{ marginTop: 14 }}>
                {emailSent ? (
                  <p style={{ fontSize: 12, color: '#16a34a' }}>✓ Invitation emailed to {invitedEmail}</p>
                ) : (
                  <>
                    <button
                      onClick={emailToCandidate}
                      disabled={emailSending}
                      style={{
                        padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: '1px solid rgba(184,150,12,0.4)', cursor: emailSending ? 'not-allowed' : 'pointer',
                        background: 'rgba(184,150,12,0.08)', color: '#B8960C', opacity: emailSending ? 0.7 : 1,
                      }}
                    >
                      {emailSending ? 'Sending…' : `✉ Email invite to ${invitedEmail}`}
                    </button>
                    {emailError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{emailError}</p>}
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={onClose} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', background: '#B8960C', color: '#111',
              }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Email Family Modal ───────────────────────────────────────────────────────

function EmailFamilyModal({
  family,
  onClose,
}: {
  family: FamilyRow
  onClose: () => void
}) {
  const [subject, setSubject]   = useState('')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function send() {
    if (!subject.trim() || !message.trim()) { setError('Subject and message are required.'); return }
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: family.contact_email,
        recipient_name: family.contact_full_name,
        subject: subject.trim(),
        message: message.trim(),
      }),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to send email'); return }
    setSent(true)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 16, width: '100%', maxWidth: 520, padding: 28,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 4px' }}>
          Email to family
        </h2>
        <p style={{ fontSize: 13, color: 'var(--admin-muted)', margin: '0 0 20px' }}>
          To: <strong style={{ color: 'var(--admin-text)' }}>{family.contact_full_name}</strong>{' '}
          <span style={{ color: 'var(--admin-muted)' }}>({family.contact_email})</span>
        </p>

        {sent ? (
          <div>
            <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 16 }}>✓ Email sent to {family.contact_email}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', background: '#B8960C', color: '#111',
              }}>Done</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Update regarding your Zawaaj account"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                placeholder="Write your message here…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties}
              />
              <p style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 4 }}>
                The email will be sent from noreply@zawaaj.uk with Zawaaj branding.
              </p>
            </div>

            {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--admin-border)', cursor: 'pointer',
                background: 'transparent', color: 'var(--admin-muted)',
              }}>Cancel</button>
              <button onClick={send} disabled={loading} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: '#B8960C', color: '#111', opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Sending…' : 'Send email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Link Profile Modal ───────────────────────────────────────────────────────

interface ProfileSearchResult {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  status: string | null
  location: string | null
  family_account_id: string | null
}

function LinkProfileModal({
  family,
  onClose,
  onLinked,
}: {
  family: FamilyRow
  onClose: () => void
  onLinked: (profileId: string) => void
}) {
  const [query, setQuery]               = useState('')
  const [results, setResults]           = useState<ProfileSearchResult[]>([])
  const [searching, setSearching]       = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [linking, setLinking]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    const res = await fetch(`/api/admin/families/search-profiles?q=${encodeURIComponent(query)}`)
    const json = await res.json().catch(() => ({ profiles: [] }))
    setSearching(false)
    setResults(json.profiles ?? [])
  }

  async function linkProfile() {
    if (!selectedId) return
    setLinking(true); setError(null)
    const res = await fetch('/api/admin/families/link-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_account_id: family.id, profile_id: selectedId }),
    })
    const json = await res.json().catch(() => ({}))
    setLinking(false)
    if (!res.ok) { setError(json.error ?? 'Failed to link'); return }
    onLinked(selectedId)
    onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, maxHeight: '85vh', overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 6px' }}>
          Link profile to family account
        </h2>
        <p style={{ fontSize: 13, color: 'var(--admin-muted)', margin: '0 0 20px' }}>
          Search for an existing member profile and link them to{' '}
          <strong style={{ color: 'var(--admin-text)' }}>{family.contact_full_name}</strong>.
        </p>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search() }}
            placeholder="Name, initials, or email…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: searching || !query.trim() ? 'not-allowed' : 'pointer',
              background: query.trim() ? '#B8960C' : 'rgba(255,255,255,0.08)',
              color: query.trim() ? '#111' : 'var(--admin-muted)',
              opacity: searching ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {results.map(p => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_initials
              const isSelected = selectedId === p.id
              const alreadyLinked = !!p.family_account_id

              return (
                <div
                  key={p.id}
                  onClick={() => !alreadyLinked && setSelectedId(isSelected ? null : p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8, cursor: alreadyLinked ? 'not-allowed' : 'pointer',
                    border: `1px solid ${isSelected ? '#B8960C' : 'var(--admin-border)'}`,
                    background: isSelected ? 'rgba(184,150,12,0.07)' : 'rgba(255,255,255,0.02)',
                    opacity: alreadyLinked ? 0.5 : 1,
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: p.gender === 'female' ? '#EEEDFE' : '#E6F1FB',
                    color: p.gender === 'female' ? '#534AB7' : '#185FA5',
                  }}>
                    {p.display_initials}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {p.location ?? '—'} · <StatusBadge status={p.status ?? 'unknown'} />
                      {alreadyLinked && <span style={{ marginLeft: 6, color: '#ca8a04', fontWeight: 600 }}>Already linked</span>}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: 14, color: '#B8960C' }}>✓</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {results.length === 0 && query && !searching && (
          <p style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 16 }}>
            No profiles found for &ldquo;{query}&rdquo;.
          </p>
        )}

        {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--admin-border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--admin-muted)',
          }}>Cancel</button>
          <button
            onClick={linkProfile}
            disabled={!selectedId || linking}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: !selectedId || linking ? 'not-allowed' : 'pointer',
              background: selectedId ? '#B8960C' : 'rgba(255,255,255,0.08)',
              color: selectedId ? '#111' : 'var(--admin-muted)',
              opacity: linking ? 0.7 : 1,
            }}
          >
            {linking ? 'Linking…' : 'Link profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  families: FamilyRow[]
  archiveEnabled: boolean
  isSuperAdmin: boolean
}

export interface SendResult { id: string; name: string; ok: boolean; reason: string }

export function FamiliesClient({ families: initial, archiveEnabled, isSuperAdmin }: Props) {
  const [families, setFamilies]           = useState(initial)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<string>('all')
  const [readinessFilter, setReadinessFilter] = useState<string>('all')
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal state
  const [showCreate, setShowCreate]         = useState(false)
  const [inviteFamily, setInviteFamily]     = useState<FamilyRow | null>(null)
  const [linkFamily, setLinkFamily]         = useState<FamilyRow | null>(null)
  const [emailFamily, setEmailFamily]       = useState<FamilyRow | null>(null)
  const [deleteFamily, setDeleteFamily]     = useState<FamilyRow | null>(null)

  // ITEM 5 — claim-invite send: multi-select + per-family results + copy feedback.
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [sendingBatch, setSendingBatch]     = useState(false)
  const [sendResults, setSendResults]       = useState<SendResult[] | null>(null)
  const [copiedId, setCopiedId]             = useState<string | null>(null)

  // Archived rows are hidden everywhere except the dedicated "Archived" tab.
  const filtered = families.filter(f => {
    const isArchived = !!f.archived_at
    if (statusFilter === 'archived') { if (!isArchived) return false }
    else if (isArchived) return false

    const matchStatus = statusFilter === 'all' || statusFilter === 'archived' || f.status === statusFilter
    const matchReadiness = readinessFilter === 'all' || f.readiness_state === readinessFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      f.contact_full_name.toLowerCase().includes(q) ||
      f.contact_email.toLowerCase().includes(q) ||
      f.contact_number.includes(q) ||
      f.profiles.some(p => [p.first_name, p.last_name].filter(Boolean).join(' ').toLowerCase().includes(q))
    return matchStatus && matchReadiness && matchSearch
  })

  // Keep selection in sync with what's visible (e.g. after switching tabs).
  const visibleIds = new Set(filtered.map(f => f.id))
  const selectedVisible = [...selectedIds].filter(id => visibleIds.has(id))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    setSelectedIds(prev => {
      const allSelected = filtered.every(f => prev.has(f.id)) && filtered.length > 0
      if (allSelected) return new Set()
      return new Set(filtered.map(f => f.id))
    })
  }

  // POST a single send_magic_link; returns a normalised per-family result.
  async function sendOne(f: FamilyRow): Promise<SendResult> {
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_magic_link', family_account_id: f.id }),
      })
      if (res.ok) return { id: f.id, name: f.contact_full_name, ok: true, reason: 'Emailed' }
      const j = await res.json().catch(() => ({})) as { error?: string }
      return { id: f.id, name: f.contact_full_name, ok: false, reason: j.error ?? `HTTP ${res.status}` }
    } catch (err) {
      return { id: f.id, name: f.contact_full_name, ok: false, reason: err instanceof Error ? err.message : 'Network error' }
    }
  }

  async function sendInvite(f: FamilyRow) {
    setActionLoading(f.id)
    const r = await sendOne(f)
    setActionLoading(null)
    setSendResults([r])
    if (r.ok) setFamilies(prev => prev.map(x => x.id === f.id ? { ...x, claim_status: 'sent' } : x))
  }

  async function batchSend() {
    const targets = filtered.filter(f => selectedIds.has(f.id))
    if (targets.length === 0) return
    setSendingBatch(true)
    setSendResults(null)
    const results: SendResult[] = []
    for (const f of targets) results.push(await sendOne(f))
    setSendingBatch(false)
    setSendResults(results)
    const sentOk = new Set(results.filter(r => r.ok).map(r => r.id))
    if (sentOk.size > 0) {
      setFamilies(prev => prev.map(x => sentOk.has(x.id) ? { ...x, claim_status: 'sent' } : x))
    }
    setSelectedIds(new Set())
  }

  // Get-or-create a claim link WITHOUT emailing, for copy / WhatsApp.
  async function getClaimLink(f: FamilyRow): Promise<string | null> {
    const res = await fetch('/api/admin/activation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_claim_link', family_account_id: f.id }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      alert(j.error ?? 'Could not generate claim link')
      return null
    }
    const j = await res.json() as { claim_link?: string }
    return j.claim_link ?? null
  }

  async function copyClaimLink(f: FamilyRow) {
    setActionLoading(f.id)
    const link = await getClaimLink(f)
    setActionLoading(null)
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(f.id)
      setTimeout(() => setCopiedId(c => (c === f.id ? null : c)), 2000)
    } catch {
      window.prompt('Copy this claim link:', link)
    }
  }

  async function shareWhatsApp(f: FamilyRow) {
    setActionLoading(f.id)
    const link = await getClaimLink(f)
    setActionLoading(null)
    if (!link) return
    const msg = `Assalamu alaikum ${f.contact_full_name}, here is your Zawaaj claim link to set up your family account: ${link}`
    window.open(whatsappUrl(f.contact_number, msg), '_blank', 'noopener')
  }

  async function archiveFamily(f: FamilyRow, archive: boolean) {
    setActionLoading(f.id)
    const res = await fetch(`/api/admin/families/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: archive ? 'archive' : 'restore' }),
    })
    setActionLoading(null)
    if (res.ok) {
      setFamilies(prev => prev.map(x => x.id === f.id
        ? { ...x, archived_at: archive ? new Date().toISOString() : null }
        : x))
      setExpandedId(null)
    } else {
      const j = await res.json().catch(() => ({})) as { error?: string }
      alert(j.error ?? (archive ? 'Archive failed' : 'Restore failed'))
    }
  }

  function onDeleted(id: string) {
    setFamilies(prev => prev.filter(x => x.id !== id))
    setDeleteFamily(null)
    setExpandedId(null)
  }

  async function resendVerification(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch('/api/register/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyAccountId: id }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        alert(json.error ?? 'Failed to resend verification email')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function updateStatus(id: string, status: string) {
    setActionLoading(id)
    const res = await fetch('/api/admin/families', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setActionLoading(null)
    if (res.ok) setFamilies(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  function handleCreated(row: FamilyRow) {
    setFamilies(prev => [row, ...prev])
    setExpandedId(row.id)
  }

  function handleLinked(familyId: string, profileId: string) {
    // Refresh: the newly linked profile will appear on next full page load.
    // For now, increment the profile count optimistically.
    setFamilies(prev => prev.map(f =>
      f.id === familyId
        ? { ...f, profiles: [...f.profiles, { id: profileId, display_initials: '…', first_name: null, last_name: null, gender: null, status: 'pending', duplicate_flag: null }] }
        : f
    ))
  }

  // Live (non-archived) counts for the status tabs; archived counted separately.
  const live = families.filter(f => !f.archived_at)
  const counts = {
    all: live.length,
    pending_email_verification: live.filter(f => f.status === 'pending_email_verification').length,
    pending_approval: live.filter(f => f.status === 'pending_approval').length,
    active: live.filter(f => f.status === 'active').length,
    suspended: live.filter(f => f.status === 'suspended').length,
    archived: families.filter(f => !!f.archived_at).length,
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            Family Accounts
          </h1>
          <p style={{ fontSize: 13, color: 'var(--admin-muted)', marginTop: 4 }}>
            {counts.all} live family account{counts.all === 1 ? '' : 's'}
            {counts.archived > 0 ? ` · ${counts.archived} archived` : ''}
          </p>
          {!archiveEnabled && isSuperAdmin && (
            <p style={{ fontSize: 12, color: '#ea580c', marginTop: 4 }}>
              Archive/delete is inactive until migration 063 (family archive) is run.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer', background: '#B8960C', color: '#111',
          }}
        >
          + Create account
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          style={{
            flex: '1 1 200px', minWidth: 200, maxWidth: 320,
            height: 34, padding: '0 12px', borderRadius: 8, fontSize: 13,
            background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            'all', 'pending_email_verification', 'pending_approval', 'active', 'suspended',
            ...(isSuperAdmin ? ['archived'] as const : []),
          ] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: statusFilter === s ? '#B8960C' : 'var(--admin-surface)',
                color: statusFilter === s ? '#111' : 'var(--admin-muted)',
              }}
            >
              {s === 'all' ? `All (${counts.all})`
                : s === 'pending_email_verification' ? `Verifying email (${counts.pending_email_verification})`
                : s === 'pending_approval' ? `Awaiting approval (${counts.pending_approval})`
                : s === 'active' ? `Active (${counts.active})`
                : s === 'suspended' ? `Suspended (${counts.suspended})`
                : `Archived (${counts.archived})`}
            </button>
          ))}
        </div>

        {/* Readiness state filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--admin-muted)', alignSelf: 'center', marginRight: 2 }}>Readiness:</span>
          {(['all', 'candidate_only', 'representative_invited', 'representative_linked', 'intro_ready'] as const).map(r => {
            const cfg = r !== 'all' ? READINESS_CONFIG[r] : null
            const isActive = readinessFilter === r
            const rCount = r === 'all' ? families.length : families.filter(f => f.readiness_state === r).length
            return (
              <button
                key={r}
                onClick={() => setReadinessFilter(r)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  background: isActive ? (cfg?.bg ?? '#B8960C') : 'var(--admin-surface)',
                  color: isActive ? (cfg?.text ?? '#111') : 'var(--admin-muted)',
                }}
              >
                {r === 'all' ? `All (${rCount})` : `${cfg?.label ?? r} (${rCount})`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Batch claim-invite toolbar */}
      {selectedVisible.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(184,150,12,0.08)', border: '1px solid rgba(184,150,12,0.25)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
            {selectedVisible.length} selected
          </span>
          <button
            onClick={() => void batchSend()}
            disabled={sendingBatch}
            style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none',
              cursor: sendingBatch ? 'not-allowed' : 'pointer', background: '#B8960C', color: '#111',
              opacity: sendingBatch ? 0.6 : 1,
            }}
          >
            {sendingBatch ? 'Sending…' : `✉ Send claim invites (${selectedVisible.length})`}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ background: 'none', border: 'none', color: 'var(--admin-muted)', fontSize: 12, cursor: 'pointer' }}
          >
            Clear
          </button>
          <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
            Families with no email will report a failure here — use Copy link / WhatsApp instead.
          </span>
        </div>
      )}

      {/* Per-family send results */}
      {sendResults && (
        <div style={{
          padding: '12px 14px', marginBottom: 12, borderRadius: 10,
          background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text)' }}>
              {sendResults.filter(r => r.ok).length} sent
              {sendResults.some(r => !r.ok) ? `, ${sendResults.filter(r => !r.ok).length} failed` : ''}
            </span>
            <button onClick={() => setSendResults(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-muted)', fontSize: 12, cursor: 'pointer' }}>Dismiss</button>
          </div>
          {sendResults.some(r => !r.ok) && (
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {sendResults.filter(r => !r.ok).map(r => (
                <li key={r.id} style={{ fontSize: 12, color: '#dc2626' }}>
                  {r.name}: {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Table — the card IS the horizontal scroll container (single overflow
          container; the table's minWidth forces a scrollbar instead of clipping
          the right-hand columns when the content area is narrower than the table). */}
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 12, overflowX: 'auto', overflowY: 'visible',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-muted)', fontSize: 14 }}>
            No family accounts found.{' '}
            <button
              onClick={() => setShowCreate(true)}
              style={{ background: 'none', border: 'none', color: '#B8960C', cursor: 'pointer', fontSize: 14 }}
            >
              Create the first one →
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ padding: '10px 8px 10px 14px', width: 28 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={filtered.length > 0 && filtered.every(f => selectedIds.has(f.id))}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#B8960C' }}
                  />
                </th>
                {['Contact', 'Relationship', 'Email / Phone', 'Plan', 'Status', 'Claim', 'Readiness', 'Members', 'Last active', 'Created', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: 'var(--admin-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <>
                  <tr
                    key={f.id}
                    style={{
                      borderBottom: expandedId === f.id ? 'none' : (i < filtered.length - 1 ? '1px solid var(--admin-border)' : 'none'),
                      background: expandedId === f.id ? 'rgba(184,150,12,0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 8px 12px 14px' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${f.contact_full_name}`}
                        checked={selectedIds.has(f.id)}
                        onChange={() => toggleSelect(f.id)}
                        style={{ cursor: 'pointer', accentColor: '#B8960C' }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {f.contact_full_name}
                        {f.imported_user && <ImportedBadge />}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--admin-muted)' }}>
                      {RELATIONSHIP_LABELS[f.contact_relationship] ?? f.contact_relationship}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, color: 'var(--admin-text)' }}>{f.contact_email}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 1 }}>{f.contact_number}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}><PlanBadge plan={f.plan} /></td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={f.status} /></td>
                    <td style={{ padding: '12px 14px' }}><ClaimStatusBadge status={f.claim_status} /></td>
                    <td style={{ padding: '12px 14px' }}><ReadinessBadge state={f.readiness_state} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      {/* MEMBERS is an expander — reveals the candidate profiles
                          linked under this family (incl. ones the import linked
                          into an existing family, which only showed in Operations). */}
                      {f.profiles.length > 0 ? (
                        <button
                          onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                          title="Show linked candidate profiles"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#B8960C', fontSize: 13, fontWeight: 600, padding: 0,
                          }}
                        >
                          {f.profiles.length} {f.profiles.length === 1 ? 'member' : 'members'}
                          <span style={{ fontSize: 10 }}>{expandedId === f.id ? '▾' : '▸'}</span>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--admin-muted)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--admin-muted)' }}>
                      {fmtRelative(f.last_active)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--admin-muted)' }}>
                      {fmtDate(f.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          border: '1px solid var(--admin-border)', cursor: 'pointer',
                          background: 'transparent', color: 'var(--admin-muted)',
                        }}
                      >
                        {expandedId === f.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {expandedId === f.id && (
                    <tr key={`${f.id}-expand`} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                      <td colSpan={12} style={{ padding: '0 14px 16px' }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                          border: '1px solid var(--admin-border)', padding: 16,
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                        }}>
                          {/* Left: Contact details */}
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                              Contact Details
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <Detail label="Primary contact" value={`${f.contact_full_name} (${RELATIONSHIP_LABELS[f.contact_relationship] ?? f.contact_relationship})`} />
                              <Detail label="Email" value={f.contact_email} />
                              <Detail label="Phone" value={f.contact_number} />
                              {f.female_contact_name && (
                                <Detail label="Female contact" value={`${f.female_contact_name} — ${f.female_contact_number ?? '—'}`} />
                              )}
                              {f.no_female_contact_flag && (
                                <Detail label="No female contact" value={f.father_explanation || '(no explanation given)'} warning />
                              )}
                              <Detail label="Registration path" value={f.registration_path} />
                              <Detail label="Terms agreed" value={f.terms_agreed ? `Yes — ${fmtDate(f.terms_agreed_at)}` : 'No'} />
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--admin-muted)', minWidth: 130, flexShrink: 0 }}>Readiness state</span>
                                <ReadinessBadge state={f.readiness_state} />
                              </div>
                            </div>
                          </div>

                          {/* Right: Profiles */}
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                              Linked Profiles ({f.profiles.length})
                            </p>
                            {f.profiles.length === 0 ? (
                              <p style={{ fontSize: 13, color: 'var(--admin-muted)' }}>No profiles linked yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {f.profiles.map(p => (
                                  <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 10px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--admin-border)',
                                  }}>
                                    <span style={{
                                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 11, fontWeight: 700,
                                      background: p.gender === 'female' ? '#EEEDFE' : '#E6F1FB',
                                      color: p.gender === 'female' ? '#534AB7' : '#185FA5',
                                    }}>
                                      {p.display_initials}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <Link href={`/admin/profile/${p.id}`}
                                        style={{ fontSize: 13, color: '#B8960C', textDecoration: 'none', fontWeight: 500 }}>
                                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_initials}
                                      </Link>
                                      {p.duplicate_flag && (
                                        <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', color: '#dc2626', fontWeight: 600 }}>
                                          SIBLING FLAG
                                        </span>
                                      )}
                                    </div>
                                    <StatusBadge status={p.status ?? 'unknown'} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Claim-invite actions (ITEM 5) — send (email), copy link, WhatsApp */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>
                            Claim invite:
                          </span>
                          <ActionBtn
                            label={f.claim_status === 'sent' ? '↺ Resend invite email' : '✉ Send invite email'}
                            color="#B8960C" bg="rgba(184,150,12,0.12)"
                            loading={actionLoading === f.id} onClick={() => sendInvite(f)} />
                          <ActionBtn
                            label={copiedId === f.id ? '✓ Link copied' : '🔗 Copy claim link'}
                            color="var(--admin-text)" bg="rgba(255,255,255,0.07)"
                            loading={actionLoading === f.id} onClick={() => copyClaimLink(f)} />
                          <ActionBtn label="🟢 Share via WhatsApp" color="#16a34a" bg="rgba(34,197,94,0.10)"
                            loading={actionLoading === f.id} onClick={() => shareWhatsApp(f)} />
                          {f.claim_status === 'claimed' && (
                            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Already claimed</span>
                          )}
                        </div>

                        {/* Management actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          {f.status === 'pending_email_verification' && (
                            <ActionBtn label="↺ Resend verification email" color="#ea580c" bg="rgba(251,146,60,0.12)"
                              loading={actionLoading === f.id} onClick={() => resendVerification(f.id)} />
                          )}
                          {f.status === 'pending_approval' && (
                            <ActionBtn label="Activate" color="#16a34a" bg="rgba(34,197,94,0.12)"
                              loading={actionLoading === f.id} onClick={() => updateStatus(f.id, 'active')} />
                          )}
                          {f.status === 'active' && (
                            <ActionBtn label="Suspend" color="#dc2626" bg="rgba(239,68,68,0.12)"
                              loading={actionLoading === f.id} onClick={() => updateStatus(f.id, 'suspended')} />
                          )}
                          {f.status === 'suspended' && (
                            <ActionBtn label="Reinstate" color="#16a34a" bg="rgba(34,197,94,0.12)"
                              loading={actionLoading === f.id} onClick={() => updateStatus(f.id, 'active')} />
                          )}
                          {(f.readiness_state === 'candidate_only' || f.readiness_state === 'representative_invited') && (
                            <ActionBtn
                              label={f.readiness_state === 'representative_invited' ? '↺ Resend rep invite' : '✉ Send rep invite'}
                              color="#dc2626" bg="rgba(239,68,68,0.10)"
                              loading={false} onClick={() => setInviteFamily(f)}
                            />
                          )}
                          <ActionBtn label="Generate invite link" color="#B8960C" bg="rgba(184,150,12,0.12)"
                            loading={false} onClick={() => setInviteFamily(f)} />
                          <ActionBtn label="Link profile manually" color="var(--admin-text)" bg="rgba(255,255,255,0.07)"
                            loading={false} onClick={() => setLinkFamily(f)} />
                          <ActionBtn label="✉ Email family" color="var(--admin-text)" bg="rgba(255,255,255,0.05)"
                            loading={false} onClick={() => setEmailFamily(f)} />

                          {/* Archive / restore / delete (super-admin only) */}
                          {isSuperAdmin && archiveEnabled && !f.archived_at && (
                            <ActionBtn label="📦 Archive" color="#ea580c" bg="rgba(251,146,60,0.10)"
                              loading={actionLoading === f.id} onClick={() => archiveFamily(f, true)} />
                          )}
                          {isSuperAdmin && archiveEnabled && f.archived_at && (
                            <>
                              <ActionBtn label="♻ Restore" color="#16a34a" bg="rgba(34,197,94,0.12)"
                                loading={actionLoading === f.id} onClick={() => archiveFamily(f, false)} />
                              <ActionBtn label="🗑 Permanently delete" color="#dc2626" bg="rgba(239,68,68,0.12)"
                                loading={actionLoading === f.id} onClick={() => setDeleteFamily(f)} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateFamilyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {inviteFamily && (
        <InviteModal family={inviteFamily} onClose={() => setInviteFamily(null)} />
      )}
      {linkFamily && (
        <LinkProfileModal
          family={linkFamily}
          onClose={() => setLinkFamily(null)}
          onLinked={id => handleLinked(linkFamily.id, id)}
        />
      )}
      {emailFamily && (
        <EmailFamilyModal family={emailFamily} onClose={() => setEmailFamily(null)} />
      )}
      {deleteFamily && (
        <DeleteFamilyModal family={deleteFamily} onClose={() => setDeleteFamily(null)} onDeleted={onDeleted} />
      )}
    </div>
  )
}

// ─── Delete Family Modal (guarded hard-delete) ────────────────────────────────

interface DeleteImpact {
  contact_full_name: string
  archived: boolean
  profileCount: number
  introCount: number
  blockers: { introId: string; otherFamily: string; status: string }[]
}

function DeleteFamilyModal({
  family,
  onClose,
  onDeleted,
}: {
  family: FamilyRow
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [impact, setImpact] = useState<DeleteImpact | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(true)
  const [impactError, setImpactError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/families/${family.id}`)
        const j = await res.json().catch(() => ({})) as { impact?: DeleteImpact; error?: string }
        if (!active) return
        if (!res.ok) { setImpactError(j.error ?? 'Could not load delete impact'); setLoadingImpact(false); return }
        setImpact(j.impact ?? null)
      } catch {
        if (active) setImpactError('Could not load delete impact')
      } finally {
        if (active) setLoadingImpact(false)
      }
    })()
    return () => { active = false }
  }, [family.id])

  const blocked = (impact?.blockers.length ?? 0) > 0
  const confirmTarget = family.contact_full_name.trim()
  const confirmOk = confirmText.trim() === confirmTarget
  const canDelete = !blocked && confirmOk && !deleting && !loadingImpact && !!impact

  async function doDelete() {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/admin/families/${family.id}`, { method: 'DELETE' })
    if (res.ok) { onDeleted(family.id); return }
    const j = await res.json().catch(() => ({})) as { error?: string }
    setDeleteError(j.error ?? 'Delete failed')
    setDeleting(false)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 14, padding: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', margin: '0 0 4px' }}>
          Permanently delete family account
        </h2>
        <p style={{ fontSize: 13, color: 'var(--admin-text)', margin: '0 0 14px' }}>
          {family.contact_full_name}
        </p>

        {loadingImpact ? (
          <p style={{ fontSize: 13, color: 'var(--admin-muted)' }}>Checking what will be removed…</p>
        ) : impactError ? (
          <p style={{ fontSize: 13, color: '#dc2626' }}>{impactError}</p>
        ) : impact ? (
          <>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text)', margin: '0 0 6px' }}>This will permanently remove:</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--admin-text)', lineHeight: 1.7 }}>
                <li>The family account + its login</li>
                <li>{impact.profileCount} candidate profile{impact.profileCount === 1 ? '' : 's'}</li>
                <li>{impact.introCount} introduction record{impact.introCount === 1 ? '' : 's'} involving them</li>
                <li>Pending claim tokens</li>
              </ul>
              <p style={{ fontSize: 11.5, color: 'var(--admin-muted)', margin: '8px 0 0' }}>This cannot be undone.</p>
            </div>

            {blocked && (
              <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#ca8a04', margin: '0 0 4px' }}>
                  Blocked — live introductions with active families
                </p>
                <p style={{ fontSize: 12, color: 'var(--admin-text)', margin: 0 }}>
                  This family has {impact.blockers.length} in-progress introduction(s) with:{' '}
                  {[...new Set(impact.blockers.map(b => b.otherFamily))].join(', ')}. Withdraw or resolve those
                  introductions before deleting, so the other families aren&rsquo;t affected.
                </p>
              </div>
            )}

            {!blocked && (
              <>
                <label style={{ fontSize: 12, color: 'var(--admin-muted)', display: 'block', marginBottom: 6 }}>
                  Type <strong style={{ color: 'var(--admin-text)' }}>{confirmTarget}</strong> to confirm:
                </label>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={confirmTarget}
                  style={{ ...inputStyle, marginBottom: 12 }}
                />
              </>
            )}

            {deleteError && (
              <p style={{ fontSize: 12.5, color: '#dc2626', margin: '0 0 10px' }}>{deleteError}</p>
            )}
          </>
        ) : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => void doDelete()}
            disabled={!canDelete}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
              background: canDelete ? '#dc2626' : 'rgba(239,68,68,0.4)',
              color: '#fff', cursor: canDelete ? 'pointer' : 'not-allowed',
            }}
          >
            {deleting ? 'Deleting…' : 'Permanently delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
