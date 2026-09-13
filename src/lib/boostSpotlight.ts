// ─── Boost & Spotlight ───────────────────────────────────────────────────────
//
// SHIPPED DARK. The whole feature is gated by BOOST_SPOTLIGHT_ENABLED, which is
// false unless NEXT_PUBLIC_BOOST_SPOTLIGHT_ENABLED === 'true'. While false:
//   * applyBoostRanking() returns its input array reference UNCHANGED, so browse
//     ordering is byte-identical to today (see the neutrality guarantees below);
//   * pickSpotlight() returns null, so no spotlight slot renders;
//   * the grant routes reject with 403 and no ledger rows are written.
//
// Fairness model (founder spec — implemented exactly):
//   * Boost = a 48h time-boxed visibility LIFT within the viewer's existing
//     result set. It never injects a profile that wouldn't otherwise match, and
//     never overrides gender/compatibility filtering (the ranking runs AFTER all
//     filtering, on the already-filtered list).
//   * Allowances per calendar month: Premium 4 boosts + 1 spotlight; Plus 1
//     boost; Free none.
//   * At most 20% of any window of results may be boosted — boosted profiles are
//     interleaved at 1-in-5 spacing, never clustered.
//   * If more boosts are active than the 20% cap allows, a per-request rotation
//     window shares the exposure rather than always surfacing the same ones.
//   * Boost only ever LIFTS. Unboosted profiles keep their natural relative order
//     and are pushed down by at most the number of surfaced boosts (≤ 20%).

export const BOOST_SPOTLIGHT_ENABLED =
  process.env.NEXT_PUBLIC_BOOST_SPOTLIGHT_ENABLED === 'true'

// Durations
export const BOOST_DURATION_MS = 48 * 60 * 60 * 1000          // 48 hours (spec)
export const SPOTLIGHT_DURATION_MS = 7 * 24 * 60 * 60 * 1000  // 7 days (spec silent — see report)

// Monthly allowances per plan.
export const BOOST_ALLOWANCE: Record<string, number> = { free: 0, plus: 1, premium: 4 }
export const SPOTLIGHT_ALLOWANCE: Record<string, number> = { free: 0, plus: 0, premium: 1 }

// At most 1 boosted profile per this many results (→ 20% density cap).
const BOOST_SPACING = 5

/** 'YYYY-MM' bucket for the calendar-month allowance. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type Boostable = { boosted_until?: string | null }

function isActive(ts: string | null | undefined, now: number): boolean {
  return !!ts && new Date(ts).getTime() > now
}

/**
 * Reorders `profiles` so active boosts are LIFTED, subject to the fairness model.
 *
 * NEUTRALITY GUARANTEES (proof the "off" / "no boost" path is unchanged):
 *   1. If `enabled` is false → returns the SAME array reference, untouched.
 *   2. If no profile has an active boost → returns the SAME array reference.
 *   3. If the 20% cap rounds to 0 (fewer than 5 results) → returns the SAME
 *      reference (too few results to lift one without exceeding 20%).
 * In all three cases the output is `=== profiles` (identity), so with zero active
 * boosts the browse order is exactly today's order.
 *
 * When it DOES reorder: the un-lifted profiles (all unboosted profiles, plus any
 * boosted ones not selected by the rotation window) stay in their given relative
 * order; only the selected boosts are moved earlier, interleaved 1-in-`SPACING`.
 * So no unboosted profile is demoted below its natural position by more than the
 * number of surfaced boosts (≤ 20%).
 */
export function applyBoostRanking<T extends Boostable>(
  profiles: T[],
  opts: { enabled: boolean; now?: number; rotationSeed?: number },
): T[] {
  if (!opts.enabled) return profiles
  const now = opts.now ?? Date.now()

  const boostedIdx: number[] = []
  for (let i = 0; i < profiles.length; i++) {
    if (isActive(profiles[i].boosted_until, now)) boostedIdx.push(i)
  }
  if (boostedIdx.length === 0) return profiles

  const cap = Math.floor(profiles.length * 0.2)
  if (cap === 0) return profiles

  // Rotation: choose a contiguous (wrapping) window of `k` boosts to surface this
  // request, so exposure is shared when more boosts are active than the cap.
  const k = Math.min(boostedIdx.length, cap)
  const start = ((opts.rotationSeed ?? 0) % boostedIdx.length + boostedIdx.length) % boostedIdx.length
  const selected = new Set<number>()
  for (let j = 0; j < k; j++) selected.add(boostedIdx[(start + j) % boostedIdx.length])

  // Everything not selected keeps its natural relative order (this includes
  // unboosted profiles AND boosted-but-not-surfaced-this-request profiles).
  const rest: T[] = []
  const surfaced: T[] = []
  for (let i = 0; i < profiles.length; i++) {
    (selected.has(i) ? surfaced : rest).push(profiles[i])
  }

  // Interleave surfaced boosts at 1-in-SPACING so no window exceeds 20% boosted.
  const out: T[] = []
  let ri = 0
  let si = 0
  for (let pos = 0; ri < rest.length || si < surfaced.length; pos++) {
    if (pos % BOOST_SPACING === 0 && si < surfaced.length) out.push(surfaced[si++])
    else if (ri < rest.length) out.push(rest[ri++])
    else if (si < surfaced.length) out.push(surfaced[si++])
  }
  return out
}

/**
 * Picks ONE spotlighted profile to surface in the dedicated slot, rotating fairly
 * across all currently-active spotlights (by the per-request rotation seed).
 * Returns null when disabled or when nothing is spotlighted (→ no slot renders).
 */
export function pickSpotlight<T extends { spotlighted_until?: string | null }>(
  profiles: T[],
  opts: { enabled: boolean; now?: number; rotationSeed?: number },
): T | null {
  if (!opts.enabled) return null
  const now = opts.now ?? Date.now()
  const active = profiles.filter(p => isActive(p.spotlighted_until, now))
  if (active.length === 0) return null
  const idx = ((opts.rotationSeed ?? 0) % active.length + active.length) % active.length
  return active[idx]
}
