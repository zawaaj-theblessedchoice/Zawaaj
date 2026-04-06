import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Lightweight email-existence check used by the signup wizard (step 0).
// Calls the zawaaj_email_exists() SECURITY DEFINER RPC so that auth.users
// is readable without exposing the table through PostgREST.
// Returns { exists: boolean } — never returns the actual user record.
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { email?: string }
    const email = body.email?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ exists: false })
    }

    const { data, error } = await supabaseAdmin.rpc('zawaaj_email_exists', { p_email: email })

    if (error) {
      // If the function doesn't exist yet (migration not applied), fail open
      // so the duplicate is caught at submission with a clear error message.
      console.error('zawaaj_email_exists RPC error:', error.message)
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: data === true })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
