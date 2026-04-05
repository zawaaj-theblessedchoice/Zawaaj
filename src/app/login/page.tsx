'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

    router.push('/directory')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8F6F1] px-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <span
            className="text-4xl font-bold tracking-widest"
            style={{ color: '#B8960C' }}
          >
            زواج
          </span>
          <p className="text-sm tracking-[0.3em] uppercase mt-1 text-[#1A1A1A]/60">
            Zawaaj
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl shadow-xl px-8 py-10"
          style={{ backgroundColor: '#1A1A1A' }}
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
                className="w-full rounded-lg px-4 py-3 bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#B8960C] transition-colors text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/70 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-4 py-3 bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#B8960C] transition-colors text-sm"
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
              className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#B8960C', color: '#1A1A1A' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#B8960C' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
