'use client'

/**
 * AuthHashCatcher
 *
 * Supabase implicit-flow recovery links redirect to the Site URL with
 * #access_token=...&type=recovery appended when the target page isn't in the
 * Redirect URL allowlist. This component catches that hash on ANY page —
 * including the homepage — and forwards the user to /auth/reset-password
 * before the browser paints, preventing a flash of the wrong page.
 *
 * Placed in the root layout so it is always active.
 *
 * Permanent fix: add https://zawaaj.uk/auth/reset-password to
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 * Once added, Supabase will redirect there directly and this component
 * will never find a matching hash on the homepage.
 */

import { useLayoutEffect } from 'react'

export default function AuthHashCatcher() {
  useLayoutEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1)) // slice off leading '#'
    const accessToken = params.get('access_token')
    const type        = params.get('type')

    if (accessToken && type === 'recovery') {
      // window.location.replace preserves the full hash fragment.
      // Next.js router.push/replace strips hash fragments.
      window.location.replace('/auth/reset-password' + hash)
    }
  }, [])

  return null
}
