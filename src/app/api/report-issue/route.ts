import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, reportIssueAdminAlert } from '@/lib/email'

const ADMIN_EMAIL = 'zawaaj.theblessedchoice@gmail.com'

const VALID_CATEGORIES = [
  'not_working',
  'wrong_information',
  'cant_find',
  'suggestion',
  'other',
] as const
type Category = (typeof VALID_CATEGORIES)[number]

const CATEGORY_LABELS: Record<Category, string> = {
  not_working:       "Something isn't working",
  wrong_information: 'Information looks wrong',
  cant_find:         "I can't find something",
  suggestion:        'Suggestion or improvement',
  other:             'Other',
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // ── 2. Parse + validate body ──────────────────────────────────────────────
    const body = await req.json() as { category?: string; description?: string; page_url?: string }
    const { category, description, page_url } = body

    if (!category || !VALID_CATEGORIES.includes(category as Category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }
    if (!description?.trim() || description.trim().length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters.' }, { status: 400 })
    }
    if (description.trim().length > 1000) {
      return NextResponse.json({ error: 'Description must be 1000 characters or fewer.' }, { status: 400 })
    }

    // ── 3. Fetch profile name + family account ────────────────────────────────
    const { data: profileRow } = await supabaseAdmin
      .from('zawaaj_profiles')
      .select('first_name, last_name, family_account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const profileName = profileRow
      ? [profileRow.first_name, profileRow.last_name].filter(Boolean).join(' ') || null
      : null

    let familyAccountId: string | null = null
    let familyContactName: string | null = null

    if (profileRow?.family_account_id) {
      familyAccountId = profileRow.family_account_id as string
      const { data: fa } = await supabaseAdmin
        .from('zawaaj_family_accounts')
        .select('contact_full_name')
        .eq('id', familyAccountId)
        .maybeSingle()
      familyContactName = fa?.contact_full_name ?? null
    }

    // ── 4. Insert report ──────────────────────────────────────────────────────
    const { error: insertErr } = await supabaseAdmin
      .from('zawaaj_bug_reports')
      .insert({
        user_id:           user.id,
        family_account_id: familyAccountId,
        profile_name:      profileName,
        user_email:        user.email ?? null,
        category:          category as Category,
        description:       description.trim(),
        page_url:          page_url ?? null,
        status:            'new',
      })

    if (insertErr) {
      console.error('[report-issue] insert error:', insertErr.message)
      return NextResponse.json({ error: 'Failed to save report.' }, { status: 500 })
    }

    // ── 5. Email admin alert (non-blocking — failure doesn't affect response) ─
    const submittedAt = new Date().toISOString()
    const categoryLabel = CATEGORY_LABELS[category as Category]

    void sendEmail({
      to:      ADMIN_EMAIL,
      subject: `New issue report — ${categoryLabel} from ${profileName ?? user.email ?? 'member'}`,
      html:    reportIssueAdminAlert({
        profileName,
        userEmail:         user.email ?? null,
        familyContactName,
        category,
        description:       description.trim(),
        pageUrl:           page_url ?? null,
        submittedAt,
      }),
    }).then(result => {
      if (!result.ok) console.warn('[report-issue] admin email failed:', result.error)
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[report-issue]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
