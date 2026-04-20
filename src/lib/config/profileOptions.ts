export const RELIGIOSITY_OPTIONS = [
  { value: 'steadfast',  label: 'Steadfast',  description: 'Consistently fulfilling religious obligations with structure and commitment' },
  { value: 'practising', label: 'Practising', description: 'Regularly practising and actively working to maintain and improve' },
  { value: 'striving',   label: 'Striving',   description: 'On a sincere journey of growth — actively working to strengthen practice' },
] as const

export const QURAN_ENGAGEMENT_OPTIONS = [
  { value: 'building_connection',      label: 'Building my connection',  description: 'I read or listen occasionally' },
  { value: 'growing_regularly',        label: 'Growing regularly',       description: 'I engage regularly and am improving my reading' },
  { value: 'consistent_understanding', label: 'Consistent and learning', description: 'I read consistently and am deepening my understanding' },
  { value: 'deeply_engaged',           label: 'Deeply engaged',          description: "The Qur'an is central to my daily life" },
] as const

export const MODESTY_OPTIONS = [
  { value: 'yes', label: 'Yes' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'no', label: 'No' },
] as const

export const MODESTY_FIELDS = [
  { key: 'wears_hijab', label: 'Hijab', definition: 'Headscarf covering the hair' },
  { key: 'wears_niqab', label: 'Niqab', definition: 'Face veil covering the face' },
  { key: 'wears_abaya', label: 'Abaya', definition: 'Loose outer garment covering the body' },
] as const

export const PRAYER_REGULARITY_OPTIONS = [
  { value: 'five_daily',    label: 'Five daily prayers' },
  { value: 'mostly',        label: 'Mostly — occasional misses' },
  { value: 'sometimes',     label: 'Sometimes' },
  { value: 'occasionally',  label: 'Occasionally' },
] as const

export const SCHOOL_OF_THOUGHT_OPTIONS = [
  { value: 'Hanafi',              label: 'Hanafi' },
  { value: "Shafi'i",             label: "Shafi'i" },
  { value: 'Maliki',              label: 'Maliki' },
  { value: 'Hanbali',             label: 'Hanbali' },
  { value: 'General Sunni',       label: 'General Sunni' },
  { value: 'Salafi / Athari',     label: 'Salafi / Athari' },
  { value: 'Revert / Learning',   label: 'Revert / Learning' },
  { value: 'No preference',       label: 'No preference' },
  { value: 'Prefer not to say',   label: 'Prefer not to say' },
] as const

export const MARITAL_STATUS_OPTIONS = [
  { value: 'never_married', label: 'Never married' },
  { value: 'divorced',      label: 'Divorced' },
  { value: 'widowed',       label: 'Widowed' },
  { value: 'married',       label: 'Married' },
] as const

export const OPEN_TO_MARITAL_STATUS_OPTIONS = [
  { value: 'never_married_only',       label: 'Never married only' },
  { value: 'divorced_widowed_only',    label: 'Divorced / widowed only' },
  { value: 'married_men_considered',   label: 'Married men considered' },
  { value: 'case_by_case',             label: 'Case by case' },
] as const

export const LIVING_SITUATION_OPTIONS = [
  { value: 'with_family',    label: 'With family' },
  { value: 'independently',  label: 'Independently' },
  { value: 'with_flatmates', label: 'With flatmates' },
  { value: 'other',          label: 'Other' },
] as const

export const RELOCATION_OPTIONS = [
  { value: 'yes',      label: 'Yes, open to relocating' },
  { value: 'flexible', label: 'Flexible — open to discussion' },
  { value: 'no',       label: 'No, prefer to stay local' },
] as const

/** Static fallback — used during SSR/build only. */
export const PLAN_LIMITS_FALLBACK = {
  voluntary: { monthlyInterests: 5,        maxProfiles: 2 },
  plus:      { monthlyInterests: 15,       maxProfiles: 4 },
  premium:   { monthlyInterests: Infinity, maxProfiles: 6 },
} as const

/** Live fetch — use this everywhere in application code (server-side only). */
export async function fetchPlanLimits(
  supabase: { from: (t: string) => unknown }
): Promise<Record<string, { monthlyInterests: number; maxProfiles: number }>> {
  type Client = {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: boolean) => Promise<{
          data: Array<{ key: string; monthly_interests: number | null; max_profiles: number }> | null
          error: unknown
        }>
      }
    }
  }
  try {
    const { data, error } = await (supabase as Client)
      .from('zawaaj_plans')
      .select('key,monthly_interests,max_profiles')
      .eq('is_active', true)

    if (!error && data) {
      return Object.fromEntries(
        data.map(p => [p.key, {
          monthlyInterests: p.monthly_interests ?? Infinity,
          maxProfiles: p.max_profiles,
        }])
      )
    }
  } catch {
    // fall through to static fallback
  }

  return PLAN_LIMITS_FALLBACK
}

export const INTEREST_EXPIRY_DAYS     = 7
export const FOLLOWUP_REMINDER_DAYS   = 14
export const MAX_BIO_LENGTH           = 1000
export const MIN_BIO_LENGTH           = 80
export const MAX_PROFILES_PER_ACCOUNT = 6
