'use client'

import { useState } from 'react'
import SlidePanel from '@/components/SlidePanel'
import AvatarInitials from '@/components/AvatarInitials'
import CompatibilityBar from '@/components/CompatibilityBar'
import Toast from '@/components/Toast'
import UpgradeModal from '@/components/UpgradeModal'
import { scoreCompatibility } from '@/lib/compatibility'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'

export interface ProfileRecord {
  id: string
  display_initials: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  date_of_birth: string | null
  age_display: string | null
  location: string | null
  profession_detail: string | null
  education_level: string | null
  school_of_thought: string | null
  ethnicity: string | null
  languages_spoken: string[] | null
  nationality: string | null
  marital_status: string | null
  has_children: boolean | null
  height: string | null
  living_situation: string | null
  religiosity: string | null
  prayer_regularity: string | null
  wears_hijab: boolean | null
  keeps_beard: boolean | null
  wears_niqab: string | null
  wears_abaya: string | null
  quran_engagement_level: string | null
  bio: string | null
  pref_age_min: number | null
  pref_age_max: number | null
  pref_location: string | null
  pref_ethnicity: string | null
  pref_school_of_thought: string[] | null
  pref_relocation: string | null
  pref_partner_children: string | null
  open_to_relocation: string | null
  open_to_partners_children: string | null
  listed_at: string | null
  islamic_background: string | null
  smoker: boolean | null
  place_of_birth: string | null
}

interface ProfileModalProps {
  profile: ProfileRecord | null
  onClose: () => void
  isOwnProfile: boolean
  viewerProfile: ProfileRecord | null
  isSaved: boolean
  onToggleSave: (profileId: string) => void
  introStatus: 'none' | 'pending' | 'accepted' | 'declined' | 'expired' | 'limit_reached'
  onRequestIntro: (profileId: string) => void
  monthlyUsed: number
  /** Member's current plan — controls locked sections */
  plan?: 'free' | 'plus' | 'premium'
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

function displayLivingSituation(v: string | null): string | null {
  if (!v) return null
  const map: Record<string, string> = {
    independent: 'Independent',
    with_family: 'With family',
    shared: 'Shared accommodation',
  }
  return map[v] ?? v
}

function displayMaritalStatus(v: string | null): string | null {
  if (!v) return null
  const map: Record<string, string> = {
    never_married: 'Never married',
    divorced: 'Divorced',
    widowed: 'Widowed',
  }
  return map[v] ?? v
}

function displayPrayerRegularity(v: string | null): string | null {
  if (!v) return null
  const map: Record<string, string> = {
    yes_regularly: 'Yes, regularly',
    most_of_time: 'Most of the time',
    working_on_it: 'Working on it',
    not_currently: 'Not currently',
  }
  return map[v] ?? v
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        marginBottom: 12,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  )
}

function SectionDivider() {
  return (
    <div
      style={{
        height: '0.5px',
        background: 'var(--border-default)',
        margin: '18px 0',
      }}
    />
  )
}

