'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { FamilyRow } from './page'

const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: 'Mother',
  grandmother: 'Grandmother',
  aunt: 'Aunt',
  female_guardian: 'Female Guardian',
  father: 'Father',
  male_guardian: 'Male Guardian',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_approval:        { bg: 'rgba(234,179,8,0.15)',   text: '#ca8a04' },
  active:                  { bg: 'rgba(34,197,94,0.15)',   text: '#16a34a' },
  suspended:               { bg: 'rgba(239,68,68,0.15)',   text: '#dc2626' },
  pending_contact_details: { bg: 'rgba(99,102,241,0.15)',  text: '#6366f1' },
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  voluntary: { bg: 'rgba(255,255,255,0.05)', text: 'var(--admin-muted)' },
  plus:      { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  premium:   { bg: 'rgba(184,150,12,0.15)',  text: '#B8960C' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.08)', text: 'var(--admin-muted)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_COLORS[plan] ?? PLAN_COLORS.voluntary
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {plan}
    </span>
  )
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  families: FamilyRow[]
}

export function FamiliesClient({ families: initial }: Props) {
  const [families, setFamilies] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = families.filter(f => {
    const matchStatus = statusFilter === 'all' || f.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      f.contact_full_name.toLowerCase().includes(q) ||
      f.contact_email.toLowerCase().includes(q) ||
      f.contact_number.includes(q) ||
      f.profiles.some(p => [p.first_name, p.last_name].filter(Boolean).join(' ').toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  async function updateStatus(id: string, status: string) {
    setActionLoading(id)
    const res = await fetch('/api/admin/families', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setActionLoading(null)
    if (res.ok) {
      setFamilies(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    }
  }

  const counts = {
    all: families.length,
    pending_approval: families.filter(f => f.status === 'pending_approval').length,
    active: families.filter(f => f.status === 'active').length,
    suspended: families.filter(f => f.status === 'suspended').length,
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
          Family Accounts
        </h1>
        <p style={{ fontSize: 13, color: 'var(--admin-muted)', marginTop: 4 }}>
          {families.length} registered family accounts
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          style={{
            flex: '1 1 200px', minWidth: 200, maxWidth: 320,
            height: 34, padding: '0 12px', borderRadius: 8, fontSize: 13,
            background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'pending_approval', 'active', 'suspended'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: statusFilter === s ? '#B8960C' : 'var(--admin-surface)',
                color: statusFilter === s ? '#111' : 'var(--admin-muted)',
              }}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')} ({counts[s] ?? filtered.length})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-muted)', fontSize: 14 }}>
            No family accounts found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Contact', 'Relationship', 'Email / Phone', 'Plan', 'Status', 'Members', 'Created', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: 'var(--admin-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <>
                  <tr
                    key={f.id}
                    style={{
                      borderBottom: expandedId === f.id ? 'none' : (i < filtered.length - 1 ? '1px solid var(--admin-border)' : 'none'),
                      background: expandedId === f.id ? 'rgba(184,150,12,0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>
                      {f.contact_full_name}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--admin-muted)' }}>
                      {RELATIONSHIP_LABELS[f.contact_relationship] ?? f.contact_relationship}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, color: 'var(--admin-text)' }}>{f.contact_email}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 1 }}>{f.contact_number}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <PlanBadge plan={f.plan} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={f.status} />
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--admin-muted)' }}>
                      {f.profiles.length}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--admin-muted)' }}>
                      {fmtDate(f.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          border: '1px solid var(--admin-border)', cursor: 'pointer',
                          background: 'transparent', color: 'var(--admin-muted)',
                        }}
                      >
                        {expandedId === f.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {expandedId === f.id && (
                    <tr key={`${f.id}-expand`} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                      <td colSpan={8} style={{ padding: '0 14px 16px' }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                          border: '1px solid var(--admin-border)', padding: 16,
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                        }}>
                          {/* Left: Contact details */}
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                              Contact Details
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <Detail label="Primary contact" value={`${f.contact_full_name} (${RELATIONSHIP_LABELS[f.contact_relationship] ?? f.contact_relationship})`} />
                              <Detail label="Email" value={f.contact_email} />
                              <Detail label="Phone" value={f.contact_number} />
                              {f.female_contact_name && (
                                <Detail label="Female contact" value={`${f.female_contact_name} — ${f.female_contact_number}`} />
                              )}
                              {f.no_female_contact_flag && (
                                <Detail label="No female contact" value={f.father_explanation || '(no explanation given)'} warning />
                              )}
                              <Detail label="Registration path" value={f.registration_path} />
                              <Detail label="Terms agreed" value={f.terms_agreed ? `Yes — ${fmtDate(f.terms_agreed_at)}` : 'No'} />
                            </div>
                          </div>

                          {/* Right: Profiles */}
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                              Linked Profiles ({f.profiles.length})
                            </p>
                            {f.profiles.length === 0 ? (
                              <p style={{ fontSize: 13, color: 'var(--admin-muted)' }}>No profiles linked yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {f.profiles.map(p => (
                                  <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 10px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--admin-border)',
                                  }}>
                                    <span style={{
                                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 11, fontWeight: 700,
                                      background: p.gender === 'female' ? '#EEEDFE' : '#E6F1FB',
                                      color: p.gender === 'female' ? '#534AB7' : '#185FA5',
                                    }}>
                                      {p.display_initials}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <Link
                                        href={`/admin/profile/${p.id}`}
                                        style={{ fontSize: 13, color: '#B8960C', textDecoration: 'none', fontWeight: 500 }}
                                      >
                                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_initials}
                                      </Link>
                                      {p.duplicate_flag && (
                                        <span style={{
                                          marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99,
                                          background: 'rgba(239,68,68,0.15)', color: '#dc2626', fontWeight: 600,
                                        }}>
                                          SIBLING FLAG
                                        </span>
                                      )}
                                    </div>
                                    <StatusBadge status={p.status ?? 'unknown'} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          {f.status === 'pending_approval' && (
                            <ActionBtn
                              label="Approve"
                              color="#16a34a"
                              bg="rgba(34,197,94,0.12)"
                              loading={actionLoading === f.id}
                              onClick={() => updateStatus(f.id, 'active')}
                            />
                          )}
                          {f.status === 'active' && (
                            <ActionBtn
                              label="Suspend"
                              color="#dc2626"
                              bg="rgba(239,68,68,0.12)"
                              loading={actionLoading === f.id}
                              onClick={() => updateStatus(f.id, 'suspended')}
                            />
                          )}
                          {f.status === 'suspended' && (
                            <ActionBtn
                              label="Reinstate"
                              color="#16a34a"
                              bg="rgba(34,197,94,0.12)"
                              loading={actionLoading === f.id}
                              onClick={() => updateStatus(f.id, 'active')}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: 'var(--admin-muted)', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: warning ? '#dc2626' : 'var(--admin-text)' }}>{value}</span>
    </div>
  )
}

function ActionBtn({
  label, color, bg, loading, onClick,
}: {
  label: string; color: string; bg: string; loading: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        background: bg, color, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Saving…' : label}
    </button>
  )
}
