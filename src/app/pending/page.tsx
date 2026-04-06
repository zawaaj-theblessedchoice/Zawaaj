'use client'

import { useRouter } from 'next/navigation'
import ZawaajLogo from '@/components/ZawaajLogo'
import { createClient } from '@/lib/supabase/client'

export default function PendingPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-[#F8F6F1] flex items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md rounded-2xl shadow-lg px-8 py-10 flex flex-col items-center gap-6"
        style={{ backgroundColor: '#1A1A1A' }}
      >
        {/* Logo */}
        <ZawaajLogo size={72} tagline={true} />

        {/* Visual */}
        <div className="text-6xl select-none" aria-hidden="true">
          ⏳
        </div>

        {/* Heading */}
        <h1
          className="text-2xl font-semibold text-center"
          style={{ color: '#F8F6F1' }}
        >
          Application submitted
        </h1>

        {/* Body copy */}
        <p
          className="text-sm text-center leading-relaxed"
          style={{ color: '#C8C5BC' }}
        >
          JazakAllahu Khayran. Your profile is currently under review by our
          admin team. You will hear back within 1&ndash;3 business days
          insha&apos;Allah.
        </p>

        {/* Status badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase"
          style={{ backgroundColor: '#422006', color: '#FBB730' }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: '#FBB730' }}
            aria-hidden="true"
          />
          Pending approval
        </span>

        {/* Divider */}
        <hr className="w-full border-t" style={{ borderColor: '#2E2E2E' }} />

        {/* Sign-out link */}
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm transition-opacity hover:opacity-70 focus:outline-none focus-visible:underline"
          style={{ color: '#B8960C' }}
        >
          Sign out and return to login
        </button>
      </div>
    </main>
  )
}
