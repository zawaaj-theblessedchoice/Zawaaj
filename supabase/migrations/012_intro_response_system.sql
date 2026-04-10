-- Migration 012: Introduction response system
-- Adds: response columns, visible_at (visibility timing), 'declined' status,
--       response_templates table with default seeds.
-- Removes: old mutual-from-dual-request logic is now in app layer only (no DB change needed).

-- ─── 1. Add response columns to zawaaj_introduction_requests ─────────────────

ALTER TABLE public.zawaaj_introduction_requests
  ADD COLUMN IF NOT EXISTS response_tone    text,
  ADD COLUMN IF NOT EXISTS response_text    text,
  ADD COLUMN IF NOT EXISTS responded_at     timestamptz,
  ADD COLUMN IF NOT EXISTS visible_at       timestamptz;

-- ─── 2. Add 'declined' to the status CHECK constraint ────────────────────────
-- Drop old constraint first, then recreate with all valid statuses.

ALTER TABLE public.zawaaj_introduction_requests
  DROP CONSTRAINT IF EXISTS zawaaj_introduction_requests_status_check;

ALTER TABLE public.zawaaj_introduction_requests
  ADD CONSTRAINT zawaaj_introduction_requests_status_check
    CHECK (status IN ('pending', 'mutual', 'active', 'facilitated', 'expired', 'withdrawn', 'declined'));

-- ─── 3. Add CHECK on response_tone ───────────────────────────────────────────

ALTER TABLE public.zawaaj_introduction_requests
  DROP CONSTRAINT IF EXISTS zawaaj_introduction_requests_response_tone_check;

ALTER TABLE public.zawaaj_introduction_requests
  ADD CONSTRAINT zawaaj_introduction_requests_response_tone_check
    CHECK (response_tone IS NULL OR response_tone IN ('positive', 'decline'));

-- ─── 4. Create zawaaj_response_templates ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zawaaj_response_templates (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tone          text NOT NULL CHECK (tone IN ('positive', 'decline')),
  text          text NOT NULL,
  display_order int  DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Seed default templates (idempotent via ON CONFLICT DO NOTHING + unique constraint)
ALTER TABLE public.zawaaj_response_templates
  DROP CONSTRAINT IF EXISTS zawaaj_response_templates_tone_text_key;

ALTER TABLE public.zawaaj_response_templates
  ADD CONSTRAINT zawaaj_response_templates_tone_text_key UNIQUE (tone, text);

INSERT INTO public.zawaaj_response_templates (tone, text, display_order) VALUES
  ('positive', 'I would be open to learning more, and welcome the introduction.',        1),
  ('positive', 'I am interested and happy for the admin team to be in touch.',            2),
  ('positive', 'Yes, please proceed — I am open to this introduction.',                  3),
  ('decline',  'Thank you for your interest, but I do not feel we would be a good match.',1),
  ('decline',  'I appreciate the interest, but I am not able to proceed at this time.',   2),
  ('decline',  'After consideration, I do not think this is the right fit for me.',       3)
ON CONFLICT (tone, text) DO NOTHING;

-- ─── 5. RLS on response_templates (read-only for members) ────────────────────

ALTER TABLE public.zawaaj_response_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_active_templates" ON public.zawaaj_response_templates;
CREATE POLICY "members_read_active_templates"
  ON public.zawaaj_response_templates
  FOR SELECT
  USING (is_active = true);

-- ─── 6. Index for visible_at lookups (received tab filtering) ────────────────

CREATE INDEX IF NOT EXISTS idx_intro_requests_visible_at
  ON public.zawaaj_introduction_requests (visible_at);

COMMENT ON COLUMN public.zawaaj_introduction_requests.visible_at IS
  'When this request becomes visible to the target. NULL = immediately. Set by sender plan: Premium=now, Plus=+24h, Free=+48h';

COMMENT ON COLUMN public.zawaaj_introduction_requests.response_tone IS
  'positive | decline — set when target responds via response template';
