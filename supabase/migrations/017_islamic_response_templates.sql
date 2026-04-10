-- Migration 017: Replace generic templates with 10 Islamic templates
-- Spec: zawaaj_master_brief.md §6 (Response System)
--
-- Rules per spec:
--   - All start with "Assalamu alaikum"
--   - Formal tone
--   - No emojis
--   - Free tier: Accept/Decline only (no templates — enforced in API)
--   - Plus & Premium: template-based responses ONLY
--
-- Template categories (per brief):
--   1. Meeting request         → positive
--   2. Event meeting           → positive
--   3. Facilitated call        → positive
--   4. Involve family          → positive
--   5. Request more info       → positive
--   6. Need time               → positive (soft / open)
--   7. Revisit later           → positive (soft / open)
--   8. Respectful decline      → decline
--   9. Not in position         → decline
--   10. Do not proceed         → decline

-- ─── 1. Add plan_required column ─────────────────────────────────────────────

ALTER TABLE public.zawaaj_response_templates
  ADD COLUMN IF NOT EXISTS plan_required text DEFAULT 'plus';
-- NULL = free (but we will enforce in API; templates themselves require 'plus' minimum)

-- ─── 2. Delete ALL old generic templates ─────────────────────────────────────

DELETE FROM public.zawaaj_response_templates;

-- ─── 3. Drop old unique constraint (text changed) ────────────────────────────

ALTER TABLE public.zawaaj_response_templates
  DROP CONSTRAINT IF EXISTS zawaaj_response_templates_tone_text_key;

-- ─── 4. Insert the 10 canonical Islamic templates ────────────────────────────

INSERT INTO public.zawaaj_response_templates
  (tone, text, display_order, is_active, plan_required)
VALUES
  -- ── Positive responses ───────────────────────────────────────────────────

  (
    'positive',
    'Assalamu alaikum. I would welcome the opportunity to meet and would be happy for the admin team to facilitate an introduction at a suitable time and place.',
    1, true, 'plus'
  ),
  (
    'positive',
    'Assalamu alaikum. I would be open to meeting at an upcoming Zawaaj event. If the admin team could assist with coordination, I would appreciate that very much.',
    2, true, 'plus'
  ),
  (
    'positive',
    'Assalamu alaikum. I would be comfortable proceeding with a facilitated introductory call. Please arrange this at the admin team''s earliest convenience.',
    3, true, 'plus'
  ),
  (
    'positive',
    'Assalamu alaikum. I would like to involve my family at this stage before proceeding further. I ask that the admin team please coordinate accordingly.',
    4, true, 'plus'
  ),
  (
    'positive',
    'Assalamu alaikum. I am interested in learning more before giving a full response. Could the admin team kindly share any additional information that may be appropriate?',
    5, true, 'plus'
  ),
  (
    'positive',
    'Assalamu alaikum. I would like a little more time to reflect before responding. I will follow up with the admin team shortly, insha''Allah.',
    6, true, 'plus'
  ),
  (
    'positive',
    'Assalamu alaikum. At this time I am not quite ready to proceed, but I would ask that this introduction be kept open for revisiting at a later date, if that is possible.',
    7, true, 'plus'
  ),

  -- ── Decline responses ────────────────────────────────────────────────────

  (
    'decline',
    'Assalamu alaikum. Thank you sincerely for your interest. After careful and prayerful consideration, I do not feel this would be the right match, and I wish you all the very best in your search.',
    8, true, 'plus'
  ),
  (
    'decline',
    'Assalamu alaikum. Thank you for reaching out. I am not in a position to proceed with an introduction at this time. I sincerely wish you success and ease in your search.',
    9, true, 'plus'
  ),
  (
    'decline',
    'Assalamu alaikum. Thank you for your interest. After reflection, I would respectfully ask that we do not proceed with this introduction. JazakAllahu khairan.',
    10, true, 'plus'
  );

-- ─── 5. Re-add unique constraint ─────────────────────────────────────────────

ALTER TABLE public.zawaaj_response_templates
  ADD CONSTRAINT zawaaj_response_templates_tone_order_key UNIQUE (tone, display_order);

COMMENT ON COLUMN public.zawaaj_response_templates.plan_required IS
  'Minimum plan to use this template. Currently all templates require ''plus'' or above. Free tier uses simple accept/decline (enforced in API).';
