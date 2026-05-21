-- 048_quran_three_fields.sql
-- Replace the single quran_engagement_level field with three separate fields.
-- quran_engagement_level is retained with a deprecation comment for historical data.

ALTER TABLE zawaaj_profiles
  ADD COLUMN IF NOT EXISTS quran_frequency text
    CHECK (quran_frequency IN ('daily', 'few_times_week', 'weekly', 'occasionally')),
  ADD COLUMN IF NOT EXISTS quran_depth text
    CHECK (quran_depth IN ('recitation_only', 'with_translation', 'tafsir_study', 'memorisation')),
  ADD COLUMN IF NOT EXISTS quran_application text
    CHECK (quran_application IN ('central_guide', 'regular_reflection', 'growing_connection', 'formal_learning'));

-- quran_engagement_level is deprecated — kept for historical data only.
-- New registrations use quran_frequency, quran_depth, and quran_application instead.
COMMENT ON COLUMN zawaaj_profiles.quran_engagement_level IS 'DEPRECATED — use quran_frequency, quran_depth, quran_application instead';
