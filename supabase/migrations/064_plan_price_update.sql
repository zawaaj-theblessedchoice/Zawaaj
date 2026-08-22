-- ============================================================================
-- 064_plan_price_update.sql
--
-- ⚠️⚠️⚠️  KHALIL MUST RUN THIS MANUALLY. Data-only update, safe & idempotent.
--        Run it in the Supabase SQL editor against project nxytwfbzoxatyupqccba.
--
-- Subscription price change. zawaaj_plans is the live source of truth for
-- displayed prices (price_monthly_gbp / price_annual_gbp are in PENCE). The app
-- code (PLAN_PRICES / GC_PRICES / fallbacks) has been updated to match; this
-- migration brings the DB rows in line so nothing serves the old £19/£9.
--
--   Premium: £19/mo → £10/mo (1000p);  annual £180/yr → £96/yr (9600p, ~20% off).
--   Plus (hidden, not launching): £9/mo → £5/mo (500p);  annual £72/yr → £48/yr (4800p).
--   Community (free): unchanged.
--
-- Annual figures are Khalil's to confirm — £96 premium keeps the on-page
-- "save 20%" copy exactly correct (20% off £120). Change here if a different
-- annual is chosen, and update PLAN_PRICES.*.annual + GC_PRICES.premium.annual
-- + the DbPlanRow fallback in src/lib/plan-config.ts to match.
-- ============================================================================

UPDATE public.zawaaj_plans
   SET price_monthly_gbp = 1000,
       price_annual_gbp  = 9600
 WHERE key = 'premium';

UPDATE public.zawaaj_plans
   SET price_monthly_gbp = 500,
       price_annual_gbp  = 4800
 WHERE key = 'plus';

-- Verify:
-- SELECT key, price_monthly_gbp, price_annual_gbp FROM public.zawaaj_plans ORDER BY sort_order;
