-- Migration 049: Extend zawaaj_introduction_requests RLS policies so that a
-- family representative (primary_user_id on zawaaj_family_accounts) can read
-- both the sent and received introduction requests belonging to any profile
-- in their managed family account.
--
-- Root cause: imported profiles have user_id = null. The existing policies
-- check user_id = auth.uid(), which is always false for null values. A
-- representative who claimed the family account via the claim flow cannot
-- see any requests for the candidate's profile as a result.
--
-- NOTE: the code-level fix (using supabaseAdmin in introductions/page.tsx
-- when isRepresentative = true) provides immediate relief. This migration
-- is the proper database-level complement.

-- ── Sent requests (requester side) ────────────────────────────────────────────

DROP POLICY IF EXISTS "zir: requester select" ON public.zawaaj_introduction_requests;

CREATE POLICY "zir: requester select"
  ON public.zawaaj_introduction_requests FOR SELECT
  USING (
    -- Standard: requester profile belongs to the current user
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = requesting_profile_id
    )
    OR
    -- Family v2: current user is the representative of the family account
    -- that the requesting profile belongs to (covers imported profiles with user_id = null)
    auth.uid() = (
      SELECT zfa.primary_user_id
      FROM public.zawaaj_profiles zp
      JOIN public.zawaaj_family_accounts zfa ON zfa.id = zp.family_account_id
      WHERE zp.id = requesting_profile_id
        AND zfa.primary_user_id IS NOT NULL
    )
  );

-- ── Received requests (target side) ───────────────────────────────────────────

DROP POLICY IF EXISTS "zir: target select" ON public.zawaaj_introduction_requests;

CREATE POLICY "zir: target select"
  ON public.zawaaj_introduction_requests FOR SELECT
  USING (
    -- Standard: target profile belongs to the current user
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = target_profile_id
    )
    OR
    -- Family v2: current user is the representative of the family account
    -- that the target profile belongs to (covers imported profiles with user_id = null)
    auth.uid() = (
      SELECT zfa.primary_user_id
      FROM public.zawaaj_profiles zp
      JOIN public.zawaaj_family_accounts zfa ON zfa.id = zp.family_account_id
      WHERE zp.id = target_profile_id
        AND zfa.primary_user_id IS NOT NULL
    )
  );
