import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, claimInviteTemplate } from '@/lib/email'

// Canonical domain is www.zawaaj.uk (matches metadataBase + the working email
// verification links). Prod sets NEXT_PUBLIC_SITE_URL; the fallback now matches
// so claim links never point at a non-resolving bare-domain host.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.zawaaj.uk'

function claimUrl(tokenId: string): string {
  return `${SITE_URL}/register/accept-invite?token=${tokenId}`
}

// Name to greet the family contact by — but NOT the email-handle placeholder the
// import derives when the real rep name is blank (e.g. "mrkhalil@…" → "Mrkhalil"),
// nor the generic "Parent/Guardian" fallback. Returns null when there's no real
// name, so the email greets with a clean "Assalamu alaikum,".
function greetingName(name: string | null, email: string | null): string | null {
  const n = (name ?? '').trim()
  if (!n) return null
  if (n.toLowerCase() === 'parent/guardian') return null
  const local = (email?.split('@')[0] ?? '').replace(/[._\-+]+/g, ' ').trim().toLowerCase()
  if (local) {
    const nNorm = n.toLowerCase()
    if (nNorm === local || nNorm.replace(/\s+/g, '') === local.replace(/\s+/g, '')) return null
  }
  return n
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
  | 'get_claim_link'
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
      .select('id, contact_email, contact_full_name, admin_notes, last_contacted_at, snoozed_until')
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

      // Actually dispatch the email via the proven sendEmail path (this was the
      // delivery bug: previously the token was created and "sent" reported, but
      // no email was ever sent). The claim link both claims the profile AND
      // auto-verifies the email on click (see /api/claim POST, email_confirm:true).
      const emailResult = await sendEmail({
        to: contactEmail,
        subject: 'Claim your Zawaaj family account',
        html: claimInviteTemplate(
          link,
          greetingName(fa.contact_full_name as string | null, contactEmail),
        ),
      })

      if (!emailResult.ok) {
        return NextResponse.json(
          { error: emailResult.error ?? 'Email failed to send', claim_link: link },
          { status: 502 },
        )
      }

      // Log to admin_notes (only after a confirmed send — includes the Resend
      // message id so a "sent" claim is traceable in the Resend dashboard).
      const prevNotes = (fa.admin_notes as string | null) ?? ''
      const note = `[${timestamp}] Claim invite emailed to ${contactEmail} by ${user.email ?? 'admin'} (Resend id ${emailResult.id ?? '—'}).`
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ admin_notes: `${note}\n\n${prevNotes}`.trim() })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true, claim_link: link, emailed: contactEmail, email_id: emailResult.id })
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

      // Dispatch the email (same proven path as send_magic_link).
      const emailResult = await sendEmail({
        to: contactEmail,
        subject: 'Claim your Zawaaj family account',
        html: claimInviteTemplate(
          link,
          greetingName(fa.contact_full_name as string | null, contactEmail),
        ),
      })

      if (!emailResult.ok) {
        return NextResponse.json(
          { error: emailResult.error ?? 'Email failed to send', claim_link: link },
          { status: 502 },
        )
      }

      const prevNotes = (fa.admin_notes as string | null) ?? ''
      const note = `[${timestamp}] Claim invite re-emailed to ${contactEmail} by ${user.email ?? 'admin'} (Resend id ${emailResult.id ?? '—'}).`
      await supabaseAdmin
        .from('zawaaj_family_accounts')
        .update({ admin_notes: `${note}\n\n${prevNotes}`.trim() })
        .eq('id', family_account_id)

      return NextResponse.json({ ok: true, claim_link: link, emailed: contactEmail, email_id: emailResult.id })
    }

    // ── get_claim_link ─────────────────────────────────────────────────────────
    // Return a claim link WITHOUT sending an email — for "Copy link" / "Share via
    // WhatsApp" (manual send via Khalil's own WhatsApp). Reuses the current
    // pending token if one exists, else mints a fresh one. Works even when the
    // family has no contact email (so we never show a false "sent").
    if (action === 'get_claim_link') {
      const { data: existing } = await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .select('id, expires_at')
        .eq('family_account_id', family_account_id)
        .eq('purpose', 'claim_invite')
        .is('accepted_at', null)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ ok: true, claim_link: claimUrl(existing.id as string), reused: true })
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newToken, error: tokenErr } = await supabaseAdmin
        .from('zawaaj_invite_tokens')
        .insert({
          family_account_id,
          purpose:      'claim_invite',
          invited_email: (fa.contact_email as string | null) ?? null,
          expires_at:   expiresAt,
          created_by:   user.id,
        })
        .select('id')
        .single()

      if (tokenErr || !newToken) {
        return NextResponse.json({ error: tokenErr?.message ?? 'Failed to create token' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, claim_link: claimUrl(newToken.id as string), reused: false })
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
