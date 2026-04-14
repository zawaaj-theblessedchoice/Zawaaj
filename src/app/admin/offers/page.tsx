import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { OffersClient } from './OffersClient'

export const dynamic = 'force-dynamic'

export interface PromoCodeRow {
  id: string
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed_gbp'
  discount_value: number
  applicable_plans: string[]
  max_uses: number | null
  uses_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/admin')

  const { data: codes } = await supabaseAdmin
    .from('zawaaj_promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  return <OffersClient codes={(codes as PromoCodeRow[]) ?? []} />
}
