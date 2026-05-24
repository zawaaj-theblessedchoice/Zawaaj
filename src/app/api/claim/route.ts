import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── GET — load claim preview for a claim_invite token ───────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const tokenId = req.nextUrl.searchParams.get('token_id')
  if (!tokenId) return NextResponse.json({ error: 'token_id required' }, { status: 400 })

  // Load token + family account
  const { data: token, error } = await supabaseAdmin
    .from('zawaaj_invite_tokens')
    .select(`
      id, family_account_id, purpose, expires_at, accepted_at,
      family_account:zawaaj_family_accounts(
        id, contact_full_name, contact_email, contact_number
      )
    `)
    .eq('id', tokenId)
    .eq('purpose', 'claim_invite')
    .maybeSingle()

  if (error || !token) {
    return NextResponse.json({ error: 'Invalid or expired claim link.' }, { status: 404 })
  }
  if (token.accepted_at) {
    return NextResponse.json({ error: 'This claim link has already been used.' }, { status: 409 })
  }
  if (new Date(token.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'This claim link has expired. Please ask your manager for a new one.' }, { status: 410 })
  }

  const familyAccountId = token.family_account_id as string

  // Load linked profiles summary
  const { data: profiles } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, first_name, last_name, gender, age_display, location, data_completeness_score, missing_fields_json')
    .eq('family_account_id', familyAccountId)
    .neq('status', 'withdrawn')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fa = token.family_account as any

  return NextResponse.json({
    token_id:          token.id,
    family_account_id: familyAccountId,
    contact_full_name: fa?.contact_full_name ?? null,
    contact_email:     fa?.contact_email ?? null,
    expires_at:        token.expires_at,
    profiles:          (profiles ?? []).map((p) => ({
      id:                      p.id,
      first_name:              p.first_name,
      last_name:               p.last_name,
      gender:                  p.gender,
      age_display:             p.age_display,
      location:                p.location,
      data_completeness_score: p.data_completeness_score,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      missing_fields:          p.missing_fields_json
        ? (typeof p.missing_fields_json === 'string'
          ? JSON.parse(p.missing_fields_json)
          : p.missing_fields_json) as string[]
        : [],
    })),
  })
}

// ─── POST — complete the claim (create auth user + link everything) ───────────

interface ClaimPayload {
  token_id: string
  email: string
  password: string
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as ClaimPayload
    const { token_id, email, password } = body

    if (!token_id || !email || !password) {
      return NextResponse.json({ error: 'token_id, email and password are required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    // 1. Validate token
    const { data: token, error: tokenErr } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .select('id, family_account_id, expires_at, accepted_at')
      .eq('id', token_id)
      .eq('purpose', 'claim_invite')
      .maybeSingle()

    if (tokenErr || !token) {
      return NextResponse.json({ error: 'Invalid claim token.' }, { status: 404 })
    }
    if (token.accepted_at) {
      return NextResponse.json({ error: 'This claim link has already been used.' }, { status: 409 })
    }
    if (new Date(token.expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'This claim link has expired.' }, { status: 410 })
    }

    const familyAccountId = token.family_account_id as string

    // 2. Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const alreadyExists = existingUsers?.users?.some(u => u.email === email.toLowerCase())
    if (alreadyExists) {
      return NextResponse.json({
        error: 'An account with this email already exists. Please sign in instead.',
        code: 'email_exists',
      }, { status: 409 })
    }

    // 3. Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email:            email.toLowerCase(),
      password,
      email_confirm:    true, // no verification email needed — link was the verification
    })

    if (createErr || !newUser?.user) {
      return NextResponse.json({ error: createErr?.message ?? 'Failed to create account.' }, { status: 500 })
    }

    const userId = newUser.user.id
    const now = new Date().toISOString()

    // 4. Get linked profiles
    const { data: linkedProfiles } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id')
      .eq('family_account_id', familyAccountId)
      .neq('status', 'withdrawn')

    const firstProfileId = linkedProfiles?.[0]?.id ?? null

    // 5. Create user settings (point to first linked profile)
    if (firstProfileId) {
      await supabaseAdmin
        .from('zawaaj_user_settings')
        .upsert({
          user_id:           userId,
          active_profile_id: firstProfileId,
        }, { onConflict: 'user_id' })
    }

    // 6. Update family account
    await supabaseAdmin
      .from('zawaaj_family_accounts')
      .update({
        primary_user_id: userId,
        status:          'active',
        readiness_state: 'representative_linked',
      })
      .eq('id', familyAccountId)

    // 7. Clear needs_claim on all linked profiles
    if ((linkedProfiles ?? []).length > 0) {
      const profileIds = (linkedProfiles ?? []).map((p) => p.id as string)
      await supabaseAdmin
        .from('zawaaj_profiles')
        .update({ needs_claim: false })
        .in('id', profileIds)
    }

    // 8. Mark token accepted
    await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .update({ accepted_by: userId, accepted_at: now })
      .eq('id', token_id)

    // 9. Try to auto-promote to intro_ready
    //    Checks 1 (status='active') and 2 (primary_user_id set) are already
    //    satisfied by step 6. Run checks 3 and 4 then attempt promotion.
    try {
      // Check 3: at least one profile in the family must be approved
      const { data: approvedProfiles, error: approvedErr } = await supabaseAdmin
        .from('zawaaj_profiles')
        .select('id')
        .eq('family_account_id', familyAccountId)
        .eq('status', 'approved')
        .limit(1)

      if (approvedErr) {
        console.error('[claim] eligibility check 3 error:', approvedErr.message)
      } else if (!approvedProfiles?.length) {
        console.log('[claim] eligibility check 3 failed: no approved profiles in family')
      } else {
        // Check 4: family account must have at least one contact field
        const { data: faContact, error: faErr } = await supabaseAdmin
          .from('zawaaj_family_accounts')
          .select('contact_email, contact_number')
          .eq('id', familyAccountId)
          .single()

        if (faErr) {
          console.error('[claim] eligibility check 4 error:', faErr.message)
        } else {
          const hasContact = !!(faContact?.contact_email || faContact?.contact_number)
          if (!hasContact) {
            console.log('[claim] eligibility check 4 failed: no contact field on family account')
          } else {
            // All four checks passed — promote to intro_ready
            const { error: introErr } = await supabaseAdmin
              .from('zawaaj_family_accounts')
              .update({ readiness_state: 'intro_ready' })
              .eq('id', familyAccountId)
              .eq('readiness_state', 'representative_linked')

            if (introErr) {
              console.error('[claim] failed to set intro_ready:', introErr.message)
            } else {
              console.log('[claim] eligibility passed → readiness_state: intro_ready')
            }
          }
        }
      }
    } catch (stateErr) {
      // Safety net — promotion failure must never break the success response
      console.error('[claim] unexpected error during readiness_state promotion:', stateErr)
    }

    return NextResponse.json({ ok: true, email: email.toLowerCase() })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
