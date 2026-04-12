'use client'

interface BulkActionBarProps {
  count: number
  onApproveAll: () => void
  onRejectAll: () => void
  onDeselect: () => void
}

export function BulkActionBar({ count, onApproveAll, onRejectAll, onDeselect }: BulkActionBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        marginBottom: 12,
        borderRadius: 10,
        background: 'rgba(184,150,12,0.08)',
        border: '1px solid rgba(184,150,12,0.2)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--admin-text)', fontWeight: 500 }}>
        {count} profile{count !== 1 ? 's' : ''} selected
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={onApproveAll}
        style={{
          padding: '6px 16px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          background: 'rgba(74,222,128,0.1)',
          border: '1px solid var(--status-success)',
          color: 'var(--status-success)',
          cursor: 'pointer',
        }}
      >
        Approve all
      </button>
      <button
        onClick={onRejectAll}
        style={{
          padding: '6px 16px',
          borderRadius: 8,
          fontSize: 13,
          background: 'var(--status-error-bg)',
          border: '1px solid var(--status-error)',
          color: 'var(--status-error)',
          cursor: 'pointer',
        }}
      >
        Reject all
      </button>
      <button
        onClick={onDeselect}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 13,
          background: 'transparent',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-muted)',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  )
}
