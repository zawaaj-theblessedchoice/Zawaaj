import { createClient } from '@/lib/supabase/server'
import LandingPage, { type HomepageEvent } from './LandingPage'

export default async function RootPage() {
  const supabase = await createClient()
  const [
    { data: { user } },
    { data: featuredEvents },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('zawaaj_events')
      .select('id, title, event_date, location_text, is_online, event_category, organiser, organiser_label, price_gbp')
      .eq('is_featured', true)
      .eq('status', 'upcoming')
      .gt('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(4),
  ])

  // Always show the landing page — logged-in users see a "Browse profiles" CTA
  // instead of being silently redirected away from zawaaj.uk
  return (
    <LandingPage
      isLoggedIn={!!user}
      featuredEvents={(featuredEvents ?? []) as HomepageEvent[]}
    />
  )
}
