-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 039 — Plan limits + grandfathered profiles
-- Confirmed public model:
--   Community Access (voluntary): 1 candidate profile
--   Premium:                      4 candidate profiles
--   Plus:       hidden from public, DB compatibility only
-- ─────────────────────────────────────────────────────────────────────────────

-- Update plan profile limits to match confirmed public model
UPDATE public.zawaaj_plans
SET max_profiles = 1
WHERE slug = 'voluntary';

UPDATE public.zawaaj_plans
SET max_profiles = 4
WHERE slug = 'premium';

-- Add grandfathered_profiles flag to zawaaj_family_accounts
-- Accounts flagged true are exempt from the new profile limits.
-- This protects existing imported families that exceed the new limit.
ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS grandfathered_profiles boolean NOT NULL DEFAULT false;

-- Mark any existing account that already exceeds the new limit as grandfathered
UPDATE public.zawaaj_family_accounts fa
SET grandfathered_profiles = true
WHERE (
  SELECT COUNT(*) FROM public.zawaaj_profiles p
  WHERE p.family_account_id = fa.id
    AND p.status != 'withdrawn'
) > (
  SELECT max_profiles FROM public.zawaaj_plans pl
  WHERE pl.slug = fa.plan
);

-- Confirm
SELECT slug, max_profiles, monthly_interests FROM public.zawaaj_plans ORDER BY price_monthly_gbp;
SELECT id, plan, grandfathered_profiles FROM public.zawaaj_family_accounts;
