export const RELIGIOSITY_OPTIONS = [
  { value: 'steadfast',  label: 'Steadfast',  description: 'Fulfilling religious obligations consistently — and always striving to deepen and improve' },
  { value: 'practising', label: 'Practising', description: 'Actively practising and working to maintain consistency in worship' },
  { value: 'striving',   label: 'Striving',   description: 'On a sincere journey of growth — actively working to strengthen practice' },
] as const

/** How often the person engages with the Qur'an. */
export const QURAN_FREQUENCY_OPTIONS = [
  { value: 'daily',           label: 'Daily',                description: 'Every day without fail' },
  { value: 'few_times_week',  label: 'A few times a week',   description: 'Several times per week' },
  { value: 'weekly',          label: 'Weekly',               description: 'Around once a week' },
  { value: 'occasionally',    label: 'Occasionally',         description: 'When I can, not on a fixed schedule' },
] as const

/** How deeply the person engages when they do. */
export const QURAN_DEPTH_OPTIONS = [
  { value: 'recitation_only',  label: 'Recitation only',              description: 'I read or listen in Arabic' },
  { value: 'with_translation', label: 'Recitation with translation',  description: 'I follow along with the meaning' },
  { value: 'tafsir_study',     label: 'Study / tafsir',               description: 'I explore explanations and commentary' },
  { value: 'memorisation',     label: 'Hifz / memorisation',          description: 'I am memorising or have memorised' },
] as const

/** How the Qur'an shapes the person's daily life. */
export const QURAN_APPLICATION_OPTIONS = [
  { value: 'central_guide',        label: "It's my central guide",         description: 'I actively seek guidance from it in daily decisions' },
  { value: 'regular_reflection',   label: 'I reflect on it regularly',      description: 'I think about its lessons and apply them' },
  { value: 'growing_connection',   label: "I'm building my connection",      description: "I'm actively working to deepen my relationship with it" },
  { value: 'formal_learning',      label: 'Formal learning setting',         description: 'I study it through a class or structured programme' },
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

/** Static fallback — used only when zawaaj_plans DB table is unreachable. */
export const PLAN_LIMITS_FALLBACK = {
  voluntary: { monthlyInterests: 2,        maxProfiles: 2 },
  plus:      { monthlyInterests: 15,       maxProfiles: 4 },
  premium:   { monthlyInterests: Infinity, maxProfiles: 4 },
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
