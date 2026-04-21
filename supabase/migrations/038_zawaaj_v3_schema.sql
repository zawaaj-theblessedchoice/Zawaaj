-- ============================================================
-- Migration 038: Zawaaj V3 — Schema changes
-- Replaces onboarding_state with readiness_state,
-- adds candidate_preference to introduction requests,
-- adds import_review_status to profiles,
-- updates family account status default.
-- ============================================================

-- ── 1a. Add readiness_state column ────────────────────────────

ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS readiness_state text NOT NULL DEFAULT 'candidate_only';

ALTER TABLE public.zawaaj_family_accounts
  ADD CONSTRAINT zfa_readiness_state_check CHECK (
    readiness_state = ANY (ARRAY[
      'candidate_only',
      'representative_invited',
      'representative_linked',
      'intro_ready'
    ])
  );

-- ── 1a. Migrate existing rows from onboarding_state ───────────

UPDATE public.zawaaj_family_accounts
SET readiness_state = CASE
  WHEN onboarding_state = 'activated'         THEN 'intro_ready'
  WHEN onboarding_state = 'profile_completed' THEN 'representative_linked'
  WHEN onboarding_state = 'profile_started'   THEN 'representative_linked'
  WHEN onboarding_state = 'contact_added'     THEN 'representative_invited'
  WHEN onboarding_state = 'opened'            THEN 'candidate_only'
  ELSE                                             'candidate_only'
END;

-- ── 1a. Drop onboarding_state ─────────────────────────────────

ALTER TABLE public.zawaaj_family_accounts
  DROP CONSTRAINT IF EXISTS zfa_onboarding_state_check;

ALTER TABLE public.zawaaj_family_accounts
  DROP COLUMN IF EXISTS onboarding_state;

DROP INDEX IF EXISTS public.zfa_onboarding_state_idx;

CREATE INDEX IF NOT EXISTS zfa_readiness_state_idx
  ON public.zawaaj_family_accounts(readiness_state);

-- ── 1b. Update status default ─────────────────────────────────

ALTER TABLE public.zawaaj_family_accounts
  ALTER COLUMN status SET DEFAULT 'pending_email_verification';

-- ── 1d. Add candidate_preference to introduction requests ──────

ALTER TABLE public.zawaaj_introduction_requests
  ADD COLUMN IF NOT EXISTS candidate_preference text,
  ADD COLUMN IF NOT EXISTS candidate_preference_noted_at timestamptz;

ALTER TABLE public.zawaaj_introduction_requests
  ADD CONSTRAINT zir_candidate_preference_check CHECK (
    candidate_preference IS NULL OR
    candidate_preference = ANY (ARRAY[
      'interested',
      'not_interested',
      'needs_family_review'
    ])
  );

-- ── import_review_status on profiles ──────────────────────────

ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS import_review_status text DEFAULT 'clean';

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_import_review_check CHECK (
    import_review_status = ANY (ARRAY[
      'clean',
      'needs_review',
      'reviewed_ok',
      'merged'
    ])
  );

-- ── Phase 1 confirmation queries ──────────────────────────────
-- Run these after the migration to verify correctness:
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'zawaaj_family_accounts'
-- AND column_name IN ('readiness_state', 'onboarding_state', 'status');
-- onboarding_state must NOT appear
--
-- SELECT readiness_state, COUNT(*)
-- FROM public.zawaaj_family_accounts
-- GROUP BY readiness_state;
--
-- SELECT COUNT(*) AS nulls
-- FROM public.zawaaj_family_accounts
-- WHERE readiness_state IS NULL;
-- Must return 0
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'zawaaj_introduction_requests'
-- AND column_name = 'candidate_preference';
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'zawaaj_profiles'
-- AND column_name = 'import_review_status';
