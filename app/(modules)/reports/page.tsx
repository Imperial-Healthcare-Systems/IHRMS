'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { reportsApi } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Users, Clock, IndianRupee, CalendarDays, BarChart3, Shield,
  Download, Bell, Play, X, Check, Edit, Trash2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type OutputFormat = 'Excel' | 'PDF' | 'CSV'
type ReportType = 'Employee' | 'Attendance' | 'Payroll' | 'Leave' | 'Performance' | 'Compliance'

interface ScheduledReport {
  id: number; name: string; frequency: string; nextRun: string
  recipients: string; format: string; status: 'Active' | 'Paused'
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const QUICK_REPORTS = [
  { icon: <Users size={20} />,       name: 'Employee Master Report',      description: 'Complete employee directory with all details',  cfg: { bg: '#eff6ff', color: '#1d4ed8' } },
  { icon: <Clock size={20} />,       name: 'Monthly Attendance Report',   description: 'Attendance summary for all employees',           cfg: { bg: '#f0fdf4', color: '#15803d' } },
  { icon: <IndianRupee size={20} />, name: 'Payroll Summary Report',      description: 'Salary, deductions, net pay by department',     cfg: { bg: '#f5f3ff', color: '#6d28d9' } },
  { icon: <CalendarDays size={20} />,name: 'Leave Balance Report',        description: 'Leave balances for all employees',              cfg: { bg: '#fffbeb', color: '#b45309' } },
  { icon: <BarChart3 size={20} />,   name: 'Headcount Report',            description: 'Department/designation/location breakdowns',    cfg: { bg: '#eef2ff', color: '#4338ca' } },
  { icon: <Shield size={20} />,      name: 'Statutory Compliance Report', description: 'EPF, ESIC, PT, TDS summaries',                 cfg: { bg: '#fef2f2', color: '#b91c1c' } },
]

const HEADCOUNT_DATA = [
  { month: 'Oct', value: 225 }, { month: 'Nov', value: 230 }, { month: 'Dec', value: 235 },
  { month: 'Jan', value: 240 }, { month: 'Feb', value: 244 }, { month: 'Mar', value: 248 },
]
const PAYROLL_DATA = [
  { month: 'Oct', value: 38, label: '₹38L' }, { month: 'Nov', value: 39, label: '₹39L' },
  { month: 'Dec', value: 45, label: '₹45L' }, { month: 'Jan', value: 40, label: '₹40L' },
  { month: 'Feb', value: 41, label: '₹41L' }, { month: 'Mar', value: 42.5, label: '₹42.5L' },
]
const DEPARTMENT_DATA = [
  { dept: 'Engineering',      count: 72, pct: 29,   color: '#1E3A5F' },
  { dept: 'Sales',            count: 48, pct: 19.4, color: '#E8622A' },
  { dept: 'Operations',       count: 40, pct: 16.1, color: '#1A7A4A' },
  { dept: 'Customer Support', count: 35, pct: 14.1, color: '#7C3AED' },
  { dept: 'Finance',          count: 28, pct: 11.3, color: '#0369A1' },
  { dept: 'HR',               count: 15, pct: 6,    color: '#BE185D' },
  { dept: 'Marketing',        count: 10, pct: 4,    color: '#0F766E' },
]

const DEADLINE_CFG = {
  red:   { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c', badge: '#fee2e2', badgeColor: '#b91c1c' },
  amber: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', text: '#b45309', badge: '#fef3c7', badgeColor: '#b45309' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: '#15803d', badge: '#dcfce7', badgeColor: '#15803d' },
}

const COMPLIANCE_DEADLINES = [
  { status: 'red'   as const, label: 'EPF Monthly Return (Form 12A)',          due: 'Apr 15, 2026', days: 14, action: 'Download' },
  { status: 'red'   as const, label: 'ESIC Monthly Contribution',               due: 'Apr 15, 2026', days: 14, action: 'Download' },
  { status: 'amber' as const, label: 'Professional Tax Challan (Karnataka)',    due: 'Apr 30, 2026', days: 29, action: 'Download' },
  { status: 'amber' as const, label: 'TDS Return Q4 (Form 24Q)',                due: 'May 31, 2026', days: 60, action: 'Prepare'  },
  { status: 'green' as const, label: 'Form 16 Issue to Employees',              due: 'Jun 15, 2026', days: 75, action: 'Generate' },
  { status: 'green' as const, label: 'EPF Annual Return',                       due: 'Apr 30, 2026', days: 29, action: 'Download' },
]

const SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 1, name: 'Monthly Attendance Report', frequency: 'Monthly (1st)',      nextRun: 'May 1, 2026',  recipients: 'hr@company.com, ceo@company.com', format: 'Excel', status: 'Active' },
  { id: 2, name: 'Payroll Summary',           frequency: 'Monthly (Last Day)', nextRun: 'Apr 30, 2026', recipients: 'finance@company.com',             format: 'PDF',   status: 'Active' },
  { id: 3, name: 'Headcount Report',          frequency: 'Weekly (Monday)',    nextRun: 'Apr 6, 2026',  recipients: 'management@company.com',          format: 'Excel', status: 'Paused' },
]

