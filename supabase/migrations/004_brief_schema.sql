-- Migration 004: Full schema additions for UI/UX redesign brief
-- All changes are additive (IF NOT EXISTS / DO blocks). Safe to apply.

-- ============================================================
-- zawaaj_profiles: new columns
-- ============================================================

-- Identity / Basic info
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS first_name          text,
  ADD COLUMN IF NOT EXISTS last_name           text,         -- kept private
  ADD COLUMN IF NOT EXISTS nationality         varchar,
  ADD COLUMN IF NOT EXISTS marital_status      varchar,      -- 'never_married' | 'divorced' | 'widowed'
  ADD COLUMN IF NOT EXISTS has_children        boolean,
  ADD COLUMN IF NOT EXISTS languages_spoken    text;

-- Faith & practice
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS bio                 text,
  ADD COLUMN IF NOT EXISTS living_situation    varchar,      -- 'independent' | 'with_family' | 'shared'
  ADD COLUMN IF NOT EXISTS religiosity         varchar,      -- 'practising' | 'moderately_practising' | 'cultural_muslim'
  ADD COLUMN IF NOT EXISTS prayer_regularity   varchar,      -- 'yes_regularly' | 'most_of_time' | 'working_on_it' | 'not_currently'
  ADD COLUMN IF NOT EXISTS wears_hijab         boolean,      -- female only; null on male profiles
  ADD COLUMN IF NOT EXISTS keeps_beard         boolean;      -- male only; null on female profiles

-- Lifestyle
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS open_to_relocation          varchar,  -- 'yes_open' | 'within_uk' | 'prefer_local' | 'not_open'
  ADD COLUMN IF NOT EXISTS open_to_partners_children   varchar,  -- 'yes' | 'no_preference' | 'prefer_not'
  ADD COLUMN IF NOT EXISTS polygamy_openness            varchar;  -- 'no' | 'open_to_discussion' | null (skipped)

-- Preferences (Step 7)
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS pref_partner_children   varchar,      -- 'open' | 'prefer_none' | 'no_preference'
  ADD COLUMN IF NOT EXISTS pref_age_min            int,
  ADD COLUMN IF NOT EXISTS pref_age_max            int,
  ADD COLUMN IF NOT EXISTS pref_location           text,
  ADD COLUMN IF NOT EXISTS pref_ethnicity          varchar,
  ADD COLUMN IF NOT EXISTS pref_school_of_thought  text[],
  ADD COLUMN IF NOT EXISTS pref_relocation         varchar;

-- Platform / admin
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS listed_at           timestamptz;  -- set when admin approves; drives "new since last visit"

-- ============================================================
-- zawaaj_saved_profiles  (shortlist)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zawaaj_saved_profiles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  saved_by    uuid        NOT NULL REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, saved_by)
);

ALTER TABLE public.zawaaj_saved_profiles ENABLE ROW LEVEL SECURITY;

-- Only the saving profile's owner can read or write their shortlist.
-- Admin deliberately has NO visibility (per brief: privacy requirement).
DROP POLICY IF EXISTS "zsp: owner select" ON public.zawaaj_saved_profiles;
DROP POLICY IF EXISTS "zsp: owner insert" ON public.zawaaj_saved_profiles;
DROP POLICY IF EXISTS "zsp: owner delete" ON public.zawaaj_saved_profiles;

CREATE POLICY "zsp: owner select"
  ON public.zawaaj_saved_profiles FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = saved_by
    )
  );

CREATE POLICY "zsp: owner insert"
  ON public.zawaaj_saved_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = saved_by
    )
  );

CREATE POLICY "zsp: owner delete"
  ON public.zawaaj_saved_profiles FOR DELETE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = saved_by
    )
  );

-- ============================================================
-- zawaaj_browse_state
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zawaaj_browse_state (
  profile_id      uuid        PRIMARY KEY REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  last_browsed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zawaaj_browse_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zbs: owner select" ON public.zawaaj_browse_state;
DROP POLICY IF EXISTS "zbs: owner upsert" ON public.zawaaj_browse_state;

CREATE POLICY "zbs: owner select"
  ON public.zawaaj_browse_state FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = profile_id
    )
  );

CREATE POLICY "zbs: owner insert"
  ON public.zawaaj_browse_state FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = profile_id
    )
  );

CREATE POLICY "zbs: owner update"
  ON public.zawaaj_browse_state FOR UPDATE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = profile_id
    )
  );

-- ============================================================
-- zawaaj_introduction_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zawaaj_introduction_requests (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_profile_id   uuid        NOT NULL REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  target_profile_id       uuid        NOT NULL REFERENCES public.zawaaj_profiles(id) ON DELETE CASCADE,
  status                  varchar     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'mutual', 'facilitated', 'expired')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  expires_at              timestamptz NOT NULL DEFAULT now() + interval '30 days',
  mutual_at               timestamptz,
  facilitated_at          timestamptz,
  admin_notes             text,
  CONSTRAINT no_self_introduction CHECK (requesting_profile_id <> target_profile_id),
  UNIQUE (requesting_profile_id, target_profile_id)
);

CREATE INDEX IF NOT EXISTS zir_requesting_idx ON public.zawaaj_introduction_requests (requesting_profile_id);
CREATE INDEX IF NOT EXISTS zir_target_idx     ON public.zawaaj_introduction_requests (target_profile_id);
CREATE INDEX IF NOT EXISTS zir_status_idx     ON public.zawaaj_introduction_requests (status);

ALTER TABLE public.zawaaj_introduction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zir: requester select" ON public.zawaaj_introduction_requests;
DROP POLICY IF EXISTS "zir: requester insert" ON public.zawaaj_introduction_requests;
DROP POLICY IF EXISTS "zir: admin all"        ON public.zawaaj_introduction_requests;

-- Requester can see their own sent requests (one-sided: target never notified via RLS)
CREATE POLICY "zir: requester select"
  ON public.zawaaj_introduction_requests FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = requesting_profile_id
    )
  );

-- Members can create requests (server validates limit + uniqueness + no-self)
CREATE POLICY "zir: requester insert"
  ON public.zawaaj_introduction_requests FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.zawaaj_profiles WHERE id = requesting_profile_id
    )
  );

-- Admin can read all and update (status changes: mutual, facilitated)
CREATE POLICY "zir: admin all"
  ON public.zawaaj_introduction_requests FOR ALL
  USING (public.zawaaj_is_admin());
