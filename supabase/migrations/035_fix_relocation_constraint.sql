-- ============================================================
-- Migration 035: Fix open_to_relocation check constraint
-- The form sends 'yes_open' | 'within_uk' | 'prefer_local' | 'not_open'
-- but migration 007 only allowed 'yes' | 'no' | 'flexible' — blocking all
-- registrations where a relocation preference was selected.
-- Include both old and new values so existing rows still pass.
-- ============================================================

ALTER TABLE public.zawaaj_profiles
  DROP CONSTRAINT IF EXISTS zp_open_to_relocation_check;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_open_to_relocation_check CHECK (
    open_to_relocation IS NULL OR open_to_relocation = ANY (ARRAY[
      'yes_open', 'within_uk', 'prefer_local', 'not_open',
      'yes', 'no', 'flexible'
    ])
  );
