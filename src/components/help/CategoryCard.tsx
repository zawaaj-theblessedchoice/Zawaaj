'use client'

import { useRouter } from 'next/navigation'
import type { HelpCategory } from '@/lib/helpContent'

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 13.5c0-3 2.5-5.5 5.5-5.5S13 10.5 13 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3.5" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <rect x="3" y="6.5" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6.5V4.5a2.5 2.5 0 0 1 5 0V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 13c0-2.2 1.8-4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 13c0-2.2-1.8-4-4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.5 9.5c-1.7 0-3 1.3-3 3M7.5 9.5c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4L2.6 5.1l3.4-.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.2 2.8l-1.06 1.06M3.86 11.14L2.8 12.2M12.2 12.2l-1.06-1.06M3.86 3.86L2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function CategoryIcon({ icon }: { icon: HelpCategory['icon'] }) {
  switch (icon) {
    case 'clock': return <ClockIcon />
    case 'person': return <PersonIcon />
    case 'envelope': return <EnvelopeIcon />
    case 'lock': return <LockIcon />
    case 'people': return <PeopleIcon />
    case 'search': return <SearchIcon />
    case 'star': return <StarIcon />
    case 'gear': return <GearIcon />
  }
}

interface CategoryCardProps {
  category: HelpCategory
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(`/help/${category.id}`)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        el.style.borderColor = 'var(--border-default)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = 'none'
        el.style.borderColor = 'var(--border-default)'
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--gold-muted)',
          border: '1px solid var(--border-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold)',
          flexShrink: 0,
        }}
      >
        <CategoryIcon icon={category.icon} />
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {category.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {category.description}
      </div>

      {/* Article count pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          background: 'var(--surface-3)',
          borderRadius: 20,
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 500,
          alignSelf: 'flex-start',
        }}
      >
        {category.articleCount} articles
      </div>
    </button>
  )
}
