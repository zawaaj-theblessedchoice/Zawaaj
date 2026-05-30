-- 058_profiles_status_nikkah.sql
-- Adds 'nikkah_alhamdulillah' to the zawaaj_profiles status constraint.
--
-- This status marks profiles of couples who completed nikkah —
-- hidden from browse/discover (which filters status = 'approved') but
-- preserved in the database for platform statistics and history.
--
-- Existing constraint (from migration 003) already includes:
--   pending, approved, paused, rejected, withdrawn, suspended, introduced, unlinked
--
-- 'withdrawn' is already present — no separate change needed.
-- 'nikkah_alhamdulillah' is the only new value added here.

ALTER TABLE zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_status_check;

ALTER TABLE zawaaj_profiles
  ADD CONSTRAINT zawaaj_profiles_status_check
  CHECK (status = ANY (ARRAY[
    'pending',
    'approved',
    'paused',
    'rejected',
    'withdrawn',
    'suspended',
    'introduced',
    'unlinked',
    'nikkah_alhamdulillah'
  ]::text[]));
