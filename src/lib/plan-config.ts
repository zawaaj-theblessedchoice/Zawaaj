// ─── Plan types ───────────────────────────────────────────────────────────────

export type Plan = 'free' | 'plus' | 'premium'
export type ResponseMode = 'accept_decline' | 'templates'

// ─── Central plan config — SINGLE SOURCE OF TRUTH ────────────────────────────
// Add a new plan by adding an entry here. No other file should define plan values.

export const PLAN_CONFIG = {
  free: {
    // Intro limits (Section 11 — Family Model v2: Voluntary = 5 / month)
    monthlyLimit:         5,
    activeLimit:          1,
    // Visibility delay before target sees the request
    visibilityDelayHours: 48,
    // Response system
    responseMode:         'accept_decline' as ResponseMode,
    canUseTemplates:      false,
    // Feature flags
    boosts:               0,
    spotlight:            0,
    concierge:            false,
    viewTracking:         false,
    fullProfile:          false,
    savedSearches:        0,
    digestEmail:          false,
    // Filter flags — free members cannot use browse filters
    advancedFilters:      false,
    mustHaveFilters:      false,
    // Recommendations — free members see no recommendations
    recommendations:      false,
    // Family member profiles per account
    maxFamilyMembers:     1,
  },
  plus: {
    // Section 11: Plus = 15 / month
    monthlyLimit:         15,
    activeLimit:          2,
    visibilityDelayHours: 24,
    responseMode:         'templates' as ResponseMode,
    canUseTemplates:      true,
    boosts:               1,
    spotlight:            0,
    concierge:            false,
    viewTracking:         false,
    fullProfile:          true,
    savedSearches:        1,
    digestEmail:          true,
    // Filter flags — plus members get full filters with auto-persistence
    advancedFilters:      true,
    mustHaveFilters:      false,
    // Recommendations — plus members get automated recommendations
    recommendations:      true,
    // Family member profiles per account
    maxFamilyMembers:     4,
  },
  premium: {
    // Section 11: Premium = Unlimited
    monthlyLimit:         Infinity,
    activeLimit:          Infinity,
    visibilityDelayHours: 0,
    responseMode:         'templates' as ResponseMode,
    canUseTemplates:      true,
    boosts:               4,
    spotlight:            1,
    concierge:            true,
    viewTracking:         true,
    fullProfile:          true,
    savedSearches:        5,
    digestEmail:          true,
    // Filter flags — premium members get filters + must-have toggles
    advancedFilters:      true,
    mustHaveFilters:      true,
    // Recommendations — premium members get prioritised recommendations
    recommendations:      true,
    // Family member profiles per account
    maxFamilyMembers:     4,
  },
} as const satisfies Record<Plan, {
  monthlyLimit: number
  activeLimit: number
  visibilityDelayHours: number
  responseMode: ResponseMode
  canUseTemplates: boolean
  boosts: number
  spotlight: number
  concierge: boolean
  viewTracking: boolean
  fullProfile: boolean
  savedSearches: number
  digestEmail: boolean
  advancedFilters: boolean
  mustHaveFilters: boolean
  recommendations: boolean
  maxFamilyMembers: number
}>

// ─── Request expiry — applies to all plans ────────────────────────────────────

export const INTRO_EXPIRY_DAYS = 7

// ─── UI labels ────────────────────────────────────────────────────────────────

export const PLAN_LABELS: Record<Plan, string> = {
  free:    'Voluntary',
  plus:    'Zawaaj Plus',
  premium: 'Zawaaj Premium',
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<Plan, { monthly: number; annual: number }> = {
  free:    { monthly: 0,  annual: 0  },
  plus:    { monthly: 9,  annual: 7  },
  premium: { monthly: 19, annual: 15 },
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns the config for a given plan.
 * Use this everywhere instead of `if (plan === '...')` comparisons.
 *
 * @example
 *   const config = getPlanConfig(user.plan)
 *   if (activeRequests >= config.activeLimit) { ... }
 */
export function getPlanConfig(plan: Plan) {
  return PLAN_CONFIG[plan]
}
