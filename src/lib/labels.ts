/**
 * Centralized enum-to-label maps for zawaaj_profiles columns.
 *
 * Use with the displayValue() helper:
 *   displayValue(RELOCATION_LABELS, profile.open_to_relocation)
 *
 * Both underscore DB values and legacy free-text variants are included so
 * existing data from the add-profile wizard (which stored 'Yes', 'No', etc.)
 * continues to display correctly alongside new records.
 */

export function displayValue(
  map: Record<string, string>,
  v: string | null | undefined,
): string | null {
  if (!v) return null
  return map[v] ?? v
}

// ─── Marital status ───────────────────────────────────────────────────────────

export const MARITAL_LABELS: Record<string, string> = {
  never_married: 'Never married',
  Never_married: 'Never married',
  divorced:      'Divorced',
  Divorced:      'Divorced',
  widowed:       'Widowed',
  Widowed:       'Widowed',
  married:       'Married',
}

// ─── Living situation ─────────────────────────────────────────────────────────

export const LIVING_LABELS: Record<string, string> = {
  with_family:    'With family',
  independently:  'Living independently',
  independent:    'Living independently',
  with_flatmates: 'With flatmates',
  shared:         'Shared accommodation',
  other:          'Other',
}

// ─── Relocation ───────────────────────────────────────────────────────────────

export const RELOCATION_LABELS: Record<string, string> = {
  yes_open:     'Yes, open to relocating',
  // Legacy free-text values stored by add-profile wizard
  yes:          'Yes, open to relocating',
  Yes:          'Yes, open to relocating',
  possibly:     'Possibly — open to discussion',
  Possibly:     'Possibly — open to discussion',
  within_uk:    'Within the UK',
  prefer_local: 'Prefer to stay local',
  not_open:     'Not open to relocating',
  no:           'Not open to relocating',
  No:           'Not open to relocating',
  flexible:     'Flexible — open to discussion',
}

// ─── Open to partner's children ───────────────────────────────────────────────

export const PARTNER_CHILDREN_LABELS: Record<string, string> = {
  yes:        'Yes',
  Yes:        'Yes',
  possibly:   'Possibly',
  Possibly:   'Possibly',
  prefer_not: 'Prefer not',
  open:       'Open to it',
  no:         'No',
  No:         'No',
}

// ─── Polygamy openness ────────────────────────────────────────────────────────

export const POLYGAMY_LABELS: Record<string, string> = {
  not_open:           'Not open to polygamy',
  // Legacy free-text
  no:                 'Not open to polygamy',
  No:                 'Not open to polygamy',
  open_to_discuss:    'Open to discussion',
  open_to_discussion: 'Open to discussion',
  open:               'Open to it',
  yes:                'Yes, open to polygamy',
  Yes:                'Yes, open to polygamy',
}

// ─── Religiosity ──────────────────────────────────────────────────────────────

export const RELIGIOSITY_LABELS: Record<string, string> = {
  steadfast:  'Steadfast',
  practising: 'Practising',
  striving:   'Striving',
}

// ─── Prayer regularity ────────────────────────────────────────────────────────

export const PRAYER_LABELS: Record<string, string> = {
  yes_regularly: 'Yes, regularly',
  // Legacy free-text from add-profile wizard
  'Yes, regularly': 'Yes, regularly',
  five_daily:    'Five daily prayers',
  mostly:        'Mostly — occasional misses',
  // Legacy free-text
  Mostly:        'Mostly',
  most_of_time:  'Most of the time',
  working_on_it: 'Working on it',
  'Working on it': 'Working on it',
  sometimes:     'Sometimes',
  occasionally:  'Occasionally',
  not_currently: 'Not currently',
}

// ─── Education level ──────────────────────────────────────────────────────────

export const EDUCATION_LABELS: Record<string, string> = {
  // DB snake_case values (from my-profile edit)
  gcses_o_levels:   'GCSEs / O-Levels',
  a_levels:         'A-Levels',
  bachelors_degree: "Bachelor's degree",
  masters_degree:   "Master's degree",
  phd_doctorate:    'PhD / Doctorate',
  vocational:       'Vocational / Trade',
  islamic_studies:  'Islamic Studies',
  no_formal:        'No formal qualifications',
  // Legacy free-text from add-profile wizard (stored via toSnakeCase)
  secondary_school:            'Secondary school',
  'college_/_a_levels':        'College / A-levels',
  college_a_levels:            'College / A-levels',
  undergraduate_degree:        'Undergraduate degree',
  postgraduate_degree:         'Postgraduate degree',
  'doctorate_/_phd':           'Doctorate / PhD',
  doctorate_phd:               'Doctorate / PhD',
  professional_qualification:  'Professional qualification',
  other:                       'Other',
}
