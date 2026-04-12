'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'super_admin' | 'manager'

interface Props {
  role: Role
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin',               label: 'Dashboard',     superOnly: true  },
  { href: '/admin/introductions', label: 'Introductions', superOnly: false },
  { href: '/admin/matches',       label: 'Matches',       superOnly: true  },
  { href: '/admin/concierge',     label: 'Concierge',     superOnly: true  },
  { href: '/admin/managers',      label: 'Managers',      superOnly: true  },
  { href: '/admin/subscriptions', label: 'Subscriptions', superOnly: true  },
  { href: '/admin/import',        label: 'Import',        superOnly: true  },
  { href: '/admin/help',          label: 'Help',          superOnly: false },
]

function getTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem('zawaaj-theme')
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
    if (stored === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    // localStorage not available
  }
  return 'dark'
}

export function AdminShell({ role, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setTheme(getTheme())
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('zawaaj-theme', next) } catch { /* noop */ }
    if (next === 'light') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [theme])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleNav = NAV_ITEMS.filter(item => !item.superOnly || role === 'super_admin')

  // Theme-aware colours
  const isDark = theme === 'dark'
  const bg      = isDark ? '#111111' : '#f8f7f4'
  const sidebar  = isDark ? '#161616' : '#ffffff'
  const border   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const text     = isDark ? 'rgba(255,255,255,0.85)' : '#1a1a1a'
  const muted    = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)'
  const activeB  = isDark ? 'rgba(184,150,12,0.15)' : 'rgba(184,150,12,0.12)'
  const gold     = '#B8960C'

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: bg,
        color: text,
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
        '--admin-bg': bg,
        '--admin-surface': sidebar,
        '--admin-border': border,
        '--admin-text': text,
        '--admin-muted': muted,
      } as React.CSSProperties}
    >

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: sidebar,
          borderRight: `1px solid ${border}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transition: 'transform 0.2s ease',
        }}
        className="admin-sidebar"
      >
        {/* Logo — wordmark */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${border}` }}>
          <Link href={role === 'super_admin' ? '/admin' : '/admin/introductions'} style={{ display: 'inline-block' }}>
            <img src="/zawaaj-wordmark.png" alt="Zawaaj" style={{ height: 22, width: 'auto', opacity: isDark ? 1 : 0.85 }} />
          </Link>
        </div>

        {/* Role badge */}
        <div style={{ padding: '12px 20px 8px' }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: role === 'super_admin' ? gold : '#60a5fa',
            background: role === 'super_admin' ? 'rgba(184,150,12,0.1)' : 'rgba(96,165,250,0.1)',
            border: `1px solid ${role === 'super_admin' ? 'rgba(184,150,12,0.25)' : 'rgba(96,165,250,0.25)'}`,
            borderRadius: 6,
            padding: '3px 8px',
          }}>
            {role === 'super_admin' ? 'Super Admin' : 'Manager'}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          {visibleNav.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 12px',
                  borderRadius: 8,
                  marginBottom: 2,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? gold : text,
                  background: active ? activeB : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                  borderLeft: active ? `2px solid ${gold}` : '2px solid transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px', borderTop: `1px solid ${border}` }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: 'transparent',
              cursor: 'pointer',
              color: muted,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
            <span style={{ fontSize: 16 }}>{isDark ? '☾' : '☀'}</span>
          </button>

          {/* View site */}
          <Link
            href="/browse"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: muted,
              textDecoration: 'none',
              border: `1px solid ${border}`,
              marginBottom: 8,
            }}
          >
            View site
          </Link>

          {/* Sign out */}
          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: 'transparent',
              cursor: 'pointer',
              color: muted,
              fontSize: 13,
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 220, minWidth: 0 }}
        className="admin-main"
      >

        {/* Mobile topbar */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${border}`,
            background: sidebar,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
          className="admin-topbar-mobile"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: text, padding: 4 }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <img src="/zawaaj-wordmark.png" alt="Zawaaj" style={{ height: 20, width: 'auto' }} />
          <button
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 18, padding: 4 }}
            aria-label="Toggle theme"
          >
            {isDark ? '☾' : '☀'}
          </button>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
