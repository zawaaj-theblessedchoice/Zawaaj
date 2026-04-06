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

---

## Brand

| Token | Value |
|---|---|
| Gold | `#B8960C` |
| Dark | `#1A1A1A` |
| Background | `#F8F6F1` |
| Female avatar bg | `#EEEDFE` |
| Female avatar text | `#534AB7` |
| Male avatar bg | `#E6F1FB` |
| Male avatar text | `#185FA5` |
| Font | Inter via Geist (`--font-geist-sans`) |

---

## Database — Supabase (public schema, `zawaaj_` prefix)

All tables coexist with another application on the same Supabase project. The `zawaaj_` prefix prevents collisions.

### `zawaaj_profiles`
Core member record. One user can technically have multiple profiles (legacy import) but `zawaaj_user_settings.active_profile_id` tracks which one is active.

Key columns:
- `id` uuid PK, `user_id` uuid → auth.users
- `legacy_ref` text, `imported_email` text
- `display_initials` text NOT NULL
- `gender` text CHECK ('male','female')
- `date_of_birth` date, `age_display` text, `height` text
- `ethnicity` text, `school_of_thought` text
- `education_level` text, `education_detail` text
- `profession_sector` text, `profession_detail` text
- `location` text
- `attributes` text[], `spouse_preferences` text[]
- `admin_comments` text, `admin_notes` text
- `is_admin` boolean DEFAULT false
- `status` text CHECK ('pending','approved','paused','rejected','withdrawn','suspended','introduced','unlinked')
- `withdrawal_reason` text
- `contact_number` text, `guardian_name` text
- `consent_given` boolean, `terms_agreed` boolean
- `interests_this_month` int DEFAULT 0, `interests_reset_date` date
- `duplicate_flag` boolean
- `submitted_date` timestamptz, `approved_date` timestamptz
- `created_at`, `updated_at` timestamptz

### `zawaaj_interests`
Tracks interest requests between profiles.

Key columns:
- `id` uuid PK
- `sender_profile_id` uuid → zawaaj_profiles
- `recipient_profile_id` uuid → zawaaj_profiles
- `sent_date` timestamptz, `expires_date` timestamptz
- `status` text CHECK ('active','expired','matched','withdrawn')
- `is_mutual` boolean, `match_id` uuid → zawaaj_matches
- Partial unique index `unique_active_interest` on (sender, recipient) WHERE status='active'

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

---

## Business Rules

1. **Interests limit**: 5 interests per profile per calendar month. Tracked in `zawaaj_profiles.interests_this_month` + `interests_reset_date`. Reset at start of each month.
2. **Interest expiry**: Interests expire after **30 days** (`expires_date = sent_date + 30 days`). Status → 'expired'.
3. **No self-interest**: DB constraint `sender_profile_id <> recipient_profile_id`.
4. **No sibling-interest**: Enforced at application layer (admin flags `duplicate_flag` on related profiles).
5. **Bilateral consent before introduction**: Both `family_a_consented` AND `family_b_consented` must be true before admin marks a match as 'introduced'.
6. **Introduction flow**: mutual interest → admin reviews → admin contacts both families → verbal consent captured → admin updates match status to 'introduced'.
7. **Status lifecycle** (profile): pending → approved → (paused | introduced | withdrawn | suspended | rejected)
8. **Status lifecycle** (interest): active → (expired | matched | withdrawn)
9. **Status lifecycle** (match): awaiting_admin → admin_reviewing → (introduced → nikah | no_longer_proceeding | dismissed)

---

## Roles

### Member
- `is_admin = false` on their profile
- Can browse approved profiles in directory (non-sensitive fields only)
- Can send/view their own interests
- Can view their own matches
- Can edit their own profile
- Can pause or withdraw their profile

### Admin
- `is_admin = true` on their profile
- Full access to all tables via `zawaaj_is_admin()` SECURITY DEFINER function (defined in migration 002)
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

## Existing File Structure

```
src/
  app/
    globals.css          — @import "tailwindcss" (Tailwind v4)
    layout.tsx           — Geist font, bg-[#F8F6F1]
    page.tsx             — root redirect (check auth → /directory or /login)
    login/               — login page
    signup/              — signup page
    pending/             — post-signup pending approval page
    terms/               — T&C (public)
    help/                — FAQ (public)
    directory/           — member profile directory (protected)
    profile/             — individual profile view (protected)
    my-profile/          — own profile management (protected)
    events/              — events listing (protected)
    admin/               — admin dashboard and tools (admin-only)
  components/
    ZawaajLogo.tsx       — <ZawaajLogo size={90} tagline={true} />
  lib/
    supabase/
      client.ts          — createClient() → createBrowserClient
      server.ts          — async createClient() → createServerClient + await cookies()
  proxy.ts               — session refresh + route protection
supabase/
  migrations/
    001_initial_schema.sql
    002_fix_rls_recursion.sql
    003_schema_updates.sql
public/
  logo.png
  robots.txt             — Disallow: / (no public indexing)
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
```

---

## Coding Conventions

- **No `any` types** without explicit justification in a comment
- Server components are the default — add `'use client'` only when needed (event handlers, hooks, browser APIs)
- All Supabase queries should handle errors explicitly
- Use Tailwind utility classes; brand colours as inline `style` or arbitrary `bg-[#...]` classes
- Keep components focused — extract sub-components when a file exceeds ~200 lines
- RLS is the security layer — never rely solely on UI to hide sensitive data
