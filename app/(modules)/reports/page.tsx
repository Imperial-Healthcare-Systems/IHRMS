'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  Users, Clock, IndianRupee, CalendarDays, BarChart3, Shield,
  Download, Bell, Play, X, Check, Edit, Trash2, RefreshCw,
  FileSpreadsheet, AlertCircle, Eye,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type OutputFormat = 'Excel' | 'PDF' | 'CSV'
type ReportType   = 'Employee' | 'Attendance' | 'Payroll' | 'Leave' | 'Compliance'
type DLStatus     = 'red' | 'amber' | 'green'

interface ScheduledReport {
  id: number; name: string; frequency: string; nextRun: string
  recipients: string; format: string; status: 'Active' | 'Paused'
}
interface AnalyticsData {
  headcount_trend:         { month: string; value: number }[]
  payroll_trend:           { month: string; value: number; label: string }[]
  department_distribution: { dept: string; count: number; pct: number; color: string }[]
  total_active:            number
}
interface Department { id: string; name: string; code: string }
interface DeadlineItem {
  label: string; due: string; days: number; overdue: boolean
  status: DLStatus; action: string
}
interface PreviewMeta { type: string; count: number; generatedAt: string }

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const QUICK_REPORTS = [
  { icon: <Users size={20} />,        name: 'Employee Master Report',      description: 'Complete employee directory with all details',    cfg: { bg: '#eff6ff', color: '#1d4ed8' }, type: 'employee_master'  },
  { icon: <Clock size={20} />,        name: 'Monthly Attendance Report',   description: 'Attendance summary for all employees',            cfg: { bg: '#f0fdf4', color: '#15803d' }, type: 'attendance'       },
  { icon: <IndianRupee size={20} />,  name: 'Payroll Summary Report',      description: 'Salary, deductions, net pay by department',      cfg: { bg: '#f5f3ff', color: '#6d28d9' }, type: 'payroll_summary'  },
  { icon: <CalendarDays size={20} />, name: 'Leave Balance Report',        description: 'Leave balances for all employees',               cfg: { bg: '#fffbeb', color: '#b45309' }, type: 'leave_balance'    },
  { icon: <BarChart3 size={20} />,    name: 'Headcount Report',            description: 'Department / designation / location breakdown',  cfg: { bg: '#eef2ff', color: '#4338ca' }, type: 'headcount'        },
  { icon: <Shield size={20} />,       name: 'Statutory Compliance Report', description: 'EPF, ESIC, PT, TDS summaries',                  cfg: { bg: '#fef2f2', color: '#b91c1c' }, type: 'statutory'        },
]

const REPORT_TYPE_API: Record<ReportType, string> = {
  Employee:   'employee_master',
  Attendance: 'attendance',
  Payroll:    'payroll_summary',
  Leave:      'leave_balance',
  Compliance: 'statutory',
}

const DEADLINE_CFG: Record<DLStatus, { bg: string; border: string; dot: string; text: string; badge: string; badgeColor: string }> = {
  red:   { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c', badge: '#fee2e2', badgeColor: '#b91c1c' },
  amber: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', text: '#b45309', badge: '#fef3c7', badgeColor: '#b45309' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: '#15803d', badge: '#dcfce7', badgeColor: '#15803d' },
}

const SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 1, name: 'Monthly Attendance Report', frequency: 'Monthly (1st)',      nextRun: 'May 1, 2026',  recipients: 'hr@company.com, ceo@company.com', format: 'Excel', status: 'Active' },
  { id: 2, name: 'Payroll Summary Report',    frequency: 'Monthly (Last Day)', nextRun: 'Apr 30, 2026', recipients: 'finance@company.com',             format: 'PDF',   status: 'Active' },
  { id: 3, name: 'Headcount Report',          frequency: 'Weekly (Monday)',    nextRun: 'Apr 14, 2026', recipients: 'management@company.com',          format: 'Excel', status: 'Paused' },
]

