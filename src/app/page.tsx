import { createClient } from '@/lib/supabase/server'
import LandingPage from './LandingPage'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Always show the landing page — logged-in users see a "Browse profiles" CTA
  // instead of being silently redirected away from zawaaj.uk
  return <LandingPage isLoggedIn={!!user} />
}
