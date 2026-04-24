import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'

function claimUrl(tokenId: string): string {
  return `${SITE_URL}/register/accept-invite?token=${tokenId}`
}

// ─── GET — fetch activation status for a family account ──────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: _role } = await supabase.rpc('zawaaj_get_role')
    if (_role !== 'super_admin' && _role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const familyAccountId = req.nextUrl.searchParams.get('family_account_id')
    if (!familyAccountId) return NextResponse.json({ error: 'family_account_id required' }, { status: 400 })

    // Look for the most recent pending claim invite
    const { data: token } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .select('id, created_at, expires_at, accepted_at')
      .eq('family_account_id', familyAccountId)
      .eq('purpose', 'claim_invite')
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      has_pending_token: !!token,
      claim_link: token ? claimUrl(token.id as string) : null,
      token_created_at: token?.created_at ?? null,
      token_expires_at: token?.expires_at ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// ─── POST — execute an activation action ─────────────────────────────────────

type ActivationAction =
  | 'send_magic_link'
  | 'resend_magic_link'
  | 'mark_contacted'
  | 'mark_invalid'
  | 'snooze'
  | 'assign_manager'

interface ActivationPayload {
  action: ActivationAction
  family_account_id: string
  profile_id?: string
  manager_id?: string
  reason?: string
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: _role } = await supabase.rpc('zawaaj_get_role')
    const isSuperAdmin = _role === 'super_admin'
    const isManager    = _role === 'manager'
    if (!isSuperAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as ActivationPayload
    const { action, family_account_id, profile_id, manager_id, reason } = body

    if (!action || !family_account_id) {
      return NextResponse.json({ error: 'action and family_account_id are required' }, { status: 400 })
    }

    // Load family account
    const { data: fa, error: faErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_email, admin_notes, last_contacted_at, snoozed_until')
      .eq('id', family_account_id)
      .single()

    if (faErr || !fa) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const timestamp = new Date().toLocaleString('en-GB')

    // ── send_magic_link ────────────────────────────────────────────────────────
    if (action === 'send_magic_link') {
      const contactEmail = fa.contact_email as string | null
      if (!contactEmail) {
        return NextResponse.json({ error: 'Family account has no contact email' }, { status: 400 })
      }

      // Expire any existing pending tokens first
      await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .update({ expires_at: now })
        .eq('family_account_id', family_account_id)
        .eq('purpose', 'claim_invite')
        .is('accepted_at', null)

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newToken, error: tokenErr } = await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .insert({
          family_account_id,
          purpose:      'claim_invite',
          invited_email: contactEmail,
          expires_at:   expiresAt,
          created_by:   user.id,
        })
        .select('id')
        .single()

      if (tokenErr || !newToken) {
        return NextResponse.json({ error: tokenErr?.message ?? 'Failed to create token' }, { status: 500 })
      }

      const link = claimUrl(newToken.id as string)

      // Log to admin_notes
      const prevNotes = (fa.admin_notes as string | null) ?? ''
      const note = `[${timestamp}] Magic link sent by ${user.email ?? 'admin'}.`
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ admin_notes: `${note}\n\n${prevNotes}`.trim() })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true, claim_link: link })
    }

    // ── resend_magic_link ──────────────────────────────────────────────────────
    if (action === 'resend_magic_link') {
      const contactEmail = fa.contact_email as string | null
      if (!contactEmail) {
        return NextResponse.json({ error: 'Family account has no contact email' }, { status: 400 })
      }

      // Expire old tokens
      await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .update({ expires_at: now })
        .eq('family_account_id', family_account_id)
        .eq('purpose', 'claim_invite')
        .is('accepted_at', null)

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newToken, error: tokenErr } = await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .insert({
          family_account_id,
          purpose:      'claim_invite',
          invited_email: contactEmail,
          expires_at:   expiresAt,
          created_by:   user.id,
        })
        .select('id')
        .single()

      if (tokenErr || !newToken) {
        return NextResponse.json({ error: tokenErr?.message ?? 'Failed to create token' }, { status: 500 })
      }

      const link = claimUrl(newToken.id as string)

      const prevNotes = (fa.admin_notes as string | null) ?? ''
      const note = `[${timestamp}] Magic link resent by ${user.email ?? 'admin'}.`
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ admin_notes: `${note}\n\n${prevNotes}`.trim() })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true, claim_link: link })
    }

    // ── mark_contacted ─────────────────────────────────────────────────────────
    if (action === 'mark_contacted') {
      const prevNotes = (fa.admin_notes as string | null) ?? ''
      const note = `[${timestamp}] Contacted by ${user.email ?? 'admin'}.`
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({
          last_contacted_at: now,
          admin_notes: `${note}\n\n${prevNotes}`.trim(),
        })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true })
    }

    // ── mark_invalid ───────────────────────────────────────────────────────────
    if (action === 'mark_invalid') {
      const prevNotes = (fa.admin_notes as string | null) ?? ''
      const note = `[${timestamp}] Marked invalid by ${user.email ?? 'admin'}${reason ? `: ${reason}` : ''}.`

      // Suspend family account
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({
          status: 'suspended',
          admin_notes: `${note}\n\n${prevNotes}`.trim(),
        })
        .eq('id', family_account_id)

      // Withdraw all profiles linked to this family account
      await supabaseAdmin
        .from('zawaaj_profiles')
        .update({ status: 'withdrawn' })
        .eq('family_account_id', family_account_id)

      return NextResponse.json({ ok: true })
    }

    // ── snooze ─────────────────────────────────────────────────────────────────
    if (action === 'snooze') {
      const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ snoozed_until: snoozedUntil })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true, snoozed_until: snoozedUntil })
    }

    // ── assign_manager ─────────────────────────────────────────────────────────
    if (action === 'assign_manager') {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
      }
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ assigned_manager_id: manager_id ?? null })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
