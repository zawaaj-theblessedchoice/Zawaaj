// ─── Server-side plan utilities ───────────────────────────────────────────────
// All plan values live in plan-config.ts (safe for client + server).
// This file adds the server-only DB helper.

import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/lib/plan-config'

export type { Plan } from '@/lib/plan-config'
export {
  PLAN_CONFIG,
  PLAN_LABELS,
  PLAN_PRICES,
  INTRO_EXPIRY_DAYS,
  getPlanConfig,
} from '@/lib/plan-config'

// ─── Server helper — get active plan for a user ───────────────────────────────

/**
 * Returns the active plan for a user.
 * Falls back to 'free' if no active subscription row exists.
 * Server-side only — uses createClient() which calls await cookies().
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
 * @deprecated Use getPlanConfig(plan) from @/lib/plan-config instead.
 * Kept for any callers not yet migrated.
 */
export { getPlanConfig as getPlanLimits } from '@/lib/plan-config'
