import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Sidebar from '@/components/Sidebar'
import { BankTransferClient } from './BankTransferClient'

export const dynamic = 'force-dynamic'

export default async function BankTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileId = settings?.active_profile_id
  if (!profileId) redirect('/pending')

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('id, display_initials, first_name, gender, status, is_admin')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile) redirect('/pending')
  if (profile.is_admin) redirect('/admin')
  if (profile.status === 'pending') redirect('/pending')

  // Always premium — Plus is no longer offered
  const initialPlan: 'premium' = 'premium'
  void searchParams // suppress unused warning

  // Check for any existing pending request for this profile
  const { data: existingRequest } = await supabaseAdmin
    .from('zawaaj_payment_requests')
    .select('id, reference, plan, amount_gbp, status')
    .eq('profile_id', profileId)
    .eq('status', 'pending')
    .maybeSingle()

  // Sidebar counts
  const [{ count: shortlistCount }, { count: introCount }] = await Promise.all([
    supabase
      .from('zawaaj_saved_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId),
    supabase
      .from('zawaaj_introduction_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requesting_profile_id', profileId)
      .eq('status', 'pending'),
  ])

  // Bank details from env vars (server-only)
  const bankName      = process.env.BANK_ACCOUNT_NAME   ?? ''
  const sortCode      = process.env.BANK_SORT_CODE       ?? ''
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER  ?? ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute="/upgrade"
        profile={profile}
        shortlistCount={shortlistCount ?? 0}
        introRequestsCount={introCount ?? 0}
      />
      <main style={{ flex: 1, marginLeft: 240 }}>
        <BankTransferClient
          initialPlan={initialPlan}
          bankName={bankName}
          sortCode={sortCode}
          accountNumber={accountNumber}
          existingRequest={
            existingRequest
              ? {
                  id:        existingRequest.id,
                  reference: existingRequest.reference ?? '',
                  plan:      'premium' as const,
                  amount:    existingRequest.amount_gbp,
                }
              : null
          }
        />
      </main>
    </div>
  )
}
