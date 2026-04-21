import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/introduction-requests/[id]/candidate-preference
//
// Candidates (child_user_id) may note their personal preference on a received
// introduction request. This does NOT constitute an official response — that can
// only be made by the family representative (primary_user_id) via /respond.
//
// Valid preferences: 'interested' | 'not_interested' | 'needs_family_review'

const VALID_PREFERENCES = ['interested', 'not_interested', 'needs_family_review'] as const
type CandidatePreference = typeof VALID_PREFERENCES[number]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: requestId } = await params
    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate preference
    const body = await request.json() as { preference?: string }
    const { preference } = body

    if (!preference || !VALID_PREFERENCES.includes(preference as CandidatePreference)) {
      return NextResponse.json(
        { error: 'invalid_preference', valid: VALID_PREFERENCES },
        { status: 400 }
      )
    }

    // 3. Load the introduction request — including target profile's child_user_id
    const { data: introRequest, error: reqError } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .select('id, target_profile_id, status, zawaaj_profiles!target_profile_id(child_user_id, family_account_id)')
      .eq('id', requestId)
      .single()

    if (reqError || !introRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 4. Verify caller is the candidate (child_user_id) on the target profile
    type ProfileLink = { child_user_id: string | null; family_account_id: string | null }
    const profileLink = (
      Array.isArray(introRequest.zawaaj_profiles)
        ? introRequest.zawaaj_profiles[0]
        : introRequest.zawaaj_profiles
    ) as ProfileLink | null

    if (!profileLink?.child_user_id || profileLink.child_user_id !== user.id) {
      return NextResponse.json(
        { error: 'not_your_profile', message: 'Only the candidate may use this endpoint.' },
        { status: 403 }
      )
    }

    // 5. Only active requests can receive a preference note
    if (introRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot note preference on a request with status '${introRequest.status}'` },
        { status: 422 }
      )
    }

    // 6. Record preference
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .update({
        candidate_preference: preference,
        candidate_preference_noted_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to record preference' }, { status: 500 })
    }

    return NextResponse.json({ success: true, preference })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
