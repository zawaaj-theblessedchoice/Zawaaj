// POST /api/privacy/erase
// Article 17 — right to erasure
// 7-day cooling-off period; profile removed from browse immediately

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

function generateCancellationToken(requestId: string): string {
  const secret = process.env.INTERNAL_API_KEY ?? 'fallback-secret'
  return crypto.createHmac('sha256', secret).update(requestId).digest('hex').slice(0, 32)
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { confirmation_phrase?: string }

    if (body.confirmation_phrase !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'Confirmation phrase does not match. Type "DELETE MY ACCOUNT" exactly.' },
        { status: 400 }
      )
    }

    // Check for existing erasure request
    const { data: existing } = await supabaseAdmin
      .from('zawaaj_privacy_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('type', 'erasure')
      .maybeSingle()

    if (existing) {
      const msg = existing.status === 'completed'
        ? 'Your account has already been deleted.'
        : 'An erasure request is already pending. Check your email for the cancellation link.'
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    const executeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Create request
    const { data: req, error: reqErr } = await supabaseAdmin
      .from('zawaaj_privacy_requests')
      .insert({
        user_id: user.id,
        type: 'erasure',
        status: 'pending',
        scheduled_execute_at: executeAt,
        controller_notified_at: new Date().toISOString(),
      })
      .select('id').single()

    if (reqErr || !req) return NextResponse.json({ error: 'Failed to create erasure request' }, { status: 500 })

    const cancellationToken = generateCancellationToken(req.id)
    const cancellationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/privacy/erase/cancel?request_id=${req.id}&token=${cancellationToken}`

    // Immediately remove from browse
    await supabaseAdmin
      .from('zawaaj_profiles')
      .update({ status: 'withdrawn', withdrawal_reason: 'erasure_request' })
      .eq('user_id', user.id)

    // Audit log
    await supabaseAdmin.from('zawaaj_audit_log').insert({
      event_type: 'dsr_erasure_requested',
      actor_user_id: user.id,
      metadata: { request_id: req.id, scheduled_execute_at: executeAt },
    })

    // Email to data subject
    await sendEmail({
      to: user.email!,
      subject: 'Your Zawaaj account deletion — you have 7 days to cancel',
      html: erasureConfirmationEmail(user.email!, executeAt, cancellationUrl),
    })

    // Notify controller
    await sendEmail({
      to: 'privacy@ingenious-education.co.uk',
      subject: `[Zawaaj DSR] Article 17 erasure request — execution scheduled ${executeAt}`,
      html: `<p>An erasure request has been submitted.<br>Request ID: ${req.id}<br>Subject email: ${user.email}<br>Scheduled execution: ${new Date(executeAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`,
    }).catch(() => {})

    return NextResponse.json({
      message: `Your account will be deleted on ${new Date(executeAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. A confirmation email with a cancellation link has been sent to ${user.email}.`,
      execute_at: executeAt,
      request_id: req.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function erasureConfirmationEmail(email: string, executeAt: string, cancellationUrl: string): string {
  const executeDate = new Date(executeAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#111;color:#f3f4f6;padding:32px">
<div style="max-width:560px;margin:0 auto">
<p style="color:#B8960C;font-size:20px;font-weight:700;margin:0 0 20px">Zawaaj — Account Deletion Confirmation</p>
<p style="color:#d1d5db;font-size:14px;line-height:1.6">We have received your request to delete your Zawaaj account registered under <strong>${email}</strong>.</p>
<p style="color:#d1d5db;font-size:14px;line-height:1.6">Your profile has been removed from the member directory immediately. Your account data will be permanently deleted on <strong>${executeDate}</strong>.</p>
<p style="color:#d1d5db;font-size:14px;line-height:1.6">If you submitted this request by mistake, you can cancel it by clicking below before that date:</p>
<a href="${cancellationUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#B8960C;color:#111;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none">Cancel deletion →</a>
<p style="color:#9ca3af;font-size:12px;line-height:1.6;margin-top:24px">If you did not submit this request, contact us immediately at privacy@zawaaj.uk.<br><br>Data Controller: Ingenious Education Ltd · privacy@ingenious-education.co.uk<br>Data Processor: Zawaaj · privacy@zawaaj.uk</p>
</div></body></html>`
}
