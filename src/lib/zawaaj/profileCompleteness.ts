// CD-010 — mandatory completion gate.
//
// The full intake set that EVERY live profile must have before it is
// browse-eligible. Completeness is DERIVED LIVE from these columns (no stored
// flag → never drifts; no migration). One shared source of truth so the gate,
// the import "not browse-eligible" rule, and the completion form all agree.

// Shape covering exactly the mandatory columns (plus the fallbacks we accept).
export interface MandatoryProfileFields {
  first_name?: string | null          // candidate_name → first_name (+last_name)
  gender?: string | null
  location?: string | null            // city
  age_display?: string | null         // age (or DOB→age, stored as age_display)
  date_of_birth?: string | null       // accepted as an age source if age_display blank
  height?: string | null
  ethnicity?: string | null
  education_level?: string | null     // education (level or detail satisfies it)
  education_detail?: string | null
  profession_detail?: string | null   // profession
  school_of_thought?: string | null   // madhhab
  spouse_preferences?: string[] | null
  consent_given?: boolean | null      // consent
}

// Human-facing labels for each mandatory key (used by the completion form / messaging).
export const MANDATORY_FIELD_LABELS: Record<string, string> = {
  candidate_name:     'Candidate name',
  gender:             'Gender',
  city:               'City',
  age:                'Age',
  height:             'Height',
  ethnicity:          'Ethnicity',
  education:          'Education',
  profession:         'Profession',
  madhhab:            'School of thought',
  spouse_preferences: 'Spouse preferences',
  consent:            'Consent',
}

const nonEmpty = (v: string | null | undefined): boolean => !!(v && v.trim() !== '')

/**
 * Returns the list of mandatory fields still missing for a profile.
 * Empty array ⇒ complete ⇒ browse-eligible.
 */
export function missingMandatoryFields(p: MandatoryProfileFields): string[] {
  const missing: string[] = []

  if (!nonEmpty(p.first_name)) missing.push('candidate_name')
  if (!nonEmpty(p.gender)) missing.push('gender')
  if (!nonEmpty(p.location)) missing.push('city')
  if (!nonEmpty(p.age_display) && !nonEmpty(p.date_of_birth)) missing.push('age')
  if (!nonEmpty(p.height)) missing.push('height')
  if (!nonEmpty(p.ethnicity)) missing.push('ethnicity')
  if (!nonEmpty(p.education_level) && !nonEmpty(p.education_detail)) missing.push('education')
  if (!nonEmpty(p.profession_detail)) missing.push('profession')
  if (!nonEmpty(p.school_of_thought)) missing.push('madhhab')
  if (!(p.spouse_preferences && p.spouse_preferences.length > 0)) missing.push('spouse_preferences')
  if (p.consent_given !== true) missing.push('consent')

  return missing
}

/** True when every mandatory field is present (browse-eligible per CD-010). */
export function isProfileComplete(p: MandatoryProfileFields): boolean {
  return missingMandatoryFields(p).length === 0
}

// The exact column list to SELECT when evaluating completeness server-side.
export const MANDATORY_SELECT =
  'first_name, gender, location, age_display, date_of_birth, height, ethnicity, ' +
  'education_level, education_detail, profession_detail, school_of_thought, ' +
  'spouse_preferences, consent_given'
