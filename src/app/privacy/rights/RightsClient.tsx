'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PrivacyRequest {
  id: string
  type: string
  status: string
  field_name: string | null
  requested_value: string | null
  statutory_deadline: string | null
  completed_at: string | null
  rejection_reason: string | null
  created_at: string
}

interface Props {
  userEmail: string
  firstName: string | null
  profileStatus: string | null
  initialRequests: PrivacyRequest[]
  cancelParam: string | null
}

const TYPE_LABELS: Record<string, string> = {
  access: 'Data export',
  rectify: 'Rectification',
  erasure: 'Account deletion',
  restriction: 'Restriction',
  portability: 'Portability',
  objection: 'Objection',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:              { bg: 'rgba(234,179,8,0.12)',   text: '#ca8a04' },
  processing:           { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8' },
  awaiting_controller:  { bg: 'rgba(251,146,60,0.12)',  text: '#ea580c' },
  completed:            { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a' },
  cancelled:            { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
  rejected:             { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
}

const ADMIN_CORRECTABLE_FIELDS = [
  { value: 'status', label: 'Account status' },
  { value: 'gender', label: 'Gender' },
  { value: 'date_of_birth', label: 'Date of birth' },
  { value: 'age_display', label: 'Age display' },
  { value: 'family_account.contact_full_name', label: 'Family contact name' },
  { value: 'family_account.contact_email', label: 'Family contact email' },
  { value: 'family_account.contact_number', label: 'Family contact number' },
]

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RightsClient({ userEmail, firstName, profileStatus, initialRequests, cancelParam }: Props) {
  const [requests, setRequests] = useState<PrivacyRequest[]>(initialRequests)
  const [activeTab, setActiveTab] = useState<'overview' | 'export' | 'rectify' | 'erase' | 'history'>('overview')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Export state
  const [exportConfirmed, setExportConfirmed] = useState(false)

  // Rectify state
  const [rectifyField, setRectifyField] = useState('')
  const [rectifyCurrentValue, setRectifyCurrentValue] = useState('')
  const [rectifyRequestedValue, setRectifyRequestedValue] = useState('')
  const [rectifyNote, setRectifyNote] = useState('')

  // Erase state
  const [erasePhrase, setErasePhrase] = useState('')
  const [eraseConfirmed, setEraseConfirmed] = useState(false)

  const hasPendingErasure = requests.some(r => r.type === 'erasure' && r.status === 'pending')
  const isAlreadyErased = requests.some(r => r.type === 'erasure' && r.status === 'completed')

  async function handleExport() {
    if (!exportConfirmed) { setError('Please confirm you understand before requesting.'); return }
    setLoading(true); setError(null); setSuccess(null)
    const res = await fetch('/api/privacy/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const json = await res.json() as { message?: string; error?: string }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to submit request'); return }
    setSuccess(json.message ?? 'Export request submitted.')
    refreshRequests()
  }

  async function handleRectify() {
    if (!rectifyField || !rectifyRequestedValue) { setError('Please select a field and provide the correct value.'); return }
    setLoading(true); setError(null); setSuccess(null)
    const res = await fetch('/api/privacy/rectify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: rectifyField, current_value: rectifyCurrentValue, requested_value: rectifyRequestedValue, supporting_note: rectifyNote }),
    })
    const json = await res.json() as { message?: string; error?: string }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to submit request'); return }
    setSuccess(json.message ?? 'Rectification request submitted.')
    setRectifyField(''); setRectifyCurrentValue(''); setRectifyRequestedValue(''); setRectifyNote('')
    refreshRequests()
  }

  async function handleErase() {
    if (erasePhrase !== 'DELETE MY ACCOUNT') { setError('Please type "DELETE MY ACCOUNT" exactly.'); return }
    if (!eraseConfirmed) { setError('Please tick the confirmation box.'); return }
    setLoading(true); setError(null); setSuccess(null)
    const res = await fetch('/api/privacy/erase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation_phrase: erasePhrase }),
    })
    const json = await res.json() as { message?: string; error?: string }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to submit request'); return }
    setSuccess(json.message ?? 'Erasure request submitted.')
    refreshRequests()
  }

  async function refreshRequests() {
    const res = await fetch('/api/privacy/requests')
    if (res.ok) {
      const json = await res.json() as { requests: PrivacyRequest[] }
      setRequests(json.requests)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)',
    color: '#f3f4f6', fontSize: 13, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
    color: '#9ca3af', marginBottom: 5, display: 'block',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#111111', padding: '28px 16px 60px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/browse" style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            ← Back to platform
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f3f4f6', margin: '0 0 6px' }}>
            Your data rights
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            {firstName ? `${firstName}, your` : 'Your'} data is controlled by <strong style={{ color: '#9ca3af' }}>Ingenious Education Ltd</strong> and processed by Zawaaj.
            Account: <span style={{ color: '#9ca3af' }}>{userEmail}</span>
          </p>
        </div>

        {/* Cancellation feedback */}
        {cancelParam === 'success' && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.3)', marginBottom: 20, fontSize: 13, color: '#4ade80' }}>
            ✓ Your account deletion has been cancelled. Your profile has been paused — you can reactivate it from My Profile.
          </div>
        )}
        {(cancelParam === 'invalid' || cancelParam === 'notfound') && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            This cancellation link is invalid or has already been used.
          </div>
        )}
        {cancelParam === 'too_late' && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            The 7-day cancellation window has passed. Your account deletion has been executed.
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
          {(['overview', 'export', 'rectify', 'erase', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(null); setSuccess(null) }}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: '0.5px solid',
                borderColor: activeTab === tab ? '#B8960C' : 'rgba(255,255,255,0.1)',
                background: activeTab === tab ? 'rgba(184,150,12,0.12)' : 'transparent',
                color: activeTab === tab ? '#B8960C' : '#9ca3af',
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              {{ overview: 'Overview', export: 'Request my data', rectify: 'Correct data', erase: 'Delete account', history: 'Request history' }[tab]}
            </button>
          ))}
        </div>

        {/* Feedback messages */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.3)', marginBottom: 20, fontSize: 13, color: '#4ade80' }}>
            ✓ {success}
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { tab: 'export' as const, icon: '📦', title: 'Request a copy of my data', desc: 'Download all personal data held about you. Delivered to your email within 1 hour.' },
              { tab: 'rectify' as const, icon: '✏️', title: 'Correct my data', desc: 'Fix inaccurate personal data that you cannot correct yourself through your profile.' },
              { tab: 'erase' as const, icon: '🗑️', title: 'Delete my account', desc: 'Permanently delete your account and personal data. 7-day cooling-off period applies.' },
              { tab: 'history' as const, icon: '📋', title: 'Request history', desc: `You have ${requests.length} past request${requests.length !== 1 ? 's' : ''}.` },
            ].map(item => (
              <button
                key={item.tab}
                onClick={() => { setActiveTab(item.tab); setError(null); setSuccess(null) }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '18px 20px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'inherit', width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(184,150,12,0.4)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </button>
            ))}

            <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(184,150,12,0.04)', border: '0.5px solid rgba(184,150,12,0.2)', marginTop: 8 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: '#d1d5db' }}>Self-correctable now:</strong> Most profile fields (bio, location, preferences, faith details) can be updated directly at{' '}
                <Link href="/my-profile" style={{ color: '#B8960C' }}>My Profile</Link> without a formal request.
              </p>
            </div>

            <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6, marginTop: 4 }}>
              We will respond to all requests within 30 calendar days. For questions: <a href="mailto:privacy@ingenious-education.co.uk" style={{ color: '#6b7280' }}>privacy@ingenious-education.co.uk</a> ·{' '}
              <Link href="/privacy" style={{ color: '#6b7280' }}>Privacy Policy</Link> ·{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280' }}>ICO</a>
            </p>
          </div>
        )}

        {/* EXPORT */}
        {activeTab === 'export' && (
          <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 24px 20px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6', margin: '0 0 8px' }}>Request a copy of my data</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              Your complete data export will be attached to an email sent to <strong style={{ color: '#9ca3af' }}>{userEmail}</strong> within 1 hour. You may request one export per 30 days.
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              The export includes: profile data, family account details, introduction requests, notifications, saved profiles, subscription records, and privacy request history. Internal admin notes are withheld under DPA 2018 Schedule 2 §16.
            </p>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={exportConfirmed} onChange={e => setExportConfirmed(e.target.checked)} style={{ marginTop: 2, accentColor: '#B8960C' }} />
              <span style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                I understand this export contains my personal data and will be sent to my registered email address.
              </span>
            </label>
            <button
              onClick={handleExport}
              disabled={loading || !exportConfirmed}
              style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading || !exportConfirmed ? 'not-allowed' : 'pointer',
                background: loading || !exportConfirmed ? 'rgba(184,150,12,0.3)' : '#B8960C', border: 'none', color: '#111',
              }}
            >
              {loading ? 'Sending…' : 'Send my data export'}
            </button>
          </div>
        )}

        {/* RECTIFY */}
        {activeTab === 'rectify' && (
          <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 24px 20px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6', margin: '0 0 8px' }}>Correct my data</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              Use this form for data you cannot correct yourself. Most profile fields (bio, location, preferences) can be updated directly at <Link href="/my-profile" style={{ color: '#B8960C' }}>My Profile</Link>. Requests are reviewed within 15 calendar days.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Field to correct *</label>
                <select value={rectifyField} onChange={e => setRectifyField(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select a field…</option>
                  {ADMIN_CORRECTABLE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Current (incorrect) value</label>
                <input style={inputStyle} value={rectifyCurrentValue} onChange={e => setRectifyCurrentValue(e.target.value)} placeholder="What is currently recorded (if known)" />
              </div>
              <div>
                <label style={labelStyle}>Correct value *</label>
                <input style={inputStyle} value={rectifyRequestedValue} onChange={e => setRectifyRequestedValue(e.target.value)} placeholder="What it should be" />
              </div>
              <div>
                <label style={labelStyle}>Supporting information</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={rectifyNote} onChange={e => setRectifyNote(e.target.value)} placeholder="Any context that helps us verify the correct value" />
              </div>
              <button
                onClick={handleRectify}
                disabled={loading}
                style={{
                  padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                  background: loading ? 'rgba(184,150,12,0.3)' : '#B8960C', color: '#111',
                }}
              >
                {loading ? 'Submitting…' : 'Submit rectification request'}
              </button>
            </div>
          </div>
        )}

        {/* ERASE */}
        {activeTab === 'erase' && (
          <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '24px 24px 20px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6', margin: '0 0 8px' }}>Delete my account</h2>

            {isAlreadyErased ? (
              <p style={{ fontSize: 13, color: '#6b7280' }}>Your account has already been deleted.</p>
            ) : hasPendingErasure ? (
              <div>
                <p style={{ fontSize: 13, color: '#f87171', lineHeight: 1.6 }}>
                  A deletion request is already pending. Check your email for the cancellation link if you changed your mind.
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  Contact <a href="mailto:privacy@zawaaj.uk" style={{ color: '#9ca3af' }}>privacy@zawaaj.uk</a> if you did not submit this request.
                </p>
              </div>
            ) : (
              <>
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)', marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: '#f87171', lineHeight: 1.6, margin: 0 }}>
                    <strong>This action permanently deletes your account.</strong> Your profile will be removed from the directory immediately. All personal data will be deleted within 7 days. Anonymised records may be retained for legal compliance purposes. This cannot be undone after the 7-day cancellation window.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Type "DELETE MY ACCOUNT" to confirm</label>
                    <input
                      style={{ ...inputStyle, borderColor: erasePhrase && erasePhrase !== 'DELETE MY ACCOUNT' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)' }}
                      value={erasePhrase}
                      onChange={e => setErasePhrase(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={eraseConfirmed} onChange={e => setEraseConfirmed(e.target.checked)} style={{ marginTop: 2, accentColor: '#ef4444' }} />
                    <span style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                      I understand this is permanent and that I have 7 days to cancel via the link sent to my email.
                    </span>
                  </label>
                  <button
                    onClick={handleErase}
                    disabled={loading || erasePhrase !== 'DELETE MY ACCOUNT' || !eraseConfirmed}
                    style={{
                      padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: (loading || erasePhrase !== 'DELETE MY ACCOUNT' || !eraseConfirmed) ? 'not-allowed' : 'pointer',
                      background: (loading || erasePhrase !== 'DELETE MY ACCOUNT' || !eraseConfirmed) ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.8)',
                      border: '0.5px solid rgba(239,68,68,0.4)', color: '#fff',
                    }}
                  >
                    {loading ? 'Processing…' : 'Delete my account permanently'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6', margin: '0 0 16px' }}>Request history</h2>
            {requests.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280' }}>You have not submitted any data rights requests yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {requests.map(req => {
                  const statusStyle = STATUS_COLORS[req.status] ?? { bg: 'rgba(255,255,255,0.06)', text: '#9ca3af' }
                  return (
                    <div key={req.id} style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6' }}>{TYPE_LABELS[req.type] ?? req.type}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: statusStyle.bg, color: statusStyle.text, textTransform: 'capitalize' }}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '3px 16px' }}>
                        <span>Submitted: {fmtDate(req.created_at)}</span>
                        {req.statutory_deadline && <span>Deadline: {fmtDate(req.statutory_deadline)}</span>}
                        {req.completed_at && <span>Completed: {fmtDate(req.completed_at)}</span>}
                        {req.field_name && <span>Field: {req.field_name}</span>}
                      </div>
                      {req.rejection_reason && (
                        <p style={{ fontSize: 12, color: '#f87171', margin: '8px 0 0', fontStyle: 'italic' }}>{req.rejection_reason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none' }}>Terms & Conditions</Link>
          <a href="mailto:privacy@ingenious-education.co.uk" style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none' }}>Controller contact</a>
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none' }}>ICO</a>
        </div>
      </div>
    </main>
  )
}
