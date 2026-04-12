import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/admin/families/search-profiles?q=<query>
 * Returns up to 20 profiles matching the query by name or initials.
 * Used by the admin "Link Profile" modal.
 */
export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ profiles: [] })

  // Search by first_name, last_name, display_initials (case-insensitive partial match)
  const { data: profiles, error } = await supabaseAdmin
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, last_name, gender, status, location, family_account_id')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,display_initials.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles: profiles ?? [] })
}
