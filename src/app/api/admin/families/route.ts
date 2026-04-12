import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return null
  return user
}

// POST — create a family account (admin-initiated)
export async function POST(request: Request): Promise<Response> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const {
    contact_full_name, contact_relationship, contact_number, contact_email,
    female_contact_name, female_contact_number, female_contact_relationship,
    father_explanation, no_female_contact_flag,
    plan, registration_path, terms_agreed,
  } = body

  if (!contact_full_name || !contact_relationship || !contact_number || !contact_email) {
    return NextResponse.json(
      { error: 'contact_full_name, contact_relationship, contact_number, and contact_email are required.' },
      { status: 400 }
    )
  }

  const { data: family, error } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .insert({
      contact_full_name,
      contact_relationship,
      contact_number,
      contact_email,
      female_contact_name:         female_contact_name         ?? null,
      female_contact_number:       female_contact_number       ?? null,
      female_contact_relationship: female_contact_relationship ?? null,
      father_explanation:          father_explanation          ?? '',
      no_female_contact_flag:      no_female_contact_flag      ?? false,
      plan:                        plan                        ?? 'voluntary',
      registration_path:           registration_path           ?? 'parent',
      terms_agreed:                terms_agreed                ?? false,
      terms_agreed_at:             terms_agreed ? new Date().toISOString() : null,
      status:                      'active',
      approved_by:                 user.id,
      approved_at:                 new Date().toISOString(),
    })
    .select(`
      id, contact_full_name, contact_relationship, contact_number, contact_email,
      female_contact_name, female_contact_number, no_female_contact_flag, father_explanation,
      plan, status, registration_path, terms_agreed, terms_agreed_at,
      approved_at, created_at, updated_at, primary_user_id
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach empty profiles array so the client can use it immediately as a FamilyRow
  return NextResponse.json({ family: { ...family, profiles: [] } }, { status: 201 })
}

// PATCH — update family account status
export async function PATCH(request: Request): Promise<Response> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
