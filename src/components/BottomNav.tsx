'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface BottomNavProps {
  activeRoute: string
  introRequestsCount: number
  shortlistCount: number
}

function FindIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="14" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 19c0-3.3 2.7-6 6-6M20 19c0-3.3-2.7-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ShortlistIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 18S3 13.4 3 7.5a4 4 0 0 1 8-0.5 4 4 0 0 1 8 0.5C19 13.4 11 18 11 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function IntroIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 8l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 19c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="5" cy="11" r="1.5" fill="currentColor"/>
      <circle cx="11" cy="11" r="1.5" fill="currentColor"/>
      <circle cx="17" cy="11" r="1.5" fill="currentColor"/>
    </svg>
  )
}

function EventsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 8h16M6 2v4M14 2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8L4.4 4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export default function BottomNav({ activeRoute, introRequestsCount, shortlistCount }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string) {
    if (href.includes('?tab=')) return activeRoute === href
    if (href === '/browse') return activeRoute === '/browse'
    const path = href.split('?')[0]
    return activeRoute === path || activeRoute.startsWith(path + '/')
  }

  const tabs = [
    { href: '/browse?tab=all', icon: <FindIcon />, label: 'Find' },
    { href: '/browse?tab=shortlist', icon: <ShortlistIcon />, label: 'Shortlist', badge: shortlistCount },
    { href: '/introductions', icon: <IntroIcon />, label: 'Intros', badge: introRequestsCount },
    { href: '/my-profile', icon: <ProfileIcon />, label: 'Profile' },
  ]

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="bottom-nav-bar"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 60,
          background: 'var(--surface-2)',
          borderTop: '0.5px solid var(--border-default)',
          zIndex: 200,
          alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {tabs.map(tab => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: active ? 'var(--gold)' : 'var(--text-muted)',
                textDecoration: 'none',
                position: 'relative',
                fontSize: 10,
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {(tab.badge ?? 0) > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 6, right: '50%', transform: 'translateX(10px)',
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  color: 'var(--surface)',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* More */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            color: moreOpen ? 'var(--gold)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: moreOpen ? 600 : 400,
          }}
        >
          <MoreIcon />
          <span>More</span>
        </button>
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 198,
          }}
        />
      )}

      {/* More sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: moreOpen ? 60 : -300,
          left: 0, right: 0,
          background: 'var(--surface-2)',
          borderTop: '0.5px solid var(--border-default)',
          borderRadius: '12px 12px 0 0',
          zIndex: 199,
          transition: 'bottom 0.25s cubic-bezier(0.4,0,0.2,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-default)' }}/>
        </div>
        {[
          { href: '/events',      label: 'Events',             icon: <EventsIcon /> },
          { href: '/settings',    label: 'Settings',           icon: <SettingsIcon /> },
          { href: '/add-profile', label: 'Add family member',  icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 17c0-3.3 2.2-6 5-6s5 2.7 5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M15 6v5M17.5 8.5h-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          ) },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: 15,
              borderBottom: '0.5px solid var(--border-default)',
            }}
          >
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 24px',
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 15,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3M13 14l4-4-4-4M17 10H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </>
  )
}
