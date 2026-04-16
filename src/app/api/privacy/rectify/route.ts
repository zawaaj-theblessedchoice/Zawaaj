// POST /api/privacy/rectify
// Article 16 — rectification request for fields not self-correctable

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const ADMIN_CORRECTABLE = [
  'status', 'gender', 'date_of_birth', 'age_display',
  'family_account.contact_full_name',
  'family_account.contact_email',
  'family_account.contact_number',
]

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      field_name?: string
      current_value?: string
      requested_value?: string
      supporting_note?: string
    }

    if (!body.field_name || !body.requested_value) {
      return NextResponse.json({ error: 'field_name and requested_value are required' }, { status: 400 })
    }

    if (!ADMIN_CORRECTABLE.includes(body.field_name)) {
      return NextResponse.json(
        { error: 'This field can be corrected directly in your profile. Use the edit function on /my-profile.' },
        { status: 400 }
      )
    }

    // Rate limit: max 3 pending rectification requests at once
    const { count } = await supabaseAdmin
      .from('zawaaj_privacy_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'rectify')
      .eq('status', 'pending')

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'You have 3 pending rectification requests. Please wait for them to be resolved.' },
        { status: 429 }
      )
    }

    const { data: req, error: reqErr } = await supabaseAdmin
      .from('zawaaj_privacy_requests')
      .insert({
        user_id: user.id,
        type: 'rectify',
        status: 'awaiting_controller',
        field_name: body.field_name,
        current_value: body.current_value ?? null,
        requested_value: body.requested_value,
        supporting_note: body.supporting_note ?? null,
        controller_notified_at: new Date().toISOString(),
      })
      .select('id').single()

    if (reqErr || !req) return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })

    // Notify controller
    await sendEmail({
      to: 'privacy@ingenious-education.co.uk',
      subject: `[Zawaaj DSR] Article 16 rectification request — ${body.field_name}`,
      html: `<p>A rectification request has been submitted.<br>Request ID: ${req.id}<br>Subject email: ${user.email}<br>Field: ${body.field_name}<br>Current value: ${body.current_value ?? 'not provided'}<br>Requested value: ${body.requested_value}<br>Note: ${body.supporting_note ?? 'none'}</p><p>Statutory deadline: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</p>`,
    }).catch(() => {})

    await supabaseAdmin.from('zawaaj_audit_log').insert({
      event_type: 'dsr_rectification_requested',
      actor_user_id: user.id,
      metadata: { request_id: req.id, field_name: body.field_name },
    })

    return NextResponse.json({
      message: 'Your rectification request has been submitted. Ingenious Education Ltd has been notified and will respond within 30 days.',
      request_id: req.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
