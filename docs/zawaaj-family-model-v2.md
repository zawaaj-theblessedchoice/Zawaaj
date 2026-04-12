# Zawaaj — Family Model v2 (revised)
## Complete Claude Code instructions — replaces v1 entirely

---

## CRITICAL RULE — Primary contact details are mandatory everywhere

This applies at every layer — database, API, forms, admin approval:

1. `contact_full_name`, `contact_relationship`, `contact_number`, `contact_email` — all four are required on `zawaaj_family_accounts`. The DB schema marks them `NOT NULL`. No account row can be created without them.

2. If the primary contact is male (`father` or `male_guardian`): either `female_contact_name` + `female_contact_number` must be provided, OR `no_female_contact_flag = true` with a non-empty `father_explanation`. This is enforced by a DB CHECK constraint.

3. In Path B (child registers): the guardian's name, relationship, and contact number are required before the form can be submitted. The guardian's email is optional.

4. Admin cannot approve any account that does not satisfy all of the above. The approval button is disabled in the UI if any required contact field is missing.

5. If a legacy or imported account is missing contact details, its status is set to `pending_contact_details` and it appears in a separate admin queue for follow-up. It cannot go live until contact details are added.

---

## SECTION 1 — Database migration

Run as a single migration named `zawaaj_family_model_v2`.

