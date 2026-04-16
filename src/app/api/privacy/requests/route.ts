// GET /api/privacy/requests — list the authenticated user's own privacy requests

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(): Promise<Response> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error: fetchError } = await supabaseAdmin
    .from('zawaaj_privacy_requests')
    .select('id, type, status, field_name, requested_value, supporting_note, statutory_deadline, completed_at, rejection_reason, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
