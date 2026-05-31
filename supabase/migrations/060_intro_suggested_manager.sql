-- 060_intro_suggested_manager.sql
-- Adds suggested_manager_id to zawaaj_introduction_requests.
-- Populated automatically when an intro becomes mutual (status='accepted')
-- by scoring active managers against the two profiles' city, ethnicity,
-- language, and gender. Admin can override by assigning any manager.

ALTER TABLE zawaaj_introduction_requests
  ADD COLUMN IF NOT EXISTS suggested_manager_id UUID REFERENCES zawaaj_managers(id);
