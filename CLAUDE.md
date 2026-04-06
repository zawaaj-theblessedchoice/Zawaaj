@AGENTS.md

# Zawaaj — Claude Code Session Context

## Project Overview
Zawaaj is a **private, invite-only Muslim matrimonial platform** at **zawaaj.uk**.
- Hosted on **Vercel** (production), connected to **Supabase project `nxytwfbzoxatyupqccba`**
- MVP — keep scope tight, no over-engineering

---

## Tech Stack

| Layer | Detail |
|---|---|
| Framework | **Next.js 16.2.2** — App Router, TypeScript |
| React | **19.2.4** |
| CSS | **Tailwind CSS v4** — uses `@import "tailwindcss"` in globals.css. NO `tailwind.config.js`. NO `@tailwind` directives. |
| Auth/DB | **Supabase** via `@supabase/ssr ^0.10.0` |
| Route protection | **`src/proxy.ts`** — Next.js 16 renames `middleware.ts` to `proxy.ts`, exports `proxy()` not `middleware()` |

### Next.js 16 key differences
- Route protection file: `src/proxy.ts` (NOT `middleware.ts`)
- `cookies()` from `next/headers` is **async** — always `await cookies()`
- Refer to `node_modules/next/dist/docs/` before writing any Next.js code

### Supabase client usage
- **Browser/Client components**: `import { createClient } from '@/lib/supabase/client'` → `createBrowserClient`
- **Server components / Route handlers**: `import { createClient } from '@/lib/supabase/server'` → async `createServerClient` with `await cookies()`
- **Proxy (proxy.ts)**: inline `createServerClient` directly (cookies via request object, not `next/headers`)
- **Admin/server-only**: `import { supabaseAdmin } from '@/lib/supabase/admin'` → service role client, bypasses RLS

---

## Brand

| Token | Value |
|---|---|
| Gold | `#B8960C` |
| Dark background | `#111111` / CSS var `--surface` |
| Card surface | `#1A1A1A` / CSS var `--surface-2` |
| Input surface | CSS var `--surface-3` |
| Border | CSS var `--border-default` |
| Gold border | CSS var `--border-gold` |
| Female avatar bg | `#EEEDFE` |
| Female avatar text | `#534AB7` |
| Male avatar bg | `#E6F1FB` |
| Male avatar text | `#185FA5` |
| Font | Inter via Geist (`--font-geist-sans`) |

The entire app uses a **dark theme**. Use CSS variables (`var(--surface)`, `var(--text-primary)`, etc.) for member-facing pages. The admin dashboard uses Tailwind dark classes (`bg-[#111111]`, `text-white`, `border-white/10`).

---

## Database — Supabase (public schema, `zawaaj_` prefix)

All tables coexist with another application on the same Supabase project. The `zawaaj_` prefix prevents collisions.

### `zawaaj_profiles`
Core member record. One user can technically have multiple profiles (legacy import) but `zawaaj_user_settings.active_profile_id` tracks which one is active.

Key columns:
- `id` uuid PK, `user_id` uuid → auth.users
- `legacy_ref` text, `imported_email` text
- `display_initials` text NOT NULL
- `first_name` text, `last_name` text
- `gender` text CHECK ('male','female')
- `date_of_birth` date, `age_display` text, `height` text
- `ethnicity` text, `nationality` text, `school_of_thought` text
- `education_level` text, `education_detail` text
- `profession_sector` text, `profession_detail` text
- `location` text, `languages_spoken` text
- `bio` text, `religiosity` text, `prayer_regularity` text
- `wears_hijab` boolean, `keeps_beard` boolean
- `marital_status` text, `has_children` boolean, `living_situation` text
- `open_to_relocation` text, `open_to_partners_children` text, `polygamy_openness` text
- `pref_age_min` int, `pref_age_max` int, `pref_location` text, `pref_ethnicity` text
- `pref_school_of_thought` text[], `pref_relocation` text, `pref_partner_children` text
- `attributes` text[], `spouse_preferences` text[]
- `admin_comments` text, `admin_notes` text
- `is_admin` boolean DEFAULT false
- `status` text CHECK ('pending','approved','paused','rejected','withdrawn','suspended','introduced','unlinked')
- `withdrawal_reason` text
- `contact_number` text, `guardian_name` text
- `consent_given` boolean, `terms_agreed` boolean
- `interests_this_month` int DEFAULT 0, `interests_reset_date` date
- `duplicate_flag` boolean
- `listed_at` timestamptz — set when profile is approved, used for "new" badge in browse
- `submitted_date` timestamptz, `approved_date` timestamptz
- `created_at`, `updated_at` timestamptz

### `zawaaj_introduction_requests`
Tracks introduction requests between profiles (replaces old `zawaaj_interests` table).

