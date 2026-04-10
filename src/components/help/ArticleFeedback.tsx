'use client'

import { useState } from 'react'

interface ArticleFeedbackProps {
  articleSlug: string
}

export default function ArticleFeedback({ articleSlug }: ArticleFeedbackProps) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleFeedback(helpful: boolean) {
    if (loading || submitted) return
    setLoading(true)
    try {
      await fetch('/api/help/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_slug: articleSlug, helpful }),
      })
    } catch {
      // silently ignore — feedback is best-effort
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div
      style={{
        marginTop: 40,
        padding: '20px 24px',
        background: 'var(--surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
      }}
    >
      {submitted ? (
        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Thank you for your feedback — it helps us improve our help centre.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center' }}>
            Was this article helpful?
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => handleFeedback(true)}
              disabled={loading}
              style={{
                padding: '8px 20px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--text-primary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = 'var(--gold)'
                  el.style.background = 'var(--gold-muted)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'var(--border-default)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              Yes, thank you
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={loading}
              style={{
                padding: '8px 20px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = 'var(--text-muted)'
                  el.style.background = 'var(--surface-3)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'var(--border-default)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              Could be clearer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
