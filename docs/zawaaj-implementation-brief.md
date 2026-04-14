# Zawaaj — Implementation brief
## For Claude Code · Strict phased execution · Do not skip ahead

This is a Zawaaj-only brief. Ignore all tables, code, and context related to
the Practitioners product (profiles, practitioners, events, subscriptions,
support_requests, consent_records, posts, resources, conversations, messages).
Those belong to a separate product and must not be modified.

---

## Context — what is already built and correct

Do not rebuild or restructure these. They are complete.

- `zawaaj_family_accounts` — primary contact system, all fields explicit and mandatory
- `zawaaj_profiles` — core profile schema with family_account_id FK
- `zawaaj_interests` — interest flow with status lifecycle
- `zawaaj_matches` — match lifecycle with contact verification and audit trail
- `zawaaj_managers` — manager delegation with scope fields
- Admin operations console — schema supports it
- `lib/config/profileOptions.ts` — config file (confirm it exists in codebase)

**Primary contact confirmation:**
`zawaaj_family_accounts` already stores `contact_full_name`, `contact_relationship`,
`contact_number`, `contact_email`, `female_contact_name`, `female_contact_number`,
`female_contact_relationship`, `no_female_contact_flag` as explicit NOT NULL fields
with constraints. The primary contact IS an explicit entity. No separate table needed.

**Matches status confirmation:**
`zawaaj_matches` status check already uses `pending_verification`. No change needed. ✓

---

## PHASE 1 — Blocking migrations (nothing else before this)

Run as migration `zawaaj_profile_hardening_v1`.
Confirm each step before proceeding.

```sql
-- 1. Convert wears_hijab from boolean to text enum
ALTER TABLE public.zawaaj_profiles
  ALTER COLUMN wears_hijab TYPE text
  USING CASE wears_hijab WHEN true THEN 'yes' WHEN false THEN 'no' ELSE NULL END;

ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_wears_hijab_check CHECK (
    wears_hijab IS NULL OR wears_hijab = ANY (ARRAY['yes','no','sometimes'])
  );

-- 2. Add all missing profile columns
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS religiosity              text,
  ADD COLUMN IF NOT EXISTS prayer_regularity        text,
  ADD COLUMN IF NOT EXISTS quran_engagement_level   text,
  ADD COLUMN IF NOT EXISTS wears_niqab              text,
  ADD COLUMN IF NOT EXISTS wears_abaya              text,
  ADD COLUMN IF NOT EXISTS height_cm                integer,
  ADD COLUMN IF NOT EXISTS height_unit              text DEFAULT 'cm',
  ADD COLUMN IF NOT EXISTS languages_spoken         text[];

-- 3. CHECK constraints on new columns
ALTER TABLE public.zawaaj_profiles
  ADD CONSTRAINT zp_religiosity_check CHECK (
    religiosity IS NULL OR religiosity = ANY (ARRAY['steadfast','practising','striving'])
  ),
  ADD CONSTRAINT zp_prayer_regularity_check CHECK (
    prayer_regularity IS NULL OR prayer_regularity = ANY (ARRAY['five_daily','mostly','sometimes','occasionally'])
  ),
  ADD CONSTRAINT zp_quran_engagement_check CHECK (
    quran_engagement_level IS NULL OR quran_engagement_level = ANY (ARRAY[
      'building_connection','growing_regularly','consistent_understanding','deeply_engaged'
    ])
  ),
  ADD CONSTRAINT zp_wears_niqab_check CHECK (
    wears_niqab IS NULL OR wears_niqab = ANY (ARRAY['yes','no','sometimes'])
  ),
  ADD CONSTRAINT zp_wears_abaya_check CHECK (
    wears_abaya IS NULL OR wears_abaya = ANY (ARRAY['yes','no','sometimes'])
  ),
  ADD CONSTRAINT zp_height_unit_check CHECK (
    height_unit IS NULL OR height_unit = ANY (ARRAY['cm','ft_in'])
  ),
  ADD CONSTRAINT zp_marital_status_check CHECK (
    marital_status IS NULL OR marital_status = ANY (ARRAY['never_married','divorced','widowed','annulled'])
  ),
  ADD CONSTRAINT zp_living_situation_check CHECK (
    living_situation IS NULL OR living_situation = ANY (ARRAY['with_family','independently','with_flatmates','other'])
  ),
  ADD CONSTRAINT zp_open_to_relocation_check CHECK (
    open_to_relocation IS NULL OR open_to_relocation = ANY (ARRAY['yes','no','flexible'])
  );

-- 4. Migrate existing height text values to height_cm
UPDATE public.zawaaj_profiles
SET height_cm = CASE
  WHEN height ~ '^\d+$' THEN height::integer
  WHEN height ~* '^\d+\s*cm$' THEN regexp_replace(height, '[^0-9]', '', 'g')::integer
  ELSE NULL
END
WHERE height IS NOT NULL AND height_cm IS NULL;

-- 5. Empty-string guards on contact fields
ALTER TABLE public.zawaaj_family_accounts
  ADD CONSTRAINT zfa_contact_full_name_nonempty CHECK (trim(contact_full_name) <> ''),
  ADD CONSTRAINT zfa_contact_number_nonempty    CHECK (trim(contact_number) <> ''),
  ADD CONSTRAINT zfa_contact_email_nonempty     CHECK (trim(contact_email) <> '');

-- 6. Add response and notification columns to zawaaj_interests
ALTER TABLE public.zawaaj_interests
  ADD COLUMN IF NOT EXISTS response_template_key  text,
  ADD COLUMN IF NOT EXISTS responded_at           timestamptz,
  ADD COLUMN IF NOT EXISTS notified_recipient_at  timestamptz,
  ADD COLUMN IF NOT EXISTS response_deadline      timestamptz;
```

