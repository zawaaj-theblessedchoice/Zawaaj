-- Migration 045: Add admin_notes to zawaaj_family_accounts
-- The operations console selects this column in the family account join
-- but it was never added to the table.

ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS admin_notes text;
