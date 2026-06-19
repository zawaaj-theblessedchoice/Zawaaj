import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  return role === 'super_admin' ? user : null
}

// Intro-request statuses that are NOT live (safe to cascade away). Anything else
// is treated as an in-progress introduction that must not be silently broken.
const TERMINAL_INTRO_STATUSES = new Set([
  'expired', 'withdrawn', 'declined', 'no_longer_proceeding', 'dismissed', 'rejected',
])

interface FamilyImpact {
  family_account_id: string
  contact_full_name: string
  archived: boolean
  profileCount: number
  introCount: number
  // Live introductions whose OTHER side belongs to a different, non-archived
  // family — these BLOCK a hard delete so we never break a real family's intro.
  blockers: { introId: string; otherFamily: string; status: string }[]
}

// Shared impact computation for the delete preview (GET) and the guard (DELETE).
async function computeImpact(familyId: string): Promise<{ impact: FamilyImpact | null; error?: string }> {
  const { data: family, error: famErr } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .select('id, contact_full_name, archived_at, profiles:zawaaj_profiles(id)')
    .eq('id', familyId)
    .maybeSingle()

  if (famErr) {
    // Most likely archived_at column missing → migration 063 not applied.
    return { impact: null, error: 'archive_unavailable' }
  }
  if (!family) return { impact: null, error: 'not_found' }

  const profileRows = (family.profiles ?? []) as { id: string }[]
  const profileIds = profileRows.map(p => p.id)

  // All intro requests where one side is this family's profile.
  let introCount = 0
  const blockers: FamilyImpact['blockers'] = []
  if (profileIds.length > 0) {
    const idList = `(${profileIds.join(',')})`
    const { data: intros } = await supabaseAdmin
      .from('zawaaj_introduction_requests')
      .select('id, requesting_profile_id, target_profile_id, status')
      .or(`requesting_profile_id.in.${idList},target_profile_id.in.${idList}`)

    const introRows = (intros ?? []) as {
      id: string; requesting_profile_id: string; target_profile_id: string; status: string
    }[]
    introCount = introRows.length

    // Resolve the OTHER side's family for live intros to detect cross-family ones.
    const ownSet = new Set(profileIds)
    const otherProfileIds = new Set<string>()
    for (const ir of introRows) {
      if (TERMINAL_INTRO_STATUSES.has(ir.status)) continue
      const other = ownSet.has(ir.requesting_profile_id) ? ir.target_profile_id : ir.requesting_profile_id
      if (!ownSet.has(other)) otherProfileIds.add(other)
    }

    if (otherProfileIds.size > 0) {
      const { data: otherProfiles } = await supabaseAdmin
        .from('zawaaj_profiles')
        .select('id, family_account_id')
        .in('id', [...otherProfileIds])
      const profileToFamily = new Map<string, string | null>()
      for (const p of otherProfiles ?? []) profileToFamily.set(p.id as string, (p.family_account_id as string | null) ?? null)

      const otherFamilyIds = [...new Set([...profileToFamily.values()].filter((v): v is string => !!v && v !== familyId))]
      const familyInfo = new Map<string, { name: string; archived: boolean }>()
      if (otherFamilyIds.length > 0) {
        const { data: otherFams } = await supabaseAdmin
          .from('zawaaj_family_accounts')
          .select('id, contact_full_name, archived_at')
          .in('id', otherFamilyIds)
        for (const of of otherFams ?? []) {
          familyInfo.set(of.id as string, {
            name: (of.contact_full_name as string | null) ?? 'Unknown family',
            archived: !!(of.archived_at as string | null),
          })
        }
      }

      for (const ir of introRows) {
        if (TERMINAL_INTRO_STATUSES.has(ir.status)) continue
        const other = ownSet.has(ir.requesting_profile_id) ? ir.target_profile_id : ir.requesting_profile_id
        if (ownSet.has(other)) continue
        const otherFam = profileToFamily.get(other)
        if (!otherFam || otherFam === familyId) continue
        const info = familyInfo.get(otherFam)
        // Block only when the OTHER family is real and NOT archived.
        if (info && !info.archived) {
          blockers.push({ introId: ir.id, otherFamily: info.name, status: ir.status })
        }
      }
    }
  }

  return {
    impact: {
      family_account_id: familyId,
      contact_full_name: (family.contact_full_name as string | null) ?? 'this family',
      archived: !!(family.archived_at as string | null),
      profileCount: profileRows.length,
      introCount,
      blockers,
    },
  }
}

