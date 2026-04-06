-- Checks whether an email address already has an auth.users account.
-- Used by the signup API to give early feedback at step 0, before the user
-- fills out the full registration wizard.
--
-- SECURITY DEFINER runs as the function owner (postgres) so it can read
-- auth.users without exposing the table through PostgREST.

create or replace function public.zawaaj_email_exists(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
  );
$$;

grant execute on function public.zawaaj_email_exists(text) to anon, authenticated;