```sql
-- ============================================================
-- 1. FAMILY ACCOUNTS TABLE
-- ============================================================

CREATE TABLE public.zawaaj_family_accounts (
  id                          uuid primary key default gen_random_uuid(),

  -- Primary contact details — ALL MANDATORY at account creation
  -- Cannot be null at the point of submission. Enforced at DB and app layer.
  contact_full_name           text not null,
  contact_relationship        text not null,
  -- mother | grandmother | aunt | female_guardian | father | male_guardian
  contact_number              text not null,
  -- WhatsApp-capable number. Required. Cannot be blank.
  contact_email               text not null,
  -- Email required for account communications. Cannot be blank.

  -- Female fallback — MANDATORY when contact_relationship IN ('father', 'male_guardian')
  -- DB constraint below enforces: if male contact, female_contact_name + female_contact_number must be set
  -- UNLESS no_female_contact_flag = true (edge case, admin-reviewed)
  female_contact_name         text,
  female_contact_number       text,
  female_contact_relationship text,
  -- grandmother | aunt | female_guardian | sister | other_female_relative
  father_explanation          text not null default '',
  -- Required (non-empty) when contact_relationship IN ('father', 'male_guardian')

  -- Flag shown to members browsing
  -- true ONLY when registrant has explicitly confirmed no female contact is available
  -- Requires father_explanation to be non-empty before this can be set true
  no_female_contact_flag      boolean not null default false,

  -- DB-level enforcement: male primary contact must have female fallback OR explicit flag
  CONSTRAINT zfa_male_contact_requires_female_fallback CHECK (
    -- If male contact AND flag not set → must have female contact name + number
    contact_relationship NOT IN ('father', 'male_guardian')
    OR no_female_contact_flag = true
    OR (female_contact_name IS NOT NULL AND female_contact_number IS NOT NULL)
  ),

  -- DB-level enforcement: if flag is set, explanation must be non-empty
  CONSTRAINT zfa_flag_requires_explanation CHECK (
    no_female_contact_flag = false
    OR (father_explanation IS NOT NULL AND father_explanation <> '')
  ),

  -- Auth user (primary contact's login — may be same as child's)
  primary_user_id             uuid references auth.users(id) on delete set null,

  -- Account status
  status                      text not null default 'pending_approval',
  -- pending_approval | active | suspended | pending_contact_details

  approved_by                 uuid references auth.users(id) on delete set null,
  approved_at                 timestamptz,
  suspended_by                uuid references auth.users(id) on delete set null,
  suspended_reason            text,

  assigned_manager_id         uuid,
  -- FK added after zawaaj_managers created below

  plan                        text not null default 'voluntary',
  -- voluntary | plus | premium

  registration_path           text not null default 'parent',
  -- parent | child

  terms_agreed                boolean not null default false,
  terms_agreed_at             timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  CONSTRAINT zfa_relationship_check CHECK (
    contact_relationship = ANY (ARRAY[
      'mother','grandmother','aunt','female_guardian',
      'father','male_guardian'
    ])
  ),
  CONSTRAINT zfa_status_check CHECK (
    status = ANY (ARRAY[
      'pending_approval','active','suspended','pending_contact_details'
    ])
  ),
  CONSTRAINT zfa_plan_check CHECK (
    plan = ANY (ARRAY['voluntary','plus','premium'])
  ),
  CONSTRAINT zfa_path_check CHECK (
    registration_path = ANY (ARRAY['parent','child'])
  )
);

-- ============================================================
-- 2. ALTER zawaaj_profiles
-- ============================================================

ALTER TABLE public.zawaaj_profiles
  ADD COLUMN IF NOT EXISTS family_account_id   uuid
    REFERENCES public.zawaaj_family_accounts(id) on delete set null,
  ADD COLUMN IF NOT EXISTS child_user_id        uuid
    REFERENCES auth.users(id) on delete set null,
  ADD COLUMN IF NOT EXISTS created_by_child     boolean not null default false,
  ADD COLUMN IF NOT EXISTS profile_complete     boolean not null default false,
  ADD COLUMN IF NOT EXISTS first_name           text,
  ADD COLUMN IF NOT EXISTS last_name            text,
  ADD COLUMN IF NOT EXISTS nationality          text,
  ADD COLUMN IF NOT EXISTS languages_spoken     text[],
  ADD COLUMN IF NOT EXISTS living_situation     text,
  ADD COLUMN IF NOT EXISTS open_to_relocation   boolean,
  ADD COLUMN IF NOT EXISTS open_to_partners_children boolean,
  ADD COLUMN IF NOT EXISTS wears_hijab          boolean,
  ADD COLUMN IF NOT EXISTS keeps_beard          boolean,
  ADD COLUMN IF NOT EXISTS marital_status       text,
  ADD COLUMN IF NOT EXISTS has_children         boolean,
  ADD COLUMN IF NOT EXISTS pref_age_min         integer,
  ADD COLUMN IF NOT EXISTS pref_age_max         integer,
  ADD COLUMN IF NOT EXISTS pref_location        text,
  ADD COLUMN IF NOT EXISTS pref_ethnicity       text,
  ADD COLUMN IF NOT EXISTS pref_school_of_thought text,
  ADD COLUMN IF NOT EXISTS pref_relocation      text;

-- Remove contact fields from profiles (now on family account)
-- Keep as nullable temporarily for safe migration; drop after data migrated
-- ALTER TABLE public.zawaaj_profiles DROP COLUMN contact_number;
-- ALTER TABLE public.zawaaj_profiles DROP COLUMN guardian_name;
-- (Run these manually after confirming no data loss)

-- ============================================================
-- 3. MANAGERS TABLE
-- ============================================================

CREATE TABLE public.zawaaj_managers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  full_name           text not null,
  email               text,
  contact_number      text,
  scope_cities        text[],
  scope_genders       text[],
  scope_ethnicities   text[],
  scope_languages     text[],
  role                text not null default 'manager',
  -- manager | senior_manager
  is_active           boolean not null default true,
  appointed_by        uuid references auth.users(id) on delete set null,
  appointed_at        timestamptz default now(),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  CONSTRAINT zmgr_role_check CHECK (
    role = ANY (ARRAY['manager','senior_manager'])
  )
);

-- Now add FK from family_accounts to managers
ALTER TABLE public.zawaaj_family_accounts
  ADD CONSTRAINT zfa_manager_fk
    FOREIGN KEY (assigned_manager_id)
    REFERENCES public.zawaaj_managers(id) on delete set null;

-- ============================================================
-- 4. ALTER zawaaj_matches
-- ============================================================

ALTER TABLE public.zawaaj_matches
  DROP CONSTRAINT IF EXISTS zawaaj_matches_status_check;

ALTER TABLE public.zawaaj_matches
  ADD CONSTRAINT zawaaj_matches_status_check CHECK (
    status = ANY (ARRAY[
      'pending_verification',
      'verified',
      'contacts_shared',
      'in_follow_up',
      'closed'
    ])
  );

ALTER TABLE public.zawaaj_matches
  ADD COLUMN IF NOT EXISTS assigned_manager_id    uuid
    REFERENCES public.zawaaj_managers(id) on delete set null,
  ADD COLUMN IF NOT EXISTS contact_a_verified      boolean not null default false,
  ADD COLUMN IF NOT EXISTS contact_a_verified_by   uuid references auth.users(id),
  ADD COLUMN IF NOT EXISTS contact_a_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS contact_b_verified      boolean not null default false,
  ADD COLUMN IF NOT EXISTS contact_b_verified_by   uuid references auth.users(id),
  ADD COLUMN IF NOT EXISTS contact_b_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS contacts_shared_at      timestamptz,
  ADD COLUMN IF NOT EXISTS contacts_shared_by      uuid references auth.users(id),
  ADD COLUMN IF NOT EXISTS followup_due_at         timestamptz,
  ADD COLUMN IF NOT EXISTS followup_done_at        timestamptz,
  ADD COLUMN IF NOT EXISTS followup_notes          text,
  ADD COLUMN IF NOT EXISTS outcome_detail          text,
  -- in_conversation | meeting_arranged | engaged | married | unsuccessful | withdrawn
  ADD COLUMN IF NOT EXISTS family_a_contact_name   text,
  ADD COLUMN IF NOT EXISTS family_b_contact_name   text,
  ADD COLUMN IF NOT EXISTS family_a_contact_number text,
  ADD COLUMN IF NOT EXISTS family_b_contact_number text;

-- ============================================================
-- 5. ALTER zawaaj_interests — 7-day expiry, response flow
-- ============================================================

ALTER TABLE public.zawaaj_interests
  DROP CONSTRAINT IF EXISTS zawaaj_interests_status_check;

ALTER TABLE public.zawaaj_interests
  ADD CONSTRAINT zawaaj_interests_status_check CHECK (
    status = ANY (ARRAY[
      'pending',    -- sent, B notified, awaiting response (7-day window)
      'accepted',   -- B accepted → mutual detected → admin notified
      'declined',   -- B declined → A told privately, no reason given
      'expired',    -- no response within 7 days
      'withdrawn'   -- A withdrew before B responded
    ])
  );

ALTER TABLE public.zawaaj_interests
  ADD COLUMN IF NOT EXISTS response_template_key  text,
  ADD COLUMN IF NOT EXISTS responded_at           timestamptz,
  ADD COLUMN IF NOT EXISTS notified_recipient_at  timestamptz,
  ADD COLUMN IF NOT EXISTS response_deadline      timestamptz;
  -- Set to: notified_recipient_at + 7 days

-- ============================================================
-- 6. RESPONSE TEMPLATES
-- ============================================================

CREATE TABLE public.zawaaj_response_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  direction   text not null,  -- accept | decline
  label       text not null,
  body        text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  CONSTRAINT zrt_direction_check CHECK (
    direction = ANY (ARRAY['accept','decline'])
  )
);

INSERT INTO public.zawaaj_response_templates
  (key, direction, label, body, sort_order)
VALUES
  ('accept_warm', 'accept',
   'Accept with warmth',
   'JazakAllahu khairan for reaching out. We have reviewed the profile with interest and would be pleased to proceed, insha''Allah.',
   1),
  ('decline_respectful', 'decline',
   'Decline respectfully',
   'JazakAllahu khairan for the interest. After careful consideration, we feel this may not be the right match at this time. We wish your family well in your search.',
   1),
  ('decline_timing', 'decline',
   'Decline — not the right time',
   'We appreciate the interest. Unfortunately the timing is not right for us at the moment. JazakAllahu khairan.',
   2),
  ('decline_preference', 'decline',
   'Decline — preference mismatch',
   'Thank you sincerely for reaching out. After consideration we do not feel this is a suitable match for our family. We wish you well in your search.',
   3);

-- ============================================================
-- 7. NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE public.zawaaj_notifications (
  id                    uuid primary key default gen_random_uuid(),
  family_account_id     uuid references public.zawaaj_family_accounts(id) on delete cascade,
  profile_id            uuid references public.zawaaj_profiles(id) on delete cascade,
  event_type            text not null,
  -- interest_received | interest_accepted | interest_declined
  -- | interest_expired | match_pending_verification | contacts_shared
  -- | account_approved | followup_due | concierge_suggestion
  title                 text not null,
  body                  text,
  is_read               boolean not null default false,
  read_at               timestamptz,
  related_interest_id   uuid references public.zawaaj_interests(id) on delete set null,
  related_match_id      uuid references public.zawaaj_matches(id) on delete set null,
  created_at            timestamptz not null default now()
);

-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

ALTER TABLE public.zawaaj_family_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zawaaj_managers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zawaaj_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zawaaj_notifications      ENABLE ROW LEVEL SECURITY;

-- family_accounts
CREATE POLICY "zfa: own select"
  ON public.zawaaj_family_accounts FOR SELECT
  USING (primary_user_id = auth.uid());

CREATE POLICY "zfa: own update"
  ON public.zawaaj_family_accounts FOR UPDATE
  USING (primary_user_id = auth.uid());

CREATE POLICY "zfa: child linked select"
  ON public.zawaaj_family_accounts FOR SELECT
  USING (id IN (
    SELECT family_account_id FROM zawaaj_profiles
    WHERE child_user_id = auth.uid()
  ));

CREATE POLICY "zfa: admin all"
  ON public.zawaaj_family_accounts FOR ALL
  USING (zawaaj_is_admin());

-- managers
CREATE POLICY "zmgr: own select"
  ON public.zawaaj_managers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "zmgr: admin all"
  ON public.zawaaj_managers FOR ALL
  USING (zawaaj_is_super_admin());

-- response templates — public read
CREATE POLICY "zrt: public read"
  ON public.zawaaj_response_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "zrt: admin all"
  ON public.zawaaj_response_templates FOR ALL
  USING (zawaaj_is_admin());

-- notifications
CREATE POLICY "zn: own select"
  ON public.zawaaj_notifications FOR SELECT
  USING (
    family_account_id IN (
      SELECT id FROM zawaaj_family_accounts WHERE primary_user_id = auth.uid()
    )
    OR
    profile_id IN (
      SELECT id FROM zawaaj_profiles WHERE child_user_id = auth.uid()
    )
  );

CREATE POLICY "zn: admin all"
  ON public.zawaaj_notifications FOR ALL
  USING (zawaaj_is_admin());

-- ============================================================
-- 9. ADMIN / MANAGER HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.zawaaj_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zawaaj_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR EXISTS (
    SELECT 1 FROM public.zawaaj_managers
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.zawaaj_is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zawaaj_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  );
$$;

-- ============================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER zfa_updated_at
  BEFORE UPDATE ON public.zawaaj_family_accounts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER zmgr_updated_at
  BEFORE UPDATE ON public.zawaaj_managers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

---

## SECTION 2 — Registration flows

### Route structure

```
/register                      → who is registering?
/register/parent               → Path A
/register/child                → Path B
/register/pending              → holding screen
/register/link-guardian        → mother accepting child's invite (Path B step 3)
```

---

### Path A — Parent / guardian registers

The parent creates the family account and later adds child profiles.

**Step A1 — Who is registering?**

```
Who is creating this account?

  ● I am a parent or guardian, setting up profiles for my child(ren)
  ○ I am registering to find a match for myself
