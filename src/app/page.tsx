import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from './LandingPage'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/browse')
  }

  return <LandingPage />
}
