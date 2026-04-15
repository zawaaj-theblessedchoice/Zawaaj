-- ============================================================
-- Migration 029: Fix zawaaj_invite_tokens purpose constraint
-- ============================================================
-- The original constraint only allowed 'link_child' and 'link_parent'.
-- The application now uses 'child_invite', 'guardian_invite', and
-- 'email_verification'. Drop the old constraint and replace it with
-- one that covers all current and legacy values.

ALTER TABLE public.zawaaj_invite_tokens
  DROP CONSTRAINT IF EXISTS zit_purpose_check;

ALTER TABLE public.zawaaj_invite_tokens
  ADD CONSTRAINT zit_purpose_check CHECK (
    purpose = ANY (ARRAY[
      'link_child',           -- legacy
      'link_parent',          -- legacy
      'child_invite',         -- admin invites a child to register under existing family account
      'guardian_invite',      -- admin invites a guardian to register under existing family account
      'email_verification'    -- email verification flow for new family registrations
    ])
  );
