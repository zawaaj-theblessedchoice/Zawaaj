// ─── Introductory offer: free admin-facilitated introductions ────────────────
//
// Founder decision: the FREE (Community) tier KEEPS admin-facilitated
// introductions as an introductory offer, LIVE NOW. After the cutoff, facilitated
// introductions become PREMIUM-only for NEW joiners, but families onboarded on or
// before the cutoff are GRANDFATHERED and keep the benefit forever.
//
// Grandfathering is determined by FAMILY JOIN DATE (zawaaj_family_accounts.created_at)
// — recommended over a per-family boolean flag because it needs no column, no
// backfill, and is deterministic from data we already store.
//
// HOW TO FLIP LATER (a config change, not a rebuild):
//   1. Set FREE_FACILITATED_INTRODUCTIONS_FOR_NEW = false below.
//   2. That's it for the policy. Enforcement: call
//      familyHasFacilitatedIntroductions({ plan, familyCreatedAt }) at the
//      facilitation decision point (e.g. src/app/api/admin/facilitate-introduction
//      route, and/or the mutual-match handler) and block when it returns false.
//      While the flag is TRUE the helper always returns true, so wiring it in now
//      is a no-op — nothing changes behaviourally until the flag is flipped.
//
// The multi-party question (which side must be eligible when A↔B are mutual) is
// deferred to flip time; the per-family helper below is the building block.

/** Master switch. TRUE = free tier gets facilitated intros (current launch state). */
export const FREE_FACILITATED_INTRODUCTIONS_FOR_NEW = true

/** Families created on/before this instant are grandfathered once the offer ends. */
export const FACILITATED_INTRO_GRANDFATHER_CUTOFF = '2026-12-31T23:59:59.999Z'

/**
 * Whether a family is entitled to admin-facilitated introductions.
 * - Paid tiers (plus/premium) always are.
 * - While the intro offer is on, everyone is.
 * - Once the offer ends, only families onboarded on/before the cutoff (grandfathered).
 */
export function familyHasFacilitatedIntroductions(opts: {
  plan: string | null | undefined
  familyCreatedAt: string | null | undefined
}): boolean {
  if (opts.plan === 'premium' || opts.plan === 'plus') return true
  if (FREE_FACILITATED_INTRODUCTIONS_FOR_NEW) return true

  const created = opts.familyCreatedAt ? new Date(opts.familyCreatedAt).getTime() : NaN
  const cutoff = new Date(FACILITATED_INTRO_GRANDFATHER_CUTOFF).getTime()
  return Number.isFinite(created) && created <= cutoff
}
