-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 042 — Nudge tracking columns for imported family accounts
-- Tracks when Day-7 and Day-14 reminder emails were sent, so the
-- nudge-pending-claims Edge Function never double-sends.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS nudge_7_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_14_sent_at timestamptz;

-- Index to make the nudge query fast (only imported accounts with a pending claim)
CREATE INDEX IF NOT EXISTS zfa_imported_nudge_idx
  ON public.zawaaj_family_accounts (imported_user, nudge_7_sent_at, nudge_14_sent_at)
  WHERE imported_user = true;

-- ─── pg_cron schedule — runs the nudge function every day at 08:00 UTC ───────
-- Requires pg_cron extension to be enabled in Supabase dashboard.
-- Replace <your-project-ref> with the actual Supabase project ref.
--
-- SELECT cron.schedule(
--   'zawaaj-nudge-pending-claims',
--   '0 8 * * *',
--   $$
--     SELECT net.http_post(
--       url := 'https://<your-project-ref>.supabase.co/functions/v1/nudge-pending-claims',
--       headers := '{"Authorization": "Bearer <service-role-key>", "Content-Type": "application/json"}'::jsonb,
--       body := '{}'::jsonb
--     )
--   $$
-- );
--
-- To verify: SELECT * FROM cron.job;

-- Confirm
SELECT column_name FROM information_schema.columns
WHERE table_name = 'zawaaj_family_accounts'
  AND column_name IN ('nudge_7_sent_at', 'nudge_14_sent_at');
