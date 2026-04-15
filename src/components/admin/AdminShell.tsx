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

// ─── Icons ────────────────────────────────────────────────────────────────────

function OperationsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="6" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="11" width="5" height="2" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 2.5h4M8.5 7.5h4M8.5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IntroIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="4.5" cy="4.5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9.5" cy="4.5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 12c0-1.93 1.57-3.5 3.5-3.5M13 12c0-1.93-1.57-3.5-3.5-3.5M7 9v2M5.7 10.3h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function MatchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 12S1.5 8.5 1.5 4.8a3 3 0 0 1 5.5-1.65A3 3 0 0 1 12.5 4.8C12.5 8.5 7 12 7 12Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function ConciergeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1l1.5 3.1L12 4.6l-2.5 2.4.6 3.4L7 8.8l-3.1 1.6.6-3.4L2 4.6l3.5-.5L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function ManagersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10 5.5v3M11.5 7h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SubscriptionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6.5h11" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 9.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function FamiliesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="4" cy="4" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="4" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 11.5C1.5 9.8 2.6 8.5 4 8.5M12.5 11.5C12.5 9.8 11.4 8.5 10 8.5M4.8 6.2C5.4 7 6.1 7.2 7 7.2S8.6 7 9.2 6.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function EventsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 6h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4 8.5h2M8 8.5h2M4 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function OffersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 8.5L8.5 2h3.5v3.5L5.5 12 2 8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="10.5" cy="3.5" r="0.8" fill="currentColor" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1.5v7M4.5 6l2.5 2.5L9.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 10v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 5.5a1.5 1.5 0 0 1 3 0c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="10.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 2.5H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2.5M9.5 10l3-3-3-3M12.5 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { href: '/admin',               label: 'Dashboard',     icon: <DashboardIcon />,     superOnly: true  },
      { href: '/admin/operations',    label: 'Operations',    icon: <OperationsIcon />,    superOnly: true  },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/admin/introductions', label: 'Introductions', icon: <IntroIcon />,          superOnly: false },
      { href: '/admin/matches',       label: 'Matches',       icon: <MatchIcon />,          superOnly: true  },
      { href: '/admin/concierge',     label: 'Concierge',     icon: <ConciergeIcon />,      superOnly: true  },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/admin/families',      label: 'Families',      icon: <FamiliesIcon />,       superOnly: true  },
      { href: '/admin/events',        label: 'Events',        icon: <EventsIcon />,         superOnly: true  },
      { href: '/admin/offers',        label: 'Offers',        icon: <OffersIcon />,         superOnly: true  },
      { href: '/admin/managers',      label: 'Managers',      icon: <ManagersIcon />,       superOnly: true  },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: <SubscriptionsIcon />,  superOnly: true  },
      { href: '/admin/import',        label: 'Import',        icon: <ImportIcon />,         superOnly: true  },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── IconTile ─────────────────────────────────────────────────────────────────

function IconTile({ children, active, isDark }: { children: React.ReactNode; active: boolean; isDark: boolean }) {
  const bg = active
    ? 'rgba(184,150,12,0.15)'
    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 6,
        flexShrink: 0,
        background: bg,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </span>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ label, muted }: { label: string; muted: string }) {
  return (
    <div
      style={{
        padding: '14px 20px 5px',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        color: muted,
      }}
    >
      {label}
    </div>
  )
}

// ─── AdminShell ───────────────────────────────────────────────────────────────

export function AdminShell({ role, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const t = getTheme()
    setTheme(t)
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
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

  // Theme-aware colours
  const isDark    = theme === 'dark'
  const bg        = isDark ? '#111111' : '#f8f7f4'
  const sidebar   = isDark ? '#161616' : '#ffffff'
  const border    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const text      = isDark ? 'rgba(255,255,255,0.85)' : '#1a1a1a'
  const muted     = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)'
  const gold      = '#B8960C'

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
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
        left: sidebarOpen ? 0 : undefined,
        zIndex: 50,
        transition: 'transform 0.2s ease',
        overflowY: 'auto',
      }}
      className="admin-sidebar"
    >
      {/* Logo */}
      <Link
        href={role === 'super_admin' ? '/admin' : '/admin/introductions'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 16px',
          textDecoration: 'none',
          borderBottom: `1px solid ${isDark ? 'rgba(184,150,12,0.2)' : 'rgba(184,150,12,0.15)'}`,
          background: isDark
            ? 'linear-gradient(180deg, rgba(184,150,12,0.07) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(184,150,12,0.05) 0%, transparent 100%)',
        }}
      >
        <img
          src="/zawaaj-wordmark.png"
          alt="Zawaaj"
          style={{ height: 22, width: 'auto', opacity: isDark ? 1 : 0.85 }}
        />
      </Link>

      {/* Role badge */}
      <div style={{ padding: '10px 16px 4px' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
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
      <nav style={{ flex: 1 }}>
        {NAV_SECTIONS.map(section => {
          const visibleItems = section.items.filter(item => !item.superOnly || role === 'super_admin')
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label}>
              <SectionLabel label={section.label} muted={muted} />
              {visibleItems.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '6px 16px',
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      color: active ? gold : muted,
                      textDecoration: 'none',
                      borderLeft: active ? `2px solid ${gold}` : '2px solid transparent',
                      background: active ? 'rgba(184,150,12,0.07)' : 'transparent',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                  >
                    <IconTile active={active} isDark={isDark}>
                      <span style={{ color: active ? gold : muted, display: 'flex' }}>
                        {item.icon}
                      </span>
                    </IconTile>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ borderTop: `1px solid ${border}` }}>
        {/* View site */}
        <Link
          href="/browse"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 18px',
            fontSize: 13,
            color: muted,
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 1.5C5.5 3 4.5 5 4.5 7s1 4 2.5 5.5M7 1.5C8.5 3 9.5 5 9.5 7S8.5 11 7 12.5M1.5 7h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span>View site</span>
        </Link>

        {/* Help */}
        <Link
          href="/admin/help"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 18px',
            fontSize: 13,
            color: isActive('/admin/help') ? gold : muted,
            textDecoration: 'none',
            borderLeft: isActive('/admin/help') ? `2px solid ${gold}` : '2px solid transparent',
            background: isActive('/admin/help') ? 'rgba(184,150,12,0.07)' : 'transparent',
            transition: 'color 0.15s',
          }}
        >
          <HelpIcon />
          <span>Help</span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            padding: '9px 18px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: muted,
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 14, width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDark ? '☀' : '☾'}
          </span>
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            padding: '9px 18px 14px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: muted,
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          <SignOutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div
      data-theme={isDark ? 'dark' : undefined}
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

      {/* ── Sidebar (desktop always visible, mobile slide-in) ── */}
      <SidebarContent />

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
