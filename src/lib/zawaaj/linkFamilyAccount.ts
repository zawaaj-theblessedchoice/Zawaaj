/**
 * linkFamilyAccount — Family Account Auto-Linking
 *
 * Called after successful registration. Attempts to find an existing
 * zawaaj_family_accounts row that matches the new user's phone or email,
 * and links the profile to it.
 *
 * Matching priority:
 *  1. Phone number match (normalised) against contact_number or female_contact_number
 *  2. Email match against contact_email
 *
 * Sibling detection:
 *  If the matching family account already has profiles attached, and ANY of
 *  those profiles share the same last name as the new profile, they are flagged
 *  as potential siblings (duplicate_flag = true on the new profile) and the
 *  admin is notified via a note in admin_notes.
 *
 * Returns a LinkResult describing what happened.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { normalisePhone } from './normalisePhone'

export interface LinkResult {
  linked: boolean
  familyAccountId: string | null
  siblingDetected: boolean
  siblingProfileIds: string[]
  method: 'phone' | 'email' | 'none'
}

interface LinkParams {
  profileId: string
  userId: string
  email: string
  phone: string | null | undefined
  firstName: string | null | undefined
  lastName: string | null | undefined
}

export async function attemptFamilyAccountLink(params: LinkParams): Promise<LinkResult> {
  const { profileId, userId, email, phone, lastName } = params

  const normalisedPhone = normalisePhone(phone)

  // ── 1. Find a matching family account ────────────────────────────────────────

  let familyAccount: { id: string; contact_email: string; contact_number: string; female_contact_number: string | null } | null = null

  // 1a. Try phone match first (more reliable than email)
  if (normalisedPhone) {
    // Fetch all active family accounts and compare normalised phones
    // We pull a limited set to avoid scanning the entire table
    const { data: phoneRows } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, contact_number, female_contact_number')
      .in('status', ['active', 'pending_approval'])
      .limit(500)

    if (phoneRows) {
      for (const row of phoneRows) {
        if (
          normalisePhone(row.contact_number) === normalisedPhone ||
          normalisePhone(row.female_contact_number) === normalisedPhone
        ) {
          familyAccount = row
          break
        }
      }
    }
  }

  // 1b. Fall back to email match
  if (!familyAccount && email) {
    const { data: emailRow } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, contact_number, female_contact_number')
      .ilike('contact_email', email)
      .in('status', ['active', 'pending_approval'])
      .maybeSingle()

    if (emailRow) familyAccount = emailRow
  }

  // No match found
  if (!familyAccount) {
    return { linked: false, familyAccountId: null, siblingDetected: false, siblingProfileIds: [], method: 'none' }
  }

  const method = familyAccount.contact_email.toLowerCase() === email.toLowerCase() &&
    !normalisePhone(familyAccount.contact_number)
    ? 'email'
    : 'phone'

  // ── 2. Sibling detection ──────────────────────────────────────────────────────

  const siblingProfileIds: string[] = []
  let siblingDetected = false

  if (lastName) {
    const { data: existingProfiles } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, last_name')
      .eq('family_account_id', familyAccount.id)
      .neq('id', profileId)

    if (existingProfiles) {
      for (const p of existingProfiles) {
        if (p.last_name && p.last_name.toLowerCase() === lastName.toLowerCase()) {
          siblingProfileIds.push(p.id)
          siblingDetected = true
        }
      }
    }
  }

  // ── 3. Link the profile to the family account ────────────────────────────────

  const updatePayload: Record<string, unknown> = {
    family_account_id: familyAccount.id,
  }

  if (siblingDetected) {
    updatePayload.duplicate_flag = true
    updatePayload.admin_notes = `[Auto-link] Linked to family account ${familyAccount.id} via ${method} match. Potential sibling(s) detected: ${siblingProfileIds.join(', ')}. Please review.`
  }

  const { error: linkError } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update(updatePayload)
    .eq('id', profileId)

  if (linkError) {
    console.error('[linkFamilyAccount] Failed to link profile:', linkError.message)
    return { linked: false, familyAccountId: null, siblingDetected, siblingProfileIds, method }
  }

  // ── 4. Also set the primary_user_id on the family account if not already set ─

  const { data: fa } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .select('primary_user_id')
    .eq('id', familyAccount.id)
    .single()

  if (fa && !fa.primary_user_id) {
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({ primary_user_id: userId })
      .eq('id', familyAccount.id)
  }

  return {
    linked: true,
    familyAccountId: familyAccount.id,
    siblingDetected,
    siblingProfileIds,
    method,
  }
}
