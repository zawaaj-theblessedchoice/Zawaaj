-- ============================================================
-- Migration 021: Invite tokens + family account indexes
-- ============================================================

-- Performance indexes on zawaaj_family_accounts
CREATE INDEX IF NOT EXISTS zfa_primary_user_idx   ON public.zawaaj_family_accounts(primary_user_id);
CREATE INDEX IF NOT EXISTS zfa_contact_number_idx ON public.zawaaj_family_accounts(contact_number);
CREATE INDEX IF NOT EXISTS zfa_contact_email_idx  ON public.zawaaj_family_accounts(contact_email);
CREATE INDEX IF NOT EXISTS zfa_status_idx         ON public.zawaaj_family_accounts(status);

-- Performance indexes on zawaaj_profiles for family linking
CREATE INDEX IF NOT EXISTS zp_family_account_idx ON public.zawaaj_profiles(family_account_id);
CREATE INDEX IF NOT EXISTS zp_child_user_idx     ON public.zawaaj_profiles(child_user_id);

-- ── zawaaj_invite_tokens ─────────────────────────────────────
-- Tokens used when a parent invites their child to create their
-- own login, or when an admin links a profile to a family account.

CREATE TABLE IF NOT EXISTS public.zawaaj_invite_tokens (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  family_account_id uuid        NOT NULL REFERENCES public.zawaaj_family_accounts(id) ON DELETE CASCADE,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  purpose           text        NOT NULL DEFAULT 'link_child',
  -- 'link_child'  — parent invites child to sign up with their own account
  -- 'link_parent' — admin links an existing profile to a family account
  invited_name      text,
  invited_email     text,
  invited_phone     text,
  -- Once accepted:
  accepted_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at       timestamptz,
  -- Auto-expires in 7 days
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT zit_purpose_check CHECK (
    purpose = ANY (ARRAY['link_child', 'link_parent'])
  )
);

CREATE INDEX IF NOT EXISTS zit_token_idx   ON public.zawaaj_invite_tokens(token);
CREATE INDEX IF NOT EXISTS zit_family_idx  ON public.zawaaj_invite_tokens(family_account_id);
CREATE INDEX IF NOT EXISTS zit_pending_idx ON public.zawaaj_invite_tokens(expires_at)
  WHERE accepted_at IS NULL;

-- RLS
ALTER TABLE public.zawaaj_invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zit: admin all"     ON public.zawaaj_invite_tokens;
DROP POLICY IF EXISTS "zit: family select" ON public.zawaaj_invite_tokens;
DROP POLICY IF EXISTS "zit: token lookup"  ON public.zawaaj_invite_tokens;

-- Admins can do everything
CREATE POLICY "zit: admin all"
  ON public.zawaaj_invite_tokens FOR ALL
  USING (public.zawaaj_is_admin());

-- Primary user of a family account can view tokens for that account
CREATE POLICY "zit: family select"
  ON public.zawaaj_invite_tokens FOR SELECT
  USING (
    family_account_id IN (
      SELECT id FROM public.zawaaj_family_accounts
      WHERE primary_user_id = auth.uid()
    )
  );

-- Anyone with the token can read it (needed for accept-invite page)
CREATE POLICY "zit: token lookup"
  ON public.zawaaj_invite_tokens FOR SELECT
  USING (true);
