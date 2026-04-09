import type { HelpArticle } from './helpContent'

export interface SearchResult {
  slug: string
  category: string
  title: string
  deck: string
}

export function searchHelp(query: string, articles: HelpArticle[]): SearchResult[] {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 2) return []
  return articles
    .filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.deck.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(q) ? 1 : 0
      const bTitle = b.title.toLowerCase().includes(q) ? 1 : 0
      return bTitle - aTitle
    })
    .slice(0, 8)
    .map(a => ({ slug: a.slug, category: a.category, title: a.title, deck: a.deck }))
}
