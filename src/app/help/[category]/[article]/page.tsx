import { notFound } from 'next/navigation'
import Link from 'next/link'
import HelpNav from '@/components/help/HelpNav'
import HelpSidebar from '@/components/help/HelpSidebar'
import ArticleRow from '@/components/help/ArticleRow'
import ArticleFeedback from '@/components/help/ArticleFeedback'
import { CATEGORIES, getAllArticles, getArticle } from '@/lib/helpContent'
import type { HelpBlock, HelpArticle } from '@/lib/helpContent'

export async function generateStaticParams() {
  return getAllArticles().map(a => ({ category: a.category, article: a.slug }))
}

function categoryTitle(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.title ?? id
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function renderBlock(block: HelpBlock, index: number) {
  switch (block.type) {
    case 'p':
      return (
        <p
          key={index}
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: '#4A4945',
            margin: '0 0 16px',
          }}
        >
          {block.text}
        </p>
      )

    case 'h2':
      return (
        <h2
          key={index}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 19,
            fontWeight: 600,
            color: '#1C1A14',
            margin: '32px 0 12px',
            letterSpacing: '-0.01em',
          }}
        >
          {block.text}
        </h2>
      )

    case 'h3':
      return (
        <h3
          key={index}
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1C1A14',
            margin: '24px 0 10px',
          }}
        >
          {block.text}
        </h3>
      )

    case 'callout':
      return (
        <div
          key={index}
          style={{
            background: '#FBF6E9',
            border: '1px solid #E2CC88',
            borderRadius: 10,
            padding: '14px 18px',
            margin: '20px 0',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#B8960C',
              marginBottom: 6,
            }}
          >
            {block.title}
          </div>
          <div
            style={{
              fontSize: 13.5,
              lineHeight: 1.65,
              color: '#5A5750',
            }}
          >
            {block.body}
          </div>
        </div>
      )

    case 'step':
      return (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: 14,
            margin: '16px 0',
            alignItems: 'flex-start',
          }}
        >
          {/* Number circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#B8960C',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {block.number}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#1C1A14',
                marginBottom: 4,
              }}
            >
              {block.title}
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.7,
                color: '#4A4945',
              }}
            >
              {block.body}
            </div>
          </div>
        </div>
      )

    case 'ul':
      return (
        <ul
          key={index}
          style={{
            margin: '12px 0 16px',
            paddingLeft: 24,
            listStyle: 'disc',
          }}
        >
          {block.items.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: '#4A4945',
                marginBottom: 4,
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )

    case 'ol':
      return (
        <ol
          key={index}
          style={{
            margin: '12px 0 16px',
            paddingLeft: 24,
            listStyle: 'decimal',
          }}
        >
          {block.items.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: '#4A4945',
                marginBottom: 4,
              }}
            >
              {item}
            </li>
          ))}
        </ol>
      )
  }
}

function getRelatedArticles(article: HelpArticle): HelpArticle[] {
  const all = getAllArticles()
  return article.related
    .map(slug => all.find(a => a.slug === slug))
    .filter((a): a is HelpArticle => a !== undefined)
}

interface Props {
  params: Promise<{ category: string; article: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { category: categoryId, article: slug } = await params

  const article = getArticle(categoryId, slug)
  if (!article) notFound()

  const relatedArticles = getRelatedArticles(article)

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F1', fontFamily: 'var(--font-geist-sans, Inter, sans-serif)' }}>
      <HelpNav />
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <HelpSidebar activeCategoryId={categoryId} />

        <main style={{ flex: 1, minWidth: 0, padding: '40px 48px 80px', maxWidth: 780 }}>
          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
            <Link
              href="/help"
              style={{ fontSize: 13, color: '#9B9A94', textDecoration: 'none' }}
            >
              All topics
            </Link>
            <span style={{ color: '#C5BFB3', fontSize: 13 }}>/</span>
            <Link
              href={`/help/${categoryId}`}
              style={{ fontSize: 13, color: '#9B9A94', textDecoration: 'none' }}
            >
              {categoryTitle(categoryId)}
            </Link>
            <span style={{ color: '#C5BFB3', fontSize: 13 }}>/</span>
            <span style={{ fontSize: 13, color: '#1C1A14', fontWeight: 500 }}>
              {truncate(article.title, 30)}
            </span>
          </nav>

          {/* Article header */}
          <div style={{ marginBottom: 28 }}>
            {/* Category pill */}
            <div
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                background: '#FBF6E9',
                border: '1px solid rgba(184,150,12,0.3)',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 600,
                color: '#B8960C',
                marginBottom: 14,
                letterSpacing: '0.02em',
              }}
            >
              {categoryTitle(categoryId)}
            </div>

            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: '#1C1A14',
                lineHeight: 1.2,
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              {article.title}
            </h1>

            <p
              style={{
                fontSize: 15,
                color: '#6B6A65',
                lineHeight: 1.65,
                margin: '0 0 6px',
              }}
            >
              {article.deck}
            </p>

            <div style={{ fontSize: 12, color: '#9B9A94' }}>
              {article.readTime} min read
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#E8E4DC', marginBottom: 28 }} />

          {/* Article body */}
          <div style={{ maxWidth: 640 }}>
            {article.blocks.map((block, i) => renderBlock(block, i))}
          </div>

          {/* Feedback */}
          <div style={{ maxWidth: 640 }}>
            <ArticleFeedback articleSlug={article.slug} />
          </div>

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <div style={{ marginTop: 48, maxWidth: 640 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1C1A14',
                  marginBottom: 4,
                  letterSpacing: '-0.01em',
                }}
              >
                Related articles
              </h2>
              <p style={{ fontSize: 13, color: '#9B9A94', marginBottom: 12 }}>
                You might also find these helpful.
              </p>
              {relatedArticles.map(related => (
                <ArticleRow key={related.slug} article={related} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
