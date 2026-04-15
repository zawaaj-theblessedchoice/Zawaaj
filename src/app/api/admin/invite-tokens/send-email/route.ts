// POST /api/admin/invite-tokens/send-email
//
// Sends a guardian/child invite link to a candidate's email address.
// Admin-only. Does not re-generate the token — caller passes the URL.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, guardianInviteTemplate } from '@/lib/email'

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // Auth + admin check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: role } = await supabase.rpc('zawaaj_get_role')
    if (role !== 'super_admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as {
      invite_url: string
      candidate_email: string
      candidate_name?: string | null
      family_contact_name: string
    }

    const { invite_url, candidate_email, candidate_name, family_contact_name } = body

    if (!invite_url || !candidate_email || !family_contact_name) {
      return NextResponse.json({ error: 'invite_url, candidate_email, and family_contact_name are required' }, { status: 400 })
    }

    const result = await sendEmail({
      to: candidate_email,
      subject: 'You have been invited to join Zawaaj',
      html: guardianInviteTemplate(invite_url, candidate_name ?? null, family_contact_name),
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
