# Revenue Readiness Audit — Zawaaj

**Date:** 2026-04-23  
**Scope:** Stripe integration, entitlement enforcement, downgrade logic, and go-live blockers.

---

## Executive Summary

The core Stripe plumbing (checkout, webhooks, portal, plan enforcement) is wired and functional. Several **environment variables are not yet confirmed as configured in Vercel production**. Three webhook events are not handled. The entitlement engine is reliable but there is a gap in how `family_account.plan` and `zawaaj_subscriptions` stay in sync. All gaps are fixable before go-live.

**Status: 🟡 Not yet go-live ready — see blockers below.**

---

## 1. Environment Variables

### Required — must be set in Vercel production

| Variable | Used in | Status |
|---|---|---|
| `STRIPE_SECRET_KEY` | `create-checkout`, `portal`, `webhook` | ⚠ Must verify |
| `STRIPE_WEBHOOK_SECRET` | `webhook/route.ts` | ⚠ Must verify |
| `STRIPE_PLUS_MONTHLY_PRICE_ID` | `create-checkout`, `webhook` | ⚠ Must verify |
| `STRIPE_PLUS_ANNUAL_PRICE_ID` | `create-checkout`, `webhook` | ⚠ Must verify |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | `create-checkout`, `webhook` | ⚠ Must verify |
| `STRIPE_PREMIUM_ANNUAL_PRICE_ID` | `create-checkout`, `webhook` | ⚠ Must verify |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | ✅ Confirmed set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase clients | ✅ Confirmed set |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client | ✅ Confirmed set |
| `NEXT_PUBLIC_SITE_URL` | Auth redirects, claim links | ✅ Confirmed set |
| `RESEND_API_KEY` | `nudge-pending-claims` Edge Function | ⚠ Optional for nudge emails |

### Action required
1. Confirm all six `STRIPE_*` env vars are set in Vercel → Settings → Environment Variables (Production).
2. Use **live** keys in production (`sk_live_*`, `whsec_*`), not test keys (`sk_test_*`).
3. Set `RESEND_API_KEY` if email nudges are wanted at launch; function degrades gracefully without it (logs only).

---

## 2. Stripe Webhook Registration

### Webhook URL
`https://zawaaj.uk/api/stripe/webhook`

Must be registered in the Stripe Dashboard → Developers → Webhooks.

### Events handled ✅
| Event | Handler | Effect |
|---|---|---|
| `checkout.session.completed` | ✅ | Upserts subscription row, sets plan |
| `customer.subscription.updated` | ✅ | Updates plan, status, period dates |
| `customer.subscription.deleted` | ✅ | Downgrades to `free`, status = `cancelled` |
| `invoice.payment_succeeded` | ✅ | Refreshes period dates on renewal |
| `invoice.payment_failed` | ✅ | Sets status = `past_due` |

### Events not handled ⚠
| Event | Risk | Recommended action |
|---|---|---|
| `customer.subscription.paused` | User pauses via portal — plan stays active incorrectly | Add handler: set `status = 'paused'`, gate features |
| `customer.subscription.resumed` | Pause lifted — need to restore active status | Add handler: set `status = 'active'` |
| `customer.dispute.created` | Chargeback opens — no admin alert | Low risk for MVP; add Slack/email alert later |

### Gaps in webhook handler
- **`customer.subscription.deleted` uses `plan: 'free'`** — should use `'voluntary'` to match DB slug. The `getUserPlan()` fallback also returns `'free'`. Both should be normalised to `'voluntary'` for consistency (non-blocking, cosmetic).
- **`user_id` metadata dependency**: If a subscription is created without `metadata.user_id` (e.g. via Stripe Dashboard manually), handlers silently skip. Add an admin alert log for this case.

---

## 3. Checkout Flow

**File:** `src/app/api/stripe/create-checkout/route.ts`

### ✅ Working correctly
- Auth guard (server-side session check)
- Resolves price from plan+billing combo (monthly/annual)
- Re-uses existing Stripe customer if one exists for the user
- Sets `metadata.user_id` on session and subscription (webhook dependency)
- Success redirect → `/settings?tab=membership&checkout=success`
- Cancel redirect → `/pricing`

### ⚠ Issues to fix before go-live
1. **`allow_promotion_codes: false`** — currently blocks discount codes. If you plan to launch with a promo, change this to `true` before launch (or on first day of promo campaign).
2. **No trial period logic** — no `trial_period_days` in checkout. Fine for MVP but document this decision.
3. **Annual billing** — annual price IDs are in the map but no annual option is exposed in the UI (`UpgradeClient.tsx` only has monthly). Either add annual toggle in UI or remove annual price IDs from the map to avoid confusion.

---

## 4. Customer Portal

**File:** `src/app/api/stripe/portal/route.ts`

Allows users to manage their subscription (cancel, update card, view invoices) via Stripe's hosted portal.

### ✅ Working
- Requires authenticated session
- Looks up `stripe_customer_id` from `zawaaj_subscriptions`
- Returns portal session URL; client redirects

### ⚠ Issues
- **No portal URL configured**: The portal configuration in Stripe Dashboard → Billing → Customer portal must be set up with the correct return URL (`https://zawaaj.uk/settings?tab=membership`). This is a Dashboard action, not a code change.
- **If `stripe_customer_id` is null**: Returns a 400 error ("No Stripe customer found"). This will happen if a user never completed a checkout. The UI should guard against showing the portal button to Community Access users.

---

## 5. Entitlement Engine

**Source of truth:** `zawaaj_subscriptions.plan` (read via `getUserPlan()` in `src/lib/plans.ts`)

### How plan limits are enforced

