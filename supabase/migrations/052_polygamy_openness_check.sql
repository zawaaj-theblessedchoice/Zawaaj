-- Migration 052: Add CHECK constraint on polygamy_openness
--
-- Accepted values:
--   not_open        — not open to polygamy (new standard)
--   no              — legacy alias (stored by old add-profile wizard)
--   open_to_discuss — open to discussion (new standard)
--   open_to_discussion — legacy alias (stored by old add-profile wizard)
--   open            — legacy alias
--   yes             — yes, open to polygamy
--   NULL            — field not answered
--
-- Do NOT run automatically. Paste into Supabase SQL editor.

ALTER TABLE zawaaj_profiles
  ADD CONSTRAINT zp_polygamy_openness_check CHECK (
    polygamy_openness IS NULL
    OR polygamy_openness IN (
      'not_open',
      'no',
      'open_to_discuss',
      'open_to_discussion',
      'open',
      'yes'
    )
  );
