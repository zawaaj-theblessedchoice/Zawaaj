-- ============================================================
-- Migration 022: Promo codes + redemptions
-- ============================================================

-- ── zawaaj_promo_codes ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zawaaj_promo_codes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text        NOT NULL UNIQUE,
  description      text,

  -- Discount config
  discount_type    text        NOT NULL DEFAULT 'percent',
  -- 'percent' | 'fixed_gbp'
  discount_value   numeric(10,2) NOT NULL,
  -- percent: 0–100, fixed_gbp: amount in £

  applicable_plans text[]      NOT NULL DEFAULT ARRAY['plus','premium'],

  -- Usage limits
  max_uses         integer,    -- NULL = unlimited
  uses_count       integer     NOT NULL DEFAULT 0,

  -- Validity window
  valid_from       timestamptz NOT NULL DEFAULT now(),
  valid_until      timestamptz,  -- NULL = no expiry

  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT zpc_discount_type_check CHECK (
    discount_type = ANY (ARRAY['percent', 'fixed_gbp'])
  ),
  CONSTRAINT zpc_percent_range CHECK (
    discount_type <> 'percent' OR (discount_value >= 0 AND discount_value <= 100)
  ),
  CONSTRAINT zpc_fixed_positive CHECK (
    discount_type <> 'fixed_gbp' OR discount_value >= 0
  )
);

-- ── zawaaj_promo_redemptions ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zawaaj_promo_redemptions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id    uuid        NOT NULL REFERENCES public.zawaaj_promo_codes(id) ON DELETE CASCADE,
  profile_id       uuid        REFERENCES public.zawaaj_profiles(id) ON DELETE SET NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_purchased   text,
  discount_applied numeric(10,2),
  redeemed_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS zpc_code_active_idx ON public.zawaaj_promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS zpr_code_id_idx     ON public.zawaaj_promo_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS zpr_user_idx        ON public.zawaaj_promo_redemptions(user_id);

-- RLS
ALTER TABLE public.zawaaj_promo_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zawaaj_promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zpc: admin all"           ON public.zawaaj_promo_codes;
DROP POLICY IF EXISTS "zpc: member validate"     ON public.zawaaj_promo_codes;
DROP POLICY IF EXISTS "zpr: admin all"           ON public.zawaaj_promo_redemptions;
DROP POLICY IF EXISTS "zpr: own select"          ON public.zawaaj_promo_redemptions;

-- Admins have full access
CREATE POLICY "zpc: admin all"
  ON public.zawaaj_promo_codes FOR ALL
  USING (public.zawaaj_is_admin());

-- Authenticated members can read active codes (for validation)
CREATE POLICY "zpc: member validate"
  ON public.zawaaj_promo_codes FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND now() >= valid_from
    AND (valid_until IS NULL OR valid_until > now())
  );

-- Admins see all redemptions
CREATE POLICY "zpr: admin all"
  ON public.zawaaj_promo_redemptions FOR ALL
  USING (public.zawaaj_is_admin());

-- Members see their own redemptions
CREATE POLICY "zpr: own select"
  ON public.zawaaj_promo_redemptions FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to insert their own redemptions
DROP POLICY IF EXISTS "zpr: own insert" ON public.zawaaj_promo_redemptions;
CREATE POLICY "zpr: own insert"
  ON public.zawaaj_promo_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS zpc_updated_at ON public.zawaaj_promo_codes;
CREATE TRIGGER zpc_updated_at
  BEFORE UPDATE ON public.zawaaj_promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
