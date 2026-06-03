-- 062_manager_rls_scoping.sql
-- ⚠️ PROPOSAL — STAGED, NOT YET APPLIED. Khalil must run this manually in the
--    Zawaaj SQL editor AFTER the pre-flight check below. CC cannot run SQL on Zawaaj.
--
-- PURPOSE (defence-in-depth for the manager data-exposure bug):
--   Today, zawaaj_is_admin() returns TRUE for any active manager (migration 019),
--   and the "admin all" RLS policies on these three tables use zawaaj_is_admin().
--   Result: at the DATABASE layer a manager is authorised to read EVERY member's
--   intros, families, and follow-ups. The application pages now apply server-side
--   .eq() scope filters (commit e5fe554) — that is the INTERIM protection — but it
--   is application-layer only: any future query that forgets the filter would leak.
--   This migration moves the restriction into RLS so an unscoped query CANNOT
--   return other members' data.
--
-- WHAT IT DOES:
--   1. Narrows each blanket "admin all" policy from zawaaj_is_admin()  (super_admin
--      OR manager) to zawaaj_is_super_admin() (super_admin ONLY).
--   2. Adds manager-scoped SELECT policies so a manager can read ONLY the records
--      assigned to them — by PROFILE id for intros/follow-ups, by zawaaj_managers.id
--      for family_accounts (the established dual-id model).
--   Member / requester / target / rep policies are left untouched.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 🔬 PRE-FLIGHT KHALIL MUST DO BEFORE RUNNING (critical):
--   This narrows managers from "blanket access" to "scoped SELECT". Manager WRITE
--   actions (advance follow-up, assign, facilitate, etc.) are safe ONLY IF they go
--   through the service-role client (supabaseAdmin), which bypasses RLS. CC audited
--   the main admin API routes and confirmed they use supabaseAdmin —
--   followup-advance, admin/introductions/[id], activation all write via service
--   role. BUT CC cannot guarantee EVERY manager write path app-wide uses service
--   role. Before running, confirm there is no manager-facing write that uses the
--   user-session client against these three tables; if there is, it will start
--   failing RLS once managers lose blanket access. If unsure, test on a Supabase
--   branch first.
--
--   Also verify the live policy set matches this file — there has been repo-vs-prod
--   drift before (058). Dump current policies first:
--     SELECT tablename, policyname, cmd, qual
--     FROM pg_policies
--     WHERE tablename IN ('zawaaj_introduction_requests','zawaaj_family_accounts','zawaaj_intro_followups')
--     ORDER BY tablename, policyname;
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══ zawaaj_introduction_requests ════════════════════════════════════════════
-- Replace blanket admin-all (super_admin OR manager) with super_admin-only,
-- then add a manager-scoped SELECT.

DROP POLICY IF EXISTS "zir: admin all" ON public.zawaaj_introduction_requests;

CREATE POLICY "zir: super admin all"
  ON public.zawaaj_introduction_requests FOR ALL
  USING (public.zawaaj_is_super_admin());

-- Managers may SELECT only intros assigned to them. assigned_manager_id holds a
-- PROFILE id, so match it against the caller's active profile id, and require the
-- caller to be an active manager.
DROP POLICY IF EXISTS "zir: manager scoped select" ON public.zawaaj_introduction_requests;

CREATE POLICY "zir: manager scoped select"
  ON public.zawaaj_introduction_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zawaaj_managers m
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
    AND assigned_manager_id IN (
      SELECT s.active_profile_id
      FROM public.zawaaj_user_settings s
      WHERE s.user_id = auth.uid()
    )
  );


-- ═══ zawaaj_family_accounts ══════════════════════════════════════════════════
-- Replace blanket admin-all with super_admin-only, add manager-scoped SELECT.

DROP POLICY IF EXISTS "zfa: admin all" ON public.zawaaj_family_accounts;

CREATE POLICY "zfa: super admin all"
  ON public.zawaaj_family_accounts FOR ALL
  USING (public.zawaaj_is_super_admin());

-- Managers may SELECT only families assigned to them. family_accounts.assigned_manager_id
-- holds a zawaaj_managers.id, so match it against the caller's managers-row id.
DROP POLICY IF EXISTS "zfa: manager scoped select" ON public.zawaaj_family_accounts;

CREATE POLICY "zfa: manager scoped select"
  ON public.zawaaj_family_accounts FOR SELECT
  USING (
    assigned_manager_id IN (
      SELECT m.id FROM public.zawaaj_managers m
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
  );


-- ═══ zawaaj_intro_followups ══════════════════════════════════════════════════
-- Replace blanket admin-all with super_admin-only, add manager-scoped SELECT.
-- A follow-up row belongs to a manager iff its parent intro is assigned to that
-- manager's PROFILE id.

DROP POLICY IF EXISTS "Admins can manage followups" ON public.zawaaj_intro_followups;

CREATE POLICY "Super admins can manage followups"
  ON public.zawaaj_intro_followups FOR ALL
  USING (public.zawaaj_is_super_admin());

DROP POLICY IF EXISTS "Managers read scoped followups" ON public.zawaaj_intro_followups;

CREATE POLICY "Managers read scoped followups"
  ON public.zawaaj_intro_followups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zawaaj_managers m
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
    AND introduction_request_id IN (
      SELECT ir.id
      FROM public.zawaaj_introduction_requests ir
      WHERE ir.assigned_manager_id IN (
        SELECT s.active_profile_id
        FROM public.zawaaj_user_settings s
        WHERE s.user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (if a manager write path breaks): restore the blanket admin-all
-- policies that used zawaaj_is_admin():
--   DROP POLICY "zir: super admin all" ON public.zawaaj_introduction_requests;
--   DROP POLICY "zir: manager scoped select" ON public.zawaaj_introduction_requests;
--   CREATE POLICY "zir: admin all" ON public.zawaaj_introduction_requests
--     FOR ALL USING (public.zawaaj_is_admin());
--   (and analogously for zfa + intro_followups)
-- ─────────────────────────────────────────────────────────────────────────────
