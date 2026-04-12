-- ============================================================
-- Migration 019: zawaaj_family_model_v2
-- Implements: family accounts, managers, updated match workflow,
-- 7-day interest window, new helper functions.
--
-- Conflict resolutions vs existing migrations:
--   - Many zawaaj_profiles columns already exist — IF NOT EXISTS no-ops
--   - zawaaj_response_templates already exists — ALTER, not CREATE
--   - zawaaj_notifications already exists — ALTER, not CREATE
--   - Document Section 5 targets 'zawaaj_interests' (legacy unused table)
--     but the live table is 'zawaaj_introduction_requests' — correct table used
--   - zawaaj_matches: data migrated before constraint swap
--   - handle_updated_at() created fresh (did not exist in any prior migration)
--   - zawaaj_is_admin() rewritten to use zawaaj_managers table
--   - zawaaj_get_role() rewritten to not depend on zawaaj_user_settings join
--   - Profile-based managers (role='manager' from migration 013) kept as-is;
--     new zawaaj_managers table is the canonical manager record going forward
-- ============================================================


-- ─── 0. handle_updated_at() ──────────────────────────────────
-- Required by triggers added at end of migration.
-- Did not exist in any prior migration.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 1. FAMILY ACCOUNTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zawaaj_family_accounts (
  id                          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary contact details — ALL MANDATORY at account creation
  contact_full_name           text    NOT NULL,
  contact_relationship        text    NOT NULL,
  -- mother | grandmother | aunt | female_guardian | father | male_guardian
  contact_number              text    NOT NULL,
  contact_email               text    NOT NULL,

  -- Female fallback — mandatory when contact_relationship IN ('father','male_guardian')
  female_contact_name         text,
  female_contact_number       text,
  female_contact_relationship text,
  -- grandmother | aunt | female_guardian | sister | other_female_relative
  father_explanation          text    NOT NULL DEFAULT '',
  -- Required (non-empty) when contact_relationship IN ('father','male_guardian')

  no_female_contact_flag      boolean NOT NULL DEFAULT false,

  -- DB-level enforcement: male primary contact must have female fallback OR explicit flag
  CONSTRAINT zfa_male_contact_requires_female_fallback CHECK (
    contact_relationship NOT IN ('father', 'male_guardian')
    OR no_female_contact_flag = true
    OR (female_contact_name IS NOT NULL AND female_contact_number IS NOT NULL)
  ),

  -- DB-level enforcement: if flag is set, explanation must be non-empty
  CONSTRAINT zfa_flag_requires_explanation CHECK (
    no_female_contact_flag = false
    OR (father_explanation IS NOT NULL AND father_explanation <> '')
  ),

  primary_user_id             uuid    REFERENCES auth.users(id) ON DELETE SET NULL,

  status                      text    NOT NULL DEFAULT 'pending_approval',
  -- pending_approval | active | suspended | pending_contact_details

  approved_by                 uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at                 timestamptz,
  suspended_by                uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_reason            text,

  assigned_manager_id         uuid,
  -- FK to zawaaj_managers added below, after that table is created

  plan                        text    NOT NULL DEFAULT 'voluntary',
  -- voluntary | plus | premium

  registration_path           text    NOT NULL DEFAULT 'parent',
  -- parent | child

  terms_agreed                boolean NOT NULL DEFAULT false,
  terms_agreed_at             timestamptz,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT zfa_relationship_check CHECK (
    contact_relationship = ANY (ARRAY[
      'mother','grandmother','aunt','female_guardian','father','male_guardian'
    ])
  ),
  CONSTRAINT zfa_status_check CHECK (
    status = ANY (ARRAY[
      'pending_approval','active','suspended','pending_contact_details'
    ])
  ),
  CONSTRAINT zfa_plan_check CHECK (
    plan = ANY (ARRAY['voluntary','plus','premium'])
  ),
  CONSTRAINT zfa_path_check CHECK (
    registration_path = ANY (ARRAY['parent','child'])
  )
);


