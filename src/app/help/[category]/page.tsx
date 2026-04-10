import { notFound } from 'next/navigation'
import HelpNav from '@/components/help/HelpNav'
import HelpSidebar from '@/components/help/HelpSidebar'
import ArticleRow from '@/components/help/ArticleRow'
import { CATEGORIES, getArticlesByCategory } from '@/lib/helpContent'
import type { HelpCategory } from '@/lib/helpContent'
import Link from 'next/link'

function ClockIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PersonIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 13.5c0-3 2.5-5.5 5.5-5.5S13 10.5 13 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function EnvelopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3.5" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <rect x="3" y="6.5" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6.5V4.5a2.5 2.5 0 0 1 5 0V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

function PeopleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 13c0-2.2 1.8-4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 13c0-2.2-1.8-4-4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.5 9.5c-1.7 0-3 1.3-3 3M7.5 9.5c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4L2.6 5.1l3.4-.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.2 2.8l-1.06 1.06M3.86 11.14L2.8 12.2M12.2 12.2l-1.06-1.06M3.86 3.86L2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LargeCategoryIcon({ icon, size }: { icon: HelpCategory['icon']; size: number }) {
  switch (icon) {
    case 'clock': return <ClockIcon size={size} />
    case 'person': return <PersonIcon size={size} />
    case 'envelope': return <EnvelopeIcon size={size} />
    case 'lock': return <LockIcon size={size} />
    case 'people': return <PeopleIcon size={size} />
    case 'search': return <SearchIcon size={size} />
    case 'star': return <StarIcon size={size} />
    case 'gear': return <GearIcon size={size} />
  }
}

export async function generateStaticParams() {
  return CATEGORIES.map(c => ({ category: c.id }))
}

interface Props {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { category: categoryId } = await params

  const category = CATEGORIES.find(c => c.id === categoryId)
  if (!category) notFound()

  const articles = getArticlesByCategory(categoryId)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', fontFamily: 'var(--font-geist-sans, Inter, sans-serif)' }}>
      <HelpNav />
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <HelpSidebar activeCategoryId={categoryId} />

        <main style={{ flex: 1, minWidth: 0, padding: '40px 48px 80px' }}>
          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
            <Link
              href="/help"
              style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.12s' }}
            >
              All topics
            </Link>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{category.title}</span>
          </nav>

          {/* Category header */}
          <div style={{ marginBottom: 40 }}>
            {/* Icon tile */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--gold-muted)',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
                marginBottom: 16,
              }}
            >
              <LargeCategoryIcon icon={category.icon} size={24} />
            </div>

            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                margin: '0 0 10px',
                letterSpacing: '-0.02em',
              }}
            >
              {category.title}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
              {category.description}
            </p>
          </div>

          {/* Articles */}
          <div style={{ maxWidth: 600 }}>
            {articles.map(article => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
