-- ============================================================
-- Migration 024: Phase 2 — Foundation for growth
-- Adds: imported_user flag, import_batch_ref, onboarding_state
-- ============================================================

-- ── 2a. Import tracking on zawaaj_profiles ───────────────────
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS imported_user    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_batch_ref text;

-- Back-fill: any profile with a legacy_ref or imported_email
-- was created via import — mark it accordingly.
UPDATE public.zawaaj_profiles
  SET imported_user = true
  WHERE (legacy_ref IS NOT NULL OR imported_email IS NOT NULL)
    AND imported_user = false;

CREATE INDEX IF NOT EXISTS zp_imported_user_idx
  ON public.zawaaj_profiles(imported_user)
  WHERE imported_user = true;

CREATE INDEX IF NOT EXISTS zp_import_batch_ref_idx
  ON public.zawaaj_profiles(import_batch_ref)
  WHERE import_batch_ref IS NOT NULL;

-- ── 2b. Onboarding state on zawaaj_family_accounts ──────────
ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS onboarding_state text NOT NULL DEFAULT 'invited';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zfa_onboarding_state_check'
  ) THEN
    ALTER TABLE public.zawaaj_family_accounts
      ADD CONSTRAINT zfa_onboarding_state_check CHECK (
        onboarding_state = ANY (ARRAY[
          'invited',
          'opened',
          'contact_added',
          'profile_started',
          'profile_completed',
          'activated'
        ])
      );
  END IF;
END;
$$;

-- Back-fill: accounts that are already active are fully onboarded
UPDATE public.zawaaj_family_accounts
  SET onboarding_state = 'activated'
  WHERE status = 'active'
    AND onboarding_state = 'invited';

-- Accounts with contact details but pending approval → contact_added
UPDATE public.zawaaj_family_accounts
  SET onboarding_state = 'contact_added'
  WHERE status IN ('pending_approval', 'pending_contact_details')
    AND onboarding_state = 'invited'
    AND trim(contact_full_name) <> ''
    AND trim(contact_email) <> '';

CREATE INDEX IF NOT EXISTS zfa_onboarding_state_idx
  ON public.zawaaj_family_accounts(onboarding_state);