-- ============================================================
-- 2. ALTER zawaaj_profiles
-- ============================================================

-- New columns for family model linkage
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS family_account_id    uuid
    REFERENCES public.zawaaj_family_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS child_user_id         uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_child      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_complete      boolean NOT NULL DEFAULT false;

-- Columns below already exist in earlier migrations (004 etc.) as varchar/text.
-- IF NOT EXISTS guards make all of these no-ops where they already exist.
-- open_to_relocation: kept as varchar (app uses text values 'yes_open' etc.)
-- open_to_partners_children: kept as varchar (app uses 'yes' | 'prefer_not' etc.)
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS first_name               text,
  ADD COLUMN IF NOT EXISTS last_name                text,
  ADD COLUMN IF NOT EXISTS nationality              text,
  ADD COLUMN IF NOT EXISTS living_situation         varchar,
  ADD COLUMN IF NOT EXISTS open_to_relocation       varchar,
  ADD COLUMN IF NOT EXISTS open_to_partners_children varchar,
  ADD COLUMN IF NOT EXISTS wears_hijab              boolean,
  ADD COLUMN IF NOT EXISTS keeps_beard              boolean,
  ADD COLUMN IF NOT EXISTS marital_status           varchar,
  ADD COLUMN IF NOT EXISTS has_children             boolean,
  ADD COLUMN IF NOT EXISTS pref_age_min             integer,
  ADD COLUMN IF NOT EXISTS pref_age_max             integer,
  ADD COLUMN IF NOT EXISTS pref_location            text,
  ADD COLUMN IF NOT EXISTS pref_ethnicity           varchar,
  ADD COLUMN IF NOT EXISTS pref_school_of_thought   text,
  ADD COLUMN IF NOT EXISTS pref_relocation          varchar;

-- languages_spoken: migration 004 created it as scalar text.
-- Upgrade to text[] if still text; no-op if already text[].
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'zawaaj_profiles'
      AND column_name  = 'languages_spoken'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE public.zawaaj_profiles
      ALTER COLUMN languages_spoken TYPE text[]
      USING CASE
        WHEN languages_spoken IS NULL THEN NULL
        ELSE ARRAY[languages_spoken]
      END;
  END IF;
END;
$$;


-- ============================================================
-- 3. MANAGERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zawaaj_managers (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text    NOT NULL,
  email               text,
  contact_number      text,
  scope_cities        text[],
  scope_genders       text[],
  scope_ethnicities   text[],
  scope_languages     text[],
  role                text    NOT NULL DEFAULT 'manager',
  -- manager | senior_manager
  is_active           boolean NOT NULL DEFAULT true,
  appointed_by        uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  appointed_at        timestamptz DEFAULT now(),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zmgr_role_check CHECK (
    role = ANY (ARRAY['manager','senior_manager'])
  )
);

-- Now add FK from family_accounts → managers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zfa_manager_fk'
  ) THEN
    ALTER TABLE public.zawaaj_family_accounts
      ADD CONSTRAINT zfa_manager_fk
        FOREIGN KEY (assigned_manager_id)
        REFERENCES public.zawaaj_managers(id) ON DELETE SET NULL;
  END IF;
END;
$$;


-- ============================================================
-- 4. ALTER zawaaj_matches
-- ============================================================

-- 4a. Migrate existing status values to new enum BEFORE dropping constraint
UPDATE public.zawaaj_matches
  SET status = 'pending_verification'
  WHERE status IN ('awaiting_admin', 'admin_reviewing');

UPDATE public.zawaaj_matches
  SET status = 'contacts_shared'
  WHERE status = 'introduced';

UPDATE public.zawaaj_matches
  SET status = 'closed'
  WHERE status IN ('nikah', 'no_longer_proceeding', 'dismissed');

