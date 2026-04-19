-- Migration 037: Add 'pending_email_verification' to zawaaj_family_accounts status constraint
-- The registration route (api/register/family/route.ts) creates family accounts with
-- status = 'pending_email_verification' before the user verifies their email.
-- This value was missing from the CHECK constraint, causing all new parent registrations
-- to fail with a 23514 violation and never land in the DB.

ALTER TABLE public.zawaaj_family_accounts
  DROP CONSTRAINT IF EXISTS zfa_status_check;

ALTER TABLE public.zawaaj_family_accounts
  ADD CONSTRAINT zfa_status_check CHECK (
    status = ANY (ARRAY[
      'pending_email_verification',
      'pending_approval',
      'pending_contact_details',
      'active',
      'suspended'
    ])
  );
