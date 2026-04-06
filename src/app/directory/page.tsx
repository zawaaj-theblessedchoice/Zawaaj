'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import AvatarInitials from '@/components/AvatarInitials'

interface Profile {
  id: string
  display_initials: string
  gender: string | null
  age_display: string | null
  location: string | null
  school_of_thought: string | null
  profession_sector: string | null
  profession_detail: string | null
  education_level: string | null
  ethnicity: string | null
  height: string | null
  status: string
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

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link href={`/profile/${profile.id}`}>
      <div
        className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}
      >
        <div className="flex items-center gap-4">
          <AvatarInitials initials={profile.display_initials} gender={profile.gender} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-[#1A1A1A] text-lg leading-tight">
              {profile.display_initials}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {profile.age_display && (
                <span className="text-sm text-[#1A1A1A]/60">{profile.age_display} yrs</span>
              )}
              {profile.gender && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: profile.gender === 'female' ? '#EEEDFE' : '#E6F1FB',
                    color: profile.gender === 'female' ? '#534AB7' : '#185FA5',
                  }}
                >
                  {profile.gender === 'female' ? 'Sister' : 'Brother'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {profile.location && <Chip icon="📍" label={profile.location} />}
          {profile.school_of_thought && <Chip icon="🕌" label={profile.school_of_thought} />}
          {profile.profession_sector && <Chip icon="💼" label={profile.profession_sector} />}
          {profile.education_level && <Chip icon="🎓" label={profile.education_level} />}
          {profile.ethnicity && <Chip icon="🌍" label={profile.ethnicity} />}
          {profile.height && <Chip icon="📏" label={profile.height} />}
        </div>
      </div>
    </Link>
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
      .select('id,display_initials,gender,age_display,location,school_of_thought,profession_sector,profession_detail,education_level,ethnicity,height,status')
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
        (p.profession_sector ?? '').toLowerCase().includes(q) ||
        (p.ethnicity ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pt-24">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Member Directory</h1>
          <p className="text-[#1A1A1A]/60 mt-1 text-sm">
            Visible only to approved members · Not publicly searchable
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="search"
            placeholder="Search by location, profession, ethnicity…"
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
                className="px-4 py-2.5 text-sm font-medium transition-colors"
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
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-[#1A1A1A]/40 text-lg">No profiles found</p>
            <p className="text-[#1A1A1A]/30 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-center text-[#1A1A1A]/30 text-sm mt-8">
            {filtered.length} profile{filtered.length !== 1 ? 's' : ''} shown
          </p>
        )}
      </main>
    </div>
  )
}
