// Next.js 16: proxy.ts (replaces deprecated middleware.ts)
// Responsibilities:
//  1. Refresh the Supabase session on every request
//  2. Redirect unauthenticated users away from protected routes
//  3. Redirect authenticated users away from auth routes (login/signup)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Require authentication AND an approved profile
const PROTECTED_PATHS = ['/directory', '/browse', '/profile', '/my-profile', '/introductions', '/add-profile']
// Require authentication AND admin role (checked server-side in page/layout)
const ADMIN_PATHS     = ['/admin']
// Pages that redirect already-authenticated users away
const AUTH_PATHS      = ['/login', '/signup', '/register']
// Requires auth but not approval — allowed through once logged in
const PENDING_PATHS   = ['/pending']
// Fully public — no auth needed (checked before AUTH_PATHS so /register/link-guardian passes through)
// /register/child is also public because logged-in guardians need it to add a candidate after email verification
const PUBLIC_PATHS    = ['/terms', '/help', '/forgot-password', '/auth/reset-password', '/register/link-guardian', '/register/child', '/register/verify', '/api/auth/signout']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() to keep the session alive
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected  = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAdmin      = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage   = AUTH_PATHS.some((p) => pathname.startsWith(p))
  const isPending    = PENDING_PATHS.some((p) => pathname.startsWith(p))
  const isPublic     = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Fully public paths pass through unconditionally
  if (isPublic) {
    return supabaseResponse
  }

  // Unauthenticated user trying to reach a protected or pending page → login
  if (!user && (isProtected || isAdmin || isPending)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated user hitting login/signup → send to browse (admin redirect handled by browse page)
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/browse'
    return NextResponse.redirect(url)
  }

  // Authenticated user hitting /pending → check admin role server-side (handled in pending/page.tsx)
  // No special proxy logic needed — the server component handles the redirect

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
