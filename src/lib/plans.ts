import { createClient } from '@/lib/supabase/server'

export type Plan = 'voluntary' | 'plus' | 'premium'

export const PLAN_LIMITS = {
  voluntary: { intros: 5,        boosts: 0, spotlight: 0, concierge: false, viewTracking: false },
  plus:      { intros: 15,       boosts: 1, spotlight: 0, concierge: false, viewTracking: false },
  premium:   { intros: Infinity, boosts: 4, spotlight: 1, concierge: true,  viewTracking: true  },
} as const

export const PLAN_LABELS: Record<Plan, string> = {
  voluntary: 'Voluntary',
  plus:      'Zawaaj Plus',
  premium:   'Zawaaj Premium',
}

export const PLAN_PRICES: Record<Plan, { monthly: number; annual: number }> = {
  voluntary: { monthly: 0,  annual: 0  },
  plus:      { monthly: 9,  annual: 7  },
  premium:   { monthly: 19, annual: 15 },
}

/**
 * Returns the active plan for a user.
 * Falls back to 'voluntary' if no subscription row exists.
 * Server-side only (uses server Supabase client).
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('zawaaj_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return (data?.plan ?? 'voluntary') as Plan
}

/**
 * Returns plan limits for a given plan key.
 */
export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan]
}
