// GET  /api/admin/managers  — list managers (super_admin only)
// POST /api/admin/managers  — create new manager (super_admin only)
//
// Section 7 — Family Model v2

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail, managerPromotionTemplate } from '@/lib/email'

async function guardSuperAdmin(): Promise<{ userId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { userId: null, error: 'Unauthorized' }
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin') return { userId: null, error: 'Forbidden' }
  return { userId: user.id, error: null }
}

export async function GET(): Promise<Response> {
  const { error } = await guardSuperAdmin()
  if (error === 'Unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'Forbidden')    return NextResponse.json({ error }, { status: 403 })

  const { data, error: dbError } = await supabaseAdmin
    .from('zawaaj_managers')
    .select(`
      id, user_id, full_name, email, contact_number,
      scope_cities, scope_genders, scope_ethnicities, scope_languages,
      role, is_active, notes, appointed_at, created_at
    `)
    .order('full_name', { ascending: true })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ managers: data ?? [] })
}

export async function POST(request: Request): Promise<Response> {
  const { userId, error } = await guardSuperAdmin()
  if (error === 'Unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'Forbidden')    return NextResponse.json({ error }, { status: 403 })

  const body = await request.json() as {
    user_id?: string
    full_name?: string
    email?: string
    contact_number?: string
    role?: string
    scope_cities?: string[]
    scope_genders?: string[]
    scope_ethnicities?: string[]
    scope_languages?: string[]
    notes?: string
    granted_premium?: boolean   // whether "Grant Premium" was ticked at promotion
  }

  if (!body.user_id || !body.full_name?.trim()) {
    return NextResponse.json({ error: 'user_id and full_name are required' }, { status: 400 })
  }

  const validRoles = ['manager'] // 'senior_manager' removed — phantom tier
  const managerRole = body.role && validRoles.includes(body.role) ? body.role : 'manager'

  const { data, error: dbError } = await supabaseAdmin
    .from('zawaaj_managers')
    .insert({
      user_id: body.user_id,
      full_name: body.full_name.trim(),
      email: body.email?.trim() || null,
      contact_number: body.contact_number?.trim() || null,
      role: managerRole,
      scope_cities: body.scope_cities?.length ? body.scope_cities : null,
      scope_genders: body.scope_genders?.length ? body.scope_genders : null,
      scope_ethnicities: body.scope_ethnicities?.length ? body.scope_ethnicities : null,
      scope_languages: body.scope_languages?.length ? body.scope_languages : null,
      notes: body.notes?.trim() || null,
      appointed_by: userId,
      appointed_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // ── Promotion-notification email ──────────────────────────────────────────
  // Recipient = the account contact (body.email is already the contact email,
  // resolved client-side from the family-account contact per Fix 3). full_name
  // is likewise the contact name. The premium line is included ONLY when
  // "Grant Premium" was ticked, so the copy never over-promises.
  // Non-fatal: a failed email must not fail the manager creation.
  const notifyEmail = body.email?.trim()
  if (notifyEmail) {
    try {
      const result = await sendEmail({
        to: notifyEmail,
        subject: 'You are now a Zawaaj manager',
        html: managerPromotionTemplate(body.full_name.trim(), body.granted_premium === true),
      })
      if (!result.ok) {
        console.error('[admin/managers] promotion email failed:', result.error)
      }
    } catch (err) {
      console.error('[admin/managers] promotion email threw:', err)
    }
  }

  return NextResponse.json({ success: true, id: (data as { id: string }).id }, { status: 201 })
}
