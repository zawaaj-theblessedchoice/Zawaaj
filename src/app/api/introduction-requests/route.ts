import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── POST — Create introduction request ──────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get active_profile_id
    const { data: settings, error: settingsError } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to load user settings' }, { status: 500 })
    }

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // 3. Parse body
    const body = await request.json() as { target_profile_id?: string }
    const { target_profile_id } = body

    // 4a. target_profile_id required
    if (!target_profile_id) {
      return NextResponse.json({ error: 'target_profile_id is required' }, { status: 400 })
    }

    // 4b. Not own profile
    if (activeProfileId === target_profile_id) {
      return NextResponse.json({ error: 'You cannot request an introduction with yourself' }, { status: 400 })
    }

    // 4c. Monthly limit — count requests this calendar month
    const { count: monthlyCount, error: countError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requesting_profile_id', activeProfileId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    if (countError) {
      return NextResponse.json({ error: 'Failed to check monthly limit' }, { status: 500 })
    }

    if ((monthlyCount ?? 0) >= 5) {
      return NextResponse.json({ error: 'Monthly limit reached' }, { status: 422 })
    }

    // 4d. Not already requested (active or mutual)
    const { data: existingRequest, error: existingError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id')
      .eq('requesting_profile_id', activeProfileId)
      .eq('target_profile_id', target_profile_id)
      .in('status', ['pending', 'mutual'])
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check existing requests' }, { status: 500 })
    }

    if (existingRequest) {
      return NextResponse.json({ error: 'Already requested' }, { status: 422 })
    }

    // 5. Insert new request
    const { data: newRequest, error: insertError } = await supabase
      .from('zawaaj_introduction_requests')
      .insert({
        requesting_profile_id: activeProfileId,
        target_profile_id,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !newRequest) {
      return NextResponse.json({ error: 'Failed to create introduction request' }, { status: 500 })
    }

    // 6. Check for mutual — has target already requested us?
    const { data: mutualRow, error: mutualError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id')
      .eq('requesting_profile_id', target_profile_id)
      .eq('target_profile_id', activeProfileId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (mutualError) {
      // Non-fatal — we already inserted the request, just return non-mutual
      return NextResponse.json({ success: true, mutual: false })
    }

    // 7. Mutual — update both rows
    if (mutualRow) {
      await supabase
        .from('zawaaj_introduction_requests')
        .update({ status: 'mutual', mutual_at: new Date().toISOString() })
        .in('id', [newRequest.id, mutualRow.id])

      return NextResponse.json({ success: true, mutual: true })
    }

    // 8. Not mutual
    return NextResponse.json({ success: true, mutual: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── GET — Get current user's sent requests ───────────────────────────────────

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get active_profile_id
    const { data: settings, error: settingsError } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to load user settings' }, { status: 500 })
    }

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // 3. Fetch sent requests
    const { data: requests, error: fetchError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('*')
      .eq('requesting_profile_id', activeProfileId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json(requests ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
