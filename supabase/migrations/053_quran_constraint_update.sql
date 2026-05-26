-- 053_quran_constraint_update.sql
-- Update the three Quran field CHECK constraints to match the new option values
-- introduced in the registration form. The old values from 048_quran_three_fields
-- are retained as valid so that existing profile rows are not broken.

-- ── quran_frequency ──────────────────────────────────────────────────────────
ALTER TABLE zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_quran_frequency_check;

ALTER TABLE zawaaj_profiles
  ADD CONSTRAINT zawaaj_profiles_quran_frequency_check
    CHECK (quran_frequency IS NULL OR quran_frequency IN (
      -- new values
      'not_currently',
      'occasionally',
      'weekly',
      'few_times_week',
      'daily',
      -- legacy values (existing rows)
      'rarely',
      'several_weekly'
    ));

-- ── quran_depth ───────────────────────────────────────────────────────────────
ALTER TABLE zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_quran_depth_check;

ALTER TABLE zawaaj_profiles
  ADD CONSTRAINT zawaaj_profiles_quran_depth_check
    CHECK (quran_depth IS NULL OR quran_depth IN (
      -- new values
      'not_currently',
      'recitation_listening',
      'reading_reflection',
      'active_study',
      'structured_tafsir',
      -- legacy values (existing rows)
      'recitation',
      'reflection',
      'study',
      'scholarly'
    ));

-- ── quran_application ─────────────────────────────────────────────────────────
ALTER TABLE zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_quran_application_check;

ALTER TABLE zawaaj_profiles
  ADD CONSTRAINT zawaaj_profiles_quran_application_check
    CHECK (quran_application IS NULL OR quran_application IN (
      -- new values
      'not_currently',
      'still_learning_apply',
      'ongoing_journey',
      'guides_decisions',
      'foundation_character',
      -- legacy values (existing rows)
      'learning',
      'trying',
      'guiding',
      'central'
    ));
