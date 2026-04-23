'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { PreviewResult, PreviewRow } from '@/app/api/admin/import/preview/route'

// ─── CSV template ─────────────────────────────────────────────────────────────

const NEW_CSV_HEADERS =
  'candidate_name,age,gender,city,ethnicity,profile_text,representative_name,representative_relationship,representative_phone,representative_email,female_representative_name,female_representative_phone'

const NEW_CSV_EXAMPLE =
  'Amira Khan,24,female,London,British Pakistani,Practising Muslim looking for a kind and family-oriented spouse.,Yasmin Khan,mother,07700900001,yasmin@example.com,,'

const CSV_TEMPLATE = `${NEW_CSV_HEADERS}\n${NEW_CSV_EXAMPLE}\n`

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchError {
  row: number
  candidate_name: string
  error: string
}

interface Batch {
  id: string
  filename: string | null
  row_count: number | null
  success_count: number | null
  error_count: number | null
  status: string | null
  is_test_run: boolean | null
  created_at: string | null
  completed_at: string | null
  errors: BatchError[] | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:    { bg: 'var(--status-warning-bg)',  text: 'var(--status-warning)' },
    preview:    { bg: 'var(--status-info-bg)',     text: 'var(--status-info)' },
    processing: { bg: 'var(--status-purple-bg)',   text: 'var(--status-purple)' },
    complete:   { bg: 'var(--status-success-bg)',  text: 'var(--status-success)' },
    failed:     { bg: 'var(--status-error-bg)',    text: 'var(--status-error)' },
  }
  const s = map[status ?? ''] ?? { bg: 'var(--admin-border)', text: 'var(--admin-muted)' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ background: s.bg, color: s.text }}>
      {status ?? '—'}
    </span>
  )
}