Key columns:
- `id` uuid PK
- `requesting_profile_id` uuid → zawaaj_profiles
- `target_profile_id` uuid → zawaaj_profiles
- `status` text CHECK ('pending','mutual','facilitated','expired','withdrawn')
- `created_at` timestamptz, `expires_at` timestamptz

API: `POST /api/introduction-requests` with `{ target_profile_id }` — enforces monthly limit, status checks, duplicate detection.

### `zawaaj_matches`
Created when two interests are mutual and admin progresses them.

Key columns:
- `id` uuid PK
- `profile_a_id` uuid, `profile_b_id` uuid → zawaaj_profiles
- `mutual_date` timestamptz
- `status` text CHECK ('awaiting_admin','admin_reviewing','introduced','nikah','no_longer_proceeding','dismissed')
- `admin_notified_date` timestamptz, `introduced_date` timestamptz
- `family_a_consented` boolean, `family_b_consented` boolean
- `outcome` text, `outcome_date` timestamptz
- `admin_notes` text

### `zawaaj_events`
Community events shown to members.

Key columns:
- `id` uuid PK
- `title` text, `event_date` timestamptz, `location_text` text
- `registration_url` text
- `status` text CHECK ('upcoming','ended','archived')
- `attendance_note` text, `show_in_history` boolean

### `zawaaj_user_settings`
Maps auth user → their active profile.

Key columns:
- `id` uuid PK, `user_id` uuid UNIQUE → auth.users
- `active_profile_id` uuid → zawaaj_profiles (ON DELETE SET NULL)
- `created_at`, `updated_at` timestamptz

### `zawaaj_saved_profiles`
Shortlist / saved profiles per member.

Key columns:
- `id` uuid PK
- `profile_id` uuid — the profile doing the saving
- `saved_profile_id` uuid — the profile being saved
- `saved_by` uuid — also the saver's profile_id (used in queries)

### `zawaaj_browse_state`
Tracks when each member last visited the browse page (used for "new since your last visit" count).

Key columns:
- `id` uuid PK
- `profile_id` uuid UNIQUE → zawaaj_profiles
- `last_browsed_at` timestamptz

---

## Key SQL Functions (SECURITY DEFINER)

- `zawaaj_is_admin()` → boolean — checks `zawaaj_profiles.is_admin = true` for current user. Used in RLS policies and browse page admin redirect.
- `zawaaj_email_exists(p_email text)` → boolean — checks `auth.users` for email existence. Called by `/api/check-email` at signup step 0.

---

## Business Rules

1. **Introduction request limit**: 5 requests per profile per calendar month. Tracked in `zawaaj_profiles.interests_this_month` + `interests_reset_date`. Reset on the 1st of each month.
2. **Request expiry**: Requests expire after **30 days** (`expires_at = created_at + 30 days`). Status → 'expired'.
3. **No self-request**: DB constraint `requesting_profile_id <> target_profile_id`.
4. **No sibling-request**: Enforced at application layer (admin flags `duplicate_flag` on related profiles).
5. **Bilateral consent before introduction**: Both `family_a_consented` AND `family_b_consented` must be true before admin marks a match as 'introduced'.
6. **Introduction flow**: mutual request → admin reviews → admin contacts both families → verbal consent captured → admin updates match status to 'introduced'.
7. **Status lifecycle** (profile): pending → approved → (paused | introduced | withdrawn | suspended | rejected)
8. **Status lifecycle** (introduction request): pending → (mutual | facilitated | expired | withdrawn)
9. **Status lifecycle** (match): awaiting_admin → admin_reviewing → (introduced → nikah | no_longer_proceeding | dismissed)
10. **Browse filters**: Members only see opposite-gender approved profiles. Admins bypass browse and go directly to `/admin`.
11. **Email check at signup**: Step 0 of signup calls `/api/check-email` before advancing, so users learn immediately if their email is taken.

---

## Roles

### Member
- `is_admin = false` on their profile
- Can browse approved opposite-gender profiles (`/browse`)
- Can send/view their own introduction requests (`/introductions`)
- Can shortlist profiles
- Can edit their own profile (`/my-profile`)
- Can pause or withdraw their profile

### Admin
- `is_admin = true` on their profile
- **First admin must be elevated manually via SQL** — signup never sets `is_admin = true`:
  ```sql
  UPDATE zawaaj_profiles SET is_admin = true, status = 'approved'
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
  ```
- If the admin has no profile row yet, create one first:
  ```sql
  WITH new_profile AS (
    INSERT INTO zawaaj_profiles (user_id, display_initials, is_admin, status, consent_given, terms_agreed)
    VALUES ('<user-id>', 'ZA', true, 'approved', true, true) RETURNING id
  )
  INSERT INTO zawaaj_user_settings (user_id, active_profile_id)
  SELECT '<user-id>', id FROM new_profile;
  ```
