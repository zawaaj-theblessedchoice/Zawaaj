-- Migration 003: Schema updates to align with spec
-- Applies safely with IF NOT EXISTS guards and DROP/ADD for constraints

-- ============================================================
-- zawaaj_profiles: add missing columns
-- ============================================================

-- attributes already exists in initial schema but guard anyway
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS attributes text[];

-- Convert spouse_preferences from text to text[]
-- Only run if column type is still text (idempotent via DO block)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'zawaaj_profiles'
      AND column_name  = 'spouse_preferences'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE public.zawaaj_profiles
      ALTER COLUMN spouse_preferences TYPE text[]
      USING CASE
        WHEN spouse_preferences IS NULL THEN NULL
        ELSE ARRAY[spouse_preferences]
      END;
  END IF;
END;
$$;

-- is_admin boolean
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- legacy_ref (exists in initial schema, guard for safety)
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS legacy_ref text;

-- Extend status check to include all spec values
-- Drop old constraint and recreate with full value list
ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zawaaj_profiles_status_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zawaaj_profiles_status_check
    CHECK (status IN (
      'pending', 'approved', 'paused', 'rejected',
      'withdrawn', 'suspended', 'introduced', 'unlinked'
    ));

-- ============================================================
-- zawaaj_interests: fix status check constraint
-- ============================================================

ALTER TABLE public.zawaaj_interests
  DROP CONSTRAINT IF EXISTS zawaaj_interests_status_check;

ALTER TABLE public.zawaaj_interests
  ADD CONSTRAINT zawaaj_interests_status_check
    CHECK (status IN ('active', 'expired', 'matched', 'withdrawn'));

-- Partial unique index — only one active interest per pair at a time
DROP INDEX IF EXISTS public.unique_active_interest;
CREATE UNIQUE INDEX unique_active_interest
  ON public.zawaaj_interests (sender_profile_id, recipient_profile_id)
  WHERE status = 'active';

-- ============================================================
-- zawaaj_matches: fix status check + add missing columns
-- ============================================================

ALTER TABLE public.zawaaj_matches
  DROP CONSTRAINT IF EXISTS zawaaj_matches_status_check;

ALTER TABLE public.zawaaj_matches
  ADD CONSTRAINT zawaaj_matches_status_check
    CHECK (status IN (
      'awaiting_admin', 'admin_reviewing', 'introduced',
      'nikah', 'no_longer_proceeding', 'dismissed'
    ));

ALTER TABLE public.zawaaj_matches
  ADD COLUMN IF NOT EXISTS admin_notified_date timestamptz;

ALTER TABLE public.zawaaj_matches
  ADD COLUMN IF NOT EXISTS outcome_date timestamptz;

-- ============================================================
-- zawaaj_events: fix status check constraint
-- ============================================================

ALTER TABLE public.zawaaj_events
  DROP CONSTRAINT IF EXISTS zawaaj_events_status_check;

ALTER TABLE public.zawaaj_events
  ADD CONSTRAINT zawaaj_events_status_check
    CHECK (status IN ('upcoming', 'ended', 'archived'));

-- ============================================================
-- zawaaj_user_settings: new table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zawaaj_user_settings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id uuid        REFERENCES public.zawaaj_profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zawaaj_user_settings ENABLE ROW LEVEL SECURITY;

-- Members can read and update their own settings row
DROP POLICY IF EXISTS "zus: owner read"   ON public.zawaaj_user_settings;
DROP POLICY IF EXISTS "zus: owner update" ON public.zawaaj_user_settings;
DROP POLICY IF EXISTS "zus: owner insert" ON public.zawaaj_user_settings;
DROP POLICY IF EXISTS "zus: admin read"   ON public.zawaaj_user_settings;

CREATE POLICY "zus: owner read"
  ON public.zawaaj_user_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "zus: owner insert"
  ON public.zawaaj_user_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "zus: owner update"
  ON public.zawaaj_user_settings FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can read all settings
CREATE POLICY "zus: admin read"
  ON public.zawaaj_user_settings FOR SELECT
  USING (public.zawaaj_is_admin());
