'use client'

import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'

export default function RegisterLandingPage() {
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
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <ZawaajLogo height={220} />

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 10px',
            }}
          >
            Who is creating this account?
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Zawaaj is a family-first platform. Tell us who will be managing this account.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          {/* Path A — Parent */}
          <Link href="/register/parent" style={{ textDecoration: 'none' }}>
            <div
              style={{
                padding: '20px 22px',
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '0.5px solid var(--border-default)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--border-gold)'
                el.style.background = 'var(--surface-3)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--border-default)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--gold-muted)',
                  border: '0.5px solid var(--border-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                  }}
                >
                  I am a parent or guardian
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  I am setting up a family account on behalf of my child or children. I will manage introductions on their behalf.
                </div>
              </div>
            </div>
          </Link>

          {/* Path B — Child */}
          <Link href="/register/child" style={{ textDecoration: 'none' }}>
            <div
              style={{
                padding: '20px 22px',
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '0.5px solid var(--border-default)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--border-gold)'
                el.style.background = 'var(--surface-3)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--border-default)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--surface-3)',
                  border: '0.5px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                  }}
                >
                  I am registering for myself
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  I am creating my own profile. I will provide my mother's or guardian's contact details — she will be the point of contact for introductions.
                </div>
              </div>
            </div>
          </Link>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{ color: 'var(--gold)', textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
