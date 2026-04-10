import Link from 'next/link'
import { CATEGORIES } from '@/lib/helpContent'
import type { HelpArticle } from '@/lib/helpContent'

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="1.5" width="9" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4.5 2.5L7.5 6 4.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface ArticleRowProps {
  article: HelpArticle
}

function categoryTitle(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.title ?? id
}

export default function ArticleRow({ article }: ArticleRowProps) {
  return (
    <Link
      href={`/help/${article.category}/${article.slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        textDecoration: 'none',
        borderBottom: '1px solid var(--surface-3)',
        transition: 'background 0.1s',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--surface-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        <DocIcon />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {article.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {categoryTitle(article.category)} · {article.readTime} min read
        </div>
      </div>

      {/* Chevron */}
      <span style={{ color: 'var(--text-muted)' }}>
        <ChevronRight />
      </span>
    </Link>
  )
}
