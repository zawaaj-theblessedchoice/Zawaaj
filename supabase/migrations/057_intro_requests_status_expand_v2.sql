-- 057_intro_requests_status_expand_v2.sql
-- Extends the zawaaj_introduction_requests status CHECK constraint
-- to include all follow-up progression statuses and Islamic outcome values.
--
-- New values (beyond what migration 055 added):
--   following_up      — contacts shared, awaiting first outreach
--   contact_made      — admin/manager contacted both families
--   both_willing      — both families willing to proceed
--   meeting_arranged  — families arranging to meet
--   met               — families have met
--   nikkah_completed  — Alhamdulillah — nikkah completed
--   not_proceeded     — did not proceed

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
    -- response tracking values
    'responded_positive',
    'responded_negative',
    'mutual_confirmed',
    -- follow-up progression values
    'following_up',
    'contact_made',
    'both_willing',
    'meeting_arranged',
    'met',
    -- outcome values
    'nikkah_completed',
    'not_proceeded'
  ]::text[]));
