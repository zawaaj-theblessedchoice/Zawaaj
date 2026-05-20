-- Migration 047 — GoCardless subscription support
-- Note: brief referenced 044 but migrations 043–046 are already taken; using 047.
-- Owner runs this manually in Zawaaj Supabase SQL editor after Phase A code is pushed.
--
-- Pre-flight audit — run this first and confirm each column does NOT already exist:
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'zawaaj_subscriptions'
--   ORDER BY ordinal_position;
--
-- All ADD COLUMN statements use IF NOT EXISTS — safe to re-run.

ALTER TABLE public.zawaaj_subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider            text,
  ADD COLUMN IF NOT EXISTS gocardless_customer_id      text,
  ADD COLUMN IF NOT EXISTS gocardless_mandate_id       text,
  ADD COLUMN IF NOT EXISTS gocardless_subscription_id  text,
  ADD COLUMN IF NOT EXISTS renewal_at                  timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at                timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_until          timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failure_count       integer DEFAULT 0;

-- Constraint: restrict payment_provider to known values
ALTER TABLE public.zawaaj_subscriptions
  DROP CONSTRAINT IF EXISTS zs_payment_provider_check;

ALTER TABLE public.zawaaj_subscriptions
  ADD CONSTRAINT zs_payment_provider_check CHECK (
    payment_provider IS NULL OR
    payment_provider = ANY(ARRAY['stripe', 'gocardless', 'bank_transfer', 'manual'])
  );

-- Index for webhook lookups by GoCardless IDs
CREATE INDEX IF NOT EXISTS idx_zawaaj_subs_gc_subscription_id
  ON public.zawaaj_subscriptions (gocardless_subscription_id)
  WHERE gocardless_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zawaaj_subs_gc_mandate_id
  ON public.zawaaj_subscriptions (gocardless_mandate_id)
  WHERE gocardless_mandate_id IS NOT NULL;

-- Confirm columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'zawaaj_subscriptions'
ORDER BY ordinal_position;
