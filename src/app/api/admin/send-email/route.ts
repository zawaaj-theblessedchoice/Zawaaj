// POST /api/admin/send-email
//
// Sends a free-form admin message to a family's contact email.
// Admin (super_admin or manager) only.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, adminMessageTemplate } from '@/lib/email'

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // Auth + role check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: role } = await supabase.rpc('zawaaj_get_role')
    if (role !== 'super_admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as {
      to: string
      recipient_name: string
      subject: string
      message: string
    }

    const { to, recipient_name, subject, message } = body

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'to, subject, and message are required' }, { status: 400 })
    }

    const result = await sendEmail({
      to,
      subject,
      html: adminMessageTemplate(recipient_name || 'there', subject, message),
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Email send failed' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
