'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { searchHelp } from '@/lib/helpSearch'
import { getAllArticles } from '@/lib/helpContent'
import type { SearchResult } from '@/lib/helpSearch'
import { CATEGORIES } from '@/lib/helpContent'

function categoryTitle(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.title ?? id
}

export default function HelpSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const articles = getAllArticles()

  useEffect(() => {
    if (query.length >= 2) {
      const r = searchHelp(query, articles)
      setResults(r)
      setOpen(r.length > 0)
    } else {
      setResults([])
      setOpen(false)
    }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  function handleSelect(result: SearchResult) {
    setOpen(false)
    setQuery('')
    router.push(`/help/${result.category}/${result.slug}`)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', maxWidth: 520, width: '100%', margin: '0 auto' }}>
      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#FFFFFF',
          border: `1.5px solid ${focused ? '#B8960C' : '#E0DCD3'}`,
          borderRadius: 12,
          padding: '11px 16px',
          boxShadow: focused ? '0 0 0 3px rgba(184,150,12,0.1)' : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {/* Magnifier */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="#9B9A94" strokeWidth="1.4" />
          <path d="M11 11l3.5 3.5" stroke="#9B9A94" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search help articles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: '#1C1A14',
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: '#9B9A94',
              fontSize: 16,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            background: '#FFFFFF',
            border: '1px solid #E0DCD3',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {results.map((result, i) => (
            <button
              key={result.slug}
              onClick={() => handleSelect(result)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                padding: '11px 16px',
                background: 'none',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid #F0EDE6' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8F6F1' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1A14' }}>{result.title}</div>
              <div style={{ fontSize: 11.5, color: '#9B9A94' }}>{categoryTitle(result.category)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
