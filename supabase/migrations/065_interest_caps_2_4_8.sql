-- ============================================================================
-- 065_interest_caps_2_4_8.sql
--
-- ⚠️⚠️⚠️  KHALIL MUST RUN THIS MANUALLY. Data-only, safe & idempotent.
--        Run in the Supabase SQL editor against project nxytwfbzoxatyupqccba.
--
-- Founder decision: monthly interest caps are FINITE for every tier and there is
-- NO "unlimited" anywhere. Premium was NULL (= unlimited) in zawaaj_plans; set it
-- to a hard 8. Confirm Community = 2 and Plus = 4 while we're here.
--
--   Community (voluntary): 2 / month
--   Plus:                  4 / month
--   Premium:               8 / month   (was NULL = unlimited)
--
-- The app enforces the cap from zawaaj_plans.monthly_interests via fetchPlanLimits;
-- code fallbacks already default a legacy NULL to 8, but this removes the NULL at
-- the source so nothing can read "unlimited".
-- ============================================================================

UPDATE public.zawaaj_plans SET monthly_interests = 2 WHERE key = 'voluntary';
UPDATE public.zawaaj_plans SET monthly_interests = 4 WHERE key = 'plus';
UPDATE public.zawaaj_plans SET monthly_interests = 8 WHERE key = 'premium';

-- Verify:
-- SELECT key, monthly_interests FROM public.zawaaj_plans ORDER BY sort_order;
-- (expect voluntary=2, plus=4, premium=8 — no NULLs)
