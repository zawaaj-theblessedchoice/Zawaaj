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
    maxFamilyMembers:     6,
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
  free:    'Community Access',
  plus:    'Zawaaj Plus',
  premium: 'Zawaaj Premium',
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<Plan, { monthly: number; annual: number }> = {
  free:    { monthly: 0,  annual: 0  },
  plus:    { monthly: 9,  annual: 7  },
  premium: { monthly: 19, annual: 15 },
}

// ─── Helper (static) ──────────────────────────────────────────────────────────

/**
 * Returns the static config for a given plan.
 * Use this everywhere instead of `if (plan === '...')` comparisons.
 *
 * @example
 *   const config = getPlanConfig(user.plan)
 *   if (activeRequests >= config.activeLimit) { ... }
 */
export function getPlanConfig(plan: Plan) {
  return PLAN_CONFIG[plan]
}

// ─── DB-driven plan config ────────────────────────────────────────────────────

export interface DbPlanRow {
  key: string
  label: string
  price_monthly_gbp: number
  price_annual_gbp: number
  monthly_interests: number | null  // null = unlimited
  max_profiles: number
  features: string[]
  is_active: boolean
  sort_order: number
}

/**
 * Fetches the live plan config from zawaaj_plans (server-side only).
 * Falls back to the static PLAN_CONFIG values if the DB call fails.
 * Never call this from client components — use getPlanConfig() instead.
 *
 * @example  (inside a Server Component or Route Handler)
 *   const plans = await fetchPlansFromDb(supabase)
 *   const userPlan = plans.find(p => p.key === 'plus')
 */
export async function fetchPlansFromDb(
  // Accept any Supabase client (server or admin)
  supabase: { from: (table: string) => unknown }
): Promise<DbPlanRow[]> {
  type Client = {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: boolean) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: DbPlanRow[] | null; error: unknown }>
        }
      }
    }
  }
  const client = supabase as Client
  try {
    const { data, error } = await client
      .from('zawaaj_plans')
      .select('key,label,price_monthly_gbp,price_annual_gbp,monthly_interests,max_profiles,features,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data) throw error
    return data
  } catch {
    // Static fallback — keeps the app working if plans table doesn't exist yet
    return [
      {
        key: 'voluntary',
        label: 'Community Access',
        price_monthly_gbp: 0,
        price_annual_gbp: 0,
        monthly_interests: 5,
        max_profiles: 2,
        features: ['admin_mediated_intros', 'profile_review', 'basic_search'],
        is_active: true,
        sort_order: 1,
      },
      {
        key: 'plus',
        label: 'Zawaaj Plus',
        price_monthly_gbp: 900,
        price_annual_gbp: 7200,
        monthly_interests: 15,
        max_profiles: 4,
        features: ['admin_mediated_intros', 'profile_review', 'basic_search', 'priority_admin', 'profile_boost_monthly', 'new_profile_alerts', 'full_bio_on_received_interests'],
        is_active: true,
        sort_order: 2,
      },
      {
        key: 'premium',
        label: 'Zawaaj Premium',
        price_monthly_gbp: 1900,
        price_annual_gbp: 18000,
        monthly_interests: null,
        max_profiles: 6,
        features: ['admin_mediated_intros', 'profile_review', 'basic_search', 'priority_admin', 'profile_boost_weekly', 'new_profile_alerts', 'full_bio_on_received_interests', 'dedicated_manager', 'manager_followup', 'spotlight_monthly', 'who_viewed'],
        is_active: true,
        sort_order: 3,
      },
    ]
  }
}
