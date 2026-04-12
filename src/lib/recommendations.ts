import type { ProfileRecord } from '@/components/ProfileModal'
import type { FilterState, MustHaveableKey } from '@/lib/filter-types'
import type { Plan } from '@/lib/plan-config'

// ─── Constants ────────────────────────────────────────────────────────────────
// Tuned for a small user base (~300 members).
// Weights are intentionally modest so compatScore remains the primary driver.
// Recency has elevated influence to ensure pool rotation and freshness.

const FILTER_MATCH_WEIGHT = 5   // low: prevents filter over-fitting on small pool
const MUST_HAVE_WEIGHT    = 8   // kept modest — Premium prioritises without dominating on small pool
const RECENCY_BOOST       = 15  // elevated: encourages discovery of newer profiles
const RECENCY_DAYS        = 14  // wider window: avoids same profiles repeating

export const MAX_RECOMMENDATIONS = 50
export const TOP_PICKS_COUNT     = 5

/** Intro request statuses that make a profile ineligible for recommendations */
export const EXCLUSION_STATUSES = new Set([
  'pending',   // sent, awaiting recipient response
  'accepted',  // accepted → match in progress, our team handling
])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendationEntry {
  profile:     ProfileRecord
  compatScore: number  // used for CompatibilityBar display — NOT exposed as rec score
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function calcAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob   = new Date(dateOfBirth)
  const today = new Date()
  let age     = today.getFullYear() - dob.getFullYear()
  const m     = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// ─── scoreRecommendation ──────────────────────────────────────────────────────
//
// Pure function. Returns recScore for a single candidate.
// recScore is used ONLY for sorting — never rendered in UI.
//
// isPrioritised = true  → must-have fields get MUST_HAVE_WEIGHT (8)
// isPrioritised = false → all matched fields get FILTER_MATCH_WEIGHT (5)

export function scoreRecommendation(
  candidate:       ProfileRecord,
  baseCompatScore: number,
  appliedFilters:  FilterState,
  isPrioritised:   boolean,
): number {
  const f   = appliedFilters
  const mh  = f.mustHave

  // Weight for a given field: +10 if must-have (Premium), +5 otherwise
  function w(key: MustHaveableKey): number {
    return isPrioritised && mh[key] ? MUST_HAVE_WEIGHT : FILTER_MATCH_WEIGHT
  }

  // HARD FLOOR — low-compat profiles are returned as-is; no bonus can elevate them
  if (baseCompatScore < 40) return baseCompatScore

  let bonus = 0

  // Pre-compute age once (used by both age min and age max checks)
  const candidateAge = calcAge(candidate.date_of_birth)

  // Age min
  if (f.ageMin) {
    const min = parseInt(f.ageMin, 10)
    if (!isNaN(min) && candidateAge !== null && candidateAge >= min) {
      bonus += w('ageMin')
    }
  }

  // Age max
  if (f.ageMax) {
    const max = parseInt(f.ageMax, 10)
    if (!isNaN(max) && candidateAge !== null && candidateAge <= max) {
      bonus += w('ageMax')
    }
  }

  // Location — text-contains, case-insensitive
  if (f.location.trim()) {
    const loc = f.location.toLowerCase().trim()
    if (candidate.location?.toLowerCase().includes(loc)) {
      bonus += w('location')
    }
  }

  // Marital status
  if (f.maritalStatus.length > 0) {
    if (f.maritalStatus.includes(candidate.marital_status ?? '')) {
      bonus += w('maritalStatus')
    }
  }

  // Has children
  if (f.hasChildren.length > 0) {
    const cv = candidate.has_children === true ? 'has_children' : 'no_children'
    if (f.hasChildren.includes(cv)) {
      bonus += w('hasChildren')
    }
  }

  // Education level
  if (f.educationLevel.length > 0) {
    if (f.educationLevel.includes(candidate.education_level ?? '')) {
      bonus += w('educationLevel')
    }
  }

  // Ethnicity
  if (f.ethnicity.length > 0) {
    if (f.ethnicity.includes(candidate.ethnicity ?? '')) {
      bonus += w('ethnicity')
    }
  }

  // Religiosity
  if (f.religiosity.length > 0) {
    if (f.religiosity.includes(candidate.religiosity ?? '')) {
      bonus += w('religiosity')
    }
  }

  // School of thought — 'Any' is a wildcard; matches all
  if (f.schoolOfThought.length > 0) {
    const candidateSot = candidate.school_of_thought?.toLowerCase() ?? ''
    const match = f.schoolOfThought.some(
      s => s.toLowerCase() === 'any' || s.toLowerCase() === candidateSot
    )
    if (match) bonus += w('schoolOfThought')
  }

  // Recency boost — listed_at within the last RECENCY_DAYS days
  if (candidate.listed_at) {
    const ageDays = (Date.now() - new Date(candidate.listed_at).getTime()) / 86_400_000
    if (ageDays <= RECENCY_DAYS) bonus += RECENCY_BOOST
  }

  return baseCompatScore + bonus
}

// ─── getRecommendations ───────────────────────────────────────────────────────
//
// Orchestrates the full pipeline:
//   1. Plan gate — Free returns [] immediately
//   2. Exclude profiles with active intro requests
//   3. Score each remaining profile
//   4. Sort: recScore DESC → compatScore DESC → listed_at DESC
//   5. Slice to MAX_RECOMMENDATIONS
//
// recScore is intentionally stripped from the returned entries —
// callers receive only the ordered list + compatScore for the CompatibilityBar.

export function getRecommendations(
  profiles:           ProfileRecord[],
  compatScores:       Map<string, number>,
  appliedFilters:     FilterState,
  plan:               Plan,
  excludedProfileIds: Set<string>,
): RecommendationEntry[] {
  // Plan gate
  if (plan === 'free') return []

  const isPrioritised = plan === 'premium'

  // Score and sort (recScore is temporary — used only within this function)
  const scored = profiles
    // Step 1 — exclude active intro requests
    .filter(p => !excludedProfileIds.has(p.id))
    // Step 2 — compute scores
    .map(p => {
      const compatScore = compatScores.get(p.id) ?? 0
      const recScore    = scoreRecommendation(p, compatScore, appliedFilters, isPrioritised)
      return { profile: p, compatScore, recScore }
    })
    // Step 3 — three-level sort
    .sort((a, b) => {
      if (b.recScore    !== a.recScore)    return b.recScore    - a.recScore
      if (b.compatScore !== a.compatScore) return b.compatScore - a.compatScore
      return (b.profile.listed_at ?? '').localeCompare(a.profile.listed_at ?? '')
    })
    // Step 4 — limit
    .slice(0, MAX_RECOMMENDATIONS)

  // Strip recScore from output — it must not be exposed to the UI layer
  return scored.map(({ profile, compatScore }) => ({ profile, compatScore }))
}
