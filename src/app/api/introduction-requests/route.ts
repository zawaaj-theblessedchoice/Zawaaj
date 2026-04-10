import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Plan-aware monthly limits
const MONTHLY_LIMITS: Record<string, number> = { free: 2, plus: 5, premium: 10 }

// Plan-aware active request limits (pending = awaiting response)
// Infinity is encoded as a large number for the DB count comparison
const ACTIVE_LIMITS: Record<string, number> = { free: 1, plus: 2, premium: Infinity }

// Request expiry window (brief: 7 days)
const EXPIRY_DAYS = 7

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

    // 4c. Verify requesting profile is approved — also fetch user_id for sibling check
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('zawaaj_profiles')
      .select('status, user_id')
      .eq('id', activeProfileId)
      .single()

    if (requesterError || requesterProfile?.status !== 'approved') {
      return NextResponse.json({ error: 'Your profile must be approved to send introduction requests' }, { status: 403 })
    }

    // 4d. Verify target profile is approved and still active — also fetch user_id for sibling check
    const { data: targetProfile, error: targetError } = await supabase
      .from('zawaaj_profiles')
      .select('status, user_id')
      .eq('id', target_profile_id)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (targetProfile.status !== 'approved') {
      return NextResponse.json({ error: 'This profile is no longer available' }, { status: 422 })
    }

    // 4e-sibling. Block introduction requests between profiles on the same account.
    // A parent/guardian account may manage multiple candidate profiles.
    // Siblings must never be matched with each other.
    if (
      requesterProfile.user_id &&
      targetProfile.user_id &&
      requesterProfile.user_id === targetProfile.user_id
    ) {
      return NextResponse.json(
        { error: 'Introduction requests cannot be sent between profiles on the same account' },
        { status: 422 }
      )
    }

    // 4f. Monthly limit — look up user's active plan, then apply per-plan cap
    const { data: subRow } = await supabase
      .from('zawaaj_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    const userPlan = (subRow?.plan ?? 'free') as string
    const monthlyLimit = MONTHLY_LIMITS[userPlan] ?? 2

    const { count: monthlyCount, error: countError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requesting_profile_id', activeProfileId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    if (countError) {
      return NextResponse.json({ error: 'Failed to check monthly limit' }, { status: 500 })
    }

    if ((monthlyCount ?? 0) >= monthlyLimit) {
      return NextResponse.json(
        { error: 'Monthly limit reached', plan: userPlan, limit: monthlyLimit },
        { status: 422 }
      )
    }

    // 4f2. Active request limit — count pending requests (awaiting response)
    const activeLimit = ACTIVE_LIMITS[userPlan] ?? 1
    if (activeLimit !== Infinity) {
      const { count: activeCount, error: activeCountError } = await supabase
        .from('zawaaj_introduction_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requesting_profile_id', activeProfileId)
        .eq('status', 'pending')

      if (activeCountError) {
        return NextResponse.json({ error: 'Failed to check active request limit' }, { status: 500 })
      }

      if ((activeCount ?? 0) >= activeLimit) {
        return NextResponse.json(
          { error: 'Active request limit reached', plan: userPlan, activeLimit },
          { status: 422 }
        )
      }
    }

    // 4g. Not already requested with an active (non-terminal) status
    const { data: existingRequest, error: existingError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id')
      .eq('requesting_profile_id', activeProfileId)
      .eq('target_profile_id', target_profile_id)
      .in('status', ['pending', 'mutual_confirmed', 'admin_pending', 'admin_assigned', 'admin_in_progress'])
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check existing requests' }, { status: 500 })
    }

    if (existingRequest) {
      return NextResponse.json({ error: 'Already requested' }, { status: 422 })
    }

    // 5. Compute visible_at based on sender's plan (visibility delay)
    // Premium = immediate, Plus = +24h, Free = +48h
    const VISIBILITY_DELAY_MS: Record<string, number> = {
      free: 48 * 60 * 60 * 1000,
      plus: 24 * 60 * 60 * 1000,
      premium: 0,
    }
    const delayMs = VISIBILITY_DELAY_MS[userPlan] ?? VISIBILITY_DELAY_MS.free
    const visibleAt = delayMs > 0
      ? new Date(Date.now() + delayMs).toISOString()
      : null // null = immediately visible

    // 6. Insert new request
    const { data: newRequest, error: insertError } = await supabase
      .from('zawaaj_introduction_requests')
      .insert({
        requesting_profile_id: activeProfileId,
        target_profile_id,
        status: 'pending',
        expires_at: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        visible_at: visibleAt,
      })
      .select('id')
      .single()

    if (insertError || !newRequest) {
      return NextResponse.json({ error: 'Failed to create introduction request' }, { status: 500 })
    }

    // 7. Notify the target — but only if their request is already visible
    //    If visible_at is in the future, the notification will be created when they first see it.
    //    For now we just insert the request. Mutual is now formed via /respond, not dual-request.
    return NextResponse.json({ success: true })
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