const ROW_STATUS_STYLE: Record<string, { color: string; label: string }> = {
  valid:           { color: 'var(--status-success)', label: '✓ Valid' },
  skipped:         { color: 'var(--status-error)',   label: '✗ Skipped' },
  duplicate:       { color: 'var(--status-warning)', label: '⚠ Duplicate' },
  existing_family: { color: 'var(--status-info)',    label: '→ Existing family' },
  missing_data:    { color: 'var(--status-warning)', label: '⚠ Missing data' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [csvText, setCsvText]     = useState<string | null>(null)
  const [fileName, setFileName]   = useState<string>('')
  const [fileError, setFileError] = useState<string | null>(null)

  const [previewing, setPreviewing]       = useState(false)
  const [preview, setPreview]             = useState<PreviewResult | null>(null)
  const [previewError, setPreviewError]   = useState<string | null>(null)

  const [running, setRunning]     = useState(false)
  const [runResult, setRunResult] = useState<{ success: number; errors: number; batchId: string } | null>(null)
  const [runError, setRunError]   = useState<string | null>(null)

  const [batches, setBatches]               = useState<Batch[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError]     = useState<string | null>(null)

  useEffect(() => { void loadHistory() }, [])

  async function loadHistory() {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch('/api/admin/import/history')
      const json = await res.json() as { batches?: Batch[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to load history')
      setBatches(json.batches ?? [])
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setHistoryLoading(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'zawaaj_family_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setPreview(null)
    setRunResult(null)
    setPreviewError(null)
    setRunError(null)
    setFileError(null)
    setCsvText(null)

    if (!file) return
    if (!file.name.endsWith('.csv')) { setFileError('Please select a .csv file.'); return }
    if (file.size > 5 * 1024 * 1024) { setFileError('File exceeds 5 MB limit.'); return }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '')
    reader.readAsText(file)
  }

  async function handlePreview() {
    if (!csvText) return
    setPreviewing(true)
    setPreview(null)
    setPreviewError(null)
    setRunResult(null)

    try {
      const res = await fetch('/api/admin/import/preview', {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: csvText,
      })
      const json = await res.json() as PreviewResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Preview failed')
      setPreview(json)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleRun() {
    if (!csvText) return
    setRunning(true)
    setRunResult(null)
    setRunError(null)

    try {
      const res = await fetch('/api/admin/import/run', {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: csvText,
      })
      const json = await res.json() as { success?: number; errors?: number; batchId?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      setRunResult({ success: json.success ?? 0, errors: json.errors ?? 0, batchId: json.batchId ?? '' })
      void loadHistory()
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  const canRun = preview !== null && (preview.validCount + preview.existingFamilyCount + preview.missingDataCount) > 0 && runResult === null

  return (
    <div className="min-h-screen bg-surface" style={{ color: 'var(--admin-text)' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <Link href="/admin" className="text-sm transition-colors flex items-center gap-1" style={{ color: 'var(--admin-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Admin
        </Link>
        <span style={{ color: 'var(--admin-muted)', opacity: 0.4 }}>/</span>
        <span className="text-sm" style={{ color: 'var(--admin-text)' }}>Family Import</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--admin-text)' }}>Family Import</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-muted)' }}>
            Upload a CSV to import legacy families. Each valid row creates a family account and a candidate profile
            with <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--admin-border)' }}>needs_claim = true</code>.
            No auth users or emails are created — managers send claim invites separately.
          </p>
          <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: 'var(--status-warning)' }}>
            <strong>Invite in batches of 5.</strong> Import as many as needed, then use the Operations console to send claim invites in batches of 5. Follow up before inviting the next batch.
          </div>
        </div>

        {/* ── Step 1: Download template ── */}
        <section className="bg-surface-2 rounded-2xl p-6" style={{ border: '1px solid var(--admin-border)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                <span className="text-gold mr-2">1.</span>Download CSV template
              </h2>
              <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
                One row per candidate. Do not change the header row.
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gold/40 text-gold hover:bg-gold-bg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download template
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl" style={{ border: '1px solid var(--admin-border)' }}>
            <div className="p-3 text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
              {NEW_CSV_HEADERS}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Required fields</p>
              <ul className="space-y-0.5">
                <li>candidate_name, age, gender, city</li>
                <li>representative_phone <em>or</em> representative_email</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Optional fields</p>
              <ul className="space-y-0.5">
                <li>ethnicity, profile_text</li>
                <li>female_representative_name / phone</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Step 2: Upload & Preview ── */}
        <section className="bg-surface-2 rounded-2xl p-6 space-y-5" style={{ border: '1px solid var(--admin-border)' }}>
          <div>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
              <span className="text-gold mr-2">2.</span>Upload and preview
            </h2>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Preview validates each row and detects duplicates before committing.</p>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--admin-muted)' }}>CSV file (max 5 MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm
                file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0
                file:text-sm file:font-medium file:bg-gold/15 file:text-gold
                hover:file:bg-gold/25 file:transition-colors file:cursor-pointer cursor-pointer"
              style={{ color: 'var(--admin-muted)' }}
            />
            {fileError && <p className="mt-2 text-xs text-error">{fileError}</p>}
          </div>

          <button
            onClick={handlePreview}
            disabled={!csvText || previewing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
              bg-gold text-black hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            {previewing ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="25" strokeDashoffset="8" strokeLinecap="round"/>
                </svg>
                Validating…
              </>
            ) : 'Preview import'}
          </button>

          {previewError && (
            <div className="rounded-xl border border-error/20 bg-status-error-bg p-4 text-sm text-error">
              {previewError}
            </div>
          )}

          {/* Preview results */}
          {preview && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {[
                  { label: 'valid', count: preview.validCount, color: 'var(--status-success)' },
                  { label: 'existing family — will link', count: preview.existingFamilyCount, color: 'var(--status-info)' },
                  { label: 'missing data', count: preview.missingDataCount, color: 'var(--status-warning)' },
                  { label: 'duplicate', count: preview.duplicateCount, color: 'var(--status-warning)' },
                  { label: 'skipped', count: preview.skippedCount, color: 'var(--status-error)' },
                ].filter(c => c.count > 0).map(c => (
                  <span key={c.label} style={{ color: c.color }} className="font-medium">
                    {c.count} {c.label}
                  </span>
                ))}
                {fileName && <span className="text-xs ml-auto" style={{ color: 'var(--admin-muted)' }}>{fileName}</span>}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--admin-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-border)' }}>
                      {['Row', 'Candidate', 'Gender', 'City', 'Rep. name', 'Rep. phone', 'Score', 'Status'].map(h => (
                        <th key={h} className="text-left font-medium px-3 py-2.5" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r: PreviewRow) => {
                      const st = ROW_STATUS_STYLE[r.status] ?? { color: 'var(--admin-muted)', label: r.status }
                      return (
                        <tr key={r.row} className="border-b last:border-0" style={{ borderColor: 'var(--admin-border)' }}>
                          <td className="px-3 py-2" style={{ color: 'var(--admin-muted)' }}>{r.row}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--admin-text)' }}>{r.candidate_name}</td>
                          <td className="px-3 py-2 capitalize" style={{ color: 'var(--admin-muted)' }}>{r.gender}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--admin-muted)' }}>{r.city}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--admin-muted)' }}>{r.representative_name}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--admin-muted)' }}>{r.representative_phone || '—'}</td>
                          <td className="px-3 py-2">
                            <span style={{ color: r.completeness_score >= 70 ? 'var(--status-success)' : r.completeness_score >= 40 ? 'var(--status-warning)' : 'var(--status-error)' }}>
                              {r.completeness_score}%
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <span style={{ color: st.color, fontWeight: 500 }}>{st.label}</span>
                              {r.existing_family_id && (
                                <span className="block text-[10px] mt-0.5" style={{ color: 'var(--admin-muted)' }}>
                                  fa:{r.existing_family_id.slice(0, 8)}…
                                </span>
                              )}
                              {r.error && (
                                <span className="block text-[10px] mt-0.5" style={{ color: 'var(--status-error)' }}>{r.error}</span>
                              )}
                              {r.missing_fields.length > 0 && r.status !== 'skipped' && (
                                <span className="block text-[10px] mt-0.5" style={{ color: 'var(--admin-muted)' }}>
                                  missing: {r.missing_fields.join(', ')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Step 3: Confirm real import ── */}
        {canRun && !runResult && (
          <section className="bg-surface-2 rounded-2xl p-6 space-y-4" style={{ border: '1px solid var(--admin-border)' }}>
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                <span className="text-gold mr-2">3.</span>Run import
              </h2>
              <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
                Creates <strong style={{ color: 'var(--admin-text)' }}>
                  {(preview?.validCount ?? 0) + (preview?.existingFamilyCount ?? 0) + (preview?.missingDataCount ?? 0)}
                </strong> family account(s) and candidate profiles.
                Skipped and duplicate rows are excluded.
                All profiles start as <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--admin-border)' }}>pending</code> — approve them separately.
              </p>
            </div>

            {runError && (
              <div className="rounded-xl border border-error/20 bg-status-error-bg p-4 text-sm text-error">{runError}</div>
            )}

            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
            >
              {running ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="25" strokeDashoffset="8" strokeLinecap="round"/>
                  </svg>
                  Importing…
                </>
              ) : `Run import`}
            </button>
          </section>
        )}

        {/* Run result */}
        {runResult && (
          <section className="bg-surface-2 border border-success/20 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-success mb-3">Import complete</h2>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-xs block mb-0.5" style={{ color: 'var(--admin-muted)' }}>Profiles created</span>
                <span className="text-success font-semibold text-lg">{runResult.success}</span>
              </div>
              <div>
                <span className="text-xs block mb-0.5" style={{ color: 'var(--admin-muted)' }}>Errors</span>
                <span className={`font-semibold text-lg ${runResult.errors > 0 ? 'text-error' : ''}`}
                  style={runResult.errors === 0 ? { color: 'var(--admin-muted)' } : undefined}>
                  {runResult.errors}
                </span>
              </div>
              <div className="ml-auto">
                <span className="text-xs block mb-0.5" style={{ color: 'var(--admin-muted)' }}>Batch ID</span>
                <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>{runResult.batchId}</span>
              </div>
            </div>
            <p className="mt-4 text-xs" style={{ color: 'var(--admin-muted)' }}>
              Next: approve profiles in the Operations console, then use the Manager Activation workflow to send claim invites in batches of 5.
            </p>
          </section>
        )}

        {/* ── Step 4: Import history ── */}
        <section className="bg-surface-2 rounded-2xl p-6 space-y-4" style={{ border: '1px solid var(--admin-border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
              <span className="text-gold mr-2">4.</span>Import history
            </h2>
            <button onClick={loadHistory} className="text-xs transition-colors" style={{ color: 'var(--admin-muted)' }}>
              Refresh
            </button>
          </div>

          {historyError && <p className="text-sm text-error">{historyError}</p>}

          {historyLoading ? (
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>No imports yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--admin-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-border)' }}>
                    {['Date', 'File', 'Rows', 'Success', 'Errors', 'Status'].map(h => (
                      <th key={h} className="text-left font-medium px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <>
                      <tr key={b.id} className="border-b transition-colors" style={{ borderColor: 'var(--admin-border)' }}>
                        <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>{fmtDate(b.created_at)}</td>
                        <td className="px-4 py-2.5 font-mono truncate max-w-[160px]" style={{ color: 'var(--admin-text)' }}>{b.filename ?? '—'}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--admin-muted)' }}>{b.row_count ?? '—'}</td>
                        <td className="px-4 py-2.5 text-success">{b.success_count ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={(b.error_count ?? 0) > 0 ? 'text-error' : ''}
                            style={(b.error_count ?? 0) === 0 ? { color: 'var(--admin-muted)' } : undefined}>
                            {b.error_count ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><StatusPill status={b.status} /></td>
                      </tr>
                      {b.errors && b.errors.length > 0 && b.errors.map((e, idx) => (
                        <tr key={`${b.id}-err-${idx}`} className="border-b last:border-0" style={{ borderColor: 'var(--admin-border)', background: 'var(--status-error-bg)' }}>
                          <td className="px-4 py-2 text-error" colSpan={2}>Row {e.row} — {e.candidate_name}</td>
                          <td className="px-4 py-2 text-error" colSpan={4}>{e.error}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
