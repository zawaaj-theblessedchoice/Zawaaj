-- 056_intro_followups_table.sql
-- Creates zawaaj_intro_followups for tracking follow-up progress
-- after an introduction has been facilitated (contacts shared).
--
-- Each row records a status transition made by an admin or manager,
-- with an optional free-text note. The table is append-only —
-- status changes are never deleted, only new rows added.

CREATE TABLE IF NOT EXISTS zawaaj_intro_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  introduction_request_id UUID REFERENCES zawaaj_introduction_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status_set TEXT,
  note TEXT
);

ALTER TABLE zawaaj_intro_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage followups"
  ON zawaaj_intro_followups FOR ALL
  TO authenticated
  USING (zawaaj_is_admin());
