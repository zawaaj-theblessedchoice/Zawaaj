-- Migration 050: Add CHECK constraint enforcing 18–60 year age range on date_of_birth
--
-- This is the DB-level backstop. Application-layer validation (registration form,
-- API route, import CSV) is the primary defence; this constraint prevents any
-- future code path from storing an out-of-range DOB directly via Supabase admin
-- or SQL tooling.
--
-- The constraint is nullable: imported profiles (legacy families) store age as the
-- text column `age_display` and leave `date_of_birth` NULL, so they are unaffected.

ALTER TABLE zawaaj_profiles
  ADD CONSTRAINT zp_dob_age_check CHECK (
    date_of_birth IS NULL
    OR (
      date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
      AND date_of_birth >= (CURRENT_DATE - INTERVAL '60 years')
    )
  );
