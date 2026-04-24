'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvatarInitials from '@/components/AvatarInitials'
import ZawaajLogo from '@/components/ZawaajLogo'
import NotificationBell from '@/components/NotificationBell'

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

interface SidebarProps {
  activeRoute: string
  shortlistCount: number
  introRequestsCount: number
  profile: { display_initials: string; gender: string | null; first_name: string | null } | null
  /** All profiles linked to this account — shown when parent/guardian manages multiple candidates */
  managedProfiles?: ManagedProfile[]
  /** The currently active profile id — used to highlight the active profile in the switcher */
  activeProfileId?: string
  /** When false, Browse/Introductions/Shortlist are greyed-out and non-clickable */
  profileApproved?: boolean
  /** Mobile drawer open state — controlled by parent page */
  mobileOpen?: boolean
  /** Called when the user taps the mobile overlay or presses Escape to close the drawer */
  onMobileClose?: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

function Badge({ count }: { count: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: 'var(--gold-muted)',
        border: '0.5px solid var(--border-gold)',
        color: 'var(--gold)',
        fontSize: 10,
        fontWeight: 500,
        marginLeft: 6,
        flexShrink: 0,
      }}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function BrowseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function ShortlistIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M7.5 12.5C7.5 12.5 1.5 8.8 1.5 4.8a3 3 0 0 1 6-0.3 3 3 0 0 1 6 0.3c0 4-6 7.7-6 7.7Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RecommendedIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M7.5 1l1.7 3.5 3.8.55-2.75 2.68.65 3.77L7.5 9.35l-3.4 1.85.65-3.77L2 4.55l3.8-.55L7.5 1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IntroIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 13c0-2.2 1.8-4 4-4M14 13c0-2.2-1.8-4-4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.5 9.5v2M6.2 10.8h2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function EventsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 6.5h12M5 1.5V4M10 1.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 13.5c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function AddFamilyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 13c0-2.76 2.015-5 4.5-5s4.5 2.24 4.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11.5 5v4M13.5 7h-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.2 2.8l-1.06 1.06M3.86 11.14L2.8 12.2M12.2 12.2l-1.06-1.06M3.86 3.86L2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 13h5M7.5 10v3M3 1h9M3 1C3 5.5 5 8 7.5 10 10 8 12 5.5 12 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3H1.5C1.5 3 1.5 6.5 4 7M12 3h1.5C13.5 3 13.5 6.5 11 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 6a1.5 1.5 0 0 1 3 0c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7.5" cy="11" r="0.6" fill="currentColor" />
    </svg>
  )
}

/** Icon tile — 26×26 rounded square wrapping an SVG icon */
function IconTile({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 7,
        flexShrink: 0,
        background: active ? 'var(--gold-muted)' : 'var(--surface-3)',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </span>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '16px 20px 6px',
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
      }}
    >
      {label}
    </div>
  )
}

const PENDING_LOCKED = new Set(['/browse', '/introductions'])