const REPORT_FIELDS = [
  { id: 'emp_id',          label: 'Employee ID'    },
  { id: 'name',            label: 'Name'           },
  { id: 'department',      label: 'Department'     },
  { id: 'designation',     label: 'Designation'    },
  { id: 'date_of_joining', label: 'Join Date'      },
  { id: 'status',          label: 'Status'         },
  { id: 'employment_type', label: 'Emp. Type'      },
  { id: 'work_email',      label: 'Email'          },
  { id: 'pan_number',      label: 'PAN Number'     },
  { id: 'uan_number',      label: 'UAN Number'     },
]

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const LBL: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const FIELD: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const CHEVRON = (
  <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}
    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function computeDeadlines(): DeadlineItem[] {
  const today = new Date()
  const yr    = today.getFullYear()
  const mo    = today.getMonth()

  const raw = [
    { label: 'EPF Monthly Return (Form 12A)',    due: new Date(yr, mo + 1, 15), action: 'Download' },
    { label: 'ESIC Monthly Contribution',         due: new Date(yr, mo + 1, 15), action: 'Download' },
    { label: 'Professional Tax Challan',          due: new Date(yr, mo, 30),     action: 'Download' },
    { label: 'TDS Return Q4 (Form 24Q)',          due: new Date(yr, 4, 31),      action: 'Prepare'  },
    { label: 'Form 16 Issue to Employees',        due: new Date(yr, 5, 15),      action: 'Generate' },
    { label: 'EPF Annual Return',                 due: new Date(yr, 3, 30),      action: 'Download' },
  ]

  return raw.map(d => {
    const diff   = Math.ceil((d.due.getTime() - today.getTime()) / 86400000)
    const overdue = diff < 0
    const status: DLStatus = overdue || diff <= 14 ? 'red' : diff <= 30 ? 'amber' : 'green'
    return {
      label: d.label,
      due:   d.due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      days:  Math.abs(diff),
      overdue,
      status,
      action: d.action,
    }
  }).sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    return a.days - b.days
  })
}

/** Recursively flatten a nested object for table/CSV rendering */
function flattenRow(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      Object.assign(result, flattenRow(v, prefix ? `${prefix}.${k}` : k))
    }
  } else {
    result[prefix] = obj === null || obj === undefined ? '' : String(obj)
  }
  return result
}

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return ''
  const flat    = data.map(r => flattenRow(r))
  const headers = Array.from(new Set(flat.flatMap(r => Object.keys(r))))
  const escape  = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  const rows = [
    headers.map(escape).join(','),
    ...flat.map(r => headers.map(h => escape(r[h] ?? '')).join(',')),
  ]
  return rows.join('\n')
}

function toJSON(data: Record<string, unknown>[]): string {
  return JSON.stringify(data, null, 2)
}