- Full access to all tables via `zawaaj_is_admin()` SECURITY DEFINER function (migration 002)
- Can approve/reject/suspend profiles
- Can manage matches and introductions
- Admin paths: `/admin/*`

---

## Sensitive Fields (admin-only — never expose to regular members)

- `contact_number`
- `guardian_name`
- `date_of_birth` (show `age_display` to members instead)
- `imported_email`
- `admin_notes`
- `admin_comments`
- `duplicate_flag`
- `withdrawal_reason` (only to the profile owner)

---

## Active Profile Concept

A user may have multiple profile rows (e.g. from legacy import + new signup). The **active profile** is `zawaaj_user_settings.active_profile_id`. All member-facing features operate on the active profile, not the user_id directly.

---

## Password Reset Flow (PKCE)

1. User visits `/forgot-password`, enters email
2. `resetPasswordForEmail` called with `redirectTo: https://zawaaj.uk/auth/callback?next=/auth/reset-password`
   - **Always uses `zawaaj.uk`** (via `NEXT_PUBLIC_SITE_URL` env var or hardcoded fallback) — never `window.location.origin`, which would fail from Vercel preview URLs
3. Supabase sends email with `?code=` link → user clicks → hits `/auth/callback`
4. `/auth/callback` exchanges code for session (PKCE), sets cookie, redirects to `/auth/reset-password`
5. Reset page calls `getSession()` on mount — if session exists, shows password form
6. `updateUser({ password })` → success → redirect to `/browse`

`https://zawaaj.uk/auth/callback` must be in **Supabase → Auth → URL Configuration → Redirect URLs allowlist**.

---

## File Structure

```
src/
  app/
    globals.css                    — @import "tailwindcss" (Tailwind v4) + CSS vars
    layout.tsx                     — Geist font, dark background
    page.tsx                       — root redirect (auth check → /browse or /login)
    login/                         — sign in page
    signup/                        — multi-step registration wizard (8 steps)
    pending/                       — post-signup pending approval page
    forgot-password/               — password reset request page
    auth/
      callback/route.ts            — PKCE code exchange (all OAuth + reset links land here)
      reset-password/              — new password form (uses session from cookie)
    browse/                        — member profile directory with filters/tabs (protected)
      BrowseClient.tsx             — client component: tabs, filters, cards
    profile/[id]/                  — individual profile view (protected)
    my-profile/                    — own profile management (protected)
    introductions/                 — sent introduction requests (protected)
      IntroductionsClient.tsx
    events/                        — events listing (protected)
    admin/                         — admin dashboard (admin-only)
      profile/[id]/                — admin individual profile view
    terms/                         — T&C (public)
    help/                          — FAQ (public)
    api/
      register/route.ts            — server-side signup (admin client, bypasses RLS)
      check-email/route.ts         — email existence check for signup step 0
      introduction-requests/route.ts — create intro requests (enforces limits + status checks)
  components/
    ZawaajLogo.tsx                 — <ZawaajLogo size={90} tagline={true} />
    Sidebar.tsx                    — persistent left nav for member pages
    AvatarInitials.tsx             — initials avatar with gender colour
    ProfileModal.tsx               — profile detail modal used in browse
  lib/
    supabase/
      client.ts                    — createClient() → createBrowserClient
      server.ts                    — async createClient() → createServerClient + await cookies()
      admin.ts                     — supabaseAdmin → service role client (server-only)
  proxy.ts                         — session refresh + route protection
supabase/
  migrations/
    001_initial_schema.sql
    002_fix_rls_recursion.sql      — zawaaj_is_admin() SECURITY DEFINER function
    003_schema_updates.sql
    004_brief_schema.sql
    005_email_exists_fn.sql        — zawaaj_email_exists() SECURITY DEFINER function
public/
  logo.png
  robots.txt                       — Disallow: / (no public indexing)
```

---

## Key Commands

```bash
# Development (port 3001)
node node_modules\next\dist\bin\next dev -p 3001

# Production build
node node_modules\next\dist\bin\next build

# Type check
npx tsc --noEmit
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://nxytwfbzoxatyupqccba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>        # server-only, never expose to client
NEXT_PUBLIC_SITE_URL=https://zawaaj.uk              # canonical origin for password reset emails
```

---

## Coding Conventions

- **No `any` types** without explicit justification in a comment
- Server components are the default — add `'use client'` only when needed (event handlers, hooks, browser APIs)
- All Supabase queries should handle errors explicitly
- Use CSS variables (`var(--surface)`, `var(--text-primary)` etc.) for member-facing pages; Tailwind dark classes for admin
- Keep components focused — extract sub-components when a file exceeds ~200 lines
- RLS is the security layer — never rely solely on UI to hide sensitive data
- Snake_case values in DB and form selects (e.g. `never_married`, `yes_regularly`) — use display maps for human-readable labels
