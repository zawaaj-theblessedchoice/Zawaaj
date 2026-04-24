-- Migration 043: Payment requests table + family account payment columns
-- Required for the bank transfer / direct debit upgrade flow.

-- 1. Add payment-tracking columns to zawaaj_family_accounts
--    These are set when a payment is confirmed and the plan is activated.
ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS subscription_source  text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status  text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS renewal_date         timestamptz DEFAULT NULL;

-- 2. Payment requests queue
--    Tracks every bank-transfer / direct-debit upgrade request submitted
--    by a family. Admin reviews and approves/rejects each entry.
CREATE TABLE IF NOT EXISTS public.zawaaj_payment_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid        NOT NULL REFERENCES public.zawaaj_family_accounts(id) ON DELETE CASCADE,
  plan              text        NOT NULL,                          -- 'plus' | 'premium'
  billing_cycle     text        NOT NULL DEFAULT 'monthly',       -- 'monthly' | 'annual'
  amount_gbp        integer     NOT NULL,                         -- pence-free: 9 = £9
  method            text        NOT NULL DEFAULT 'bank_transfer', -- 'bank_transfer' | 'direct_debit'
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected','cancelled')),
  reference         text,                                         -- bank ref the member used
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid        REFERENCES auth.users(id),
  rejection_reason  text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for admin queue (most recent first, by status)
CREATE INDEX IF NOT EXISTS zawaaj_payment_requests_status_idx
  ON public.zawaaj_payment_requests (status, submitted_at DESC);

-- Index for family account lookup (member checking their own request)
CREATE INDEX IF NOT EXISTS zawaaj_payment_requests_family_idx
  ON public.zawaaj_payment_requests (family_account_id, submitted_at DESC);

-- RLS: members can read their own requests; admins can read/write all
ALTER TABLE public.zawaaj_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own payment requests"
  ON public.zawaaj_payment_requests FOR SELECT
  USING (
    family_account_id IN (
      SELECT id FROM public.zawaaj_family_accounts
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to payment requests"
  ON public.zawaaj_payment_requests FOR ALL
  USING (zawaaj_is_admin())
  WITH CHECK (zawaaj_is_admin());
