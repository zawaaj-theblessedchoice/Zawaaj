-- ============================================================
-- Zawaaj — Demo seed data for testers
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run: cleans up previous demo rows first
-- ============================================================
--
-- Login accounts (password: Tester123!)
-- ─────────────────────────────────────
--   amira@demo.zawaaj.uk   — female, London, Pharmacist
--   fatima@demo.zawaaj.uk  — female, Birmingham, Teacher
--   ibrahim@demo.zawaaj.uk — male, Manchester, Software Engineer
--   yusuf@demo.zawaaj.uk   — male, London, Junior Doctor
--
-- Browse targets (no login — appear in member browse view)
-- ────────────────────────────────────────────────────────
--   8 female profiles  (seen by Ibrahim & Yusuf)
--   8 male profiles    (seen by Amira & Fatima)
--
-- Introduction requests pre-loaded
-- ─────────────────────────────────
--   Ibrahim → Zainab     (pending)
--   Yusuf   → Maryam     (accepted)
--   Amira   → Adam       (pending)
--   Fatima  → Omar       (declined)
--
-- Events
-- ──────
--   2 upcoming, 1 past
-- ============================================================


-- ============================================================
-- CLEANUP: remove any previous demo seed (safe to re-run)
-- ============================================================

DELETE FROM public.zawaaj_introduction_requests
WHERE requesting_profile_id IN (
  SELECT id FROM public.zawaaj_profiles WHERE import_batch_ref = 'demo_seed_v1'
);

DELETE FROM public.zawaaj_saved_profiles
WHERE profile_id  IN (SELECT id FROM public.zawaaj_profiles WHERE import_batch_ref = 'demo_seed_v1')
   OR saved_by    IN (SELECT id FROM public.zawaaj_profiles WHERE import_batch_ref = 'demo_seed_v1');

DELETE FROM public.zawaaj_browse_state
WHERE profile_id IN (SELECT id FROM public.zawaaj_profiles WHERE import_batch_ref = 'demo_seed_v1');

DELETE FROM public.zawaaj_user_settings
WHERE user_id IN (
  SELECT primary_user_id FROM public.zawaaj_family_accounts
  WHERE contact_email LIKE '%@demo.zawaaj.uk'
);

DELETE FROM public.zawaaj_profiles WHERE import_batch_ref = 'demo_seed_v1';

DELETE FROM public.zawaaj_family_accounts WHERE contact_email LIKE '%@demo.zawaaj.uk';

DELETE FROM public.zawaaj_events WHERE id::text LIKE '77000000%';

DELETE FROM auth.users WHERE email LIKE '%@demo.zawaaj.uk';


