-- Migration 067 — Provisional Premium (instant access on DD setup)
--
-- ⚠️  KHALIL MUST RUN THIS in the Zawaaj Supabase SQL editor.
--     Nothing depends on it that would break existing rows; new code defaults
--     is_provisional to false via the column default, so it is safe to run
--     before or after the deploy. Run it so provisional grants + the grace-period
--     downgrade job work.
--
-- Model: on successful Direct Debit setup we now grant Premium IMMEDIATELY with
-- status = 'active' AND is_provisional = true (+ granted_at). The first
-- payment_confirmed webhook clears is_provisional (→ confirmed). A daily cron
-- downgrades any provisional row still unconfirmed past a 5-working-day grace
-- window, as a safety net for missed webhooks.
--
-- Pre-flight (confirm the columns do NOT already exist):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'zawaaj_subscriptions'
--     AND column_name IN ('is_provisional','granted_at');

ALTER TABLE public.zawaaj_subscriptions
  ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS granted_at     timestamptz;

-- Partial index for the grace-period sweep (find unconfirmed provisional rows).
CREATE INDEX IF NOT EXISTS idx_zawaaj_subs_provisional
  ON public.zawaaj_subscriptions (granted_at)
  WHERE is_provisional = true;

-- Confirm
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'zawaaj_subscriptions'
  AND column_name IN ('is_provisional','granted_at')
ORDER BY column_name;
