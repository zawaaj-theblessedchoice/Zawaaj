// ─── Launch discount: 50% off Premium for pre-cutoff joiners ─────────────────
//
// Founder decision: anyone who SUBSCRIBES to Premium on or before the cutoff pays
// half price for the LIFE of that subscription (grandfathered). Subscribers who
// start AFTER the cutoff pay full price.
//
//   Premium monthly  £10 → £5   (1000p → 500p)
//   Premium annual   £96 → £48  (9600p → 4800p)
//
// GRANDFATHERING is automatic and needs no re-discounting logic: the price is
// LOCKED at subscription-creation. The GoCardless subscription is created at the
// discounted amount (see complete-redirect-flow), and a GC subscription's amount
// persists across renewals — so a £5 subscription created before the cutoff keeps
// charging £5 forever. For DISPLAY to an existing subscriber, the price is
// re-derived from their subscription's START date (never "today"), which
// reproduces the locked amount exactly.
//
// The cutoff is shared with the facilitated-intro introductory offer.

import { FACILITATED_INTRO_GRANDFATHER_CUTOFF } from '@/lib/facilitatedIntroPolicy'

export type BillingCycle = 'monthly' | 'annual'

/** Subscriptions starting on/before this instant get the launch discount. */
export const LAUNCH_DISCOUNT_CUTOFF = FACILITATED_INTRO_GRANDFATHER_CUTOFF // '2026-12-31T23:59:59.999Z'

/** Badge copy shown wherever the discounted price appears (until the cutoff). */
export const LAUNCH_DISCOUNT_BADGE = '50% off — limited time until 31 Dec 2026'

// Premium prices in PENCE — authoritative for GoCardless + bank transfer.
const PREMIUM_FULL_PENCE:   Record<BillingCycle, number> = { monthly: 1000, annual: 9600 }
const PREMIUM_LAUNCH_PENCE: Record<BillingCycle, number> = { monthly: 500,  annual: 4800 }

/** Whether a subscription STARTING at `at` qualifies for the launch discount. */
export function isLaunchDiscountActive(at: Date | string = new Date()): boolean {
  const t = (typeof at === 'string' ? new Date(at) : at).getTime()
  const cutoff = new Date(LAUNCH_DISCOUNT_CUTOFF).getTime()
  return Number.isFinite(t) && t <= cutoff
}

/**
 * Premium price in PENCE for a subscription that STARTS at `subscribedAt`.
 * Used by BOTH the display layer and the payment layer (GoCardless amount +
 * bank-transfer amount + confirmation email) so a single rule governs every path.
 *
 * Pre-cutoff → discounted; post-cutoff → full. The amount is locked at creation,
 * so pre-cutoff joiners are grandfathered with no further logic.
 *
 * For an EXISTING subscriber, pass their subscription's start date to reproduce
 * what they actually pay — NOT today's date.
 */
export function premiumPricePence(opts: { billingCycle: BillingCycle; subscribedAt?: Date | string }): number {
  const table = isLaunchDiscountActive(opts.subscribedAt ?? new Date()) ? PREMIUM_LAUNCH_PENCE : PREMIUM_FULL_PENCE
  return table[opts.billingCycle]
}

/** Premium price in whole £ (pence ÷ 100). Monthly → per-month £; annual → the FULL yearly £. */
export function premiumPricePounds(opts: { billingCycle: BillingCycle; subscribedAt?: Date | string }): number {
  return premiumPricePence(opts) / 100
}

/**
 * Display view of Premium pricing for a viewer looking at the page `now`.
 * `full` is the undiscounted figure (strike it through when `discounted`);
 * `now` is what a joiner would actually pay today. Whole £, derived from the
 * pence tables so there is a single source of truth.
 *   - monthly:     per month
 *   - annualPerMo: per month when billed annually (matches PLAN_PRICES shape)
 *   - annualPerYr: the whole-year figure
 */
export function premiumPriceView(now: Date | string = new Date()) {
  const discounted = isLaunchDiscountActive(now)
  const live = discounted ? PREMIUM_LAUNCH_PENCE : PREMIUM_FULL_PENCE
  return {
    discounted,
    badge: LAUNCH_DISCOUNT_BADGE,
    monthly:     { full: PREMIUM_FULL_PENCE.monthly / 100,      now: live.monthly / 100 },
    annualPerMo: { full: PREMIUM_FULL_PENCE.annual / 100 / 12,  now: live.annual / 100 / 12 },
    annualPerYr: { full: PREMIUM_FULL_PENCE.annual / 100,       now: live.annual / 100 },
  }
}
