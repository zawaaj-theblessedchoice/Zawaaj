import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/auth/signout
// Signs the current user out and redirects to the homepage.
// Accessible even when proxy would otherwise redirect away from /login,
// so a user stuck in a redirect loop can always escape via this URL.
export async function GET(): Promise<Response> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.zawaaj.uk'))
}