```

**Step A2 — Your details (primary contact)**

```
Your full name *
Your relationship to the candidate(s) *
  [ Mother ▾ ]
  options: Mother / Grandmother / Aunt / Female guardian / Father / Other male guardian

Your contact number * (WhatsApp preferred — required)
Your email address * (required — used for all account communications)
Your city / location *
```

**Step A3 — Shown only if relationship = Father or male guardian**

```
We require a female family member to act as the primary contact
for all introductions. This keeps the process dignified and
appropriate for all families.

Please provide details of a female relative who can take this role:

Female contact's full name *  (required)
Their relationship to the candidate *
  [ Mother ▾ ]
  options: Mother / Grandmother / Aunt / Sister / Female guardian / Other female relative

Their contact number *  (required — WhatsApp preferred)

Please explain why the mother is not the primary contact: *  (required)
[ free text — seen by admin only, never shown to other families ]
```

All four fields are required. The form cannot be submitted without them.
"No female contact available" checkbox only appears after all four fields
have been attempted and the registrant explicitly confirms they cannot provide one.

**Step A4 — Only shown if registrant explicitly cannot provide any female contact**

```
[ ] I am unable to provide a female contact at this time.

    Note: Your family account will be approved, but a flag will
    be shown to other families indicating that the primary contact
    is not a female family member. Families may take this into
    account when responding to interests. We encourage you to
    update this at any time once a female contact is available.
