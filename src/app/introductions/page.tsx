import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IntroductionsClient, { type IntroStatus } from './IntroductionsClient'
import type { Plan } from '@/lib/plan-config'

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

interface ResponseTemplate {
  id: string
  tone: 'positive' | 'decline'
  text: string
  display_order: number
}

export default async function IntroductionsPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  // Admin check — super_admin → /admin, manager → /admin/introductions
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role === 'super_admin') redirect('/admin')
  if (role === 'manager') redirect('/admin/introductions')

  // Get active profile
  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.active_profile_id) redirect('/pending')

  const activeProfileId = settings.active_profile_id

  // Verify profile is approved
  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('id, status, display_initials, first_name, gender')
    .eq('id', activeProfileId)
    .single()

  if (!profile || profile.status !== 'approved') redirect('/pending')

  // Fetch everything in parallel
  const [
    { data: profileRows },
    { data: sentRows },
    { data: receivedRows },
    slResult,
    { data: templateRows },
    { data: subData },
  ] = await Promise.all([
    supabase
      .from('zawaaj_profiles')
      .select('id, display_initials, first_name, gender, status')
      .eq('user_id', user.id),
    supabase
      .from('zawaaj_introduction_requests')
      .select('id, target_profile_id, status, created_at, expires_at, mutual_at, admin_notes, assigned_manager_id')
      .eq('requesting_profile_id', activeProfileId)
      .order('created_at', { ascending: false }),
    supabase
      .from('zawaaj_introduction_requests')
      .select('id, requesting_profile_id, status, created_at, expires_at, response_deadline')
      .eq('target_profile_id', activeProfileId)
      .or('visible_at.is.null,visible_at.lte.' + new Date().toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('zawaaj_saved_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', activeProfileId),
    supabase
      .from('zawaaj_response_templates')
      .select('id, tone, text, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('zawaaj_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const plan: Plan = ((subData as { plan?: string } | null)?.plan ?? 'free') as Plan

  const managedProfiles: ManagedProfile[] = (profileRows ?? []).map(p => ({
    id: p.id,
    display_initials: p.display_initials,
    first_name: p.first_name,
    gender: p.gender,
    status: p.status,
  }))

  // Fetch target profile details for sent requests
  const sentTargetIds = (sentRows ?? []).map(r => r.target_profile_id as string)
  const { data: targetProfiles } = sentTargetIds.length > 0
    ? await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, last_name, gender, location, profession_detail, age_display, date_of_birth')
        .in('id', sentTargetIds)
    : { data: [] }

  const targetMap = new Map(
    (targetProfiles ?? []).map(p => [p.id, p])
  )

  // Fetch manager names for sent requests that have been assigned
  const managerIds = [
    ...new Set(
      (sentRows ?? [])
        .map(r => r.assigned_manager_id as string | null)
        .filter((id): id is string => id !== null)
    ),
  ]
  const { data: managerProfiles } = managerIds.length > 0
    ? await supabase
        .from('zawaaj_profiles')
        .select('id, first_name, last_name, display_initials')
        .in('id', managerIds)
    : { data: [] }

  const managerMap = new Map(
    (managerProfiles ?? []).map(p => [
      p.id,
      `${p.first_name ?? ''} ${p.last_name ? p.last_name[0] + '.' : ''}`.trim() || p.display_initials,
    ])
  )

  // Fetch limited public info for received request senders
  const receivedRequesterIds = (receivedRows ?? []).map(r => r.requesting_profile_id as string)
  const { data: requesterProfiles } = receivedRequesterIds.length > 0
    ? await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, last_name, gender, age_display, location, profession_detail, family_account_id')
        .in('id', receivedRequesterIds)
    : { data: [] }

  // Fetch no_female_contact_flag for requester family accounts
  const requesterFamilyIds = [
    ...new Set(
      (requesterProfiles ?? [])
        .map(p => (p as { family_account_id?: string | null }).family_account_id)
        .filter((id): id is string => id != null)
    ),
  ]
  const { data: requesterFamilyRows } = requesterFamilyIds.length > 0
    ? await supabase
        .from('zawaaj_family_accounts')
        .select('id, no_female_contact_flag')
        .in('id', requesterFamilyIds)
    : { data: [] }

  const requesterFamilyFlagMap = new Map(
    (requesterFamilyRows ?? []).map(fa => [fa.id as string, (fa.no_female_contact_flag as boolean) ?? false])
  )

  const requesterMap = new Map(
    (requesterProfiles ?? []).map(p => {
      const faId = (p as { family_account_id?: string | null }).family_account_id
      return [p.id, { ...p, no_female_contact_flag: faId ? (requesterFamilyFlagMap.get(faId) ?? false) : false }]
    })
  )

  const requests = (sentRows ?? []).map(r => ({
    id: r.id as string,
    target_profile_id: r.target_profile_id as string,
    status: r.status as IntroStatus,
    created_at: r.created_at as string,
    expires_at: r.expires_at as string | null,
    mutual_at: r.mutual_at as string | null,
    admin_notes: r.admin_notes as string | null,
    target: targetMap.get(r.target_profile_id as string) ?? null,
    assigned_manager_name: r.assigned_manager_id
      ? (managerMap.get(r.assigned_manager_id as string) ?? null)
      : null,
  }))

  const receivedRequests = (receivedRows ?? []).map(r => ({
    id: r.id as string,
    requesting_profile_id: r.requesting_profile_id as string,
    status: r.status as IntroStatus,
    created_at: r.created_at as string,
    expires_at: r.expires_at as string | null,
    response_deadline: (r as { response_deadline?: string | null }).response_deadline ?? null,
    requester: (requesterMap.get(r.requesting_profile_id as string) ?? null) as {
      id: string; display_initials: string; first_name: string | null; last_name: string | null
      gender: string | null; age_display: string | null; location: string | null; profession_detail: string | null
      no_female_contact_flag: boolean | null
    } | null,
  }))

  const shortlistCount = slResult.count ?? 0

  const responseTemplates: ResponseTemplate[] = (templateRows ?? []).map(t => ({
    id: t.id as string,
    tone: t.tone as 'positive' | 'decline',
    text: t.text as string,
    display_order: t.display_order as number,
  }))

  return (
    <IntroductionsClient
      requests={requests}
      receivedRequests={receivedRequests}
      shortlistCount={shortlistCount}
      viewerProfile={{
        id: profile.id,
        display_initials: profile.display_initials,
        first_name: profile.first_name,
        gender: profile.gender,
      }}
      managedProfiles={managedProfiles}
      activeProfileId={activeProfileId}
      responseTemplates={responseTemplates}
      plan={plan}
    />
  )
}
