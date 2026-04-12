-- ============================================================
-- 018_filter_memory.sql
-- Smart filter memory: extend zawaaj_browse_state with two
-- nullable columns for persisted filter state (Plus/Premium).
-- Free users never write here; expiry is enforced at app layer.
-- ============================================================

ALTER TABLE public.zawaaj_browse_state
  ADD COLUMN IF NOT EXISTS filters_json       jsonb,
  ADD COLUMN IF NOT EXISTS filters_updated_at timestamptz;

COMMENT ON COLUMN public.zawaaj_browse_state.filters_json
  IS 'Last applied FilterState object. NULL = no filters stored. Only written for Plus/Premium members.';

COMMENT ON COLUMN public.zawaaj_browse_state.filters_updated_at
  IS 'Timestamp of last filter write. App-layer expiry: if now - filters_updated_at > 7 days, treat as NULL.';
