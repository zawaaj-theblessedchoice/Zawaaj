import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/introduction-requests/[id]/withdraw
// Sets a pending request's status to 'withdrawn'. Only the sender can withdraw.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Active profile
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // 3. Load the request (target_profile_id needed for notification)
    const { data: req, error: reqError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id, requesting_profile_id, target_profile_id, status')
      .eq('id', id)
      .single()

    if (reqError || !req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 4. Only the sender can withdraw — and they must be the family representative.
    if (req.requesting_profile_id !== activeProfileId) {
      return NextResponse.json({ error: 'You can only withdraw your own requests' }, { status: 403 })
    }

    // Verify caller is primary_user_id of the requesting profile's family account.
    const { data: reqProfileRow } = await supabase
      .from('zawaaj_profiles')
      .select('family_account_id')
      .eq('id', req.requesting_profile_id)
      .single()

    if (reqProfileRow?.family_account_id) {
      const { data: reqFamilyAccount } = await supabaseAdmin
        .from('zawaaj_family_accounts')
        .select('primary_user_id')
        .eq('id', reqProfileRow.family_account_id)
        .single()

      if (reqFamilyAccount && reqFamilyAccount.primary_user_id !== user.id) {
        return NextResponse.json(
          { error: 'representative_only', message: 'Only the family representative may withdraw requests.' },
          { status: 403 }
        )
      }
    }

    // 5. Only pending requests can be withdrawn
    if (req.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot withdraw a request with status '${req.status}'` },
        { status: 422 }
      )
    }

    // 6. Update — use admin client to bypass RLS
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .update({ status: 'withdrawn' })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to withdraw request' }, { status: 500 })
    }

    // Notify recipient — in-app only
    await supabaseAdmin.from('zawaaj_notifications').insert({
      profile_id: req.target_profile_id,
      type: 'request_withdrawn',
      title: 'Interest withdrawn',
      body: 'An interest you received has been withdrawn.',
      action_url: '/introductions',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
