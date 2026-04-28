'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  initialPlan:     'premium' | null
  bankName:        string
  sortCode:        string
  accountNumber:   string
  existingRequest: {
    id:        string
    reference: string
    plan:      'premium'
    amount:    number
  } | null
}

type Step = 'details' | 'success'
type CopyKey = 'ref' | 'sort' | 'acc' | 'name'

const PLAN_PRICE = 19

// ─── Small copy button ─────────────────────────────────────────────────────────

function CopyBtn({
  text,
  copied,
  onCopy,
}: {
  text: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <button
      onClick={onCopy}
      title="Copy"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 6,
        fontSize: 11.5,
        fontWeight: 500,
        border: '0.5px solid var(--border-default)',
        background: copied ? 'rgba(184,150,12,0.12)' : 'var(--surface-3, rgba(255,255,255,0.05))',
        color: copied ? 'var(--gold)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="3" y="1" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1 3v5a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

// ─── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  copyKey,
  copied,
  onCopy,
}: {
  label:   string
  value:   string
  copyKey: CopyKey
  copied:  CopyKey | null
  onCopy:  (key: CopyKey, value: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--border-default)',
        gap: 12,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }}>
          {value}
        </p>
      </div>
      <CopyBtn
        text={value}
        copied={copied === copyKey}
        onCopy={() => onCopy(copyKey, value)}
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BankTransferClient({
  bankName,
  sortCode,
  accountNumber,
  existingRequest,
}: Props) {
  const [step,      setStep]      = useState<Step>(existingRequest ? 'success' : 'details')
  const [reference, setReference] = useState(existingRequest?.reference ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [copied,    setCopied]    = useState<CopyKey | null>(null)

  const activePrice = existingRequest?.amount ?? PLAN_PRICE

  function copy(key: CopyKey, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2200)
    }).catch(() => { /* clipboard blocked */ })
  }

  async function submit() {
    if (!confirmed) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/payments/bank-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'premium' }),
    })
    const json = await res.json().catch(() => ({})) as { reference?: string; error?: string; already_exists?: boolean; id?: string }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Something went wrong. Please try again.'); return }
    setReference(json.reference ?? '')
    setStep('success')
  }

  // ── Step: Bank details ─────────────────────────────────────────────────────

  if (step === 'details') {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px' }}>
        <Link
          href="/settings?tab=membership"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          ← Back to settings
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Upgrade to Premium
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Transfer exactly <strong style={{ color: 'var(--text-primary)' }}>£{PLAN_PRICE}</strong>{' '}to the account below.
          You&apos;ll get a unique reference on the next step — please use it so we can match your payment.
        </p>

        {/* Bank details card */}
        <div style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <div style={{ padding: '12px 16px', background: 'rgba(184,150,12,0.06)', borderBottom: '0.5px solid var(--border-default)' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Bank details
            </p>
          </div>
          <DetailRow label="Account name" value={bankName}      copyKey="name" copied={copied} onCopy={copy} />
          <DetailRow label="Sort code"    value={sortCode}      copyKey="sort" copied={copied} onCopy={copy} />
          <DetailRow
            label="Account number"
            value={accountNumber}
            copyKey="acc"
            copied={copied}
            onCopy={copy}
          />
          <div style={{ padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Amount
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 20, color: 'var(--text-primary)', fontWeight: 700 }}>
              £{PLAN_PRICE}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}> / month</span>
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Once you&apos;ve confirmed below, we&apos;ll generate your unique payment reference. Use it as the payment reference when you make the transfer.
        </p>

        {/* Confirmation checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ marginTop: 2, accentColor: '#B8960C', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            I understand I need to make a bank transfer of <strong style={{ color: 'var(--text-primary)' }}>£{PLAN_PRICE}</strong> and use the reference provided. My account will be upgraded within 1 working day of payment being received.
          </span>
        </label>

        {error && (
          <p style={{ fontSize: 13, color: '#f87171', marginBottom: 16, background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px' }}>
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!confirmed || loading}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10,
            background: confirmed && !loading ? '#B8960C' : 'rgba(184,150,12,0.3)',
            color: confirmed && !loading ? '#111' : 'rgba(17,17,17,0.5)',
            fontWeight: 700, fontSize: 14, border: 'none',
            cursor: confirmed && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Generating reference…' : 'Get my payment reference →'}
        </button>
      </div>
    )
  }

  // ── Step: Success ──────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px' }}>
      {/* Success header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(184,150,12,0.12)', border: '1.5px solid rgba(184,150,12,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l4.5 4.5L19 7" stroke="#B8960C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Reference generated
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Transfer <strong style={{ color: 'var(--text-primary)' }}>£{activePrice}</strong> to our bank account and use this reference so we can identify your payment.
        </p>
      </div>

      {/* Reference highlight */}
      <div style={{
        background: 'rgba(184,150,12,0.06)',
        border: '1.5px solid rgba(184,150,12,0.35)',
        borderRadius: 14,
        padding: '20px 20px',
        marginBottom: 24,
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Your payment reference
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
          {reference}
        </p>
        <CopyBtn
          text={reference}
          copied={copied === 'ref'}
          onCopy={() => copy('ref', reference)}
        />
      </div>

      {/* Bank details recap */}
      <div style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 28,
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border-default)' }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Transfer to
          </p>
        </div>
        <DetailRow label="Account name"   value={bankName}      copyKey="name" copied={copied} onCopy={copy} />
        <DetailRow label="Sort code"      value={sortCode}      copyKey="sort" copied={copied} onCopy={copy} />
        <DetailRow label="Account number" value={accountNumber} copyKey="acc"  copied={copied} onCopy={copy} />
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Amount</p>
            <p style={{ margin: '3px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>£{activePrice}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reference</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{reference}</p>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          What happens next
        </p>
        {[
          'Make a bank transfer for the exact amount shown, using your reference.',
          'Our team will match your payment — usually within 1 working day.',
          'You\'ll receive a confirmation email and your account will be upgraded automatically.',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: 'rgba(184,150,12,0.12)',
              border: '0.5px solid rgba(184,150,12,0.35)', color: '#B8960C',
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step}</p>
          </div>
        ))}
      </div>

      <Link
        href="/browse"
        style={{
          display: 'block', width: '100%', padding: '12px 0', borderRadius: 10,
          background: 'var(--surface-2)', color: 'var(--text-primary)',
          border: '1px solid var(--border-default)', fontWeight: 600,
          fontSize: 14, cursor: 'pointer', textDecoration: 'none',
          textAlign: 'center', boxSizing: 'border-box',
        }}
      >
        Back to browse
      </Link>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
        Questions? Email us at{' '}
        <a href="mailto:team@zawaaj.uk" style={{ color: '#B8960C', textDecoration: 'none' }}>team@zawaaj.uk</a>
      </p>
    </div>
  )
}
