import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManagersClient from './ManagersClient'
import type { Manager, SuperAdmin, ManagerScope } from './ManagersClient'

export default async function AdminManagersPage() {
  const supabase = await createClient()

  // ─── Auth check ────────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ─── Role check — super_admin only ─────────────────────────────────────────
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin') redirect('/admin')

  // ─── Fetch super_admin profiles ────────────────────────────────────────────
  const { data: superAdminData } = await supabase
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, last_name, gender, status, role')
    .eq('role', 'super_admin')
    .order('first_name', { ascending: true })

  // ─── Fetch manager profiles ─────────────────────────────────────────────────
  const { data: managerData } = await supabase
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, last_name, gender, status, role')
    .eq('role', 'manager')
    .order('first_name', { ascending: true })

  // ─── Fetch all manager scopes ───────────────────────────────────────────────
  const { data: scopeData } = await supabase
    .from('zawaaj_manager_scopes')
    .select('id, manager_profile_id, scope_type, scope_value, created_at')
    .order('created_at', { ascending: true })

  return (
    <ManagersClient
      superAdmins={(superAdminData ?? []) as SuperAdmin[]}
      managers={(managerData ?? []) as Manager[]}
      scopes={(scopeData ?? []) as ManagerScope[]}
    />
  )
}
