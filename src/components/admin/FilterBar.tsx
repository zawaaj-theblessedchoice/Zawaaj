'use client'

import { ProfileFilters } from '@/lib/admin/operationsQueries'

interface FilterBarProps {
  filters: ProfileFilters
  onChange: (f: ProfileFilters) => void
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 14px',
    borderRadius: 999,
    fontSize: 13,
    cursor: 'pointer',
    border: active ? '1px solid rgba(184,150,12,0.3)' : '1px solid var(--admin-border)',
    background: active ? 'rgba(184,150,12,0.12)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--admin-muted)',
    fontWeight: active ? 500 : 400,
    transition: 'all 0.15s',
  }
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActiveFilters = !!(filters.status || filters.gender || filters.location || filters.search || filters.noFamily || filters.needsClaim)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {/* Status label */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--admin-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Status
      </span>

      {/* Status chips */}
      {['all', 'pending', 'approved', 'withdrawn', 'suspended'].map(s => (
        <button
          key={s}
          onClick={() => onChange({ ...filters, status: s })}
          style={chipStyle(filters.status === s || (s === 'all' && !filters.status))}
        >
          {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}

      {/* Divider */}
      <span
        style={{ width: 1, height: 20, background: 'var(--admin-border)', margin: '0 4px' }}
      />

      {/* Gender label */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--admin-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Gender
      </span>

      {/* Gender chips */}
      {[
        { v: 'all', l: 'All' },
        { v: 'female', l: 'Female' },
        { v: 'male', l: 'Male' },
      ].map(g => (
        <button
          key={g.v}
          onClick={() => onChange({ ...filters, gender: g.v })}
          style={chipStyle(filters.gender === g.v || (g.v === 'all' && !filters.gender))}
        >
          {g.l}
        </button>
      ))}

      {/* Divider */}
      <span
        style={{ width: 1, height: 20, background: 'var(--admin-border)', margin: '0 4px' }}
      />

      {/* Divider */}
      <span
        style={{ width: 1, height: 20, background: 'var(--admin-border)', margin: '0 4px' }}
      />

      {/* Guardian label */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--admin-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Guardian
      </span>

      {/* No-guardian chip */}
      <button
        onClick={() => onChange({ ...filters, noFamily: filters.noFamily ? undefined : true })}
        style={chipStyle(!!filters.noFamily)}
      >
        No guardian
      </button>

      {/* Needs claim chip */}
      <button
        onClick={() => onChange({ ...filters, needsClaim: filters.needsClaim ? undefined : true })}
        style={chipStyle(!!filters.needsClaim)}
      >
        Needs claim
      </button>

      {/* Divider */}
      <span
        style={{ width: 1, height: 20, background: 'var(--admin-border)', margin: '0 4px' }}
      />

      {/* Location input */}
      <input
        placeholder="Location…"
        value={filters.location ?? ''}
        onChange={e => onChange({ ...filters, location: e.target.value || undefined })}
        style={{
          padding: '5px 10px',
          borderRadius: 999,
          border: '1px solid var(--admin-border)',
          background: 'transparent',
          color: 'var(--admin-text)',
          fontSize: 13,
          outline: 'none',
          width: 120,
        }}
      />

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange({})}
          style={{
            fontSize: 12,
            color: 'var(--admin-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px 8px',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
