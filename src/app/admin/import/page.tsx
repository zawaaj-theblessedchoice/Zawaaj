'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewRow {
  row: number
  email: string
  name: string
  gender: string
  status: string
  valid: boolean
  error: string | null
}

interface PreviewResult {
  rows: PreviewRow[]
  validCount: number
  errorCount: number
}

interface BatchError {
  row: number
  email: string
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

// ─── CSV template ─────────────────────────────────────────────────────────────

const CSV_HEADERS =
  'email,first_name,last_name,date_of_birth,gender,city,country,nationality,ethnicity,languages,profession,education,institution,school_of_thought,religiosity,prayer_regularity,wears_hijab,keeps_beard,marital_status,has_children,height,living_situation,open_to_relocating,open_to_partners_children,pref_age_min,pref_age_max,pref_location,pref_ethnicity,pref_school_of_thought,pref_relocation,bio,status'

const CSV_EXAMPLE =
  "john@example.com,John,Smith,1990-05-15,male,London,UK,British,British Pakistani,English,Finance,Bachelor's,UCL,Sunni,practising,yes_regularly,,,never_married,false,5ft10,With family,open,open,22,32,London,Any,Sunni,open,A brief bio here,pending"

const CSV_TEMPLATE = `${CSV_HEADERS}\n${CSV_EXAMPLE}\n`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ background: s.bg, color: s.text }}
    >
      {status ?? '—'}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  // File + options
  const [csvText, setCsvText]       = useState<string | null>(null)
  const [fileName, setFileName]     = useState<string>('')
  const [testRun, setTestRun]       = useState(true)
  const [fileError, setFileError]   = useState<string | null>(null)

  // Preview
  const [previewing, setPreviewing]   = useState(false)
  const [preview, setPreview]         = useState<PreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Run
  const [running, setRunning]       = useState(false)
  const [runResult, setRunResult]   = useState<{ success: number; errors: number; batchId: string; inviteLinks: { email: string; link: string }[] } | null>(null)
  const [runError, setRunError]     = useState<string | null>(null)

  // History
  const [batches, setBatches]         = useState<Batch[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError]    = useState<string | null>(null)

  // ── Load history on mount ──────────────────────────────────────────────────
  useEffect(() => {
    void loadHistory()
  }, [])

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

  // ── Download template ──────────────────────────────────────────────────────
  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'zawaaj_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── File selection ─────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setPreview(null)
    setRunResult(null)
    setPreviewError(null)
    setRunError(null)
    setFileError(null)
    setCsvText(null)

    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setFileError('Please select a .csv file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File exceeds 5 MB limit.')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string ?? '')
    }
    reader.readAsText(file)
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  async function handlePreview() {
    if (!csvText) return
    setPreviewing(true)
    setPreview(null)
    setPreviewError(null)
    setRunResult(null)

    try {
      const res = await fetch('/api/admin/import/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    csvText,
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

  // ── Run import ─────────────────────────────────────────────────────────────
  async function handleRun() {
    if (!csvText) return
    setRunning(true)
    setRunResult(null)
    setRunError(null)

    try {
      const res = await fetch('/api/admin/import/run', {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    csvText,
      })
      const json = await res.json() as { success?: number; errors?: number; batchId?: string; error?: string; inviteLinks?: { email: string; link: string }[] }
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      setRunResult({
        success:     json.success     ?? 0,
        errors:      json.errors      ?? 0,
        batchId:     json.batchId     ?? '',
        inviteLinks: json.inviteLinks ?? [],
      })
      // Refresh history
      void loadHistory()
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const canRun = preview !== null && !testRun && preview.validCount > 0 && runResult === null

  return (
    <div className="min-h-screen bg-surface" style={{ color: 'var(--admin-text)' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <Link
          href="/admin"
          className="text-sm transition-colors flex items-center gap-1"
          style={{ color: 'var(--admin-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Admin
        </Link>
        <span style={{ color: 'var(--admin-muted)', opacity: 0.4 }}>/</span>
        <span className="text-sm" style={{ color: 'var(--admin-text)' }}>Member Import</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--admin-text)' }}>Member Import</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-muted)' }}>
            Upload a CSV to create member accounts in bulk. Each valid row creates an auth user,
            profile, settings and a voluntary subscription, then sends a password-reset email.
          </p>
        </div>

        {/* ── Step 1: Download template ── */}
        <section className="bg-surface-2 rounded-2xl p-6" style={{ border: '1px solid var(--admin-border)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                <span className="text-gold mr-2">1.</span>Download CSV template
              </h2>
              <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
                Use this template as a starting point. Do not change the header row.
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

          {/* Header preview */}
          <div className="mt-4 overflow-x-auto rounded-xl" style={{ border: '1px solid var(--admin-border)' }}>
            <div className="p-3 text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
              {CSV_HEADERS}
            </div>
          </div>
        </section>

        {/* ── Step 2: Upload & Preview ── */}
        <section className="bg-surface-2 rounded-2xl p-6 space-y-5" style={{ border: '1px solid var(--admin-border)' }}>
          <div>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
              <span className="text-gold mr-2">2.</span>Upload and preview
            </h2>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Select your filled CSV, then preview to validate rows before importing.</p>
          </div>

          {/* File input */}
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

          {/* Test run checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={testRun}
              onChange={e => {
                setTestRun(e.target.checked)
                setPreview(null)
                setRunResult(null)
              }}
              className="w-4 h-4 accent-gold cursor-pointer"
            />
            <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
              Test run — preview only, do not create accounts
            </span>
          </label>

          {/* Preview button */}
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

          {/* Preview table */}
          {preview && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-success font-medium">{preview.validCount} valid</span>
                <span style={{ color: 'var(--admin-muted)' }}>·</span>
                <span className="text-error font-medium">{preview.errorCount} errors</span>
                {fileName && <span className="text-xs ml-auto" style={{ color: 'var(--admin-muted)' }}>{fileName}</span>}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--admin-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-border)' }}>
                      <th className="text-left font-medium px-4 py-3 w-14" style={{ color: 'var(--admin-muted)' }}>Row</th>
                      <th className="text-left font-medium px-4 py-3" style={{ color: 'var(--admin-muted)' }}>Email</th>
                      <th className="text-left font-medium px-4 py-3" style={{ color: 'var(--admin-muted)' }}>Name</th>
                      <th className="text-left font-medium px-4 py-3 w-20" style={{ color: 'var(--admin-muted)' }}>Gender</th>
                      <th className="text-left font-medium px-4 py-3 w-24" style={{ color: 'var(--admin-muted)' }}>Status</th>
                      <th className="text-left font-medium px-4 py-3" style={{ color: 'var(--admin-muted)' }}>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(r => (
                      <tr key={r.row} className="border-b last:border-0 transition-colors" style={{ borderColor: 'var(--admin-border)' }}>
                        <td className="px-4 py-2.5" style={{ color: 'var(--admin-muted)' }}>{r.row}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text)' }}>{r.email || '—'}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>{r.name}</td>
                        <td className="px-4 py-2.5 capitalize" style={{ color: 'var(--admin-muted)' }}>{r.gender}</td>
                        <td className="px-4 py-2.5 capitalize" style={{ color: 'var(--admin-muted)' }}>{r.status}</td>
                        <td className="px-4 py-2.5">
                          {r.valid ? (
                            <span className="text-success">&#10003; valid</span>
                          ) : (
                            <span className="text-error">&#10007; {r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Step 3: Confirm real import ── */}
        {canRun && (
          <section className="bg-surface-2 rounded-2xl p-6 space-y-4" style={{ border: '1px solid var(--admin-border)' }}>
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                <span className="text-gold mr-2">3.</span>Run import
              </h2>
              <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
                This will create <strong style={{ color: 'var(--admin-text)' }}>{preview?.validCount}</strong> auth user account{preview?.validCount !== 1 ? 's' : ''} and send each a password-reset email.
                This action cannot be undone.
              </p>
            </div>

            {runError && (
              <div className="rounded-xl border border-error/20 bg-status-error-bg p-4 text-sm text-error">
                {runError}
              </div>
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
              ) : `Run import (${preview?.validCount} rows)`}
            </button>
          </section>
        )}

        {/* Run result */}
        {runResult && (
          <section className="bg-surface-2 border border-success/20 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-success mb-3">Import complete</h2>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-xs block mb-0.5" style={{ color: 'var(--admin-muted)' }}>Accounts created</span>
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
            {runResult.inviteLinks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                  Invite links — copy and send directly to each member:
                </p>
                {runResult.inviteLinks.map(({ email, link }) => (
                  <div key={email} className="rounded-xl p-3 space-y-1.5" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
                    <p className="text-xs font-mono" style={{ color: 'var(--admin-muted)' }}>{email}</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={link}
                        className="flex-1 text-xs font-mono rounded-lg px-2 py-1.5 truncate"
                        style={{ background: 'var(--surface-3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                        onClick={e => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => void navigator.clipboard.writeText(link)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Step 4: Import history ── */}
        <section className="bg-surface-2 rounded-2xl p-6 space-y-4" style={{ border: '1px solid var(--admin-border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
              <span className="text-gold mr-2">4.</span>Import history
            </h2>
            <button
              onClick={loadHistory}
              className="text-xs transition-colors"
              style={{ color: 'var(--admin-muted)' }}
            >
              Refresh
            </button>
          </div>

          {historyError && (
            <p className="text-sm text-error">{historyError}</p>
          )}

          {historyLoading ? (
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>No imports yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--admin-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-border)' }}>
                    <th className="text-left font-medium px-4 py-3" style={{ color: 'var(--admin-muted)' }}>Date</th>
                    <th className="text-left font-medium px-4 py-3" style={{ color: 'var(--admin-muted)' }}>File</th>
                    <th className="text-left font-medium px-4 py-3 w-16" style={{ color: 'var(--admin-muted)' }}>Rows</th>
                    <th className="text-left font-medium px-4 py-3 w-20" style={{ color: 'var(--admin-muted)' }}>Success</th>
                    <th className="text-left font-medium px-4 py-3 w-16" style={{ color: 'var(--admin-muted)' }}>Errors</th>
                    <th className="text-left font-medium px-4 py-3 w-20" style={{ color: 'var(--admin-muted)' }}>Mode</th>
                    <th className="text-left font-medium px-4 py-3 w-24" style={{ color: 'var(--admin-muted)' }}>Status</th>
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
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${b.is_test_run ? 'bg-blue-500/15 text-blue-400' : ''}`}
                            style={!b.is_test_run ? { background: 'var(--admin-border)', color: 'var(--admin-muted)' } : undefined}>
                            {b.is_test_run ? 'test' : 'live'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={b.status} />
                        </td>
                      </tr>
                      {/* Inline error detail rows */}
                      {b.errors && b.errors.length > 0 && b.errors.map((e, i) => (
                        <tr key={`${b.id}-err-${i}`} className="border-b last:border-0" style={{ borderColor: 'var(--admin-border)', background: 'var(--status-error-bg)' }}>
                          <td className="px-4 py-2 text-error" colSpan={2}>Row {e.row} — <span className="font-mono">{e.email}</span></td>
                          <td className="px-4 py-2 text-error" colSpan={5}>{e.error}</td>
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

      {/* Field styles (matching admin page) */}
      <style>{`
        .field {
          width: 100%;
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          color: var(--admin-text);
          outline: none;
          transition: border-color 0.15s;
        }
        .field:focus {
          border-color: var(--gold);
        }
      `}</style>
    </div>
  )
}
