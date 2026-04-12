'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Award, UserX, X, Plus, Shield, Zap, Clock, CheckCircle,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type WarnTab = 'warnings' | 'appreciation' | 'termination' | 'rules'

interface ApiWarning {
  id: string
  subject: string
  issued_date: string
  description: string | null
  status: string
  acknowledged_at: string | null
  employee_remarks: string | null
  [key: string]: unknown   // allow extra columns returned by SELECT *
  employee: {
    id: string; first_name: string; last_name: string; emp_id: string
    department: { id: string; name: string } | null
    designation: { id: string; title: string } | null
  } | null
  issued_by: { id: string; first_name: string; last_name: string; emp_id: string } | null
  created_at: string
  updated_at: string
}

interface ApiEmployee {
  id: string; first_name: string; last_name: string; emp_id: string
  department: { id: string; name: string } | null
}

interface ApiAppreciation {
  id: string
  category: string
  subject: string
  description: string | null
  is_public: boolean
  created_at: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
  given_by:  { id: string; first_name: string; last_name: string; emp_id: string } | null
}

/* ─────────────────────────────────────────────────────────────
   STATIC DATA (Rules only — no DB table)
───────────────────────────────────────────────────────────── */
const AUTO_RULES = [
  { id: 1, name: 'Warning Threshold',   condition: '3 warnings within a calendar year',             action: 'Generate termination draft and send for HR approval',                    active: true,  lastTriggered: 'Mar 10, 2026' },
  { id: 2, name: 'Attendance Rule',     condition: 'Absent > 5 consecutive days without leave',     action: 'Auto-generate 1st Written Warning and notify manager',                   active: true,  lastTriggered: 'Jan 6, 2026'  },
  { id: 3, name: 'Probation Failure',   condition: 'Probation review rating: Unsatisfactory',       action: 'Extend probation by 3 months OR initiate exit process',                  active: true,  lastTriggered: 'Never'         },
  { id: 4, name: 'Appraisal Action',    condition: 'Annual review rating: Unsatisfactory (1)',      action: 'Auto-create PIP (Performance Improvement Plan) with 90-day timeline',    active: true,  lastTriggered: 'Dec 31, 2025' },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Badge components ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    issued:       { bg: '#fffbeb', color: '#d97706' },
    acknowledged: { bg: '#f0fdf4', color: '#16a34a' },
    draft:        { bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status.toLowerCase()] ?? { bg: '#f3f4f6', color: '#6b7280' }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>{label}</span>
}

