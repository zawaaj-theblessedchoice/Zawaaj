import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getPlanConfig, INTRO_EXPIRY_DAYS } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'
import { fetchPlanLimits, PLAN_LIMITS_FALLBACK } from '@/lib/config/profileOptions'

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

    // 4c. Verify requesting profile is approved — also fetch family_account_id / user_id for checks
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('zawaaj_profiles')
      .select('status, user_id, family_account_id')
      .eq('id', activeProfileId)
      .single()

    if (requesterError || requesterProfile?.status !== 'approved') {
      return NextResponse.json({ error: 'Your profile must be approved to express interest' }, { status: 403 })
    }

    // 4c2. Family account must be active (if profile is linked to one)
    if (requesterProfile.family_account_id) {
      const { data: familyAccount } = await supabase
        .from('zawaaj_family_accounts')
        .select('status')
        .eq('id', requesterProfile.family_account_id)
        .maybeSingle()
      if (familyAccount && familyAccount.status !== 'active') {
        return NextResponse.json(
          { error: 'Your family account is not active. Please contact support.' },
          { status: 403 }
        )
      }
    }

    // 4d. Verify target profile is approved and still active — also fetch for sibling check
    const { data: targetProfile, error: targetError } = await supabase
      .from('zawaaj_profiles')
      .select('status, user_id, family_account_id')
      .eq('id', target_profile_id)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (targetProfile.status !== 'approved') {
      return NextResponse.json({ error: 'This profile is no longer available' }, { status: 422 })
    }

    // 4e-sibling. Block requests between profiles on the same family account.
    // Use family_account_id when available; fall back to user_id for legacy profiles.
    const sameFamily =
      (requesterProfile.family_account_id &&
        targetProfile.family_account_id &&
        requesterProfile.family_account_id === targetProfile.family_account_id) ||
      (!requesterProfile.family_account_id &&
        requesterProfile.user_id &&
        targetProfile.user_id &&
        requesterProfile.user_id === targetProfile.user_id)

    if (sameFamily) {
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
    const rawPlan = (subRow?.plan ?? 'voluntary') as string
    const userPlan = (rawPlan === 'free' ? 'voluntary' : rawPlan) as Plan
    const planConfig = getPlanConfig(rawPlan === 'free' ? 'free' : userPlan as Plan)

    // DB-driven monthly limit
    const planLimits = await fetchPlanLimits(supabase)
    const dbPlanKey = rawPlan === 'free' ? 'voluntary' : rawPlan
    const monthlyInterestsLimit = planLimits[dbPlanKey]?.monthlyInterests
      ?? PLAN_LIMITS_FALLBACK[dbPlanKey as keyof typeof PLAN_LIMITS_FALLBACK]?.monthlyInterests
      ?? planConfig.monthlyLimit

    const { count: monthlyCount, error: countError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requesting_profile_id', activeProfileId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    if (countError) {
      return NextResponse.json({ error: 'Failed to check monthly limit' }, { status: 500 })
    }

    if (monthlyInterestsLimit !== Infinity && (monthlyCount ?? 0) >= monthlyInterestsLimit) {
      return NextResponse.json(
        { error: 'Monthly limit reached', plan: userPlan, limit: monthlyInterestsLimit },
        { status: 422 }
      )
    }

    // 4f2. Active request limit — count pending requests (awaiting response)
    if (planConfig.activeLimit !== Infinity) {
      const { count: activeCount, error: activeCountError } = await supabase
        .from('zawaaj_introduction_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requesting_profile_id', activeProfileId)
        .eq('status', 'pending')

      if (activeCountError) {
        return NextResponse.json({ error: 'Failed to check active request limit' }, { status: 500 })
      }

      if ((activeCount ?? 0) >= planConfig.activeLimit) {
        return NextResponse.json(
          { error: 'Active request limit reached', plan: userPlan, activeLimit: planConfig.activeLimit },
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
      .in('status', ['pending', 'accepted'])
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check existing requests' }, { status: 500 })
    }

    if (existingRequest) {
      return NextResponse.json({ error: 'Already requested' }, { status: 422 })
    }

    // 5. Compute visible_at based on sender's plan (visibility delay from config)
    const delayMs = planConfig.visibilityDelayHours * 60 * 60 * 1000
    const visibleAt = delayMs > 0
      ? new Date(Date.now() + delayMs).toISOString()
      : null // null = immediately visible

    // 6. Insert new request — set 7-day response deadline per Section 5 spec
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const responseDeadline = new Date(now + sevenDays).toISOString()

    const { data: newRequest, error: insertError } = await supabase
      .from('zawaaj_introduction_requests')
      .insert({
        requesting_profile_id: activeProfileId,
        target_profile_id,
        status: 'pending',
        expires_at: new Date(now + INTRO_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        visible_at: visibleAt,
        notified_recipient_at: new Date(now).toISOString(),
        response_deadline: responseDeadline,
      })
      .select('id')
      .single()

    if (insertError || !newRequest) {
      return NextResponse.json({ error: 'Failed to create introduction request' }, { status: 500 })
    }

    // 7. Notify the target — in-app notification
    // event_type = 'interest_received' per family model v2 spec
    await supabaseAdmin.from('zawaaj_notifications').insert({
      profile_id: target_profile_id,
      type: 'interest_received',        // legacy column kept for compatibility
      event_type: 'interest_received',  // new v2 column
      title: 'A family has expressed interest',
      body: 'A family has expressed interest in your profile. Visit your introductions to respond. You have 7 days.',
      action_url: '/introductions',
      related_interest_id: newRequest.id,
    })

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
