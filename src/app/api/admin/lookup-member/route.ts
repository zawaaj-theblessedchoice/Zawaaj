import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── POST /api/admin/lookup-member ────────────────────────────────────────────
// Keyword search of existing members by NAME or EMAIL, for manager elevation.
//
// SUPER-ADMIN ONLY (enforced server-side below). This endpoint returns member
// names + emails on partial input — a member-enumeration surface — so the SA
// guard is mandatory, not just page-level.
//
// Returns up to 10 matches. Excludes anyone already elevated (is_admin=true or
// an existing zawaaj_managers row). Minimum query length: 2 chars.

interface LookupBody {
  q?: string
  email?: string // legacy field name — accepted for back-compat
}

interface MemberResult {
  user_id: string
  profile_id: string | null
  name: string | null
  email: string | null
  gender: string | null
  plan: string
}

const MIN_QUERY_LEN = 2
const MAX_RESULTS = 10
const MAX_EMAIL_MATCH_IDS = 50 // bound the .or() in-list URL length

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // 1. Auth — must be super admin (member-enumeration surface)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isSA } = await supabase.rpc('zawaaj_is_super_admin')
    if (!isSA) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse + validate query
    const body = await request.json() as LookupBody
    const q = (body.q ?? body.email ?? '').trim()
    if (q.length < MIN_QUERY_LEN) {
      // Below threshold → never dump the member table
      return NextResponse.json({ results: [] })
    }
    const term = q.toLowerCase()

    // 3. Pull auth users for email matching + email display.
    //    Email lives in auth.users (not on profiles), so it can't be ILIKE'd
    //    via the data client — filter in JS.
    const { data: userList, error: userErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (userErr) {
      return NextResponse.json({ error: 'Failed to look up members' }, { status: 500 })
    }
    const emailById = new Map<string, string | null>(userList.users.map(u => [u.id, u.email ?? null]))
    const emailMatchIds = userList.users
      .filter(u => u.email?.toLowerCase().includes(term))
      .map(u => u.id)
      .slice(0, MAX_EMAIL_MATCH_IDS)

    // 4. Profile search: name ILIKE OR (user_id in email matches).
    //    is_admin excluded server-side so elevated members never appear.
    const orParts = [
      `first_name.ilike.%${term}%`,
      `last_name.ilike.%${term}%`,
      `display_initials.ilike.%${term}%`,
    ]
    if (emailMatchIds.length > 0) {
      orParts.push(`user_id.in.(${emailMatchIds.join(',')})`)
    }

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('id, user_id, first_name, last_name, display_initials, gender')
      .eq('is_admin', false)
      .or(orParts.join(','))

    if (profErr) {
      return NextResponse.json({ error: 'Failed to search members' }, { status: 500 })
    }

    const candidates = profiles ?? []
    if (candidates.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // 5. Exclude anyone who already has a manager record
    const candidateUserIds = candidates.map(p => p.user_id as string)
    const { data: mgrRows } = await supabaseAdmin
      .from('zawaaj_managers')
      .select('user_id')
      .in('user_id', candidateUserIds)
    const managerSet = new Set((mgrRows ?? []).map(m => m.user_id as string))

    const eligible = candidates.filter(p => !managerSet.has(p.user_id as string)).slice(0, MAX_RESULTS)
    if (eligible.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // 6. Resolve active plans for the final set
    const finalUserIds = eligible.map(p => p.user_id as string)
    const { data: subs } = await supabaseAdmin
      .from('zawaaj_subscriptions')
      .select('user_id, plan')
      .eq('status', 'active')
      .in('user_id', finalUserIds)
    const planById = new Map<string, string>((subs ?? []).map(s => [s.user_id as string, s.plan as string]))

    // 7. Build result rows
    const results: MemberResult[] = eligible.map(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || (p.display_initials as string | null) || null
      return {
        user_id:    p.user_id as string,
        profile_id: (p.id as string) ?? null,
        name,
        email:      emailById.get(p.user_id as string) ?? null,
        gender:     (p.gender as string | null) ?? null,
        plan:       planById.get(p.user_id as string) ?? 'free',
      }
    })

    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
