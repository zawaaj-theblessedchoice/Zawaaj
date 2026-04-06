-- Enable UUID extension
create extension if not exists "pgcrypto";

-- NOTE: Tables use a zawaaj_ prefix to coexist safely with an existing
-- public schema from another application on the same Supabase project.
-- Applied via Supabase MCP as migration "zawaaj_move_to_public_prefixed".

-- ============================================================
-- PROFILES
-- ============================================================
create table zawaaj_profiles (
  id                    uuid primary key default gen_random_uuid(),
  legacy_ref            text,
  imported_email        text,
  user_id               uuid references auth.users(id) on delete set null,
  display_initials      text not null,
  gender                text check (gender in ('male', 'female')),
  date_of_birth         date,
  age_display           text,
  height                text,
  ethnicity             text,
  school_of_thought     text,
  education_level       text,
  education_detail      text,
  profession_sector     text,
  profession_detail     text,
  location              text,
  attributes            text[],
  spouse_preferences    text,
  admin_comments        text,
  admin_notes           text,
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected', 'withdrawn', 'unlinked')),
  withdrawal_reason     text,
  contact_number        text,
  guardian_name         text,
  consent_given         boolean not null default false,
  terms_agreed          boolean not null default false,
  interests_this_month  int not null default 0,
  interests_reset_date  date,
  duplicate_flag        boolean not null default false,
  submitted_date        timestamptz default now(),
  approved_date         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index profiles_user_id_idx on profiles(user_id);
create index profiles_status_idx on profiles(status);
create index profiles_gender_idx on profiles(gender);

-- ============================================================
-- INTERESTS
-- ============================================================
create table interests (
  id                  uuid primary key default gen_random_uuid(),
  sender_profile_id   uuid not null references profiles(id) on delete cascade,
  recipient_profile_id uuid not null references profiles(id) on delete cascade,
  sent_date           timestamptz not null default now(),
  expires_date        timestamptz,
  status              text not null default 'pending'
                        check (status in ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  is_mutual           boolean not null default false,
  match_id            uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint no_self_interest check (sender_profile_id <> recipient_profile_id),
  constraint unique_interest unique (sender_profile_id, recipient_profile_id)
);

create index interests_sender_idx on interests(sender_profile_id);
create index interests_recipient_idx on interests(recipient_profile_id);
create index interests_status_idx on interests(status);

-- ============================================================
-- MATCHES
-- ============================================================
create table matches (
  id                    uuid primary key default gen_random_uuid(),
  profile_a_id          uuid not null references profiles(id) on delete cascade,
  profile_b_id          uuid not null references profiles(id) on delete cascade,
  mutual_date           timestamptz,
  status                text not null default 'active'
                          check (status in ('active', 'introduced', 'closed', 'unsuccessful')),
  admin_notified_date   timestamptz,
  family_a_consented    boolean not null default false,
  family_b_consented    boolean not null default false,
  introduced_date       timestamptz,
  outcome               text check (outcome in ('married', 'declined', 'no_response', 'other')),
  outcome_date          timestamptz,
  admin_notes           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint unique_match unique (profile_a_id, profile_b_id)
);

create index matches_profile_a_idx on matches(profile_a_id);
create index matches_profile_b_idx on matches(profile_b_id);
create index matches_status_idx on matches(status);

-- Add foreign key from interests to matches now that matches table exists
alter table interests
  add constraint interests_match_id_fk
  foreign key (match_id) references matches(id) on delete set null;

-- ============================================================
-- EVENTS
-- ============================================================
create table events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  event_date        timestamptz not null,
  location_text     text,
  registration_url  text,
  status            text not null default 'upcoming'
                      check (status in ('upcoming', 'completed', 'cancelled')),
  attendance_note   text,
  show_in_history   boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: users can read approved profiles; own profile always readable/writable
alter table profiles enable row level security;

create policy "Public can view approved profiles"
  on profiles for select
  using (status = 'approved');

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

-- Interests: users can see their own sent/received interests
alter table interests enable row level security;

create policy "Users can view their interests"
  on interests for select
  using (
    auth.uid() = (select user_id from profiles where id = sender_profile_id)
    or
    auth.uid() = (select user_id from profiles where id = recipient_profile_id)
  );

create policy "Users can send interests"
  on interests for insert
  with check (
    auth.uid() = (select user_id from profiles where id = sender_profile_id)
  );

-- Matches: users can view their own matches
alter table matches enable row level security;

create policy "Users can view their matches"
  on matches for select
  using (
    auth.uid() = (select user_id from profiles where id = profile_a_id)
    or
    auth.uid() = (select user_id from profiles where id = profile_b_id)
  );

-- Events: public read
alter table events enable row level security;

create policy "Public can view events"
  on events for select
  using (true);
