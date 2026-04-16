// GET /api/privacy/erase/cancel?request_id=xxx&token=yyy
// Cancels a pending erasure request within the 7-day cooling-off period

import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function generateCancellationToken(requestId: string): string {
  const secret = process.env.INTERNAL_API_KEY ?? 'fallback-secret'
  return crypto.createHmac('sha256', secret).update(requestId).digest('hex').slice(0, 32)
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('request_id')
  const token = searchParams.get('token')

  if (!requestId || !token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/privacy/rights?cancel=invalid`)
  }

  // Verify HMAC token
  const expected = generateCancellationToken(requestId)
  if (token !== expected) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/privacy/rights?cancel=invalid`)
  }

  // Fetch the request
  const { data: req, error } = await supabaseAdmin
    .from('zawaaj_privacy_requests')
    .select('id, status, scheduled_execute_at, user_id')
    .eq('id', requestId)
    .single()

  if (error || !req) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/privacy/rights?cancel=notfound`)
  }

  if (req.status !== 'pending') {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/privacy/rights?cancel=too_late`)
  }

  if (req.scheduled_execute_at && new Date(req.scheduled_execute_at) <= new Date()) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/privacy/rights?cancel=too_late`)
  }

  // Cancel the request and restore profile
  await Promise.all([
    supabaseAdmin
      .from('zawaaj_privacy_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId),
    supabaseAdmin
      .from('zawaaj_profiles')
      .update({ status: 'paused', withdrawal_reason: null })
      .eq('user_id', req.user_id),
    supabaseAdmin.from('zawaaj_audit_log').insert({
      event_type: 'dsr_erasure_cancelled',
      actor_user_id: req.user_id,
      metadata: { request_id: requestId },
    }),
  ])

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/privacy/rights?cancel=success`)
}
