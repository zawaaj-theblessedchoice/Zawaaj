import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Derived Path B readiness evaluation.
 *
 * Recomputes whether a family account qualifies for `intro_ready` and promotes
 * it if so. Designed to be called after ANY eligibility-input-changing event —
 * not just at invite-accept time — so an input that changes later (most
 * importantly a profile being APPROVED after the rep already linked) still
 * advances the family without manual intervention.
 *
 * Promotion rule (only acts on the representative_linked → intro_ready edge):
 *   Promote to `intro_ready` IFF current readiness_state = 'representative_linked'
 *   AND all four eligibility checks pass:
 *     1. family account status = 'active'
 *     2. primary_user_id is not null
 *     3. ≥1 profile in the family has status = 'approved'
 *     4. the family's representative profile has first_name, last_name, and a
 *        contact field (profile.contact_number OR family contact_email/number)
 *
 * Idempotent + safe:
 *   - The UPDATE is guarded with .eq('readiness_state','representative_linked'),
 *     so calling it repeatedly, or when already intro_ready / earlier in the
 *     flow, is a no-op.
 *   - Never throws to the caller — failures are logged and swallowed, because
 *     this runs as a side-effect of approval/link flows that must still succeed.
 *
 * Representative resolution: the rep profile is whichever profile has
 * active_profile_id pointing at this family's primary_user_id. We resolve it via
 * zawaaj_user_settings(primary_user_id).active_profile_id, falling back to any
 * approved profile's contact when the rep profile can't be resolved (Check 4's
 * contact part also accepts the family account's own contact fields).
 *
 * @returns the resulting readiness_state action: 'promoted' | 'no-change' | 'skipped'
 */
export async function evaluateReadiness(
  familyAccountId: string,
): Promise<'promoted' | 'no-change' | 'skipped'> {
  try {
    // Load family: current state + eligibility-relevant fields.
    const { data: fa, error: faErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, readiness_state, status, primary_user_id, contact_email, contact_number')
      .eq('id', familyAccountId)
      .maybeSingle()

    if (faErr || !fa) {
      console.error('[evaluateReadiness] family fetch failed:', faErr?.message ?? 'not found')
      return 'skipped'
    }

    // Only the representative_linked → intro_ready edge is in scope here.
    // (Earlier edges are handled at invite-accept; later/terminal states are left alone.)
    if (fa.readiness_state !== 'representative_linked') return 'no-change'

    // Check 1: family must be active
    if (fa.status !== 'active') return 'no-change'

    // Check 2: primary_user_id set
    if (!fa.primary_user_id) return 'no-change'

    // Check 3: ≥1 approved profile in the family
    const { data: approvedProfiles, error: approvedErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id')
      .eq('family_account_id', familyAccountId)
      .eq('status', 'approved')
      .limit(1)

    if (approvedErr) {
      console.error('[evaluateReadiness] approved-profiles check failed:', approvedErr.message)
      return 'skipped'
    }
    if (!approvedProfiles?.length) return 'no-change'

    // Check 4: representative profile has first_name + last_name + a contact field.
    // Resolve the rep profile via the family's primary_user_id → active_profile_id.
    const { data: repSettings } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', fa.primary_user_id)
      .maybeSingle()

    const repProfileId = repSettings?.active_profile_id
    if (!repProfileId) return 'no-change'

    const { data: repProfile, error: repErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('first_name, last_name, contact_number')
      .eq('id', repProfileId)
      .maybeSingle()

    if (repErr) {
      console.error('[evaluateReadiness] rep-profile check failed:', repErr.message)
      return 'skipped'
    }

    const hasContact = !!(
      repProfile?.contact_number ||
      fa.contact_email ||
      fa.contact_number
    )

    if (!repProfile?.first_name || !repProfile?.last_name || !hasContact) {
      return 'no-change'
    }

    // All checks pass — promote (guarded so concurrent/repeat calls are no-ops).
    const { error: promoteErr, count } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ readiness_state: 'intro_ready' }, { count: 'exact' })
      .eq('id', familyAccountId)
      .eq('readiness_state', 'representative_linked')

    if (promoteErr) {
      console.error('[evaluateReadiness] promotion failed:', promoteErr.message)
      return 'skipped'
    }

    if ((count ?? 0) > 0) {
      console.log('[evaluateReadiness] family', familyAccountId, '→ intro_ready')
      return 'promoted'
    }
    return 'no-change'
  } catch (err) {
    console.error('[evaluateReadiness] unexpected error:', err)
    return 'skipped'
  }
}
