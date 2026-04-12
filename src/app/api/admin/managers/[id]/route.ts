// PATCH  /api/admin/managers/[id]  — update manager (super_admin only)
// DELETE /api/admin/managers/[id]  — deactivate or hard-delete (super_admin only)
//
// PATCH body: any subset of {
//   full_name, email, contact_number, role,
//   scope_cities, scope_genders, scope_ethnicities, scope_languages,
//   notes, is_active
// }
//
// DELETE body: { hard?: boolean }
//   hard = false (default): sets is_active = false (deactivate)
//   hard = true:            deletes the row — only if no assigned matches
//
// Section 7 — Family Model v2

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function guardSuperAdmin(): Promise<{ userId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { userId: null, error: 'Unauthorized' }
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin') return { userId: null, error: 'Forbidden' }
  return { userId: user.id, error: null }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { error } = await guardSuperAdmin()
  if (error === 'Unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'Forbidden')    return NextResponse.json({ error }, { status: 403 })

  const { id } = await params

  const body = await request.json() as {
    full_name?: string
    email?: string
    contact_number?: string
    role?: string
    scope_cities?: string[] | null
    scope_genders?: string[] | null
    scope_ethnicities?: string[] | null
    scope_languages?: string[] | null
    notes?: string | null
    is_active?: boolean
  }

  const validRoles = ['manager', 'senior_manager']
  const updates: Record<string, unknown> = {}

  if (body.full_name !== undefined)        updates.full_name        = body.full_name.trim()
  if (body.email !== undefined)            updates.email            = body.email?.trim() || null
  if (body.contact_number !== undefined)   updates.contact_number   = body.contact_number?.trim() || null
  if (body.role !== undefined && validRoles.includes(body.role)) updates.role = body.role
  if (body.scope_cities !== undefined)     updates.scope_cities     = body.scope_cities?.length ? body.scope_cities : null
  if (body.scope_genders !== undefined)    updates.scope_genders    = body.scope_genders?.length ? body.scope_genders : null
  if (body.scope_ethnicities !== undefined) updates.scope_ethnicities = body.scope_ethnicities?.length ? body.scope_ethnicities : null
  if (body.scope_languages !== undefined)  updates.scope_languages  = body.scope_languages?.length ? body.scope_languages : null
  if (body.notes !== undefined)            updates.notes            = body.notes?.trim() || null
  if (body.is_active !== undefined)        updates.is_active        = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error: dbError } = await supabaseAdmin
    .from('zawaaj_managers')
    .update(updates)
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { error } = await guardSuperAdmin()
  if (error === 'Unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'Forbidden')    return NextResponse.json({ error }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({})) as { hard?: boolean }

  if (body.hard) {
    // Hard delete — only if manager has no assigned matches
    const { count } = await supabaseAdmin
      .from('zawaaj_matches')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_manager_id', id)

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a manager with assigned matches. Deactivate instead.' },
        { status: 422 }
      )
    }

    const { error: dbError } = await supabaseAdmin
      .from('zawaaj_managers')
      .delete()
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: true })
  }

  // Soft deactivate (default)
  const { error: dbError } = await supabaseAdmin
    .from('zawaaj_managers')
    .update({ is_active: false })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true, deactivated: true })
}
