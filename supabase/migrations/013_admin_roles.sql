-- Migration 013: Admin role system
-- Adds: role column ('member' | 'super_admin' | 'manager'), manager scopes table,
--       updated SECURITY DEFINER helper functions.

-- ─── 1. Add role column to zawaaj_profiles ───────────────────────────────────

ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member'
    CHECK (role IN ('member', 'super_admin', 'manager'));

-- ─── 2. Migrate existing is_admin = true rows to super_admin ─────────────────

UPDATE public.zawaaj_profiles
  SET role = 'super_admin'
  WHERE is_admin = true
    AND (role IS NULL OR role = 'member');

-- ─── 3. Create zawaaj_manager_scopes ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zawaaj_manager_scopes (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_profile_id  uuid NOT NULL REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  scope_type          text NOT NULL CHECK (scope_type IN ('geographic', 'workflow', 'user_segment', 'all')),
  scope_value         text,  -- e.g. 'London', 'introductions', 'events', 'all'
  granted_by          uuid REFERENCES public.zawaaj_profiles(id),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_scopes_profile
  ON public.zawaaj_manager_scopes (manager_profile_id);

-- ─── 4. RLS on manager_scopes ────────────────────────────────────────────────

ALTER TABLE public.zawaaj_manager_scopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_manage_scopes" ON public.zawaaj_manager_scopes;
CREATE POLICY "super_admins_manage_scopes"
  ON public.zawaaj_manager_scopes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.zawaaj_profiles p
        JOIN public.zawaaj_user_settings s ON s.active_profile_id = p.id
        WHERE s.user_id = auth.uid() AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "managers_read_own_scopes" ON public.zawaaj_manager_scopes;
CREATE POLICY "managers_read_own_scopes"
  ON public.zawaaj_manager_scopes
  FOR SELECT
  USING (
    manager_profile_id IN (
      SELECT s.active_profile_id FROM public.zawaaj_user_settings s WHERE s.user_id = auth.uid()
    )
  );

-- ─── 5. Update zawaaj_is_admin() — now returns true for super_admin OR manager

CREATE OR REPLACE FUNCTION public.zawaaj_is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.zawaaj_profiles p
    JOIN public.zawaaj_user_settings s ON s.active_profile_id = p.id
    WHERE s.user_id = auth.uid()
      AND p.role IN ('super_admin', 'manager')
  );
$$;

-- ─── 6. New zawaaj_is_super_admin() — super_admin only ───────────────────────

CREATE OR REPLACE FUNCTION public.zawaaj_is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.zawaaj_profiles p
    JOIN public.zawaaj_user_settings s ON s.active_profile_id = p.id
    WHERE s.user_id = auth.uid()
      AND p.role = 'super_admin'
  );
$$;

-- ─── 7. New zawaaj_get_role() — returns current user's role ──────────────────

CREATE OR REPLACE FUNCTION public.zawaaj_get_role()
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.role
     FROM public.zawaaj_profiles p
     JOIN public.zawaaj_user_settings s ON s.active_profile_id = p.id
     WHERE s.user_id = auth.uid()
     LIMIT 1),
    'member'
  );
$$;

COMMENT ON COLUMN public.zawaaj_profiles.role IS
  'member: regular user | super_admin: full platform control | manager: delegated admin (scoped)';

COMMENT ON TABLE public.zawaaj_manager_scopes IS
  'Delegation records — each row grants a manager access to a specific scope (geographic area, workflow, etc.)';
