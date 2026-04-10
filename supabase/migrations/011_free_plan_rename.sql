-- Migration 011: Rename 'voluntary' → 'free' plan across all subscription tables
-- Must UPDATE existing rows BEFORE altering CHECK constraints.
-- Safe to apply multiple times (idempotent guards throughout).

-- ─── Step 1: Drop the old CHECK constraint on zawaaj_subscriptions.plan ──────
ALTER TABLE public.zawaaj_subscriptions
  DROP CONSTRAINT IF EXISTS zawaaj_subscriptions_plan_check;

-- ─── Step 2: Migrate existing 'voluntary' rows to 'free' ─────────────────────
UPDATE public.zawaaj_subscriptions
  SET plan = 'free'
  WHERE plan = 'voluntary';

-- ─── Step 3: Add new CHECK constraint with 'free' ────────────────────────────
ALTER TABLE public.zawaaj_subscriptions
  ADD CONSTRAINT zawaaj_subscriptions_plan_check
    CHECK (plan IN ('free', 'plus', 'premium'));

-- ─── Step 4: Update default value on the column ──────────────────────────────
ALTER TABLE public.zawaaj_subscriptions
  ALTER COLUMN plan SET DEFAULT 'free';

-- ─── Step 5: Update plan limits per brief ────────────────────────────────────
-- Store plan limits in a reference table so admin can see them clearly.
-- This is informational — enforcement is in the API layer.
COMMENT ON COLUMN public.zawaaj_subscriptions.plan IS
  'free: 2 intros/month, 1 active | plus: 5 intros/month, 2 active | premium: 10 intros/month, unlimited active';
