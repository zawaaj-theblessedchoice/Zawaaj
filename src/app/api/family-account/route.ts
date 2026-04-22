import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_RELATIONSHIPS = new Set([
  'mother', 'grandmother', 'aunt', 'female_guardian', 'father', 'male_guardian',
])

const VALID_FEMALE_RELS = new Set([
  'grandmother', 'aunt', 'female_guardian', 'sister', 'other_female_relative',
])

const MALE_RELATIONSHIPS = new Set(['father', 'male_guardian'])

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Payload ───────────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({})) as {
    contact_full_name?: string
    contact_relationship?: string
    contact_number?: string
    female_contact_name?: string | null
    female_contact_number?: string | null
    female_contact_relationship?: string | null
    father_explanation?: string
    no_female_contact_flag?: boolean
  }

  const {
    contact_full_name,
    contact_relationship,
    contact_number,
    female_contact_name = null,
    female_contact_number = null,
    female_contact_relationship = null,
    father_explanation = '',
    no_female_contact_flag = false,
  } = body

  // ── Validation ────────────────────────────────────────────────────────────────
  if (!contact_full_name?.trim()) {
    return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
  }
  if (!contact_relationship || !VALID_RELATIONSHIPS.has(contact_relationship)) {
    return NextResponse.json({ error: 'Invalid relationship' }, { status: 400 })
  }
  if (!contact_number?.trim()) {
    return NextResponse.json({ error: 'Contact number is required' }, { status: 400 })
  }

  const isMale = MALE_RELATIONSHIPS.has(contact_relationship)

  if (isMale && !no_female_contact_flag) {
    if (!female_contact_name?.trim() || !female_contact_number?.trim()) {
      return NextResponse.json({ error: 'Female representative details are required for male contacts' }, { status: 400 })
    }
    if (female_contact_relationship && !VALID_FEMALE_RELS.has(female_contact_relationship)) {
      return NextResponse.json({ error: 'Invalid female representative relationship' }, { status: 400 })
    }
  }

  if (isMale && no_female_contact_flag && !father_explanation.trim()) {
    return NextResponse.json({ error: 'An explanation is required when no female representative is available' }, { status: 400 })
  }

  // ── Verify ownership ──────────────────────────────────────────────────────────
  // RLS "zfa: own update" policy ensures only primary_user_id can update,
  // but we still verify the row exists before attempting the update.
  const { data: existing } = await supabase
    .from('zawaaj_family_accounts')
    .select('id')
    .eq('primary_user_id', user.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'No family account found for this user' }, { status: 404 })
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('zawaaj_family_accounts')
    .update({
      contact_full_name: contact_full_name.trim(),
      contact_relationship,
      contact_number: contact_number.trim(),
      female_contact_name: isMale && !no_female_contact_flag ? female_contact_name?.trim() || null : null,
      female_contact_number: isMale && !no_female_contact_flag ? female_contact_number?.trim() || null : null,
      female_contact_relationship: isMale && !no_female_contact_flag ? female_contact_relationship || null : null,
      father_explanation: no_female_contact_flag ? father_explanation.trim() : '',
      no_female_contact_flag,
    })
    .eq('primary_user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