**Phase 1 confirmation required before proceeding:**
- [ ] Migration ran without errors
- [ ] `wears_hijab` is now text type
- [ ] All 8 new columns exist on `zawaaj_profiles`
- [ ] All CHECK constraints applied
- [ ] `zawaaj_interests` has 4 new columns
- [ ] List all columns updated

---

## PHASE 2 — Foundation for growth

Run after Phase 1 confirmed. Migration: `zawaaj_foundation_v1`.

### 2a. Import tracking

```sql
ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS imported_user    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_batch_ref text;
```

### 2b. Onboarding state — 6-stage funnel

```sql
ALTER TABLE public.zawaaj_family_accounts
  ADD COLUMN IF NOT EXISTS onboarding_state text NOT NULL DEFAULT 'invited',
  ADD CONSTRAINT zfa_onboarding_state_check CHECK (
    onboarding_state = ANY (ARRAY[
      'invited',
      'opened',
      'contact_added',
      'profile_started',
      'profile_completed',
      'activated'
    ])
  );
```

### 2c. Invite tokens table

```sql
CREATE TABLE public.zawaaj_invite_tokens (
  id                    uuid primary key default gen_random_uuid(),
  token                 text not null unique default encode(gen_random_bytes(32), 'hex'),
  family_account_id     uuid not null references public.zawaaj_family_accounts(id) on delete cascade,
  invited_email         text,
  invited_number        text,
  invite_type           text not null default 'guardian',
  status                text not null default 'pending',
  expires_at            timestamptz not null default now() + interval '30 days',
  accepted_at           timestamptz,
  accepted_by_user_id   uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  CONSTRAINT zit_type_check   CHECK (invite_type = ANY (ARRAY['guardian','child'])),
  CONSTRAINT zit_status_check CHECK (status = ANY (ARRAY['pending','accepted','expired']))
);

ALTER TABLE public.zawaaj_invite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zit: admin all"
  ON public.zawaaj_invite_tokens FOR ALL USING (zawaaj_is_admin());

CREATE POLICY "zit: own select"
  ON public.zawaaj_invite_tokens FOR SELECT
  USING (accepted_by_user_id = auth.uid());

CREATE INDEX zit_token_idx   ON public.zawaaj_invite_tokens (token);
CREATE INDEX zit_email_idx   ON public.zawaaj_invite_tokens (lower(invited_email));
CREATE INDEX zit_number_idx  ON public.zawaaj_invite_tokens (invited_number);
CREATE INDEX zit_account_idx ON public.zawaaj_invite_tokens (family_account_id);
```

### 2d. Indexes for auto-linking

```sql
CREATE INDEX IF NOT EXISTS zfa_contact_email_idx
  ON public.zawaaj_family_accounts (lower(contact_email));
CREATE INDEX IF NOT EXISTS zfa_contact_number_idx
  ON public.zawaaj_family_accounts (contact_number);
CREATE INDEX IF NOT EXISTS zfa_female_contact_number_idx
  ON public.zawaaj_family_accounts (female_contact_number);
```

