-- 059_intro_requests_partial_unique.sql
-- Replace the flat UNIQUE (requesting_profile_id, target_profile_id) constraint
-- on zawaaj_introduction_requests with a partial unique index that only
-- enforces uniqueness while the request is active (non-terminal).
--
-- Problem: the flat UNIQUE prevents re-expressing interest after a withdrawal
-- or expiry because any second INSERT with the same pair fails at the DB level,
-- even though the application-level check already allows it.
--
-- Fix: partial index so only one *active* request can exist per direction.
-- Terminal statuses (withdrawn, expired, declined, etc.) are excluded from
-- the uniqueness check, allowing the same pair to re-appear after closure.

-- ── Step 1: drop the existing flat UNIQUE constraint ─────────────────────────
-- The constraint was defined inline in migration 004 as:
--   UNIQUE (requesting_profile_id, target_profile_id)
-- Postgres auto-names it; we find and drop it dynamically to be safe.

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_attribute a1
    ON a1.attrelid = c.conrelid
    AND a1.attnum  = ANY(c.conkey)
    AND a1.attname = 'requesting_profile_id'
  JOIN pg_attribute a2
    ON a2.attrelid = c.conrelid
    AND a2.attnum  = ANY(c.conkey)
    AND a2.attname = 'target_profile_id'
  WHERE c.conrelid = 'zawaaj_introduction_requests'::regclass
    AND c.contype  = 'u'
    AND array_length(c.conkey, 1) = 2;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE zawaaj_introduction_requests DROP CONSTRAINT %I', con_name);
    RAISE NOTICE 'Dropped unique constraint: %', con_name;
  ELSE
    RAISE NOTICE 'No matching flat UNIQUE constraint found — nothing to drop.';
  END IF;
END;
$$;

-- ── Step 2: add partial unique index for active requests only ─────────────────
-- One active request per direction (A→B) at a time, but terminal requests
-- (withdrawn, expired, declined, etc.) do not block a fresh expression.

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_intro_per_direction
  ON zawaaj_introduction_requests (requesting_profile_id, target_profile_id)
  WHERE status NOT IN (
    'withdrawn',
    'expired',
    'declined',
    'not_proceeded',
    'nikkah_completed',
    'responded_negative',
    'responded'
  );