function ApprecCategoryBadge({ category }: { category: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Excellence: { bg: '#fffbeb', color: '#d97706' },
    Teamwork:   { bg: '#eff6ff', color: '#2563eb' },
    Innovation: { bg: '#faf5ff', color: '#7c3aed' },
    Customer:   { bg: '#ecfdf5', color: '#059669' },
    Leadership: { bg: '#fff1f2', color: '#e11d48' },
  }
  const s = map[category] ?? { bg: '#f3f4f6', color: '#374151' }
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{category}</span>
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: { bg: string; icon: string; border: string } }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color.border}`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color.icon} />
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</p>
      </div>
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
function ModalHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '3px 0 0' }}>{sub}</p>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, display: 'flex' }}><X size={18} /></button>
    </div>
  )
}
function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>{children}</div>
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const INP: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box' }
const BTN_PRIMARY: React.CSSProperties = { background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }
const BTN_OUTLINE: React.CSSProperties = { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }
const BTN_DANGER: React.CSSProperties = { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function WarningsPage() {
  const { data: session } = useSession()
  const sessionUserId = (session?.user as Record<string, unknown>)?.id as string | undefined
  const isAdmin       = (session?.user as Record<string, unknown>)?.isAdmin as boolean | undefined

  const [activeTab, setActiveTab] = useState<WarnTab>('warnings')
  const [loading, setLoading] = useState(true)

  /* ── Data ── */
  const [warnings,      setWarnings]      = useState<ApiWarning[]>([])
  const [appreciations, setAppreciations] = useState<ApiAppreciation[]>([])
  const [employees,     setEmployees]     = useState<ApiEmployee[]>([])

  /* ── Warning detail modal ── */
  const [selectedWarn, setSelectedWarn] = useState<ApiWarning | null>(null)
  const [showWarnDetail, setShowWarnDetail] = useState(false)

  /* ── Issue Warning modal ── */
  const [showWarnModal, setShowWarnModal] = useState(false)
  const [warnEmployeeId, setWarnEmployeeId] = useState('')
  const [incidentDate,  setIncidentDate]    = useState('')
  const [warnSubject,   setWarnSubject]     = useState('')
  const [warnDesc,      setWarnDesc]        = useState('')
  const [savingWarn,    setSavingWarn]      = useState(false)

  /* ── Appreciation modal ── */
  const [showApprecModal, setShowApprecModal] = useState(false)
  const [apprecEmployee,  setApprecEmployee]  = useState('')
  const [apprecCategory,  setApprecCategory]  = useState('Excellence')
  const [apprecSubject,   setApprecSubject]   = useState('')
  const [apprecDesc,      setApprecDesc]      = useState('')
  const [apprecPublic,    setApprecPublic]    = useState(true)
  const [savingApprec] = useState(false)

  /* ── Rules toggles ── */
  const [ruleToggles, setRuleToggles] = useState<Record<number, boolean>>(
    Object.fromEntries(AUTO_RULES.map(r => [r.id, r.active]))
  )

  /* ─── Fetch ─── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, eRes] = await Promise.all([
        fetch('/api/warnings?limit=100'),
        fetch('/api/employees?limit=200'),
      ])
      const wJson = await wRes.json()
      const eJson = await eRes.json()
      setWarnings(wJson.data ?? [])
      setEmployees(eJson.data ?? [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ─── Derived stats ─── */
  const currentYear = new Date().getFullYear()
  const thisYearWarnings = warnings.filter(w => (w.issued_date as string)?.startsWith(String(currentYear)))
  const issuedCount      = thisYearWarnings.filter(w => w.status === 'issued').length
  const acknowledgedCount= thisYearWarnings.filter(w => w.status === 'acknowledged').length

  // Employees with 3+ warnings → auto-termination
  const warnCountByEmp: Record<string, { count: number; emp: ApiWarning['employee']; latest: string }> = {}
  for (const w of thisYearWarnings) {
    if (!w.employee) continue
    const eid = w.employee.id
    const wDate = (w.issued_date as string) ?? ''
    if (!warnCountByEmp[eid]) warnCountByEmp[eid] = { count: 0, emp: w.employee, latest: wDate }
    warnCountByEmp[eid].count++
    if (wDate > warnCountByEmp[eid].latest) warnCountByEmp[eid].latest = wDate
  }
  const termCases = Object.values(warnCountByEmp).filter(v => v.count >= 3)

  /* ─── Handlers ─── */
  async function handleIssueWarning() {
    if (!warnEmployeeId || !warnSubject || !warnDesc) { toast.error('Employee, subject and description are required'); return }
    setSavingWarn(true)
    try {
      const res = await fetch('/api/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id:  warnEmployeeId,
          issued_by:    sessionUserId,
          date:         incidentDate || new Date().toISOString().split('T')[0],
          subject:      warnSubject,
          description:  warnDesc,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

      toast.success(json.auto_termination_triggered ? 'Warning issued — Auto-termination draft triggered!' : 'Warning letter issued successfully')
      setShowWarnModal(false)
      setWarnEmployeeId(''); setIncidentDate('')
      setWarnSubject(''); setWarnDesc('')
      fetchAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to issue warning')
    } finally { setSavingWarn(false) }
  }

  async function handleIssueFromDraft(id: string) {
    try {
      const res = await fetch('/api/warnings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'issue' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success('Warning issued')
      setWarnings(prev => prev.map(w => w.id === id ? { ...w, status: 'issued' } : w))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to issue warning')
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      const res = await fetch('/api/warnings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'acknowledge' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success('Warning acknowledged')
      setWarnings(prev => prev.map(w => w.id === id ? { ...w, status: 'acknowledged' } : w))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to acknowledge')
    }
  }

  const TABS: { key: WarnTab; label: string }[] = [
    { key: 'warnings',     label: 'Warning Letters' },
    { key: 'appreciation', label: 'Appreciation Notes' },
    { key: 'termination',  label: 'Termination Cases' },
    { key: 'rules',        label: 'Auto-Trigger Rules' },
  ]

  const selectedEmployee = employees.find(e => e.id === warnEmployeeId)
  const employeeWarnCount = warnEmployeeId
    ? thisYearWarnings.filter(w => w.employee?.id === warnEmployeeId).length
    : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Topbar
        title="Warnings & Employee Relations"
        subtitle="Manage disciplinary actions, appreciation, and compliance"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowApprecModal(true)}
              style={{ background: '#fff', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Award size={14} /> Give Appreciation
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowWarnModal(true)}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <AlertTriangle size={14} /> Issue Warning
              </button>
            )}
          </div>
        }
      />

      <div style={{ padding: '16px 16px', maxWidth: 1400, margin: '0 auto' }} className="sm:!px-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16, marginBottom: 28 }}>
          <SummaryCard label={`Warnings in ${currentYear}`}   value={loading ? '…' : thisYearWarnings.length} icon={AlertTriangle} color={{ bg: '#fef2f2', icon: '#dc2626', border: '#fecaca' }} />
          <SummaryCard label="Active (Issued)"                 value={loading ? '…' : issuedCount}             icon={Clock}        color={{ bg: '#fffbeb', icon: '#d97706', border: '#fde68a' }} />
          <SummaryCard label="Acknowledged"                    value={loading ? '…' : acknowledgedCount}        icon={CheckCircle}  color={{ bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' }} />
          <SummaryCard label="Auto-Termination Triggered"      value={loading ? '…' : termCases.length}         icon={UserX}        color={{ bg: '#fef2f2', icon: '#dc2626', border: '#fecaca' }} />
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 22px', fontSize: '0.875rem', fontWeight: 600,
                  color: activeTab === t.key ? '#E8622A' : '#6b7280',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: `2px solid ${activeTab === t.key ? '#E8622A' : 'transparent'}`,
                  background: 'none', cursor: 'pointer',
                }}
              >{t.label}</button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* ── TAB 1: Warning Letters ── */}
            {activeTab === 'warnings' && (
              <div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: 500, margin: 0 }}>
                    <strong>Auto-Termination Rule Active:</strong> Employees receiving 3 or more warnings within a calendar year will automatically have a termination draft generated and sent for HR approval.
                  </p>
                </div>

                {loading ? (
                  <p style={{ color: '#6b7280', padding: 24, textAlign: 'center' }}>Loading warnings…</p>
                ) : warnings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <AlertTriangle size={36} style={{ color: '#d1d5db', marginBottom: 12 }} />
                    <p style={{ color: '#6b7280', fontWeight: 500 }}>No warning letters issued yet.</p>
                    {isAdmin && <button onClick={() => setShowWarnModal(true)} style={{ ...BTN_DANGER, marginTop: 16 }}>Issue First Warning</button>}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Employee', 'Department', 'Date', 'Subject', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {warnings.map((w, i) => {
                          const empName = w.employee ? `${w.employee.first_name} ${w.employee.last_name}` : '—'
                          return (
                            <tr key={w.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{empName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{w.employee?.emp_id ?? ''}</div>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#6b7280' }}>{w.employee?.department?.name ?? '—'}</td>
                              <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(w.issued_date as string)}</td>
                              <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 220 }}>
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.subject}</span>
                              </td>
                              <td style={{ padding: '12px 14px' }}><StatusBadge status={w.status} /></td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => { setSelectedWarn(w); setShowWarnDetail(true) }}
                                    style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                                  >View</button>
                                  {w.status === 'draft' && isAdmin && (
                                    <button
                                      onClick={() => handleIssueFromDraft(w.id)}
                                      style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                                    >Issue</button>
                                  )}
                                  {w.status === 'issued' && w.employee?.id === sessionUserId && (
                                    <button
                                      onClick={() => handleAcknowledge(w.id)}
                                      style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                                    >Acknowledge</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: Appreciation Notes ── */}
            {activeTab === 'appreciation' && (
              <div>
                {loading ? (
                  <p style={{ color: '#6b7280', padding: 24, textAlign: 'center' }}>Loading…</p>
                ) : appreciations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                    <Award size={36} style={{ color: '#d1d5db', marginBottom: 12 }} />
                    <p style={{ fontWeight: 500 }}>No appreciations yet.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Use "Give Appreciation" to recognise a colleague.</p>
                    <button onClick={() => setShowApprecModal(true)} style={{ ...BTN_PRIMARY, background: '#16a34a', marginTop: 16 }}>Give First Appreciation</button>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto', marginBottom: 32 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ background: '#f9fafb' }}>
                            {['Employee', 'Department', 'Category', 'Date', 'Subject', 'Public', 'Given By'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {appreciations.map((a, i) => {
                            const empName    = a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '—'
                            const giverName  = a.given_by ? `${a.given_by.first_name} ${a.given_by.last_name}` : '—'
                            return (
                              <tr key={a.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{empName}</td>
                                <td style={{ padding: '12px 14px', color: '#6b7280' }}>{a.employee?.department?.name ?? '—'}</td>
                                <td style={{ padding: '12px 14px' }}><ApprecCategoryBadge category={a.category} /></td>
                                <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                                <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 220 }}>
                                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.subject}</span>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: a.is_public ? '#f0fdf4' : '#f9fafb', color: a.is_public ? '#16a34a' : '#6b7280', fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
                                    {a.is_public ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.8rem' }}>{giverName}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Wall of Fame */}
                    {appreciations.filter(a => a.is_public).length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                          <Award size={20} color="#d97706" />
                          <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', margin: 0 }}>Wall of Fame</h3>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Public recognitions visible to all employees</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                          {appreciations.filter(a => a.is_public).slice(0, 3).map(a => {
                            const empName   = a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '—'
                            const giverName = a.given_by ? `${a.given_by.first_name} ${a.given_by.last_name}` : '—'
                            const initials  = empName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            return (
                              <div key={a.id} style={{ background: 'linear-gradient(135deg, #fff9f0 0%, #fff 100%)', border: '1px solid #fde68a', borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, background: '#fef3c7', borderRadius: '50%', opacity: 0.5 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #E8622A 0%, #f59e0b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                                    {initials}
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>{empName}</p>
                                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>{a.employee?.department?.name ?? ''}</p>
                                  </div>
                                  <div style={{ marginLeft: 'auto' }}><ApprecCategoryBadge category={a.category} /></div>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>"{a.subject}"</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>{giverName}</p>
                                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{fmtDate(a.created_at)}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── TAB 3: Termination Cases ── */}
            {activeTab === 'termination' && (
              <div>
                {termCases.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Zap size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500, margin: 0 }}>
                      <strong>Auto-Generated Cases Detected:</strong> {termCases.length} employee{termCases.length > 1 ? 's have' : ' has'} exceeded 3 warnings in {currentYear}. Termination drafts have been automatically generated. Please review and take action.
                    </p>
                  </div>
                )}

                {termCases.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                    <UserX size={36} style={{ color: '#d1d5db', marginBottom: 12 }} />
                    <p style={{ fontWeight: 500 }}>No termination cases.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Auto-termination drafts appear here when an employee accumulates 3 or more warnings in a calendar year.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Employee', 'Department', 'Reason', 'Trigger', 'Warning Count', 'Created Date', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {termCases.map((tc, i) => {
                          const empName = tc.emp ? `${tc.emp.first_name} ${tc.emp.last_name}` : '—'
                          return (
                            <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{empName}</td>
                              <td style={{ padding: '12px 14px', color: '#6b7280' }}>{tc.emp?.department?.name ?? '—'}</td>
                              <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 220, fontSize: '0.82rem' }}>
                                {tc.count} warnings issued in calendar year {currentYear}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ background: '#faf5ff', color: '#7c3aed', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>Auto</span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.875rem', padding: '2px 8px', borderRadius: 6 }}>{tc.count}</span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(tc.latest)}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#E8622A', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Send to HR</button>
                                  <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: Auto-Trigger Rules ── */}
            {activeTab === 'rules' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Configure automated HR action rules. Changes take effect immediately.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {AUTO_RULES.map(rule => (
                    <div key={rule.id} style={{ background: '#fff', border: `1px solid ${ruleToggles[rule.id] ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: 12, padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 20, alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Shield size={16} color={ruleToggles[rule.id] ? '#2563eb' : '#9ca3af'} />
                          <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>{rule.name}</p>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                          <span style={{ fontWeight: 600, color: '#374151' }}>Trigger:</span> {rule.condition}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 4px', fontWeight: 600 }}>ACTION</p>
                        <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>{rule.action}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 6px', fontWeight: 500 }}>Last Triggered</p>
                        <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0, fontWeight: 500 }}>{rule.lastTriggered}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => setRuleToggles(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                          style={{ width: 48, height: 26, borderRadius: 999, background: ruleToggles[rule.id] ? '#16a34a' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                        >
                          <span style={{ position: 'absolute', top: 3, left: ruleToggles[rule.id] ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                        </button>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: ruleToggles[rule.id] ? '#16a34a' : '#9ca3af' }}>{ruleToggles[rule.id] ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal: Issue Warning ── */}
      {showWarnModal && (
        <ModalOverlay onClose={() => setShowWarnModal(false)}>
          <div style={{ width: 560 }}>
            <ModalHeader title="Issue Warning Letter" sub="A warning will be formally recorded and the employee notified" onClose={() => setShowWarnModal(false)} />
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '70vh' }}>
              {/* Warning count notice */}
              {employeeWarnCount >= 2 && selectedEmployee && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600, margin: 0 }}>
                    ⚠ {selectedEmployee.first_name} {selectedEmployee.last_name} already has {employeeWarnCount} warning{employeeWarnCount > 1 ? 's' : ''} in {currentYear}. Issuing this warning will trigger auto-termination!
                  </p>
                </div>
              )}
              <FormField label="Employee *">
                <select value={warnEmployeeId} onChange={e => setWarnEmployeeId(e.target.value)} style={INP}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.emp_id}){emp.department ? ` — ${emp.department.name}` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Incident Date">
                <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} style={INP} />
              </FormField>
              <FormField label="Subject *">
                <input value={warnSubject} onChange={e => setWarnSubject(e.target.value)} placeholder="Brief subject of the warning" style={INP} />
              </FormField>
              <FormField label="Detailed Description *">
                <textarea value={warnDesc} onChange={e => setWarnDesc(e.target.value)} rows={4} placeholder="Describe the incident, policy violation, and expected corrective action…" style={{ ...INP, resize: 'vertical' }} />
              </FormField>
            </div>
            <ModalFooter>
              <button style={BTN_OUTLINE} onClick={() => setShowWarnModal(false)}>Cancel</button>
              <button
                onClick={handleIssueWarning}
                disabled={savingWarn || !warnEmployeeId || !warnSubject || !warnDesc}
                style={{ ...BTN_DANGER, opacity: (!warnEmployeeId || !warnSubject || !warnDesc) ? 0.6 : 1 }}
              >{savingWarn ? 'Issuing…' : 'Issue Warning'}</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Warning Detail ── */}
      {showWarnDetail && selectedWarn && (
        <ModalOverlay onClose={() => setShowWarnDetail(false)}>
          <div style={{ width: 620 }}>
            <ModalHeader title="Warning Letter" sub={`Issued on ${fmtDate(selectedWarn.issued_date as string)}`} onClose={() => setShowWarnDetail(false)} />
            <div style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: '70vh' }}>
              {/* Letterhead */}
              <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5391 100%)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>IH</span>
                </div>
                <p style={{ fontWeight: 800, color: '#1E3A5F', margin: '4px 0 2px', fontSize: '1.1rem' }}>Imperial HR Management Systems Pvt. Ltd.</p>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>123 Business Park, Andheri East, Mumbai – 400069</p>
              </div>

              <p style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.05rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Warning Letter
              </p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'right', marginBottom: 20 }}>Date: {fmtDate(selectedWarn.issued_date as string)}</p>

              <div style={{ marginBottom: 16, fontSize: '0.875rem', lineHeight: 1.8, color: '#374151' }}>
                <p><strong>To:</strong> {selectedWarn.employee ? `${selectedWarn.employee.first_name} ${selectedWarn.employee.last_name}` : '—'}</p>
                <p><strong>Employee ID:</strong> {selectedWarn.employee?.emp_id ?? '—'}</p>
                <p><strong>Department:</strong> {selectedWarn.employee?.department?.name ?? '—'}</p>
                <p><strong>Status:</strong> <StatusBadge status={selectedWarn.status} /></p>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 6px', fontSize: '0.875rem' }}>Subject: {selectedWarn.subject}</p>
              </div>

              <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#374151' }}>
                <p>Dear {selectedWarn.employee?.first_name ?? 'Employee'},</p>
                <p>{selectedWarn.description ?? (selectedWarn.reason as string | null)}</p>

                <p>You are hereby advised to immediately rectify your conduct/performance. Failure to do so may result in further disciplinary action, including termination of employment.</p>
                <p>Please acknowledge receipt of this letter. Your acknowledgement does not imply agreement, only receipt.</p>
              </div>

              {selectedWarn.acknowledged_at && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
                  <p style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600, margin: 0 }}>
                    ✓ Acknowledged by employee on {fmtDate(selectedWarn.acknowledged_at)}
                  </p>
                </div>
              )}

              <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
                      Issued by: {selectedWarn.issued_by ? `${selectedWarn.issued_by.first_name} ${selectedWarn.issued_by.last_name}` : 'HR Manager'}
                    </p>
                  </div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>Employee Acknowledgement</p>
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter>
              <button onClick={() => setShowWarnDetail(false)} style={BTN_OUTLINE}>Close</button>
              {selectedWarn.status === 'draft' && isAdmin && (
                <button onClick={() => { handleIssueFromDraft(selectedWarn.id); setShowWarnDetail(false) }} style={BTN_DANGER}>Issue Warning</button>
              )}
              {selectedWarn.status === 'issued' && selectedWarn.employee?.id === sessionUserId && (
                <button onClick={() => { handleAcknowledge(selectedWarn.id); setShowWarnDetail(false) }} style={{ ...BTN_PRIMARY, background: '#16a34a' }}>Acknowledge</button>
              )}
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Give Appreciation ── */}
      {showApprecModal && (
        <ModalOverlay onClose={() => setShowApprecModal(false)}>
          <div style={{ width: 500 }}>
            <ModalHeader title="Give Appreciation" sub="Recognise a colleague's outstanding contribution" onClose={() => setShowApprecModal(false)} />
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Employee *">
                <select value={apprecEmployee} onChange={e => setApprecEmployee(e.target.value)} style={INP}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.emp_id})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category *">
                <select value={apprecCategory} onChange={e => setApprecCategory(e.target.value)} style={INP}>
                  <option>Excellence</option>
                  <option>Teamwork</option>
                  <option>Innovation</option>
                  <option>Customer</option>
                  <option>Leadership</option>
                </select>
              </FormField>
              <FormField label="Subject *">
                <input value={apprecSubject} onChange={e => setApprecSubject(e.target.value)} placeholder="Brief subject of the appreciation" style={INP} />
              </FormField>
              <FormField label="Description">
                <textarea rows={3} value={apprecDesc} onChange={e => setApprecDesc(e.target.value)} placeholder="Describe what the employee did exceptionally well…" style={{ ...INP, resize: 'vertical' }} />
              </FormField>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                <input type="checkbox" id="apprecPublic" checked={apprecPublic} onChange={e => setApprecPublic(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer' }} />
                <label htmlFor="apprecPublic" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d', cursor: 'pointer' }}>
                  Make Public (visible on Wall of Fame to all employees)
                </label>
              </div>
            </div>
            <ModalFooter>
              <button onClick={() => setShowApprecModal(false)} style={BTN_OUTLINE}>Cancel</button>
              <button
                disabled={savingApprec}
                onClick={() => {
                  if (!apprecEmployee || !apprecSubject) { toast.error('Employee and subject are required'); return }
                  const emp = employees.find(e => e.id === apprecEmployee) ?? null
                  const giver = employees.find(e => e.id === sessionUserId) ?? null
                  const newApprec: ApiAppreciation = {
                    id: `local-${Date.now()}`,
                    category: apprecCategory,
                    subject: apprecSubject,
                    description: apprecDesc || null,
                    is_public: apprecPublic,
                    created_at: new Date().toISOString(),
                    employee: emp ? { id: emp.id, first_name: emp.first_name, last_name: emp.last_name, emp_id: emp.emp_id, department: emp.department } : null,
                    given_by: giver ? { id: giver.id, first_name: giver.first_name, last_name: giver.last_name, emp_id: giver.emp_id } : null,
                  }
                  setAppreciations(prev => [newApprec, ...prev])
                  toast.success('Appreciation recorded!')
                  setShowApprecModal(false)
                  setApprecEmployee(''); setApprecCategory('Excellence'); setApprecSubject(''); setApprecDesc(''); setApprecPublic(true)
                }}
                style={{ ...BTN_PRIMARY, background: '#16a34a', opacity: savingApprec ? 0.7 : 1 }}
              >
                <Plus size={14} style={{ marginRight: 4 }} /> {savingApprec ? 'Saving…' : 'Give Appreciation'}
              </button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
