'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  action_url: string | null
  read_at: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef  = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json() as { notifications: Notification[]; unreadCount: number }
      setNotifications(json.notifications)
      setUnreadCount(json.unreadCount)
    } catch {
      // Silent — the bell should never break the page
    }
  }, [])

  // Initial fetch + 60s poll
  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (bellRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function markAllRead() {
    if (unreadCount === 0) return
    setLoading(true)
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  async function handleClick(n: Notification) {
    // Mark this one read first (optimistic)
    if (!n.read_at) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      setUnreadCount(c => Math.max(0, c - 1))
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
    setOpen(false)
    if (n.action_url) router.push(n.action_url)
  }

  function toggleOpen() {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect()
      // Prefer aligning under the bell; keep 340px panel on-screen.
      const panelWidth = 340
      const left = Math.min(rect.left, window.innerWidth - panelWidth - 12)
      setPanelPos({ top: rect.bottom + 8, left: Math.max(12, left) })
    }
    setOpen(v => !v)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={bellRef}
        onClick={toggleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 8,
          background: open ? 'var(--surface-3)' : 'transparent',
          border: 'none',
          color: unreadCount > 0 ? 'var(--gold)' : 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = unreadCount > 0 ? 'var(--gold)' : 'var(--text-secondary)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 13,
              height: 13,
              padding: '0 3px',
              borderRadius: 7,
              background: 'var(--gold)',
              color: 'var(--surface)',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && panelPos && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: panelPos.top,
            left: panelPos.left,
            width: 340,
            maxHeight: 440,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: 'var(--gold)', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map(n => {
                const unread = !n.read_at
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 14px',
                      borderBottom: '0.5px solid var(--border-default)',
                      background: unread ? 'rgba(184,150,12,0.05)' : 'transparent',
                      border: 'none',
                      borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0,
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = unread ? 'rgba(184,150,12,0.05)' : 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {unread && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--gold)', marginTop: 6, flexShrink: 0,
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12.5,
                          fontWeight: unread ? 600 : 500,
                          color: 'var(--text-primary)',
                          lineHeight: 1.35,
                          marginBottom: 2,
                        }}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div style={{
                            fontSize: 11.5,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            marginBottom: 4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {n.body}
                          </div>
                        )}
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                          {relativeTime(n.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
