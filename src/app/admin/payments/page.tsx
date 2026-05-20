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

export interface GCSubscriptionRow {
  id:                          string
  family_account_id:           string
  plan:                        string
  status:                      string
  billing_cycle:               string | null
  payment_provider:            string
  gocardless_subscription_id:  string | null
  renewal_at:                  string | null
  cancel_at_period_end:        boolean
  payment_failure_count:       number
  created_at:                  string
  family_name:                 string | null
  family_email:                string | null
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('zawaaj_is_admin')
  if (!isAdmin) redirect('/')

  const [{ data: rows, error }, { data: gcRows }] = await Promise.all([
    supabaseAdmin
      .from('zawaaj_payment_requests')
      .select(`
        id, plan, billing_cycle, amount_gbp, method, status,
        reference, submitted_at, reviewed_at, rejection_reason,
        profile:zawaaj_profiles!profile_id (
          id, display_initials, first_name, last_name, gender
        )
      `)
      .order('submitted_at', { ascending: false }),

    supabaseAdmin
      .from('zawaaj_subscriptions')
      .select('id, family_account_id, plan, status, billing_cycle, payment_provider, gocardless_subscription_id, renewal_at, cancel_at_period_end, payment_failure_count, created_at')
      .eq('payment_provider', 'gocardless')
      .order('created_at', { ascending: false }),
  ])

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

  // Enrich GC rows with family contact details
  let gcSubscriptions: GCSubscriptionRow[] = []
  if (gcRows && gcRows.length > 0) {
    const familyIds = [...new Set(gcRows.map(r => r.family_account_id as string))]
    const { data: families } = await supabaseAdmin
      .from('zawaaj_family_accounts')
      .select('id, contact_full_name, contact_email')
      .in('id', familyIds)

    const famMap = new Map((families ?? []).map((f: { id: string; contact_full_name: string | null; contact_email: string | null }) => [f.id, f]))

    gcSubscriptions = gcRows.map(r => {
      const fam = famMap.get(r.family_account_id as string)
      return {
        id:                         r.id,
        family_account_id:          r.family_account_id as string,
        plan:                       r.plan as string,
        status:                     r.status as string,
        billing_cycle:              r.billing_cycle as string | null,
        payment_provider:           r.payment_provider as string,
        gocardless_subscription_id: r.gocardless_subscription_id as string | null,
        renewal_at:                 r.renewal_at as string | null,
        cancel_at_period_end:       Boolean(r.cancel_at_period_end),
        payment_failure_count:      Number(r.payment_failure_count ?? 0),
        created_at:                 r.created_at as string,
        family_name:                (fam as { contact_full_name: string | null } | undefined)?.contact_full_name ?? null,
        family_email:               (fam as { contact_email: string | null } | undefined)?.contact_email ?? null,
      }
    })
  }

  return <AdminPaymentsClient requests={requests} gcSubscriptions={gcSubscriptions} />
}