**Phase 2 confirmation required:**
- [ ] `imported_user` and `import_batch_ref` on `zawaaj_profiles`
- [ ] `onboarding_state` on `zawaaj_family_accounts` with 6-stage constraint
- [ ] `zawaaj_invite_tokens` table created with RLS and indexes
- [ ] Linking indexes created on family accounts
- [ ] List all changes

---

## PHASE 3 — Flow logic (application code only, no migrations)

Run after Phase 2 confirmed.

### 3a. Phone normalisation

Create `lib/zawaaj/normalisePhone.ts`:

```typescript
export function normalisePhone(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/[\s\-\(\)\.]/g, '')
  if (digits.startsWith('+44')) return '0' + digits.slice(3)
  if (digits.startsWith('0044')) return '0' + digits.slice(4)
  return digits
}
```

Apply on every write to `contact_number`, `female_contact_number`, `invited_number`.

### 3b. Auto-linking function

Create `lib/zawaaj/linkFamilyAccount.ts`:

```typescript
import { normalisePhone } from './normalisePhone'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LinkResult =
  | { linked: true;  familyAccountId: string; linkType: 'email' | 'phone' | 'invite_token' }
  | { linked: false }

export async function attemptFamilyAccountLink(
  supabase: SupabaseClient,
  newUserId: string,
  userEmail: string,
  userPhone?: string
): Promise<LinkResult> {

  // 1. Match on primary contact email (case-insensitive)
  const { data: byEmail } = await supabase
    .from('zawaaj_family_accounts')
    .select('id, registration_path')
    .ilike('contact_email', userEmail)
    .is('primary_user_id', null)
    .in('status', ['pending_approval', 'active', 'pending_contact_details'])
    .limit(1)
    .maybeSingle()

  if (byEmail) {
    await supabase
      .from('zawaaj_family_accounts')
      .update({ primary_user_id: newUserId })
      .eq('id', byEmail.id)
    if (byEmail.registration_path === 'child') {
      await supabase
        .from('zawaaj_profiles')
        .update({ child_user_id: newUserId })
        .eq('family_account_id', byEmail.id)
        .is('child_user_id', null)
    }
    return { linked: true, familyAccountId: byEmail.id, linkType: 'email' }
  }

  // 2. Match on contact phone (normalised)
  if (userPhone) {
    const norm = normalisePhone(userPhone)
    const { data: byPhone } = await supabase
      .from('zawaaj_family_accounts')
      .select('id')
      .or(`contact_number.eq.${norm},female_contact_number.eq.${norm}`)
      .is('primary_user_id', null)
      .in('status', ['pending_approval', 'active', 'pending_contact_details'])
      .limit(1)
      .maybeSingle()

    if (byPhone) {
      await supabase
        .from('zawaaj_family_accounts')
        .update({ primary_user_id: newUserId })
        .eq('id', byPhone.id)
      return { linked: true, familyAccountId: byPhone.id, linkType: 'phone' }
    }
  }

  // 3. Match on pending invite token
  const { data: token } = await supabase
    .from('zawaaj_invite_tokens')
    .select('id, family_account_id, invite_type')
    .ilike('invited_email', userEmail)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (token) {
    await supabase
      .from('zawaaj_invite_tokens')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: newUserId
      })
      .eq('id', token.id)

    if (token.invite_type === 'guardian') {
      await supabase
        .from('zawaaj_family_accounts')
        .update({ primary_user_id: newUserId })
        .eq('id', token.family_account_id)
        .is('primary_user_id', null)
    } else {
      await supabase
        .from('zawaaj_profiles')
        .update({ child_user_id: newUserId })
        .eq('family_account_id', token.family_account_id)
        .is('child_user_id', null)
    }

    return { linked: true, familyAccountId: token.family_account_id, linkType: 'invite_token' }
  }

  return { linked: false }
}
```

### 3c. Invite flows — exact behaviour

**Guardian invite:**
1. Token created: `invite_type = 'guardian'`, linked to `family_account_id`
2. Email to guardian: `https://www.zawaaj.uk/register/accept-invite?token=[token]`
3. Page validates token → simplified form (name + password only, contact details already stored)
4. On submit: create auth user → `attemptFamilyAccountLink` → `primary_user_id` set → redirect to dashboard
5. Token expired: "This invitation has expired. Please contact the Zawaaj team."
6. Guardian already has account: `attemptFamilyAccountLink` links on next login silently

