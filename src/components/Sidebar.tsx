'use client'

import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'
import AvatarInitials from '@/components/AvatarInitials'

interface SidebarProps {
  activeRoute: string
  shortlistCount: number
  introRequestsCount: number
  profile: { display_initials: string; gender: string | null; first_name: string | null } | null
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
}: SidebarProps) {
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
      items: [{ label: 'My profile', href: '/my-profile', icon: <ProfileIcon /> }],
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
      {/* Logo */}
      <div style={{ padding: '20px 20px 12px' }}>
        <Link href="/browse" style={{ display: 'inline-block' }}>
          <ZawaajLogo size={40} tagline={false} />
        </Link>
      </div>

      {/* Private members label */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          padding: '0 20px 12px',
        }}
      >
        Private members
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '0 0 4px' }} />

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
                    fontWeight: 400,
                    color: active ? 'var(--gold)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    borderLeft: active
                      ? '3px solid var(--gold-border)'
                      : '3px solid transparent',
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

      {/* Profile footer */}
      {profile && (
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
    </aside>
  )
}
