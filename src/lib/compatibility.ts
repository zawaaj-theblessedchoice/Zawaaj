export interface ProfileRecord {
  id: string
  school_of_thought: string | null
  date_of_birth: string | null
  location: string | null
  ethnicity: string | null
  open_to_relocation: string | null
  has_children: boolean | null
  pref_age_min: number | null
  pref_age_max: number | null
  pref_location: string | null
  pref_ethnicity: string | null
  pref_school_of_thought: string[] | null
  pref_relocation: string | null
  pref_partner_children: string | null
  open_to_partners_children: string | null
}

export interface CompatibilityResult {
  score: number
  highlights: string[]
}

function calcAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function parseLocationParts(location: string | null): { city: string; country: string } | null {
  if (!location) return null
  const parts = location.split(',').map(s => s.trim())
  if (parts.length >= 2) {
    return { city: parts[0].toLowerCase(), country: parts[parts.length - 1].toLowerCase() }
  }
  return { city: parts[0].toLowerCase(), country: parts[0].toLowerCase() }
}

export function scoreCompatibility(
  viewer: ProfileRecord,
  candidate: ProfileRecord
): CompatibilityResult {
  let score = 0
  const highlights: string[] = []

  // ── School of thought (+25) ──────────────────────────────────────────────
  const noPreference = ['no preference', 'general sunni', 'any']
  const viewerSot = viewer.pref_school_of_thought
  const candidateSot = candidate.school_of_thought

  let sotMatch = false
  if (viewerSot && viewerSot.length > 0 && candidateSot) {
    const viewerLower = viewerSot.map(s => s.toLowerCase())
    const candidateLower = candidateSot.toLowerCase()
    const viewerHasNoPreference = viewerLower.some(s => noPreference.includes(s))
    const candidateIsNoPreference = noPreference.includes(candidateLower)

    if (viewerHasNoPreference || candidateIsNoPreference) {
      sotMatch = true
    } else if (viewerLower.includes(candidateLower)) {
      sotMatch = true
    }
  } else if (!viewerSot || viewerSot.length === 0) {
    // Viewer has no preference — counts as match
    sotMatch = true
  }

  if (sotMatch) {
    score += 25
    if (candidateSot && !noPreference.includes(candidateSot.toLowerCase())) {
      highlights.push(`Shared school of thought (${candidateSot})`)
    } else {
      highlights.push('School of thought aligns with your preferences')
    }
  }

  // ── Age band (+25 / +10) ─────────────────────────────────────────────────
  const candidateAge = calcAge(candidate.date_of_birth)
  if (candidateAge !== null) {
    const ageMin = viewer.pref_age_min
    const ageMax = viewer.pref_age_max

    if (ageMin !== null && ageMax !== null) {
      if (candidateAge >= ageMin && candidateAge <= ageMax) {
        score += 25
        highlights.push('Age within your preferred range')
      } else if (candidateAge >= ageMin - 2 && candidateAge <= ageMax + 2) {
        score += 10
        highlights.push('Age close to your preferred range')
      }
    } else if (ageMin !== null) {
      if (candidateAge >= ageMin) {
        score += 25
        highlights.push('Age within your preferred range')
      } else if (candidateAge >= ageMin - 2) {
        score += 10
        highlights.push('Age close to your preferred range')
      }
    } else if (ageMax !== null) {
      if (candidateAge <= ageMax) {
        score += 25
        highlights.push('Age within your preferred range')
      } else if (candidateAge <= ageMax + 2) {
        score += 10
        highlights.push('Age close to your preferred range')
      }
    } else {
      // No age preference — full points
      score += 25
    }
  }

  // ── Location (+20 same city / +10 same country / +5 open to relocation) ──
  const viewerPrefLocation = viewer.pref_location?.toLowerCase().trim()
  const candidateLoc = parseLocationParts(candidate.location)

  if (!viewerPrefLocation || viewerPrefLocation === 'anywhere' || viewerPrefLocation === 'open') {
    score += 20
    if (candidateLoc) {
      highlights.push(`Based in ${candidate.location}, within your preference`)
    }
  } else if (candidateLoc) {
    const prefParts = viewerPrefLocation.split(',').map(s => s.trim())
    const prefCity = prefParts[0]
    const prefCountry = prefParts[prefParts.length - 1]

    if (candidateLoc.city === prefCity) {
      score += 20
      highlights.push(`Based in ${candidate.location}, within your preference`)
    } else if (candidateLoc.country === prefCountry) {
      score += 10
      highlights.push(`Based in the same country as your preference`)
    } else {
      const relocation = candidate.open_to_relocation?.toLowerCase() ?? ''
      if (relocation.includes('yes') || relocation === 'open') {
        score += 5
        highlights.push('Open to relocation')
      }
    }
  }

  // ── Ethnicity (+15) ──────────────────────────────────────────────────────
  const viewerPrefEthnicity = viewer.pref_ethnicity?.toLowerCase().trim()
  const candidateEthnicity = candidate.ethnicity?.toLowerCase().trim()

  if (
    !viewerPrefEthnicity ||
    viewerPrefEthnicity === 'open' ||
    viewerPrefEthnicity === 'no preference' ||
    viewerPrefEthnicity === 'any'
  ) {
    score += 15
  } else if (candidateEthnicity && viewerPrefEthnicity === candidateEthnicity) {
    score += 15
    highlights.push('Ethnicity preference aligns')
  }

  // ── Relocation alignment (+10) ───────────────────────────────────────────
  const viewerPrefRelocation = viewer.pref_relocation?.toLowerCase()
  const candidateRelocation = candidate.open_to_relocation?.toLowerCase() ?? ''

  if (!viewerPrefRelocation || viewerPrefRelocation === 'no preference') {
    score += 10
  } else if (viewerPrefRelocation.includes('open') || viewerPrefRelocation.includes('yes')) {
    if (candidateRelocation.includes('yes') || candidateRelocation.includes('open')) {
      score += 10
    }
  } else {
    // Viewer does not require relocation
    score += 10
  }

  // ── Children alignment (+5) ──────────────────────────────────────────────
  const viewerChildrenPref = viewer.pref_partner_children?.toLowerCase()
  const candidateHasChildren = candidate.has_children

  if (!viewerChildrenPref || viewerChildrenPref === 'open' || viewerChildrenPref === 'no preference') {
    score += 5
  } else if (
    viewerChildrenPref.includes('no') &&
    candidateHasChildren === false
  ) {
    score += 5
  } else if (
    (viewerChildrenPref.includes('yes') || viewerChildrenPref.includes('open')) &&
    candidateHasChildren === true
  ) {
    score += 5
  }

  const finalScore = Math.min(100, Math.max(0, score))

  return { score: finalScore, highlights }
}