-- ============================================================
-- SECTION 1 — Auth users (tester login accounts)
-- Password for all: Tester123!
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role, created_at, updated_at
)
VALUES
  -- Female testers
  (
    '11000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'amira@demo.zawaaj.uk',
    crypt('Tester123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    'authenticated', 'authenticated', now(), now()
  ),
  (
    '11000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'fatima@demo.zawaaj.uk',
    crypt('Tester123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    'authenticated', 'authenticated', now(), now()
  ),
  -- Male testers
  (
    '11000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'ibrahim@demo.zawaaj.uk',
    crypt('Tester123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    'authenticated', 'authenticated', now(), now()
  ),
  (
    '11000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'yusuf@demo.zawaaj.uk',
    crypt('Tester123!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    'authenticated', 'authenticated', now(), now()
  )
;


-- ============================================================
-- SECTION 2 — Family accounts (linked to auth users)
-- ============================================================

INSERT INTO public.zawaaj_family_accounts (
  id,
  contact_full_name, contact_relationship, contact_number, contact_email,
  primary_user_id,
  status, registration_path,
  terms_agreed, terms_agreed_at,
  onboarding_state,
  no_female_contact_flag, father_explanation,
  created_at, updated_at
)
VALUES
  (
    '22000000-0000-0000-0000-000000000001',
    'Amira Khan', 'mother', '+44 7700 900001', 'amira@demo.zawaaj.uk',
    '11000000-0000-0000-0000-000000000001',
    'active', 'child', true, now(), 'activated', false, '', now(), now()
  ),
  (
    '22000000-0000-0000-0000-000000000002',
    'Fatima Rahman', 'mother', '+44 7700 900002', 'fatima@demo.zawaaj.uk',
    '11000000-0000-0000-0000-000000000002',
    'active', 'child', true, now(), 'activated', false, '', now(), now()
  ),
  (
    '22000000-0000-0000-0000-000000000003',
    'Ibrahim Ahmed', 'mother', '+44 7700 900003', 'ibrahim@demo.zawaaj.uk',
    '11000000-0000-0000-0000-000000000003',
    'active', 'child', true, now(), 'activated', false, '', now(), now()
  ),
  (
    '22000000-0000-0000-0000-000000000004',
    'Yusuf Malik', 'mother', '+44 7700 900004', 'yusuf@demo.zawaaj.uk',
    '11000000-0000-0000-0000-000000000004',
    'active', 'child', true, now(), 'activated', false, '', now(), now()
  )
;


-- ============================================================
-- SECTION 3 — Tester profiles (can log in, status = approved)
-- ============================================================

INSERT INTO public.zawaaj_profiles (
  id, user_id, family_account_id,
  display_initials, first_name, last_name, gender,
  date_of_birth, age_display, location, place_of_birth, nationality,
  ethnicity, languages_spoken,
  profession_detail, education_level,
  school_of_thought, religiosity, prayer_regularity,
  wears_hijab, keeps_beard,
  marital_status, has_children,
  height, living_situation,
  open_to_relocation, open_to_partners_children,
  bio,
  pref_age_min, pref_age_max,
  pref_location, pref_ethnicity, pref_school_of_thought,
  pref_relocation, pref_partner_children,
  islamic_background,
  status, listed_at,
  consent_given, terms_agreed,
  created_by_child, profile_complete,
  import_batch_ref, created_at, updated_at
)
VALUES
  -- ── Amira — female tester ──────────────────────────────────
  (
    '33000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'A.K.', 'Amira', 'Khan', 'female',
    '1999-03-14', '26', 'London', 'London', 'British',
    'British Pakistani', ARRAY['English','Urdu'],
    'Pharmacist', 'Undergraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    true, null,
    'Never married', false,
    '5''4"', 'With family',
    'Possibly', 'Yes',
    'Assalamu alaikum. I am a pharmacist based in East London with a love of reading, cooking, and spending time with family. I am looking for a practising, kind-hearted partner who values deen above all else.',
    24, 34,
    'London / UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Possibly', 'Yes',
    'born_muslim',
    'approved', now() - interval '3 days',
    true, true, true, true,
    'demo_seed_v1', now(), now()
  ),
  -- ── Fatima — female tester ─────────────────────────────────
  (
    '33000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000002',
    'F.R.', 'Fatima', 'Rahman', 'female',
    '1996-07-22', '29', 'Birmingham', 'Birmingham', 'British',
    'British Bangladeshi', ARRAY['English','Bengali / Sylheti'],
    'Secondary school teacher', 'Postgraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    true, null,
    'Never married', false,
    '5''3"', 'With family',
    'Yes', 'Yes',
    'I am a secondary school teacher in Birmingham, passionate about education and community. I enjoy hiking, volunteering, and reading Islamic history. Looking for someone grounded, family-oriented and committed to their deen.',
    27, 36,
    'Midlands / UK', 'Open', ARRAY['Hanafi'],
    'Yes', 'Yes',
    'born_muslim',
    'approved', now() - interval '1 day',
    true, true, true, true,
    'demo_seed_v1', now(), now()
  ),
  -- ── Ibrahim — male tester ──────────────────────────────────
  (
    '33000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000003',
    '22000000-0000-0000-0000-000000000003',
    'I.A.', 'Ibrahim', 'Ahmed', 'male',
    '1997-11-05', '27', 'Manchester', 'Manchester', 'British',
    'British Pakistani', ARRAY['English','Urdu','Punjabi'],
    'Software Engineer', 'Undergraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    null, true,
    'Never married', false,
    '5''10"', 'With family',
    'Possibly', 'Yes',
    'I am a software engineer in Manchester, alhamdulillah working in a role I enjoy. I value honesty, good character, and a strong family bond. I enjoy football, reading, and personal projects in my spare time.',
    22, 30,
    'UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Possibly', 'Yes',
    'born_muslim',
    'approved', now() - interval '5 days',
    true, true, true, true,
    'demo_seed_v1', now(), now()
  ),
  -- ── Yusuf — male tester ────────────────────────────────────
  (
    '33000000-0000-0000-0000-000000000004',
    '11000000-0000-0000-0000-000000000004',
    '22000000-0000-0000-0000-000000000004',
    'Y.M.', 'Yusuf', 'Malik', 'male',
    '1994-02-28', '31', 'London', 'Karachi', 'British',
    'British Pakistani', ARRAY['English','Urdu','Arabic'],
    'Junior Doctor', 'Postgraduate degree',
    'Hanafi', 'steadfast', 'Yes, regularly',
    null, true,
    'Never married', false,
    '6''0"', 'With family',
    'Yes', 'Yes',
    'Alhamdulillah working as a junior doctor in London. I am family-oriented and deeply value my deen. I enjoy reading, cooking, and outdoor activities. Seeking a practising partner with good character and similar values.',
    24, 32,
    'London', 'Open', ARRAY['Hanafi'],
    'Yes', 'Yes',
    'born_muslim',
    'approved', now() - interval '7 days',
    true, true, true, true,
    'demo_seed_v1', now(), now()
  )
;


-- ============================================================
-- SECTION 4 — User settings (active profile pointers)
-- ============================================================

INSERT INTO public.zawaaj_user_settings (user_id, active_profile_id, created_at, updated_at)
VALUES
  ('11000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', now(), now()),
  ('11000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002', now(), now()),
  ('11000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000003', now(), now()),
  ('11000000-0000-0000-0000-000000000004', '33000000-0000-0000-0000-000000000004', now(), now())
;


-- ============================================================
-- SECTION 5 — Browse target profiles (no auth login required)
-- ============================================================

-- ── Female profiles (seen by male testers: Ibrahim, Yusuf) ──

INSERT INTO public.zawaaj_profiles (
  id, display_initials, first_name, last_name, gender,
  date_of_birth, age_display, location, place_of_birth, nationality,
  ethnicity, languages_spoken,
  profession_detail, education_level,
  school_of_thought, religiosity, prayer_regularity,
  wears_hijab, marital_status, has_children,
  height, living_situation,
  open_to_relocation, open_to_partners_children,
  bio,
  pref_age_min, pref_age_max,
  pref_location, pref_ethnicity, pref_school_of_thought,
  pref_relocation, pref_partner_children,
  islamic_background,
  status, listed_at,
  consent_given, terms_agreed,
  import_batch_ref, created_at, updated_at
)
VALUES
  (
    '44000000-0000-0000-0000-000000000001',
    'Z.H.', 'Zainab', 'Hussain', 'female',
    '1998-05-10', '27', 'London', 'London', 'British',
    'British Pakistani', ARRAY['English','Urdu'],
    'Nurse', 'Undergraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    true, 'Never married', false,
    '5''4"', 'With family', 'Possibly', 'Yes',
    'Alhamdulillah working as a nurse in London. I have a quiet nature but love spending time with family and close friends. I''m looking for a kind, stable partner who takes his deen seriously.',
    26, 35, 'London / UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '2 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000002',
    'M.B.', 'Maryam', 'Begum', 'female',
    '1995-09-18', '30', 'Birmingham', 'Dhaka', 'British',
    'British Bangladeshi', ARRAY['English','Bengali / Sylheti'],
    'Accountant', 'Postgraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    true, 'Never married', false,
    '5''2"', 'With family', 'Yes', 'Yes',
    'I grew up in Birmingham and work as an accountant. I''m family-oriented, warm, and enjoy cooking and community volunteering. I''m looking for someone who is settled, deen-focused, and kind.',
    28, 38, 'Midlands / UK', 'Open', ARRAY['Hanafi'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '4 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000003',
    'S.A.', 'Sara', 'Ahmed', 'female',
    '2000-01-23', '25', 'Leicester', 'Leicester', 'British',
    'British Pakistani', ARRAY['English','Urdu'],
    'Graduate student', 'Postgraduate degree',
    'Hanafi', 'striving', 'Mostly',
    true, 'Never married', false,
    '5''5"', 'With family', 'Possibly', 'Yes',
    'Currently finishing a master''s in psychology. I value growth, deep conversations, and faith. I love hiking, journalling, and anything to do with nature. Looking for someone sincere and open-minded.',
    24, 32, 'Midlands / UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '8 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000004',
    'L.K.', 'Layla', 'Khan', 'female',
    '1997-04-07', '28', 'Manchester', 'Manchester', 'British',
    'British Pakistani', ARRAY['English','Urdu','Punjabi'],
    'Civil Engineer', 'Undergraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    false, 'Never married', false,
    '5''6"', 'With family', 'Yes', 'Yes',
    'I work as a civil engineer and find my work meaningful. Outside work I love reading, badminton, and visiting family. I''m calm, practical, and looking for a sincere, grounded partner.',
    26, 36, 'UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '10 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000005',
    'N.I.', 'Nadia', 'Iqbal', 'female',
    '1993-12-30', '32', 'London', 'Karachi', 'British',
    'British Pakistani', ARRAY['English','Urdu'],
    'Solicitor', 'Postgraduate degree',
    'Hanafi', 'steadfast', 'Yes, regularly',
    true, 'Divorced', false,
    '5''3"', 'Independently', 'Possibly', 'Yes',
    'I am a solicitor in London — settled and independent. I have a warm circle of family and friends. I am open and hopeful about finding the right partner: someone patient, mature, and deen-conscious.',
    30, 42, 'London', 'Open', ARRAY['Hanafi'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '12 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000006',
    'H.A.', 'Hana', 'Ali', 'female',
    '1999-08-15', '26', 'Glasgow', 'Glasgow', 'British',
    'British Somali', ARRAY['English','Somali','Arabic'],
    'Junior doctor', 'Postgraduate degree',
    'General Sunni', 'practising', 'Yes, regularly',
    true, 'Never married', false,
    '5''5"', 'With family', 'Yes', 'Yes',
    'Glasgow-based junior doctor with a love of travel, cooking, and learning. My faith and family are central to my life. Looking for a practising, ambitious partner with a gentle heart.',
    26, 35, 'Scotland / UK', 'Open', ARRAY['General Sunni','Hanafi','Shafi''i'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '14 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000007',
    'R.M.', 'Ruqayyah', 'Mahmoud', 'female',
    '1996-03-11', '29', 'London', 'Cairo', 'British',
    'British Arab', ARRAY['English','Arabic','French'],
    'Architect', 'Undergraduate degree',
    'General Sunni', 'practising', 'Mostly',
    true, 'Never married', false,
    '5''4"', 'With family', 'Possibly', 'Yes',
    'I work as an architect in London and love what I do. I enjoy art, travel, and exploring different cultures. Arabic culture is close to my heart. Looking for a kind, educated partner with strong values.',
    27, 36, 'London / UK', 'Open', ARRAY['General Sunni','Shafi''i','Hanafi'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '18 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '44000000-0000-0000-0000-000000000008',
    'A.T.', 'Aisha', 'Tariq', 'female',
    '2001-06-04', '24', 'Leeds', 'Leeds', 'British',
    'British Pakistani', ARRAY['English','Urdu'],
    'Dental student', 'Undergraduate degree',
    'Hanafi', 'striving', 'Mostly',
    true, 'Never married', false,
    '5''2"', 'With family', 'No', 'Yes',
    'Final-year dental student in Leeds. I am close to my family and enjoy cooking, reading Quran, and spending time outdoors. Looking for someone who is settled, kind, and serious about marriage.',
    24, 31, 'North England / UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'No', 'Yes', 'born_muslim',
    'approved', now() - interval '20 days',
    true, true, 'demo_seed_v1', now(), now()
  )
;


-- ── Male profiles (seen by female testers: Amira, Fatima) ───

INSERT INTO public.zawaaj_profiles (
  id, display_initials, first_name, last_name, gender,
  date_of_birth, age_display, location, place_of_birth, nationality,
  ethnicity, languages_spoken,
  profession_detail, education_level,
  school_of_thought, religiosity, prayer_regularity,
  keeps_beard, marital_status, has_children,
  height, living_situation,
  open_to_relocation, open_to_partners_children,
  bio,
  pref_age_min, pref_age_max,
  pref_location, pref_ethnicity, pref_school_of_thought,
  pref_relocation, pref_partner_children,
  islamic_background,
  status, listed_at,
  consent_given, terms_agreed,
  import_batch_ref, created_at, updated_at
)
VALUES
  (
    '55000000-0000-0000-0000-000000000001',
    'A.H.', 'Adam', 'Hassan', 'male',
    '1995-07-21', '30', 'London', 'London', 'British',
    'British Somali', ARRAY['English','Somali','Arabic'],
    'Financial Analyst', 'Undergraduate degree',
    'General Sunni', 'practising', 'Yes, regularly',
    true, 'Never married', false,
    '5''11"', 'With family', 'Possibly', 'Yes',
    'Alhamdulillah working in finance in London. I am calm, direct, and family-oriented. My deen and my family are my anchors. I enjoy reading Islamic books, cooking, and keeping fit. Looking for a sincere, practising partner.',
    23, 32, 'London / UK', 'Open', ARRAY['General Sunni','Hanafi','Shafi''i'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '1 day',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000002',
    'O.R.', 'Omar', 'Rashid', 'male',
    '1993-04-14', '32', 'Birmingham', 'Karachi', 'British',
    'British Pakistani', ARRAY['English','Urdu','Punjabi'],
    'Secondary school teacher', 'Postgraduate degree',
    'Hanafi', 'steadfast', 'Yes, regularly',
    true, 'Never married', false,
    '5''10"', 'With family', 'Yes', 'Yes',
    'I teach secondary school in Birmingham and find great meaning in it. I am grounded, patient, and community-minded. Outside school I love reading, football, and family gatherings. Seeking a kind, deen-focused partner.',
    24, 35, 'Midlands / UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '3 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000003',
    'Z.K.', 'Zakariyya', 'Khan', 'male',
    '1997-10-09', '28', 'Manchester', 'Manchester', 'British',
    'British Pakistani', ARRAY['English','Urdu'],
    'Architect', 'Undergraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    true, 'Never married', false,
    '6''1"', 'With family', 'Possibly', 'Yes',
    'I am an architect in Manchester, passionate about design and craft. My faith shapes everything I do. I enjoy hiking, cooking, and reading. Looking for someone warm, family-oriented, and serious about marriage.',
    23, 32, 'UK', 'Open', ARRAY['Hanafi'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '6 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000004',
    'D.A.', 'Daud', 'Ali', 'male',
    '1992-01-30', '33', 'London', 'Dhaka', 'British',
    'British Bangladeshi', ARRAY['English','Bengali / Sylheti'],
    'Pharmacist', 'Undergraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    false, 'Divorced', false,
    '5''9"', 'Independently', 'Yes', 'Yes',
    'I am a pharmacist in London. After a difficult chapter I am looking to build a new, stable home. I value honesty, patience, and mutual respect. I love cooking, voluntary work, and Friday circles.',
    26, 38, 'London', 'Open', ARRAY['Hanafi','General Sunni'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '9 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000005',
    'S.M.', 'Sulayman', 'Malik', 'male',
    '1998-03-25', '27', 'Leeds', 'Leeds', 'British',
    'British Pakistani', ARRAY['English','Urdu','Punjabi'],
    'Solicitor', 'Postgraduate degree',
    'Hanafi', 'practising', 'Mostly',
    true, 'Never married', false,
    '5''11"', 'With family', 'Possibly', 'Yes',
    'Newly qualified solicitor in Leeds. I''m ambitious but family-focused — my parents and siblings are very important to me. I enjoy reading, cycling, and Islamic circles. Looking for a practising partner with a good heart.',
    22, 31, 'North England / UK', 'Open', ARRAY['Hanafi','General Sunni'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '11 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000006',
    'H.U.', 'Hamza', 'Usman', 'male',
    '1994-08-12', '31', 'London', 'London', 'British',
    'British Pakistani', ARRAY['English','Urdu','Arabic'],
    'Data scientist', 'Postgraduate degree',
    'Hanafi', 'steadfast', 'Yes, regularly',
    true, 'Never married', false,
    '6''0"', 'With family', 'Yes', 'Yes',
    'Data scientist based in London. I love learning — whether it''s a new skill, a book, or an Islamic lecture. I am calm, thoughtful, and deeply family-oriented. Seeking a sincere, knowledgeable partner.',
    25, 33, 'London', 'Open', ARRAY['Hanafi'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '15 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000007',
    'I.N.', 'Ismail', 'Noor', 'male',
    '1996-05-20', '29', 'Glasgow', 'Mogadishu', 'British',
    'British Somali', ARRAY['English','Somali','Arabic'],
    'GP doctor', 'Postgraduate degree',
    'General Sunni', 'steadfast', 'Yes, regularly',
    true, 'Never married', false,
    '6''1"', 'With family', 'Yes', 'Yes',
    'GP in Glasgow, alhamdulillah. I spend my time between the clinic, the masjid, and my family. I love cooking Somali food, reading, and outdoor adventures. Looking for a practising, homely partner.',
    24, 33, 'Scotland / UK', 'Open', ARRAY['General Sunni','Shafi''i','Hanafi'],
    'Yes', 'Yes', 'born_muslim',
    'approved', now() - interval '17 days',
    true, true, 'demo_seed_v1', now(), now()
  ),
  (
    '55000000-0000-0000-0000-000000000008',
    'A.Q.', 'Adnan', 'Qureshi', 'male',
    '1991-11-15', '34', 'London', 'Lahore', 'British',
    'British Pakistani', ARRAY['English','Urdu','Punjabi'],
    'Senior Manager', 'Postgraduate degree',
    'Hanafi', 'practising', 'Yes, regularly',
    true, 'Divorced', false,
    '5''10"', 'With family', 'Possibly', 'Yes',
    'Senior manager in London''s tech sector, established and settled. I divorced amicably several years ago and have grown a great deal since. I value loyalty, laughter, and a strong Islamic household.',
    28, 40, 'London', 'Open', ARRAY['Hanafi','General Sunni'],
    'Possibly', 'Yes', 'born_muslim',
    'approved', now() - interval '22 days',
    true, true, 'demo_seed_v1', now(), now()
  )
;


-- ============================================================
-- SECTION 6 — Introduction requests (pre-loaded test states)
-- ============================================================

INSERT INTO public.zawaaj_introduction_requests (
  id, requesting_profile_id, target_profile_id,
  status, created_at, expires_at, responded_at
)
VALUES
  -- Ibrahim → Zainab (pending — just sent)
  (
    '66000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000003',
    '44000000-0000-0000-0000-000000000001',
    'pending', now(), now() + interval '30 days', null
  ),
  -- Yusuf → Maryam (accepted — responded 3 days ago)
  (
    '66000000-0000-0000-0000-000000000002',
    '33000000-0000-0000-0000-000000000004',
    '44000000-0000-0000-0000-000000000002',
    'accepted', now() - interval '5 days', now() + interval '25 days', now() - interval '3 days'
  ),
  -- Amira → Adam (pending — sent yesterday)
  (
    '66000000-0000-0000-0000-000000000003',
    '33000000-0000-0000-0000-000000000001',
    '55000000-0000-0000-0000-000000000001',
    'pending', now() - interval '1 day', now() + interval '29 days', null
  ),
  -- Fatima → Omar (declined — responded 8 days ago)
  (
    '66000000-0000-0000-0000-000000000004',
    '33000000-0000-0000-0000-000000000002',
    '55000000-0000-0000-0000-000000000002',
    'declined', now() - interval '10 days', now() + interval '20 days', now() - interval '8 days'
  )
;


-- ============================================================
-- SECTION 7 — Events
-- ============================================================

INSERT INTO public.zawaaj_events (
  id, title, event_date, location_text,
  registration_url, status, attendance_note,
  show_in_history, event_category, organiser,
  is_featured, price_gbp,
  created_at, updated_at
)
VALUES
  (
    '77000000-0000-0000-0000-000000000001',
    'Zawaaj Family Information Evening — London',
    now() + interval '3 weeks',
    'East London Masjid, Whitechapel Road, London E1 1JX',
    'https://zawaaj.uk/events/london-info-evening',
    'upcoming',
    'An informal evening for families to learn about the Zawaaj process. Sisters'' and brothers'' sections are held separately.',
    true, 'community', 'zawaaj', true, 0,
    now(), now()
  ),
  (
    '77000000-0000-0000-0000-000000000002',
    'Zawaaj Family Information Evening — Birmingham',
    now() + interval '5 weeks',
    'Birmingham Central Mosque, 180 Belgrave Middleway, Birmingham B12 0XS',
    'https://zawaaj.uk/events/birmingham-info-evening',
    'upcoming',
    'An informal evening for families based in the Midlands. Light refreshments provided.',
    true, 'community', 'zawaaj', false, 0,
    now(), now()
  ),
  (
    '77000000-0000-0000-0000-000000000003',
    'Zawaaj Q&A Webinar — How the Introduction Process Works',
    now() - interval '2 weeks',
    'Online (Zoom)',
    null,
    'ended',
    'Recording available on request — contact hello@zawaaj.uk.',
    true, 'webinar', 'zawaaj', false, 0,
    now(), now()
  );


-- ============================================================
-- VERIFICATION SUMMARY
-- ============================================================

SELECT
  (SELECT count(*) FROM auth.users           WHERE email LIKE '%@demo.zawaaj.uk')      AS auth_users,
  (SELECT count(*) FROM public.zawaaj_family_accounts WHERE contact_email LIKE '%@demo.zawaaj.uk') AS family_accounts,
  (SELECT count(*) FROM public.zawaaj_profiles WHERE import_batch_ref = 'demo_seed_v1') AS profiles,
  (SELECT count(*) FROM public.zawaaj_introduction_requests WHERE id::text LIKE '66000000%') AS intros,
  (SELECT count(*) FROM public.zawaaj_events WHERE id::text LIKE '77000000%')           AS events;
