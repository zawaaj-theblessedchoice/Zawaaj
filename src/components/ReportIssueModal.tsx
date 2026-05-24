'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | 'not_working'
  | 'wrong_information'
  | 'cant_find'
  | 'suggestion'
  | 'other'
  | ''

const CATEGORY_LABELS: Record<Exclude<Category, ''>, string> = {
  not_working:       "Something isn't working",
  wrong_information: 'Information looks wrong',
  cant_find:         "I can't find something",
  suggestion:        'Suggestion or improvement',
  other:             'Other',
}

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportIssueModal({ open, onClose }: Props) {
  const [category, setCategory]       = useState<Category>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const firstFocusRef = useRef<HTMLSelectElement>(null)

  // Focus first field when modal opens; reset state on close
  useEffect(() => {
    if (open) {
      setTimeout(() => firstFocusRef.current?.focus(), 50)
    } else {
      // Delay reset so the closing animation isn't jarring
      const t = setTimeout(() => {
        setCategory('')
        setDescription('')
        setDone(false)
        setError(null)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!category) { setError('Please select a category.'); return }
    if (description.trim().length < 10) { setError('Description must be at least 10 characters.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Submission failed.')
      setDone(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const charCount = description.length

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 500,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report an issue"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 501,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-default)',
            borderTop: '1px solid rgba(184,150,12,0.3)',
            borderRadius: 16,
            padding: '28px 28px 24px',
            pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Report an issue
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Tell us what's wrong and we'll look into it.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
                borderRadius: 6,
                lineHeight: 1,
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          {done ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(74,222,128,0.1)',
                border: '0.5px solid rgba(74,222,128,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="var(--status-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                Thank you — your report has been submitted.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                We'll look into it shortly.
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={e => { void handleSubmit(e) }}>
              {/* Category */}
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="report-category"
                  style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}
                >
                  Category <span style={{ color: 'var(--status-error)' }}>*</span>
                </label>
                <select
                  id="report-category"
                  ref={firstFocusRef}
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '0.5px solid var(--border-default)',
                    background: 'var(--surface-3)',
                    color: category ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box' as const,
                  }}
                  onFocus={e => { (e.currentTarget as HTMLSelectElement).style.borderColor = 'var(--border-gold)' }}
                  onBlur={e => { (e.currentTarget as HTMLSelectElement).style.borderColor = 'var(--border-default)' }}
                >
                  <option value="" disabled>Select a category…</option>
                  {(Object.entries(CATEGORY_LABELS) as [Exclude<Category, ''>, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <label
                    htmlFor="report-description"
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}
                  >
                    Description <span style={{ color: 'var(--status-error)' }}>*</span>
                  </label>
                  <span style={{ fontSize: 11, color: charCount > 1000 ? 'var(--status-error)' : 'var(--text-muted)' }}>
                    {charCount}/1000
                  </span>
                </div>
                <textarea
                  id="report-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Please describe what you experienced…"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '0.5px solid var(--border-default)',
                    background: 'var(--surface-3)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box' as const,
                  }}
                  onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--border-gold)' }}
                  onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--border-default)' }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  fontSize: 12.5,
                  color: 'var(--status-error)',
                  background: 'rgba(248,113,113,0.08)',
                  border: '0.5px solid rgba(248,113,113,0.25)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 14,
                }}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '0.5px solid var(--border-default)',
                    background: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || charCount > 1000}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--gold)',
                    color: 'var(--surface)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.65 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
