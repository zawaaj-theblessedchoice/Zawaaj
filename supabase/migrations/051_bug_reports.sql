-- Migration 051: zawaaj_bug_reports — member-submitted issue reports

CREATE TABLE public.zawaaj_bug_reports (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  family_account_id uuid       REFERENCES zawaaj_family_accounts(id) ON DELETE SET NULL,
  profile_name     text,
  user_email       text,
  category         text        NOT NULL CHECK (category IN (
    'not_working',
    'wrong_information',
    'cant_find',
    'suggestion',
    'other'
  )),
  description      text        NOT NULL,
  page_url         text,
  status           text        DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  admin_notes      text
);

ALTER TABLE public.zawaaj_bug_reports ENABLE ROW LEVEL SECURITY;

-- Members can submit their own reports
CREATE POLICY "Users can insert own reports"
  ON public.zawaaj_bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all reports
CREATE POLICY "Admins can read all reports"
  ON public.zawaaj_bug_reports FOR SELECT
  USING (zawaaj_is_admin());

-- Admins can update status and notes
CREATE POLICY "Admins can update reports"
  ON public.zawaaj_bug_reports FOR UPDATE
  USING (zawaaj_is_admin());
