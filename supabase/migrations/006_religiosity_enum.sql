-- Migration 006: Religiosity three-tier system + modesty columns + quran engagement
--
-- 1. Remap existing religiosity values to new three-tier system
-- 2. Add check constraint for new values
-- 3. Add wears_niqab and wears_abaya columns
-- 4. Add quran_engagement_level column

-- ── 1. Remap religiosity values ───────────────────────────────────────────────

UPDATE public.zawaaj_profiles
SET religiosity = CASE
  WHEN religiosity IN ('very_practicing', 'very practicing') THEN 'steadfast'
  WHEN religiosity IN ('practicing', 'practising') THEN 'practising'
  WHEN religiosity IN ('moderately_practising', 'moderately practising') THEN 'practising'
  WHEN religiosity IN ('cultural', 'cultural_muslim', 'Cultural Muslim') THEN NULL
  WHEN religiosity IN ('learning', 'Still learning / growing') THEN 'striving'
  WHEN religiosity = 'steadfast' THEN 'steadfast'
  WHEN religiosity = 'striving' THEN 'striving'
  ELSE religiosity
END;

-- ── 2. Add check constraint for new religiosity values ────────────────────────

ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_religiosity_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zawaaj_profiles_religiosity_check
  CHECK (religiosity IS NULL OR religiosity = ANY(ARRAY['steadfast', 'practising', 'striving']));

-- ── 3. Add modesty columns ────────────────────────────────────────────────────
-- wears_hijab already exists as boolean — keeping it boolean (yes=true, no=false)
-- New columns wears_niqab and wears_abaya support yes/no/sometimes

ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS wears_niqab text,
  ADD COLUMN IF NOT EXISTS wears_abaya text;

ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zp_wears_niqab_check,
  DROP CONSTRAINT IF EXISTS zp_wears_abaya_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_wears_niqab_check CHECK (wears_niqab IS NULL OR wears_niqab = ANY(ARRAY['yes','no','sometimes'])),
  ADD CONSTRAINT zp_wears_abaya_check CHECK (wears_abaya IS NULL OR wears_abaya = ANY(ARRAY['yes','no','sometimes']));

-- ── 4. Add quran engagement level column ──────────────────────────────────────

ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS quran_engagement_level text;

ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zp_quran_engagement_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_quran_engagement_check CHECK (
    quran_engagement_level IS NULL OR
    quran_engagement_level = ANY (ARRAY[
      'building_connection',
      'growing_regularly',
      'consistent_understanding',
      'deeply_engaged'
    ])
  );
