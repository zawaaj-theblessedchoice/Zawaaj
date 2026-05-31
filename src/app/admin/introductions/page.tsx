import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminIntroductionsClient from './AdminIntroductionsClient'
import type { IntroRequest, ManagerProfile } from './AdminIntroductionsClient'

export default async function AdminIntroductionsPage() {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/')

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) redirect('/')

  // 2. Role check via RPC
  const { data: role, error: roleError } = await supabase.rpc('zawaaj_get_role')
  if (roleError || (role !== 'super_admin' && role !== 'manager')) redirect('/')

  const adminRole = role as 'super_admin' | 'manager'

  // 3. Fetch active managers from zawaaj_managers (correct source of truth)
  const { data: mgrRows } = await supabase
    .from('zawaaj_managers')
    .select('id, user_id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  // Resolve profile IDs for assignment (assign_manager uses profile IDs)
  const mgrUserIds = (mgrRows ?? []).map(m => m.user_id as string).filter(Boolean)
  const { data: mgrProfiles } = mgrUserIds.length > 0
    ? await supabase
        .from('zawaaj_profiles')
        .select('id, user_id, display_initials, first_name, last_name')
        .in('user_id', mgrUserIds)
    : { data: [] }

  const mgrProfileByUserId = new Map(
    (mgrProfiles ?? []).map(p => [p.user_id as string, p])
  )

  const managers: ManagerProfile[] = (mgrRows ?? []).map(m => {
    const p = mgrProfileByUserId.get(m.user_id as string)
    const nameParts = (m.full_name as string).split(' ')
    return {
      id:               (p?.id as string | null) ?? (m.id as string),
      display_initials: (p?.display_initials as string | null) ?? nameParts.map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      first_name:       (p?.first_name as string | null) ?? (nameParts[0] ?? null),
      last_name:        (p?.last_name  as string | null) ?? (nameParts.slice(1).join(' ') || null),
      manager_id:       m.id as string,
    }
  })

  // 4. Fetch introduction requests with related profiles and new columns.
  //    Managers see ONLY intros assigned to them — intro_requests.assigned_manager_id
  //    holds a PROFILE id, so scope by the manager's active_profile_id.
  //    Super-admins see everything (no scope).
  let introQuery = supabase
    .from('zawaaj_introduction_requests')
    .select(`
      id,
      status,
      created_at,
      expires_at,
      mutual_at,
      responded_at,
      assigned_manager_id,
      suggested_manager_id,
      handled_by,
      handled_at,
      admin_notes,
      requesting_profile:zawaaj_profiles!requesting_profile_id(id, display_initials, first_name, last_name, gender),
      target_profile:zawaaj_profiles!target_profile_id(id, display_initials, first_name, last_name, gender)
    `)
    .order('created_at', { ascending: false })

  if (adminRole === 'manager') {
    introQuery = introQuery.eq('assigned_manager_id', settings.active_profile_id)
  }

  const { data } = await introQuery

  // Resolve suggested manager names server-side
  const suggestedIds = [
    ...new Set(
      (data ?? [])
        .map(r => (r as { suggested_manager_id?: string | null }).suggested_manager_id)
        .filter((id): id is string => !!id)
    ),
  ]
  const { data: suggestedMgrs } = suggestedIds.length > 0
    ? await supabase
        .from('zawaaj_managers')
        .select('id, full_name')
        .in('id', suggestedIds)
    : { data: [] }

  const suggestedNameMap = new Map(
    (suggestedMgrs ?? []).map(m => [m.id as string, m.full_name as string])
  )

  const requests = (data ?? []).map(r => {
    const raw = r as Record<string, unknown>
    const smId = raw.suggested_manager_id as string | null
    return {
      ...raw,
      suggested_manager_name: smId ? (suggestedNameMap.get(smId) ?? null) : null,
    }
  })

  return (
    <AdminIntroductionsClient
      requests={requests as unknown as IntroRequest[]}
      managers={managers}
      role={adminRole}
    />
  )
}