export default function Sidebar({
  activeRoute,
  shortlistCount,
  introRequestsCount,
  profile,
  managedProfiles,
  activeProfileId,
  profileApproved = true,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const router = useRouter()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileOpen, onMobileClose])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const hasMultipleProfiles = (managedProfiles?.length ?? 0) > 1

  async function handleSwitchProfile(profileId: string) {
    if (profileId === activeProfileId || switching) return
    setSwitching(true)
    try {
      await fetch('/api/switch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })
      // Small delay so the DB write is fully committed before navigation
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push('/browse')
    } catch {
      setSwitching(false)
    }
  }
  const isActive = (href: string) => {
    // For tab-qualified links, exact match including query string
    if (href.includes('?tab=')) {
      return activeRoute === href
    }
    // /browse (no tab param) = recommended tab — active only when no tab param
    if (href === '/browse') {
      return activeRoute === '/browse'
    }
    // All other paths: prefix match
    const path = href.split('?')[0]
    return activeRoute === path || activeRoute.startsWith(path + '/')
  }

  const navItems: { section: string; items: NavItem[] }[] = [
    {
      section: 'Discover',
      items: [
        { label: 'Discover Profiles', href: '/browse?tab=all', icon: <BrowseIcon /> },
        { label: 'Recommended', href: '/browse', icon: <RecommendedIcon /> },
        {
          label: 'Shortlist',
          href: '/browse?tab=shortlist',
          icon: <ShortlistIcon />,
          badge: shortlistCount > 0 ? shortlistCount : undefined,
        },
      ],
    },
    {
      section: 'Activity',
      items: [
        {
          label: 'Introductions',
          href: '/introductions',
          icon: <IntroIcon />,
          badge: introRequestsCount > 0 ? introRequestsCount : undefined,
        },
        { label: 'Events', href: '/events', icon: <EventsIcon /> },
      ],
    },
    {
      section: 'Account',
      items: [
        {
          label: activeProfileId ? 'My profile' : 'Family account',
          href: activeProfileId ? '/my-profile' : '/family-account',
          icon: <ProfileIcon />,
        },
        { label: 'Add candidate profile', href: '/add-profile', icon: <AddFamilyIcon /> },
        { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
      ],
    },
  ]

  return (
    <>
    {/* Mobile overlay — tapping it closes the drawer */}
    {mobileOpen && (
      <div
        className="sidebar-mobile-overlay"
        onClick={onMobileClose}
        aria-hidden="true"
      />
    )}
    <aside
      className={`sidebar-desktop${mobileOpen ? ' sidebar-desktop--open' : ''}`}
      style={{
        width: 200,
        flexShrink: 0,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--surface-2)',
        borderRight: '0.5px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 100,
      }}
    >
      {/* Logo header — centred wordmark */}
      <div
        style={{
          borderBottom: '1px solid rgba(196,154,16,0.18)',
          background: 'linear-gradient(180deg, rgba(196,154,16,0.06) 0%, transparent 100%)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 12px',
            textDecoration: 'none',
          }}
        >
          <img
            src="/zawaaj-wordmark.png"
            alt="Zawaaj"
            style={{ height: 26, width: 'auto', maxWidth: '100%' }}
          />
        </Link>
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1 }}>
        {navItems.map(section => (
          <div key={section.section}>
            <SectionDivider label={section.section} />
            {section.items.map(item => {
              const active = isActive(item.href)
              const basePath = item.href.split('?')[0]
              const locked = !profileApproved && PENDING_LOCKED.has(basePath)
              return locked ? (
                <div
                  key={item.href}
                  title="Available once your profile is approved."
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '6px 16px', fontSize: 13, fontWeight: 400,
                    color: 'var(--text-muted)', cursor: 'not-allowed',
                    borderLeft: '2px solid transparent', opacity: 0.45,
                    userSelect: 'none',
                  }}
                >
                  <IconTile active={false}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{item.icon}</span>
                  </IconTile>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? 'var(--gold)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    borderLeft: active
                      ? '2px solid var(--gold)'
                      : '2px solid transparent',
                    background: active ? 'var(--gold-muted)' : 'transparent',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  <IconTile active={active}>
                    <span style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', display: 'flex' }}>
                      {item.icon}
                    </span>
                  </IconTile>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && <Badge count={item.badge} />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Upgrade — Premium CTA */}
      <div style={{ padding: '6px 12px 10px' }}>
        <Link
          href="/settings?tab=membership"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 12px',
            borderRadius: 10,
            background: 'var(--gold-muted)',
            border: '0.5px solid rgba(201,168,76,0.25)',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--gold-muted)')}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--gold-muted)')}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 7, background: 'rgba(201,168,76,0.15)', flexShrink: 0,
          }}>
            <span style={{ color: 'var(--gold-light)', display: 'flex' }}><TrophyIcon /></span>
          </span>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--gold-light)' }}>Premium</span>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '0' }} />

      {/* Profile footer — single profile: simple link; multi-profile: switcher */}
      {profile && !hasMultipleProfiles && (
        <Link
          href="/my-profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontSize: 12.5,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
          }}
        >
          <AvatarInitials
            initials={profile.display_initials}
            gender={profile.gender}
            size="sm"
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.first_name ?? 'My profile'}
          </span>
        </Link>
      )}

      {/* Multi-profile switcher — shown for parent/guardian accounts */}
      {profile && hasMultipleProfiles && (
        <div style={{ padding: '10px 12px' }}>
          {/* "Acting as" label */}
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 6,
              paddingLeft: 4,
            }}
          >
            Acting as
          </div>

          {/* Current active profile — always visible */}
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'var(--surface-3)',
              border: '0.5px solid var(--border-gold)',
              borderRadius: 9,
              padding: '7px 10px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              textAlign: 'left',
            }}
          >
            <AvatarInitials
              initials={profile.display_initials}
              gender={profile.gender}
              size="sm"
            />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.first_name ?? profile.display_initials}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
              {switcherOpen ? '▲' : '▼'}
            </span>
          </button>

          {/* Expandable profile list */}
          {switcherOpen && (
            <div
              style={{
                marginTop: 4,
                background: 'var(--surface)',
                border: '0.5px solid var(--border-default)',
                borderRadius: 9,
                overflow: 'hidden',
              }}
            >
              {(managedProfiles ?? []).map(p => {
                const isActive = p.id === activeProfileId
                const isPending = p.status === 'pending'
                return (
                  <button
                    key={p.id}
                    onClick={() => !isPending && handleSwitchProfile(p.id)}
                    disabled={isActive || switching || isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      background: isActive ? 'var(--gold-muted)' : 'transparent',
                      border: 'none',
                      borderBottom: '0.5px solid var(--border-default)',
                      cursor: isActive || isPending ? 'default' : 'pointer',
                      color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                      fontSize: 12,
                      textAlign: 'left',
                      opacity: isPending ? 0.5 : 1,
                      pointerEvents: isPending ? 'none' : undefined,
                    }}
                  >
                    <AvatarInitials
                      initials={p.display_initials}
                      gender={p.gender}
                      size="sm"
                    />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.first_name ?? p.display_initials}
                    </span>
                    {isActive && (
                      <span style={{ fontSize: 9, color: 'var(--gold)', flexShrink: 0 }}>✓</span>
                    )}
                    {isPending && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        background: 'var(--surface-3)',
                        border: '0.5px solid var(--border-default)',
                        borderRadius: 4,
                        padding: '1px 5px',
                        flexShrink: 0,
                      }}>
                        Pending
                      </span>
                    )}
                    {!isPending && p.status !== 'approved' && !isActive && (
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {p.status}
                      </span>
                    )}
                  </button>
                )
              })}
              <Link
                href="/my-profile"
                style={{
                  display: 'block',
                  padding: '7px 10px',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Manage profiles →
              </Link>
              <Link
                href="/add-profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  fontSize: 12.5,
                  color: 'var(--gold)',
                  textDecoration: 'none',
                  borderTop: '0.5px solid var(--border-default)',
                  marginTop: 4,
                  paddingTop: 12,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                Add candidate profile
              </Link>
            </div>
          )}

          {switching && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
              Switching…
            </p>
          )}
        </div>
      )}
      {/* Help + Privacy + Sign out — grouped with slight separation */}
      <div style={{ padding: '8px 10px', borderTop: '0.5px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Link
          href="/privacy"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '9px 10px',
            background: 'none', borderRadius: 8,
            color: 'var(--text-secondary)', fontSize: 13,
            textDecoration: 'none',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-3)'
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'none'
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7.5 1.5L2 4v4c0 3.3 2.4 5.7 5.5 6.5C10.6 13.7 13 11.3 13 8V4L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          Privacy
        </Link>

        <button
          onClick={() => window.open('/help', '_blank')}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '9px 10px',
            background: 'none', border: 'none', borderRadius: 8,
            color: 'var(--text-secondary)', fontSize: 13,
            cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
        >
          <HelpIcon />
          Help centre
        </button>

        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '9px 10px',
            background: 'none', border: 'none', borderRadius: 8,
            color: 'var(--text-secondary)', fontSize: 13,
            cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5.5 2.5H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2.5M9.5 10l3-3-3-3M12.5 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
    </>
  )
}
