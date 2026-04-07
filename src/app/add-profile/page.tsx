'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

interface ManagedProfile {
  id: string
  display_initials: string
  first_name: string | null
  gender: string | null
  status: string
}

export default function AddProfilePage() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [sidebarProfile, setSidebarProfile] = useState<{ display_initials: string; gender: string | null; first_name: string | null } | null>(null)
  const [managedProfiles, setManagedProfiles] = useState<ManagedProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [introCount, setIntroCount] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)
  const [profileCount, setProfileCount] = useState(0)

  const [form, setForm] = useState({ firstName: '', lastName: '', gender: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: settings } = await supabase
        .from('zawaaj_user_settings')
        .select('active_profile_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: profileRows } = await supabase
        .from('zawaaj_profiles')
        .select('id, display_initials, first_name, gender, status')
        .eq('user_id', user.id)

      if (!profileRows?.length) { router.replace('/pending'); return }

      const activeId = settings?.active_profile_id ?? profileRows[0].id
      const active = profileRows.find(p => p.id === activeId) ?? profileRows[0]
      setSidebarProfile({ display_initials: active.display_initials, gender: active.gender, first_name: active.first_name })
      setActiveProfileId(activeId)
      setManagedProfiles(profileRows.map(p => ({ id: p.id, display_initials: p.display_initials, first_name: p.first_name, gender: p.gender, status: p.status })))
      setProfileCount(profileRows.length)

      const [slRes, irRes] = await Promise.all([
        supabase.from('zawaaj_saved_profiles').select('id', { count: 'exact', head: true }).eq('profile_id', active.id),
        supabase.from('zawaaj_introduction_requests').select('id', { count: 'exact', head: true }).eq('requesting_profile_id', active.id).in('status', ['pending', 'mutual']),
      ])
      setShortlistCount(slRes.count ?? 0)
      setIntroCount(irRes.count ?? 0)
      setAuthChecked(true)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.gender) { setError('First name and gender are required.'); return }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/add-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json() as { error?: string; success?: boolean }
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return }
    setSuccess(true)
    setTimeout(() => router.push('/browse'), 2500)
  }

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <Sidebar activeRoute="/add-profile" shortlistCount={0} introRequestsCount={0} profile={null} />
        <main style={{ marginLeft: 200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      <Sidebar
        activeRoute={pathname ?? '/add-profile'}
        shortlistCount={shortlistCount}
        introRequestsCount={introCount}
        profile={sidebarProfile}
        managedProfiles={managedProfiles}
        activeProfileId={activeProfileId}
      />
      <main style={{ marginLeft: 200, flex: 1, padding: '40px 28px 80px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 28 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Add family member
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 32px' }}>
            Add a profile for a family member. It will be reviewed by our admin team before becoming visible.
          </p>

          {profileCount >= 4 ? (
            <div style={{ padding: '20px 24px', borderRadius: 13, background: 'var(--surface-2)', border: '0.5px solid var(--border-default)' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Maximum reached</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>You can manage up to 4 profiles per account. Please contact admin if you need assistance.</p>
            </div>
          ) : success ? (
            <div style={{ padding: '24px', borderRadius: 13, background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>&#x2713;</div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#4ADE80', marginBottom: 6 }}>Profile submitted</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecting you back to browse…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border-default)', borderRadius: 13, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                    First name *
                  </label>
                  <input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="e.g. Amina"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="e.g. Ahmed"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--border-default)', background: 'var(--surface-3)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Gender *
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['female', 'male'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, gender: g }))}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: 9,
                          border: `0.5px solid ${form.gender === g ? 'var(--border-gold)' : 'var(--border-default)'}`,
                          background: form.gender === g ? 'var(--gold-muted)' : 'var(--surface-3)',
                          color: form.gender === g ? 'var(--gold)' : 'var(--text-secondary)',
                          fontSize: 13,
                          fontWeight: form.gender === g ? 500 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', fontSize: 13, color: '#F87171' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: '#111', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Submitting…' : 'Submit for review'}
              </button>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                The admin team will review and approve the profile. You can manage up to 4 profiles per account.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
