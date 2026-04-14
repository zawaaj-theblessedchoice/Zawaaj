-- ============================================================
-- Migration 025: Phase 5 — Monetisation
-- Adds: zawaaj_plans table (DB-driven plan config)
-- Updates: zawaaj_subscriptions (add family_account_id FK)
-- ============================================================

-- ── 5a. Plans config table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zawaaj_plans (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key                 text        NOT NULL UNIQUE,
  label               text        NOT NULL,
  price_monthly_gbp   integer     NOT NULL DEFAULT 0,
  price_annual_gbp    integer     NOT NULL DEFAULT 0,
  monthly_interests   integer,                    -- NULL = unlimited
  max_profiles        integer     NOT NULL DEFAULT 2,
  features            jsonb       NOT NULL DEFAULT '[]',
  is_active           boolean     NOT NULL DEFAULT true,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zawaaj_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zpl: public read" ON public.zawaaj_plans;
DROP POLICY IF EXISTS "zpl: admin all"   ON public.zawaaj_plans;

CREATE POLICY "zpl: public read"
  ON public.zawaaj_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "zpl: admin all"
  ON public.zawaaj_plans FOR ALL
  USING (public.zawaaj_is_admin());

-- updated_at trigger
DROP TRIGGER IF EXISTS zpl_updated_at ON public.zawaaj_plans;
CREATE TRIGGER zpl_updated_at
  BEFORE UPDATE ON public.zawaaj_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Seed plans ───────────────────────────────────────────────
-- Use INSERT … ON CONFLICT so re-runs are idempotent.

INSERT INTO public.zawaaj_plans
  (key, label, price_monthly_gbp, price_annual_gbp, monthly_interests, max_profiles, features, sort_order)
VALUES
  ('voluntary', 'Community Access', 0, 0, 5, 2,
   '["admin_mediated_intros","profile_review","basic_search"]'::jsonb, 1),

  ('plus', 'Zawaaj Plus', 900, 7200, 15, 4,
   '["admin_mediated_intros","profile_review","basic_search","priority_admin","profile_boost_monthly","new_profile_alerts","full_bio_on_received_interests"]'::jsonb, 2),

  ('premium', 'Zawaaj Premium', 1900, 18000, NULL, 4,
   '["admin_mediated_intros","profile_review","basic_search","priority_admin","profile_boost_weekly","new_profile_alerts","full_bio_on_received_interests","dedicated_manager","manager_followup","spotlight_monthly","who_viewed"]'::jsonb, 3)

ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  price_monthly_gbp   = EXCLUDED.price_monthly_gbp,
  price_annual_gbp    = EXCLUDED.price_annual_gbp,
  monthly_interests   = EXCLUDED.monthly_interests,
  max_profiles        = EXCLUDED.max_profiles,
  features            = EXCLUDED.features,
  sort_order          = EXCLUDED.sort_order,
  updated_at          = now();

-- ── 5b. Extend zawaaj_subscriptions ─────────────────────────
-- The existing table (migration 006) uses user_id as the key.
-- Add family_account_id as a nullable FK for forward compatibility.
-- Existing rows keep working via user_id; new rows can use either.

ALTER TABLE public.zawaaj_subscriptions
  ADD COLUMN IF NOT EXISTS family_account_id uuid
    REFERENCES public.zawaaj_family_accounts(id) ON DELETE SET NULL;

-- Also add billing_cycle and cancelled_at if not present
-- (migration 006 may have different column names)
ALTER TABLE public.zawaaj_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zsub_cycle_check'
  ) THEN
    ALTER TABLE public.zawaaj_subscriptions
      ADD CONSTRAINT zsub_cycle_check
        CHECK (billing_cycle IS NULL OR billing_cycle = ANY (ARRAY['monthly','annual']));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS zsub_family_account_idx
  ON public.zawaaj_subscriptions(family_account_id)
  WHERE family_account_id IS NOT NULL;

-- RLS: add family-account-based select policy alongside existing user_id policy
DROP POLICY IF EXISTS "zsub: family select" ON public.zawaaj_subscriptions;
CREATE POLICY "zsub: family select"
  ON public.zawaaj_subscriptions FOR SELECT
  USING (
    family_account_id IN (
      SELECT id FROM public.zawaaj_family_accounts WHERE primary_user_id = auth.uid()
    )
  );
