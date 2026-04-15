-- Migration 028: Add outcome tracking to introduction requests
-- Records what happened after admin facilitates an introduction.

ALTER TABLE zawaaj_introduction_requests
  ADD COLUMN IF NOT EXISTS outcome text
    CHECK (outcome IN (
      'in_conversation',
      'meeting_arranged',
      'engaged',
      'married',
      'unsuccessful',
      'withdrawn'
    )),
  ADD COLUMN IF NOT EXISTS outcome_date timestamptz;

-- Partial index for analytics queries filtering by outcome
CREATE INDEX IF NOT EXISTS idx_zawaaj_intro_req_outcome
  ON zawaaj_introduction_requests (outcome)
  WHERE outcome IS NOT NULL;
