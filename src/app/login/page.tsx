'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ZawaajLogo from '@/components/ZawaajLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/browse')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <ZawaajLogo size={180} tagline={true} />
        </div>

        {/* Card */}
        <div
          className="rounded-xl px-8 py-10"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderRadius: 12,
            border: '0.5px solid rgba(255,255,255,0.07)',
            borderTop: '1px solid rgba(196,154,16,0.2)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          <h1 className="text-2xl font-semibold text-white mb-1">
            Welcome back
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/70 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[var(--gold)] transition-colors text-sm"
                style={{ background: 'var(--surface-3)', borderRadius: 10 }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/70"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: 'var(--gold)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[var(--gold)] transition-colors text-sm"
                style={{ background: 'var(--surface-3)', borderRadius: 10 }}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm rounded-lg bg-red-400/10 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                color: 'var(--surface-2)',
                borderRadius: 10,
                border: 'none',
                boxShadow: '0 2px 8px rgba(196,154,16,0.25)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: 'var(--gold)' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
