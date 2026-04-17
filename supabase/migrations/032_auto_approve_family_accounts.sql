-- ============================================================
-- Migration 032: Remove family account approval step
-- ============================================================
-- Family accounts do not require manual admin approval.
-- Only profiles (zawaaj_profiles) need admin review before members
-- can browse the directory.
--
-- This migration auto-approves any accounts currently stuck in
-- 'pending_approval' (they completed email verification but were
-- waiting for an admin to click Approve — a step that no longer exists).

UPDATE public.zawaaj_family_accounts
SET
  status      = 'active',
  approved_at = now()
WHERE status = 'pending_approval';
