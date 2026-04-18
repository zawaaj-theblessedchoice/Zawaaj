-- ============================================================
-- Migration 034: Events extension
-- Adds: event_category, organiser, organiser_label, is_featured,
--       price_gbp, tags to zawaaj_events
-- Note: description, capacity, is_online already added in 026
-- ============================================================

ALTER TABLE public.zawaaj_events
  ADD COLUMN IF NOT EXISTS event_category text
    CHECK (event_category IN ('workshop', 'webinar', 'matrimonial', 'community')),
  ADD COLUMN IF NOT EXISTS organiser text
    CHECK (organiser IN ('zawaaj', 'radiance_of_hope', 'both'))
    DEFAULT 'zawaaj',
  ADD COLUMN IF NOT EXISTS organiser_label text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_gbp numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[];
