import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { profile_id: string }
    const { profile_id } = body
    if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

    // Fetch the profile to check if we need to send an invite
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, user_id, imported_email, status')
      .eq('id', profile_id)
      .single()

    if (fetchError || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Update profile status to approved
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .update({ status: 'approved', approved_date: now, listed_at: now })
      .eq('id', profile_id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // If profile has an imported_email and no user_id yet, send invite email
    let invited = false
    if (profile.imported_email && !profile.user_id) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zawaaj.uk'
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        profile.imported_email,
        {
          redirectTo: `${siteUrl}/auth/callback?next=/browse`,
        }
      )
      // If invite fails (e.g. user already exists with that email), don't hard-fail — just log it
      if (!inviteError) {
        invited = true
        // Link the newly created auth user to this profile
        // Supabase auto-creates the auth user on invite — find their UUID
        // Use a short delay isn't reliable; instead we rely on the auth callback to link via imported_email
        // The registration API already handles auto-linking by imported_email when they sign up
      }
    }

    return NextResponse.json({ success: true, invited })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
