-- ============================================================
-- Migration 031: Fix zawaaj_invite_tokens token column default
-- ============================================================
-- The original DEFAULT used encode(..., 'base64url') which is not a
-- valid PostgreSQL encoding. PostgreSQL only supports 'base64', 'hex',
-- and 'escape'. This caused every token INSERT to fail with:
--   "unrecognized encoding: 'base64url'"
--
-- Fix: switch to 'hex' encoding which produces a 48-character
-- URL-safe alphanumeric string (24 random bytes → 48 hex chars).

ALTER TABLE public.zawaaj_invite_tokens
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(24), 'hex');
