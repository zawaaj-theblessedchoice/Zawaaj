'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

interface Profile {
  id: string
  display_initials: string
  gender: string | null
  is_admin: boolean
  interests_this_month: number
  status: string
}

const NAV_LINKS = [
  { href: '/directory', label: 'Directory' },
  { href: '/events', label: 'Events' },
  { href: '/help', label: 'Help' },
  { href: '/my-profile', label: 'My Profile' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-200 text-gray-600',
    suspended: 'bg-red-200 text-red-800',
    introduced: 'bg-purple-100 text-purple-800',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  )
}

export default function NavBar() {
  const router = useRouter()
  const supabase = createClient()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const profileDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: profileRows }, { data: settingsRow }] = await Promise.all([
        supabase
          .from('zawaaj_profiles')
          .select('id, display_initials, gender, is_admin, interests_this_month, status')
          .eq('user_id', user.id),
        supabase
          .from('zawaaj_user_settings')
          .select('active_profile_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (!profileRows || profileRows.length === 0) return
      setProfiles(profileRows)

      const activeId = settingsRow?.active_profile_id ?? profileRows[0].id
      const active = profileRows.find((p) => p.id === activeId) ?? profileRows[0]
      setActiveProfile(active)
    }
    load()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSwitch(profileId: string) {
    if (!userId) return
    await supabase.from('zawaaj_user_settings').upsert(
      { user_id: userId, active_profile_id: profileId },
      { onConflict: 'user_id' }
    )
    window.location.reload()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const used = activeProfile?.interests_this_month ?? 0
  const badgeBg = used > 0 ? '#B8960C' : '#6B7280'

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 shadow-md"
      style={{ backgroundColor: '#1A1A1A' }}
    >
      {/* Left: Logo */}
      <div className="flex-shrink-0">
        <Link href="/" className="flex items-center">
          <ZawaajLogo size={32} tagline={false} />
        </Link>
      </div>

      {/* Center: Nav links (hidden on mobile) */}
      <div className="hidden md:flex flex-1 justify-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right: Admin, Allowance, Profile switcher, Sign out */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Admin link */}
        {activeProfile?.is_admin && (
          <Link
            href="/admin"
            className="hidden md:inline text-sm font-semibold"
            style={{ color: '#B8960C' }}
          >
            Admin
          </Link>
        )}

        {/* Monthly allowance badge */}
        {activeProfile && (
          <div
            title="Introduction requests this month"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white cursor-default select-none"
            style={{ backgroundColor: badgeBg }}
          >
            {used} / 5
          </div>
        )}

        {/* Profile switcher */}
        {activeProfile && (
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1 transition-colors"
            >
              <span>Acting as:</span>
              <span className="font-semibold">{activeProfile.display_initials}</span>
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 top-9 w-56 rounded-xl shadow-xl border border-white/10 py-1.5 z-50"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                  Switch profile
                </p>
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitch(p.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                      p.id === activeProfile.id ? 'text-white' : 'text-white/70'
                    }`}
                  >
                    <span className="font-medium">{p.display_initials}</span>
                    <StatusBadge status={p.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="hidden md:inline text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Sign out
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="md:hidden text-white/70 hover:text-white p-1"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div
          className="absolute top-14 left-0 right-0 shadow-xl border-t border-white/10 py-2 z-40"
          style={{ backgroundColor: '#1A1A1A' }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {activeProfile?.is_admin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-semibold"
              style={{ color: '#B8960C' }}
            >
              Admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
