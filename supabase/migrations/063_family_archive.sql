-- ============================================================================
-- 063_family_archive.sql
--
-- ⚠️⚠️⚠️  KHALIL MUST RUN THIS MANUALLY before the families archive/delete UI
--        will work. Additive + nullable only — safe, no data change, no
--        backfill. Run it in the Supabase SQL editor against project
--        nxytwfbzoxatyupqccba.
--
-- Adds a soft-delete (archive) capability to family accounts. Archive is the
-- everyday "remove from view, recoverable" action; permanent delete is guarded
-- and only allowed on already-archived accounts (see /api/admin/families/[id]).
--
-- We use a nullable `archived_at` timestamp (NOT a new status value) so the
-- existing zfa_status_check constraint and all status-based filters are left
-- untouched. archived_at IS NULL ⇒ live; archived_at IS NOT NULL ⇒ archived.
-- ============================================================================

ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fast exclusion of archived rows from the default admin lists / counts.
CREATE INDEX IF NOT EXISTS zfa_archived_at_idx
  ON public.zawaaj_family_accounts (archived_at);

COMMENT ON COLUMN public.zawaaj_family_accounts.archived_at IS
  'Soft-delete timestamp. NULL = live. Set = hidden from admin lists, browse, matching, and manager scopes; recoverable via restore.';
