'use client'

import { useState } from 'react'
import type { PromoCodeRow } from './page'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDiscount(row: PromoCodeRow) {
  if (row.discount_type === 'percent') return `${row.discount_value}% off`
  return `£${row.discount_value} off`
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface FormState {
  code: string
  description: string
  discount_type: 'percent' | 'fixed_gbp'
  discount_value: string
  applicable_plans: string[]
  max_uses: string
  valid_from: string
  valid_until: string
  is_active: boolean
}

const BLANK: FormState = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '',
  applicable_plans: ['plus', 'premium'],
  max_uses: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
  is_active: true,
}

function CodeModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PromoCodeRow | null
  onClose: () => void
  onSaved: (row: PromoCodeRow) => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          code: initial.code,
          description: initial.description ?? '',
          discount_type: initial.discount_type,
          discount_value: String(initial.discount_value),
          applicable_plans: initial.applicable_plans,
          max_uses: initial.max_uses != null ? String(initial.max_uses) : '',
          valid_from: initial.valid_from.slice(0, 10),
          valid_until: initial.valid_until ? initial.valid_until.slice(0, 10) : '',
          is_active: initial.is_active,
        }
      : { ...BLANK }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlan(plan: string) {
    setForm(f => ({
      ...f,
      applicable_plans: f.applicable_plans.includes(plan)
        ? f.applicable_plans.filter(p => p !== plan)
        : [...f.applicable_plans, plan],
    }))
  }

  async function save() {
    if (!form.code.trim()) { setError('Code is required'); return }
    if (!form.discount_value || isNaN(Number(form.discount_value))) { setError('Valid discount value required'); return }
    if (form.applicable_plans.length === 0) { setError('Select at least one plan'); return }

    setLoading(true)
    setError(null)

    const payload = {
      id: initial?.id,
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      applicable_plans: form.applicable_plans,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_from: form.valid_from || new Date().toISOString().slice(0, 10),
      valid_until: form.valid_until || null,
      is_active: form.is_active,
    }

    const res = await fetch('/api/admin/promo-codes', {
      method: initial ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
    onSaved(json.code as PromoCodeRow)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    borderRadius: 8, fontSize: 13,
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'block',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{
        background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
        borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 20px' }}>
          {initial ? 'Edit Promo Code' : 'Create Promo Code'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Code */}
          <div>
            <label style={labelStyle}>Code</label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. RAMADAN25"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description (internal)</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Ramadan 2026 launch offer"
              style={inputStyle}
            />
          </div>

          {/* Discount type + value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Discount type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed_gbp' }))}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed_gbp">Fixed amount (£)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{form.discount_type === 'percent' ? 'Percentage off' : 'Amount off (£)'}</label>
              <input
                type="number"
                min={0}
                max={form.discount_type === 'percent' ? 100 : undefined}
                step={form.discount_type === 'percent' ? 1 : 0.01}
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percent' ? '20' : '5.00'}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Applicable plans */}
          <div>
            <label style={labelStyle}>Applicable plans</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['plus', 'premium'] as const).map(plan => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => togglePlan(plan)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    background: form.applicable_plans.includes(plan) ? '#B8960C' : 'rgba(255,255,255,0.08)',
                    color: form.applicable_plans.includes(plan) ? '#111' : 'var(--admin-muted)',
                  }}
                >
                  {plan}
                </button>
              ))}
            </div>
          </div>

          {/* Usage limit + validity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Max uses</label>
              <input
                type="number" min={1} value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Valid from</label>
              <input
                type="date" value={form.valid_from}
                onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Valid until</label>
              <input
                type="date" value={form.valid_until}
                onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                placeholder="No expiry"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', padding: 0,
                background: form.is_active ? '#B8960C' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: form.is_active ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--admin-text)' }}>
              {form.is_active ? 'Active — code can be used' : 'Inactive — code is disabled'}
            </span>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--admin-border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--admin-muted)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: '#B8960C', color: '#111', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Saving…' : initial ? 'Save changes' : 'Create code'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  codes: PromoCodeRow[]
}

export function OffersClient({ codes: initial }: Props) {
  const [codes, setCodes] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [editCode, setEditCode] = useState<PromoCodeRow | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  function handleSaved(row: PromoCodeRow) {
    setCodes(prev => {
      const idx = prev.findIndex(c => c.id === row.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = row
        return next
      }
      return [row, ...prev]
    })
  }

  async function toggleActive(row: PromoCodeRow) {
    setToggling(row.id)
    const res = await fetch('/api/admin/promo-codes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
    })
    const json = await res.json().catch(() => ({}))
    setToggling(null)
    if (res.ok && json.code) handleSaved(json.code as PromoCodeRow)
  }

  const active = codes.filter(c => c.is_active)
  const inactive = codes.filter(c => !c.is_active)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            Offers &amp; Promo Codes
          </h1>
          <p style={{ fontSize: 13, color: 'var(--admin-muted)', marginTop: 4 }}>
            {active.length} active code{active.length !== 1 ? 's' : ''} · {inactive.length} inactive
          </p>
        </div>
        <button
          onClick={() => { setEditCode(null); setShowModal(true) }}
          style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer', background: '#B8960C', color: '#111',
          }}
        >
          + New code
        </button>
      </div>

      {/* Table */}
      {codes.length === 0 ? (
        <div style={{
          background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
          borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--admin-muted)', fontSize: 14,
        }}>
          No promo codes yet. Create your first offer above.
        </div>
      ) : (
        <div style={{
          background: 'var(--admin-surface)', border: '1px solid var(--admin-border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Code', 'Discount', 'Plans', 'Uses', 'Valid until', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: 'var(--admin-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((row, i) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: i < codes.length - 1 ? '1px solid var(--admin-border)' : 'none' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                      {row.code}
                    </div>
                    {row.description && (
                      <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 1 }}>{row.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--admin-text)', fontWeight: 600 }}>
                    {fmtDiscount(row)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {row.applicable_plans.map(p => (
                        <span key={p} style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 99,
                          background: p === 'premium' ? 'rgba(184,150,12,0.15)' : 'rgba(99,102,241,0.15)',
                          color: p === 'premium' ? '#B8960C' : '#818cf8',
                          fontWeight: 600, textTransform: 'capitalize',
                        }}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--admin-muted)' }}>
                    {row.uses_count}{row.max_uses != null ? ` / ${row.max_uses}` : ''}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-muted)' }}>
                    {fmtDate(row.valid_until)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => toggleActive(row)}
                      disabled={toggling === row.id}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: 'none',
                        cursor: toggling === row.id ? 'not-allowed' : 'pointer',
                        padding: 0, position: 'relative',
                        background: row.is_active ? '#B8960C' : 'rgba(255,255,255,0.15)',
                        transition: 'background 0.2s', opacity: toggling === row.id ? 0.5 : 1,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2,
                        left: row.is_active ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                      }} />
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => { setEditCode(row); setShowModal(true) }}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12,
                        border: '1px solid var(--admin-border)', cursor: 'pointer',
                        background: 'transparent', color: 'var(--admin-muted)',
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CodeModal
          initial={editCode}
          onClose={() => { setShowModal(false); setEditCode(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
