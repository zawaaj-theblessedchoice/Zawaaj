-- 055_introduction_requests_status_expand.sql
-- Expand the zawaaj_introduction_requests status CHECK constraint to include
-- all values the admin facilitation flow actually writes.
--
-- Original constraint (from initial schema) only allowed:
--   pending, accepted, declined, expired, withdrawn
--
-- The admin introductions route sets these additional values:
--   admin_assigned      — manager assigned by super_admin
--   admin_in_progress   — manager started working the request
--   admin_completed     — manager completed the introduction
--   facilitated         — contacts shared with both families (facilitate action)
--
-- VALID_STATUSES in the route also references these (available via override_status):
--   responded_positive, responded_negative, mutual_confirmed, admin_pending
--
-- All are added here so a future override_status call never hits this constraint.

ALTER TABLE zawaaj_introduction_requests
  DROP CONSTRAINT IF EXISTS zawaaj_introduction_requests_status_check;

ALTER TABLE zawaaj_introduction_requests
  ADD CONSTRAINT zawaaj_introduction_requests_status_check
  CHECK (status = ANY (ARRAY[
    -- original values
    'pending',
    'accepted',
    'declined',
    'expired',
    'withdrawn',
    -- admin workflow values
    'facilitated',
    'admin_assigned',
    'admin_in_progress',
    'admin_completed',
    'admin_pending',
    -- response tracking values (available via override_status)
    'responded_positive',
    'responded_negative',
    'mutual_confirmed'
  ]::text[]));
