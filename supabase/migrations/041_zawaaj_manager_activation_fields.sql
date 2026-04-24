-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 041 — Manager activation workflow fields
-- Adds columns needed for the manager activation workflow (Sprint 2).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS last_contacted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS snoozed_until       timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_manager_id uuid REFERENCES auth.users(id);

-- Index for assigned manager lookups
CREATE INDEX IF NOT EXISTS zfa_assigned_manager_idx
  ON public.zawaaj_family_accounts (assigned_manager_id)
  WHERE assigned_manager_id IS NOT NULL;

-- Index for snoozed accounts (operations console uses snoozed_until to filter active queue)
CREATE INDEX IF NOT EXISTS zfa_snoozed_until_idx
  ON public.zawaaj_family_accounts (snoozed_until)
  WHERE snoozed_until IS NOT NULL;

-- Confirm
SELECT column_name FROM information_schema.columns
WHERE table_name = 'zawaaj_family_accounts'
  AND column_name IN ('last_contacted_at', 'snoozed_until', 'assigned_manager_id');
