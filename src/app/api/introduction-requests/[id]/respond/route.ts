// POST /api/introduction-requests/[id]/respond
//
// Spec: zawaaj_master_brief.md §6 (Response System) + §3 (Introduction Flow)
//
// Plan gating (ENFORCED IN BACKEND — not UI only):
//   Free:          body must contain { action: 'accept' | 'decline' }
//                  No templates. Simple binary choice.
//   Plus/Premium:  body must contain { template_id: string }
//                  Template must exist and have plan_required = 'plus'.
//
// Status transitions on positive response:
//   pending → mutual_confirmed → admin_pending (all in one write)
//
// Status transition on negative response:
//   pending → responded_negative

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type FreeBody = { action: 'accept' | 'decline' }
type PaidBody = { template_id: string }
type RespondBody = FreeBody | PaidBody

function isFreeBody(body: RespondBody): body is FreeBody {
  return 'action' in body
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: requestId } = await params
    const supabase = await createClient()

    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Active profile ─────────────────────────────────────────────────────
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // ── 3. Load the introduction request ──────────────────────────────────────
    const { data: req, error: reqError } = await supabase
      .from('zawaaj_introduction_requests')
      .select('id, requesting_profile_id, target_profile_id, status, visible_at')
      .eq('id', requestId)
      .single()

    if (reqError || !req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // ── 4. Only recipient can respond ─────────────────────────────────────────
    if (req.target_profile_id !== activeProfileId) {
      return NextResponse.json(
        { error: 'Only the recipient of a request can respond to it' },
        { status: 403 }
      )
    }

    // ── 5. Only pending requests can be responded to ──────────────────────────
    if (req.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot respond to a request with status '${req.status}'` },
        { status: 422 }
      )
    }

    // ── 6. Visibility check ───────────────────────────────────────────────────
    if (req.visible_at && new Date(req.visible_at as string) > new Date()) {
      return NextResponse.json(
        { error: 'This request is not yet visible' },
        { status: 422 }
      )
    }

    // ── 7. Look up user plan ──────────────────────────────────────────────────
    const { data: subRow } = await supabase
      .from('zawaaj_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    const userPlan = (subRow?.plan ?? 'free') as string
    const isFree = userPlan === 'free'

    // ── 8. Parse and validate body per plan ───────────────────────────────────
    const body = await request.json() as RespondBody

    let isPositive: boolean
    let responseText: string
    let responseTone: 'positive' | 'decline'

    if (isFree) {
      // Free tier: simple accept/decline only
      if (!isFreeBody(body)) {
        return NextResponse.json(
          { error: 'Free members must send { action: "accept" | "decline" }' },
          { status: 400 }
        )
      }
      if (body.action !== 'accept' && body.action !== 'decline') {
        return NextResponse.json(
          { error: 'action must be "accept" or "decline"' },
          { status: 400 }
        )
      }
      isPositive = body.action === 'accept'
      responseText = isPositive ? 'Accepted' : 'Declined'
      responseTone = isPositive ? 'positive' : 'decline'

    } else {
      // Plus / Premium: template required
      if (isFreeBody(body)) {
        return NextResponse.json(
          { error: 'Plus and Premium members must respond using a template_id' },
          { status: 400 }
        )
      }
      if (!body.template_id || typeof body.template_id !== 'string') {
        return NextResponse.json(
          { error: 'template_id is required' },
          { status: 400 }
        )
      }

      const { data: template, error: templateError } = await supabase
        .from('zawaaj_response_templates')
        .select('id, tone, text, plan_required, is_active')
        .eq('id', body.template_id)
        .single()

      if (templateError || !template || !template.is_active) {
        return NextResponse.json(
          { error: 'Template not found or unavailable' },
          { status: 404 }
        )
      }

      // Enforce premium-only templates
      if (template.plan_required === 'premium' && userPlan !== 'premium') {
        return NextResponse.json(
          { error: 'This template requires a Premium membership' },
          { status: 403 }
        )
      }

      isPositive = (template.tone as string) === 'positive'
      responseText = template.text as string
      responseTone = template.tone as 'positive' | 'decline'
    }

    // ── 9. Write the response ─────────────────────────────────────────────────
    const now = new Date().toISOString()

    if (isPositive) {
      // positive: mutual_confirmed → admin_pending in one write
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'admin_pending',
          response_tone: responseTone,
          response_text: responseText,
          responded_at: now,
          mutual_at: now,
        })
        .eq('id', requestId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
      }

      // Create match row for admin dashboard
      const { error: matchError } = await supabaseAdmin
        .from('zawaaj_matches')
        .insert({
          profile_a_id: req.requesting_profile_id,
          profile_b_id: activeProfileId,
          mutual_date: now,
          status: 'awaiting_admin',
          family_a_consented: false,
          family_b_consented: false,
        })

      if (matchError) {
        console.error('[respond] match row creation failed:', matchError.message)
      }

      // Notify both parties
      await supabaseAdmin.from('zawaaj_notifications').insert([
        {
          profile_id: req.requesting_profile_id,
          type: 'request_mutual',
          title: 'Mutual interest confirmed',
          body: 'Your introduction request has been accepted. The admin team has been notified and will be in touch shortly.',
          action_url: '/introductions',
        },
        {
          profile_id: activeProfileId,
          type: 'request_mutual',
          title: 'Introduction accepted',
          body: 'You have accepted an introduction request. The admin team will be in touch to facilitate.',
          action_url: '/introductions',
        },
      ])

      // Analytics
      await supabaseAdmin.from('zawaaj_analytics').insert([
        { event_type: 'responded_positive', profile_id: activeProfileId, request_id: requestId, plan: userPlan },
        { event_type: 'mutual_confirmed',   profile_id: req.requesting_profile_id, request_id: requestId, plan: userPlan },
      ])

      return NextResponse.json({ success: true, mutual: true })

    } else {
      // negative: pending → responded_negative
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'responded_negative',
          response_tone: responseTone,
          response_text: responseText,
          responded_at: now,
        })
        .eq('id', requestId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
      }

      // Notify sender — sensitively worded (spec: "same admin care regardless of plan")
      await supabaseAdmin.from('zawaaj_notifications').insert({
        profile_id: req.requesting_profile_id,
        type: 'request_declined',
        title: 'Introduction request not progressed',
        body: 'The member has chosen not to proceed at this time. This is a normal part of the process — keep going.',
        action_url: '/introductions',
      })

      // Analytics
      await supabaseAdmin.from('zawaaj_analytics').insert({
        event_type: 'responded_negative',
        profile_id: activeProfileId,
        request_id: requestId,
        plan: userPlan,
      })

      return NextResponse.json({ success: true, mutual: false })
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
