-- Migration 016: Fix introduction request status ENUM + add admin tracking fields
-- Spec: zawaaj_master_brief.md §4 (Request States) and §7 (Database)
--
-- FINAL STATUS ENUM (strict, per spec):
--   pending → responded_positive → mutual_confirmed → admin_pending
--   → admin_assigned → admin_in_progress → admin_completed
--   pending → responded_negative
--   pending → expired
--   pending → withdrawn
--
-- DATA MIGRATION (existing rows mapped to closest new state):
--   mutual      → mutual_confirmed
--   declined    → responded_negative
--   facilitated → admin_completed
--   active      → pending

-- ─── 1. Add admin tracking columns ───────────────────────────────────────────

ALTER TABLE public.zawaaj_introduction_requests
  ADD COLUMN IF NOT EXISTS assigned_manager_id uuid
    REFERENCES public.zawaaj_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_by uuid
    REFERENCES public.zawaaj_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz;

-- ─── 2. Drop old constraints (safe if they don't exist) ───────────────────────

ALTER TABLE public.zawaaj_introduction_requests
  DROP CONSTRAINT IF EXISTS zawaaj_introduction_requests_status_check;

-- ─── 3. Migrate existing data BEFORE adding new constraint ───────────────────

-- mutual → mutual_confirmed (old dual-request mutual)
UPDATE public.zawaaj_introduction_requests
  SET status = 'mutual_confirmed'
  WHERE status = 'mutual';

-- declined → responded_negative
UPDATE public.zawaaj_introduction_requests
  SET status = 'responded_negative'
  WHERE status = 'declined';

-- facilitated → admin_completed
UPDATE public.zawaaj_introduction_requests
  SET status = 'admin_completed'
  WHERE status = 'facilitated';

-- active → pending (legacy normalisation)
UPDATE public.zawaaj_introduction_requests
  SET status = 'pending'
  WHERE status = 'active';

-- ─── 4. Apply strict new enum constraint ─────────────────────────────────────

ALTER TABLE public.zawaaj_introduction_requests
  ADD CONSTRAINT zawaaj_introduction_requests_status_check
    CHECK (status IN (
      'pending',
      'responded_positive',
      'responded_negative',
      'mutual_confirmed',
      'admin_pending',
      'admin_assigned',
      'admin_in_progress',
      'admin_completed',
      'expired',
      'withdrawn'
    ));

-- ─── 5. Indexes for admin workflow queries ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_intro_requests_status
  ON public.zawaaj_introduction_requests (status);

CREATE INDEX IF NOT EXISTS idx_intro_requests_assigned_manager
  ON public.zawaaj_introduction_requests (assigned_manager_id)
  WHERE assigned_manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intro_requests_handled_by
  ON public.zawaaj_introduction_requests (handled_by)
  WHERE handled_by IS NOT NULL;

-- ─── 6. Analytics / tracking table ───────────────────────────────────────────
-- Tracks: requests sent, response rate, match rate, admin completion rate.
-- Populated by triggers on zawaaj_introduction_requests status changes.

CREATE TABLE IF NOT EXISTS public.zawaaj_analytics (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type      text NOT NULL,
  -- 'request_sent' | 'responded_positive' | 'responded_negative'
  -- | 'mutual_confirmed' | 'admin_completed' | 'expired' | 'withdrawn'
  profile_id      uuid REFERENCES public.zawaaj_profiles(id) ON DELETE SET NULL,
  request_id      uuid REFERENCES public.zawaaj_introduction_requests(id) ON DELETE SET NULL,
  plan            text, -- plan of the profile at event time
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type
  ON public.zawaaj_analytics (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_profile
  ON public.zawaaj_analytics (profile_id, created_at);

-- RLS: only admins can read analytics
ALTER TABLE public.zawaaj_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_analytics" ON public.zawaaj_analytics;
CREATE POLICY "admins_read_analytics"
  ON public.zawaaj_analytics
  FOR SELECT
  USING (zawaaj_is_admin());

DROP POLICY IF EXISTS "service_role_insert_analytics" ON public.zawaaj_analytics;
CREATE POLICY "service_role_insert_analytics"
  ON public.zawaaj_analytics
  FOR INSERT
  WITH CHECK (true); -- inserts done via service role (admin client)

COMMENT ON TABLE public.zawaaj_analytics IS
  'Immutable event log for platform analytics: requests sent, response rate, match rate, completion rate.';

COMMENT ON COLUMN public.zawaaj_introduction_requests.assigned_manager_id IS
  'Manager assigned to handle this mutual introduction. Set when status moves to admin_assigned.';

COMMENT ON COLUMN public.zawaaj_introduction_requests.handled_by IS
  'Profile ID of the admin/manager who last acted on this request.';

COMMENT ON COLUMN public.zawaaj_introduction_requests.handled_at IS
  'Timestamp of the last admin action taken on this request.';
