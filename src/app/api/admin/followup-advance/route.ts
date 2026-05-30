import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail, nikahAlhamdulillahTemplate, notProceededTemplate } from '@/lib/email'

// ─── POST — Advance a follow-up status ───────────────────────────────────────
//
// Atomically updates an introduction request's status AND inserts a
// zawaaj_intro_followups audit row. Called from the Follow-ups admin page.
//
// Body: { intro_id: string; new_status: string; note?: string }

const VALID_ADVANCE_STATUSES = [
  'contact_made',
  'both_willing',
  'meeting_arranged',
  'met',
  'nikkah_completed',
  'not_proceeded',
] as const

type AdvanceStatus = (typeof VALID_ADVANCE_STATUSES)[number]

type RequestBody = {
  intro_id?: string
  new_status?: string
  note?: string
}

// ─── Helper: load family contact details for two profiles ─────────────────────

type DbClient = typeof supabaseAdmin
type FaContact = { contact_full_name: string | null; contact_email: string | null }
type ProfileWithFa = { id: string; family_account: FaContact | FaContact[] | null }

async function getFamilyContacts(
  profileIdA: string,
  profileIdB: string,
  client: DbClient,
): Promise<FaContact[]> {
  const { data } = await client
    .from('zawaaj_profiles')
    .select(`
      id,
      family_account:zawaaj_family_accounts!family_account_id(
        contact_full_name,
        contact_email
      )
    `)
    .in('id', [profileIdA, profileIdB])

  return (data ?? [])
    .map(p => {
      const pp = p as unknown as ProfileWithFa
      const fa = Array.isArray(pp.family_account)
        ? (pp.family_account[0] ?? null)
        : pp.family_account
      return fa
    })
    .filter((fa): fa is FaContact => fa !== null && fa.contact_email !== null)
}

// ─── Handler: nikkah_completed outcome ───────────────────────────────────────

async function handleNikkahCompleted(
  intro_id: string,
  requesting_profile_id: string,
  target_profile_id: string,
): Promise<void> {
  const profileIds = [requesting_profile_id, target_profile_id]

  // 1. Set both profiles to nikkah_alhamdulillah — hidden from browse, preserved for stats
  const { error: statusError } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ status: 'nikkah_alhamdulillah' })
    .in('id', profileIds)

  if (statusError) {
    console.error('[followup-advance] Failed to set nikkah_alhamdulillah status:', statusError.message)
  }

  // 2. Send congratulatory emails to both family representatives
  const families = await getFamilyContacts(requesting_profile_id, target_profile_id, supabaseAdmin)
  for (const family of families) {
    if (!family.contact_email) continue
    const result = await sendEmail({
      to: family.contact_email,
      subject: 'Alhamdulillah — a nikkah has been completed',
      html: nikahAlhamdulillahTemplate(family.contact_full_name ?? 'valued member'),
    })
    if (!result.ok) {
      console.error('[followup-advance] nikkah email failed:', result.error)
    }
  }
}

// ─── Handler: not_proceeded outcome ──────────────────────────────────────────

async function handleNotProceeded(
  intro_id: string,
  requesting_profile_id: string,
  target_profile_id: string,
): Promise<void> {
  const profileIds = [requesting_profile_id, target_profile_id]

  // 1. Re-approve any profiles that are paused / suspended / withdrawn
  const { error: resetError } = await supabaseAdmin
    .from('zawaaj_profiles')
    .update({ status: 'approved' })
    .in('id', profileIds)
    .in('status', ['paused', 'suspended', 'withdrawn'])

  if (resetError) {
    console.error('[followup-advance] Failed to reset profile statuses:', resetError.message)
  }

  // 2. Send outcome emails to both family representatives
  const families = await getFamilyContacts(requesting_profile_id, target_profile_id, supabaseAdmin)
  for (const family of families) {
    if (!family.contact_email) continue
    const result = await sendEmail({
      to: family.contact_email,
      subject: 'An update on your Zawaaj introduction',
      html: notProceededTemplate(family.contact_full_name ?? 'valued member'),
    })
    if (!result.ok) {
      console.error('[followup-advance] not_proceeded email failed:', result.error)
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Role check
    const { data: role, error: roleError } = await supabase.rpc('zawaaj_get_role')
    if (roleError) {
      return NextResponse.json({ error: 'Failed to determine role' }, { status: 500 })
    }
    if (role !== 'super_admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Parse body
    const body = await request.json() as RequestBody
    const { intro_id, new_status, note } = body

    if (!intro_id || !new_status) {
      return NextResponse.json({ error: 'intro_id and new_status are required' }, { status: 400 })
    }

    if (!(VALID_ADVANCE_STATUSES as readonly string[]).includes(new_status)) {
      return NextResponse.json(
        { error: `Invalid status '${new_status}'. Valid values: ${VALID_ADVANCE_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // 4. Update introduction request status
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .update({ status: new_status as AdvanceStatus })
      .eq('id', intro_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status: ' + updateError.message }, { status: 500 })
    }

    // 5. Insert follow-up audit row
    const { error: insertError } = await supabaseAdmin
      .from('zawaaj_intro_followups')
      .insert({
        introduction_request_id: intro_id,
        created_by: user.id,
        status_set: new_status,
        note: note ?? null,
      })

    if (insertError) {
      // Non-fatal — status was updated, log and continue
      console.error('[followup-advance] Failed to insert followup row:', insertError.message)
    }

    // 6. Additional side-effects for outcome statuses
    if (new_status === 'nikkah_completed' || new_status === 'not_proceeded') {
      const { data: introData, error: introFetchError } = await supabaseAdmin
        .from('zawaaj_introduction_requests')
        .select('requesting_profile_id, target_profile_id')
        .eq('id', intro_id)
        .single()

      if (introFetchError || !introData) {
        console.error('[followup-advance] Could not load intro for outcome handling:', introFetchError?.message)
      } else {
        const { requesting_profile_id, target_profile_id } = introData

        if (new_status === 'nikkah_completed') {
          await handleNikkahCompleted(intro_id, requesting_profile_id, target_profile_id)
        } else {
          await handleNotProceeded(intro_id, requesting_profile_id, target_profile_id)
        }
      }
    }

    return NextResponse.json({ success: true, new_status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
