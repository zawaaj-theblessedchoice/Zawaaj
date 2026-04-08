-- ============================================================
-- Migration 006: Subscriptions, Bans, Boosts, Views, Concierge, Import
-- ============================================================

-- ─── zawaaj_subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zawaaj_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    varchar NOT NULL DEFAULT 'voluntary'
                            CHECK (plan IN ('voluntary', 'plus', 'premium')),
  status                  varchar NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  stripe_customer_id      varchar,
  stripe_subscription_id  varchar,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean DEFAULT false,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS zawaaj_subscriptions_user_idx ON zawaaj_subscriptions(user_id);

-- ─── zawaaj_member_bans ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zawaaj_member_bans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id      uuid REFERENCES zawaaj_profiles(id) ON DELETE SET NULL,
  banned_by       uuid REFERENCES auth.users(id),
  reason          varchar NOT NULL
                    CHECK (reason IN ('misconduct', 'harassment', 'spam', 'immorality', 'fake_profile', 'other')),
  reason_detail   text,
  severity        varchar NOT NULL DEFAULT 'permanent'
                    CHECK (severity IN ('permanent', 'temporary')),
  banned_at       timestamptz DEFAULT now(),
  expires_at      timestamptz,
  lifted_at       timestamptz,
  lifted_by       uuid REFERENCES auth.users(id),
  lift_reason     text,
  -- computed: active if not lifted AND (no expiry OR not yet expired)
  is_active       boolean GENERATED ALWAYS AS (
    lifted_at IS NULL AND (expires_at IS NULL OR expires_at > now())
  ) STORED
);

CREATE INDEX IF NOT EXISTS zawaaj_member_bans_user_idx    ON zawaaj_member_bans(user_id);
CREATE INDEX IF NOT EXISTS zawaaj_member_bans_profile_idx ON zawaaj_member_bans(profile_id);
CREATE INDEX IF NOT EXISTS zawaaj_member_bans_active_idx  ON zawaaj_member_bans(is_active) WHERE is_active = true;

-- ─── Add ban columns to zawaaj_profiles ───────────────────────────────────────
ALTER TABLE zawaaj_profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_id    uuid REFERENCES zawaaj_member_bans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS zawaaj_profiles_is_banned_idx ON zawaaj_profiles(is_banned) WHERE is_banned = true;

-- ─── zawaaj_profile_boosts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zawaaj_profile_boosts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES zawaaj_profiles(id) ON DELETE CASCADE,
  boosted_at  timestamptz DEFAULT now(),
  expires_at  timestamptz,
  boost_type  varchar DEFAULT 'standard'
                CHECK (boost_type IN ('standard', 'spotlight'))
);

CREATE INDEX IF NOT EXISTS zawaaj_profile_boosts_profile_idx ON zawaaj_profile_boosts(profile_id);
CREATE INDEX IF NOT EXISTS zawaaj_profile_boosts_active_idx  ON zawaaj_profile_boosts(expires_at) WHERE expires_at > now();

-- ─── zawaaj_profile_views ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zawaaj_profile_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES zawaaj_profiles(id) ON DELETE CASCADE,
  viewed_by   uuid NOT NULL REFERENCES zawaaj_profiles(id) ON DELETE CASCADE,
  viewed_at   timestamptz DEFAULT now()
);

-- Performance index (Premium "who viewed you" queries)
CREATE INDEX IF NOT EXISTS zawaaj_profile_views_profile_viewed_idx
  ON zawaaj_profile_views(profile_id, viewed_at DESC);

-- ─── zawaaj_concierge_suggestions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zawaaj_concierge_suggestions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  for_profile_id        uuid NOT NULL REFERENCES zawaaj_profiles(id) ON DELETE CASCADE,
  suggested_profile_id  uuid NOT NULL REFERENCES zawaaj_profiles(id) ON DELETE CASCADE,
  admin_note            text,
  status                varchar DEFAULT 'pending'
                          CHECK (status IN ('pending', 'acknowledged', 'dismissed')),
  created_at            timestamptz DEFAULT now(),
  UNIQUE (for_profile_id, suggested_profile_id)
);

-- ─── zawaaj_import_batches ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zawaaj_import_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by     uuid REFERENCES auth.users(id),
  filename        varchar,
  row_count       integer,
  success_count   integer DEFAULT 0,
  error_count     integer DEFAULT 0,
  status          varchar DEFAULT 'pending'
                    CHECK (status IN ('pending', 'preview', 'processing', 'complete', 'failed')),
  is_test_run     boolean DEFAULT false,
  errors          jsonb,
  created_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

-- Banned profiles hidden from regular member browse
-- (zawaaj_is_admin() SECURITY DEFINER fn already exists from migration 002)
ALTER TABLE zawaaj_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banned_profiles_hidden_from_members" ON zawaaj_profiles;
CREATE POLICY "banned_profiles_hidden_from_members"
  ON zawaaj_profiles FOR SELECT
  USING (
    is_banned = false
    OR zawaaj_is_admin()
  );

-- Members can read their own profile regardless of ban state
DROP POLICY IF EXISTS "own_profile_always_readable" ON zawaaj_profiles;
CREATE POLICY "own_profile_always_readable"
  ON zawaaj_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Subscriptions — users see only their own
ALTER TABLE zawaaj_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_own_only" ON zawaaj_subscriptions;
CREATE POLICY "subscriptions_own_only"
  ON zawaaj_subscriptions FOR ALL
  USING (user_id = auth.uid() OR zawaaj_is_admin());

-- Bans — admin only
ALTER TABLE zawaaj_member_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bans_admin_only" ON zawaaj_member_bans;
CREATE POLICY "bans_admin_only"
  ON zawaaj_member_bans FOR ALL
  USING (zawaaj_is_admin());

-- Profile views — premium members see views of their own profile
ALTER TABLE zawaaj_profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_views_own" ON zawaaj_profile_views;
CREATE POLICY "profile_views_own"
  ON zawaaj_profile_views FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM zawaaj_profiles WHERE user_id = auth.uid()
    )
    OR zawaaj_is_admin()
  );

-- Concierge suggestions — admin full access, members read their own
ALTER TABLE zawaaj_concierge_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "concierge_suggestions_access" ON zawaaj_concierge_suggestions;
CREATE POLICY "concierge_suggestions_access"
  ON zawaaj_concierge_suggestions FOR ALL
  USING (
    for_profile_id IN (
      SELECT id FROM zawaaj_profiles WHERE user_id = auth.uid()
    )
    OR zawaaj_is_admin()
  );

-- Import batches — admin only
ALTER TABLE zawaaj_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "import_batches_admin_only" ON zawaaj_import_batches;
CREATE POLICY "import_batches_admin_only"
  ON zawaaj_import_batches FOR ALL
  USING (zawaaj_is_admin());
