import { createClient } from '@/lib/supabase/server'

// ─── Plan type ────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'plus' | 'premium'

// ─── Limits (source of truth — enforced in API, reflected in UI) ──────────────

export const PLAN_LIMITS = {
  free:    { introsPerMonth: 2,  activeRequests: 1,        boosts: 0, spotlight: 0, concierge: false, viewTracking: false, fullProfile: false, savedSearches: 0, digestEmail: false },
  plus:    { introsPerMonth: 5,  activeRequests: 2,        boosts: 1, spotlight: 0, concierge: false, viewTracking: false, fullProfile: true,  savedSearches: 1, digestEmail: true  },
  premium: { introsPerMonth: 10, activeRequests: Infinity, boosts: 4, spotlight: 1, concierge: true,  viewTracking: true,  fullProfile: true,  savedSearches: 5, digestEmail: true  },
} as const

// ─── UI display names ─────────────────────────────────────────────────────────

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

// ─── Server helper — get active plan for a user ───────────────────────────────

/**
 * Returns the active plan for a user.
 * Falls back to 'free' if no active subscription row exists.
 * Server-side only.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return (data?.plan ?? 'free') as Plan
}

/**
 * Returns plan limits for a given plan key.
 */
export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan]
}