-- 4b. Swap constraint
ALTER TABLE public.zawaaj_matches
  DROP CONSTRAINT IF EXISTS zawaaj_matches_status_check;

ALTER TABLE public.zawaaj_matches
  ADD CONSTRAINT zawaaj_matches_status_check CHECK (
    status = ANY (ARRAY[
      'pending_verification',
      'verified',
      'contacts_shared',
      'in_follow_up',
      'closed'
    ])
  );

-- 4c. Add new columns
ALTER TABLE public.zawaaj_matches
  ADD COLUMN IF NOT EXISTS assigned_manager_id      uuid
    REFERENCES public.zawaaj_managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_a_verified        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_a_verified_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_a_verified_at     timestamptz,
  ADD COLUMN IF NOT EXISTS contact_b_verified        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_b_verified_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_b_verified_at     timestamptz,
  ADD COLUMN IF NOT EXISTS contacts_shared_at        timestamptz,
  ADD COLUMN IF NOT EXISTS contacts_shared_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS followup_due_at           timestamptz,
  ADD COLUMN IF NOT EXISTS followup_done_at          timestamptz,
  ADD COLUMN IF NOT EXISTS followup_notes            text,
  ADD COLUMN IF NOT EXISTS outcome_detail            text,
  -- in_conversation | meeting_arranged | engaged | married | unsuccessful | withdrawn
  ADD COLUMN IF NOT EXISTS family_a_contact_name     text,
  ADD COLUMN IF NOT EXISTS family_b_contact_name     text,
  ADD COLUMN IF NOT EXISTS family_a_contact_number   text,
  ADD COLUMN IF NOT EXISTS family_b_contact_number   text;


-- ============================================================
-- 5. ALTER zawaaj_introduction_requests
-- ============================================================
-- NOTE: Document Section 5 targets 'zawaaj_interests' (the legacy table from
-- migration 001, which the application has never used). The live table used by
-- all application code since migration 004 is 'zawaaj_introduction_requests'.
-- This migration correctly targets that table.

-- 5a. Add new columns
ALTER TABLE public.zawaaj_introduction_requests
  ADD COLUMN IF NOT EXISTS response_template_key  text,
  ADD COLUMN IF NOT EXISTS responded_at           timestamptz,
  ADD COLUMN IF NOT EXISTS notified_recipient_at  timestamptz,
  ADD COLUMN IF NOT EXISTS response_deadline      timestamptz,
  ADD COLUMN IF NOT EXISTS is_mutual              boolean NOT NULL DEFAULT false;

-- 5b. Migrate admin-stage statuses → 'accepted'
-- (once both parties accepted, the admin workflow now lives in zawaaj_matches)
UPDATE public.zawaaj_introduction_requests
  SET status = 'accepted'
  WHERE status IN (
    'responded_positive', 'mutual_confirmed',
    'admin_pending', 'admin_assigned',
    'admin_in_progress', 'admin_completed'
  );

UPDATE public.zawaaj_introduction_requests
  SET status = 'declined'
  WHERE status = 'responded_negative';

-- 5c. Swap to simplified 5-value enum
ALTER TABLE public.zawaaj_introduction_requests
  DROP CONSTRAINT IF EXISTS zawaaj_introduction_requests_status_check;

ALTER TABLE public.zawaaj_introduction_requests
  ADD CONSTRAINT zawaaj_introduction_requests_status_check
    CHECK (status = ANY (ARRAY[
      'pending',
      'accepted',
      'declined',
      'expired',
      'withdrawn'
    ]));

-- 5d. Remove old response_tone constraint (column kept; constraint no longer valid)
ALTER TABLE public.zawaaj_introduction_requests
  DROP CONSTRAINT IF EXISTS zawaaj_introduction_requests_response_tone_check;


