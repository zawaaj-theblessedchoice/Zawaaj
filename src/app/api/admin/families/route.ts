import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as { id: string; status: string }
  const { id, status } = body

  const validStatuses = ['pending_approval', 'active', 'suspended', 'pending_contact_details']
  if (!id || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = { status }
  if (status === 'active') {
    updatePayload.approved_by = user.id
    updatePayload.approved_at = new Date().toISOString()
  } else if (status === 'suspended') {
    updatePayload.suspended_by = user.id
  }

  const { error } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .update(updatePayload)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
