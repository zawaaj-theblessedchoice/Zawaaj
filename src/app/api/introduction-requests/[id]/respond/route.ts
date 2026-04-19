// POST /api/introduction-requests/[id]/respond
//
// Family Model v2 — Section 5 response logic:
//   Accept: status → 'accepted', is_mutual = true, responded_at = now()
//           A sending the interest is A's consent. B accepting is sufficient — match is created immediately.
//           INSERT zawaaj_matches (status='pending_verification'), notify both families + admin.
//           No reverse-interest check — there is no second step.
//
//   Decline: status → 'declined', responded_at = now()
//            Notify sender sensitively; no email
//
// Template responses (Plus/Premium) are recorded against the interest row.
// The template body is NOT communicated to the sender — only the outcome (accepted/declined).

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail, mutualMatchTemplate } from '@/lib/email'

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

    // ── 3. Load the interest row (admin client — target_profile_id check follows) ─
    const { data: req, error: reqError } = await supabaseAdmin
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

    if (isFree) {
      if (!isFreeBody(body) || (body.action !== 'accept' && body.action !== 'decline')) {
        return NextResponse.json(
          { error: 'Send { action: "accept" | "decline" }' },
          { status: 400 }
        )
      }
      isPositive = body.action === 'accept'
      responseText = isPositive ? 'Accepted' : 'Declined'
    } else {
      // Plus / Premium: template required
      if (isFreeBody(body)) {
        return NextResponse.json(
          { error: 'Plus and Premium members must respond using a template_id' },
          { status: 400 }
        )
      }
      if (!body.template_id || typeof body.template_id !== 'string') {
        return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
      }

      const { data: template, error: templateError } = await supabase
        .from('zawaaj_response_templates')
        .select('id, tone, direction, text, body, is_active, plan_required')
        .eq('id', body.template_id)
        .single()

      if (templateError || !template || !template.is_active) {
        return NextResponse.json({ error: 'Template not found or unavailable' }, { status: 404 })
      }

      if (template.plan_required === 'premium' && userPlan !== 'premium') {
        return NextResponse.json({ error: 'This template requires a Premium membership' }, { status: 403 })
      }

      // v2: 'direction' column = 'accept' | 'decline'; fall back to legacy 'tone' column
      const direction = (template.direction as string | null) ?? (template.tone as string | null)
      isPositive = direction === 'accept' || direction === 'positive'
      responseText = (template.body as string | null) ?? (template.text as string | null) ?? ''
    }

    // ── 9. Write the response ─────────────────────────────────────────────────
    const now = new Date().toISOString()

    if (isPositive) {
      // B accepts → match is confirmed immediately. A sending the interest was A's consent.
      // Mark interest accepted + is_mutual = true in one update.
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'accepted',
          is_mutual: true,
          responded_at: now,
          response_text: responseText,
        })
        .eq('id', requestId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
      }

      // Create the match row immediately
      const { error: matchError } = await supabaseAdmin
        .from('zawaaj_matches')
        .insert({
          profile_a_id: req.requesting_profile_id,  // A = original sender
          profile_b_id: activeProfileId,             // B = acceptor
          mutual_date: now,
          status: 'pending_verification',
          admin_notified_date: now,
        })

      if (matchError) {
        console.error('[respond] match row creation failed:', matchError.message)
      }

      // Notify both families — in-app
      await supabaseAdmin.from('zawaaj_notifications').insert([
        {
          profile_id: req.requesting_profile_id,
          type: 'match_pending_verification',
          event_type: 'match_pending_verification',
          title: 'Your interest was accepted — our team has been notified',
          body: 'The other family has accepted your interest. Our team will be in touch shortly to facilitate.',
          action_url: '/introductions',
          related_interest_id: requestId,
        },
        {
          profile_id: activeProfileId,
          type: 'match_pending_verification',
          event_type: 'match_pending_verification',
          title: 'Introduction accepted — our team has been notified',
          body: 'You have accepted this introduction. Our team will be in touch shortly to facilitate.',
          action_url: '/introductions',
          related_interest_id: requestId,
        },
      ])

      // Send emails to both family contacts — non-blocking, errors logged only
      try {
        const [{ data: reqProfile }, { data: accProfile }] = await Promise.all([
          supabaseAdmin
            .from('zawaaj_profiles')
            .select('family_account:zawaaj_family_accounts!family_account_id(contact_full_name,contact_email)')
            .eq('id', req.requesting_profile_id)
            .single(),
          supabaseAdmin
            .from('zawaaj_profiles')
            .select('family_account:zawaaj_family_accounts!family_account_id(contact_full_name,contact_email)')
            .eq('id', activeProfileId)
            .single(),
        ])

        type FA = { contact_full_name: string; contact_email: string }
        const reqFA = (Array.isArray(reqProfile?.family_account) ? reqProfile!.family_account[0] : reqProfile?.family_account) as FA | null
        const accFA = (Array.isArray(accProfile?.family_account) ? accProfile!.family_account[0] : accProfile?.family_account) as FA | null

        await Promise.all([
          reqFA ? sendEmail({
            to: reqFA.contact_email,
            subject: 'Your Zawaaj interest has been accepted',
            html: mutualMatchTemplate(reqFA.contact_full_name, 'requester'),
          }) : Promise.resolve(),
          accFA ? sendEmail({
            to: accFA.contact_email,
            subject: 'Introduction accepted — Zawaaj team notified',
            html: mutualMatchTemplate(accFA.contact_full_name, 'acceptor'),
          }) : Promise.resolve(),
        ])
      } catch (emailErr) {
        console.error('[respond] mutual match email error:', emailErr)
      }

      return NextResponse.json({ success: true, mutual: true })

    } else {
      // Decline: pending → declined
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'declined',
          responded_at: now,
          response_text: responseText,
        })
        .eq('id', requestId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
      }

      // Notify sender — sensitively worded; no email needed per spec
      await supabaseAdmin.from('zawaaj_notifications').insert({
        profile_id: req.requesting_profile_id,
        type: 'interest_declined',
        event_type: 'interest_declined',
        title: 'Introduction request not progressed',
        body: 'A family has respectfully responded to your interest. This is a normal part of the process — keep going.',
        action_url: '/introductions',
        related_interest_id: requestId,
      })

      return NextResponse.json({ success: true, mutual: false })
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
