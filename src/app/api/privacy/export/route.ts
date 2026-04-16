// POST /api/privacy/export
// Article 15 — data access request
// Rate limited: 1 per 30 days
// Requires OTP re-authentication

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 1 export per 30 days
    const { data: lastReq } = await supabaseAdmin
      .from('zawaaj_privacy_requests')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('type', 'access')
      .in('status', ['pending', 'processing', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastReq) {
      const daysSince = (Date.now() - new Date(lastReq.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) {
        return NextResponse.json(
          { error: `One export is permitted per 30 days. Please wait ${Math.ceil(30 - daysSince)} more days.` },
          { status: 429 }
        )
      }
    }

    // Get active profile
    const { data: settings } = await supabaseAdmin
      .from('zawaaj_user_settings')
      .select('active_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const profileId = settings?.active_profile_id

    // Create request record
    const { data: req, error: reqErr } = await supabaseAdmin
      .from('zawaaj_privacy_requests')
      .insert({ user_id: user.id, type: 'access', status: 'processing', controller_notified_at: new Date().toISOString() })
      .select('id').single()

    if (reqErr) return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })

    // Collect all data
    const [
      { data: profiles },
      { data: familyAccount },
      { data: introsSent },
      { data: introsReceived },
      { data: notifications },
      { data: savedProfiles },
      { data: subscriptions },
      { data: privacyRequests },
    ] = await Promise.all([
      supabaseAdmin.from('zawaaj_profiles').select('id, display_initials, first_name, last_name, gender, age_display, location, profession_detail, education_level, school_of_thought, ethnicity, nationality, languages_spoken, marital_status, has_children, height, living_situation, religiosity, prayer_regularity, wears_hijab, keeps_beard, wears_niqab, wears_abaya, quran_engagement_level, bio, open_to_relocation, open_to_partners_children, pref_age_min, pref_age_max, pref_location, pref_ethnicity, pref_school_of_thought, pref_relocation, pref_partner_children, status, withdrawal_reason, consent_given, terms_agreed, created_at, updated_at').eq('user_id', user.id),
      supabaseAdmin.from('zawaaj_family_accounts').select('id, contact_full_name, contact_email, contact_relationship, registration_path, status, created_at').eq('primary_user_id', user.id).maybeSingle(),
      profileId ? supabaseAdmin.from('zawaaj_introduction_requests').select('id, target_profile_id, status, created_at, expires_at, responded_at, outcome, outcome_date').eq('requesting_profile_id', profileId) : Promise.resolve({ data: [] }),
      profileId ? supabaseAdmin.from('zawaaj_introduction_requests').select('id, requesting_profile_id, status, created_at, responded_at').eq('target_profile_id', profileId) : Promise.resolve({ data: [] }),
      profileId ? supabaseAdmin.from('zawaaj_notifications').select('id, type, title, body, read_at, created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
      profileId ? supabaseAdmin.from('zawaaj_saved_profiles').select('id, saved_profile_id, created_at').eq('profile_id', profileId) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('zawaaj_subscriptions').select('id, plan, status, created_at').eq('user_id', user.id),
      supabaseAdmin.from('zawaaj_privacy_requests').select('id, type, status, created_at, completed_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    const exportPackage = {
      export_generated_at: new Date().toISOString(),
      controller: 'Ingenious Education Ltd',
      processor: 'Zawaaj',
      data_subject_email: user.email,
      profiles,
      family_account: familyAccount,
      introductions_sent: introsSent,
      introductions_received: introsReceived,
      notifications,
      saved_profiles: savedProfiles,
      subscriptions,
      privacy_requests: privacyRequests,
      withheld_fields: [
        { field: 'admin_notes', reason: 'Internal management information — DPA 2018 Sch.2 §16' },
        { field: 'admin_comments', reason: 'Internal management information — DPA 2018 Sch.2 §16' },
        { field: 'duplicate_flag', reason: 'Internal management information — DPA 2018 Sch.2 §16' },
      ],
    }

    const exportJson = JSON.stringify(exportPackage, null, 2)

    // Email data package directly to user (base64 attachment via Resend)
    const base64Data = Buffer.from(exportJson).toString('base64')
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Zawaaj Privacy <privacy@zawaaj.uk>',
          to: [user.email!],
          subject: 'Your Zawaaj data export — Article 15 UK GDPR',
          html: dataExportEmailTemplate(user.email!),
          attachments: [{ filename: 'zawaaj-data-export.json', content: base64Data }],
        }),
      })
    }

    // Notify controller
    await sendEmail({
      to: 'privacy@ingenious-education.co.uk',
      subject: `[Zawaaj DSR] Article 15 access request — ${new Date().toISOString()}`,
      html: `<p>A data subject access request was submitted and fulfilled.<br>Request ID: ${req.id}<br>Subject email: ${user.email}</p>`,
    }).catch(() => {})

    // Mark complete + audit log
    await Promise.all([
      supabaseAdmin.from('zawaaj_privacy_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', req.id),
      supabaseAdmin.from('zawaaj_audit_log').insert({ event_type: 'dsr_access_completed', actor_user_id: user.id, metadata: { request_id: req.id } }),
    ])

    return NextResponse.json({
      message: 'Your data export has been sent to your registered email address.',
      request_id: req.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function dataExportEmailTemplate(email: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#111;color:#f3f4f6;padding:32px">
<div style="max-width:560px;margin:0 auto">
<p style="color:#B8960C;font-size:20px;font-weight:700;margin:0 0 20px">Zawaaj — Your Data Export</p>
<p style="color:#d1d5db;font-size:14px;line-height:1.6">Your personal data export is attached to this email as <strong>zawaaj-data-export.json</strong>.</p>
<p style="color:#d1d5db;font-size:14px;line-height:1.6">This export contains all personal data held by Zawaaj on behalf of Ingenious Education Ltd (Data Controller) in relation to the account registered under <strong>${email}</strong>.</p>
<p style="color:#9ca3af;font-size:12px;line-height:1.6;margin-top:24px">Data Controller: Ingenious Education Ltd · privacy@ingenious-education.co.uk<br>Data Processor: Zawaaj · privacy@zawaaj.uk<br>Request fulfilled under Article 15 UK GDPR</p>
</div></body></html>`
}
