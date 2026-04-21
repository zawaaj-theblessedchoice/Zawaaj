import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/family/invite-candidate
 *
 * Allows a family representative (primary_user_id of a family account) to generate
 * a child_invite token so their candidate can create their own login and access
 * their profile directly.  No admin rights required — only the rep of the account.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { invited_name?: string | null }

    // Caller must be the primary_user_id of a family account
    const { data: family, error: famErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_full_name')
      .eq('primary_user_id', user.id)
      .maybeSingle()

    if (famErr) return NextResponse.json({ error: famErr.message }, { status: 500 })
    if (!family) {
      return NextResponse.json(
        { error: 'No family account found — only a registered representative can generate invite links.' },
        { status: 403 }
      )
    }

    const { data: token, error: tokenErr } = await supabaseAdmin
      .from('zawaaj_invite_tokens')
      .insert({
        family_account_id: family.id,
        created_by:        user.id,
        purpose:           'child_invite',
        invited_name:      body.invited_name ?? null,
        // 7-day window — generous since the rep shares this manually
        expires_at:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token, expires_at')
      .single()

    if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'
    const url = `${baseUrl}/register/accept-invite?token=${token.token}`

    return NextResponse.json({ url, expires_at: token.expires_at }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
