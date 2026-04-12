'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function PendingContent() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path') // 'parent' | 'child' | null
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isParent = path === 'parent'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-default)',
        borderTop: '1px solid rgba(196,154,16,0.25)',
        borderRadius: 12,
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      }}
    >
      <ZawaajLogo size={64} tagline={false} />

      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--gold-muted)',
          border: '0.5px solid var(--border-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="1.5" />
          <path d="M8 12l3 3 5-5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
          }}
        >
          {isParent ? 'Family account submitted' : 'Profile submitted'}
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {isParent
            ? 'JazakAllahu khairan. Your family account has been submitted for review. Our team will be in touch insha\u2019Allah. Once approved you can add profiles for your children and begin the search.'
            : 'JazakAllahu khairan. Your profile has been submitted for review. Our team will be in touch insha\u2019Allah. Your profile will only be visible to other families once approved.'}
        </p>
      </div>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 14px',
          borderRadius: 999,
          background: 'var(--gold-muted)',
          border: '0.5px solid var(--border-gold)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--gold)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--gold)',
            display: 'inline-block',
          }}
        />
        Pending approval
      </span>

      <div style={{ width: '100%', height: '0.5px', background: 'var(--border-default)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Link
          href="/login"
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            padding: '8px 20px',
            borderRadius: 8,
            border: '0.5px solid var(--border-default)',
            background: 'var(--surface-3)',
          }}
        >
          Sign in to your account
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function RegisterPendingPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <Suspense fallback={<div style={{ color: 'var(--text-muted)' }} />}>
        <PendingContent />
      </Suspense>
    </main>
  )
}
