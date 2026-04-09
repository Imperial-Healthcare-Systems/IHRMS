'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { exitApi, employeesApi, type ExitProcess as ApiExitProcess, type Employee as ApiEmployee } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  UserMinus, LogOut, IndianRupee, Clock, X,
  CheckCircle2, Circle, Eye, Download, FileText, Settings2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ExitTab = 'exit' | 'fnf' | 'probation'
type ExitType = 'Resignation' | 'Termination' | 'Retirement' | 'Contract End' | 'Mutual Separation'
type FnFStatus = 'Pending' | 'Completed' | 'Not Started' | 'Approved'
type ReviewStatus = 'Pending' | 'Scheduled' | 'Completed' | 'Overdue'
type ProbationOutcome = 'Confirmed' | 'Extended' | 'Terminated'

interface ExitRecord {
  id: number; name: string; empId: string; department: string
  exitType: ExitType; resignationDate: string; lastWorkingDate: string
  noticePeriod: number; clearanceCleared: number; clearanceTotal: number
  fnfStatus: FnFStatus
}
interface ClearanceItem {
  id: string; label: string; description: string; cleared: boolean
}
interface FnFRecord {
  id: number; name: string; empId: string; lastWorkingDate: string
  salaryEarned: number; leaveEncashment: number; noticePeriodRecovery: number
  bonusArrears: number; deductions: number; netFnF: number; status: FnFStatus
}
interface ProbationEmployee {
  id: number; name: string; empId: string; designation: string; department: string
  joinDate: string; probationEndDate: string; manager: string
  reviewStatus: ReviewStatus; daysRemaining: number
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const EXIT_RECORDS: ExitRecord[] = [
  { id: 1, name: 'Vivek Sharma',  empId: 'EMP/2024/045', department: 'Engineering', exitType: 'Resignation',  resignationDate: 'Mar 15, 2026', lastWorkingDate: 'Apr 14, 2026', noticePeriod: 30, clearanceCleared: 3, clearanceTotal: 5, fnfStatus: 'Pending' },
  { id: 2, name: 'Anita Nair',    empId: 'EMP/2023/012', department: 'HR',          exitType: 'Resignation',  resignationDate: 'Mar 20, 2026', lastWorkingDate: 'May 19, 2026', noticePeriod: 60, clearanceCleared: 1, clearanceTotal: 5, fnfStatus: 'Pending' },
  { id: 3, name: 'Suresh Kumar',  empId: 'EMP/2022/008', department: 'Finance',     exitType: 'Retirement',   resignationDate: 'Feb 28, 2026', lastWorkingDate: 'Feb 28, 2026', noticePeriod: 0,  clearanceCleared: 5, clearanceTotal: 5, fnfStatus: 'Completed' },
  { id: 4, name: 'Pradeep Singh', empId: 'EMP/2023/078', department: 'Sales',       exitType: 'Termination',  resignationDate: 'Mar 1, 2026',  lastWorkingDate: 'Mar 31, 2026', noticePeriod: 30, clearanceCleared: 4, clearanceTotal: 5, fnfStatus: 'Pending' },
  { id: 5, name: 'Kavya Menon',   empId: 'EMP/2024/091', department: 'Operations',  exitType: 'Resignation',  resignationDate: 'Apr 1, 2026',  lastWorkingDate: 'Apr 30, 2026', noticePeriod: 30, clearanceCleared: 0, clearanceTotal: 5, fnfStatus: 'Not Started' },
]

const INITIAL_CLEARANCE: ClearanceItem[] = [
  { id: 'hr',      label: 'HR Clearance',      description: 'Clear pending leaves, update records', cleared: true },
  { id: 'it',      label: 'IT Clearance',       description: 'Return laptop, revoke access',         cleared: true },
  { id: 'finance', label: 'Finance Clearance',  description: 'No pending expense claims',            cleared: true },
  { id: 'manager', label: 'Manager Clearance',  description: 'Knowledge transfer done',              cleared: false },
  { id: 'admin',   label: 'Admin Clearance',    description: 'Return ID card, access card',          cleared: false },
]

const FNF_RECORDS: FnFRecord[] = [
  { id: 1, name: 'Vivek Sharma',  empId: 'EMP/2024/045', lastWorkingDate: 'Apr 14, 2026', salaryEarned: 14423, leaveEncashment: 7696,  noticePeriodRecovery: 0, bonusArrears: 5000,  deductions: 4331, netFnF: 22788, status: 'Pending' },
  { id: 2, name: 'Anita Nair',    empId: 'EMP/2023/012', lastWorkingDate: 'May 19, 2026', salaryEarned: 29167, leaveEncashment: 4808,  noticePeriodRecovery: 0, bonusArrears: 0,     deductions: 3992, netFnF: 29983, status: 'Pending' },
  { id: 3, name: 'Suresh Kumar',  empId: 'EMP/2022/008', lastWorkingDate: 'Feb 28, 2026', salaryEarned: 45000, leaveEncashment: 12000, noticePeriodRecovery: 0, bonusArrears: 10000, deductions: 7200, netFnF: 59800, status: 'Approved' },
  { id: 4, name: 'Pradeep Singh', empId: 'EMP/2023/078', lastWorkingDate: 'Mar 31, 2026', salaryEarned: 38000, leaveEncashment: 6000,  noticePeriodRecovery: 0, bonusArrears: 0,     deductions: 5320, netFnF: 38680, status: 'Pending' },
]

const PROBATION_EMPLOYEES: ProbationEmployee[] = [
  { id: 1, name: 'Arjun Patel',      empId: 'EMP/2026/013', designation: 'Software Engineer',    department: 'Engineering',     joinDate: 'Oct 1, 2025',  probationEndDate: 'Apr 1, 2026',  manager: 'Rajeev Gupta', reviewStatus: 'Overdue',   daysRemaining: -1 },
  { id: 2, name: 'Sunita Rao',        empId: 'EMP/2026/014', designation: 'HR Executive',          department: 'HR',              joinDate: 'Oct 1, 2025',  probationEndDate: 'Apr 1, 2026',  manager: 'Meena Iyer',   reviewStatus: 'Overdue',   daysRemaining: -1 },
  { id: 3, name: 'Mohammed Irfan',    empId: 'EMP/2026/015', designation: 'Sales Executive',       department: 'Sales',           joinDate: 'Oct 15, 2025', probationEndDate: 'Apr 15, 2026', manager: 'Suresh Nair',  reviewStatus: 'Scheduled', daysRemaining: 14 },
  { id: 4, name: 'Deepika Sharma',    empId: 'EMP/2026/016', designation: 'Finance Analyst',       department: 'Finance',         joinDate: 'Oct 15, 2025', probationEndDate: 'Apr 15, 2026', manager: 'Priya Menon',  reviewStatus: 'Pending',   daysRemaining: 14 },
  { id: 5, name: 'Vikram Nair',       empId: 'EMP/2026/017', designation: 'Operations Executive',  department: 'Operations',      joinDate: 'Nov 1, 2025',  probationEndDate: 'May 1, 2026',  manager: 'Anil Kumar',   reviewStatus: 'Pending',   daysRemaining: 30 },
  { id: 6, name: 'Sonia Kapoor',      empId: 'EMP/2026/018', designation: 'Marketing Analyst',     department: 'Marketing',       joinDate: 'Nov 1, 2025',  probationEndDate: 'May 1, 2026',  manager: 'Neha Singh',   reviewStatus: 'Pending',   daysRemaining: 30 },
  { id: 7, name: 'Ravi Shankar',      empId: 'EMP/2026/019', designation: 'Senior Engineer',       department: 'Engineering',     joinDate: 'Nov 15, 2025', probationEndDate: 'May 15, 2026', manager: 'Rajeev Gupta', reviewStatus: 'Pending',   daysRemaining: 44 },
  { id: 8, name: 'Kavita Pillai',     empId: 'EMP/2026/020', designation: 'Support Executive',     department: 'Customer Support',joinDate: 'Apr 5, 2026',  probationEndDate: 'Apr 7, 2026',  manager: 'Deepak Rao',   reviewStatus: 'Pending',   daysRemaining: 6 },
]

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']

const EXIT_TYPE_CFG: Record<ExitType, { bg: string; color: string; border: string }> = {
  Resignation:       { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Termination:       { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  Retirement:        { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Contract End':    { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  'Mutual Separation': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
}

const FNF_CFG: Record<FnFStatus, { bg: string; color: string; border: string }> = {
  Pending:     { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Completed:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Approved:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Not Started': { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const REVIEW_CFG: Record<ReviewStatus, { bg: string; color: string; border: string }> = {
  Overdue:   { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  Pending:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Scheduled: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Completed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

/* ─────────────────────────────────────────────────────────────
   ATOM COMPONENTS
───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx], flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function ExitTypeBadge({ type }: { type: ExitType }) {
  const c = EXIT_TYPE_CFG[type]
  return <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{type}</span>
}

function FnFBadge({ status }: { status: FnFStatus }) {
  const c = FNF_CFG[status]
  return <span className="badge badge-dot" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{status}</span>
}

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const c = REVIEW_CFG[status]
  return <span className="badge badge-dot" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{status}</span>
}

/* ─────────────────────────────────────────────────────────────
   MODAL WRAPPER
───────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, sub, wide, children }: {
  open: boolean; onClose: () => void; title: string; sub?: string; wide?: boolean; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="relative bg-white flex flex-col" style={{ width: wide ? '640px' : '480px', maxWidth: '95vw', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div className="flex items-start justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
            {sub && <p style={{ fontSize: '0.775rem', color: '#9ca3af', margin: '3px 0 0', fontWeight: 400, letterSpacing: '0.01em' }}>{sub}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon" style={{ marginTop: -2 }}><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const FIELD_STYLE = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '9px 12px', fontSize: '0.875rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
}
const LABEL_STYLE = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600 as const,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ExitPage() {
  const [tab, setTab] = useState<ExitTab>('exit')
  const [showInitiateModal, setShowInitiateModal]   = useState(false)
  const [selectedExit, setSelectedExit]             = useState<ExitRecord | null>(null)
  const [showManageModal, setShowManageModal]        = useState(false)
  const [showFnFModal, setShowFnFModal]              = useState(false)
  const [selectedFnF, setSelectedFnF]               = useState<FnFRecord | null>(null)
  const [showProbationModal, setShowProbationModal]  = useState(false)
  const [selectedProbation, setSelectedProbation]   = useState<ProbationEmployee | null>(null)
  const [clearanceItems, setClearanceItems]         = useState<ClearanceItem[]>(INITIAL_CLEARANCE)

  const [initEmployee, setInitEmployee]       = useState('')
  const [initExitType, setInitExitType]       = useState<ExitType>('Resignation')
  const [initResignMonth, setInitResignMonth] = useState('')
  const [initResignDay,   setInitResignDay]   = useState('')
  const [initResignYear,  setInitResignYear]  = useState('')
  const [initLastMonth,   setInitLastMonth]   = useState('')
  const [initLastDay,     setInitLastDay]     = useState('')
  const [initLastYear,    setInitLastYear]    = useState('')
  const [initNoticePeriod, setInitNoticePeriod] = useState('30')
  const [initReason, setInitReason]           = useState('')

  const [probRating, setProbRating]             = useState('4')
  const [probOutcome, setProbOutcome]           = useState<ProbationOutcome>('Confirmed')
  const [probExtendMonths, setProbExtendMonths] = useState('3')
  const [probRemarks, setProbRemarks]           = useState('')
  const [probEffectiveDate, setProbEffectiveDate] = useState('')

  const [exitRecords, setExitRecords]   = useState<ExitRecord[]>(EXIT_RECORDS)
  const [apiEmployees, setApiEmployees] = useState<ApiEmployee[]>([])
  const [submittingExit, setSubmittingExit] = useState(false)

  useEffect(() => {
    // Fetch exit records
    exitApi.list({ limit: 100 }).then(res => {
      if (res.data.length > 0) {
        const adapted: ExitRecord[] = (res.data as ApiExitProcess[]).map((e, idx) => ({
          id: idx + 1,
          name: e.employee ? `${e.employee.first_name} ${e.employee.last_name}` : 'Unknown',
          empId: e.employee?.emp_id ?? '',
          department: e.employee?.department?.name ?? 'Unknown',
          exitType: (e.exit_type?.charAt(0).toUpperCase() + e.exit_type?.slice(1).replace(/_/g, ' ') ?? 'Resignation') as ExitType,
          resignationDate: e.resignation_date ? new Date(e.resignation_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
          lastWorkingDate: e.last_working_date ? new Date(e.last_working_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
          noticePeriod: e.notice_period_days ?? 30,
          clearanceCleared: 0,
          clearanceTotal: 5,
          fnfStatus: (e.fnf_status?.charAt(0).toUpperCase() + e.fnf_status?.slice(1) ?? 'Pending') as FnFStatus,
        }))
        setExitRecords(adapted)
      }
    }).catch(() => {/* keep mock */})
    // Fetch employees for select
    employeesApi.list({ status: 'active', limit: 500 }).then(res => {
      setApiEmployees(res.data)
    }).catch(() => {})
  }, [])

  const handleInitiateExit = async () => {
    if (!initEmployee || !initReason) { toast.error('Employee and reason are required'); return }
    setSubmittingExit(true)
    try {
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const toISO = (month: string, day: string, year: string) => {
        const m = String(MONTHS.indexOf(month) + 1).padStart(2, '0')
        return `${year}-${m}-${day.padStart(2, '0')}`
      }
      await exitApi.create({
        employee_id: initEmployee,
        exit_type: initExitType.toLowerCase().replace(/ /g, '_'),
        resignation_date: toISO(initResignMonth, initResignDay, initResignYear),
        last_working_date: toISO(initLastMonth, initLastDay, initLastYear),
        notice_period_days: parseInt(initNoticePeriod) || 30,
        reason: initReason,
        fnf_status: 'pending',
        clearance_status: 'pending',
        status: 'active',
      })
      toast.success('Exit process initiated successfully')
      setShowInitiateModal(false)
      setInitEmployee(''); setInitReason(''); setInitNoticePeriod('30')
      setInitResignMonth(''); setInitResignDay(''); setInitResignYear('')
      setInitLastMonth(''); setInitLastDay(''); setInitLastYear('')
      // Refresh
      exitApi.list({ limit: 100 }).then(res => {
        if (res.data.length > 0) {
          setExitRecords((res.data as ApiExitProcess[]).map((e, idx) => ({
            id: idx + 1,
            name: e.employee ? `${e.employee.first_name} ${e.employee.last_name}` : 'Unknown',
            empId: e.employee?.emp_id ?? '',
            department: e.employee?.department?.name ?? 'Unknown',
            exitType: (e.exit_type?.charAt(0).toUpperCase() + e.exit_type?.slice(1).replace(/_/g, ' ') ?? 'Resignation') as ExitType,
            resignationDate: e.resignation_date ? new Date(e.resignation_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            lastWorkingDate: e.last_working_date ? new Date(e.last_working_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            noticePeriod: e.notice_period_days ?? 30,
            clearanceCleared: 0,
            clearanceTotal: 5,
            fnfStatus: (e.fnf_status?.charAt(0).toUpperCase() + e.fnf_status?.slice(1) ?? 'Pending') as FnFStatus,
          })))
        }
      }).catch(() => {})
    } catch {
      toast.error('Failed to initiate exit process')
    } finally {
      setSubmittingExit(false)
    }
  }

  const toggleClearance = (id: string) =>
    setClearanceItems(prev => prev.map(item => item.id === id ? { ...item, cleared: !item.cleared } : item))

  const openManage = (exit: ExitRecord) => { setSelectedExit(exit); setShowManageModal(true) }
  const openFnF    = (fnf: FnFRecord)   => { setSelectedFnF(fnf);   setShowFnFModal(true) }
  const openProbationReview = (emp: ProbationEmployee) => { setSelectedProbation(emp); setShowProbationModal(true) }

  const noticePeriodCount = exitRecords.length
  const fnfPending = FNF_RECORDS.filter(f => f.status === 'Pending').length
  const overdueCount = PROBATION_EMPLOYEES.filter(p => p.reviewStatus === 'Overdue').length

  const TABS: { key: ExitTab; label: string; count: number }[] = [
    { key: 'exit',      label: 'Exit Management',   count: exitRecords.length },
    { key: 'fnf',       label: 'FnF Settlement',     count: FNF_RECORDS.length },
    { key: 'probation', label: 'Probation Tracking', count: PROBATION_EMPLOYEES.length },
  ]

  return (
    <>
      {/* ── Modals ── */}

      {/* Initiate Exit */}
      <Modal open={showInitiateModal} onClose={() => setShowInitiateModal(false)} title="Initiate Exit Process" sub="Record a new employee exit or separation">
        {(() => {
          const exitTypeCfg = EXIT_TYPE_CFG[initExitType]
          const dateLabel = initExitType === 'Termination' ? 'Termination Date' : initExitType === 'Retirement' ? 'Retirement Date' : 'Resignation Date'
          const EXIT_TYPE_DESC: Record<ExitType, string> = {
            Resignation:        'Employee voluntarily leaving the organisation.',
            Termination:        'Employment ended by the company.',
            Retirement:         'Employee reaching superannuation age.',
            'Contract End':     'Fixed-term contract completing its tenure.',
            'Mutual Separation':'Both parties agreed to end employment.',
          }
          const canSubmit = !!initEmployee && !!initReason && !!initResignMonth && !!initResignDay && !!initResignYear && !!initLastMonth && !!initLastDay && !!initLastYear

          const SEL_BARE: React.CSSProperties = {
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: '0.875rem', color: '#111827', fontFamily: 'inherit',
            cursor: 'pointer', appearance: 'none', padding: '0 20px 0 0', minWidth: 0,
          }
          const CHEVRON_SM = (
            <svg style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          )

          const DateGroup = ({
            month, onMonth, day, onDay, year, onYear,
          }: {
            month: string; onMonth: (v: string) => void
            day: string;   onDay:   (v: string) => void
            year: string;  onYear:  (v: string) => void
          }) => {
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
            const YEARS  = ['2024','2025','2026','2027']
            const base: React.CSSProperties = {
              display: 'flex', alignItems: 'center',
              border: '1.5px solid #e5e7eb', borderRadius: 8,
              background: '#f9fafb', overflow: 'hidden',
            }
            const seg: React.CSSProperties = {
              position: 'relative', display: 'flex', alignItems: 'center',
              padding: '9px 0 9px 12px', flex: 1,
            }
            const div: React.CSSProperties = {
              width: 1, alignSelf: 'stretch', background: '#e5e7eb', flexShrink: 0,
            }
            return (
              <div style={base}>
                <div style={seg}>
                  <select value={month} onChange={e => onMonth(e.target.value)} style={SEL_BARE}>
                    <option value="">Mon</option>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  {CHEVRON_SM}
                </div>
                <div style={div} />
                <div style={{ ...seg, flex: '0 0 72px' }}>
                  <select value={day} onChange={e => onDay(e.target.value)} style={SEL_BARE}>
                    <option value="">Day</option>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                  {CHEVRON_SM}
                </div>
                <div style={div} />
                <div style={{ ...seg, flex: '0 0 88px' }}>
                  <select value={year} onChange={e => onYear(e.target.value)} style={SEL_BARE}>
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                  {CHEVRON_SM}
                </div>
              </div>
            )
          }

          const SEL: React.CSSProperties = { ...FIELD_STYLE, appearance: 'none', paddingRight: 32, cursor: 'pointer' }
          const chevron = (
            <svg style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          )

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Employee */}
              <div>
                <label style={LABEL_STYLE}>Employee</label>
                <div style={{ position: 'relative' }}>
                  <select value={initEmployee} onChange={e => setInitEmployee(e.target.value)} style={SEL}>
                    <option value="">Select employee…</option>
                    {apiEmployees.length > 0
                      ? apiEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.emp_id})</option>
                        ))
                      : <>
                          <option>Vivek Sharma (EMP/2024/045)</option>
                          <option>Anita Nair (EMP/2023/012)</option>
                          <option>Kavya Menon (EMP/2024/091)</option>
                          <option>Ravi Shankar (EMP/2026/019)</option>
                        </>
                    }
                  </select>
                  {chevron}
                </div>
              </div>

              {/* Exit Type */}
              <div>
                <label style={LABEL_STYLE}>Exit Type</label>
                <div style={{ position: 'relative' }}>
                  <select value={initExitType} onChange={e => setInitExitType(e.target.value as ExitType)} style={SEL}>
                    {(['Resignation','Termination','Retirement','Contract End','Mutual Separation'] as ExitType[]).map(t => <option key={t}>{t}</option>)}
                  </select>
                  {chevron}
                </div>
                <div style={{
                  marginTop: 7, padding: '8px 12px', borderRadius: 8,
                  background: exitTypeCfg.bg, border: `1px solid ${exitTypeCfg.border}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99,
                    fontSize: '0.7rem', fontWeight: 700, background: exitTypeCfg.color + '20',
                    color: exitTypeCfg.color, border: `1px solid ${exitTypeCfg.border}`, flexShrink: 0,
                  }}>
                    {initExitType}
                  </span>
                  <span style={{ fontSize: '0.775rem', color: exitTypeCfg.color, lineHeight: 1.4 }}>
                    {EXIT_TYPE_DESC[initExitType]}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>{dateLabel}</label>
                  <DateGroup
                    month={initResignMonth} onMonth={setInitResignMonth}
                    day={initResignDay}     onDay={setInitResignDay}
                    year={initResignYear}   onYear={setInitResignYear}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Last Working Date</label>
                  <DateGroup
                    month={initLastMonth} onMonth={setInitLastMonth}
                    day={initLastDay}     onDay={setInitLastDay}
                    year={initLastYear}   onYear={setInitLastYear}
                  />
                </div>
              </div>

              {/* Notice Period */}
              <div>
                <label style={LABEL_STYLE}>Notice Period</label>
                <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb' }}>
                  <input
                    type="number" value={initNoticePeriod}
                    onChange={e => setInitNoticePeriod(e.target.value)}
                    placeholder="30"
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 12px', fontSize: '0.875rem', color: '#111827', background: 'transparent', fontFamily: 'inherit' }}
                  />
                  <div style={{ padding: '9px 14px', background: '#f1f5f9', borderLeft: '1.5px solid #e5e7eb', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', flexShrink: 0 }}>days</div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Reason for Exit</label>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Required</span>
                </div>
                <textarea
                  rows={3} value={initReason} onChange={e => setInitReason(e.target.value)}
                  placeholder={initExitType === 'Resignation' ? 'e.g. Better opportunity, relocation, personal reasons…' : 'Describe the circumstances leading to exit…'}
                  style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.6, padding: '9px 12px' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1.5px solid #f1f5f9', marginTop: 2 }}>
                <button onClick={() => setShowInitiateModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
                <button
                  className="btn btn-sm"
                  onClick={handleInitiateExit}
                  disabled={!canSubmit || submittingExit}
                  style={{
                    flex: 2,
                    background: canSubmit ? `linear-gradient(135deg, ${exitTypeCfg.color} 0%, ${exitTypeCfg.color}cc 100%)` : '#e5e7eb',
                    color: canSubmit ? 'white' : '#9ca3af',
                    border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8375rem',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: canSubmit ? `0 2px 8px ${exitTypeCfg.color}40` : 'none',
                    transition: 'all 150ms',
                  }}
                >
                  <LogOut size={14} /> {submittingExit ? 'Processing…' : 'Initiate Exit'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Manage Exit / Clearance */}
      <Modal open={showManageModal && !!selectedExit} onClose={() => setShowManageModal(false)} title={selectedExit?.name ?? ''} sub={`${selectedExit?.empId} · ${selectedExit?.department}`} wide>
        {selectedExit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Exit Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                ['Exit Type',          <ExitTypeBadge key="et" type={selectedExit.exitType} />],
                ['Resignation Date',   selectedExit.resignationDate],
                ['Last Working Date',  selectedExit.lastWorkingDate],
                ['Notice Period',      `${selectedExit.noticePeriod} days`],
                ['FnF Status',         <FnFBadge key="fnf" status={selectedExit.fnfStatus} />],
                ['Clearance Progress', `${selectedExit.clearanceCleared} / ${selectedExit.clearanceTotal} cleared`],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ padding: '10px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k}</p>
                  {typeof v === 'string'
                    ? <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>{v}</p>
                    : v}
                </div>
              ))}
            </div>

            {/* Clearance Checklist */}
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>Clearance Checklist</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clearanceItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${item.cleared ? '#bbf7d0' : '#e5e7eb'}`, background: item.cleared ? '#f0fdf4' : '#fafafa', transition: 'all 150ms' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.cleared
                        ? <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                        : <Circle       size={18} style={{ color: '#d1d5db', flexShrink: 0 }} />}
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', margin: 0 }}>{item.label}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{item.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleClearance(item.id)}
                      className={item.cleared ? 'btn btn-outline btn-sm' : 'btn btn-ghost btn-sm'}
                      style={{ fontSize: '0.75rem', color: item.cleared ? '#dc2626' : '#15803d', borderColor: item.cleared ? '#fecaca' : undefined }}
                    >
                      {item.cleared ? 'Undo' : 'Mark Cleared'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
              <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={13} /> Generate Experience Letter
              </button>
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IndianRupee size={13} /> Initiate FnF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FnF Calculation */}
      <Modal open={showFnFModal && !!selectedFnF} onClose={() => setShowFnFModal(false)} title={`FnF Statement — ${selectedFnF?.name ?? ''}`} sub={selectedFnF ? `Last working day: ${selectedFnF.lastWorkingDate}` : ''}>
        {selectedFnF && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Earnings */}
            <div style={{ borderRadius: 10, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Earnings</p>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Salary for Apr 1–14 (14 of 26 working days)', `₹${selectedFnF.salaryEarned.toLocaleString('en-IN')}`],
                  ['Leave Encashment', `₹${selectedFnF.leaveEncashment.toLocaleString('en-IN')}`],
                  ['Bonus / Arrears', `₹${selectedFnF.bonusArrears.toLocaleString('en-IN')}`],
                  ['Gratuity', '₹0'],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>Total Earnings</span>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>₹{(selectedFnF.salaryEarned + selectedFnF.leaveEncashment + selectedFnF.bonusArrears).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div style={{ borderRadius: 10, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Deductions</p>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['PF for partial month', '₹1,731'],
                  ['PT for partial month', '₹100'],
                  ['TDS on FnF',           '₹2,500'],
                  ['Outstanding Advance',  '₹0'],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 700, color: '#b91c1c' }}>Total Deductions</span>
                  <span style={{ fontWeight: 700, color: '#b91c1c' }}>-₹{selectedFnF.deductions.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Net FnF */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Net FnF Payable</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>After all earnings and deductions</p>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', margin: 0, fontFamily: 'var(--font-heading)' }}>₹{selectedFnF.netFnF.toLocaleString('en-IN')}</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> Download Statement
              </button>
              {selectedFnF.status !== 'Approved' && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>Approve FnF</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Probation Review */}
      <Modal open={showProbationModal && !!selectedProbation} onClose={() => setShowProbationModal(false)} title="Complete Probation Review" sub={selectedProbation ? `${selectedProbation.name} · ${selectedProbation.designation}` : ''}>
        {selectedProbation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Info strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Department', selectedProbation.department], ['Manager', selectedProbation.manager], ['Join Date', selectedProbation.joinDate], ['Probation End', selectedProbation.probationEndDate]].map(([k, v]) => (
                <div key={k} style={{ padding: '9px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k}</p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Rating */}
            <div>
              <label style={LABEL_STYLE}>Performance Rating</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {['1','2','3','4','5'].map(r => (
                  <button key={r} onClick={() => setProbRating(r)}
                    style={{
                      width: 38, height: 38, borderRadius: '50%', fontSize: '0.875rem', fontWeight: 700,
                      border: `2px solid ${probRating === r ? '#1E3A5F' : '#e5e7eb'}`,
                      background: probRating === r ? '#1E3A5F' : 'white',
                      color: probRating === r ? '#fff' : '#6b7280', cursor: 'pointer', transition: 'all 150ms',
                    }}>{r}</button>
                ))}
                <span style={{ fontSize: '0.8125rem', color: '#6b7280', marginLeft: 4 }}>{probRating}/5</span>
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label style={LABEL_STYLE}>Outcome</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Confirmed', 'Extended', 'Terminated'] as ProbationOutcome[]).map(o => {
                  const active = probOutcome === o
                  const col = o === 'Confirmed' ? '#15803d' : o === 'Extended' ? '#b45309' : '#b91c1c'
                  const bg  = o === 'Confirmed' ? '#f0fdf4' : o === 'Extended' ? '#fffbeb' : '#fef2f2'
                  const bdr = o === 'Confirmed' ? '#bbf7d0' : o === 'Extended' ? '#fde68a' : '#fecaca'
                  return (
                    <button key={o} onClick={() => setProbOutcome(o)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
                        border: active ? `2px solid ${bdr}` : '2px solid #e5e7eb',
                        background: active ? bg : 'white',
                        color: active ? col : '#6b7280',
                      }}>{o}</button>
                  )
                })}
              </div>
            </div>

            {probOutcome === 'Extended' && (
              <div>
                <label style={LABEL_STYLE}>Extend by (months)</label>
                <select value={probExtendMonths} onChange={e => setProbExtendMonths(e.target.value)} className="form-select" style={{ width: '100%' }}>
                  <option value="1">1 month</option>
                  <option value="2">2 months</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                </select>
              </div>
            )}

            <div>
              <label style={LABEL_STYLE}>Remarks</label>
              <textarea rows={3} value={probRemarks} onChange={e => setProbRemarks(e.target.value)} placeholder="Enter review remarks…"
                style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.5 }} />
            </div>

            <div>
              <label style={LABEL_STYLE}>Effective Date</label>
              <input type="date" value={probEffectiveDate} onChange={e => setProbEffectiveDate(e.target.value)} style={FIELD_STYLE} />
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
              <button onClick={() => setShowProbationModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 2 }}>Submit Review</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Page ── */}
      <Topbar
        title="Exit Management & Employee Lifecycle"
        subtitle="Manage exits, full & final settlements, and probation reviews"
        notificationCount={overdueCount}
      >
        <button onClick={() => setShowInitiateModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserMinus size={14} /> Initiate Exit Process
        </button>
      </Topbar>

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── KPI Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {([
            { label: 'On Notice Period', value: noticePeriodCount, icon: UserMinus, color: '#E8622A' },
            { label: 'Exit This Month',  value: 3,                 icon: LogOut,    color: '#b91c1c' },
            { label: 'FnF Pending',      value: fnfPending,        icon: IndianRupee, color: '#b45309' },
            { label: 'Probation Due',    value: PROBATION_EMPLOYEES.length, icon: Clock, color: '#1d4ed8' },
          ] as { label: string; value: number; icon: React.ElementType; color: string }[]).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card card-interactive" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Tab Bar */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #f1f5f9', padding: '0 4px' }}>
            {TABS.map(t => {
              const active = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '14px 18px', fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
                    color: active ? '#1E3A5F' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: active ? '2px solid #1E3A5F' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 150ms',
                  }}>
                  {t.label}
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                    background: active ? '#dbeafe' : '#f1f5f9',
                    color: active ? '#1d4ed8' : '#9ca3af',
                  }}>{t.count}</span>
                </button>
              )
            })}
          </div>

