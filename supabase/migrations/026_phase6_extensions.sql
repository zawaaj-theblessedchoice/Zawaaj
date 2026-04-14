-- ============================================================
-- Migration 026: Phase 6 — Extensions
-- Adds: event columns, event_registrations, legacy column audit
-- ============================================================

-- ── 6a. Extend zawaaj_events ─────────────────────────────────

ALTER TABLE public.zawaaj_events
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS event_type  text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS join_url    text,
  ADD COLUMN IF NOT EXISTS capacity   integer,
  ADD COLUMN IF NOT EXISTS is_online  boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ze_event_type_check'
  ) THEN
    ALTER TABLE public.zawaaj_events
      ADD CONSTRAINT ze_event_type_check CHECK (
        event_type = ANY (ARRAY['physical','webinar','hybrid'])
      );
  END IF;
END;
$$;

-- ── 6b. Event registrations ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zawaaj_event_registrations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid        NOT NULL REFERENCES public.zawaaj_events(id) ON DELETE CASCADE,
  family_account_id uuid        NOT NULL REFERENCES public.zawaaj_family_accounts(id) ON DELETE CASCADE,
  registered_at     timestamptz NOT NULL DEFAULT now(),
  attended          boolean,
  UNIQUE(event_id, family_account_id)
);

CREATE INDEX IF NOT EXISTS zer_event_idx   ON public.zawaaj_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS zer_account_idx ON public.zawaaj_event_registrations(family_account_id);

ALTER TABLE public.zawaaj_event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zer: own select" ON public.zawaaj_event_registrations;
DROP POLICY IF EXISTS "zer: own insert" ON public.zawaaj_event_registrations;
DROP POLICY IF EXISTS "zer: admin all"  ON public.zawaaj_event_registrations;

CREATE POLICY "zer: own select"
  ON public.zawaaj_event_registrations FOR SELECT
  USING (
    family_account_id IN (
      SELECT id FROM public.zawaaj_family_accounts WHERE primary_user_id = auth.uid()
    )
  );

CREATE POLICY "zer: own insert"
  ON public.zawaaj_event_registrations FOR INSERT
  WITH CHECK (
    family_account_id IN (
      SELECT id FROM public.zawaaj_family_accounts WHERE primary_user_id = auth.uid()
    )
  );

CREATE POLICY "zer: admin all"
  ON public.zawaaj_event_registrations FOR ALL
  USING (public.zawaaj_is_admin());

-- ── 6c. Legacy column audit ───────────────────────────────────
-- Check whether contact_number and guardian_name on zawaaj_profiles
-- still hold data. If the query below returns rows, do NOT drop the columns.
-- If it returns zero rows, the columns can be dropped in a future migration.
--
-- Run this SELECT before ever dropping:
--
--   SELECT id, contact_number, guardian_name
--   FROM public.zawaaj_profiles
--   WHERE contact_number IS NOT NULL OR guardian_name IS NOT NULL;
--
-- These columns are safe to leave in place — they are excluded from all
-- member-facing RLS-gated queries and are only readable via the admin client.
-- No DROP is executed here; will be done in migration 027 once confirmed empty.
