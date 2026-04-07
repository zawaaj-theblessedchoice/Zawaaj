import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_PROFILES = 4

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      firstName: string
      lastName?: string
      gender: string
    }
    const { firstName, lastName, gender } = body
    if (!firstName?.trim() || !gender) {
      return NextResponse.json({ error: 'First name and gender are required.' }, { status: 400 })
    }

    // Enforce max profiles per account
    const { count } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= MAX_PROFILES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_PROFILES} profiles allowed per account.` },
        { status: 409 }
      )
    }

    const initials = (
      (firstName.trim()[0] ?? '') + (lastName?.trim()[0] ?? '')
    ).toUpperCase() || firstName.trim()[0].toUpperCase()

    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('zawaaj_profiles')
      .insert({
        user_id: user.id,
        display_initials: initials,
        first_name: firstName.trim() || null,
        last_name: lastName?.trim() || null,
        gender,
        status: 'pending',
        submitted_date: new Date().toISOString(),
        consent_given: true,
        terms_agreed: true,
      })
      .select('id')
      .single()

    if (insertError || !newProfile) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile_id: newProfile.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
