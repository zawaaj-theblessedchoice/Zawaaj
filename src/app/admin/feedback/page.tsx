'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'new' | 'reviewed' | 'resolved'

interface BugReport {
  id:               string
  created_at:       string
  profile_name:     string | null
  user_email:       string | null
  category:         string
  description:      string
  page_url:         string | null
  status:           ReportStatus
  admin_notes:      string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  not_working:       "Isn't working",
  wrong_information: 'Wrong info',
  cant_find:         "Can't find",
  suggestion:        'Suggestion',
  other:             'Other',
}

const STATUS_STYLE: Record<ReportStatus, { bg: string; color: string }> = {
  new:      { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  reviewed: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  resolved: { bg: 'rgba(74,222,128,0.1)',  color: '#4ade80' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusPill({ status }: { status: ReportStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      background: s.bg,
      color: s.color,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const supabase = createClient()

  const [reports, setReports]       = useState<BugReport[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [statusFilter, setFilter]   = useState<'all' | ReportStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving]         = useState<string | null>(null) // report id being saved
  // Local edit state per expanded row
  const [editNotes, setEditNotes]   = useState<Record<string, string>>({})
  const [editStatus, setEditStatus] = useState<Record<string, ReportStatus>>({})

  useEffect(() => { void loadReports() }, [])

  async function loadReports() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('zawaaj_bug_reports')
      .select('id, created_at, profile_name, user_email, category, description, page_url, status, admin_notes')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setReports((data ?? []) as BugReport[])
    }
    setLoading(false)
  }

  function handleExpand(id: string, report: BugReport) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    // Seed local edit state from current values
    setEditNotes(prev => ({ ...prev, [id]: report.admin_notes ?? '' }))
    setEditStatus(prev => ({ ...prev, [id]: report.status }))
  }

  async function handleSave(id: string) {
    setSaving(id)
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:      editStatus[id],
          admin_notes: editNotes[id] ?? '',
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      // Update local list
      setReports(prev => prev.map(r =>
        r.id === id
          ? { ...r, status: editStatus[id] ?? r.status, admin_notes: editNotes[id] ?? r.admin_notes }
          : r
      ))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(null)
    }
  }

  const filtered = statusFilter === 'all'
    ? reports
    : reports.filter(r => r.status === statusFilter)

  const newCount = reports.filter(r => r.status === 'new').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--admin-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <Link href="/admin" style={{ color: 'var(--admin-muted)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7 9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Admin
        </Link>
        <span style={{ color: 'var(--admin-muted)', opacity: 0.4 }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--admin-text)' }}>Feedback</span>
        {newCount > 0 && (
          <span style={{
            marginLeft: 4,
            padding: '2px 8px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: 'rgba(251,191,36,0.12)',
            color: '#fbbf24',
          }}>
            {newCount} new
          </span>
        )}

        {/* Status filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['all', 'new', 'reviewed', 'resolved'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: '0.5px solid',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: statusFilter === s ? 600 : 400,
                background: statusFilter === s ? 'rgba(184,150,12,0.12)' : 'transparent',
                borderColor: statusFilter === s ? 'rgba(184,150,12,0.4)' : 'var(--admin-border)',
                color: statusFilter === s ? '#B8960C' : 'var(--admin-muted)',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => { void loadReports() }}
          style={{ fontSize: 12, color: 'var(--admin-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>
        {loading && <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>Loading…</p>}
        {error && <p style={{ color: 'var(--status-error)', fontSize: 13 }}>{error}</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>
            {statusFilter === 'all' ? 'No reports yet.' : `No ${statusFilter} reports.`}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Date', 'Name', 'Email', 'Category', 'Description', 'Page', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'var(--admin-muted)',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => handleExpand(r.id, r)}
                      style={{
                        borderBottom: expandedId === r.id ? 'none' : '1px solid var(--admin-border)',
                        cursor: 'pointer',
                        background: expandedId === r.id
                          ? 'rgba(184,150,12,0.05)'
                          : r.status === 'new'
                            ? 'rgba(251,191,36,0.03)'
                            : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--admin-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.created_at)}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--admin-text)', fontWeight: 500 }}>
                        {r.profile_name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--admin-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.user_email ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--admin-text)', whiteSpace: 'nowrap' }}>
                        {CATEGORY_LABELS[r.category] ?? r.category}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--admin-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.description}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.page_url
                          ? <a href={r.page_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#B8960C', textDecoration: 'none', fontSize: 11 }}>
                              {r.page_url.replace(/^https?:\/\/[^/]+/, '')}
                            </a>
                          : <span style={{ color: 'var(--admin-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <StatusPill status={r.status} />
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedId === r.id && (
                      <tr key={`${r.id}-expanded`} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td colSpan={7} style={{ padding: '0 14px 16px 14px', background: 'rgba(184,150,12,0.04)' }}>
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {/* Full description */}
                            <div style={{ flex: '1 1 280px' }}>
                              <p style={{ margin: '12px 0 6px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
                                Full description
                              </p>
                              <div style={{
                                background: 'var(--admin-bg)',
                                border: '1px solid var(--admin-border)',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: 13,
                                color: 'var(--admin-text)',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                              }}>
                                {r.description}
                              </div>
                              {r.page_url && (
                                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
                                  Page: <a href={r.page_url} target="_blank" rel="noreferrer" style={{ color: '#B8960C' }}>{r.page_url}</a>
                                </p>
                              )}
                            </div>

                            {/* Admin actions */}
                            <div style={{ flex: '1 1 240px' }}>
                              <p style={{ margin: '12px 0 6px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
                                Admin notes
                              </p>
                              <textarea
                                value={editNotes[r.id] ?? ''}
                                onChange={e => setEditNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                                placeholder="Add internal notes…"
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 8,
                                  border: '1px solid var(--admin-border)',
                                  background: 'var(--admin-bg)',
                                  color: 'var(--admin-text)',
                                  fontSize: 12.5,
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                  boxSizing: 'border-box' as const,
                                  lineHeight: 1.5,
                                }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <select
                                  value={editStatus[r.id] ?? r.status}
                                  onChange={e => setEditStatus(prev => ({ ...prev, [r.id]: e.target.value as ReportStatus }))}
                                  style={{
                                    flex: 1,
                                    padding: '6px 10px',
                                    borderRadius: 7,
                                    border: '1px solid var(--admin-border)',
                                    background: 'var(--admin-bg)',
                                    color: 'var(--admin-text)',
                                    fontSize: 12.5,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <option value="new">New</option>
                                  <option value="reviewed">Reviewed</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                                <button
                                  onClick={() => { void handleSave(r.id) }}
                                  disabled={saving === r.id}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 7,
                                    border: 'none',
                                    background: '#B8960C',
                                    color: '#111',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    cursor: saving === r.id ? 'not-allowed' : 'pointer',
                                    opacity: saving === r.id ? 0.6 : 1,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {saving === r.id ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