// GET /api/admin/families/[id] — delete impact preview (super-admin only).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { impact, error } = await computeImpact(id)
  if (error === 'archive_unavailable') {
    return NextResponse.json({ error: 'Run migration 063 (family archive) before using delete.' }, { status: 503 })
  }
  if (error === 'not_found' || !impact) {
    return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
  }
  return NextResponse.json({ impact })
}

// PATCH /api/admin/families/[id] — archive / restore (super-admin only).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { action?: string }

  if (body.action !== 'archive' && body.action !== 'restore') {
    return NextResponse.json({ error: 'Invalid action — expected archive or restore' }, { status: 400 })
  }

  const update = body.action === 'archive'
    ? { archived_at: new Date().toISOString(), archived_by: admin.id }
    : { archived_at: null, archived_by: null }

  const { error } = await supabaseAdmin
    .from('zawaaj_family_accounts')
    .update(update)
    .eq('id', id)

  if (error) {
    // archived_at column missing → migration not applied.
    return NextResponse.json(
      { error: 'Run migration 063 (family archive) before archiving accounts.' },
      { status: 503 },
    )
  }
  return NextResponse.json({ ok: true, archived: body.action === 'archive' })
}

// DELETE /api/admin/families/[id]
// Permanent hard-delete. GUARDED: super-admin only, ONLY on already-archived
// accounts, and blocked if any live introduction's other side is a real
// (non-archived) family. Deletes the family, its profiles (FKs cascade intro
// requests + matches), its claim tokens (FK cascade), and its auth users.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const admin = await requireSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { impact, error: impErr } = await computeImpact(id)
    if (impErr === 'archive_unavailable') {
      return NextResponse.json({ error: 'Run migration 063 (family archive) before deleting.' }, { status: 503 })
    }
    if (impErr === 'not_found' || !impact) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    // Guard 1: must be archived first.
    if (!impact.archived) {
      return NextResponse.json(
        { error: 'Archive this account before permanently deleting it.' },
        { status: 409 },
      )
    }

    // Guard 2: don't break a real family's live introduction.
    if (impact.blockers.length > 0) {
      const names = [...new Set(impact.blockers.map(b => b.otherFamily))].join(', ')
      return NextResponse.json(
        {
          error: `Cannot delete: this family has ${impact.blockers.length} live introduction(s) with active families (${names}). Resolve or withdraw those first.`,
          blockers: impact.blockers,
        },
        { status: 409 },
      )
    }

    // Fetch profiles + primary user for the actual deletion.
    const { data: family } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, primary_user_id, profiles:zawaaj_profiles(id, user_id)')
      .eq('id', id)
      .maybeSingle()

    if (!family) return NextResponse.json({ error: 'Family account not found' }, { status: 404 })

    const authUserIds = new Set<string>()
    if (family.primary_user_id) authUserIds.add(family.primary_user_id as string)
    const profileRows = (family.profiles ?? []) as { id: string; user_id: string | null }[]
    for (const p of profileRows) {
      if (p.user_id) authUserIds.add(p.user_id)
    }

    // Delete profiles (FK cascades intro_requests + matches + follow-ups).
    for (const p of profileRows) {
      await supabaseAdmin.from('zawaaj_profiles').delete().eq('id', p.id)
    }

    // Delete the family account (FK cascades zawaaj_invite_tokens).
    const { error: delFamilyErr } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .delete()
      .eq('id', id)
    if (delFamilyErr) throw delFamilyErr

    // Delete auth users (best-effort).
    for (const uid of authUserIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid)
      } catch (e) {
        console.error('[delete-family] auth.deleteUser failed for', uid, e)
      }
    }

    return NextResponse.json({ ok: true, deleted: { profiles: impact.profileCount, introductions: impact.introCount } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[delete-family]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
