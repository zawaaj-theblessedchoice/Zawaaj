import HelpNav from '@/components/help/HelpNav'
import HelpSidebar from '@/components/help/HelpSidebar'
import HelpSearch from '@/components/help/HelpSearch'
import CategoryCard from '@/components/help/CategoryCard'
import ArticleRow from '@/components/help/ArticleRow'
import { CATEGORIES, getArticle } from '@/lib/helpContent'

const MOST_READ = [
  { category: 'introductions', slug: 'how-introductions-work' },
  { category: 'getting-started', slug: 'what-is-zawaaj' },
  { category: 'your-profile', slug: 'creating-a-good-profile' },
  { category: 'privacy', slug: 'what-others-can-see' },
  { category: 'families', slug: 'guide-for-parents' },
]

const QUICK_LINKS = [
  { label: 'How introductions work', href: '/help/introductions/how-introductions-work' },
  { label: 'Creating your profile', href: '/help/your-profile/creating-a-good-profile' },
  { label: 'Privacy & safety', href: '/help/privacy/what-others-can-see' },
]

export default function HelpPage() {
  const mostReadArticles = MOST_READ
    .map(({ category, slug }) => getArticle(category, slug))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', fontFamily: 'var(--font-geist-sans, Inter, sans-serif)' }}>
      <HelpNav />

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <HelpSidebar />

        <main style={{ flex: 1, minWidth: 0, padding: '48px 48px 80px' }}>
          {/* Hero */}
          <div style={{ maxWidth: 640, marginBottom: 56 }}>
            {/* Eyebrow */}
            <div
              style={{
                display: 'inline-block',
                padding: '3px 12px',
                background: 'var(--gold-muted)',
                border: '1px solid var(--border-gold)',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--gold)',
                marginBottom: 16,
                letterSpacing: '0.02em',
              }}
            >
              Help &amp; guidance
            </div>

            <h1
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.15,
                margin: '0 0 14px',
                letterSpacing: '-0.02em',
              }}
            >
              How can we help you?
            </h1>

            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 28px' }}>
              Find answers, understand the process, and get the support you need — at every step of your journey with Zawaaj.
            </p>

            {/* Search */}
            <HelpSearch />

            {/* Quick links */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 16,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Popular:</span>
              {QUICK_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: 12.5,
                    color: 'var(--gold)',
                    textDecoration: 'none',
                    padding: '3px 10px',
                    background: 'var(--gold-muted)',
                    borderRadius: 20,
                    border: '1px solid var(--border-gold)',
                    transition: 'background 0.12s',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Category grid */}
          <section style={{ marginBottom: 56 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 20,
                letterSpacing: '-0.01em',
              }}
            >
              Browse by topic
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              {CATEGORIES.map(cat => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </section>

          {/* Most read */}
          <section style={{ maxWidth: 600 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 4,
                letterSpacing: '-0.01em',
              }}
            >
              Most read articles
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              The articles members find most useful.
            </p>
            <div>
              {mostReadArticles.map(article => (
                <ArticleRow key={article.slug} article={article} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
