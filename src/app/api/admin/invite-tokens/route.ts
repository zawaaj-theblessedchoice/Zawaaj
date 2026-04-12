import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/admin/invite-tokens
 * Creates an invite token for a family account and returns a ready-to-share URL.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as {
    family_account_id: string
    purpose?: string
    invited_name?: string | null
    invited_email?: string | null
    invited_phone?: string | null
  }

  if (!body.family_account_id) {
    return NextResponse.json({ error: 'family_account_id is required' }, { status: 400 })
  }

  const { data: token, error } = await supabaseAdmin
    .from('zawaaj_invite_tokens')
    .insert({
      family_account_id: body.family_account_id,
      created_by:        user.id,
      purpose:           body.purpose        ?? 'link_child',
      invited_name:      body.invited_name   ?? null,
      invited_email:     body.invited_email  ?? null,
      invited_phone:     body.invited_phone  ?? null,
      // expires_at defaults to now() + 7 days via DB default
    })
    .select('token, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'
  const url = `${baseUrl}/register/accept-invite?token=${token.token}`

  return NextResponse.json({ url, expires_at: token.expires_at }, { status: 201 })
}
