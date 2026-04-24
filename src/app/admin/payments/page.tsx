import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminPaymentsClient from './AdminPaymentsClient'

export const dynamic = 'force-dynamic'

export interface PaymentRequestRow {
  id:               string
  plan:             string
  billing_cycle:    string
  amount_gbp:       number
  method:           string
  status:           'pending' | 'approved' | 'rejected' | 'cancelled'
  reference:        string | null
  submitted_at:     string
  reviewed_at:      string | null
  rejection_reason: string | null
  profile: {
    id:               string
    display_initials: string
    first_name:       string | null
    last_name:        string | null
    gender:           string | null
  } | null
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) redirect('/')

  const { data: rows, error } = await supabaseAdmin
    .from('zawaaj_payment_requests')
    .select(`
      id, plan, billing_cycle, amount_gbp, method, status,
      reference, submitted_at, reviewed_at, rejection_reason,
      profile:zawaaj_profiles!profile_id (
        id, display_initials, first_name, last_name, gender
      )
    `)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[admin/payments] fetch error:', error)
  }

  const requests: PaymentRequestRow[] = (rows ?? []).map(r => ({
    id:               r.id,
    plan:             r.plan,
    billing_cycle:    r.billing_cycle,
    amount_gbp:       r.amount_gbp,
    method:           r.method,
    status:           r.status as PaymentRequestRow['status'],
    reference:        r.reference,
    submitted_at:     r.submitted_at,
    reviewed_at:      r.reviewed_at,
    rejection_reason: r.rejection_reason,
    profile:          Array.isArray(r.profile) ? r.profile[0] ?? null : (r.profile ?? null),
  }))

  return <AdminPaymentsClient requests={requests} />
}
