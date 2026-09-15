// ─── Entitlement resolver ────────────────────────────────────────────────────
//
// SINGLE source of truth for "what plan is this member entitled to right now".
// Every gate (interest cap, who-viewed, filters, full profile, browse plan, etc.)
// must resolve entitlement through here so they never disagree.
//
// Entitlement is driven by "is the member within a paid/granted period":
//   * status 'active'    → entitled to their plan (this INCLUDES provisional
//     Premium — a provisional row is status='active').
//   * status 'cancelled' but cancel_at_period_end with a FUTURE period end
//     (renewal_at / current_period_end) → STILL entitled until that date. This is
//     CD-002: cancelling grants access until the end of the paid period. A user
//     cancellation sets cancel_at_period_end=true, so their access continues; a
//     terminal payment/mandate revocation does NOT set it, so it resolves to free.
//   * anything else (past_due, expired, cancelled with no future period) → free.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/lib/plan-config'

export type EntitlementRow = {
  plan: string | null
  status: string | null
  cancel_at_period_end?: boolean | null
  renewal_at?: string | null
  current_period_end?: string | null
}

function normalizePlan(plan: string | null | undefined): Plan {
  const p = plan ?? 'free'
  if (p === 'voluntary') return 'free' // legacy free key
  return (['free', 'plus', 'premium'].includes(p) ? p : 'free') as Plan
}

/** Resolve the entitled plan for a single subscription row. */
export function entitledPlan(row: EntitlementRow | null | undefined, now: number = Date.now()): Plan {
  if (!row) return 'free'
  const plan = normalizePlan(row.plan)
  if (plan === 'free') return 'free'
  if (row.status === 'active') return plan
  if (row.status === 'cancelled' && row.cancel_at_period_end) {
    const end = row.renewal_at ?? row.current_period_end
    if (end && new Date(end).getTime() > now) return plan
  }
  return 'free'
}

// Columns every gate must select for entitlement resolution.
export const ENTITLEMENT_SELECT = 'plan, status, cancel_at_period_end, renewal_at, current_period_end'

/**
 * Fetch the member's latest relevant subscription row and resolve entitlement.
 * Includes 'cancelled' rows (not just 'active') so a cancelled-but-in-period
 * member keeps their plan until the period end.
 */
export async function getEntitledPlan(supabase: SupabaseClient, userId: string): Promise<Plan> {
  const { data } = await supabase
    .from('zawaaj_subscriptions')
    .select(ENTITLEMENT_SELECT)
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return entitledPlan(data as EntitlementRow | null)
}
