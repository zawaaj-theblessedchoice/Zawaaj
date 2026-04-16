'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'zawaaj-cookie-consent'

/**
 * Cookie Banner — shown once until the user dismisses it.
 *
 * Zawaaj uses strictly necessary cookies only (session management, CSRF
 * protection). No analytics, advertising, or third-party tracking cookies
 * are used. The banner informs users of this and links to the Privacy Policy.
 *
 * Consent state is persisted in localStorage so the banner does not re-appear
 * on subsequent visits. Clearing localStorage resets the preference.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (private browsing, SSR) — silently skip
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'necessary-only')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(560px, calc(100vw - 32px))',
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}
    >
      {/* Cookie icon */}
      <span
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 9,
          background: 'var(--gold-muted)',
          border: '0.5px solid var(--border-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7.5" stroke="var(--gold)" strokeWidth="1.2" />
          <circle cx="6.5" cy="7" r="1.1" fill="var(--gold)" />
          <circle cx="10.5" cy="6" r="0.85" fill="var(--gold)" />
          <circle cx="7" cy="11" r="0.85" fill="var(--gold)" />
          <circle cx="11" cy="10.5" r="1.1" fill="var(--gold)" />
          <circle cx="9" cy="9" r="0.75" fill="var(--gold)" opacity="0.6" />
        </svg>
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}
        >
          We use strictly necessary cookies only
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          Zawaaj uses cookies solely for session management and security. We do
          not use analytics, advertising, or third-party tracking.{' '}
          <Link
            href="/privacy"
            style={{ color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Accept and close cookie notice"
        style={{
          flexShrink: 0,
          alignSelf: 'center',
          padding: '7px 16px',
          borderRadius: 8,
          background: 'var(--gold-muted)',
          border: '0.5px solid var(--border-gold)',
          color: 'var(--gold)',
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.8')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      >
        Got it
      </button>
    </div>
  )
}
