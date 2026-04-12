'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import ProfileModal, { ProfileRecord } from '@/components/ProfileModal'
import AvatarInitials from '@/components/AvatarInitials'
import CompatibilityBar from '@/components/CompatibilityBar'
import Toast from '@/components/Toast'
import UpgradeModal from '@/components/UpgradeModal'
import { scoreCompatibility } from '@/lib/compatibility'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'
import { getRecommendations, EXCLUSION_STATUSES, TOP_PICKS_COUNT } from '@/lib/recommendations'
import { EMPTY_FILTERS } from '@/lib/filter-types'
import type { FilterState, MustHaveableKey } from '@/lib/filter-types'

type Tab = 'recommended' | 'new' | 'all' | 'shortlist'
type SortKey = 'relevant' | 'newest' | 'age_asc' | 'age_desc'

const PROFILES_PER_PAGE = 24

interface IntroRequest {
  target_profile_id: string
  status: string
  created_at?: string
  responded_at?: string | null
}

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

export interface BrowseClientProps {
  profiles: ProfileRecord[]
  viewerProfile: ProfileRecord
  savedIds: Set<string>
  introRequests: IntroRequest[]
  newCount: number
  monthlyUsed: number
  newSince: string | null
  /** All profiles on this account — enables profile switcher for parent/guardian accounts */
  managedProfiles?: ManagedProfile[]
  /** Currently active profile id */
  activeProfileId?: string
  /** Member's current subscription plan */
  plan?: 'free' | 'plus' | 'premium'
  /** Number of currently active (pending) introduction requests */
  activeCount?: number
  /** Max concurrent active requests for this plan (null = unlimited) */
  activeLimit?: number | null
  /** Persisted filter state from previous session (Plus/Premium only; null for Free) */
  initialFilters?: FilterState | null
}

// FilterState, MustHaveableKey, and EMPTY_FILTERS are imported from '@/lib/filter-types'
// Re-export FilterState so page.tsx (which already imported from here) keeps working
export type { FilterState }

function calcAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function isCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11.5,
        border: selected ? '0.5px solid var(--border-gold)' : '0.5px solid var(--border-default)',
        background: selected ? 'var(--gold-muted)' : 'var(--surface-3)',
        color: selected ? 'var(--gold)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  )
}

interface ProfileCardProps {
  profile: ProfileRecord
  isNew: boolean
  isSaved: boolean
  introStatus: 'none' | 'pending' | 'accepted' | 'declined' | 'expired' | 'limit_reached'
  score: number
  showCompatBar: boolean
  onOpen: () => void
  onToggleSave: () => void
  suggested?: boolean
}

function ProfileCard({
  profile,
  isNew,
  isSaved,
  introStatus,
  score,
  showCompatBar,
  onOpen,
  onToggleSave,
  suggested = false,
}: ProfileCardProps) {
  const [hovered, setHovered] = useState(false)

  const displayName = profile.display_initials

  const age = calcAge(profile.date_of_birth)
  const ageLine = [age !== null ? `${age}` : profile.age_display, profile.location]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="profile-card-outer"
      style={{
        position: 'relative',
        minHeight: 140,
        borderRadius: 13,
        background: hovered ? 'var(--surface-3)' : 'var(--surface-2)',
        border: `0.5px solid ${isSaved || hovered ? 'var(--border-gold)' : 'var(--border-default)'}`,
        cursor: 'pointer',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s, background 0.18s',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.2)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* New dot */}
      {isNew && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--gold)',
          }}
        />
      )}

      {/* Action buttons — share + shortlist */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Share button */}
        <button
          onClick={e => {
            e.stopPropagation()
            const url = `${window.location.origin}/profile/${profile.id}`
            if (navigator.share) {
              navigator.share({ title: 'Zawaaj profile', url }).catch(() => {})
            } else {
              navigator.clipboard.writeText(url).then(() => {
                const btn = e.currentTarget as HTMLButtonElement
                const prev = btn.style.opacity
                btn.style.opacity = '1'
                setTimeout(() => { btn.style.opacity = prev }, 1200)
              }).catch(() => {})
            }
          }}
          aria-label="Share profile"
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', opacity: 0.4,
            cursor: 'pointer', padding: 2,
            display: 'flex', alignItems: 'center',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.4')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>

        {/* Heart / shortlist button */}
        <button
          onClick={e => {
            e.stopPropagation()
            onToggleSave()
          }}
          aria-label={isSaved ? 'Remove from shortlist' : 'Save to shortlist'}
          style={{
            background: 'none', border: 'none',
            color: 'var(--gold)',
            opacity: isSaved ? 1 : 0.25,
            fontSize: 14, cursor: 'pointer', padding: 2,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          onMouseLeave={e =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = isSaved ? '1' : '0.25')
          }
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      {/* Avatar col — circle only, age+location beneath */}
      <div className="profile-card-avatar-col">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <AvatarInitials
            initials={profile.display_initials}
            gender={profile.gender}
            size="sm"
          />
          {ageLine && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 110,
              }}
            >
              {ageLine}
            </div>
          )}
        </div>
      </div>

      {/* Detail col (mobile: takes remaining width) */}
      <div className="profile-card-detail-col">
        {/* Profession */}
        {profile.profession_detail && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {profile.profession_detail}
          </div>
        )}

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {profile.school_of_thought && (
            <span
              style={{
                fontSize: 10.5,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'var(--surface-3)',
                color: 'var(--text-muted)',
                border: '0.5px solid var(--border-default)',
              }}
            >
              {profile.school_of_thought}
            </span>
          )}
          {profile.ethnicity && (
            <span
              style={{
                fontSize: 10.5,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'var(--surface-3)',
                color: 'var(--text-muted)',
                border: '0.5px solid var(--border-default)',
              }}
            >
              {profile.ethnicity}
            </span>
          )}
          {suggested && (
            <span
              style={{
                fontSize: 10.5,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(184,150,12,0.12)',
                color: 'var(--gold)',
                border: '0.5px solid rgba(184,150,12,0.35)',
              }}
            >
              Suggested
            </span>
          )}
        </div>
      </div>

      {/* Compat bar — hidden on mobile via CSS class */}
      {showCompatBar && (
        <div className="profile-card-compat" style={{ marginTop: 2 }}>
          <CompatibilityBar score={score} />
        </div>
      )}

      {/* Status line — only show for meaningful states */}
      {introStatus === 'accepted' && (
        <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>
          Interest accepted — our team will be in touch
        </div>
      )}
      {introStatus === 'pending' && (
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
            Interest sent — awaiting response
          </div>
        </div>
      )}
      {introStatus === 'declined' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          This family has respectfully responded
        </div>
      )}
      {introStatus === 'expired' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Interest expired
        </div>
      )}
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  borderRadius: 6,
  border: '0.5px solid var(--border-default)',
  background: 'var(--surface-3)',
  color: 'var(--text-primary)',
  fontSize: 12,
  outline: 'none',
}

