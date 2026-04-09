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
        background: '#F8F6F1',
        border: '1px solid #E8E4DC',
        borderRadius: 12,
      }}
    >
      {submitted ? (
        <div style={{ fontSize: 13.5, color: '#6B6A65', textAlign: 'center' }}>
          Thank you for your feedback — it helps us improve our help centre.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1A14', marginBottom: 12, textAlign: 'center' }}>
            Was this article helpful?
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => handleFeedback(true)}
              disabled={loading}
              style={{
                padding: '8px 20px',
                background: '#FFFFFF',
                border: '1px solid #E8E4DC',
                borderRadius: 8,
                fontSize: 13,
                color: '#1C1A14',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = '#B8960C'
                  el.style.background = '#FBF6E9'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = '#E8E4DC'
                el.style.background = '#FFFFFF'
              }}
            >
              Yes, thank you
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={loading}
              style={{
                padding: '8px 20px',
                background: '#FFFFFF',
                border: '1px solid #E8E4DC',
                borderRadius: 8,
                fontSize: 13,
                color: '#6B6A65',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = '#C5BFB3'
                  el.style.background = '#F0EDE6'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = '#E8E4DC'
                el.style.background = '#FFFFFF'
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
