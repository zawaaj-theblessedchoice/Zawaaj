// ─── Shared filter types ──────────────────────────────────────────────────────
//
// Extracted from BrowseClient so server-safe modules (e.g. recommendations.ts)
// can import them without pulling in a 'use client' boundary.
// No imports, no side-effects — pure type + constant declarations only.

// Keys that can carry a "must-have" toggle (Premium only)
export type MustHaveableKey =
  | 'ageMin' | 'ageMax'
  | 'location'
  | 'maritalStatus'
  | 'hasChildren'
  | 'educationLevel'
  | 'ethnicity'
  | 'religiosity'
  | 'schoolOfThought'

export interface FilterState {
  // ── All plans (visible but disabled for Free) ─────────────
  ageMin:          string
  ageMax:          string
  location:        string          // text-contains match on profile.location
  maritalStatus:   string[]
  hasChildren:     string[]
  // ── Plus / Premium only ───────────────────────────────────
  educationLevel:  string[]
  ethnicity:       string[]
  religiosity:     string[]
  schoolOfThought: string[]
  // ── Premium only — marks a field as a deal-breaker ────────
  mustHave: Partial<Record<MustHaveableKey, boolean>>
}

export const EMPTY_FILTERS: FilterState = {
  ageMin:          '',
  ageMax:          '',
  location:        '',
  maritalStatus:   [],
  hasChildren:     [],
  educationLevel:  [],
  ethnicity:       [],
  religiosity:     [],
  schoolOfThought: [],
  mustHave:        {},
}
