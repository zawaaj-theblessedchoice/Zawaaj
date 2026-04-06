import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    const body = await request.json()
    const { recipient_profile_id } = body as { recipient_profile_id?: string }

    if (!recipient_profile_id) {
      return NextResponse.json({ error: 'recipient_profile_id is required' }, { status: 400 })
    }

    // 3. Get active profile
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: userProfiles } = await supabase
      .from('zawaaj_profiles')
      .select('id, status, interests_this_month, user_id, gender')
      .eq('user_id', user.id)

    if (!userProfiles || userProfiles.length === 0) {
      return NextResponse.json({ error: 'No profile found for this user' }, { status: 400 })
    }

    const activeId = settings?.active_profile_id ?? userProfiles[0].id
    const activeProfile = userProfiles.find((p) => p.id === activeId) ?? userProfiles[0]

    // 4a. Active profile must be approved
    if (activeProfile.status !== 'approved') {
      return NextResponse.json({ error: 'Your profile must be approved to request introductions' }, { status: 400 })
    }

    // 4b. Recipient must exist and be approved
    const { data: recipientProfile } = await supabase
      .from('zawaaj_profiles')
      .select('id, status, user_id, gender')
      .eq('id', recipient_profile_id)
      .maybeSingle()

    if (!recipientProfile || recipientProfile.status !== 'approved') {
      return NextResponse.json({ error: 'Recipient profile not found or not approved' }, { status: 400 })
    }

    // 4c. Can't request yourself (same profile id)
    if (activeProfile.id === recipient_profile_id) {
      return NextResponse.json({ error: 'You cannot request an introduction with yourself' }, { status: 400 })
    }

    // 4d. Sibling check — recipient profile must not belong to same user
    if (recipientProfile.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot request an introduction with a profile you own' }, { status: 400 })
    }

    // 4e. Monthly limit
    if (activeProfile.interests_this_month >= 5) {
      return NextResponse.json({ error: 'Monthly introduction limit reached (5/5)' }, { status: 400 })
    }

    // 4f. No existing active interest
    const { data: existingInterest } = await supabase
      .from('zawaaj_interests')
      .select('id')
      .eq('sender_profile_id', activeProfile.id)
      .eq('recipient_profile_id', recipient_profile_id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingInterest) {
      return NextResponse.json({ error: 'You have already requested an introduction with this profile' }, { status: 400 })
    }

    // 5. Create interest (expires in 30 days)
    const now = new Date()
    const expiresDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: newInterest, error: insertError } = await supabase
      .from('zawaaj_interests')
      .insert({
        sender_profile_id: activeProfile.id,
        recipient_profile_id,
        sent_date: now.toISOString(),
        expires_date: expiresDate.toISOString(),
        status: 'active',
        is_mutual: false,
      })
      .select('id')
      .single()

    if (insertError || !newInterest) {
      return NextResponse.json({ error: 'Failed to create interest' }, { status: 500 })
    }

    // 6. Increment interests_this_month
    await supabase
      .from('zawaaj_profiles')
      .update({ interests_this_month: (activeProfile.interests_this_month ?? 0) + 1 })
      .eq('id', activeProfile.id)

    const newCount = (activeProfile.interests_this_month ?? 0) + 1
    const remainingRequests = 5 - newCount

    // 7. Check for reciprocal interest
    const { data: reciprocalInterest } = await supabase
      .from('zawaaj_interests')
      .select('id')
      .eq('sender_profile_id', recipient_profile_id)
      .eq('recipient_profile_id', activeProfile.id)
      .eq('status', 'active')
      .maybeSingle()

    // 8. Mutual match workflow
    if (reciprocalInterest) {
      // Determine profile_a (female) and profile_b (male)
      const profileA = activeProfile.gender === 'female' ? activeProfile : recipientProfile
      const profileB = activeProfile.gender === 'female' ? recipientProfile : activeProfile

      // Update both interests to matched
      await supabase
        .from('zawaaj_interests')
        .update({ status: 'matched', is_mutual: true })
        .in('id', [newInterest.id, reciprocalInterest.id])

      // Create match
      const { data: newMatch, error: matchError } = await supabase
        .from('zawaaj_matches')
        .insert({
          profile_a_id: profileA.id,
          profile_b_id: profileB.id,
          status: 'awaiting_admin',
        })
        .select('id')
        .single()

      if (!matchError && newMatch) {
        // Link both interests to match
        await supabase
          .from('zawaaj_interests')
          .update({ match_id: newMatch.id })
          .in('id', [newInterest.id, reciprocalInterest.id])
      }

      return NextResponse.json({
        success: true,
        mutual: true,
        remainingRequests,
      })
    }

    // 9. Non-mutual success
    return NextResponse.json({
      success: true,
      mutual: false,
      remainingRequests,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