```

On submit with this checked: `no_female_contact_flag = true`. Admin is notified. Flag is visible to browsing members on the interest received screen ("Note: this family's primary contact is a male guardian").

**Step A5 — Terms**

```
[ ] I agree to the Terms of Use and Privacy Policy
[ ] I confirm all details provided are accurate

[Create family account →]
```

On submit:
- `zawaaj_family_accounts` created with `status = 'pending_approval'`
- Admin notified for review
- If `no_female_contact_flag = true` → admin sees a warning badge in the queue

**Step A6 — Pending screen**

```
Thank you, [Name].

Your family account has been submitted for review.
Our team will be in touch within 1–2 working days.

Once approved you can add profiles for your children
and begin the search.
```

**Step A7 — After approval**

Welcome email sent. Parent logs in. Dashboard shows "Add your first child's profile" prompt.

---

### Path B — Candidate registers themselves

**Step B1 — Who is registering?**

```
  ○ I am a parent or guardian, setting up profiles for my child(ren)
  ● I am registering to find a match for myself
```

**Step B2 — Your profile details**

Full profile form (see Section 4). The candidate fills in their own details.

**Step B3 — Your mother's / guardian's details**

```
Zawaaj requires a female family member to be the point of contact
for introductions. Her details will be used by our team when
connecting families — they will never be visible to other members
until a mutual match is confirmed and our team verifies the contact.