**Child invite:**
1. Token created: `invite_type = 'child'`
2. Child registers → `child_user_id` set on their profile
3. Child can: browse, update own profile, respond to interests
4. Child cannot: create sibling profiles, view other children's profiles, access contact details, change primary contact

**No invite — organic signup:**
1. Registration proceeds normally (Path A parent or Path B child)
2. `attemptFamilyAccountLink` called after registration
3. Match found → link silently, no extra step
4. No match → new family account, `onboarding_state = 'contact_added'`

**Invite expiry cron:**
```sql
UPDATE public.zawaaj_invite_tokens
SET status = 'expired'
WHERE status = 'pending' AND expires_at < now();
```
Run daily via Supabase scheduled function.
Admin can resend (creates new token, old stays expired).

### 3d. Introduction system — family account alignment

Confirm and fix if any of these are wrong:

1. On `zawaaj_matches` creation, immediately cache contact details:
   ```sql
   UPDATE zawaaj_matches m
   SET
     family_a_contact_name   = (
       SELECT zfa.contact_full_name
       FROM zawaaj_family_accounts zfa
       JOIN zawaaj_profiles zp ON zp.family_account_id = zfa.id
       WHERE zp.id = m.profile_a_id LIMIT 1),
     family_a_contact_number = (
       SELECT COALESCE(NULLIF(zfa.female_contact_number,''), zfa.contact_number)
       FROM zawaaj_family_accounts zfa
       JOIN zawaaj_profiles zp ON zp.family_account_id = zfa.id
       WHERE zp.id = m.profile_a_id LIMIT 1),
     family_b_contact_name   = (
       SELECT zfa.contact_full_name
       FROM zawaaj_family_accounts zfa
       JOIN zawaaj_profiles zp ON zp.family_account_id = zfa.id
       WHERE zp.id = m.profile_b_id LIMIT 1),
     family_b_contact_number = (
       SELECT COALESCE(NULLIF(zfa.female_contact_number,''), zfa.contact_number)
       FROM zawaaj_family_accounts zfa
       JOIN zawaaj_profiles zp ON zp.family_account_id = zfa.id
       WHERE zp.id = m.profile_b_id LIMIT 1)
   WHERE m.id = $matchId;
   ```

2. Contact sharing always uses `female_contact_number` first, falls back to
   `contact_number` only if female is absent.

3. Contact fields must never appear in any member-facing query.
   Audit all queries on `zawaaj_family_accounts` that members can access.

4. `zawaaj_interests` insert must set:
   `response_deadline = notified_recipient_at + interval '7 days'`

**Phase 3 confirmation required:**
- [ ] `lib/zawaaj/normalisePhone.ts` created
- [ ] `lib/zawaaj/linkFamilyAccount.ts` created
- [ ] `attemptFamilyAccountLink` called from registration handler
- [ ] `/register/accept-invite` route handles both invite types
- [ ] Expiry cron in place
- [ ] Match creation populates contact cache fields
- [ ] `response_deadline` set on interests insert
- [ ] No member query returns contact fields
- [ ] List all files created or modified

**STOP HERE. Do not proceed to Phase 4 without explicit confirmation.**

---

## PHASE 4 — Engagement layer

Run after Phase 3 confirmed. Migration: `zawaaj_engagement_v1`.

### 4a. Notifications

```sql
CREATE TABLE public.zawaaj_notifications (
  id                    uuid primary key default gen_random_uuid(),
  family_account_id     uuid references public.zawaaj_family_accounts(id) on delete cascade,
  event_type            text not null,
  title                 text not null,
  body                  text,
  is_read               boolean not null default false,
  read_at               timestamptz,
  related_interest_id   uuid references public.zawaaj_interests(id) on delete set null,
  related_match_id      uuid references public.zawaaj_matches(id) on delete set null,
  created_at            timestamptz not null default now()
);

ALTER TABLE public.zawaaj_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zn: own select" ON public.zawaaj_notifications FOR SELECT
  USING (
    family_account_id IN (
      SELECT id FROM zawaaj_family_accounts WHERE primary_user_id = auth.uid()
    )
    OR family_account_id IN (
      SELECT family_account_id FROM zawaaj_profiles WHERE child_user_id = auth.uid()
    )
  );

CREATE POLICY "zn: admin all" ON public.zawaaj_notifications FOR ALL
  USING (zawaaj_is_admin());
```

