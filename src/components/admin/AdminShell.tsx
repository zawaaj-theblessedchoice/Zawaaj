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

function FollowupsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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

function AccountsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 5.5h12" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.5" cy="8.5" r="1.2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7.5 7.5h4M7.5 9.5h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
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

function PaymentsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="9" r="0.9" fill="currentColor" />
      <path d="M6.5 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

function FeedbackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM7 4.5v3M7 9.5h.007" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badgeKey?: 'followups'
}
interface NavSection {
  label: string
  items: NavItem[]
}

// Super Admin sidebar — full platform access (Phase 3 structure)
const SA_NAV_SECTIONS: NavSection[] = [
  {
    label: 'Work',
    items: [
      { href: '/admin/inbox',         label: 'Inbox',         icon: <DashboardIcon /> },
      { href: '/admin/followups',     label: 'Follow-ups',    icon: <FollowupsIcon />, badgeKey: 'followups' },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/admin/families',      label: 'Families',      icon: <AccountsIcon /> },
      { href: '/admin/introductions', label: 'Introductions', icon: <IntroIcon /> },
      { href: '/admin/events',        label: 'Events',        icon: <EventsIcon /> },
      { href: '/admin/feedback',      label: 'Feedback',      icon: <FeedbackIcon /> },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/dashboard',     label: 'Dashboard',     icon: <DashboardIcon /> },
      { href: '/admin/managers',      label: 'Managers',      icon: <ManagersIcon /> },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: <SubscriptionsIcon /> },
      { href: '/admin/payments',      label: 'Payments',      icon: <PaymentsIcon /> },
      { href: '/admin/import',        label: 'Import',        icon: <ImportIcon /> },
      { href: '/admin/offers',        label: 'Offers',        icon: <OffersIcon /> },
    ],
  },
]

// Manager sidebar — scoped to their assigned work only (Phase 3 structure)
const MANAGER_NAV_SECTIONS: NavSection[] = [
  {
    label: 'My work',
    items: [
      { href: '/admin/introductions', label: 'My queue',      icon: <IntroIcon /> },
      { href: '/admin/followups',     label: 'My follow-ups', icon: <FollowupsIcon />, badgeKey: 'followups' },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/admin/families',      label: 'Families',      icon: <AccountsIcon /> },
      { href: '/admin/events',        label: 'Events',        icon: <EventsIcon /> },
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
  const [followupCount, setFollowupCount] = useState(0)
  const [followupOverdue, setFollowupOverdue] = useState(false)
  // Manager identity. The sidebar badge scopes the follow-up count to the
  // manager's intros, which are keyed by PROFILE id on
  // intro_requests.assigned_manager_id (NOT zawaaj_managers.id — see Phase 3
  // pre-flight). The managers.id needed for family/match scoping is resolved
  // inside the Families page where it's consumed, not here.
  const [managerProfileId, setManagerProfileId] = useState<string | null>(null)
  const isManager = role === 'manager'

  // Resolve the manager's active profile id on mount (manager view only)
  useEffect(() => {
    if (role !== 'manager') return
    async function resolveManagerProfileId() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: settings } = await supabase
          .from('zawaaj_user_settings')
          .select('active_profile_id')
          .eq('user_id', user.id)
          .maybeSingle()
        setManagerProfileId((settings?.active_profile_id as string | null) ?? null)
      } catch {
        // non-fatal — scoped badge falls back to empty rather than crash
      }
    }
    resolveManagerProfileId()
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch follow-up badge counts on mount.
  // Manager view scopes to their assigned intros (by profile id); SA sees all.
  useEffect(() => {
    async function fetchFollowupCounts() {
      try {
        const ACTIVE = ['following_up', 'contact_made', 'both_willing', 'meeting_arranged', 'met']
        // Managers: wait until profile id resolved, then scope; SA: unscoped.
        if (role === 'manager' && !managerProfileId) return

        let activeQ = supabase
          .from('zawaaj_introduction_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ACTIVE)
        if (role === 'manager' && managerProfileId) activeQ = activeQ.eq('assigned_manager_id', managerProfileId)
        const { count } = await activeQ
        setFollowupCount(count ?? 0)

        const cutoff = new Date(Date.now() - 14 * 86400000).toISOString()
        let overdueQ = supabase
          .from('zawaaj_introduction_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ACTIVE)
          .lt('facilitated_at', cutoff)
        if (role === 'manager' && managerProfileId) overdueQ = overdueQ.eq('assigned_manager_id', managerProfileId)
        const { count: overdueCount } = await overdueQ
        setFollowupOverdue((overdueCount ?? 0) > 0)
      } catch {
        // non-fatal — sidebar badge is decorative
      }
    }
    fetchFollowupCounts()
  }, [role, managerProfileId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Intentional, hydration-safe pattern: state initialises to 'dark' (matching
    // the server render), then we correct from localStorage AFTER mount. Moving
    // this read into a lazy useState initializer would make the client hydration
    // render read 'light' while the server rendered 'dark' → hydration mismatch.
    // So the setState-in-effect is correct here; the lint rule is a false positive.
    const t = getTheme()
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // A JSX value, not a component-defined-in-render. Rendering it as {sidebarContent}
  // (instead of <SidebarContent />) avoids react-hooks/static-components and the
  // remount-every-render footgun, while rendering identically (it was never memoised).
  const sidebarContent = (
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
      className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}
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

      {/* Nav — role-specific structure (Phase 3) */}
      <nav style={{ flex: 1 }}>
        {(isManager ? MANAGER_NAV_SECTIONS : SA_NAV_SECTIONS).map(section => (
          <div key={section.label}>
            <SectionLabel label={section.label} muted={muted} />
            {section.items.map(item => {
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
                  {item.badgeKey === 'followups' && followupCount > 0 && (
                    <span style={{
                      background: followupOverdue ? '#d97706' : gold,
                      color: '#fff',
                      borderRadius: 10,
                      padding: '1px 6px',
                      fontSize: 10,
                      fontWeight: 700,
                      minWidth: 16,
                      textAlign: 'center' as const,
                      lineHeight: 1.6,
                    }}>
                      {followupCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ borderTop: `1px solid ${border}` }}>
        {/* Role switcher — manager view only: jump back to their member account */}
        {isManager && (
          <button
            onClick={() => router.push('/browse')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 18px',
              border: 'none',
              borderBottom: `1px solid ${border}`,
              background: 'rgba(184,150,12,0.05)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Switch to</div>
            <div style={{ fontSize: 13, color: gold, fontWeight: 500 }}>My Zawaaj account ↗</div>
          </button>
        )}

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
      {sidebarContent}

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
