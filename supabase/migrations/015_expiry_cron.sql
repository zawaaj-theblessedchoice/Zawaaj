-- Migration 015: Auto-expire pending introduction requests after 7 days
-- Uses pg_cron (available on Supabase Pro). The function is safe to call manually too.

-- ─── 1. Helper function: expire stale requests ───────────────────────────────

CREATE OR REPLACE FUNCTION public.zawaaj_expire_intro_requests()
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
AS $$
  UPDATE public.zawaaj_introduction_requests
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();
$$;

-- ─── 2. Schedule via pg_cron (runs every hour) ───────────────────────────────
-- NOTE: pg_cron must be enabled in Supabase Dashboard → Database → Extensions.
-- If pg_cron is not available, run zawaaj_expire_intro_requests() manually or via
-- a Supabase Edge Function cron trigger.

SELECT cron.schedule(
  'zawaaj_expire_intro_requests',   -- job name (idempotent)
  '0 * * * *',                       -- every hour at :00
  'SELECT public.zawaaj_expire_intro_requests()'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'zawaaj_expire_intro_requests'
);

-- ─── 3. Update existing rows: 30-day expiry → 7-day expiry for pending ───────
-- Only update requests that haven't expired yet and are still pending.
-- We set expires_at = created_at + 7 days (which may be in the past, expiring them).

UPDATE public.zawaaj_introduction_requests
  SET expires_at = created_at + INTERVAL '7 days'
  WHERE status = 'pending'
    AND expires_at > NOW()
    AND expires_at > created_at + INTERVAL '7 days';

-- Run expiry immediately to catch any now-stale requests
SELECT public.zawaaj_expire_intro_requests();

COMMENT ON FUNCTION public.zawaaj_expire_intro_requests() IS
  'Expires all pending introduction requests past their expires_at. Called by pg_cron hourly.';