### 4b. Response templates

```sql
CREATE TABLE public.zawaaj_response_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  direction   text not null,
  label       text not null,
  body        text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  CONSTRAINT zrt_direction_check CHECK (direction = ANY (ARRAY['accept','decline']))
);

ALTER TABLE public.zawaaj_response_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zrt: public read" ON public.zawaaj_response_templates FOR SELECT USING (is_active = true);
CREATE POLICY "zrt: admin all"  ON public.zawaaj_response_templates FOR ALL  USING (zawaaj_is_admin());

INSERT INTO public.zawaaj_response_templates (key, direction, label, body, sort_order) VALUES
  ('accept_warm',        'accept',  'Accept with warmth',
   'JazakAllahu khairan for reaching out. We have reviewed the profile with interest and would be pleased to proceed, insha''Allah.', 1),
  ('decline_respectful', 'decline', 'Decline respectfully',
   'JazakAllahu khairan for the interest. After careful consideration, we feel this may not be the right match at this time. We wish your family well.', 1),
  ('decline_timing',     'decline', 'Decline — not the right time',
   'We appreciate the interest. Unfortunately the timing is not right for us at the moment. JazakAllahu khairan.', 2),
  ('decline_preference', 'decline', 'Decline — preference mismatch',
   'Thank you sincerely for reaching out. After consideration we do not feel this is a suitable match for our family. We wish you well in your search.', 3);
```

**Phase 4 confirmation required:**
- [ ] `zawaaj_notifications` with RLS
- [ ] `zawaaj_response_templates` seeded with 4 templates
- [ ] List all changes

---

## PHASE 5 — Monetisation

Run after Phase 4 confirmed. Migration: `zawaaj_monetisation_v1`.

### 5a. Plans config table (DB-driven, admin-editable)

```sql
CREATE TABLE public.zawaaj_plans (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique,
  label               text not null,
  price_monthly_gbp   integer not null default 0,
  price_annual_gbp    integer not null default 0,
  monthly_interests   integer,           -- NULL = unlimited
  max_profiles        integer not null default 2,
  features            jsonb not null default '[]',
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

ALTER TABLE public.zawaaj_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zpl: public read" ON public.zawaaj_plans FOR SELECT USING (is_active = true);
CREATE POLICY "zpl: admin all"   ON public.zawaaj_plans FOR ALL   USING (zawaaj_is_admin());

INSERT INTO public.zawaaj_plans
  (key, label, price_monthly_gbp, price_annual_gbp, monthly_interests, max_profiles, features, sort_order)
VALUES
  ('voluntary', 'Voluntary contribution', 0, 0, 5, 2,
   '["admin_mediated_intros","profile_review","basic_search"]', 1),
  ('plus', 'Zawaaj Plus', 900, 7200, 15, 4,
   '["admin_mediated_intros","profile_review","basic_search","priority_admin","profile_boost_monthly","new_profile_alerts","full_bio_on_received_interests"]', 2),
  ('premium', 'Zawaaj Premium', 1900, 18000, null, 4,
   '["admin_mediated_intros","profile_review","basic_search","priority_admin","profile_boost_weekly","new_profile_alerts","full_bio_on_received_interests","dedicated_manager","manager_followup","spotlight_monthly","who_viewed"]', 3);
```

Feature gating rules:

| Feature key | Enforced where | Rule |
|---|---|---|
| `monthly_interests` | Backend API | `interests_this_month < plan.monthly_interests` before insert |
| `max_profiles` | Backend API | profile count < `plan.max_profiles` before create |
| `full_bio_on_received_interests` | Frontend | Free = summary only; Plus/Premium = full bio |
| `profile_boost_monthly/weekly` | Backend + cron | Reset on schedule |
| `dedicated_manager` | Admin auto-assign | Auto-assign manager on match creation for premium accounts |
| `who_viewed` | Frontend | Show only if feature key present in plan |
| `new_profile_alerts` | Notification system | Send only if feature key present in plan |

Frontend reads features by fetching the family account's plan from `zawaaj_plans`.
Never hardcode plan keys in components.

### 5b. Subscriptions

