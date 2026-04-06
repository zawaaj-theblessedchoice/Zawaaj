import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * /auth/callback
 *
 * Handles two Supabase redirect flows:
 *  1. OAuth / PKCE — carries `?code=` → exchangeCodeForSession
 *  2. Email OTP (password reset, email confirm) — carries `?token_hash=&type=` → verifyOtp
 *
 * Both flows set the session cookies then forward to `next` (default /browse).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/browse'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Flow 1: OAuth / PKCE magic-link (?code=)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Flow 2: Email OTP — password reset & email confirmation (?token_hash=&type=)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      // For password-reset, send the user to the page where they set a new password
      const destination = type === 'recovery' ? '/auth/reset-password' : next
      return NextResponse.redirect(new URL(destination, origin))
    }
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
