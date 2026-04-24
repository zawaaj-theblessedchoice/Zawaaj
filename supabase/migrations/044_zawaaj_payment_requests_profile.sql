-- Migration 044: Extend zawaaj_payment_requests to support profile-based lookup
-- 043 required family_account_id NOT NULL, but many members are profile-based
-- and don't have a family account. This migration makes it nullable and adds
-- profile_id so both old and new members can submit bank transfer requests.

ALTER TABLE public.zawaaj_payment_requests
  ALTER COLUMN family_account_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS profile_id uuid
    REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE;

-- At least one identifier must be present
ALTER TABLE public.zawaaj_payment_requests
  ADD CONSTRAINT zpr_identifier_required CHECK (
    family_account_id IS NOT NULL OR profile_id IS NOT NULL
  );

-- Replace the member RLS policy to cover both identifier types
DROP POLICY IF EXISTS "Members can view own payment requests"
  ON public.zawaaj_payment_requests;

CREATE POLICY "Members can view own payment requests"
  ON public.zawaaj_payment_requests FOR SELECT
  USING (
    (profile_id IS NOT NULL AND profile_id IN (
      SELECT id FROM public.zawaaj_profiles WHERE user_id = auth.uid()
    ))
    OR
    (family_account_id IS NOT NULL AND family_account_id IN (
      SELECT id FROM public.zawaaj_family_accounts WHERE primary_user_id = auth.uid()
    ))
  );
