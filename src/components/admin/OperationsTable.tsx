'use client'

import { ProfileRow, isContactComplete } from '@/lib/admin/operationsQueries'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface OperationsTableProps {
  profiles: ProfileRow[]
  loading: boolean
  selectedIds: Set<string>
  openProfileId: string | null
  sinceTimestamp: number
  onSelect: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onOpenProfile: (id: string | null) => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClearFilters: () => void
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:    { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' },
    approved:   { bg: 'var(--status-success-bg)', color: 'var(--status-success)' },
    rejected:   { bg: 'var(--status-error-bg)',   color: 'var(--status-error)' },
    withdrawn:  { bg: 'var(--admin-border)',       color: 'var(--admin-muted)' },
    suspended:  { bg: 'var(--status-error-bg)',   color: 'var(--status-error)' },
    introduced: { bg: 'var(--status-info-bg)',    color: 'var(--status-info)' },
    paused:     { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' },
  }
  const s = map[status] ?? { bg: 'var(--admin-border)', color: 'var(--admin-muted)' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  )
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────

interface RowMenuProps {
  profileId: string
  onDelete: (id: string) => Promise<void>
}

function RowMenu({ profileId, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const outsideMenu = menuRef.current && !menuRef.current.contains(target)
      const outsideBtn  = btnRef.current  && !btnRef.current.contains(target)
      if (outsideMenu && outsideBtn) {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on scroll so it doesn't drift
  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); setConfirming(false) }
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(o => !o)
    setConfirming(false)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete(profileId)
    } finally {
      setDeleting(false)
      setOpen(false)
      setConfirming(false)
    }
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: menuPos.top,
    right: menuPos.right,
    background: 'var(--admin-surface)',
    border: '1px solid var(--admin-border)',
    borderRadius: 8,
    minWidth: 168,
    zIndex: 9999,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="More actions"
        style={{
          padding: '5px 10px',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 700,
          background: open ? 'rgba(184,150,12,0.1)' : 'transparent',
          border: `1px solid ${open ? 'rgba(184,150,12,0.4)' : 'var(--admin-border)'}`,
          color: open ? 'var(--gold)' : 'var(--admin-text)',
          cursor: 'pointer',
          lineHeight: 1,
          letterSpacing: 2,
        }}
      >
        ···
      </button>

      {open && (
        <div ref={menuRef} style={dropdownStyle}>
          <Link
            href={`/admin/profile/${profileId}`}
            style={{
              display: 'block',
              padding: '9px 14px',
              fontSize: 13,
              color: 'var(--admin-text)',
              textDecoration: 'none',
            }}
          >
            Edit profile
          </Link>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '9px 14px',
                fontSize: 13,
                color: 'var(--status-error)',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderTop: '1px solid var(--admin-border)',
                cursor: 'pointer',
              }}
            >
              🗑 Delete profile &amp; account
            </button>
          ) : (
            <div style={{ borderTop: '1px solid var(--admin-border)', padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: 'var(--admin-muted)', margin: '0 0 8px' }}>
                Delete profile + auth user?
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--status-error-bg)',
                    border: '1px solid var(--status-error)',
                    color: 'var(--status-error)',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? '…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 6,
                    fontSize: 12,
                    background: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── OperationsTable ──────────────────────────────────────────────────────────

export function OperationsTable({
  profiles,
  loading,
  selectedIds,
  openProfileId,
  sinceTimestamp,
  onSelect,
  onSelectAll,
  onOpenProfile,
  onApprove,
  onReject,
  onDelete,
  onClearFilters,
}: OperationsTableProps) {
  const allSelected = profiles.length > 0 && profiles.every(p => selectedIds.has(p.id))

  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }`}</style>
      <div
        style={{
          width: '100%',
          borderRadius: 10,
          border: '1px solid var(--admin-border)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}>
              {/* Checkbox */}
              <th style={{ padding: '10px 12px', width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => onSelectAll(e.target.checked)}
                />
              </th>
              {[
                { label: 'Member',   width: 200 },
                { label: 'Gender',   width: 70 },
                { label: 'Age',      width: 70 },
                { label: 'Location', width: 120 },
                { label: 'Status',   width: 110 },
                { label: 'Flags',    width: 90 },
                { label: 'Actions',  width: 140 },
              ].map(col => (
                <th
                  key={col.label}
                  style={{
                    padding: '10px 12px',
                    width: col.width,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--admin-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    textAlign: 'left',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Skeleton rows */}
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} style={{ padding: '12px' }}>
                    <div
                      style={{
                        height: 20,
                        borderRadius: 4,
                        background: 'var(--admin-border)',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  </td>
                </tr>
              ))}

            {/* Data rows */}
            {!loading &&
              profiles.map(p => {
                const isOpen = openProfileId === p.id
                const isSelected = selectedIds.has(p.id)
                const isNew =
                  !!p.submitted_date && new Date(p.submitted_date).getTime() > sinceTimestamp

                return (
                  <tr
                    key={p.id}
                    onClick={() => onOpenProfile(isOpen ? null : p.id)}
                    style={{
                      cursor: 'pointer',
                      borderLeft: isOpen
                        ? '3px solid var(--gold)'
                        : '3px solid transparent',
                      background: isOpen
                        ? 'rgba(184,150,12,0.05)'
                        : isSelected
                        ? 'rgba(184,150,12,0.03)'
                        : 'transparent',
                      borderBottom: '1px solid var(--admin-border)',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <td
                      style={{ padding: '10px 12px', width: 40 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => onSelect(p.id, e.target.checked)}
                      />
                    </td>

                    {/* Member */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            background: p.gender === 'female' ? '#2D2455' : '#0D2A3A',
                            color: p.gender === 'female' ? '#C4BCFF' : '#7BBFE8',
                          }}
                        >
                          {p.display_initials}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--admin-text)',
                            }}
                          >
                            {p.first_name ?? p.display_initials}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Gender */}
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--admin-muted)' }}>
                      {p.gender
                        ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1)
                        : '—'}
                    </td>

                    {/* Age */}
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--admin-muted)' }}>
                      {p.age_display ?? '—'}
                    </td>

                    {/* Location */}
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 12,
                        color: 'var(--admin-muted)',
                        maxWidth: 120,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {p.location ?? '—'}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge status={p.status} />
                      {!isContactComplete(p.family_account) && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                          background: 'rgba(234,179,8,0.15)', color: '#ca8a04',
                          whiteSpace: 'nowrap',
                        }}>
                          Incomplete
                        </span>
                      )}
                    </td>

                    {/* Flags */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {isNew && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--status-info-bg)',
                              color: 'var(--status-info)',
                            }}
                          >
                            New
                          </span>
                        )}
                        {p.needs_claim && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(251,191,36,0.1)',
                              color: '#ca8a04',
                              fontWeight: 600,
                            }}
                          >
                            Claim
                          </span>
                        )}
                        {p.imported_user && !p.needs_claim && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(74,222,128,0.08)',
                              color: '#4ade80',
                            }}
                          >
                            Activated
                          </span>
                        )}
                        {p.duplicate_flag && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--status-warning-bg)',
                              color: 'var(--status-warning)',
                            }}
                          >
                            ⚑ Flag
                          </span>
                        )}
                        {!p.family_account && (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.12)', color: 'var(--admin-muted)' }}>
                            No family
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td
                      style={{ padding: '10px 12px' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {p.status === 'pending' && (
                          <>
                            {(() => {
                              const contactOk = isContactComplete(p.family_account)
                              return (
                                <button
                                  onClick={() => contactOk && onApprove(p.id)}
                                  disabled={!contactOk}
                                  title={!contactOk ? 'Cannot approve — primary contact details incomplete.' : undefined}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    background: contactOk ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${contactOk ? 'var(--status-success)' : 'var(--admin-border)'}`,
                                    color: contactOk ? 'var(--status-success)' : 'var(--admin-muted)',
                                    cursor: contactOk ? 'pointer' : 'not-allowed',
                                    opacity: contactOk ? 1 : 0.5,
                                  }}
                                >
                                  ✓
                                </button>
                              )
                            })()}
                            <button
                              onClick={() => onReject(p.id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                background: 'var(--status-error-bg)',
                                border: '1px solid var(--status-error)',
                                color: 'var(--status-error)',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </>
                        )}
                        <RowMenu profileId={p.id} onDelete={onDelete} />
                      </div>
                    </td>
                  </tr>
                )
              })}

            {/* Empty state */}
            {!loading && profiles.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <p
                    style={{
                      color: 'var(--admin-muted)',
                      marginBottom: 12,
                      fontSize: 14,
                    }}
                  >
                    No profiles match the current filters
                  </p>
                  <button
                    onClick={onClearFilters}
                    style={{
                      fontSize: 13,
                      color: 'var(--gold)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
