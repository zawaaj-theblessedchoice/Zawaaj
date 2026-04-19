-- Migration 036: Add RLS policy so targets can view their received introduction requests
-- Without this, the Received tab is always empty and the respond route returns 404.

-- Targets need to SELECT rows where they are target_profile_id
DROP POLICY IF EXISTS "zir: target select" ON public.zawaaj_introduction_requests;

CREATE POLICY "zir: target select"
  ON public.zawaaj_introduction_requests FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = target_profile_id
    )
  );
