/**
 * normalisePhone — strips spaces, dashes, parentheses and normalises
 * UK numbers to E.164 format (+447...).
 *
 * Rules:
 *  - Remove all non-digit characters except a leading +
 *  - UK local format (07xxx) → +447xxx
 *  - Numbers already starting with + are kept as-is after stripping noise
 *  - Returns null if the result is fewer than 7 digits (clearly invalid)
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Strip everything except digits and a leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, '')

  // If it starts with 00, treat as international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  // UK local: 07xxxxxxxxx → +447xxxxxxxxx
  if (/^07\d{9}$/.test(cleaned)) {
    cleaned = '+44' + cleaned.slice(1)
  }

  // UK local with country code already: 447xxxxxxxxx → +447xxxxxxxxx
  if (/^447\d{9}$/.test(cleaned)) {
    cleaned = '+' + cleaned
  }

  // Strip the + temporarily to count digits
  const digitsOnly = cleaned.replace(/^\+/, '')
  if (digitsOnly.length < 7) return null

  return cleaned
}

/**
 * phoneMatches — returns true if two normalised phone strings are equivalent.
 * Handles null/undefined safely.
 */
export function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalisePhone(a)
  const nb = normalisePhone(b)
  if (!na || !nb) return false
  return na === nb
}