          {/* TAB 1 — Exit Management */}
          {tab === 'exit' && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Employee', 'EMP ID', 'Department', 'Exit Type', 'Resignation Date', 'Last Working Date', 'Notice Period', 'Clearance', 'FnF Status', 'Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exitRecords.map(exit => {
                    const pct = (exit.clearanceCleared / exit.clearanceTotal) * 100
                    const done = exit.clearanceCleared === exit.clearanceTotal
                    return (
                      <tr key={exit.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={exit.name} size={32} />
                            <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{exit.name}</span>
                          </div>
                        </td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{exit.empId}</span></td>
                        <td style={{ color: '#374151' }}>{exit.department}</td>
                        <td><ExitTypeBadge type={exit.exitType} /></td>
                        <td style={{ color: '#374151' }}>{exit.resignationDate}</td>
                        <td style={{ color: '#374151' }}>{exit.lastWorkingDate}</td>
                        <td style={{ color: '#374151' }}>{exit.noticePeriod > 0 ? `${exit.noticePeriod} days` : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: done ? '#22c55e' : '#3b82f6', transition: 'width 300ms' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>{exit.clearanceCleared}/{exit.clearanceTotal}</span>
                          </div>
                        </td>
                        <td><FnFBadge status={exit.fnfStatus} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openManage(exit)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <Eye size={12} /> View
                            </button>
                            <button onClick={() => openManage(exit)} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <Settings2 size={12} /> Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2 — FnF Settlement */}
          {tab === 'fnf' && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Employee', 'Last Working Date', 'Salary Earned', 'Leave Encashment', 'Notice Recovery', 'Bonus/Arrears', 'Deductions', 'Net FnF', 'Status', 'Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FNF_RECORDS.map(fnf => (
                    <tr key={fnf.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={fnf.name} size={32} />
                          <div>
                            <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', margin: 0 }}>{fnf.name}</p>
                            <p style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace', margin: 0 }}>{fnf.empId}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#374151' }}>{fnf.lastWorkingDate}</td>
                      <td style={{ color: '#374151' }}>₹{fnf.salaryEarned.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#374151' }}>₹{fnf.leaveEncashment.toLocaleString('en-IN')}</td>
                      <td>{fnf.noticePeriodRecovery > 0 ? <span style={{ color: '#dc2626', fontWeight: 600 }}>-₹{fnf.noticePeriodRecovery.toLocaleString('en-IN')}</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td style={{ color: '#374151' }}>₹{fnf.bonusArrears.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>-₹{fnf.deductions.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: '#111827' }}>₹{fnf.netFnF.toLocaleString('en-IN')}</td>
                      <td><FnFBadge status={fnf.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openFnF(fnf)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                            <Eye size={12} /> View
                          </button>
                          {fnf.status !== 'Approved' && (
                            <button onClick={() => openFnF(fnf)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <IndianRupee size={12} /> Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3 — Probation Tracking */}
          {tab === 'probation' && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Employee', 'Designation', 'Join Date', 'Probation End', 'Manager', 'Days Remaining', 'Review Status', 'Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROBATION_EMPLOYEES.map(emp => {
                    const overdue = emp.daysRemaining < 0
                    const urgent  = emp.daysRemaining >= 0 && emp.daysRemaining < 7
                    return (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={emp.name} size={32} />
                            <div>
                              <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', margin: 0 }}>{emp.name}</p>
                              <p style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace', margin: 0 }}>{emp.empId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#374151' }}>{emp.designation}</td>
                        <td style={{ color: '#374151' }}>{emp.joinDate}</td>
                        <td style={{ color: '#374151' }}>{emp.probationEndDate}</td>
                        <td style={{ color: '#374151' }}>{emp.manager}</td>
                        <td>
                          <span style={{
                            fontSize: '0.8125rem', fontWeight: 600,
                            color: overdue ? '#b91c1c' : urgent ? '#b45309' : '#15803d',
                          }}>
                            {overdue ? `${Math.abs(emp.daysRemaining)}d overdue` : `${emp.daysRemaining} days`}
                          </span>
                        </td>
                        <td><ReviewBadge status={emp.reviewStatus} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(emp.reviewStatus === 'Overdue' || emp.reviewStatus === 'Pending') && (
                              <>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Schedule</button>
                                <button onClick={() => openProbationReview(emp)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>Complete</button>
                              </>
                            )}
                            {emp.reviewStatus === 'Scheduled' && (
                              <>
                                <button onClick={() => openProbationReview(emp)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>Complete</button>
                                <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>Confirm</button>
                              </>
                            )}
                            {emp.reviewStatus === 'Completed' && (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Done</span>
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
      </div>
    </>
  )
}