-- ============================================================
-- 6. ALTER zawaaj_response_templates
-- ============================================================
-- Table already exists (migrations 012 + 017) with columns:
--   id, tone, text, display_order, is_active, plan_required, created_at
-- Add new columns alongside old ones for backward compatibility.
-- Old columns (tone/text/display_order) kept until app code is updated.

ALTER TABLE public.zawaaj_response_templates
  ADD COLUMN IF NOT EXISTS key        text,
  ADD COLUMN IF NOT EXISTS direction  text,
  ADD COLUMN IF NOT EXISTS label      text,
  ADD COLUMN IF NOT EXISTS body       text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zrt_direction_check'
  ) THEN
    ALTER TABLE public.zawaaj_response_templates
      ADD CONSTRAINT zrt_direction_check
        CHECK (direction IS NULL OR direction = ANY (ARRAY['accept','decline']));
  END IF;
END;
$$;

-- Drop old unique constraints before re-seeding
ALTER TABLE public.zawaaj_response_templates
  DROP CONSTRAINT IF EXISTS zawaaj_response_templates_tone_order_key;
ALTER TABLE public.zawaaj_response_templates
  DROP CONSTRAINT IF EXISTS zawaaj_response_templates_tone_text_key;

-- Clear old seeds; insert canonical set with BOTH old and new fields populated
-- so existing app code (tone/text) and new app code (key/direction/label/body) work
-- during the transition period.
DELETE FROM public.zawaaj_response_templates;

INSERT INTO public.zawaaj_response_templates
  (key, direction, label, body, sort_order,
   tone, text, display_order, is_active)
VALUES
  ('accept_warm', 'accept', 'Accept with warmth',
   'JazakAllahu khairan for reaching out. We have reviewed the profile with interest and would be pleased to proceed, insha''Allah.',
   1,
   'positive',
   'JazakAllahu khairan for reaching out. We have reviewed the profile with interest and would be pleased to proceed, insha''Allah.',
   1, true),

  ('decline_respectful', 'decline', 'Decline respectfully',
   'JazakAllahu khairan for the interest. After careful consideration, we feel this may not be the right match at this time. We wish your family well in your search.',
   1,
   'decline',
   'JazakAllahu khairan for the interest. After careful consideration, we feel this may not be the right match at this time. We wish your family well in your search.',
   2, true),

  ('decline_timing', 'decline', 'Decline — not the right time',
   'We appreciate the interest. Unfortunately the timing is not right for us at the moment. JazakAllahu khairan.',
   2,
   'decline',
   'We appreciate the interest. Unfortunately the timing is not right for us at the moment. JazakAllahu khairan.',
   3, true),

  ('decline_preference', 'decline', 'Decline — preference mismatch',
   'Thank you sincerely for reaching out. After consideration we do not feel this is a suitable match for our family. We wish you well in your search.',
   3,
   'decline',
   'Thank you sincerely for reaching out. After consideration we do not feel this is a suitable match for our family. We wish you well in your search.',
   4, true);

-- Unique constraint on key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zrt_key_unique'
  ) THEN
    ALTER TABLE public.zawaaj_response_templates
      ADD CONSTRAINT zrt_key_unique UNIQUE (key);
  END IF;
END;
$$;


-- ============================================================
-- 7. ALTER zawaaj_notifications
-- ============================================================
-- Table already exists (migration 014) with columns:
--   id, profile_id (NOT NULL), type, title, body, action_url, read_at, created_at
-- Add new columns as nullable; keep all existing columns.

ALTER TABLE public.zawaaj_notifications
  ADD COLUMN IF NOT EXISTS family_account_id     uuid
    REFERENCES public.zawaaj_family_accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_type            text,
  ADD COLUMN IF NOT EXISTS is_read               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS related_interest_id   uuid
    REFERENCES public.zawaaj_introduction_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_match_id      uuid
    REFERENCES public.zawaaj_matches(id) ON DELETE SET NULL;


-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