export default function ProfileModal({
  profile,
  onClose,
  isOwnProfile,
  viewerProfile,
  isSaved,
  onToggleSave,
  introStatus,
  onRequestIntro,
  monthlyUsed,
  plan = 'free',
}: ProfileModalProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [confirmingIntro, setConfirmingIntro] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const planConfig = getPlanConfig((plan ?? 'free') as Plan)
  const monthlyLimit = planConfig.monthlyLimit
  // Derived flags — driven by config, not plan name
  const hasFullProfile = planConfig.fullProfile
  const hasTemplates = planConfig.canUseTemplates

  const isOpen = profile !== null

  const displayName = profile ? profile.display_initials : ''

  const age = profile ? calcAge(profile.date_of_birth) : null

  const compat =
    profile && viewerProfile && !isOwnProfile
      ? scoreCompatibility(viewerProfile, profile)
      : null

  async function handleShare() {
    if (!profile) return
    const url = `${window.location.origin}/profile/${profile.id}`
    if (navigator.share) {
      await navigator.share({ title: 'Zawaaj profile', url })
    } else {
      await navigator.clipboard.writeText(url)
      setToastMsg('Link copied — recipient must sign in to view')
    }
  }

  function handleClose() {
    setConfirmingIntro(false)
    setBioExpanded(false)
    onClose()
  }

  const prefAgeDisplay = (() => {
    if (!profile) return null
    const min = profile.pref_age_min
    const max = profile.pref_age_max
    if (min !== null && max !== null) return `${min} – ${max}`
    if (min !== null) return `${min}+`
    if (max !== null) return `Up to ${max}`
    return null
  })()

  return (
    <>
      <SlidePanel open={isOpen} onClose={handleClose} width={350}>
        {profile && (
          <div style={{ paddingBottom: 32 }}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{ padding: '0 20px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 8, paddingBottom: 16 }}>
                <AvatarInitials
                  initials={profile.display_initials}
                  gender={profile.gender}
                  size="xl"
                  goldBorder
                />

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {displayName || profile.display_initials}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    justifyContent: 'center',
                  }}
                >
                  {[
                    age !== null ? `${age}` : profile.age_display,
                    profile.location,
                    profile.profession_detail,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>

                {/* Action row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 14,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  {/* Intro button */}
                  {!isOwnProfile && (
                    <>
                      {introStatus === 'accepted' && (
                        <button
                          disabled
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            background: 'var(--gold-muted)',
                            border: '0.5px solid var(--border-gold)',
                            color: 'var(--gold)',
                            cursor: 'default',
                            opacity: 0.85,
                          }}
                        >
                          Interest accepted — our team will be in touch
                        </button>
                      )}
                      {introStatus === 'pending' && (
                        <button
                          disabled
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            background: 'var(--surface-3)',
                            border: '0.5px solid var(--border-default)',
                            color: 'var(--text-secondary)',
                            cursor: 'default',
                          }}
                        >
                          Interest sent ✓
                        </button>
                      )}
                      {introStatus === 'declined' && (
                        <button
                          disabled
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            background: 'var(--surface-3)',
                            border: '0.5px solid var(--border-default)',
                            color: 'var(--text-muted)',
                            cursor: 'default',
                          }}
                        >
                          This family has respectfully responded
                        </button>
                      )}
                      {introStatus === 'expired' && (
                        <button
                          disabled
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            background: 'var(--surface-3)',
                            border: '0.5px solid var(--border-default)',
                            color: 'var(--text-muted)',
                            cursor: 'default',
                          }}
                        >
                          Interest expired
                        </button>
                      )}
                      {introStatus === 'limit_reached' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <button
                            disabled
                            title="Monthly interest limit reached"
                            style={{
                              padding: '7px 14px',
                              borderRadius: 8,
                              fontSize: 12,
                              background: 'var(--surface-3)',
                              border: '0.5px solid var(--border-default)',
                              color: 'var(--text-muted)',
                              cursor: 'not-allowed',
                            }}
                          >
                            Monthly limit reached
                          </button>
                          {!hasTemplates && (
                            <button
                              onClick={() => setShowUpgrade(true)}
                              style={{
                                background: 'none', border: 'none', padding: 0,
                                fontSize: 11, color: 'var(--gold)', cursor: 'pointer',
                                textDecoration: 'underline', textUnderlineOffset: 2,
                              }}
                            >
                              Upgrade for more introductions →
                            </button>
                          )}
                        </div>
                      )}
                      {introStatus === 'none' && (
                        <button
                          onClick={() => setConfirmingIntro(true)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 500,
                            background: 'var(--gold)',
                            border: 'none',
                            color: 'var(--surface)',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e =>
                            ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')
                          }
                          onMouseLeave={e =>
                            ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                          }
                        >
                          Express interest
                        </button>
                      )}
                    </>
                  )}

                  {/* Heart / Save button */}
                  {!isOwnProfile && (
                    <button
                      onClick={() => onToggleSave(profile.id)}
                      aria-label={isSaved ? 'Remove from shortlist' : 'Save to shortlist'}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--surface-3)',
                        border: '0.5px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--gold)',
                        opacity: isSaved ? 1 : 0.3,
                        fontSize: 15,
                        transition: 'opacity 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLButtonElement).style.opacity = isSaved ? '1' : '0.3')
                      }
                    >
                      {isSaved ? '♥' : '♡'}
                    </button>
                  )}

                  {/* Share button */}
                  <button
                    onClick={handleShare}
                    aria-label="Share profile"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--surface-3)',
                      border: '0.5px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)')
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)')
                    }
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.4 6.2L9.6 3.4M4.4 7.8l5.2 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Intro confirmation overlay ──────────────────────────────── */}
            {confirmingIntro && (
              <div
                style={{
                  margin: '0 20px 16px',
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--surface-3)',
                  border: '0.5px solid var(--border-gold)',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Express interest in {displayName}?
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-secondary)',
                    marginBottom: 14,
                    lineHeight: 1.5,
                  }}
                >
                  The other family will be notified privately. This uses 1 of your{' '}
                  {monthlyLimit - monthlyUsed} remaining monthly interest expressions.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirmingIntro(false)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 7,
                      fontSize: 12,
                      background: 'var(--surface-4)',
                      border: '0.5px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onRequestIntro(profile.id)
                      setConfirmingIntro(false)
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 500,
                      background: 'var(--gold)',
                      border: 'none',
                      color: 'var(--surface)',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            <div style={{ padding: '0 20px' }}>
              {/* ── Compatibility ─────────────────────────────────────────── */}
              {compat && (
                <>
                  <SectionDivider />
                  <SectionLabel>Compatibility</SectionLabel>
                  <CompatibilityBar score={compat.score} />
                  {compat.highlights.length > 0 ? (
                    <ul
                      style={{
                        margin: '10px 0 0',
                        padding: '0 0 0 16px',
                        listStyle: 'disc',
                      }}
                    >
                      {compat.highlights.map((h, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            marginBottom: 4,
                            lineHeight: 1.5,
                          }}
                        >
                          {h}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      No strong alignment found with your current preferences.
                    </p>
                  )}
                </>
              )}

              {/* ── About ─────────────────────────────────────────────────── */}
              <SectionDivider />
              <SectionLabel>About</SectionLabel>

              {/* Summary fields visible to all plans */}
              <FieldRow
                label="Age"
                value={
                  age !== null
                    ? `${age}`
                    : profile.age_display ?? null
                }
              />
              {/* Location + school of thought + islamic background visible to all */}
              <FieldRow label="Location" value={profile.location} />
              <FieldRow label="School of thought" value={profile.school_of_thought} />
              <FieldRow label="Ethnicity" value={profile.ethnicity} />
              <FieldRow
                label="Islamic background"
                value={
                  profile.islamic_background === 'born_muslim' ? 'Born Muslim'
                  : profile.islamic_background === 'reverted' ? 'Reverted to Islam'
                  : null
                }
              />

              {/* ── Profession & Education — visible to all tiers ────────── */}
              <FieldRow label="Profession" value={profile.profession_detail} />
              <FieldRow label="Education" value={profile.education_level} />

              {/* ── Full details — Premium only ───────────────────────────── */}
              {!hasFullProfile && !isOwnProfile ? (
                <>
                  <SectionDivider />
                  {/* Blurred preview rows to hint at hidden content */}
                  <div style={{ position: 'relative', userSelect: 'none' }}>
                    <div style={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none' }}>
                      <FieldRow label="Marital status" value="Never married" />
                      <FieldRow label="Living situation" value="Independent" />
                      <FieldRow label="Religiosity" value="Practising" />
                      <FieldRow label="Prayer regularity" value="Yes, regularly" />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          padding: '14px 18px',
                          borderRadius: 12,
                          background: 'var(--surface-2)',
                          border: '0.5px solid var(--border-gold)',
                          textAlign: 'center',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                          maxWidth: 240,
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          Full profile details
                        </p>
                        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                          Faith depth, lifestyle, bio and more — available on Zawaaj Premium.
                        </p>
                        <button
                          onClick={() => setShowUpgrade(true)}
                          style={{
                            width: '100%',
                            padding: '8px 0',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--gold)',
                            border: 'none',
                            color: 'var(--surface)',
                            cursor: 'pointer',
                          }}
                        >
                          Upgrade to Premium →
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <FieldRow label="Languages" value={profile.languages_spoken?.join(', ') ?? null} />
                  <FieldRow label="Nationality" value={profile.nationality} />
                  <FieldRow label="Place of birth" value={profile.place_of_birth} />
                  <FieldRow
                    label="Marital status"
                    value={displayMaritalStatus(profile.marital_status)}
                  />
                  <FieldRow
                    label="Has children"
                    value={
                      profile.has_children === true
                        ? 'Yes'
                        : profile.has_children === false
                        ? 'No'
                        : null
                    }
                  />
                  {profile.height && <FieldRow label="Height" value={profile.height} />}
                  <FieldRow
                    label="Living situation"
                    value={displayLivingSituation(profile.living_situation)}
                  />

                  {/* ── Faith & values ──────────────────────────────────── */}
                  <SectionDivider />
                  <SectionLabel>Faith &amp; values</SectionLabel>

                  <FieldRow label="Religiosity" value={profile.religiosity} />
                  <FieldRow
                    label="Prayer regularity"
                    value={displayPrayerRegularity(profile.prayer_regularity)}
                  />
                  {profile.gender === 'female' && (
                    <FieldRow
                      label="Wears hijab"
                      value={
                        profile.wears_hijab === true
                          ? 'Yes'
                          : profile.wears_hijab === false
                          ? 'No'
                          : null
                      }
                    />
                  )}
                  {profile.gender === 'male' && (
                    <FieldRow
                      label="Keeps beard"
                      value={
                        profile.keeps_beard === true
                          ? 'Yes'
                          : profile.keeps_beard === false
                          ? 'No'
                          : null
                      }
                    />
                  )}
                  {profile.gender === 'female' && profile.wears_niqab && (
                    <FieldRow
                      label="Wears niqab"
                      value={
                        profile.wears_niqab === 'yes'
                          ? 'Yes'
                          : profile.wears_niqab === 'sometimes'
                          ? 'Sometimes'
                          : profile.wears_niqab === 'no'
                          ? 'No'
                          : profile.wears_niqab
                      }
                    />
                  )}
                  {profile.gender === 'female' && profile.wears_abaya && (
                    <FieldRow
                      label="Wears abaya"
                      value={
                        profile.wears_abaya === 'yes'
                          ? 'Yes'
                          : profile.wears_abaya === 'sometimes'
                          ? 'Sometimes'
                          : profile.wears_abaya === 'no'
                          ? 'No'
                          : profile.wears_abaya
                      }
                    />
                  )}
                  <FieldRow
                    label="Smoker"
                    value={profile.smoker === true ? 'Yes' : profile.smoker === false ? 'No' : null}
                  />
                  {profile.quran_engagement_level && (
                    <FieldRow
                      label="Qur\u2019an engagement"
                      value={
                        {
                          daily: 'Daily',
                          few_times_week: 'A few times a week',
                          occasionally: 'Occasionally',
                          rarely: 'Rarely',
                          not_currently: 'Not currently',
                        }[profile.quran_engagement_level] ?? profile.quran_engagement_level
                      }
                    />
                  )}

                  {/* ── About me / bio ───────────────────────────────────── */}
                  {profile.bio && profile.bio.trim().length > 0 && (
                    <>
                      <SectionDivider />
                      <SectionLabel>About me</SectionLabel>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          overflow: 'hidden',
                          maxHeight: bioExpanded ? 'none' : '5.2em',
                        }}
                      >
                        {profile.bio}
                      </div>
                      <button
                        onClick={() => setBioExpanded(prev => !prev)}
                        style={{
                          marginTop: 6,
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold)',
                          fontSize: 12,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {bioExpanded ? 'Read less' : 'Read more'}
                      </button>
                    </>
                  )}

                  {/* ── Looking for ─────────────────────────────────────── */}
                  <SectionDivider />
                  <SectionLabel>Looking for</SectionLabel>

                  <FieldRow label="Preferred age" value={prefAgeDisplay} />
                  <FieldRow label="Preferred location" value={profile.pref_location} />
                  <FieldRow label="Ethnicity preference" value={profile.pref_ethnicity} />
                  <FieldRow
                    label="School of thought"
                    value={
                      profile.pref_school_of_thought && profile.pref_school_of_thought.length > 0
                        ? profile.pref_school_of_thought.join(', ')
                        : null
                    }
                  />
                  <FieldRow label="Relocation" value={profile.pref_relocation} />
                  <FieldRow label="Partner&apos;s children" value={profile.pref_partner_children} />
                </>
              )}
            </div>

            {/* ── Contact information ──────────────────────────────────────── */}
            {!isOwnProfile && (
              <div
                style={{
                  margin: '20px 20px 0',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--surface-3)',
                  border: '0.5px solid var(--border-default)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Contact information
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.5 }}>🔒</span>
                  Our team will share contact details after verification
                </div>
              </div>
            )}

            {/* ── Privacy note ─────────────────────────────────────────────── */}
            <div
              style={{
                padding: '18px 20px 0',
                fontSize: 11,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                borderTop: '0.5px solid var(--border-default)',
                marginTop: 20,
              }}
            >
              Profile visible to approved members only. Any shared link requires sign-in to view.
            </div>
          </div>
        )}
      </SlidePanel>

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
      {showUpgrade && (
        <UpgradeModal trigger="locked_profile" onClose={() => setShowUpgrade(false)} />
      )}
    </>
  )
}
