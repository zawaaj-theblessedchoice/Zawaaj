'use client'

import { Metrics } from '@/lib/admin/operationsQueries'

interface MetricsRowProps {
  metrics: Metrics
  onFilter: (status: string) => void
  onNeedsClaim?: () => void
}

export function MetricsRow({ metrics, onFilter, onNeedsClaim }: MetricsRowProps) {
  const cards: Array<{
    label: string
    value: number
    alert: boolean
    color: 'error' | 'success' | 'amber' | 'neutral'
    onClick?: () => void
  }> = [
    {
      label: 'Pending review',
      value: metrics.pendingReview,
      alert: metrics.pendingReview > 0,
      color: 'error',
      onClick: () => onFilter('pending'),
    },
    {
      label: 'Needs action',
      value: metrics.needsAction,
      alert: metrics.needsAction > 0,
      color: 'error',
      onClick: () => onFilter('flagged'),
    },
    {
      label: 'Needs claim',
      value: metrics.needsClaim,
      alert: metrics.needsClaim > 0,
      color: 'amber',
      onClick: onNeedsClaim,
    },
    {
      label: 'Intros active',
      value: metrics.introductionsActive,
      alert: false,
      color: 'neutral',
      onClick: undefined,
    },
    {
      label: 'Introduced this week',
      value: metrics.introducedThisWeek,
      alert: false,
      color: 'neutral',
      onClick: undefined,
    },
    {
      label: 'Active members',
      value: metrics.approvedMembers,
      alert: false,
      color: 'success',
      onClick: () => onFilter('approved'),
    },
  ]

  const borderLeft: Record<string, string> = {
    error:   'var(--status-error)',
    success: 'var(--status-success)',
    amber:   '#ca8a04',
    neutral: 'var(--admin-border)',
  }
  const textColor: Record<string, string> = {
    error:   'var(--status-error)',
    success: 'var(--status-success)',
    amber:   '#ca8a04',
    neutral: 'var(--admin-text)',
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {cards.map(card => (
        <div
          key={card.label}
          onClick={card.onClick}
          style={{
            flex: 1,
            minWidth: 130,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'var(--admin-surface)',
            border: card.alert
              ? `1px solid ${borderLeft[card.color]}`
              : '1px solid var(--admin-border)',
            borderLeft: `3px solid ${card.alert ? borderLeft[card.color] : 'var(--admin-border)'}`,
            cursor: card.onClick ? 'pointer' : 'default',
            transition: 'opacity 0.15s',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: card.alert ? textColor[card.color] : 'var(--admin-text)',
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
