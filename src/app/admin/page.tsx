'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardCounts {
  pendingProfiles: number
  approvedProfiles: number
  totalProfiles: number
  familiesPendingApproval: number
  familiesPendingEmail: number
  familiesTotal: number
  mutualIntros: number
  matchesThisWeek: number
  profilesNoFamily: number
  familiesNoProfile: number
}

interface InboxItem {
  key: string
  show: boolean
  priority: number
  accent: string
  count: number
  label: string
  sublabel: string
  href: string
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingProfiles: 0,
    approvedProfiles: 0,
    totalProfiles: 0,
    familiesPendingApproval: 0,
    familiesPendingEmail: 0,
    familiesTotal: 0,
    mutualIntros: 0,
    matchesThisWeek: 0,
    profilesNoFamily: 0,
    familiesNoProfile: 0,
  })

  useEffect(() => {
    async function init() {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('zawaaj_profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!profile?.is_admin) { router.replace('/login'); return }

      // Load all counts in parallel
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [
        pendingRes,
        approvedRes,
        totalRes,
        famPendingApprovalRes,
        famPendingEmailRes,
        famTotalRes,
        mutualRes,
        matchesRes,
        noFamilyRes,
        famWithProfilesRes,
      ] = await Promise.all([
        supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
          .eq('status', 'pending').eq('is_admin', false),
        supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
          .eq('status', 'approved').eq('is_admin', false),
        supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
          .eq('is_admin', false),
        supabase.from('zawaaj_family_accounts').select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),
        supabase.from('zawaaj_family_accounts').select('id', { count: 'exact', head: true })
          .eq('status', 'pending_email_verification'),
        supabase.from('zawaaj_family_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('zawaaj_introduction_requests').select('id', { count: 'exact', head: true })
          .eq('status', 'mutual'),
        supabase.from('zawaaj_matches').select('id', { count: 'exact', head: true })
          .eq('status', 'introduced').gte('introduced_date', sevenDaysAgo),
        supabase.from('zawaaj_profiles').select('id', { count: 'exact', head: true })
          .is('family_account_id', null).eq('is_admin', false)
          .not('status', 'in', '(rejected,withdrawn)'),
        supabase.from('zawaaj_family_accounts').select('id, profiles:zawaaj_profiles(id)'),
      ])

      // Count family accounts with no profiles
      const famWithProfiles = famWithProfilesRes.data ?? []
      const familiesNoProfile = famWithProfiles.filter(
        (f: { id: string; profiles: { id: string }[] | null }) =>
          !f.profiles || (f.profiles as { id: string }[]).length === 0
      ).length

      setCounts({
        pendingProfiles: pendingRes.count ?? 0,
        approvedProfiles: approvedRes.count ?? 0,
        totalProfiles: totalRes.count ?? 0,
        familiesPendingApproval: famPendingApprovalRes.count ?? 0,
        familiesPendingEmail: famPendingEmailRes.count ?? 0,
        familiesTotal: famTotalRes.count ?? 0,
        mutualIntros: mutualRes.count ?? 0,
        matchesThisWeek: matchesRes.count ?? 0,
        profilesNoFamily: noFamilyRes.count ?? 0,
        familiesNoProfile,
      })
      setLoading(false)
    }

    init().catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--admin-muted)', fontSize: 14 }}>Loading dashboard…</span>
      </div>
    )
  }

  // ─── Stat cards ──────────────────────────────────────────────────────────────

  const statCards = [
    {
      label: 'Pending review',
      value: counts.pendingProfiles,
      accent: 'var(--status-error)',
      accentBg: 'var(--status-error-bg)',
      href: '/admin/operations',
    },
    {
      label: 'Active members',
      value: counts.approvedProfiles,
      accent: 'var(--status-success)',
      accentBg: 'var(--status-success-bg)',
      href: '/admin/operations',
    },
    {
      label: 'Family accounts',
      value: counts.familiesTotal,
      accent: 'var(--gold)',
      accentBg: 'rgba(184,150,12,0.12)',
      href: '/admin/families',
    },
    {
      label: 'Intro queue',
      value: counts.mutualIntros,
      accent: 'var(--status-purple)',
      accentBg: 'var(--status-purple-bg)',
      href: '/admin/introductions',
    },
    {
      label: 'Introduced / 7d',
      value: counts.matchesThisWeek,
      accent: 'var(--status-info)',
      accentBg: 'var(--status-info-bg)',
      href: null,
    },
    {
      label: 'Total profiles',
      value: counts.totalProfiles,
      accent: 'var(--admin-muted)',
      accentBg: 'var(--admin-border)',
      href: null,
    },
  ]

  // ─── Inbox items ─────────────────────────────────────────────────────────────

  const inboxItems: InboxItem[] = [
    {
      key: 'pending',
      show: counts.pendingProfiles > 0,
      priority: 1,
      accent: 'var(--status-error)',
      count: counts.pendingProfiles,
      label: `${counts.pendingProfiles} profile${counts.pendingProfiles !== 1 ? 's' : ''} awaiting review`,
      sublabel: 'Approve or reject in Operations',
      href: '/admin/operations',
    },
    {
      key: 'famApproval',
      show: counts.familiesPendingApproval > 0,
      priority: 2,
      accent: 'var(--status-warning)',
      count: counts.familiesPendingApproval,
      label: `${counts.familiesPendingApproval} famil${counts.familiesPendingApproval !== 1 ? 'ies' : 'y'} awaiting activation`,
      sublabel: 'Contact details received — ready to activate',
      href: '/admin/families',
    },
    {
      key: 'famEmail',
      show: counts.familiesPendingEmail > 0,
      priority: 2,
      accent: 'var(--status-warning)',
      count: counts.familiesPendingEmail,
      label: `${counts.familiesPendingEmail} famil${counts.familiesPendingEmail !== 1 ? 'ies' : 'y'} awaiting email verification`,
      sublabel: 'Registered but email not yet verified',
      href: '/admin/families',
    },
    {
      key: 'mutual',
      show: counts.mutualIntros > 0,
      priority: 3,
      accent: 'var(--status-purple)',
      count: counts.mutualIntros,
      label: `${counts.mutualIntros} mutual intro${counts.mutualIntros !== 1 ? 's' : ''} awaiting facilitation`,
      sublabel: 'Both parties interested — contact families to progress',
      href: '/admin/introductions',
    },
    {
      key: 'noFamily',
      show: counts.profilesNoFamily > 0,
      priority: 4,
      accent: 'var(--admin-muted)',
      count: counts.profilesNoFamily,
      label: `${counts.profilesNoFamily} profile${counts.profilesNoFamily !== 1 ? 's' : ''} with no guardian account`,
      sublabel: 'Active profiles not linked to a registered family',
      href: '/admin/operations',
    },
    {
      key: 'famNoProfile',
      show: counts.familiesNoProfile > 0,
      priority: 4,
      accent: 'var(--admin-muted)',
      count: counts.familiesNoProfile,
      label: `${counts.familiesNoProfile} family account${counts.familiesNoProfile !== 1 ? 's' : ''} with no candidate`,
      sublabel: 'Guardian registered but no profile created yet',
      href: '/admin/families',
    },
  ]

  const visibleItems = inboxItems
    .filter(i => i.show)
    .sort((a, b) => a.priority - b.priority)

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text)', padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--admin-muted)', margin: '4px 0 0' }}>Command centre overview</p>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 28 }}>
        {statCards.map(card => {
          const inner = (
            <div
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                borderTop: `3px solid ${card.accent}`,
                borderRadius: 8,
                padding: '14px 16px',
                cursor: card.href ? 'pointer' : 'default',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: card.accent, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 5, fontWeight: 500 }}>{card.label}</div>
            </div>
          )
          return card.href ? (
            <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          )
        })}
      </div>

      {/* Inbox section */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
          Inbox
        </h2>

        {visibleItems.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '18px 20px',
            borderRadius: 10,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderLeft: '3px solid var(--status-success)',
          }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--status-success)' }}>All clear</div>
              <div style={{ fontSize: 12, color: 'var(--admin-muted)', marginTop: 2 }}>No items require attention right now</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleItems.map(item => (
              <Link
                key={item.key}
                href={item.href}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 16px',
                  borderRadius: 10,
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderLeft: `3px solid ${item.accent}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                  {/* Count badge */}
                  <span style={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--admin-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: item.accent,
                    flexShrink: 0,
                    padding: '0 6px',
                  }}>
                    {item.count}
                  </span>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>{item.sublabel}</div>
                  </div>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--admin-muted)', flexShrink: 0 }}>
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
