-- ============================================================
-- Migration 020 — Interest expiry function
-- Family Model v2 — Section 5
--
-- Creates a function that expires pending interests whose
-- response_deadline has passed.
--
-- This function should be called by a daily cron job, e.g.:
--   SELECT zawaaj_expire_pending_interests();
--
-- If using Supabase pg_cron:
--   SELECT cron.schedule(
--     'expire-interests',
--     '0 2 * * *',   -- daily at 02:00 UTC
--     $$SELECT zawaaj_expire_pending_interests()$$
--   );
-- ============================================================

CREATE OR REPLACE FUNCTION public.zawaaj_expire_pending_interests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE public.zawaaj_introduction_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND (
      -- Use response_deadline if available (v2 schema), otherwise fall back to expires_at
      COALESCE(response_deadline, expires_at) < now()
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- Grant execute to authenticated users (admin calls this via RPC or cron)
-- The SECURITY DEFINER ensures it runs as the function owner (postgres)
REVOKE ALL ON FUNCTION public.zawaaj_expire_pending_interests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zawaaj_expire_pending_interests() TO service_role;