// ─── FilterSectionLabel ───────────────────────────────────────────────────────

function FilterSectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        marginTop: 12,
        marginBottom: 8,
        borderBottom: '0.5px solid var(--border-default)',
        paddingBottom: 4,
      }}
    >
      {label}
    </div>
  )
}

// ─── FilterField ──────────────────────────────────────────────────────────────
// Wraps a filter control with a label row and optional Premium must-have toggle.

function FilterField({
  label,
  mustHaveKey,
  showMustHave,
  mustHaveValue,
  onMustHaveToggle,
  children,
}: {
  label: string
  mustHaveKey: string
  showMustHave: boolean
  mustHaveValue: boolean
  onMustHaveToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        {showMustHave && (
          <button
            onClick={onMustHaveToggle}
            title="Mark as must-have"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '1px 3px',
              fontSize: 12,
              color: mustHaveValue ? 'var(--gold)' : 'var(--text-muted)',
              opacity: mustHaveValue ? 1 : 0.4,
              transition: 'color 0.15s, opacity 0.15s',
            }}
            aria-label={`${mustHaveKey} must-have toggle`}
          >
            ★
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Browsing-As Banner ───────────────────────────────────────────────────────
// Shown on browse when the account manages multiple candidate profiles.
// Gives the parent/guardian a clear "You are browsing as X" reminder + 1-click switch.

interface BrowsingAsBannerProps {
  managedProfiles: ManagedProfile[]
  activeProfileId: string
  activeName: string
  activeGender: string | null
  activeInitials: string
}

function BrowsingAsBanner({
  managedProfiles,
  activeProfileId,
  activeName,
  activeGender,
  activeInitials,
}: BrowsingAsBannerProps) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function switchTo(profileId: string) {
    if (profileId === activeProfileId || switching) return
    setSwitching(true)
    try {
      await fetch('/api/switch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })
      window.location.href = '/browse'
    } catch {
      setSwitching(false)
    }
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}
    >
      {/* Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 12px 6px 8px',
          minWidth: 260,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-gold)',
          borderRadius: 30,
          fontSize: 12.5,
          color: 'var(--text-secondary)',
        }}
      >
        <AvatarInitials initials={activeInitials} gender={activeGender} size="sm" />
        <span style={{ flex: 1 }}>
          <span className="browsing-as-text">Browsing as </span>
          <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {activeName}
          </strong>
        </span>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'var(--surface-3)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--gold)',
            cursor: 'pointer',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          Switch {open ? '▲' : '▼'}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 200,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10,
            overflow: 'hidden',
            minWidth: 220,
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
          }}
        >
          {managedProfiles.map((p) => {
            const isActiveP = p.id === activeProfileId
            const displayN = p.first_name
              ? `${p.first_name}`
              : p.display_initials
            return (
              <button
                key={p.id}
                onClick={() => switchTo(p.id)}
                disabled={isActiveP || switching}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '9px 12px',
                  background: isActiveP ? 'var(--gold-muted)' : 'transparent',
                  border: 'none',
                  borderBottom: '0.5px solid var(--border-default)',
                  cursor: isActiveP ? 'default' : 'pointer',
                  color: isActiveP ? 'var(--gold)' : 'var(--text-secondary)',
                  fontSize: 12.5,
                  textAlign: 'left',
                }}
              >
                <AvatarInitials initials={p.display_initials} gender={p.gender} size="sm" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayN}
                  {p.gender && (
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 5 }}>
                      {p.gender === 'female' ? '♀' : '♂'}
                    </span>
                  )}
                </span>
                {isActiveP ? (
                  <span style={{ fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>Active ✓</span>
                ) : (
                  <span style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    background: 'var(--surface-3)',
                    border: '0.5px solid var(--border-default)',
                    borderRadius: 4, padding: '1px 6px', flexShrink: 0,
                  }}>
                    Switch
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {switching && (
        <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          Switching…
        </span>
      )}
    </div>
  )
}

const SOT_OPTIONS = ['Hanafi', "Shafi'i", 'Maliki', 'Hanbali', 'Any']
const MARITAL_OPTIONS = [
  { label: 'Never married', value: 'never_married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
]
const CHILDREN_OPTIONS = [
  { label: 'No children', value: 'no_children' },
  { label: 'Has children', value: 'has_children' },
]

export default function BrowseClient({
  profiles,
  viewerProfile,
  savedIds: initialSavedIds,
  introRequests: initialIntroRequests,
  newCount,
  monthlyUsed: initialMonthlyUsed,
  newSince,
  managedProfiles,
  activeProfileId,
  plan = 'free',
  activeCount = 0,
  activeLimit = null,
  initialFilters = null,
}: BrowseClientProps) {
  const planConfig = getPlanConfig((plan ?? 'free') as Plan)
  const canFilter      = planConfig.advancedFilters   // false for Free
  const canMustHave    = planConfig.mustHaveFilters    // true for Premium only
  const canRecommend   = planConfig.recommendations   // false for Free
  const monthlyLimit   = planConfig.monthlyLimit
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const pathname       = usePathname()
  const tab            = searchParams.get('tab')
  const activeRoute    = tab ? `${pathname}?tab=${tab}` : pathname

  // Free users never get persisted filters even if somehow passed
  const safeInitialFilters: FilterState = canFilter && initialFilters ? initialFilters : EMPTY_FILTERS

  const rawTab = searchParams.get('tab')
  const initialTab: Tab =
    rawTab === 'shortlist' ||
    rawTab === 'new' ||
    rawTab === 'all' ||
    rawTab === 'recommended'
      ? rawTab
      : 'recommended'

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  // Sync tab state when URL changes (e.g. sidebar link clicks change the URL
  // without calling handleTabChange, so the useState initialiser doesn't rerun)
  useEffect(() => { setActiveTab(initialTab) }, [initialTab])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds))
  const [introRequests, setIntroRequests] = useState<IntroRequest[]>(initialIntroRequests)
  const [monthlyUsed, setMonthlyUsed] = useState(initialMonthlyUsed)
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('relevant')
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<FilterState>(safeInitialFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(safeInitialFilters)
  const [visibleCount, setVisibleCount] = useState(PROFILES_PER_PAGE)

  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter panel on outside click — sync pending state back to applied
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
        setPendingFilters(appliedFilters) // discard uncommitted changes
      }
    }
    if (filterOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen, appliedFilters])

  // Compat scores cache
  const compatScores = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of profiles) {
      map.set(p.id, scoreCompatibility(viewerProfile, p).score)
    }
    return map
  }, [profiles, viewerProfile])

  // Profile IDs excluded from recommendations (active intro requests)
  const excludedProfileIds = useMemo(
    () => new Set(introRequests.filter(r => EXCLUSION_STATUSES.has(r.status)).map(r => r.target_profile_id)),
    [introRequests]
  )

  // Recommendations list — only computed for Plus/Premium
  const recommendations = useMemo(
    () => getRecommendations(profiles, compatScores, appliedFilters, plan as Plan, excludedProfileIds),
    [profiles, compatScores, appliedFilters, plan, excludedProfileIds]
  )

  // Accepted count for sidebar badge (interests the other family has accepted)
  const pendingMutualCount = useMemo(
    () => introRequests.filter(r => r.status === 'accepted').length,
    [introRequests]
  )

  // Helper: get intro status for a profile
  // declined/expired show their status label for 48h then revert to 'none'
  const getIntroStatus = useCallback(
    (profileId: string): 'none' | 'pending' | 'accepted' | 'declined' | 'expired' | 'limit_reached' => {
      const req = introRequests.find(r => r.target_profile_id === profileId)
      if (!req) {
        if (monthlyUsed >= monthlyLimit) return 'limit_reached'
        return 'none'
      }
      if (req.status === 'pending')   return 'pending'
      if (req.status === 'accepted')  return 'accepted'
      // declined/expired: show for 48 hours, then revert to none
      if (req.status === 'declined' || req.status === 'expired') {
        const settledAt = req.responded_at ?? req.created_at
        if (settledAt) {
          const hoursSince = (Date.now() - new Date(settledAt).getTime()) / (1000 * 60 * 60)
          if (hoursSince < 48) return req.status as 'declined' | 'expired'
        }
        if (monthlyUsed >= monthlyLimit) return 'limit_reached'
        return 'none'
      }
      if (monthlyUsed >= monthlyLimit) return 'limit_reached'
      return 'none'
    },
    [introRequests, monthlyUsed, monthlyLimit]
  )

  // Filter profiles — Free users always see the full unfiltered list
  function applyFilters(list: ProfileRecord[]): ProfileRecord[] {
    if (!canFilter) return list
    const f = appliedFilters
    return list.filter(p => {
      const age = calcAge(p.date_of_birth)
      if (f.ageMin && age !== null && age < parseInt(f.ageMin)) return false
      if (f.ageMax && age !== null && age > parseInt(f.ageMax)) return false
      if (f.location.trim()) {
        const loc = f.location.toLowerCase()
        if (!p.location?.toLowerCase().includes(loc)) return false
      }
      if (f.maritalStatus.length > 0 && !f.maritalStatus.includes(p.marital_status ?? '')) return false
      if (f.hasChildren.length > 0) {
        const cv = p.has_children === true ? 'has_children' : 'no_children'
        if (!f.hasChildren.includes(cv)) return false
      }
      if (f.educationLevel.length > 0 && !f.educationLevel.includes(p.education_level ?? '')) return false
      if (f.ethnicity.length > 0 && !f.ethnicity.includes(p.ethnicity ?? '')) return false
      if (f.religiosity.length > 0 && !f.religiosity.includes(p.religiosity ?? '')) return false
      if (
        f.schoolOfThought.length > 0 &&
        !f.schoolOfThought.some(
          s => s.toLowerCase() === 'any' || s.toLowerCase() === p.school_of_thought?.toLowerCase()
        )
      ) return false
      return true
    })
  }

  // Search filter
  function applySearch(list: ProfileRecord[]): ProfileRecord[] {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      p =>
        p.first_name?.toLowerCase().includes(q) ||
        p.profession_detail?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
    )
  }

  // Sort
  function applySort(list: ProfileRecord[], key: SortKey): ProfileRecord[] {
    return [...list].sort((a, b) => {
      if (key === 'relevant') {
        return (compatScores.get(b.id) ?? 0) - (compatScores.get(a.id) ?? 0)
      }
      if (key === 'newest') {
        return (b.listed_at ?? '').localeCompare(a.listed_at ?? '')
      }
      if (key === 'age_asc') {
        const ageA = calcAge(a.date_of_birth) ?? 999
        const ageB = calcAge(b.date_of_birth) ?? 999
        return ageA - ageB
      }
      if (key === 'age_desc') {
        const ageA = calcAge(a.date_of_birth) ?? 0
        const ageB = calcAge(b.date_of_birth) ?? 0
        return ageB - ageA
      }
      return 0
    })
  }

  // Tab-filtered base profiles
  // 'recommended' tab uses its own render path — return [] so the standard grid is empty
  const tabProfiles = useMemo((): ProfileRecord[] => {
    if (activeTab === 'recommended') return []
    if (activeTab === 'shortlist') return profiles.filter(p => savedIds.has(p.id))
    if (activeTab === 'new') {
      if (!newSince) return []
      return profiles.filter(p => p.listed_at && p.listed_at > newSince)
    }
    return profiles
  }, [activeTab, profiles, savedIds, newSince])

  // Effective sort: "new" tab always defaults to newest
  const effectiveSortKey: SortKey = activeTab === 'new' && sortKey === 'relevant' ? 'newest' : sortKey

  const sortedAndFiltered = useMemo(() => {
    const filtered = applyFilters(applySearch(tabProfiles))
    return applySort(filtered, effectiveSortKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabProfiles, appliedFilters, searchQuery, effectiveSortKey])

  // Reset pagination when filters/tab/search/sort change
  useEffect(() => {
    setVisibleCount(PROFILES_PER_PAGE)
  }, [activeTab, appliedFilters, searchQuery, effectiveSortKey])

  const displayedProfiles = sortedAndFiltered.slice(0, visibleCount)

  const showCompatBar = activeTab === 'recommended' || activeTab === 'all'

  // Unique option lists derived from loaded profiles
  const allEthnicities = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) { if (p.ethnicity) set.add(p.ethnicity) }
    return Array.from(set).sort()
  }, [profiles])

  const allEducationLevels = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) { if (p.education_level) set.add(p.education_level) }
    return Array.from(set).sort()
  }, [profiles])

  const allReligiosities = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) { if (p.religiosity) set.add(p.religiosity) }
    return Array.from(set).sort()
  }, [profiles])

  // Auto-persist filters for Plus/Premium — fire-and-forget, never blocks UI
  const persistFilters = useCallback((f: FilterState | null) => {
    if (!canFilter) return
    fetch('/api/browse-state/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f ? { filters: f } : { clear: true }),
    }).catch(() => { /* non-critical */ })
  }, [canFilter])

  // Count active (non-empty) filter criteria for the indicator badge
  const activeFilterCount = useMemo((): number => {
    const f = appliedFilters
    return [
      f.ageMin, f.ageMax, f.location.trim(),
    ].filter(Boolean).length +
      f.maritalStatus.length +
      f.hasChildren.length +
      f.educationLevel.length +
      f.ethnicity.length +
      f.religiosity.length +
      f.schoolOfThought.length
  }, [appliedFilters])

  // Handle tab change
  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'recommended') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`/browse?${params.toString()}`)
  }

  // Toggle save
  async function handleToggleSave(profileId: string) {
    const supabase = createClient()
    const wasSaved = savedIds.has(profileId)
    const targetProfile = profiles.find(p => p.id === profileId)
    const name = targetProfile?.display_initials ?? 'Profile'

    if (wasSaved) {
      setSavedIds(prev => {
        const next = new Set(prev)
        next.delete(profileId)
        return next
      })
      await supabase
        .from('zawaaj_saved_profiles')
        .delete()
        .eq('saved_by', viewerProfile.id)
        .eq('profile_id', profileId)
      setToast(`${name} removed from Shortlist`)
    } else {
      setSavedIds(prev => new Set([...prev, profileId]))
      await supabase.from('zawaaj_saved_profiles').insert({
        profile_id: profileId,
        saved_by: viewerProfile.id,
      })
      setToast(`${name} added to Shortlist`)
    }
  }

  // Handle intro request — routes through the API to enforce all business rules
  async function handleRequestIntro(profileId: string) {
    const res = await fetch('/api/introduction-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_profile_id: profileId }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      let msg: string
      if (json.error === 'Already requested') {
        msg = 'You have already expressed interest in this profile.'
      } else if (json.error === 'Monthly limit reached') {
        msg = 'Monthly interest limit reached. This resets on the 1st of next month.'
      } else {
        // Pass through known server messages; generic fallback for unexpected errors
        msg = json.error ?? 'Unable to send interest — please try again'
      }
      setToast(msg)
      return
    }

    setIntroRequests(prev => [
      ...prev,
      {
        target_profile_id: profileId,
        status: 'pending',
        created_at: new Date().toISOString(),
        responded_at: null,
      },
    ])
    setMonthlyUsed(prev => prev + 1)

    setToast('Interest sent')
  }

  const openProfile = openProfileId ? profiles.find(p => p.id === openProfileId) ?? null : null

  function toggleChip<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'new', label: 'New' },
    { id: 'all', label: 'All' },
    { id: 'shortlist', label: 'Shortlist' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Sidebar */}
      <Sidebar
        activeRoute={activeTab !== 'recommended' ? `/browse?tab=${activeTab}` : '/browse'}
        shortlistCount={savedIds.size}
        introRequestsCount={pendingMutualCount}
        profile={viewerProfile}
        managedProfiles={managedProfiles}
        activeProfileId={activeProfileId}
      />

      {/* Main content */}
      <main
        className="browse-main"
        style={{
          marginLeft: 200,
          flex: 1,
          minHeight: '100vh',
          overflowY: 'auto',
          padding: '28px 28px 60px',
        }}
      >
        {/* Browsing-As banner — only shown when account manages multiple profiles */}
        {(managedProfiles?.length ?? 0) > 1 && activeProfileId && (
          <BrowsingAsBanner
            managedProfiles={managedProfiles!}
            activeProfileId={activeProfileId}
            activeName={
              viewerProfile.first_name
                ? `${viewerProfile.first_name}${viewerProfile.last_name ? ' ' + viewerProfile.last_name[0] + '.' : ''}`
                : viewerProfile.display_initials
            }
            activeGender={viewerProfile.gender ?? null}
            activeInitials={viewerProfile.display_initials}
          />
        )}

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="topbar-title-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Find a Match
            </h1>
            {/* Active limit banner — calm gold tone, shown only when at limit */}
            {activeLimit !== null && activeCount >= activeLimit && (
              <span
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  padding: '5px 12px',
                  borderRadius: 8,
                  background: 'rgba(184,150,12,0.09)',
                  border: '0.5px solid rgba(184,150,12,0.3)',
                  cursor: 'default',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gold)', lineHeight: 1.4 }}>
                  You have {activeCount} active interest{activeCount !== 1 ? 's' : ''} awaiting a response
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Withdraw a request to send another
                </span>
              </span>
            )}

            {/* Monthly request usage pill */}
            <span
              title="Introduction requests used this calendar month"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 999,
                background: monthlyUsed >= monthlyLimit ? 'rgba(248,113,113,0.1)' : 'var(--surface-3)',
                border: `0.5px solid ${monthlyUsed >= monthlyLimit ? 'rgba(248,113,113,0.3)' : 'var(--border-default)'}`,
                fontSize: 11.5,
                fontWeight: 500,
                color: monthlyUsed >= monthlyLimit ? 'var(--status-error)' : 'var(--text-muted)',
                cursor: 'default',
              }}
            >
              {monthlyUsed}/{monthlyLimit} requests
            </span>

            {/* Upgrade nudge — shown to members without templates who have used ≥ 1 request */}
            {!planConfig.canUseTemplates && monthlyUsed >= 1 && (
              <button
                onClick={() => setShowUpgrade(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(184,150,12,0.12)',
                  border: '0.5px solid rgba(184,150,12,0.35)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--gold)',
                  cursor: 'pointer',
                }}
              >
                Get more →
              </button>
            )}
          </div>

          {/* Search + Filter + Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search — full input (hidden on mobile) */}
            <div className="topbar-search-full" style={{ position: 'relative' }}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                style={{
                  position: 'absolute',
                  left: 9,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search name, profession, location…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 10px 7px 28px',
                  borderRadius: 8,
                  border: '0.5px solid var(--border-default)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  width: 220,
                  outline: 'none',
                }}
              />
            </div>
            {/* Search icon — mobile only */}
            <button
              className="topbar-search-icon"
              onClick={() => { /* expand search on mobile */ }}
              style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: 'var(--surface-3)', border: '0.5px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)' }}
              aria-label="Search"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Filters applied indicator — Plus/Premium with active filters */}
            {canFilter && activeFilterCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: 'rgba(184,150,12,0.09)',
                  border: '0.5px solid rgba(184,150,12,0.3)',
                  fontSize: 11.5,
                  color: 'var(--gold)',
                }}
              >
                Filters applied
                <button
                  onClick={() => {
                    setAppliedFilters(EMPTY_FILTERS)
                    setPendingFilters(EMPTY_FILTERS)
                    persistFilters(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  Clear
                </button>
              </span>
            )}

            {/* Filter button */}
            <div style={{ position: 'relative' }} ref={filterRef}>
              <button
                onClick={() => {
                  const opening = !filterOpen
                  setFilterOpen(opening)
                  if (opening) setPendingFilters(appliedFilters)
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: `0.5px solid ${filterOpen ? 'var(--border-gold)' : 'var(--border-default)'}`,
                  background: filterOpen ? 'rgba(184,150,12,0.08)' : 'var(--surface-2)',
                  color: filterOpen ? 'var(--gold)' : 'var(--text-secondary)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="3" y1="6" x2="19" y2="6"/>
                  <line x1="3" y1="11" x2="19" y2="11"/>
                  <line x1="3" y1="16" x2="19" y2="16"/>
                  <circle cx="8" cy="6" r="2.5" fill="var(--surface-2)" strokeWidth="1.7"/>
                  <circle cx="14" cy="11" r="2.5" fill="var(--surface-2)" strokeWidth="1.7"/>
                  <circle cx="9" cy="16" r="2.5" fill="var(--surface-2)" strokeWidth="1.7"/>
                </svg>
                <span className="topbar-filter-label">Filter</span>
                {canFilter && activeFilterCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 16,
                      height: 16,
                      borderRadius: 999,
                      background: 'var(--gold)',
                      color: 'var(--surface)',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '0 4px',
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter dropdown */}
              {filterOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    width: 320,
                    background: 'var(--surface-2)',
                    border: '0.5px solid var(--border-default)',
                    borderRadius: 12,
                    padding: '16px',
                    zIndex: 200,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                  }}
                >
                  {/* Panel header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                      Filter
                    </span>
                    <button
                      onClick={() => setFilterOpen(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
                    >
                      ×
                    </button>
                  </div>

                  {/* ── Free upgrade banner ─────────────────────────────────── */}
                  {!canFilter && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(184,150,12,0.08)',
                        border: '0.5px solid rgba(184,150,12,0.3)',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gold)', marginBottom: 6 }}>
                        Filters are available with Premium
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                        Upgrade to filter by age, location, education, and more.
                      </div>
                      <button
                        onClick={() => { setFilterOpen(false); setShowUpgrade(true) }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 7,
                          border: 'none',
                          background: 'var(--gold)',
                          color: 'var(--surface)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Upgrade to Premium →
                      </button>
                    </div>
                  )}

                  {/* ── Filter controls ──────────────────────────────────────── */}
                  {/* For Free users: controls are visually dimmed but clicks are allowed.
                      A transparent overlay captures every click and triggers the upgrade flow. */}
                  <div style={{ position: 'relative', opacity: canFilter ? 1 : 0.35 }}>
                    {!canFilter && (
                      <div
                        onClick={() => {
                          setToast('Filters are available with Premium')
                          setShowUpgrade(true)
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 10,
                          cursor: 'pointer',
                        }}
                      />
                    )}

                    {/* ── SECTION: Personal ─────────────────────────────────── */}
                    <FilterSectionLabel label="Personal" />

                    {/* Age range */}
                    <FilterField
                      label="Age range"
                      mustHaveKey="ageMin"
                      showMustHave={canMustHave}
                      mustHaveValue={!!pendingFilters.mustHave.ageMin}
                      onMustHaveToggle={() =>
                        setPendingFilters(f => ({
                          ...f,
                          mustHave: { ...f.mustHave, ageMin: !f.mustHave.ageMin || undefined },
                        }))
                      }
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="number" placeholder="Min"
                          value={pendingFilters.ageMin}
                          onChange={e => setPendingFilters(f => ({ ...f, ageMin: e.target.value }))}
                          style={inputStyle}
                          min={18} max={80}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                        <input
                          type="number" placeholder="Max"
                          value={pendingFilters.ageMax}
                          onChange={e => setPendingFilters(f => ({ ...f, ageMax: e.target.value }))}
                          style={inputStyle}
                          min={18} max={80}
                        />
                      </div>
                    </FilterField>

                    {/* Location */}
                    <FilterField
                      label="Location"
                      mustHaveKey="location"
                      showMustHave={canMustHave}
                      mustHaveValue={!!pendingFilters.mustHave.location}
                      onMustHaveToggle={() =>
                        setPendingFilters(f => ({
                          ...f,
                          mustHave: { ...f.mustHave, location: !f.mustHave.location || undefined },
                        }))
                      }
                    >
                      <input
                        type="text" placeholder="e.g. London"
                        value={pendingFilters.location}
                        onChange={e => setPendingFilters(f => ({ ...f, location: e.target.value }))}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </FilterField>

                    {/* Marital status */}
                    <FilterField
                      label="Marital status"
                      mustHaveKey="maritalStatus"
                      showMustHave={canMustHave}
                      mustHaveValue={!!pendingFilters.mustHave.maritalStatus}
                      onMustHaveToggle={() =>
                        setPendingFilters(f => ({
                          ...f,
                          mustHave: { ...f.mustHave, maritalStatus: !f.mustHave.maritalStatus || undefined },
                        }))
                      }
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {MARITAL_OPTIONS.map(opt => (
                          <FilterChip
                            key={opt.value} label={opt.label}
                            selected={pendingFilters.maritalStatus.includes(opt.value)}
                            onClick={() => setPendingFilters(f => ({ ...f, maritalStatus: toggleChip(f.maritalStatus, opt.value) }))}
                          />
                        ))}
                      </div>
                    </FilterField>

                    {/* Children */}
                    <FilterField
                      label="Children"
                      mustHaveKey="hasChildren"
                      showMustHave={canMustHave}
                      mustHaveValue={!!pendingFilters.mustHave.hasChildren}
                      onMustHaveToggle={() =>
                        setPendingFilters(f => ({
                          ...f,
                          mustHave: { ...f.mustHave, hasChildren: !f.mustHave.hasChildren || undefined },
                        }))
                      }
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {CHILDREN_OPTIONS.map(opt => (
                          <FilterChip
                            key={opt.value} label={opt.label}
                            selected={pendingFilters.hasChildren.includes(opt.value)}
                            onClick={() => setPendingFilters(f => ({ ...f, hasChildren: toggleChip(f.hasChildren, opt.value) }))}
                          />
                        ))}
                      </div>
                    </FilterField>

                    {/* ── SECTION: Religious ────────────────────────────────── */}
                    <FilterSectionLabel label="Religious" />

                    {/* School of thought */}
                    <FilterField
                      label="School of thought"
                      mustHaveKey="schoolOfThought"
                      showMustHave={canMustHave}
                      mustHaveValue={!!pendingFilters.mustHave.schoolOfThought}
                      onMustHaveToggle={() =>
                        setPendingFilters(f => ({
                          ...f,
                          mustHave: { ...f.mustHave, schoolOfThought: !f.mustHave.schoolOfThought || undefined },
                        }))
                      }
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {SOT_OPTIONS.map(opt => (
                          <FilterChip
                            key={opt} label={opt}
                            selected={pendingFilters.schoolOfThought.includes(opt)}
                            onClick={() => setPendingFilters(f => ({ ...f, schoolOfThought: toggleChip(f.schoolOfThought, opt) }))}
                          />
                        ))}
                      </div>
                    </FilterField>

                    {/* Religiosity */}
                    {allReligiosities.length > 0 && (
                      <FilterField
                        label="Religiosity"
                        mustHaveKey="religiosity"
                        showMustHave={canMustHave}
                        mustHaveValue={!!pendingFilters.mustHave.religiosity}
                        onMustHaveToggle={() =>
                          setPendingFilters(f => ({
                            ...f,
                            mustHave: { ...f.mustHave, religiosity: !f.mustHave.religiosity || undefined },
                          }))
                        }
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allReligiosities.map(opt => (
                            <FilterChip
                              key={opt} label={opt}
                              selected={pendingFilters.religiosity.includes(opt)}
                              onClick={() => setPendingFilters(f => ({ ...f, religiosity: toggleChip(f.religiosity, opt) }))}
                            />
                          ))}
                        </div>
                      </FilterField>
                    )}

                    {/* ── SECTION: Background ───────────────────────────────── */}
                    <FilterSectionLabel label="Background" />

                    {/* Ethnicity */}
                    {allEthnicities.length > 0 && (
                      <FilterField
                        label="Ethnicity"
                        mustHaveKey="ethnicity"
                        showMustHave={canMustHave}
                        mustHaveValue={!!pendingFilters.mustHave.ethnicity}
                        onMustHaveToggle={() =>
                          setPendingFilters(f => ({
                            ...f,
                            mustHave: { ...f.mustHave, ethnicity: !f.mustHave.ethnicity || undefined },
                          }))
                        }
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allEthnicities.map(opt => (
                            <FilterChip
                              key={opt} label={opt}
                              selected={pendingFilters.ethnicity.includes(opt)}
                              onClick={() => setPendingFilters(f => ({ ...f, ethnicity: toggleChip(f.ethnicity, opt) }))}
                            />
                          ))}
                        </div>
                      </FilterField>
                    )}

                    {/* Education level */}
                    {allEducationLevels.length > 0 && (
                      <FilterField
                        label="Education"
                        mustHaveKey="educationLevel"
                        showMustHave={canMustHave}
                        mustHaveValue={!!pendingFilters.mustHave.educationLevel}
                        onMustHaveToggle={() =>
                          setPendingFilters(f => ({
                            ...f,
                            mustHave: { ...f.mustHave, educationLevel: !f.mustHave.educationLevel || undefined },
                          }))
                        }
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allEducationLevels.map(opt => (
                            <FilterChip
                              key={opt} label={opt}
                              selected={pendingFilters.educationLevel.includes(opt)}
                              onClick={() => setPendingFilters(f => ({ ...f, educationLevel: toggleChip(f.educationLevel, opt) }))}
                            />
                          ))}
                        </div>
                      </FilterField>
                    )}

                  </div>{/* end disabled overlay wrapper */}

                  {/* Must-have legend — Premium only */}
                  {canMustHave && (
                    <div style={{ marginTop: 4, marginBottom: 12, fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      ★ = Must-have — only profiles matching this criterion will appear
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setPendingFilters(EMPTY_FILTERS)
                        setAppliedFilters(EMPTY_FILTERS)
                        persistFilters(null)
                      }}
                      disabled={!canFilter}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12,
                        background: 'var(--surface-3)',
                        border: '0.5px solid var(--border-default)',
                        color: canFilter ? 'var(--text-secondary)' : 'var(--text-muted)',
                        cursor: canFilter ? 'pointer' : 'not-allowed',
                        opacity: canFilter ? 1 : 0.5,
                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        setAppliedFilters(pendingFilters)
                        persistFilters(pendingFilters)
                        setFilterOpen(false)
                      }}
                      disabled={!canFilter}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 500,
                        background: canFilter ? 'var(--gold)' : 'var(--surface-3)',
                        border: 'none',
                        color: canFilter ? 'var(--surface)' : 'var(--text-muted)',
                        cursor: canFilter ? 'pointer' : 'not-allowed',
                        opacity: canFilter ? 1 : 0.5,
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '0.5px solid var(--border-default)',
                borderRadius: 8,
                background: 'var(--surface-2)',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '7px 6px 7px 10px',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4v14M7 4L4 7M7 4l3 3M15 18V4M15 18l-3-3M15 18l3-3"/>
                </svg>
              </span>
              <select
                value={effectiveSortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                style={{
                  padding: '7px 10px 7px 4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="relevant">Most relevant</option>
                <option value="newest">Newest listed</option>
                <option value="age_asc">Age: youngest first</option>
                <option value="age_desc">Age: oldest first</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '0.5px solid var(--border-default)',
            marginBottom: 16,
          }}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 400,
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                  color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginBottom: -1,
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}
                {tab.id === 'new' && newCount > 0 && (
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
                    }}
                  >
                    {newCount > 9 ? '9+' : newCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* New since last visit pill */}
        {newCount > 0 && activeTab !== 'new' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'var(--gold-muted)',
              border: '0.5px solid var(--border-gold)',
              fontSize: 12,
              color: 'var(--gold)',
              cursor: 'pointer',
            }}
            onClick={() => handleTabChange('new')}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--gold)',
              }}
            />
            {newCount} new {newCount === 1 ? 'profile' : 'profiles'} since your last visit
          </div>
        )}

        {/* ── Recommended tab ────────────────────────────────────────────────── */}
        {activeTab === 'recommended' && (
          <>
            {/* Free: upsell */}
            {!canRecommend && (
              <div
                style={{
                  padding: '28px 24px',
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  border: '0.5px solid rgba(184,150,12,0.3)',
                  maxWidth: 480,
                  margin: '40px auto',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Recommendations available with Plus
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                  Upgrade to see profiles chosen for you based on your preferences — no manual searching needed.
                </div>
                <button
                  onClick={() => setShowUpgrade(true)}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--gold)',
                    color: 'var(--surface)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Upgrade to Plus →
                </button>
              </div>
            )}

            {/* Plus / Premium: show recommendations */}
            {canRecommend && (
              <>
                {recommendations.length === 0 ? (
                  /* Empty state */
                  <div
                    style={{
                      padding: '20px 20px 20px 17px',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      border: '0.5px solid var(--border-default)',
                      borderLeft: '3px solid var(--border-gold)',
                      maxWidth: 480,
                      margin: '40px auto',
                    }}
                  >
                    <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
                      No recommendations yet
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Try updating your filters or check back as new profiles are approved.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Premium: Top Picks section */}
                    {plan === 'premium' && (
                      <>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.08em',
                            color: 'var(--gold)',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          ★ Top Picks
                        </div>
                        <div
                          className="profile-grid"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 14,
                            marginBottom: recommendations.length > TOP_PICKS_COUNT ? 28 : 0,
                          }}
                        >
                          {recommendations.slice(0, TOP_PICKS_COUNT).map(entry => {
                            const introStatus = getIntroStatus(entry.profile.id)
                            const isNew = newSince !== null && entry.profile.listed_at !== null && entry.profile.listed_at > newSince
                            return (
                              <ProfileCard
                                key={entry.profile.id}
                                profile={entry.profile}
                                isNew={isNew}
                                isSaved={savedIds.has(entry.profile.id)}
                                introStatus={introStatus}
                                score={entry.compatScore}
                                showCompatBar={true}
                                suggested={true}
                                onOpen={() => setOpenProfileId(entry.profile.id)}
                                onToggleSave={() => handleToggleSave(entry.profile.id)}
                              />
                            )
                          })}
                        </div>

                        {/* Remaining recommendations beyond Top Picks */}
                        {recommendations.length > TOP_PICKS_COUNT && (
                          <>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.08em',
                                color: 'var(--text-muted)',
                                marginBottom: 12,
                              }}
                            >
                              More recommendations
                            </div>
                            <div
                              className="profile-grid"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: 14,
                              }}
                            >
                              {recommendations.slice(TOP_PICKS_COUNT).map(entry => {
                                const introStatus = getIntroStatus(entry.profile.id)
                                const isNew = newSince !== null && entry.profile.listed_at !== null && entry.profile.listed_at > newSince
                                return (
                                  <ProfileCard
                                    key={entry.profile.id}
                                    profile={entry.profile}
                                    isNew={isNew}
                                    isSaved={savedIds.has(entry.profile.id)}
                                    introStatus={introStatus}
                                    score={entry.compatScore}
                                    showCompatBar={true}
                                    suggested={true}
                                    onOpen={() => setOpenProfileId(entry.profile.id)}
                                    onToggleSave={() => handleToggleSave(entry.profile.id)}
                                  />
                                )
                              })}
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Plus: flat list (no Top Picks section) */}
                    {plan !== 'premium' && (
                      <div
                        className="profile-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 14,
                        }}
                      >
                        {recommendations.map(entry => {
                          const introStatus = getIntroStatus(entry.profile.id)
                          const isNew = newSince !== null && entry.profile.listed_at !== null && entry.profile.listed_at > newSince
                          return (
                            <ProfileCard
                              key={entry.profile.id}
                              profile={entry.profile}
                              isNew={isNew}
                              isSaved={savedIds.has(entry.profile.id)}
                              introStatus={introStatus}
                              score={entry.compatScore}
                              showCompatBar={true}
                              suggested={true}
                              onOpen={() => setOpenProfileId(entry.profile.id)}
                              onToggleSave={() => handleToggleSave(entry.profile.id)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── All other tabs (new / all / shortlist) ─────────────────────────── */}
        {activeTab !== 'recommended' && (
          <>
            {/* No results */}
            {sortedAndFiltered.length === 0 && (
              <div
                style={{
                  padding: '20px 20px 20px 17px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '0.5px solid var(--border-default)',
                  borderLeft: '3px solid var(--border-gold)',
                  maxWidth: 480,
                  margin: '40px auto',
                }}
              >
                <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
                  {activeTab === 'shortlist' ? 'No saved profiles yet' : 'No profiles match'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {activeTab === 'shortlist'
                    ? 'Browse profiles and tap the heart icon to save them to your shortlist.'
                    : 'Try adjusting your filters or search to see more profiles.'}
                </div>
              </div>
            )}

            {/* Card grid */}
            <div
              className="profile-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {displayedProfiles.map(profile => {
                const introStatus = getIntroStatus(profile.id)
                const score = compatScores.get(profile.id) ?? 0
                const isNew = newSince !== null && profile.listed_at !== null && profile.listed_at > newSince

                return (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isNew={isNew}
                    isSaved={savedIds.has(profile.id)}
                    introStatus={introStatus}
                    score={score}
                    showCompatBar={showCompatBar}
                    onOpen={() => setOpenProfileId(profile.id)}
                    onToggleSave={() => handleToggleSave(profile.id)}
                  />
                )
              })}
            </div>

            {/* Show more */}
            {sortedAndFiltered.length > visibleCount && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 16 }}>
                <button
                  onClick={() => setVisibleCount(v => v + PROFILES_PER_PAGE)}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 10,
                    border: '0.5px solid var(--border-gold)',
                    background: 'var(--gold-muted)',
                    color: 'var(--gold)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,154,16,0.2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-muted)')}
                >
                  Show more
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing {Math.min(visibleCount, sortedAndFiltered.length)} of {sortedAndFiltered.length} profiles
                </span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Profile modal */}
      <ProfileModal
        profile={openProfile}
        onClose={() => setOpenProfileId(null)}
        isOwnProfile={false}
        viewerProfile={viewerProfile}
        isSaved={openProfileId ? savedIds.has(openProfileId) : false}
        onToggleSave={handleToggleSave}
        introStatus={openProfileId ? getIntroStatus(openProfileId) : 'none'}
        onRequestIntro={handleRequestIntro}
        monthlyUsed={monthlyUsed}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Upgrade modal — triggered by topbar nudge */}
      {showUpgrade && (
        <UpgradeModal trigger="intro_limit" onClose={() => setShowUpgrade(false)} />
      )}

      <BottomNav
        activeRoute={activeRoute}
        introRequestsCount={introRequests.filter(r => r.status === 'pending').length}
        shortlistCount={savedIds.size}
      />
    </div>
  )
}
