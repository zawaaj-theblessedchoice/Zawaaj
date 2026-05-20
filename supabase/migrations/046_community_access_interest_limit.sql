-- Confirm Community Access monthly interest limit = 2
-- This is the single source of truth for the interest counter and API guard.
-- The application reads this value at runtime via fetchPlanLimits() → zawaaj_plans.
UPDATE public.zawaaj_plans
SET monthly_interests = 2
WHERE key = 'voluntary';

-- Confirm
SELECT key, label, monthly_interests FROM public.zawaaj_plans ORDER BY sort_order;
