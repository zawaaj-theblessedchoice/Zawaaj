// GET /api/register/validate-invite-token?token=xxx
//
// Validates a child_invite or guardian_invite token and returns the
// associated family account contact details (for pre-filling the form).
// Does NOT mark the token as accepted — that happens on submit.
// Public — no auth required.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    // Fetch token row
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .select('id, purpose, family_account_id, invited_email, invited_name, accepted_at, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (tokenError) {
      return NextResponse.json({ error: 'Failed to look up token' }, { status: 500 })
    }
    if (!tokenRow) {
      return NextResponse.json({ error: 'invalid' }, { status: 404 })
    }

    // Check purpose
    if (tokenRow.purpose !== 'child_invite' && tokenRow.purpose !== 'guardian_invite') {
      return NextResponse.json({ error: 'invalid' }, { status: 404 })
    }

    // Check expiry
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 410 })
    }

    // Check already used
    if (tokenRow.accepted_at) {
      return NextResponse.json({ error: 'already_used' }, { status: 409 })
    }

    // Fetch family account contact details
    const { data: familyAccount, error: faError } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_full_name, contact_relationship, contact_number, contact_email, female_contact_name, female_contact_number, female_contact_relationship, no_female_contact_flag, father_explanation')
      .eq('id', tokenRow.family_account_id)
      .single()

    if (faError || !familyAccount) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      familyAccountId: familyAccount.id,
      invitedName: tokenRow.invited_name ?? null,
      invitedEmail: tokenRow.invited_email ?? null,
      family: {
        contactFullName:         familyAccount.contact_full_name,
        contactRelationship:     familyAccount.contact_relationship,
        contactNumber:           familyAccount.contact_number,
        contactEmail:            familyAccount.contact_email,
        femaleContactName:       familyAccount.female_contact_name ?? null,
        femaleContactNumber:     familyAccount.female_contact_number ?? null,
        femaleContactRelationship: familyAccount.female_contact_relationship ?? null,
        noFemaleContactFlag:     familyAccount.no_female_contact_flag ?? false,
        fatherExplanation:       familyAccount.father_explanation ?? null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