Her full name *
Her relationship to you *
  [ Mother ▾ ]
  options: Mother / Grandmother / Aunt / Sister / Female guardian / Other female relative

Her contact number *  (required — WhatsApp preferred)
Her email address     (optional — we will send her an invitation if provided)

Your city / location *  (required)
```

Her name, relationship, and contact number are all required.
The profile cannot be submitted without these three fields.
Her email is optional — the account does not depend on her opening it.

**Step B4 — If mother not available (same as A3/A4)**

```
[ ] My mother is not available — I will provide another female contact

  → shows same female contact fields as Path A Step A3

[ ] I am unable to provide a female contact at this time.
  → same flag as Path A Step A4
```

**Step B5 — Terms + submit**

```
[ ] I agree to the Terms of Use and Privacy Policy
[ ] I confirm my contact details and my guardian's details are accurate
[ ] My guardian consents to being contacted by the Zawaaj team
    when an introduction is being facilitated

[Submit my profile →]
```

On submit:
- `zawaaj_family_accounts` created with `status = 'pending_approval'`
  - `registration_path = 'child'`
  - `primary_user_id = child's auth.uid()` (child is primary user until mother links)
- `zawaaj_profiles` row created and linked
- If mother's email provided → invitation email sent (one email only, no SMS):
  Subject: "[Child name] has registered on Zawaaj — you are listed as their contact person"
  Body: explains the platform, invites her to create her own login, provides a link.
  Link stores the `family_account_id` so her registration auto-links.
- Child sees: "Profile submitted — awaiting approval"

**Step B6 — Mother receives email (optional, not a blocker)**

If mother opens email and registers:
- Her `primary_user_id` replaces the child's on `zawaaj_family_accounts`
- Child's `child_user_id` is set on their `zawaaj_profiles` row
- Both can now log in and browse
- Family account still requires admin approval before going live

**Step B7 — Admin approves**

Admin can approve a child's account as long as:
- Profile details are complete
- Primary contact name, relationship, and contact number are all filled in (non-empty)
- If primary contact is male: either female fallback details are present, or `no_female_contact_flag = true` with a non-empty explanation
- Terms agreed

The admin approval UI must show a clear warning if any of the above are missing, and must not allow approval until they are satisfied. This is enforced at the application layer in addition to the DB constraints.

**Step B8 — What each user can do after approval**

