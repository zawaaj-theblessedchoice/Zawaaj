import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── Shared: resolve active_profile_id for current user ──────────────────────

async function getActiveProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.active_profile_id ?? null
}

// ─── POST — Toggle save / unsave ─────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Active profile
    const activeProfileId = await getActiveProfileId(supabase, user.id)
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // Parse body
    const body = await request.json() as { profile_id?: string; action?: string }
    const { profile_id, action } = body

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    if (action !== 'save' && action !== 'unsave') {
      return NextResponse.json({ error: 'action must be "save" or "unsave"' }, { status: 400 })
    }

    if (action === 'save') {
      const { error: insertError } = await supabase
        .from('zawaaj_saved_profiles')
        .insert({ profile_id, saved_by: activeProfileId })

      // Ignore unique-constraint violations (already saved) — treat as success
      if (insertError && insertError.code !== '23505') {
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
      }
    } else {
      const { error: deleteError } = await supabase
        .from('zawaaj_saved_profiles')
        .delete()
        .eq('profile_id', profile_id)
        .eq('saved_by', activeProfileId)

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to unsave profile' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── GET — Get saved profile IDs ─────────────────────────────────────────────

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Active profile
    const activeProfileId = await getActiveProfileId(supabase, user.id)
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // Fetch saved IDs
    const { data, error: fetchError } = await supabase
      .from('zawaaj_saved_profiles')
      .select('profile_id')
      .eq('saved_by', activeProfileId)

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch saved profiles' }, { status: 500 })
    }

    const savedIds = (data ?? []).map((row) => row.profile_id as string)
    return NextResponse.json({ savedIds })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