| Feature | Enforced at | Method |
|---|---|---|
| Monthly introduction requests | Server — `POST /api/introduction-requests` | Reads `interests_this_month` vs `getPlanConfig(plan).maxMonthlyRequests` |
| Profile detail visibility | Client — `ProfileModal.tsx` | Checks plan against `PLAN_CONFIG` |
| Browse filter — "Recommended" | Client — `BrowseClient.tsx` | Reads plan from subscription status endpoint |
| Concierge matching | Admin console only — not member-facing | N/A |

### ✅ What works
- Introduction request limits are enforced server-side (cannot be bypassed by client)
- Monthly counter resets on the 1st of each month (checked in route handler)
- Plan config is in one place (`src/lib/plan-config.ts`) and consistently referenced

### ⚠ Gaps
1. **`zawaaj_family_accounts.plan` vs `zawaaj_subscriptions.plan`** — The family account table has its own `plan` column (used in the Operations Console and family account pages). This column is not automatically updated when a Stripe subscription is provisioned. There is no sync logic. If a user upgrades via Stripe, `zawaaj_family_accounts.plan` will be stale unless manually updated.
   - **Recommendation**: Add a step to `upsertSubscription()` in the webhook to also update `zawaaj_family_accounts.plan` via a join on `primary_user_id`.

2. **`past_due` status does not gate features** — When `invoice.payment_failed` fires, the subscription status becomes `past_due` in the DB, but `getUserPlan()` only checks `eq('status', 'active')`. A `past_due` user still has no plan returned (falls through to `'free'`), which is arguably correct behaviour — but the UI should show a payment-failed banner.
   - **Recommendation**: In the subscription status API endpoint, return `past_due` as a flag so the UI can show a "Please update your payment method" prompt.

3. **Annual plan not in UI** — Annual billing is in the webhook resolver but not exposed in `UpgradeClient.tsx`. Either add it or remove annual price IDs.

---

## 6. Downgrade Logic

### What happens when a subscription is cancelled

1. User cancels via portal → Stripe sets `cancel_at_period_end = true` → `customer.subscription.updated` fires → DB updated
2. At period end, Stripe fires `customer.subscription.deleted` → webhook sets `plan = 'free'`, `status = 'cancelled'`
3. Next request: `getUserPlan()` returns `'free'` → user gets Community Access limits

### ✅ Correct behaviour
- No immediate downgrade — access continues until end of paid period ✓
- Automatic downgrade at period end ✓
- `cancel_at_period_end` flag is stored in DB ✓

### ⚠ UI gap
- No "Your plan will cancel on [date]" message shown to the member. The subscription status API returns `cancel_at_period_end` — wire this into the Settings page membership section.

---

## 7. `zawaaj_subscriptions` Table Health Check

Run this in Supabase SQL editor to verify state before go-live:

```sql
-- Check for users with active subscriptions
SELECT plan, status, COUNT(*) 
FROM zawaaj_subscriptions 
GROUP BY plan, status 
ORDER BY plan, status;

-- Check for subscriptions with no matching user
SELECT zs.user_id, zs.plan, zs.status
FROM zawaaj_subscriptions zs
LEFT JOIN auth.users u ON u.id = zs.user_id
WHERE u.id IS NULL;

-- Check family accounts whose plan doesn't match their subscription
SELECT fa.id, fa.plan AS fa_plan, zs.plan AS sub_plan, zs.status
FROM zawaaj_family_accounts fa
JOIN zawaaj_subscriptions zs ON zs.user_id = fa.primary_user_id
WHERE fa.plan != zs.plan AND zs.status = 'active';
```

---

## 8. Go-Live Checklist

### Must-do before first paid transaction

- [ ] Confirm all six `STRIPE_*` env vars are set in Vercel production (live keys)
- [ ] Register webhook at `https://zawaaj.uk/api/stripe/webhook` in Stripe Dashboard with all 5 listed events
- [ ] Configure Stripe Customer Portal in Dashboard with return URL `https://zawaaj.uk/settings?tab=membership`
- [ ] Normalise `customer.subscription.deleted` plan to `'voluntary'` (not `'free'`) — or confirm fallback is acceptable
- [ ] Add sync of `zawaaj_family_accounts.plan` in `upsertSubscription()` webhook helper
- [ ] Add "cancel pending" UI note in Settings (shows when `cancel_at_period_end = true`)
- [ ] Test end-to-end: checkout → webhook → plan active → portal cancel → webhook → downgrade

### Nice-to-have before launch

- [ ] Set `allow_promotion_codes: true` in checkout if using promo codes at launch
- [ ] Add UI payment-failed banner (reads `past_due` status from subscription status endpoint)
- [ ] Add annual billing toggle to UpgradeClient.tsx (or remove annual price IDs)
- [ ] Set `RESEND_API_KEY` to enable Day-7 / Day-14 nudge emails for imported families
- [ ] Verify Stripe test mode webhooks pass end-to-end in staging before flipping to live

---

## 9. Summary of Blockers

| Blocker | Severity | Effort |
|---|---|---|
| STRIPE_* env vars not confirmed in production | 🔴 Critical | Minutes (Vercel dashboard) |
| Webhook not registered in Stripe | 🔴 Critical | Minutes (Stripe dashboard) |
| Customer portal return URL not configured | 🔴 Critical | Minutes (Stripe dashboard) |
| `zawaaj_family_accounts.plan` not synced on upgrade | 🟠 High | ~30 min (code change in webhook) |
| No UI for cancel-pending status | 🟡 Medium | ~1 hour |
| Annual billing in webhook but not in UI | 🟡 Medium | Remove or add |
| `customer.subscription.paused` not handled | 🟡 Medium | ~30 min |

The three Critical blockers are all Dashboard configuration steps, not code changes.