ALTER TABLE public.zawaaj_family_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zawaaj_managers        ENABLE ROW LEVEL SECURITY;

-- ── family_accounts ──────────────────────────────────────────
DROP POLICY IF EXISTS "zfa: own select"          ON public.zawaaj_family_accounts;
DROP POLICY IF EXISTS "zfa: own update"          ON public.zawaaj_family_accounts;
DROP POLICY IF EXISTS "zfa: child linked select" ON public.zawaaj_family_accounts;
DROP POLICY IF EXISTS "zfa: admin all"           ON public.zawaaj_family_accounts;

CREATE POLICY "zfa: own select"
  ON public.zawaaj_family_accounts FOR SELECT
  USING (primary_user_id = auth.uid());

CREATE POLICY "zfa: own update"
  ON public.zawaaj_family_accounts FOR UPDATE
  USING (primary_user_id = auth.uid());

CREATE POLICY "zfa: child linked select"
  ON public.zawaaj_family_accounts FOR SELECT
  USING (id IN (
    SELECT family_account_id FROM public.zawaaj_profiles
    WHERE child_user_id = auth.uid()
  ));

CREATE POLICY "zfa: admin all"
  ON public.zawaaj_family_accounts FOR ALL
  USING (public.zawaaj_is_admin());

-- ── managers ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "zmgr: own select" ON public.zawaaj_managers;
DROP POLICY IF EXISTS "zmgr: admin all"  ON public.zawaaj_managers;

CREATE POLICY "zmgr: own select"
  ON public.zawaaj_managers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "zmgr: admin all"
  ON public.zawaaj_managers FOR ALL
  USING (public.zawaaj_is_super_admin());

-- ── response_templates: refresh admin policy ─────────────────
DROP POLICY IF EXISTS "zrt: admin all" ON public.zawaaj_response_templates;
CREATE POLICY "zrt: admin all"
  ON public.zawaaj_response_templates FOR ALL
  USING (public.zawaaj_is_admin());


-- ============================================================
-- 9. REPLACE HELPER FUNCTIONS
-- ============================================================

-- Ensure is_admin = true for all super_admin role profiles
-- (migration 013 set the role column; this syncs the is_admin boolean
--  so the new zawaaj_is_admin() — which uses is_admin directly — still works)
UPDATE public.zawaaj_profiles
  SET is_admin = true
  WHERE role = 'super_admin' AND is_admin = false;

-- zawaaj_is_admin(): true for is_admin profiles OR active zawaaj_managers rows
CREATE OR REPLACE FUNCTION public.zawaaj_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.zawaaj_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.zawaaj_managers
      WHERE user_id = auth.uid() AND is_active = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.zawaaj_is_admin() TO anon, authenticated;

-- zawaaj_is_super_admin(): true only for is_admin=true profiles
CREATE OR REPLACE FUNCTION public.zawaaj_is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zawaaj_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.zawaaj_is_super_admin() TO anon, authenticated;

-- zawaaj_get_role(): simplified — no longer depends on zawaaj_user_settings join.
-- Returns 'super_admin' | 'manager' | 'member'.
-- Used by browse/page.tsx to redirect admin users to the correct dashboard.
CREATE OR REPLACE FUNCTION public.zawaaj_get_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.zawaaj_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    ) THEN 'super_admin'
    WHEN EXISTS (
      SELECT 1 FROM public.zawaaj_managers
      WHERE user_id = auth.uid() AND is_active = true
    ) THEN 'manager'
    ELSE 'member'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.zawaaj_get_role() TO anon, authenticated;


-- ============================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS zfa_updated_at  ON public.zawaaj_family_accounts;
DROP TRIGGER IF EXISTS zmgr_updated_at ON public.zawaaj_managers;

CREATE TRIGGER zfa_updated_at
  BEFORE UPDATE ON public.zawaaj_family_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER zmgr_updated_at
  BEFORE UPDATE ON public.zawaaj_managers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
