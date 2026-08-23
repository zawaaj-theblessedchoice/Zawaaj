-- ============================================================================
-- 066_marital_status_married.sql
--
-- ⚠️⚠️⚠️  KHALIL MUST RUN THIS MANUALLY. Constraint change only, safe.
--        Run in the Supabase SQL editor against project nxytwfbzoxatyupqccba.
--
-- Adds 'married' to the allowed zawaaj_profiles.marital_status values, so a MALE
-- candidate can be recorded as married (polygyny — a married man seeking an
-- additional wife). The app only OFFERS "Married" to male candidates; this just
-- lets the value be stored. Existing rows (never_married/divorced/widowed/NULL)
-- are unaffected.
--
-- Current constraint (migration 007):
--   zp_marital_status_check CHECK (
--     marital_status IS NULL OR
--     marital_status = ANY (ARRAY['never_married','divorced','widowed','annulled']))
-- ============================================================================

ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zp_marital_status_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_marital_status_check CHECK (
    marital_status IS NULL OR
    marital_status = ANY (ARRAY['never_married','divorced','widowed','annulled','married'])
  );
