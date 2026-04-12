// PATCH /api/admin/matches/[id]
//
// Admin/manager actions on a zawaaj_matches row.
// Section 6 — Family Model v2
//
// Actions:
//   verify_a        — mark contact A as verified
//   verify_b        — mark contact B as verified
//   share_contacts  — cache contact info, advance to 'contacts_shared', notify both families
//   assign_manager  — set assigned_manager_id
//   set_status      — override status (super_admin only)
//   log_followup    — store followup_notes + optionally followup_done_at

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type Action =
  | 'verify_a'
  | 'verify_b'
  | 'share_contacts'
  | 'assign_manager'
  | 'set_status'
  | 'log_followup'

type RequestBody = {
  action: Action
  manager_id?: string
  status?: string
  followup_notes?: string
  followup_done?: boolean
}

const VALID_MATCH_STATUSES = [
  'pending_verification',
  'verified',
  'contacts_shared',
  'in_follow_up',
  'closed',
] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: matchId } = await params
    const supabase = await createClient()

    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Role check ─────────────────────────────────────────────────────────
    const { data: role } = await supabase.rpc('zawaaj_get_role')
    if (role !== 'super_admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── 3. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json() as RequestBody
    const { action } = body

    // ── 4. Load match row ─────────────────────────────────────────────────────
    const { data: match, error: matchError } = await supabaseAdmin
      .from('zawaaj_matches')
      .select(`
        id, status,
        profile_a_id, profile_b_id,
        contact_a_verified, contact_b_verified,
        assigned_manager_id
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // ── 5. Manager scope check: managers can only act on their assigned matches ─
    if (role === 'manager' && match.assigned_manager_id !== null) {
      // Find this user's manager row to get their user_id
      const { data: managerRow } = await supabase
        .from('zawaaj_managers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!managerRow) {
        return NextResponse.json({ error: 'Manager record not found' }, { status: 403 })
      }

      if (match.assigned_manager_id !== managerRow.id) {
        return NextResponse.json({ error: 'You can only act on matches assigned to you' }, { status: 403 })
      }
    }

    const now = new Date().toISOString()

    // ── 6. Dispatch action ────────────────────────────────────────────────────
    switch (action) {

      case 'verify_a': {
        const { error } = await supabaseAdmin
          .from('zawaaj_matches')
          .update({ contact_a_verified: true })
          .eq('id', matchId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // If B is also verified → advance to 'verified'
        if (match.contact_b_verified) {
          await supabaseAdmin.from('zawaaj_matches')
            .update({ status: 'verified' })
            .eq('id', matchId)
        }
        return NextResponse.json({ success: true })
      }

      case 'verify_b': {
        const { error } = await supabaseAdmin
          .from('zawaaj_matches')
          .update({ contact_b_verified: true })
          .eq('id', matchId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // If A is also verified → advance to 'verified'
        if (match.contact_a_verified) {
          await supabaseAdmin.from('zawaaj_matches')
            .update({ status: 'verified' })
            .eq('id', matchId)
        }
        return NextResponse.json({ success: true })
      }

      case 'share_contacts': {
        // Both must be verified
        if (!match.contact_a_verified || !match.contact_b_verified) {
          return NextResponse.json(
            { error: 'Both contacts must be verified before sharing' },
            { status: 422 }
          )
        }

        // Load both profiles to get their family account ids
        const [{ data: profileA }, { data: profileB }] = await Promise.all([
          supabaseAdmin.from('zawaaj_profiles')
            .select('family_account_id, first_name, display_initials')
            .eq('id', match.profile_a_id)
            .single(),
          supabaseAdmin.from('zawaaj_profiles')
            .select('family_account_id, first_name, display_initials')
            .eq('id', match.profile_b_id)
            .single(),
        ])

        // Resolve which contact number to share for each family
        async function resolveContact(familyAccountId: string | null) {
          if (!familyAccountId) return { name: null, number: null }
          const { data: fa } = await supabaseAdmin
            .from('zawaaj_family_accounts')
            .select('contact_full_name, contact_number, female_contact_name, female_contact_number, no_female_contact_flag')
            .eq('id', familyAccountId)
            .single()
          if (!fa) return { name: null, number: null }
          // Prefer female contact unless no_female_contact_flag is set
          const useFemale = !fa.no_female_contact_flag && fa.female_contact_number
          return {
            name: useFemale ? fa.female_contact_name : fa.contact_full_name,
            number: useFemale ? fa.female_contact_number : fa.contact_number,
          }
        }

        const [contactA, contactB] = await Promise.all([
          resolveContact((profileA as { family_account_id?: string | null } | null)?.family_account_id ?? null),
          resolveContact((profileB as { family_account_id?: string | null } | null)?.family_account_id ?? null),
        ])

        // Cache contacts on match row and advance status
        const { error: updateError } = await supabaseAdmin
          .from('zawaaj_matches')
          .update({
            status: 'contacts_shared',
            contacts_shared_at: now,
            contacts_shared_by: user.id,
            family_a_contact_name: contactA.name,
            family_a_contact_number: contactA.number,
            family_b_contact_name: contactB.name,
            family_b_contact_number: contactB.number,
            followup_due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', matchId)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // In-app notifications to both families
        await supabaseAdmin.from('zawaaj_notifications').insert([
          {
            profile_id: match.profile_a_id,
            type: 'contacts_shared',
            event_type: 'contacts_shared',
            title: 'Introduction arranged',
            body: 'Our team has shared contact details with both families. We wish you all the best, insha\'Allah.',
            action_url: '/introductions',
            related_match_id: matchId,
          },
          {
            profile_id: match.profile_b_id,
            type: 'contacts_shared',
            event_type: 'contacts_shared',
            title: 'Introduction arranged',
            body: 'Our team has shared contact details with both families. We wish you all the best, insha\'Allah.',
            action_url: '/introductions',
            related_match_id: matchId,
          },
        ])

        return NextResponse.json({ success: true })
      }

      case 'assign_manager': {
        if (!body.manager_id) {
          return NextResponse.json({ error: 'manager_id is required' }, { status: 400 })
        }
        const { error } = await supabaseAdmin
          .from('zawaaj_matches')
          .update({ assigned_manager_id: body.manager_id })
          .eq('id', matchId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'set_status': {
        if (role !== 'super_admin') {
          return NextResponse.json({ error: 'Only super admins can override status' }, { status: 403 })
        }
        const newStatus = body.status
        if (!newStatus || !(VALID_MATCH_STATUSES as readonly string[]).includes(newStatus)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        const { error } = await supabaseAdmin
          .from('zawaaj_matches')
          .update({ status: newStatus })
          .eq('id', matchId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'log_followup': {
        const updates: Record<string, unknown> = {}
        if (body.followup_notes !== undefined) updates.followup_notes = body.followup_notes
        if (body.followup_done) {
          updates.followup_done_at = now
          updates.status = 'in_follow_up'
        }
        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
        }
        const { error } = await supabaseAdmin
          .from('zawaaj_matches')
          .update(updates)
          .eq('id', matchId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
