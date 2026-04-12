// /admin/managers — Manager admin page (Section 7, Family Model v2)
// Super admin only.

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminManagersClient, { type ManagerRow } from './ManagersClient'

export default async function AdminManagersPage() {
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ── Role check — super_admin only ─────────────────────────────────────────
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin') redirect('/admin')

  // ── Fetch managers ────────────────────────────────────────────────────────
  const { data: rows } = await supabaseAdmin
    .from('zawaaj_managers')
    .select(`
      id, user_id, full_name, email, contact_number,
      scope_cities, scope_genders, scope_ethnicities, scope_languages,
      role, is_active, notes, appointed_at, created_at
    `)
    .order('full_name', { ascending: true })

  const managers: ManagerRow[] = (rows ?? []).map(r => ({
    id: r.id as string,
    user_id: r.user_id as string,
    full_name: r.full_name as string,
    email: (r.email as string | null) ?? null,
    contact_number: (r.contact_number as string | null) ?? null,
    scope_cities: (r.scope_cities as string[] | null) ?? null,
    scope_genders: (r.scope_genders as string[] | null) ?? null,
    scope_ethnicities: (r.scope_ethnicities as string[] | null) ?? null,
    scope_languages: (r.scope_languages as string[] | null) ?? null,
    role: (r.role as 'manager' | 'senior_manager'),
    is_active: (r.is_active as boolean),
    notes: (r.notes as string | null) ?? null,
    appointed_at: (r.appointed_at as string | null) ?? null,
    created_at: r.created_at as string,
  }))

  return <AdminManagersClient managers={managers} />
}
