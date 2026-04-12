import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin' && role !== 'manager') redirect('/')

  return (
    <AdminShell role={role as 'super_admin' | 'manager'}>
      {children}
    </AdminShell>
  )
}
