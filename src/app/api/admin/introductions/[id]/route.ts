import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail, contactSharingTemplate } from '@/lib/email'

// ─── Types ────────────────────────────────────────────────────────────────────

type Action = 'assign_manager' | 'set_in_progress' | 'complete' | 'override_status' | 'facilitate' | 'record_outcome'

type RequestBody = {
  action: Action
  manager_profile_id?: string
  status?: string
  admin_notes?: string
  admin_message?: string  // custom note appended to facilitation emails
  outcome?: string        // for record_outcome
}

type IntroductionRequest = {
  id: string
  requesting_profile_id: string
  target_profile_id: string
  status: string
  assigned_manager_id: string | null
  handled_by: string | null
  handled_at: string | null
  admin_notes: string | null
}

const VALID_STATUSES = [
  'pending',
  'responded_positive',
  'responded_negative',
  'mutual_confirmed',
  'admin_pending',
  'admin_assigned',
  'admin_in_progress',
  'admin_completed',
  'expired',
  'withdrawn',
] as const

// ─── PATCH — Admin action on an introduction request ─────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Auth check
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

    // 3. Role check via RPC
    const { data: role, error: roleError } = await supabase.rpc('zawaaj_get_role')
    if (roleError) {
      return NextResponse.json({ error: 'Failed to determine role' }, { status: 500 })
    }
    if (role !== 'super_admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Resolve route param
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Introduction request ID is required' }, { status: 400 })
    }

    // 5. Load the introduction request
    const { data: introRequest, error: fetchError } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .select('id, requesting_profile_id, target_profile_id, status, assigned_manager_id, handled_by, handled_at, admin_notes')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to load introduction request' }, { status: 500 })
    }
    if (!introRequest) {
      return NextResponse.json({ error: 'Introduction request not found' }, { status: 404 })
    }

    const req = introRequest as IntroductionRequest

    // 6. Manager scope check — managers may only act on requests assigned to them
    if (role === 'manager' && req.assigned_manager_id !== activeProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 7. Parse body
    const body = await request.json() as RequestBody
    const { action, manager_profile_id, status: overrideStatus, admin_notes } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // ─── Action: assign_manager ───────────────────────────────────────────────
    if (action === 'assign_manager') {
      if (role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden: assign_manager requires super_admin' }, { status: 403 })
      }
      if (!manager_profile_id) {
        return NextResponse.json({ error: 'manager_profile_id is required for assign_manager' }, { status: 400 })
      }

      const updatePayload: Record<string, string | null> = {
        assigned_manager_id: manager_profile_id,
        status: 'admin_assigned',
        handled_by: activeProfileId,
        handled_at: now,
      }
      if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to assign manager' }, { status: 500 })
      }

      // Notify the assigned manager — in-app only
      const { error: notifyError } = await supabaseAdmin
        .from('zawaaj_notifications')
        .insert({
          profile_id: manager_profile_id,
          type: 'manager_assigned',
          title: 'Introduction assigned to you',
          body: 'A new introduction has been assigned to you. Visit the introductions dashboard to get started.',
          action_url: '/admin/introductions',
        })

      if (notifyError) {
        console.error('[admin/introductions] Failed to notify manager:', notifyError.message)
      }

      return NextResponse.json({ success: true })
    }

    // ─── Action: set_in_progress ──────────────────────────────────────────────
    if (action === 'set_in_progress') {
      if (req.status !== 'admin_assigned') {
        return NextResponse.json(
          { error: `Cannot set in progress: current status is '${req.status}', expected 'admin_assigned'` },
          { status: 422 }
        )
      }

      const updatePayload: Record<string, string | null> = {
        status: 'admin_in_progress',
        handled_by: activeProfileId,
        handled_at: now,
      }
      if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // ─── Action: complete ─────────────────────────────────────────────────────
    if (action === 'complete') {
      if (req.status !== 'admin_in_progress') {
        return NextResponse.json(
          { error: `Cannot complete: current status is '${req.status}', expected 'admin_in_progress'` },
          { status: 422 }
        )
      }

      const updatePayload: Record<string, string | null> = {
        status: 'admin_completed',
        handled_by: activeProfileId,
        handled_at: now,
      }
      if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to complete introduction request' }, { status: 500 })
      }

      // Update related zawaaj_matches row → 'introduced'
      const { error: matchUpdateError } = await supabaseAdmin
        .from('zawaaj_matches')
        .update({ status: 'introduced', introduced_date: now })
        .or(
          `and(profile_a_id.eq.${req.requesting_profile_id},profile_b_id.eq.${req.target_profile_id}),` +
          `and(profile_a_id.eq.${req.target_profile_id},profile_b_id.eq.${req.requesting_profile_id})`
        )

      if (matchUpdateError) {
        // Non-fatal — log but don't fail the response. A match row may not exist yet.
        console.error('[admin/introductions] Failed to update match status:', matchUpdateError.message)
      }

      // Insert analytics row
      const { error: analyticsError } = await supabaseAdmin
        .from('zawaaj_analytics')
        .insert({
          event_type: 'admin_completed',
          profile_id: activeProfileId,
          request_id: id,
          plan: null,
        })

      if (analyticsError) {
        console.error('[admin/introductions] Failed to insert analytics row:', analyticsError.message)
      }

      // Notify both profiles
      const notificationPayload = [
        {
          profile_id: req.requesting_profile_id,
          type: 'match_update',
          title: 'Introduction facilitated',
          body: 'Your introduction has been completed by the admin team. We hope it goes well.',
        },
        {
          profile_id: req.target_profile_id,
          type: 'match_update',
          title: 'Introduction facilitated',
          body: 'Your introduction has been completed by the admin team. We hope it goes well.',
        },
      ]

      const { error: notifyError } = await supabaseAdmin
        .from('zawaaj_notifications')
        .insert(notificationPayload)

      if (notifyError) {
        console.error('[admin/introductions] Failed to insert notifications:', notifyError.message)
      }

      return NextResponse.json({ success: true })
    }

    // ─── Action: override_status ──────────────────────────────────────────────
    if (action === 'override_status') {
      if (role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden: override_status requires super_admin' }, { status: 403 })
      }
      if (!overrideStatus) {
        return NextResponse.json({ error: 'status is required for override_status' }, { status: 400 })
      }
      if (!(VALID_STATUSES as readonly string[]).includes(overrideStatus)) {
        return NextResponse.json(
          { error: `Invalid status '${overrideStatus}'. Valid values: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }

      const updatePayload: Record<string, string | null> = {
        status: overrideStatus,
        handled_by: activeProfileId,
        handled_at: now,
      }
      if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to override status' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // ─── Action: facilitate ───────────────────────────────────────────────────
    // Shares contact details between both families via email and marks the
    // request as facilitated. Requires status = 'accepted'.
    if (action === 'facilitate') {
      if (req.status !== 'accepted') {
        return NextResponse.json(
          { error: `Cannot facilitate: status is '${req.status}', expected 'accepted'` },
          { status: 422 }
        )
      }

      const { admin_message } = body

      // Fetch both profiles with their family account contact details
      const [{ data: reqProfile }, { data: tgtProfile }] = await Promise.all([
        supabaseAdmin
          .from('zawaaj_profiles')
          .select(`
            first_name, last_name, display_initials, age_display, location, school_of_thought, gender,
            family_account:zawaaj_family_accounts!family_account_id(
              contact_full_name, contact_number, contact_email,
              female_contact_name, female_contact_number
            )
          `)
          .eq('id', req.requesting_profile_id)
          .single(),
        supabaseAdmin
          .from('zawaaj_profiles')
          .select(`
            first_name, last_name, display_initials, age_display, location, school_of_thought, gender,
            family_account:zawaaj_family_accounts!family_account_id(
              contact_full_name, contact_number, contact_email,
              female_contact_name, female_contact_number
            )
          `)
          .eq('id', req.target_profile_id)
          .single(),
      ])

      type FamilyAccount = {
        contact_full_name: string
        contact_number: string
        contact_email: string
        female_contact_name: string | null
        female_contact_number: string | null
      }

      const reqFA = (reqProfile?.family_account as FamilyAccount | FamilyAccount[] | null)
      const tgtFA = (tgtProfile?.family_account as FamilyAccount | FamilyAccount[] | null)
      const reqFamilyAccount = Array.isArray(reqFA) ? reqFA[0] : reqFA
      const tgtFamilyAccount = Array.isArray(tgtFA) ? tgtFA[0] : tgtFA

      if (!reqFamilyAccount || !tgtFamilyAccount) {
        return NextResponse.json(
          { error: 'Could not load family contact details for one or both profiles. Ensure both profiles are linked to a family account.' },
          { status: 422 }
        )
      }

      function profileDisplayName(p: { first_name: string | null; last_name: string | null; display_initials: string }): string {
        const name = [p.first_name, p.last_name ? `${p.last_name[0]}.` : null].filter(Boolean).join(' ')
        return name || p.display_initials
      }

      // Build contact objects for each family to share with the other
      const reqContactForTarget = {
        name: reqFamilyAccount.contact_full_name,
        phone: reqFamilyAccount.contact_number,
        femaleContact: reqFamilyAccount.female_contact_name && reqFamilyAccount.female_contact_number
          ? { name: reqFamilyAccount.female_contact_name, phone: reqFamilyAccount.female_contact_number }
          : undefined,
        profile: {
          displayName: profileDisplayName(reqProfile!),
          ageDisplay: (reqProfile as { age_display?: string | null })?.age_display ?? null,
          location: (reqProfile as { location?: string | null })?.location ?? null,
          schoolOfThought: (reqProfile as { school_of_thought?: string | null })?.school_of_thought ?? null,
        },
      }

      const tgtContactForRequester = {
        name: tgtFamilyAccount.contact_full_name,
        phone: tgtFamilyAccount.contact_number,
        femaleContact: tgtFamilyAccount.female_contact_name && tgtFamilyAccount.female_contact_number
          ? { name: tgtFamilyAccount.female_contact_name, phone: tgtFamilyAccount.female_contact_number }
          : undefined,
        profile: {
          displayName: profileDisplayName(tgtProfile!),
          ageDisplay: (tgtProfile as { age_display?: string | null })?.age_display ?? null,
          location: (tgtProfile as { location?: string | null })?.location ?? null,
          schoolOfThought: (tgtProfile as { school_of_thought?: string | null })?.school_of_thought ?? null,
        },
      }

      // Send both emails in parallel
      const [emailA, emailB] = await Promise.all([
        sendEmail({
          to: reqFamilyAccount.contact_email,
          subject: 'Your Zawaaj introduction — contact details enclosed',
          html: contactSharingTemplate(reqFamilyAccount.contact_full_name, tgtContactForRequester, admin_message ?? undefined),
        }),
        sendEmail({
          to: tgtFamilyAccount.contact_email,
          subject: 'Your Zawaaj introduction — contact details enclosed',
          html: contactSharingTemplate(tgtFamilyAccount.contact_full_name, reqContactForTarget, admin_message ?? undefined),
        }),
      ])

      if (!emailA.ok) console.error('[facilitate] email to requester family failed:', emailA.error)
      if (!emailB.ok) console.error('[facilitate] email to target family failed:', emailB.error)

      // Mark request as facilitated
      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          status: 'facilitated',
          handled_by: activeProfileId,
          handled_at: now,
          ...(admin_notes !== undefined ? { admin_notes } : {}),
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Emails sent but failed to update status: ' + updateError.message }, { status: 500 })
      }

      // In-app notifications to both profiles
      await supabaseAdmin.from('zawaaj_notifications').insert([
        {
          profile_id: req.requesting_profile_id,
          type: 'match_update',
          event_type: 'intro_facilitated',
          title: 'Introduction arranged — contact shared',
          body: 'The Zawaaj team has facilitated your introduction. Contact details have been shared with both families.',
          action_url: '/introductions',
        },
        {
          profile_id: req.target_profile_id,
          type: 'match_update',
          event_type: 'intro_facilitated',
          title: 'Introduction arranged — contact shared',
          body: 'The Zawaaj team has facilitated your introduction. Contact details have been shared with both families.',
          action_url: '/introductions',
        },
      ])

      return NextResponse.json({
        success: true,
        emailsSent: { toRequester: emailA.ok, toTarget: emailB.ok },
      })
    }

    // ─── Action: record_outcome ───────────────────────────────────────────────
    // Captures the outcome after facilitation (e.g. 'in_conversation',
    // 'meeting_arranged', 'engaged', 'married', 'unsuccessful', 'withdrawn').
    if (action === 'record_outcome') {
      const { outcome, admin_notes: outcomeNotes } = body
      if (!outcome) {
        return NextResponse.json({ error: 'outcome is required' }, { status: 400 })
      }

      const VALID_OUTCOMES = ['in_conversation', 'meeting_arranged', 'engaged', 'married', 'unsuccessful', 'withdrawn']
      if (!VALID_OUTCOMES.includes(outcome)) {
        return NextResponse.json(
          { error: `Invalid outcome. Valid values: ${VALID_OUTCOMES.join(', ')}` },
          { status: 400 }
        )
      }

      const { error: updateError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .update({
          outcome,
          outcome_date: now,
          handled_by: activeProfileId,
          handled_at: now,
          ...(outcomeNotes !== undefined ? { admin_notes: outcomeNotes } : {}),
        })
        .eq('id', id)

      if (updateError) {
        // outcome / outcome_date may not exist yet — fall back to admin_notes only
        console.error('[record_outcome] update error:', updateError.message)
        const { error: fallbackError } = await supabaseAdmin
          .from('zawaaj_introduction_requests')
          .update({
            admin_notes: `[Outcome: ${outcome}] ${outcomeNotes ?? ''}`.trim(),
            handled_by: activeProfileId,
            handled_at: now,
          })
          .eq('id', id)
        if (fallbackError) {
          return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true })
    }

    // Unknown action
    return NextResponse.json(
      { error: `Unknown action '${action as string}'. Valid actions: assign_manager, set_in_progress, complete, override_status, facilitate, record_outcome` },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