function triggerDownload(content: string, filename: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/* ─────────────────────────────────────────────────────────────
   SPINNER
───────────────────────────────────────────────────────────── */
function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${size > 24 ? 3 : 2}px solid #e5e7eb`,
      borderTopColor: '#1E3A5F', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
function Modal({ onClose, title, wide, children }: {
  onClose: () => void; title: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'white', display: 'flex', flexDirection: 'column', width: wide ? 860 : 460, maxWidth: '95vw', maxHeight: '92vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1.5px solid #f1f5f9', flexShrink: 0 }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 22px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  /* ── Server data state ── */
  const [analytics, setAnalytics]     = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAL]     = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [deadlines]                   = useState<DeadlineItem[]>(() => computeDeadlines())

  /* ── Report builder ── */
  const [reportType,     setReportType]     = useState<ReportType>('Employee')
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>(['emp_id', 'name', 'department', 'designation'])
  const [outputFormat,   setOutputFormat]   = useState<OutputFormat>('Excel')

  /* ── Modals ── */
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showPreviewModal,  setShowPreviewModal]  = useState(false)
  const [selectedReport, setSelectedReport] = useState<{ name: string; type: string } | null>(null)

  /* ── Generate state ── */
  const [generating,   setGenerating]   = useState(false)
  const [previewData,  setPreviewData]  = useState<Record<string, unknown>[]>([])
  const [previewMeta,  setPreviewMeta]  = useState<PreviewMeta>({ type: '', count: 0, generatedAt: '' })

  /* ── Load analytics ── */
  const loadAnalytics = useCallback(async () => {
    setAL(true)
    try {
      const res  = await fetch('/api/reports/analytics')
      const json = await res.json()
      if (res.ok) setAnalytics(json)
    } catch { /* silently degrade — charts show empty state */ }
    finally { setAL(false) }
  }, [])

  /* ── Load departments ── */
  const loadDepartments = useCallback(async () => {
    try {
      const res  = await fetch('/api/departments')
      const json = await res.json()
      setDepartments(json.data ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    loadAnalytics()
    loadDepartments()
  }, [loadAnalytics, loadDepartments])

  /* ── Derived chart data ── */
  const headcountData = analytics?.headcount_trend         ?? []
  const payrollData   = analytics?.payroll_trend           ?? []
  const deptData      = analytics?.department_distribution ?? []
  const totalActive   = analytics?.total_active            ?? 0
  const headMax       = Math.max(...headcountData.map(d => d.value), 1)
  const payMax        = Math.max(...payrollData.map(d => d.value), 1)

  const FORMAT_CFG: Record<OutputFormat, { bg: string; color: string; border: string }> = {
    Excel: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    PDF:   { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
    CSV:   { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  }

  const toggleDept = (id: string) =>
    setSelectedDeptIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const toggleField = (id: string) =>
    setSelectedFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const openGenerate = (name: string, type: string) => {
    setSelectedReport({ name, type })
    setShowGenerateModal(true)
  }

  /* ── Core generate function ── */
  const handleGenerate = useCallback(async (apiType: string, forcePreview = false) => {
    if (apiType === 'attendance' && (!dateFrom || !dateTo)) {
      toast.error('Attendance report requires Date From and Date To')
      return
    }
    setGenerating(true)
    try {
      const payload: Record<string, unknown> = { report_type: apiType, format: 'json' }
      if (dateFrom)               payload.date_from       = dateFrom
      if (dateTo)                 payload.date_to         = dateTo
      if (selectedDeptIds.length) payload.department_ids  = selectedDeptIds
      if (selectedFields.length)  payload.fields          = selectedFields

      const res  = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

      const data: Record<string, unknown>[] = json.data ?? []
      const slug = `${apiType}_${new Date().toISOString().slice(0, 10)}`
      const meta: PreviewMeta = {
        type: apiType, count: json.record_count ?? data.length, generatedAt: json.generated_at ?? new Date().toISOString(),
      }

      if (!forcePreview && (outputFormat === 'CSV' || outputFormat === 'Excel')) {
        triggerDownload(toCSV(data), `${slug}.csv`)
        toast.success(`${data.length} records exported as CSV`)
        setShowGenerateModal(false)
      } else {
        setPreviewData(data)
        setPreviewMeta(meta)
        setShowGenerateModal(false)
        setShowPreviewModal(true)
        if (outputFormat === 'PDF') {
          toast.success(`${data.length} records loaded — use "Print / PDF" to save`)
        } else {
          toast.success(`Report generated — ${data.length} records`)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }, [dateFrom, dateTo, selectedDeptIds, selectedFields, outputFormat])

  /* ── Format Toggle (shared) ── */
  function FormatToggle() {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {(['Excel', 'PDF', 'CSV'] as OutputFormat[]).map(f => {
          const active = outputFormat === f
          const c = FORMAT_CFG[f]
          return (
            <button key={f} onClick={() => setOutputFormat(f)} style={{
              flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600,
              cursor: 'pointer', border: `2px solid ${active ? c.border : '#e5e7eb'}`,
              background: active ? c.bg : '#f9fafb', color: active ? c.color : '#6b7280', transition: 'all 150ms',
            }}>{f}</button>
          )
        })}
      </div>
    )
  }

  /* ── Preview columns / rows ── */
  const previewCols = previewData.length > 0
    ? Array.from(new Set(previewData.slice(0, 5).flatMap(r => Object.keys(flattenRow(r))))).slice(0, 9)
    : []
  const previewRows = previewData.slice(0, 50)

  return (
    <>
      {/* ── Generate Modal ── */}
      {showGenerateModal && (
        <Modal
          title={selectedReport ? `Generate — ${selectedReport.name}` : 'Generate Report'}
          onClose={() => setShowGenerateModal(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selectedReport && (
              <div style={{ padding: '9px 14px', borderRadius: 9, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d4ed8', margin: 0 }}>{selectedReport.name}</p>
              </div>
            )}

            <div>
              <label style={LBL}>
                Period
                {selectedReport?.type === 'attendance' && (
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#dc2626', marginLeft: 4 }}>* required for attendance</span>
                )}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <input type="date" style={FIELD} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 3, display: 'block' }}>From</span>
                </div>
                <div>
                  <input type="date" style={FIELD} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 3, display: 'block' }}>To</span>
                </div>
              </div>
            </div>

            <div>
              <label style={LBL}>Output Format</label>
              <FormatToggle />
              {outputFormat === 'PDF' && (
                <p style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: 6 }}>
                  PDF preview will open — use browser Print (Ctrl+P) to save as PDF.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1.5px solid #f1f5f9', marginTop: 4 }}>
              <button onClick={() => setShowGenerateModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={generating}>Cancel</button>
              <button
                onClick={() => handleGenerate(selectedReport?.type ?? REPORT_TYPE_API[reportType], false)}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {generating
                  ? <><Spinner size={14} /> Generating…</>
                  : <><Download size={13} /> Generate &amp; Download</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Data Preview Modal ── */}
      {showPreviewModal && (
        <Modal
          title={`Report Preview — ${previewMeta.count.toLocaleString()} records`}
          wide
          onClose={() => setShowPreviewModal(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Meta badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Type',      previewMeta.type],
                ['Records',   previewMeta.count.toLocaleString()],
                ['Generated', new Date(previewMeta.generatedAt).toLocaleString('en-IN')],
              ].map(([k, v]) => (
                <span key={k} style={{ fontSize: '0.775rem', color: '#6b7280', background: '#f9fafb', padding: '4px 12px', borderRadius: 7, border: '1px solid #e5e7eb' }}>
                  {k}: <strong style={{ color: '#111827' }}>{v}</strong>
                </span>
              ))}
            </div>

            {/* Download actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => triggerDownload(toCSV(previewData), `${previewMeta.type}_${new Date().toISOString().slice(0,10)}.csv`)}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                <Download size={12} /> Download CSV
              </button>
              <button
                onClick={() => triggerDownload(toJSON(previewData), `${previewMeta.type}_${new Date().toISOString().slice(0,10)}.json`, 'application/json')}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                <Download size={12} /> Download JSON
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                <FileSpreadsheet size={12} /> Print / PDF
              </button>
            </div>

            {/* Table */}
            {previewData.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', background: '#f9fafb', borderRadius: 10, border: '1.5px dashed #e5e7eb' }}>
                <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.35, color: '#6b7280' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>No records returned for the selected filters.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1.5px solid #e5e7eb', maxHeight: 420 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                        {previewCols.map(h => (
                          <th key={h} style={{
                            padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#374151',
                            textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.67rem',
                            whiteSpace: 'nowrap', borderBottom: '2px solid #e5e7eb',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => {
                        const flat = flattenRow(row)
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            {previewCols.map(h => (
                              <td key={h} style={{ padding: '7px 12px', color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {flat[h] || '—'}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 50 && (
                  <p style={{ fontSize: '0.73rem', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                    Showing first 50 of {previewData.length} records — download CSV for full dataset.
                  </p>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <Modal title="Schedule Report" onClose={() => setShowScheduleModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LBL}>Report Type</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...FIELD, appearance: 'none', paddingRight: 30, cursor: 'pointer' }}>
                  {QUICK_REPORTS.map(r => <option key={r.name}>{r.name}</option>)}
                </select>
                {CHEVRON}
              </div>
            </div>
            <div>
              <label style={LBL}>Frequency</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...FIELD, appearance: 'none', paddingRight: 30, cursor: 'pointer' }}>
                  {['Daily', 'Weekly (Monday)', 'Monthly (1st)', 'Monthly (Last Day)', 'Quarterly'].map(o => <option key={o}>{o}</option>)}
                </select>
                {CHEVRON}
              </div>
            </div>
            <div>
              <label style={LBL}>
                Recipients
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af', fontSize: '0.7rem', marginLeft: 4 }}>
                  (comma-separated emails)
                </span>
              </label>
              <input type="text" style={FIELD} placeholder="hr@company.com, ceo@company.com" />
            </div>
            <div>
              <label style={LBL}>Output Format</label>
              <FormatToggle />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1.5px solid #f1f5f9', marginTop: 4 }}>
              <button onClick={() => setShowScheduleModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => { toast.success('Schedule saved successfully'); setShowScheduleModal(false) }}
                className="btn btn-primary btn-sm"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Bell size={13} /> Save Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Topbar ── */}
      <Topbar
        title="Reports & Analytics"
        subtitle="Generate, schedule, and analyse HR reports"
        notificationCount={deadlines.filter(d => d.status === 'red').length}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} style={{ animation: analyticsLoading ? 'spin 0.7s linear infinite' : undefined }} />
              Refresh
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={14} /> Schedule Report
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setSelectedReport(null); setShowGenerateModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Play size={14} /> Generate Report
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── Quick Reports ── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Quick Reports</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {QUICK_REPORTS.map(report => (
              <div key={report.name} className="card card-interactive" style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: report.cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: report.cfg.color, flexShrink: 0 }}>
                  {report.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 3 }}>{report.name}</p>
                  <p style={{ fontSize: '0.775rem', color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>{report.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => openGenerate(report.name, report.type)} className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: '0.775rem' }}>
                      Generate
                    </button>
                    <button onClick={() => setShowScheduleModal(true)} style={{ fontSize: '0.775rem', color: '#1E3A5F', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Analytics Overview ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Analytics Overview</p>
            {analyticsLoading && <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}><Spinner size={13} /> Loading live data…</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

            {/* Headcount Trend */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Headcount Trend</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 16 }}>
                {analyticsLoading ? 'Loading…' : `Current: ${totalActive} active employees`}
              </p>
              {analyticsLoading ? (
                <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size={24} />
                </div>
              ) : headcountData.length === 0 ? (
                <div style={{ height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                  <BarChart3 size={28} style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: '0.75rem', margin: 0, color: '#9ca3af' }}>No payroll runs found</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
                  {headcountData.map(d => {
                    const pct = (d.value / headMax) * 100
                    return (
                      <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.62rem', color: '#374151', fontWeight: 600 }}>{d.value}</span>
                        <div style={{ width: '100%', height: `${pct}%`, background: '#1E3A5F', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`${d.month}: ${d.value}`} />
                        <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{d.month}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Payroll Trend */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Monthly Payroll Trend</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 16 }}>Net pay — last 6 months</p>
              {analyticsLoading ? (
                <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size={24} />
                </div>
              ) : payrollData.length === 0 ? (
                <div style={{ height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                  <IndianRupee size={28} style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: '0.75rem', margin: 0, color: '#9ca3af' }}>No payroll runs found</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
                    {payrollData.map(d => {
                      const pct = (d.value / payMax) * 100
                      return (
                        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '0.6rem', color: '#374151', fontWeight: 600 }}>{d.label}</span>
                          <div style={{ width: '100%', height: `${pct}%`, background: '#E8622A', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`${d.month}: ${d.label}`} />
                          <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{d.month}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>Net pay per payroll run</p>
                </>
              )}
            </div>

            {/* Department Distribution */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Department Distribution</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 16 }}>
                {analyticsLoading ? 'Loading…' : `${totalActive} active employees`}
              </p>
              {analyticsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
                  <Spinner size={24} />
                </div>
              ) : deptData.length === 0 ? (
                <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                  <Users size={24} style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: '0.75rem', margin: 0, color: '#9ca3af' }}>No department data</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {deptData.slice(0, 7).map(d => (
                    <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', color: '#4b5563', width: 108, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.dept}</span>
                      <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: 99, transition: 'width 600ms ease' }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', minWidth: 54, textAlign: 'right', whiteSpace: 'nowrap' }}>{d.count} ({d.pct}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Compliance Deadlines ── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Compliance Deadlines</p>
          <div className="card" style={{ overflow: 'hidden' }}>
            {deadlines.map((item, i) => {
              const c = DEADLINE_CFG[item.status]
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px',
                  background: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: i < deadlines.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.8375rem', fontWeight: 600, color: c.text, margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: '0.74rem', color: '#6b7280', margin: '2px 0 0' }}>Due: {item.due}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: c.badge, color: c.badgeColor }}>
                      {item.overdue ? `${item.days}d overdue` : `${item.days}d away`}
                    </span>
                    <button
                      onClick={() => openGenerate('Statutory Compliance Report', 'statutory')}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '4px 12px', fontSize: '0.775rem' }}>
                      {item.action}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Custom Report Builder ── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Custom Report Builder</p>
          <div className="card" style={{ padding: '22px 24px' }}>

            {/* Type + Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={LBL}>Report Type</label>
                <div style={{ position: 'relative' }}>
                  <select style={{ ...FIELD, appearance: 'none', paddingRight: 30, cursor: 'pointer' }}
                    value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
                    {(['Employee', 'Attendance', 'Payroll', 'Leave', 'Compliance'] as ReportType[]).map(t => <option key={t}>{t}</option>)}
                  </select>
                  {CHEVRON}
                </div>
              </div>
              <div>
                <label style={LBL}>
                  Date From
                  {reportType === 'Attendance' && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
                </label>
                <input type="date" style={FIELD} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={LBL}>
                  Date To
                  {reportType === 'Attendance' && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
                </label>
                <input type="date" style={FIELD} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>

            {/* Department Filter */}
            <div style={{ marginBottom: 18 }}>
              <label style={LBL}>
                Department Filter
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af', fontSize: '0.7rem', marginLeft: 4 }}>
                  ({selectedDeptIds.length === 0 ? 'all departments' : `${selectedDeptIds.length} selected`})
                </span>
              </label>
              {departments.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>Loading departments…</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <button
                    onClick={() => setSelectedDeptIds([])}
                    style={{
                      padding: '5px 13px', borderRadius: 99, fontSize: '0.775rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 150ms',
                      border: `1.5px solid ${selectedDeptIds.length === 0 ? '#1E3A5F' : '#e5e7eb'}`,
                      background: selectedDeptIds.length === 0 ? '#1E3A5F' : 'white',
                      color:      selectedDeptIds.length === 0 ? 'white' : '#6b7280',
                    }}>All</button>
                  {departments.map(dept => {
                    const active = selectedDeptIds.includes(dept.id)
                    return (
                      <button key={dept.id} onClick={() => toggleDept(dept.id)} style={{
                        padding: '5px 13px', borderRadius: 99, fontSize: '0.775rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 150ms',
                        border: `1.5px solid ${active ? '#1E3A5F' : '#e5e7eb'}`,
                        background: active ? '#1E3A5F' : 'white',
                        color:      active ? 'white' : '#6b7280',
                      }}>{dept.name}</button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Fields */}
            <div style={{ marginBottom: 18 }}>
              <label style={LBL}>Fields to Include</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {REPORT_FIELDS.map(field => {
                  const checked = selectedFields.includes(field.id)
                  return (
                    <label key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                      <div onClick={() => toggleField(field.id)} style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                        border: `2px solid ${checked ? '#1E3A5F' : '#d1d5db'}`,
                        background: checked ? '#1E3A5F' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                      }}>
                        {checked && <Check size={10} color="white" />}
                      </div>
                      <span style={{ fontSize: '0.775rem', color: '#374151' }}>{field.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Output Format */}
            <div style={{ marginBottom: 20 }}>
              <label style={LBL}>Output Format</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Excel', 'PDF', 'CSV'] as OutputFormat[]).map(f => {
                  const active = outputFormat === f
                  const c = FORMAT_CFG[f]
                  return (
                    <button key={f} onClick={() => setOutputFormat(f)} style={{
                      padding: '8px 20px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 150ms',
                      border: `2px solid ${active ? c.border : '#e5e7eb'}`,
                      background: active ? c.bg : '#f9fafb', color: active ? c.color : '#6b7280',
                    }}>{f}</button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 18, borderTop: '1.5px solid #f1f5f9' }}>
              <button
                onClick={() => handleGenerate(REPORT_TYPE_API[reportType], false)}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {generating
                  ? <><Spinner size={14} /> Generating…</>
                  : <><Play size={13} /> Generate Custom Report</>}
              </button>
              <button
                onClick={() => handleGenerate(REPORT_TYPE_API[reportType], true)}
                disabled={generating}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={13} /> Preview Data
              </button>
            </div>
          </div>
        </div>

        {/* ── Scheduled Reports ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Scheduled Reports</p>
            <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={13} /> Add Schedule
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {['Report Name', 'Frequency', 'Next Run', 'Recipients', 'Format', 'Status', 'Actions'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHEDULED_REPORTS.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{r.name}</td>
                    <td style={{ color: '#4b5563' }}>{r.frequency}</td>
                    <td style={{ color: '#4b5563', whiteSpace: 'nowrap' }}>{r.nextRun}</td>
                    <td style={{ fontSize: '0.775rem', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recipients}</td>
                    <td>
                      <span className="badge" style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}>{r.format}</span>
                    </td>
                    <td>
                      <span className="badge badge-dot" style={{
                        background: r.status === 'Active' ? '#f0fdf4' : '#f9fafb',
                        color:      r.status === 'Active' ? '#15803d' : '#6b7280',
                        border:     `1px solid ${r.status === 'Active' ? '#bbf7d0' : '#e5e7eb'}`,
                      }}>{r.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit"><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Delete" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                        <button
                          onClick={() => openGenerate(r.name, QUICK_REPORTS.find(q => q.name === r.name)?.type ?? 'employee_master')}
                          className="btn btn-ghost btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.775rem' }}>
                          <Play size={12} /> Run Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}
