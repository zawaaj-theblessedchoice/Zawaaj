-- ============================================================
-- Migration 023: zawaaj_contact_fields_hardening
-- Closes the empty-string gap: NOT NULL columns still accepted
-- empty strings, so CHECK constraints are added.
-- Also fixes male-contact female-fallback to check non-empty.
-- ============================================================

-- ── Layer 1: Empty-string constraints ────────────────────────

ALTER TABLE public.zawaaj_family_accounts
  ADD CONSTRAINT zfa_contact_full_name_nonempty CHECK (
    trim(contact_full_name) <> ''
  ),
  ADD CONSTRAINT zfa_contact_number_nonempty CHECK (
    trim(contact_number) <> ''
  ),
  ADD CONSTRAINT zfa_contact_email_nonempty CHECK (
    trim(contact_email) <> ''
  ),
  ADD CONSTRAINT zfa_contact_relationship_nonempty CHECK (
    trim(contact_relationship) <> ''
  );

-- ── Strengthen female-fallback constraint ────────────────────
-- (replaces migration 019 version which only checked IS NOT NULL)

ALTER TABLE public.zawaaj_family_accounts
  DROP CONSTRAINT IF EXISTS zfa_male_contact_requires_female_fallback;

ALTER TABLE public.zawaaj_family_accounts
  ADD CONSTRAINT zfa_male_contact_requires_female_fallback CHECK (
    contact_relationship NOT IN ('father', 'male_guardian')
    OR no_female_contact_flag = true
    OR (
      female_contact_name    IS NOT NULL AND trim(female_contact_name)   <> ''
      AND female_contact_number IS NOT NULL AND trim(female_contact_number) <> ''
    )
  );

-- ── Layer 5: Flag existing rows with empty required fields ───
-- Move them to pending_contact_details so they surface in admin queue.
-- Does NOT delete anything.

UPDATE public.zawaaj_family_accounts
  SET status = 'pending_contact_details'
  WHERE status <> 'suspended'
    AND (
      trim(contact_full_name)    = ''
      OR trim(contact_number)    = ''
      OR trim(contact_email)     = ''
      OR trim(contact_relationship) = ''
    );

-- ── Audit query ───────────────────────────────────────────────
-- Run this after the migration to confirm zero violations remain:
--
-- SELECT id, contact_full_name, contact_number, contact_email, contact_relationship
-- FROM public.zawaaj_family_accounts
-- WHERE trim(contact_full_name) = ''
--    OR trim(contact_number) = ''
--    OR trim(contact_email) = ''
--    OR trim(contact_relationship) = '';
