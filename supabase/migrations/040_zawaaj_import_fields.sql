-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 040 — Import tracking fields
-- Adds fields needed by the extended family-account import flow.
-- ─────────────────────────────────────────────────────────────────────────────

-- Import tracking on profiles
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS needs_claim             boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_completeness_score integer      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS missing_fields_json     jsonb        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS imported_at             timestamptz  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS imported_by             uuid         REFERENCES auth.users(id);

-- imported_user flag on family accounts
ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS imported_user boolean NOT NULL DEFAULT false;

-- Add claim_invite to the invite token purposes
ALTER TABLE public.zawaaj_invite_tokens
  DROP CONSTRAINT IF EXISTS zit_purpose_check;

ALTER TABLE public.zawaaj_invite_tokens
  ADD CONSTRAINT zit_purpose_check CHECK (
    purpose = ANY (ARRAY[
      'email_verification',
      'guardian_invite',
      'child_invite',
      'claim_invite'
    ])
  );

-- Confirm
SELECT column_name FROM information_schema.columns
WHERE table_name = 'zawaaj_profiles'
  AND column_name IN ('needs_claim', 'data_completeness_score', 'missing_fields_json', 'imported_at', 'imported_by');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'zawaaj_family_accounts'
  AND column_name = 'imported_user';
