// ─── POST /api/payments/gocardless/create-redirect-flow ──────────────────────
// Creates a GoCardless redirect flow and returns the hosted page URL.
// Requires: authenticated primary rep user with readiness_state = 'intro_ready'.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { gocardless } from '@/lib/gocardless/client'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json() as { plan?: string; billing_cycle?: string }
    const { plan = 'premium', billing_cycle = 'monthly' } = body

    if (plan !== 'premium') {
      return NextResponse.json({ error: 'Only Premium plan is available via Direct Debit' }, { status: 400 })
    }
    if (billing_cycle !== 'monthly' && billing_cycle !== 'annual') {
      return NextResponse.json({ error: 'Invalid billing_cycle — must be monthly or annual' }, { status: 400 })
    }

    // Get active profile
    const { data: settings } = await supabase
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!settings?.active_profile_id) {
      return NextResponse.json({ error: 'No active profile found' }, { status: 400 })
    }

    // Get family account — user must be primary_user_id (representative)
    const { data: profRow } = await supabase
      .from('zawaaj_profiles')
      .select('family_account_id')
      .eq('id', settings.active_profile_id)
      .maybeSingle()

    const familyAccountId = (profRow as { family_account_id?: string | null } | null)?.family_account_id
    if (!familyAccountId) {
      return NextResponse.json({ error: 'No family account found — please complete account setup' }, { status: 400 })
    }

    const { data: famRow } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, primary_user_id, contact_email, contact_full_name, readiness_state, subscription_source')
      .eq('id', familyAccountId)
      .maybeSingle()

    const fam = famRow as {
      id: string
      primary_user_id: string | null
      contact_email: string | null
      contact_full_name: string | null
      readiness_state: string
      subscription_source: string | null
    } | null

    if (!fam) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 })
    }

    // Only the primary rep can set up payments
    if (fam.primary_user_id !== user.id) {
      return NextResponse.json({ error: 'Only the family representative can set up payments' }, { status: 403 })
    }

    // Must be intro_ready
    if (fam.readiness_state !== 'intro_ready') {
      return NextResponse.json({ error: 'Please complete your account setup before upgrading' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zawaaj.uk'
    const nameParts = (fam.contact_full_name ?? '').trim().split(' ')
    const givenName = nameParts[0] ?? undefined
    const familyName = nameParts.slice(1).join(' ') || undefined

    const redirectFlow = await gocardless.redirectFlows.create({
      description: `Zawaaj Premium — ${billing_cycle === 'annual' ? 'Annual' : 'Monthly'}`,
      session_token: user.id,
      success_redirect_url: `${siteUrl}/upgrade/direct-debit/callback`,
      prefilled_customer: {
        email: fam.contact_email ?? undefined,
        given_name: givenName,
        family_name: familyName,
      },
    })

    return NextResponse.json({ redirect_url: redirectFlow.redirect_url }, { status: 200 })
  } catch (err) {
    console.error('[GC create-redirect-flow] error:', err)
    return NextResponse.json({ error: 'Failed to create Direct Debit setup — please try again' }, { status: 500 })
  }
}
