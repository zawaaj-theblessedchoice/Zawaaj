/**
 * planDisplayName — converts a plan slug to its member-facing display name.
 *
 * Handles both the DB slug ('voluntary') and the legacy code-level type ('free').
 * DB values, API checks, and plan slug comparisons always use the raw slug.
 * This function is the ONLY place where slugs become human-readable strings.
 *
 * Rules (confirmed final sprint brief):
 *   voluntary / free → 'Community Access'
 *   plus             → 'Plus'  (internal only — never surface in member UI)
 *   premium          → 'Premium'
 */
export function planDisplayName(plan: string): string {
  const names: Record<string, string> = {
    voluntary:        'Community Access',
    free:             'Community Access',  // legacy code-level alias
    plus:             'Plus',
    premium:          'Premium',
  }
  return names[plan] ?? plan
}
