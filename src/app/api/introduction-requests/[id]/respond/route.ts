import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type Tone = 'positive' | 'decline'

interface RespondBody {
  tone: Tone
  text: string
}

// ─── POST — Respond to an introduction request ───────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
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

    // 3. Load the introduction request
    const { data: introRequest, error: requestError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id, requesting_profile_id, target_profile_id, status, visible_at')
      .eq('id', id)
      .maybeSingle()

    if (requestError) {
      return NextResponse.json({ error: 'Failed to load introduction request' }, { status: 500 })
    }

    if (!introRequest) {
      return NextResponse.json({ error: 'Introduction request not found' }, { status: 404 })
    }

    // 4. Verify caller is the recipient
    if (introRequest.target_profile_id !== activeProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. Verify request is still pending
    if (introRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been responded to or is no longer active' },
        { status: 422 }
      )
    }

    // 6. Verify request is visible to B (visible_at is null OR visible_at <= now)
    if (introRequest.visible_at !== null && new Date(introRequest.visible_at) > new Date()) {
      return NextResponse.json({ error: 'This request is not yet visible' }, { status: 422 })
    }

    // 7. Parse and validate body
    const body = await request.json() as Partial<RespondBody>
    const { tone, text } = body

    if (tone !== 'positive' && tone !== 'decline') {
      return NextResponse.json(
        { error: 'tone must be "positive" or "decline"' },
        { status: 400 }
      )
    }

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json({ error: 'text must be a non-empty string' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (tone === 'positive') {
      // 8a. Update request to mutual
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'mutual',
          response_tone: 'positive',
          response_text: text.trim(),
          responded_at: now,
          mutual_at: now,
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update introduction request' }, { status: 500 })
      }

      // 8b. Insert match row
      const { error: matchError } = await supabaseAdmin
        .from('zawaaj_matches')
        .insert({
          profile_a_id: introRequest.requesting_profile_id,
          profile_b_id: activeProfileId,
          mutual_date: now,
          status: 'awaiting_admin',
          family_a_consented: false,
          family_b_consented: false,
        })

      if (matchError) {
        return NextResponse.json({ error: 'Failed to create match record' }, { status: 500 })
      }

      // 8c. Notify requesting profile
      const { error: notifyRequesterError } = await supabaseAdmin
        .from('zawaaj_notifications')
        .insert({
          profile_id: introRequest.requesting_profile_id,
          type: 'request_mutual',
          title: 'Mutual interest — introduction pending',
          body: 'Your introduction request has been accepted. Our admin team will be in touch to facilitate.',
        })

      if (notifyRequesterError) {
        return NextResponse.json({ error: 'Failed to send notification to requester' }, { status: 500 })
      }

      // 8d. Notify responding profile
      const { error: notifyResponderError } = await supabaseAdmin
        .from('zawaaj_notifications')
        .insert({
          profile_id: activeProfileId,
          type: 'request_mutual',
          title: 'You accepted an introduction',
          body: 'Our admin team will be in touch to facilitate the introduction.',
        })

      if (notifyResponderError) {
        return NextResponse.json({ error: 'Failed to send notification to responder' }, { status: 500 })
      }
    } else {
      // 9a. tone === 'decline' — update request to declined
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'declined',
          response_tone: 'decline',
          response_text: text.trim(),
          responded_at: now,
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update introduction request' }, { status: 500 })
      }

      // 9b. Notify requesting profile
      const { error: notifyError } = await supabaseAdmin
        .from('zawaaj_notifications')
        .insert({
          profile_id: introRequest.requesting_profile_id,
          type: 'request_declined',
          title: 'Introduction request not progressed',
          body: 'The member has chosen not to proceed with this introduction. This is a normal part of the process.',
        })

      if (notifyError) {
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, mutual: tone === 'positive' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
