import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OperationsConsole } from '@/components/admin/OperationsConsole'

export default async function OperationsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin' && role !== 'manager') redirect('/browse')
  return <OperationsConsole />
}
