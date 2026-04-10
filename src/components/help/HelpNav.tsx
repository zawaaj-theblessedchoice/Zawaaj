'use client'

import Link from 'next/link'

export default function HelpNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        height: 52,
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: brand */}
      <Link
        href="/help"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Zawaaj
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>/</span>
        <span
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            fontWeight: 400,
          }}
        >
          Help centre
        </span>
      </Link>

      {/* Right: back to platform */}
      <Link
        href="/browse"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          border: '1px solid var(--gold)',
          borderRadius: 6,
          color: 'var(--gold)',
          fontSize: 12.5,
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--gold-muted)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
        }}
      >
        Back to platform
      </Link>
    </nav>
  )
}