| Action | Parent login | Child login |
|---|---|---|
| Browse profiles | ✓ (as active child profile) | ✓ (as own profile) |
| Express interest | ✓ | ✓ |
| Respond to interests | ✓ | ✓ (but contact shared is parent's) |
| Update own profile | ✓ | ✓ |
| See contact details of matches | ✗ — admin shares with primary contact | ✗ — admin shares with primary contact |
| Add sibling profiles | ✓ | ✗ |
| Switch active profile | ✓ (if multiple children) | ✗ |

Contact details shared on a mutual match always go to the **female contact** on the family account — not to the child's login, not to the father's number if a female contact exists.

---

## SECTION 3 — Act as / profile switching

When a parent has multiple child profiles:

```
You are currently browsing as:

  [YM]  Yasmin M.   Female · 26 · London      [Active ✓]
  [OM]  Omar M.     Male · 29 · London         [Switch]
  [SM]  Sara M.     Female · 22 · Manchester   [Switch]

  [+ Add a child's profile]
```

- Browse results show opposite gender of the **active profile**
- Compatibility calculated from active profile's preferences
- Interests sent in active profile's name
- Switching shows confirmation: "You are now browsing as Yasmin"
- A persistent banner on browse: "Browsing as Yasmin M. · [Switch]"
- Child login sees only their own profile — no switcher shown

---

## SECTION 4 — Profile form (child's details)

Used in both Path A (parent filling for child) and Path B (child filling for themselves).

```
── Personal details ──
First name *
Last name *
Date of birth *          (shown as age only to other members)
Gender *                 Male / Female
Height
City / location *
Ethnicity
Nationality
Languages spoken         (multi-select)

── Education & career ──
Highest education level
Field of study / detail
Profession / occupation

── Faith & practice ──
School of thought *
Religiosity level        (practising / moderately practising / learning)
Prays five times daily   Yes / No / Sometimes
Wears hijab              Yes / No / Sometimes   (shown if Female)
Keeps beard              Yes / No               (shown if Male)

── About (bio) ──
Write a short description — their character, values, and what
they are looking for. 80–200 words.

── Preferences ──
Preferred age range      Min [  ] — Max [  ]
Preferred location
Preferred ethnicity      (multi-select or "Open")
Preferred school of thought
Open to relocation       Yes / No / Flexible
Open to partner having children from a previous marriage

── Status ──
Marital status           Single / Divorced / Widowed
Currently has children   Yes / No

[Save profile]
```

Profile is `status = 'pending'` until admin approves it.
Admin approves profile → `status = 'approved'`, `approved_date = now()`
Profile is only visible to other members when `status = 'approved'`.

---

## SECTION 5 — Interest / introduction flow

### Expressing interest (sender side)

Guard checks before allowing (server-side, enforced in API route):
1. Sender's family account `status = 'active'`
2. Sender's profile `status = 'approved'`
3. `interests_this_month` < plan limit
4. No existing interest row for this sender/recipient pair
5. Recipient not a sibling profile (same `family_account_id`)
6. Recipient not own profile

On success:
- Insert `zawaaj_interests` row:
  - `status = 'pending'`
  - `notified_recipient_at = now()`
  - `response_deadline = now() + 7 days`
  - `expires_date = now() + 7 days`
- Increment `zawaaj_profiles.interests_this_month`
- Insert `zawaaj_notifications` row for recipient family: `event_type = 'interest_received'`
- Send email to recipient's **female contact** (from `zawaaj_family_accounts`):
  Subject: "A family has expressed interest in [child name]'s profile on Zawaaj"
  Body: brief description, link to /introductions to respond. No contact details included.
- Sender's card updates to: "Interest sent — awaiting response"

### Recipient's view — /introductions → Received tab

```
New interest received

A family has expressed interest in [child name]'s profile.

┌─────────────────────────────────────────────────────┐
│  [Initials]   A. B.                                  │
│  28 · London · Software Engineer                     │
│  Hanafi · Pakistani                                  │
│                                                      │
│  [View profile]                   7 days to respond  │
└─────────────────────────────────────────────────────┘

How would you like to respond?

  [ Accept with warmth ▾ ]          [ Accept ]
  [ Decline respectfully ▾ ]        [ Decline ]
```

**Profile visibility on this screen:**
- Voluntary tier recipient: summary only (initials, age, location, profession, school of thought, attributes tags)
- Plus / Premium tier recipient: full profile detail (bio, faith depth, lifestyle notes, preferences)

This is enforced by the recipient's plan, not the sender's.

**Response — no free text.** Member selects a template from the dropdown. This is the only text associated with the response. The template body is NOT shown to the sender — only the outcome (accepted / declined) is communicated.

### On Accept

A sending the interest is A's agreement. The match is confirmed the moment B accepts. No reverse interest from B to A is needed or expected.

```
Server actions (atomic):
1. SET zawaaj_interests.status = 'accepted', responded_at = now(), is_mutual = true
2. INSERT zawaaj_matches (
     profile_a_id = sender_profile_id,
     profile_b_id = recipient_profile_id,
     status = 'pending_verification',
     mutual_date = now(),
     admin_notified_date = now()
   )
3. INSERT zawaaj_notifications for both families: event_type = 'match_pending_verification'
4. INSERT zawaaj_notifications for admin/assigned manager: event_type = 'match_pending_verification'
5. Send email to admin / assigned manager
6. Send email to sender's female contact:
   "Your interest in [initials] has been accepted. Our team will be in touch shortly."
7. Send email to recipient's female contact:
   "You have accepted an interest on Zawaaj. Our team will be in touch shortly
   to verify details and facilitate the introduction."
```

Sender's card updates to: "Interest accepted — our team will be in touch"
Recipient's /introductions view updates to: "Accepted — our team will be in touch"

### On Decline

```
Server actions:
1. SET zawaaj_interests.status = 'declined', responded_at = now()
2. INSERT zawaaj_notifications for sender: 'interest_declined'
   Notification text: "A family has respectfully responded to your interest in [initials]"
   (Does NOT say "declined" explicitly)
3. No email needed — in-app notification is sufficient for a decline
4. interests_this_month is NOT refunded
```

Sender's card shows briefly: "This family has respectfully responded" → removed from active view after 48 hours.

### On Expiry (7 days, no response)

Cron job (daily) or on-demand check:
```sql
UPDATE zawaaj_interests
SET status = 'expired'
WHERE status = 'pending'
  AND response_deadline < now();
```

No notification to either party. Card removed from sender's view. Counter not refunded.

---

## SECTION 6 — Admin match workflow

### Matches queue — `/admin/matches`

**Tabs:** Pending verification · Verified · Contacts shared · In follow-up · Closed

**Pending verification card:**

```
┌──────────────────────────────────────────────────────────────────┐
│  A. B.  28 · London · Engineer          ←→   Y. M.  26 · London  │
│  Matched: 12 Apr 2026              Assigned to: [Unassigned ▾]   │
│                                                                   │
│  Contact A:  Fatima Ahmed · Mother · 07xxx xxxxxx                 │
│  Registered as: Mother (Path A)  ✓ Pre-verified                  │
│  [Mark verified]                                                  │
│                                                                   │
│  Contact B:  [Father registered, female contact: Aisha K · Aunt] │
│  Registered as: Father (Path A, female fallback provided)         │
│  [Mark verified]   [Flag for review]                              │
│                                                                   │
│  [Share contact details]   ← disabled until both verified        │
└──────────────────────────────────────────────────────────────────┘
```

**Verification logic:**

| Registration | Contact type | Admin view |
|---|---|---|
| Parent registered, contact = mother | Auto-verified indicator | One-click confirm |
| Parent registered, contact = female guardian | Pre-verified indicator | One-click confirm |
| Parent registered, contact = father, female fallback provided | Needs review badge | Admin confirms female fallback |
| Parent registered, contact = father, no female contact | Warning flag badge | Admin must call/note before proceeding |
| Child registered, contact details present | Needs review badge | Admin confirms |

**On "Share contact details":**

1. Server checks both `contact_a_verified = true` AND `contact_b_verified = true`
2. Determines which number to share for each family:
   - If `no_female_contact_flag = false`: use `female_contact_number` if set, else `contact_number`
   - If `no_female_contact_flag = true`: use `contact_number` (primary contact, who is male)
3. Caches: `family_a_contact_name`, `family_a_contact_number`, `family_b_contact_name`, `family_b_contact_number` on match row (audit trail)
4. Sets `contacts_shared_at = now()`, `contacts_shared_by = admin_uid`
5. Updates `status = 'contacts_shared'`
6. Sends email to both families' contacts:
   Subject: "Introduction arranged — here are the contact details"
   Body: "Our team has arranged an introduction between your family and [other family contact name].
   Their contact number is: [number]. We encourage you to reach out at your convenience, insha'Allah."
7. In-app notification to both family accounts: `event_type = 'contacts_shared'`
8. Members see: "Introduction complete — our team has been in touch"
9. Sets `followup_due_at = now() + 14 days` (admin can adjust)

### Manager assignment

Admin assigns any match to a manager via dropdown. Manager sees only assigned matches in their `/admin/matches` view, filtered to their scope.

Manager can:
- Verify contacts (within their scope)
- Share contact details (within their scope)
- Log follow-up notes
- Mark outcome

Manager cannot:
- See matches outside their assigned scope
- Appoint other managers (super admin only)
- See unassigned matches

### Follow-up

When `followup_due_at` is reached:
- In-app notification to assigned manager / admin: `event_type = 'followup_due'`
- Admin/manager can log: `followup_notes`, `followup_done_at`
- Outcome tracked: in_conversation / meeting_arranged / engaged / married / unsuccessful / withdrawn

### Premium concierge

For Premium family accounts:
- Match is automatically assigned to a manager on creation (if manager exists with matching scope)
- Manager proactively contacts both families after contact share
- Manager logs notes and marks outcome
- Member dashboard shows: "Your dedicated manager [Name] is overseeing this introduction"

---

## SECTION 7 — Manager admin — `/admin/managers`

Super admin only.

**Manager card:**

```
Full name *
Email
Contact number
Role *        [ Manager ▾ ]  / Senior manager

Scope — cities        [London] [Birmingham] [+]
Scope — genders       [All / Male / Female]
Scope — languages     [Urdu] [Arabic] [+]
Scope — ethnicities   [South Asian] [Arab] [+]

Notes (private)

[Active ✓]   [Deactivate]   [Remove]
```

Matches are auto-assigned to the manager whose scope best matches the profiles' locations and genders. Super admin can override at any time.

---

## SECTION 8 — Browse page changes

- Persistent banner: "Browsing as [Name] · [Switch]"
- Interest button label: "Express interest" (not "Request introduction")
- Card status labels:
  - "Interest sent — awaiting response" (pending)
  - "Interest accepted — our team will be in touch" (accepted)
  - "This family has respectfully responded" (declined, shown 48h then removed)
  - "Interest expired" (expired, removed after 48h)
- No photos — do not add a photo field
- If recipient has `no_female_contact_flag = true`: small note on the interest received screen:
  "Note: this family's primary contact is a male guardian."

---

## SECTION 9 — Profile card — additional field

Visible to members on profile modal:

```
── Contact information (visible after mutual match + admin share only) ──
[Hidden — Our team will share contact details after verification]
```

Never shown pre-match. This text replaces any placeholder.

---

## SECTION 10 — Copy changes

| Old | New |
|---|---|
| "Request introduction" | "Express interest" |
| "Introduction requested" | "Interest sent" |
| "Awaiting response" | "Awaiting family's response" |
| "Mutual match confirmed" | "Interest accepted — our team will be in touch" |
| "Introduction in progress" | "Being handled by our team" |
| "Introduction complete" | "Families have been connected" |
| "Browse" / "Find a Match" (already changed) | "Find a Match" ✓ |

---

## SECTION 11 — Pricing table updates

Replace "Monthly introduction requests" row with:

**"Monthly interest expressions (per profile)"**

| | Voluntary | Plus | Premium |
|---|---|---|---|
| Candidate profiles | Up to 2 | Up to 4 | Up to 4 |
| Monthly interest expressions / profile | 5 | 15 | Unlimited |
| Full profile detail on received interests | Summary only | ✓ Full | ✓ Full |
| Profile boost | ✗ | 1× / month | Weekly |
| Spotlight listing | ✗ | ✗ | 1× / month |
| Who viewed your profile | ✗ | ✗ | ✓ |
| Admin support | Standard | Priority | Priority |
| Events access | Selected | ✓ | ✓ |
| Dedicated manager | ✗ | ✗ | ✓ |
| Manager follow-up after introduction | ✗ | ✗ | ✓ |

---

## SECTION 12 — Landing page / website updates

### Hero subtext

"Zawaaj is a family-first matrimonial platform. Mothers connect with mothers. Every introduction is admin-verified, dignified, and private."

### How it works — Step 1

"Create your family account — a parent, guardian, or candidate registers. The primary contact for all introductions is always a mother or female guardian."

### How it works — Step 3

"Express interest — when a profile feels right, express interest. The other family is notified and invited to respond. No contact details are shared at this stage."

### How it works — Step 4

"Families connected — when both families accept, our team verifies the contacts and connects the mothers directly. Only then are details shared."

### Trust bar — replace one item

Old: "No direct contact without admin step"
New: "Mother-to-mother introductions, verified by our team"

### Values — add fifth card

Title: "Family-first by design"
Description: "Every introduction connects families, not just individuals. The mother or female guardian is always the point of contact — keeping the process rooted in respect and Islamic tradition."

---

## SECTION 13 — What does NOT change

- Browse UI layout (cards, modal, compatibility bar)
- Theme C colour tokens and globals.css
- Help centre structure (articles need updating but structure stays)
- Admin ban system
- Import tool (imported profiles get a family_account_id auto-created per import row)
- Stripe / subscription integration
- SF Symbol icons in nav
