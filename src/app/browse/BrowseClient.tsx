'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import ProfileModal, { ProfileRecord } from '@/components/ProfileModal'
import AvatarInitials from '@/components/AvatarInitials'
import CompatibilityBar from '@/components/CompatibilityBar'
import Toast from '@/components/Toast'
import { scoreCompatibility } from '@/lib/compatibility'

type Tab = 'recommended' | 'new' | 'all' | 'shortlist'
type SortKey = 'relevant' | 'newest' | 'age_asc' | 'age_desc'

interface IntroRequest {
  target_profile_id: string
  status: string
  created_at?: string
}

export interface BrowseClientProps {
  profiles: ProfileRecord[]
  viewerProfile: ProfileRecord
  savedIds: Set<string>
  introRequests: IntroRequest[]
  newCount: number
  monthlyUsed: number
  newSince: string | null
}

interface FilterState {
  ageMin: string
  ageMax: string
  schoolOfThought: string[]
  ethnicity: string[]
  maritalStatus: string[]
  hasChildren: string[]
}

const EMPTY_FILTERS: FilterState = {
  ageMin: '',
  ageMax: '',
  schoolOfThought: [],
  ethnicity: [],
  maritalStatus: [],
  hasChildren: [],
}

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
  introStatus: 'none' | 'requested' | 'mutual' | 'limit_reached'
  score: number
  showCompatBar: boolean
  onOpen: () => void
  onToggleSave: () => void
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
}: ProfileCardProps) {
  const [hovered, setHovered] = useState(false)

  const displayName =
    `${profile.first_name ?? ''} ${profile.last_name ? profile.last_name[0] + '.' : ''}`.trim() ||
    profile.display_initials

  const age = calcAge(profile.date_of_birth)
  const ageLine = [age !== null ? `${age}` : profile.age_display, profile.location]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 140,
        borderRadius: 13,
        background: 'var(--surface-2)',
        border: `0.5px solid ${isSaved || hovered ? 'var(--border-gold)' : 'var(--border-default)'}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
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

      {/* Heart button */}
      <button
        onClick={e => {
          e.stopPropagation()
          onToggleSave()
        }}
        aria-label={isSaved ? 'Remove from shortlist' : 'Save to shortlist'}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'none',
          border: 'none',
          color: 'var(--gold)',
          opacity: isSaved ? 1 : 0.25,
          fontSize: 14,
          cursor: 'pointer',
          padding: 2,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
        onMouseLeave={e =>
          ((e.currentTarget as HTMLButtonElement).style.opacity = isSaved ? '1' : '0.25')
        }
      >
        {isSaved ? '♥' : '♡'}
      </button>

      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AvatarInitials
          initials={profile.display_initials}
          gender={profile.gender}
          size="sm"
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </div>
          {ageLine && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                marginTop: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ageLine}
            </div>
          )}
        </div>
      </div>

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
      </div>

      {/* Compat bar */}
      {showCompatBar && (
        <div style={{ marginTop: 2 }}>
          <CompatibilityBar score={score} />
        </div>
      )}

      {/* Status line — only show for meaningful states */}
      {(introStatus === 'mutual' || introStatus === 'requested') && (
        <div
          style={{
            fontSize: 11,
            color: introStatus === 'mutual' ? 'var(--gold)' : 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {introStatus === 'mutual' ? 'Mutual interest' : 'Introduction requested'}
        </div>
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
}: BrowseClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTab = searchParams.get('tab')
  const initialTab: Tab =
    rawTab === 'shortlist' ||
    rawTab === 'new' ||
    rawTab === 'all' ||
    rawTab === 'recommended'
      ? rawTab
      : 'recommended'

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds))
  const [introRequests, setIntroRequests] = useState<IntroRequest[]>(initialIntroRequests)
  const [monthlyUsed, setMonthlyUsed] = useState(initialMonthlyUsed)
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('relevant')
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS)

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

  // Pending mutual count for sidebar badge
  const pendingMutualCount = useMemo(
    () => introRequests.filter(r => r.status === 'mutual').length,
    [introRequests]
  )

  // Helper: get intro status for a profile
  const getIntroStatus = useCallback(
    (profileId: string): 'none' | 'requested' | 'mutual' | 'limit_reached' => {
      const req = introRequests.find(r => r.target_profile_id === profileId)
      if (req?.status === 'mutual') return 'mutual'
      if (req?.status === 'active' || req?.status === 'pending') return 'requested'
      if (monthlyUsed >= 5) return 'limit_reached'
      return 'none'
    },
    [introRequests, monthlyUsed]
  )

  // Filter profiles by applied filters
  function applyFilters(list: ProfileRecord[]): ProfileRecord[] {
    return list.filter(p => {
      const age = calcAge(p.date_of_birth)
      if (appliedFilters.ageMin && age !== null && age < parseInt(appliedFilters.ageMin)) return false
      if (appliedFilters.ageMax && age !== null && age > parseInt(appliedFilters.ageMax)) return false
      if (
        appliedFilters.schoolOfThought.length > 0 &&
        !appliedFilters.schoolOfThought.some(
          s => s.toLowerCase() === 'any' || s.toLowerCase() === p.school_of_thought?.toLowerCase()
        )
      )
        return false
      if (
        appliedFilters.ethnicity.length > 0 &&
        !appliedFilters.ethnicity.includes(p.ethnicity ?? '')
      )
        return false
      if (
        appliedFilters.maritalStatus.length > 0 &&
        !appliedFilters.maritalStatus.includes(p.marital_status ?? '')
      )
        return false
      if (appliedFilters.hasChildren.length > 0) {
        const childVal = p.has_children === true ? 'has_children' : 'no_children'
        if (!appliedFilters.hasChildren.includes(childVal)) return false
      }
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
  const tabProfiles = useMemo((): ProfileRecord[] => {
    if (activeTab === 'shortlist') return profiles.filter(p => savedIds.has(p.id))
    if (activeTab === 'new') {
      if (!newSince) return []
      return profiles.filter(p => p.listed_at && p.listed_at > newSince)
    }
    return profiles
  }, [activeTab, profiles, savedIds, newSince])

  // Effective sort: "new" tab always defaults to newest
  const effectiveSortKey: SortKey = activeTab === 'new' && sortKey === 'relevant' ? 'newest' : sortKey

  const displayedProfiles = useMemo(() => {
    const filtered = applyFilters(applySearch(tabProfiles))
    return applySort(filtered, effectiveSortKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabProfiles, appliedFilters, searchQuery, effectiveSortKey])

  const showCompatBar = activeTab === 'recommended' || activeTab === 'all'

  // Unique ethnicities from all profiles for filter
  const allEthnicities = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) {
      if (p.ethnicity) set.add(p.ethnicity)
    }
    return Array.from(set).sort()
  }, [profiles])

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
    const name = targetProfile?.first_name ?? 'Profile'

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
      const msg =
        json.error === 'Monthly limit reached'
          ? 'Monthly limit reached — 5 requests per calendar month'
          : json.error === 'This profile is no longer available'
          ? 'This profile is no longer available'
          : 'Unable to send request — please try again'
      setToast(msg)
      return
    }

    const isMutual = json.mutual === true

    setIntroRequests(prev => [
      ...prev,
      {
        target_profile_id: profileId,
        status: isMutual ? 'mutual' : 'pending',
        created_at: new Date().toISOString(),
      },
    ])
    setMonthlyUsed(prev => prev + 1)

    setToast(
      isMutual
        ? 'Mutual interest — admin will be in touch'
        : 'Introduction request sent'
    )
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
      />

      {/* Main content */}
      <main
        style={{
          marginLeft: 200,
          flex: 1,
          minHeight: '100vh',
          overflowY: 'auto',
          padding: '28px 28px 60px',
        }}
      >
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
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Browse
          </h1>

          {/* Search + Filter + Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
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
                  border: '0.5px solid var(--border-default)',
                  background: filterOpen ? 'var(--surface-3)' : 'var(--surface-2)',
                  color: 'var(--text-secondary)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Filter
              </button>

              {/* Filter dropdown */}
              {filterOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    width: 300,
                    background: 'var(--surface-2)',
                    border: '0.5px solid var(--border-default)',
                    borderRadius: 12,
                    padding: '16px',
                    zIndex: 200,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                      Filter
                    </span>
                    <button
                      onClick={() => setFilterOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 2,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Age range */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      Age range
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="Min"
                        value={pendingFilters.ageMin}
                        onChange={e =>
                          setPendingFilters(f => ({ ...f, ageMin: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '0.5px solid var(--border-default)',
                          background: 'var(--surface-3)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                        min={18}
                        max={80}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={pendingFilters.ageMax}
                        onChange={e =>
                          setPendingFilters(f => ({ ...f, ageMax: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '0.5px solid var(--border-default)',
                          background: 'var(--surface-3)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                        min={18}
                        max={80}
                      />
                    </div>
                  </div>

                  {/* School of thought */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      School of thought
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {SOT_OPTIONS.map(opt => (
                        <FilterChip
                          key={opt}
                          label={opt}
                          selected={pendingFilters.schoolOfThought.includes(opt)}
                          onClick={() =>
                            setPendingFilters(f => ({
                              ...f,
                              schoolOfThought: toggleChip(f.schoolOfThought, opt),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Ethnicity */}
                  {allEthnicities.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--text-muted)',
                          marginBottom: 6,
                        }}
                      >
                        Ethnicity
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {allEthnicities.map(opt => (
                          <FilterChip
                            key={opt}
                            label={opt}
                            selected={pendingFilters.ethnicity.includes(opt)}
                            onClick={() =>
                              setPendingFilters(f => ({
                                ...f,
                                ethnicity: toggleChip(f.ethnicity, opt),
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marital status */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      Marital status
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {MARITAL_OPTIONS.map(opt => (
                        <FilterChip
                          key={opt.value}
                          label={opt.label}
                          selected={pendingFilters.maritalStatus.includes(opt.value)}
                          onClick={() =>
                            setPendingFilters(f => ({
                              ...f,
                              maritalStatus: toggleChip(f.maritalStatus, opt.value),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Children */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      Children
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {CHILDREN_OPTIONS.map(opt => (
                        <FilterChip
                          key={opt.value}
                          label={opt.label}
                          selected={pendingFilters.hasChildren.includes(opt.value)}
                          onClick={() =>
                            setPendingFilters(f => ({
                              ...f,
                              hasChildren: toggleChip(f.hasChildren, opt.value),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setPendingFilters(EMPTY_FILTERS)
                        setAppliedFilters(EMPTY_FILTERS)
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 7,
                        fontSize: 12,
                        background: 'var(--surface-3)',
                        border: '0.5px solid var(--border-default)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        setAppliedFilters(pendingFilters)
                        setFilterOpen(false)
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: 500,
                        background: 'var(--gold)',
                        border: 'none',
                        color: '#1A1A18',
                        cursor: 'pointer',
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort dropdown */}
            <select
              value={effectiveSortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: '0.5px solid var(--border-default)',
                background: 'var(--surface-2)',
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

        {/* No results */}
        {displayedProfiles.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              fontSize: 13.5,
            }}
          >
            {activeTab === 'shortlist'
              ? 'No saved profiles yet. Browse and save profiles to see them here.'
              : 'No profiles match your current filters.'}
          </div>
        )}

        {/* Card grid */}
        <div
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
    </div>
  )
}
