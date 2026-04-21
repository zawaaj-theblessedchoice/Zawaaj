// Server-only — never import this in client components or pages marked 'use client'.
// Used exclusively in API route handlers that need to bypass RLS.
//
// Falls back to placeholder strings when env vars are absent (Next.js build-time
// static analysis / "Collecting page data"). No real requests are made during
// the build, so the placeholder client is never actually called.
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY   ?? 'placeholder-service-role-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
)