```sql
CREATE TABLE public.zawaaj_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  family_account_id       uuid not null references public.zawaaj_family_accounts(id) on delete cascade,
  plan_key                text not null references public.zawaaj_plans(key),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  billing_cycle           text not null default 'monthly',
  status                  text not null default 'active',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  CONSTRAINT zsub_cycle_check  CHECK (billing_cycle = ANY (ARRAY['monthly','annual'])),
  CONSTRAINT zsub_status_check CHECK (status = ANY (ARRAY['active','cancelled','past_due','paused']))
);

ALTER TABLE public.zawaaj_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zsub: own select" ON public.zawaaj_subscriptions FOR SELECT
  USING (family_account_id IN (
    SELECT id FROM zawaaj_family_accounts WHERE primary_user_id = auth.uid()
  ));
CREATE POLICY "zsub: admin all" ON public.zawaaj_subscriptions FOR ALL USING (zawaaj_is_admin());
```

Update `lib/config/profileOptions.ts`: replace hardcoded `PLAN_LIMITS` with a
`fetchPlanConfig()` function reading from `zawaaj_plans`. Keep the constant as
a static fallback for build time only.

**Phase 5 confirmation required:**
- [ ] `zawaaj_plans` created and seeded
- [ ] `zawaaj_subscriptions` created with RLS
- [ ] `profileOptions.ts` updated
- [ ] Feature gating in API routes for `monthly_interests` and `max_profiles`
- [ ] List all files changed

---

## PHASE 6 — Extensions (lowest priority)

Run after Phase 5 confirmed. Migration: `zawaaj_extensions_v1`.

### 6a. Events — keep light

```sql
ALTER TABLE public.zawaaj_events
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS event_type   text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS join_url     text,
  ADD COLUMN IF NOT EXISTS capacity     integer,
  ADD COLUMN IF NOT EXISTS is_online    boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT ze_event_type_check CHECK (
    event_type = ANY (ARRAY['physical','webinar','hybrid'])
  );

CREATE TABLE public.zawaaj_event_registrations (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.zawaaj_events(id) on delete cascade,
  family_account_id uuid not null references public.zawaaj_family_accounts(id) on delete cascade,
  registered_at     timestamptz not null default now(),
  attended          boolean,
  UNIQUE(event_id, family_account_id)
);

ALTER TABLE public.zawaaj_event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zer: own select" ON public.zawaaj_event_registrations FOR SELECT
  USING (family_account_id IN (
    SELECT id FROM zawaaj_family_accounts WHERE primary_user_id = auth.uid()
  ));
CREATE POLICY "zer: own insert" ON public.zawaaj_event_registrations FOR INSERT
  WITH CHECK (family_account_id IN (
    SELECT id FROM zawaaj_family_accounts WHERE primary_user_id = auth.uid()
  ));
CREATE POLICY "zer: admin all" ON public.zawaaj_event_registrations FOR ALL
  USING (zawaaj_is_admin());
```

### 6b. Legacy column cleanup

```sql
-- Check first — only drop if zero rows returned
SELECT id FROM public.zawaaj_profiles
WHERE contact_number IS NOT NULL OR guardian_name IS NOT NULL;

-- If zero rows:
ALTER TABLE public.zawaaj_profiles
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS guardian_name;
```

**Phase 6 confirmation required:**
- [ ] `zawaaj_events` extended
- [ ] `zawaaj_event_registrations` with RLS
- [ ] Legacy columns removed (or flagged if data exists)
- [ ] List all changes

---

## Standing rules — apply to every phase

1. Stop after each phase and wait for explicit confirmation before starting the next.
2. Never modify Practitioners-product tables: `events`, `subscriptions`, `profiles`,
   `practitioners`, `support_requests`, `consent_records`, `posts`, `resources`,
   `conversations`, `messages`, `comments`, `post_likes`, `practitioner_applications`,
   `event_registrations`.
3. All new Zawaaj tables use the `zawaaj_` prefix.
4. All RLS policies use `zawaaj_is_admin()` — not `is_admin()`.
5. Contact details (`contact_number`, `female_contact_number`, `contact_email`,
   `family_a/b_contact_number`) must never appear in any member-facing API response.
6. Run the audit SELECT before any DROP COLUMN.
7. Do not overengineer events, notifications, or pricing UI. Build the schema;
   keep the UI minimal until explicitly asked to expand it.
