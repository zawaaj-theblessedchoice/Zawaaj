-- ============================================================
-- Migration 030: GDPR implementation tables
-- ============================================================

-- 1. Privacy requests (data subject rights)
CREATE TABLE IF NOT EXISTS public.zawaaj_privacy_requests (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                  text        NOT NULL CHECK (type IN ('access','rectify','erasure','restriction','portability','objection')),
  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','awaiting_controller','completed','cancelled','rejected')),
  field_name            text,
  current_value         text,
  requested_value       text,
  supporting_note       text,
  scheduled_execute_at  timestamptz,
  controller_notified_at timestamptz,
  controller_approved_at timestamptz,
  completed_at          timestamptz,
  statutory_deadline    timestamptz GENERATED ALWAYS AS (created_at + interval '30 days') STORED,
  rejection_reason      text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zawaaj_privacy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user: own privacy requests select"
  ON public.zawaaj_privacy_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user: create own privacy request"
  ON public.zawaaj_privacy_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON public.zawaaj_privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_type_status ON public.zawaaj_privacy_requests(type, status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_scheduled ON public.zawaaj_privacy_requests(scheduled_execute_at) WHERE status = 'pending';

-- 2. Audit log (immutable — no RLS UPDATE/DELETE)
CREATE TABLE IF NOT EXISTS public.zawaaj_audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  event_type      text        NOT NULL,
  actor_user_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role      text,
  target_table    text,
  target_row_id   uuid,
  metadata        jsonb,
  ip_address      text,
  user_agent      text
);

ALTER TABLE public.zawaaj_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit: super_admin read only"
  ON public.zawaaj_audit_log FOR SELECT
  USING (public.zawaaj_is_admin());

CREATE INDEX IF NOT EXISTS idx_audit_log_occurred ON public.zawaaj_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.zawaaj_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.zawaaj_audit_log(event_type);

-- 3. Cookie consent log
CREATE TABLE IF NOT EXISTS public.zawaaj_cookie_consents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    text,
  necessary     boolean     NOT NULL DEFAULT true,
  analytics     boolean     NOT NULL DEFAULT false,
  consented_at  timestamptz NOT NULL DEFAULT now(),
  ip_address    text,
  user_agent    text
);

ALTER TABLE public.zawaaj_cookie_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user: own cookie consent"
  ON public.zawaaj_cookie_consents FOR SELECT
  USING (user_id = auth.uid());

-- 4. pg_cron: nightly erasure executor
-- (Schedule must be applied manually if pg_cron is available)
-- SELECT cron.schedule('zawaaj-erasure-executor', '0 3 * * *', $$ ... $$);
-- See application code for the full erasure sweep logic.

-- 5. pg_cron: nightly retention sweep
-- SELECT cron.schedule('zawaaj-retention-sweep', '0 2 * * *', $$ ... $$);
