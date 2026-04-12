// POST /api/browse-state/filters
//
// Auto-persists applied filter state for Plus/Premium members.
// Free members are rejected — filters neither applied nor stored.
//
// body: { filters: FilterState }   — store filters
//       { clear: true }            — clear stored filters

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPlanConfig } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()

    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Active profile ─────────────────────────────────────────────────────
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeProfileId = settings?.active_profile_id
    if (!activeProfileId) {
      return NextResponse.json({ error: 'No active profile' }, { status: 400 })
    }

    // ── 3. Plan gate — Free users: silent no-op ───────────────────────────────
    const { data: subRow } = await supabase
      .from('zawaaj_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    const plan = ((subRow?.plan ?? 'free') as Plan)
    const planConfig = getPlanConfig(plan)

    if (!planConfig.advancedFilters) {
      // Free members: return 204 without writing anything
      return new Response(null, { status: 204 })
    }

    // ── 4. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json() as { filters?: unknown; clear?: boolean }

    const filtersJson   = body.clear ? null : (body.filters ?? null)
    const filtersUpdAt  = body.clear ? null : new Date().toISOString()

    // ── 5. Upsert into browse_state ───────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from('zawaaj_browse_state')
      .upsert(
        {
          profile_id:          activeProfileId,
          last_browsed_at:     new Date().toISOString(),
          filters_json:        filtersJson,
          filters_updated_at:  filtersUpdAt,
        },
        { onConflict: 'profile_id' }
      )

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to persist filters' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
