// Next.js 16: proxy.ts (replaces deprecated middleware.ts)
// Responsibilities:
//  1. Refresh the Supabase session on every request
//  2. Redirect unauthenticated users away from protected routes
//  3. Redirect authenticated users away from auth routes (login/signup)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/directory', '/profile']
const ADMIN_PATHS     = ['/admin']
const AUTH_PATHS      = ['/login', '/signup']

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

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAdmin     = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage  = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Unauthenticated user trying to reach a protected page → login
  if (!user && (isProtected || isAdmin)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated user hitting login/signup → send to directory
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/directory'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
