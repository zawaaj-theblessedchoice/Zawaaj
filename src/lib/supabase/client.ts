import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      auth: {
        // PKCE is more secure than the implicit flow for all browser-initiated
        // auth actions (sign-in, magic link, OAuth). Code exchange requires the
        // code_verifier cookie set in the initiating browser, so intercepted
        // codes are useless to third parties.
        flowType: 'pkce',
      },
    }
  )
}
