'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  display_initials: string
  gender: string | null
  age_display: string | null
  location: string | null
  school_of_thought: string | null
  profession_sector: string | null
  education_level: string | null
  ethnicity: string | null
  status: string
}

function InitialsAvatar({ initials, gender }: { initials: string; gender: string | null }) {
  const isFemale = gender === 'female'
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold shadow-md flex-shrink-0"
      style={{
        backgroundColor: isFemale ? '#8B5CF6' : '#2563EB',
        color: '#ffffff',
        letterSpacing: '0.05em',
      }}
    >
      {initials}
    </div>
  )
}

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}
    >
      <div className="flex items-center gap-4">
        <InitialsAvatar initials={profile.display_initials} gender={profile.gender} />
        <div className="min-w-0">
          <p className="font-semibold text-[#1A1A1A] text-lg leading-tight">
            {profile.display_initials}
          </p>
          {profile.age_display && (
            <p className="text-sm text-[#1A1A1A]/60 mt-0.5">
              {profile.age_display} years old
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {profile.location && (
          <Chip icon="📍" label={profile.location} />
        )}
        {profile.school_of_thought && (
          <Chip icon="🕌" label={profile.school_of_thought} />
        )}
        {profile.profession_sector && (
          <Chip icon="💼" label={profile.profession_sector} />
        )}
        {profile.education_level && (
          <Chip icon="🎓" label={profile.education_level} />
        )}
        {profile.ethnicity && (
          <Chip icon="🌍" label={profile.ethnicity} />
        )}
      </div>
    </div>
  )
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 truncate"
      style={{ backgroundColor: '#F8F6F1', color: '#1A1A1A', border: '1px solid #E8E4DC' }}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}

type GenderFilter = 'all' | 'male' | 'female'

export default function DirectoryPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('zawaaj_profiles')
      .select('id,display_initials,gender,age_display,location,school_of_thought,profession_sector,education_level,ethnicity,status')
      .eq('status', 'approved')
      .then(({ data }) => {
        setProfiles((data as Profile[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = profiles.filter((p) => {
    if (genderFilter !== 'all' && p.gender !== genderFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.display_initials.toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q) ||
        (p.school_of_thought ?? '').toLowerCase().includes(q) ||
        (p.profession_sector ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      {/* Header */}
      <header
        className="sticky top-0 z-10 shadow-sm"
        style={{ backgroundColor: '#1A1A1A' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-widest" style={{ color: '#B8960C' }}>
            زواج Zawaaj
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/directory" className="text-white font-medium">
              Directory
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#B8960C', color: '#1A1A1A' }}
            >
              My account
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Member Directory</h1>
          <p className="text-[#1A1A1A]/60 mt-1">
            Browse approved profiles — contact us to express an interest.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="search"
            placeholder="Search by location, profession…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:border-[#B8960C] transition-colors"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4DC', color: '#1A1A1A' }}
          />
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E8E4DC' }}>
            {(['all', 'male', 'female'] as GenderFilter[]).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className="px-4 py-2.5 text-sm font-medium capitalize transition-colors"
                style={{
                  backgroundColor: genderFilter === g ? '#1A1A1A' : '#FFFFFF',
                  color: genderFilter === g ? '#B8960C' : '#1A1A1A',
                }}
              >
                {g === 'all' ? 'All' : g === 'male' ? 'Brothers' : 'Sisters'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-[#1A1A1A]/40">
            Loading profiles…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-[#1A1A1A]/40">
            No profiles found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-center text-[#1A1A1A]/40 text-sm mt-8">
            {filtered.length} profile{filtered.length !== 1 ? 's' : ''} shown
          </p>
        )}
      </main>
    </div>
  )
}