const ALL_DEPARTMENTS = ['All', 'Engineering', 'HR', 'Sales', 'Finance', 'Operations', 'Marketing', 'Customer Support']

const REPORT_FIELDS = [
  { id: 'empId',       label: 'Employee ID'  },
  { id: 'name',        label: 'Name'         },
  { id: 'department',  label: 'Department'   },
  { id: 'designation', label: 'Designation'  },
  { id: 'joinDate',    label: 'Join Date'    },
  { id: 'salary',      label: 'Salary'       },
  { id: 'manager',     label: 'Manager'      },
  { id: 'location',    label: 'Location'     },
  { id: 'pf',          label: 'PF Number'    },
  { id: 'esic',        label: 'ESIC Number'  },
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
  <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
)

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'white', display: 'flex', flexDirection: 'column', width: 460, maxWidth: '95vw', maxHeight: '92vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1.5px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><X size={13} /></button>
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
  const [reportType, setReportType]           = useState<ReportType>('Employee')
  const [dateFrom,   setDateFrom]             = useState('')
  const [dateTo,     setDateTo]               = useState('')
  const [selectedDepts, setSelectedDepts]     = useState<string[]>(['All'])
  const [selectedFields, setSelectedFields]   = useState<string[]>(['empId', 'name', 'department', 'designation'])
  const [outputFormat, setOutputFormat]       = useState<OutputFormat>('Excel')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedReport, setSelectedReport]   = useState('')

  const headcountMax = Math.max(...HEADCOUNT_DATA.map(d => d.value))
  const payrollMax   = Math.max(...PAYROLL_DATA.map(d => d.value))

  const FORMAT_CFG: Record<OutputFormat, { bg: string; color: string; border: string }> = {
    Excel: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    PDF:   { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
    CSV:   { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  }

  const toggleDept = (dept: string) => {
    if (dept === 'All') { setSelectedDepts(['All']); return }
    setSelectedDepts(prev => {
      const without = prev.filter(d => d !== 'All')
      if (without.includes(dept)) {
        const next = without.filter(d => d !== dept)
        return next.length === 0 ? ['All'] : next
      }
      return [...without, dept]
    })
  }
  const toggleField = (id: string) =>
    setSelectedFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const [generating, setGenerating] = useState(false)

  const openGenerate = (name: string) => { setSelectedReport(name); setShowGenerateModal(true) }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await reportsApi.generate({
        type: selectedReport || reportType.toLowerCase(),
        from: dateFrom || undefined,
        to: dateTo || undefined,
        format: outputFormat.toLowerCase(),
      })
      toast.success('Report generated successfully')
      setShowGenerateModal(false)
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  /* ── Format Toggle reused in modals ── */
  function FormatToggle() {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {(['Excel', 'PDF', 'CSV'] as OutputFormat[]).map(f => {
          const active = outputFormat === f
          const c = FORMAT_CFG[f]
          return (
            <button key={f} onClick={() => setOutputFormat(f)}
              style={{
                flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer', border: `2px solid ${active ? c.border : '#e5e7eb'}`,
                background: active ? c.bg : '#f9fafb', color: active ? c.color : '#6b7280',
                transition: 'all 150ms',
              }}>{f}</button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* ── Generate Modal ── */}
      {showGenerateModal && (
        <Modal title="Generate Report" onClose={() => setShowGenerateModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selectedReport && (
              <div style={{ padding: '10px 14px', borderRadius: 9, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d4ed8', margin: 0 }}>{selectedReport}</p>
              </div>
            )}
            <div>
              <label style={LBL}>Period</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input type="date" style={FIELD} />
                <input type="date" style={FIELD} />
              </div>
            </div>
            <div>
              <label style={LBL}>Output Format</label>
              <FormatToggle />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1.5px solid #f1f5f9', marginTop: 4 }}>
              <button onClick={() => setShowGenerateModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={generating}>Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className="btn btn-primary btn-sm" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={13} /> {generating ? 'Generating…' : 'Generate & Download'}
              </button>
            </div>
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
              <label style={LBL}>Recipients <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(comma-separated emails)</span></label>
              <input type="text" style={FIELD} placeholder="hr@company.com, ceo@company.com" />
            </div>
            <div>
              <label style={LBL}>Output Format</label>
              <FormatToggle />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1.5px solid #f1f5f9', marginTop: 4 }}>
              <button onClick={() => setShowScheduleModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Bell size={13} /> Save Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Topbar
        title="Reports & Analytics"
        subtitle="Generate, schedule, and analyse HR reports"
        notificationCount={0}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)}>
              <Bell size={14} />
              Schedule Report
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setSelectedReport(''); setShowGenerateModal(true) }}>
              <Play size={14} />
              Generate Report
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
                    <button onClick={() => openGenerate(report.name)} className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: '0.775rem' }}>Generate</button>
                    <button onClick={() => setShowScheduleModal(true)} style={{ fontSize: '0.775rem', color: '#1E3A5F', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Schedule</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Analytics Overview ── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Analytics Overview</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

            {/* Headcount Trend */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Headcount Trend</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 16 }}>Last 6 months</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
                {HEADCOUNT_DATA.map(d => {
                  const pct = (d.value / headcountMax) * 100
                  return (
                    <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.62rem', color: '#374151', fontWeight: 600 }}>{d.value}</span>
                      <div style={{ width: '100%', height: `${pct}%`, background: '#1E3A5F', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`${d.month}: ${d.value}`} />
                      <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{d.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payroll Trend */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Monthly Payroll Trend</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 16 }}>Last 6 months</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
                {PAYROLL_DATA.map(d => {
                  const pct = (d.value / payrollMax) * 100
                  return (
                    <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.6rem', color: '#374151', fontWeight: 600 }}>{d.label}</span>
                      <div style={{ width: '100%', height: `${pct}%`, background: d.month === 'Dec' ? '#6d28d9' : '#E8622A', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`${d.month}: ${d.label}`} />
                      <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{d.month}</span>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>Dec includes annual bonus payout</p>
            </div>

            {/* Department Distribution */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: 2 }}>Department Distribution</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 16 }}>Total: 248 employees</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {DEPARTMENT_DATA.map(d => (
                  <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', width: 108, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.dept}</span>
                    <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#6b7280', minWidth: 52, textAlign: 'right', whiteSpace: 'nowrap' }}>{d.count} ({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Compliance Deadlines ── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Compliance Deadlines</p>
          <div className="card" style={{ overflow: 'hidden' }}>
            {COMPLIANCE_DEADLINES.map((item, i) => {
              const c = DEADLINE_CFG[item.status]
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom: i < COMPLIANCE_DEADLINES.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                      {item.days}d away
                    </span>
                    <button className="btn btn-outline btn-sm" style={{ padding: '4px 12px', fontSize: '0.775rem' }}>
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
                  <select style={{ ...FIELD, appearance: 'none', paddingRight: 30, cursor: 'pointer' }} value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
                    {(['Employee', 'Attendance', 'Payroll', 'Leave', 'Performance', 'Compliance'] as ReportType[]).map(t => <option key={t}>{t}</option>)}
                  </select>
                  {CHEVRON}
                </div>
              </div>
              <div>
                <label style={LBL}>Date From</label>
                <input type="date" style={FIELD} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Date To</label>
                <input type="date" style={FIELD} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>

            {/* Department Filter */}
            <div style={{ marginBottom: 18 }}>
              <label style={LBL}>Department Filter</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {ALL_DEPARTMENTS.map(dept => {
                  const active = selectedDepts.includes(dept)
                  return (
                    <button key={dept} onClick={() => toggleDept(dept)}
                      style={{
                        padding: '5px 13px', borderRadius: 99, fontSize: '0.775rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 150ms',
                        border: `1.5px solid ${active ? '#1E3A5F' : '#e5e7eb'}`,
                        background: active ? '#1E3A5F' : 'white', color: active ? 'white' : '#6b7280',
                      }}>
                      {dept}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fields */}
            <div style={{ marginBottom: 18 }}>
              <label style={LBL}>Fields to Include</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {REPORT_FIELDS.map(field => {
                  const checked = selectedFields.includes(field.id)
                  return (
                    <label key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                      <div onClick={() => toggleField(field.id)}
                        style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                          border: `2px solid ${checked ? '#1E3A5F' : '#d1d5db'}`,
                          background: checked ? '#1E3A5F' : 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms',
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
                    <button key={f} onClick={() => setOutputFormat(f)}
                      style={{
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
              <button onClick={handleGenerate} disabled={generating} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={13} /> {generating ? 'Generating…' : 'Generate Custom Report'}
              </button>
              <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bell size={13} /> Save as Template
              </button>
            </div>
          </div>
        </div>

        {/* ── Scheduled Reports ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scheduled Reports</p>
            <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)}>
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
                        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.775rem' }}>
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
