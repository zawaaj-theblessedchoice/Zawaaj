-- Fix: infinite recursion in RLS admin policies.
--
-- The original admin policies queried zawaaj_profiles FROM WITHIN a policy
-- ON zawaaj_profiles, creating an infinite loop.  The fix wraps the check
-- in a SECURITY DEFINER function so it runs as the function owner (bypassing
-- RLS entirely for that one internal lookup).

create or replace function public.zawaaj_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.zawaaj_profiles
    where user_id = auth.uid() and is_admin = true
  );
$$;

grant execute on function public.zawaaj_is_admin() to anon, authenticated;

-- Drop recursive policies
drop policy if exists "zp: admin all" on public.zawaaj_profiles;
drop policy if exists "zi: admin all" on public.zawaaj_interests;
drop policy if exists "zm: admin all" on public.zawaaj_matches;
drop policy if exists "ze: admin all" on public.zawaaj_events;

-- Recreate using the safe helper function
create policy "zp: admin all"
  on public.zawaaj_profiles for all
  using (public.zawaaj_is_admin());

create policy "zi: admin all"
  on public.zawaaj_interests for all
  using (public.zawaaj_is_admin());

create policy "zm: admin all"
  on public.zawaaj_matches for all
  using (public.zawaaj_is_admin());

create policy "ze: admin all"
  on public.zawaaj_events for all
  using (public.zawaaj_is_admin());
