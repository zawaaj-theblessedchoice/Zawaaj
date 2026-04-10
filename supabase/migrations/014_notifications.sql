-- Migration 014: In-app notifications (Phase 1)
-- Creates zawaaj_notifications table. Email delivery (Phase 2) will be Resend-based
-- and added in a later migration — architecture is notification-type-driven so
-- email can be layered on top without schema changes.

CREATE TABLE IF NOT EXISTS public.zawaaj_notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid NOT NULL REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- Types: 'new_request' | 'request_mutual' | 'request_declined' | 'admin_message' | 'match_update'
  title       text NOT NULL,
  body        text,
  action_url  text,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
  ON public.zawaaj_notifications (profile_id, read_at)
  WHERE read_at IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.zawaaj_notifications ENABLE ROW LEVEL SECURITY;

-- Members see only their own notifications
DROP POLICY IF EXISTS "members_read_own_notifications" ON public.zawaaj_notifications;
CREATE POLICY "members_read_own_notifications"
  ON public.zawaaj_notifications
  FOR SELECT
  USING (
    profile_id IN (
      SELECT active_profile_id FROM public.zawaaj_user_settings WHERE user_id = auth.uid()
    )
  );

-- Members can mark their own as read (UPDATE read_at only)
DROP POLICY IF EXISTS "members_update_own_notifications" ON public.zawaaj_notifications;
CREATE POLICY "members_update_own_notifications"
  ON public.zawaaj_notifications
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT active_profile_id FROM public.zawaaj_user_settings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT active_profile_id FROM public.zawaaj_user_settings WHERE user_id = auth.uid()
    )
  );

-- Admins (super_admin + manager) can insert notifications for any profile
DROP POLICY IF EXISTS "admins_insert_notifications" ON public.zawaaj_notifications;
CREATE POLICY "admins_insert_notifications"
  ON public.zawaaj_notifications
  FOR INSERT
  WITH CHECK (zawaaj_is_admin());

COMMENT ON TABLE public.zawaaj_notifications IS
  'In-app notifications. Phase 2 will add email delivery via Resend using the same rows + type field.';

COMMENT ON COLUMN public.zawaaj_notifications.type IS
  'new_request | request_mutual | request_declined | admin_message | match_update';
