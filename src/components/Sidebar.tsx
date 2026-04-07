'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'
import AvatarInitials from '@/components/AvatarInitials'

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

export default function Sidebar({
  activeRoute,
  shortlistCount,
  introRequestsCount,
  profile,
  managedProfiles,
  activeProfileId,
}: SidebarProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

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
      // Full reload so server components re-run with new active profile
      window.location.href = '/browse'
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
        { label: 'Browse all', href: '/browse?tab=all', icon: <BrowseIcon /> },
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
        { label: 'My profile', href: '/my-profile', icon: <ProfileIcon /> },
        { label: 'Add family member', href: '/add-profile', icon: <AddFamilyIcon /> },
      ],
    },
  ]

  return (
    <aside
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
      {/* Logo header */}
      <Link
        href="/browse"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 20px 22px',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(196,154,16,0.18)',
          background: 'linear-gradient(180deg, rgba(196,154,16,0.06) 0%, transparent 100%)',
          gap: 6,
        }}
      >
        <ZawaajLogo size={72} tagline={true} />
      </Link>

      {/* Nav sections */}
      <nav style={{ flex: 1 }}>
        {navItems.map(section => (
          <div key={section.section}>
            <SectionDivider label={section.section} />
            {section.items.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? 'var(--gold)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    borderLeft: active
                      ? '2px solid var(--gold)'
                      : '2px solid transparent',
                    background: active ? 'var(--gold-muted)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 20px rgba(196,154,16,0.07)' : 'none',
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
                  <span style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && <Badge count={item.badge} />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '8px 0 0' }} />

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
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProfile(p.id)}
                    disabled={isActive || switching}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      background: isActive ? 'var(--gold-muted)' : 'transparent',
                      border: 'none',
                      borderBottom: '0.5px solid var(--border-default)',
                      cursor: isActive ? 'default' : 'pointer',
                      color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                      fontSize: 12,
                      textAlign: 'left',
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
                    {p.status !== 'approved' && (
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
                Add family member
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
      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          borderTop: '0.5px solid var(--border-default)',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
          <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3M9 9.5l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Sign out
      </button>
    </aside>
  )
}
