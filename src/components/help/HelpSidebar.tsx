import Link from 'next/link'
import { CATEGORIES } from '@/lib/helpContent'
import type { HelpCategory } from '@/lib/helpContent'

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 13.5c0-3 2.5-5.5 5.5-5.5S13 10.5 13 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3.5" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="3" y="6.5" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6.5V4.5a2.5 2.5 0 0 1 5 0V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 13c0-2.2 1.8-4 4-4M14 13c0-2.2-1.8-4-4-4M7.5 9.5c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.5 9.5c-1.7 0-3 1.3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4L2.6 5.1l3.4-.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
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

interface HelpSidebarProps {
  activeCategoryId?: string
}

export default function HelpSidebar({ activeCategoryId }: HelpSidebarProps) {
  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        minHeight: 'calc(100vh - 52px)',
        background: '#F8F6F1',
        borderRight: '1px solid #E8E4DC',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 52,
        alignSelf: 'flex-start',
        height: 'calc(100vh - 52px)',
        overflowY: 'auto',
      }}
    >
      {/* Heading */}
      <div
        style={{
          padding: '20px 20px 12px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: '#9B9A94',
          borderBottom: '1px solid #E8E4DC',
        }}
      >
        All topics
      </div>

      {/* Nav list */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategoryId === cat.id
          return (
            <Link
              key={cat.id}
              href={`/help/${cat.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 16px',
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid #B8960C' : '2px solid transparent',
                background: isActive ? 'rgba(184,150,12,0.06)' : 'transparent',
                color: isActive ? '#B8960C' : '#3D3C37',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                transition: 'color 0.12s, background 0.12s',
              }}
            >
              <span style={{ color: isActive ? '#B8960C' : '#9B9A94', display: 'flex', flexShrink: 0 }}>
                <CategoryIcon icon={cat.icon} />
              </span>
              <span>{cat.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Need help card */}
      <div
        style={{
          margin: '12px 14px 20px',
          padding: '14px',
          background: '#FBF6E9',
          border: '1px solid rgba(184,150,12,0.25)',
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1A14', marginBottom: 4 }}>
          Need more help?
        </div>
        <div style={{ fontSize: 12, color: '#6B6A65', marginBottom: 10, lineHeight: 1.5 }}>
          Our team is happy to assist with anything not covered here.
        </div>
        <a
          href="mailto:hello@zawaaj.uk"
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 500,
            color: '#B8960C',
            textDecoration: 'none',
          }}
        >
          Contact us →
        </a>
      </div>
    </aside>
  )
}
