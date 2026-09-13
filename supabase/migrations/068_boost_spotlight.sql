-- Migration 068 — Boost & Spotlight (visibility features)
--
-- ⚠️  KHALIL MUST RUN THIS in the Zawaaj Supabase SQL editor.
--     The feature ships DARK: NEXT_PUBLIC_BOOST_SPOTLIGHT_ENABLED is unset/false,
--     so no boosts are grantable and browse ordering is unchanged until you flip
--     the env flag. Running this migration alone changes NOTHING behaviourally —
--     it only adds nullable columns (all NULL) and an empty ledger table.
--
-- Model:
--   * zawaaj_profiles.boosted_until / spotlighted_until — a timestamp in the
--     future means the profile is currently boosted / spotlighted. Expiry is by
--     the timestamp only (no cron mutates rows): once it is in the past the
--     profile simply stops sorting/spotlighting.
--   * zawaaj_boost_ledger — one row per grant, used to enforce & audit the monthly
--     allowance per family (Premium: 4 boosts + 1 spotlight / month; Plus: 1 boost;
--     Free: none). period is the 'YYYY-MM' the grant was made in.
--
-- Pre-flight (confirm the columns/table do NOT already exist):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'zawaaj_profiles'
--     AND column_name IN ('boosted_until','spotlighted_until');
--   SELECT to_regclass('public.zawaaj_boost_ledger');

-- ── Profile visibility timestamps ────────────────────────────────────────────
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS boosted_until     timestamptz,
  ADD COLUMN IF NOT EXISTS spotlighted_until timestamptz;

-- Partial indexes — only ever scan rows that are actually boosted/spotlighted.
CREATE INDEX IF NOT EXISTS idx_zawaaj_profiles_boosted_until
  ON public.zawaaj_profiles (boosted_until)
  WHERE boosted_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zawaaj_profiles_spotlighted_until
  ON public.zawaaj_profiles (spotlighted_until)
  WHERE spotlighted_until IS NOT NULL;

-- ── Grant / consumption ledger ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zawaaj_boost_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id  uuid NOT NULL REFERENCES public.zawaaj_family_accounts(id) ON DELETE CASCADE,
  profile_id         uuid NOT NULL REFERENCES public.zawaaj_profiles(id)        ON DELETE CASCADE,
  kind               text NOT NULL CHECK (kind IN ('boost','spotlight')),
  period             text NOT NULL,                 -- 'YYYY-MM' of the grant (calendar-month allowance bucket)
  granted_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL
);

-- Allowance-enforcement lookup: count(kind) for a family in a period.
CREATE INDEX IF NOT EXISTS idx_zawaaj_boost_ledger_family_kind_period
  ON public.zawaaj_boost_ledger (family_account_id, kind, period);

-- The ledger is written & read ONLY by server routes using the service-role
-- client (which bypasses RLS). Enable RLS with NO policies so it is inaccessible
-- to anon/authenticated clients — allowances cannot be read or forged client-side.
ALTER TABLE public.zawaaj_boost_ledger ENABLE ROW LEVEL SECURITY;

-- Confirm
SELECT column_name FROM information_schema.columns
WHERE table_name = 'zawaaj_profiles' AND column_name IN ('boosted_until','spotlighted_until')
ORDER BY column_name;
SELECT to_regclass('public.zawaaj_boost_ledger') AS ledger_table;
