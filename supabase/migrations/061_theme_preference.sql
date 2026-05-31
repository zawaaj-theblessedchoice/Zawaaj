-- 061_theme_preference.sql
-- Phase 5 (Theme / Dark Mode): persist theme preference server-side instead of
-- localStorage/cookies, so it survives refresh and follows the user across devices.
--
-- Precedence (enforced in app code, not here):
--   - Members          → zawaaj_family_accounts.theme_preference
--   - Admins / managers → zawaaj_profiles.theme_preference (wins when both exist)
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CHECK. Safe to re-run.
-- MUST be run manually in the Zawaaj SQL editor before any Phase 5 read path ships.
-- Verify afterwards:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE column_name = 'theme_preference'
--     AND table_name IN ('zawaaj_family_accounts','zawaaj_profiles');
-- Expect two rows.

ALTER TABLE zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark'
  CHECK (theme_preference IN ('dark','light'));

ALTER TABLE zawaaj_profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark'
  CHECK (theme_preference IN ('dark','light'));
