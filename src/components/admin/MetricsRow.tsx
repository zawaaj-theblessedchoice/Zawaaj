'use client'

import { Metrics } from '@/lib/admin/operationsQueries'

interface MetricsRowProps {
  metrics: Metrics
  onFilter: (status: string) => void
}

export function MetricsRow({ metrics, onFilter }: MetricsRowProps) {
  const cards = [
    {
      label: 'Pending review',
      value: metrics.pendingReview,
      filterStatus: 'pending',
      alert: metrics.pendingReview > 0,
    },
    {
      label: 'Needs action',
      value: metrics.needsAction,
      filterStatus: 'flagged',
      alert: metrics.needsAction > 0,
    },
    {
      label: 'Intros active',
      value: metrics.introductionsActive,
      filterStatus: null,
      alert: false,
    },
    {
      label: 'Introduced this week',
      value: metrics.introducedThisWeek,
      filterStatus: null,
      alert: false,
    },
    {
      label: 'Active members',
      value: metrics.approvedMembers,
      filterStatus: 'approved',
      alert: false,
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {cards.map(card => (
        <div
          key={card.label}
          onClick={() => card.filterStatus && onFilter(card.filterStatus)}
          style={{
            flex: 1,
            minWidth: 140,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'var(--admin-surface)',
            border: card.alert ? '1px solid var(--status-error)' : '1px solid var(--admin-border)',
            borderLeft: card.alert
              ? '3px solid var(--status-error)'
              : card.filterStatus === 'approved'
              ? '3px solid var(--status-success)'
              : '3px solid var(--admin-border)',
            cursor: card.filterStatus ? 'pointer' : 'default',
            transition: 'opacity 0.15s',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--admin-text)',
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {card.value}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--admin-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {card.label}
          </div>
        </div>
      ))}
    </div>
  )
}
