-- zawaaj_profile_hardening_v1
-- Migrate wears_hijab from boolean to text, add missing columns, add constraints

-- 1. Migrate wears_hijab boolean → text
ALTER TABLE public.zawaaj_profiles
  ALTER COLUMN wears_hijab TYPE text
  USING CASE wears_hijab WHEN true THEN 'yes' WHEN false THEN 'no' ELSE NULL END;

-- Drop old boolean default if any
ALTER TABLE public.zawaaj_profiles
  ALTER COLUMN wears_hijab DROP DEFAULT;

-- 2. Add wears_hijab check constraint
ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zp_wears_hijab_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_wears_hijab_check CHECK (
    wears_hijab IS NULL OR wears_hijab = ANY (ARRAY['yes','no','sometimes'])
  );

-- 3. Add missing columns (IF NOT EXISTS — safe to re-run)
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS height_cm    integer,
  ADD COLUMN IF NOT EXISTS height_unit  text DEFAULT 'cm';

-- 4. Add/replace check constraints (drop first to avoid conflicts)
ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zp_height_unit_check,
  DROP CONSTRAINT IF EXISTS zp_marital_status_check,
  DROP CONSTRAINT IF EXISTS zp_living_situation_check,
  DROP CONSTRAINT IF EXISTS zp_open_to_relocation_check,
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_marital_status_check,
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_living_situation_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_height_unit_check CHECK (
    height_unit IS NULL OR height_unit = ANY (ARRAY['cm','ft_in'])),
  ADD CONSTRAINT zp_marital_status_check CHECK (
    marital_status IS NULL OR marital_status = ANY (ARRAY['never_married','divorced','widowed','annulled'])),
  ADD CONSTRAINT zp_living_situation_check CHECK (
    living_situation IS NULL OR living_situation = ANY (ARRAY['with_family','independently','with_flatmates','other'])),
  ADD CONSTRAINT zp_open_to_relocation_check CHECK (
    open_to_relocation IS NULL OR open_to_relocation = ANY (ARRAY['yes','no','flexible']));

-- 5. Migrate height text → height_cm integer
UPDATE public.zawaaj_profiles
SET height_cm = CASE
  WHEN height ~ '^\d+$' THEN height::integer
  WHEN height ~* '^\d+\s*cm$' THEN regexp_replace(height, '[^0-9]', '', 'g')::integer
  ELSE NULL
END
WHERE height IS NOT NULL AND height_cm IS NULL;
