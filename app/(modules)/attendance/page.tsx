'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { attendanceApi, type AttendanceLog } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Clock,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Home,
  AlertCircle,
  Calendar,
  Edit,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Fingerprint,
  MapPin,
  Monitor,
  Smartphone,
  PenLine,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'WFH' | 'On Leave'
type RegStatus = 'Pending' | 'Approved' | 'Rejected'
type PunchMethod = 'Biometric' | 'Geo-tag' | 'IP-based' | 'Mobile' | 'Manual'

interface AttendanceRecord {
  id: string
  empId: string
  name: string
  department: string
  checkIn: string
  checkOut: string
  hoursWorked: string
  status: AttendanceStatus
  wfh: boolean
  punchMethod: PunchMethod
}

interface RegularizationRequest {
  id: string
  empId: string
  name: string
  date: string
  requestedIn: string
  requestedOut: string
  reason: string
  status: RegStatus
  requestedOn: string
}

interface MonthlySummary {
  empId: string
  name: string
  department: string
  workingDays: number
  present: number
  absent: number
  lop: number
  wfh: number
  late: number
  otHours: number
  attendancePct: number
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function mapRegRequest(r: Record<string, unknown>): RegularizationRequest {
  const emp = r.employee as Record<string, unknown> | null
  const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'
  const empId = emp
    ? String(emp.emp_id ?? emp.employee_code ?? r.employee_id ?? '')
    : String(r.employee_id ?? '')

  const dateStr = r.date as string | undefined
  const createdAt = r.created_at as string | undefined

  const fmtDate = (s?: string) => {
    if (!s) return '—'
    try { return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return s }
  }

  const statusMap: Record<string, RegStatus> = {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  }

  return {
    id:           String(r.id),
    empId,
    name,
    date:         fmtDate(dateStr),
    requestedIn:  String(r.requested_punch_in  ?? r.requestedIn  ?? '—'),
    requestedOut: String(r.requested_punch_out ?? r.requestedOut ?? '—'),
    reason:       String(r.reason ?? ''),
    status:       statusMap[(r.status as string)?.toLowerCase()] ?? 'Pending',
    requestedOn:  fmtDate(createdAt),
  }
}

const DEPARTMENTS = ['All Departments', 'Engineering', 'Human Resources', 'Sales', 'Finance', 'Operations', 'Marketing', 'Customer Support']
const STATUSES: ['All', ...AttendanceStatus[]] = ['All', 'Present', 'Absent', 'Late', 'WFH', 'On Leave']

const PALETTE = ['#1E3A5F','#FF6B00','#1A7A4A','#7C3AED','#0369A1','#BE185D','#0F766E','#B45309']

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: PALETTE[idx],
      flexShrink: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

const STATUS_CONFIG: Record<AttendanceStatus, { bg: string; color: string; border: string }> = {
  'Present':  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Absent':   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Late':     { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'WFH':      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'On Leave': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
}

const REG_STATUS_CONFIG: Record<RegStatus, { bg: string; color: string; border: string }> = {
  'Pending':  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Approved': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Rejected': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

const PUNCH_ICONS: Record<PunchMethod, React.ReactNode> = {
  'Biometric': <Fingerprint size={12} />,
  'Geo-tag':   <MapPin size={12} />,
  'IP-based':  <Monitor size={12} />,
  'Mobile':    <Smartphone size={12} />,
  'Manual':    <PenLine size={12} />,
}

function Badge({ label, config }: { label: string; config: { bg: string; color: string; border: string } }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem', fontWeight: 600,
      background: config.bg, color: config.color, border: `1px solid ${config.border}`,
    }}>
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'today' | 'regularization' | 'monthly'>('today')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | AttendanceStatus>('All')
  const [deptFilter, setDeptFilter] = useState('All Departments')

  /* Regularization requests — real data */
  const [regRequests, setRegRequests] = useState<RegularizationRequest[]>([])
  const [loadingReg, setLoadingReg] = useState(false)
  const [regLoaded, setRegLoaded] = useState(false)

  /* Monthly summary — real data */
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([])
  const [dailyPct, setDailyPct] = useState<number[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)

  const monthLabel = useMemo(() => {
    try {
      return new Date(selectedMonth + '-15').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    } catch { return selectedMonth }
  }, [selectedMonth])

  function goPrevMonth() {
    setSelectedMonth(prev => {
      const [y, m] = prev.split('-').map(Number)
      const d = new Date(y, m - 2, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  }
  function goNextMonth() {
    setSelectedMonth(prev => {
      const [y, m] = prev.split('-').map(Number)
      const d = new Date(y, m, 1)
      const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return next <= thisMonth ? next : prev
    })
  }

  /* Regularize modal */
  const [regModal, setRegModal] = useState<{ rec: AttendanceRecord } | null>(null)
  const [regForm, setRegForm] = useState({ checkIn: '', checkOut: '', reason: '' })
  const [regSaving, setRegSaving] = useState(false)

  function openRegModal(rec: AttendanceRecord) {
    setRegForm({ checkIn: rec.checkIn === '—' ? '' : rec.checkIn, checkOut: rec.checkOut === '—' ? '' : rec.checkOut, reason: '' })
    setRegModal({ rec })
  }

  async function submitRegularization() {
    if (!regModal) return
    if (!regForm.reason.trim()) { toast.error('Please provide a reason'); return }
    setRegSaving(true)
    try {
      const log = attendanceLogs.find(l => l.id === regModal.rec.id)
      const res = await fetch('/api/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:                 log?.date ?? new Date().toISOString().split('T')[0],
          reason:               regForm.reason.trim(),
          requested_punch_in:   regForm.checkIn   || null,
          requested_punch_out:  regForm.checkOut  || null,
          employee_id:          log?.employee_id  ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Regularization request submitted!')
      setRegModal(null)
      // Refresh reg list if it was loaded
      if (regLoaded) {
        setRegLoaded(false)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit')
    } finally { setRegSaving(false) }
  }

  /* Download Report */
  function downloadReport() {
    const rows = [
      ['Employee ID', 'Name', 'Department', 'Check-In', 'Check-Out', 'Hours Worked', 'Status', 'WFH'],
      ...filteredAttendance.map(r => [
        r.empId, r.name, r.department, r.checkIn, r.checkOut, r.hoursWorked, r.status, r.wfh ? 'Yes' : 'No',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded!')
  }

  /* Today's attendance — live data */
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(true)
  const [punchingIn, setPunchingIn] = useState(false)
  const [punchingOut, setPunchingOut] = useState(false)

  const [today, setToday] = useState('')
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  useEffect(() => {
    setLoadingAttendance(true)
    attendanceApi.list({ date: todayISO, limit: 200 })
      .then(r => setAttendanceLogs(r.data))
      .catch(console.error)
      .finally(() => setLoadingAttendance(false))
  }, [todayISO])

  /* Adapt API shape → UI shape */
  const adaptedLogs = useMemo(() => attendanceLogs.map(log => ({
    id: log.id,
    empId: log.employee?.emp_id ?? '—',
    name: log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : '—',
    department: log.employee?.department?.name ?? '—',
    checkIn: log.punch_in ?? '—',
    checkOut: log.punch_out ?? '—',
    hoursWorked: log.hours_worked != null ? `${log.hours_worked}h` : '—',
    status: ({ present: 'Present', late: 'Late', absent: 'Absent', work_from_home: 'WFH', on_leave: 'On Leave', half_day: 'Present' } as Record<string, string>)[log.status] ?? log.status as AttendanceStatus,
    wfh: log.is_wfh,
    punchMethod: 'Manual' as const,
  })), [attendanceLogs])

  /* No mock fallback — show real data or empty state */
  const displayLogs = adaptedLogs

  const filteredAttendance = useMemo(() => {
    return displayLogs.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.empId.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || r.status === statusFilter
      const matchDept = deptFilter === 'All Departments' || r.department === deptFilter
      return matchSearch && matchStatus && matchDept
    })
  }, [displayLogs, search, statusFilter, deptFilter])

  /* Fetch regularization requests */
  const fetchRegularizations = useCallback(async () => {
    setLoadingReg(true)
    try {
      const res = await fetch('/api/attendance/regularization')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setRegRequests((json.data ?? []).map(mapRegRequest))
      setRegLoaded(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load regularization requests')
    } finally { setLoadingReg(false) }
  }, [])

  /* Fetch monthly summary */
  const fetchMonthlySummary = useCallback(async (month: string) => {
    setLoadingMonthly(true)
    try {
      const res = await fetch(`/api/attendance/summary?month=${month}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setMonthlySummary(json.employees ?? [])
      setDailyPct(json.dailyPct ?? [])
      setLoadedMonth(month)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load monthly summary')
    } finally { setLoadingMonthly(false) }
  }, [])

  /* Lazy-load data when tabs are activated */
  useEffect(() => {
    if (activeTab === 'regularization' && !regLoaded) {
      fetchRegularizations()
    }
  }, [activeTab, regLoaded, fetchRegularizations])

  useEffect(() => {
    if (activeTab === 'monthly' && loadedMonth !== selectedMonth) {
      fetchMonthlySummary(selectedMonth)
    }
  }, [activeTab, selectedMonth, loadedMonth, fetchMonthlySummary])

  async function handlePunchIn() {
    setPunchingIn(true)
    try {
      await attendanceApi.punchIn({ punch_method: 'Manual' })
      toast.success('Punched in successfully!')
      const r = await attendanceApi.list({ date: todayISO, limit: 200 })
      setAttendanceLogs(r.data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Punch in failed')
    } finally { setPunchingIn(false) }
  }

  async function handlePunchOut() {
    setPunchingOut(true)
    try {
      await attendanceApi.punchOut({ punch_method: 'Manual' })
      toast.success('Punched out successfully!')
      const r = await attendanceApi.list({ date: todayISO, limit: 200 })
      setAttendanceLogs(r.data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Punch out failed')
    } finally { setPunchingOut(false) }
  }

  async function approveReg(id: string) {
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Request approved!')
      setRegRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' as RegStatus } : r))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve')
    }
  }

  async function rejectReg(id: string) {
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Request rejected')
      setRegRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' as RegStatus } : r))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject')
    }
  }

  const presentCount  = displayLogs.filter(r => r.status === 'Present' || r.status === 'WFH').length
  const absentCount   = displayLogs.filter(r => r.status === 'Absent').length
  const wfhCount      = displayLogs.filter(r => r.status === 'WFH').length
  const lateCount     = displayLogs.filter(r => r.status === 'Late').length
  const onLeaveCount  = displayLogs.filter(r => r.status === 'On Leave').length

  const TABS = [
    { key: 'today',          label: "Today's Attendance" },
    { key: 'regularization', label: 'Regularization Requests' },
    { key: 'monthly',        label: 'Monthly Summary' },
  ] as const

  const SUMMARY_CARDS = [
    { label: 'Present Today',  value: loadingAttendance ? '—' : String(presentCount), color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle2 size={20} /> },
    { label: 'Absent Today',   value: loadingAttendance ? '—' : String(absentCount),  color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={20} /> },
    { label: 'WFH Today',      value: loadingAttendance ? '—' : String(wfhCount),     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: <Home size={20} /> },
    { label: 'Late Arrivals',  value: loadingAttendance ? '—' : String(lateCount),    color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: <AlertCircle size={20} /> },
    { label: 'On Leave',       value: loadingAttendance ? '—' : String(onLeaveCount), color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: <Calendar size={20} /> },
  ]

  return (
    <>
      <Topbar
        title="Attendance Management"
        subtitle={today}
        notificationCount={3}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={downloadReport}>
              <Download size={14} />
              Download Report
            </button>
            <button className="btn btn-outline btn-sm" onClick={handlePunchOut} disabled={punchingOut}>
              <Clock size={14} />
              {punchingOut ? 'Punching Out…' : 'Punch Out'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePunchIn} disabled={punchingIn}>
              <Clock size={14} />
              {punchingIn ? 'Punching In…' : 'Punch In'}
            </button>
          </div>
        }
      />

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ gap: 12, marginBottom: 28 }}>
          {SUMMARY_CARDS.map((s) => (
            <div
              key={s.label}
              className="card card-interactive"
              style={{ padding: '18px 20px', borderColor: s.border }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--color-gray-200)', marginBottom: 24 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 20px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t.key ? '2px solid var(--color-imperial-blue)' : '2px solid transparent',
                marginBottom: '-2px',
                color: activeTab === t.key ? 'var(--color-imperial-blue)' : 'var(--color-gray-500)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            TAB 1 — Today's Attendance
        ════════════════════════════════════════ */}
        {activeTab === 'today' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Search + Filters */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                <input
                  type="text"
                  placeholder="Search by name or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--color-gray-50)' }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--color-gray-700)', cursor: 'pointer' }}
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--color-gray-700)', cursor: 'pointer' }}
              >
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', marginLeft: 'auto' }}>
                {loadingAttendance ? 'Loading…' : `Showing ${filteredAttendance.length} of ${displayLogs.length} employees`}
              </span>
            </div>

            {/* Table */}
            {loadingAttendance ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Loading attendance records…</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No attendance records for today</p>
                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Records appear once employees punch in.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                      {['Employee', 'Department', 'Check-In', 'Check-Out', 'Hours Worked', 'Status', 'WFH', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((rec) => (
                      <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-gray-100)', transition: 'background var(--transition-fast)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={rec.name} size={34} />
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>{rec.name}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', fontFamily: 'var(--font-body)' }}>{rec.empId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>{rec.department}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: rec.checkIn === '—' ? 'var(--color-gray-300)' : 'var(--color-gray-800)', fontVariantNumeric: 'tabular-nums' }}>{rec.checkIn}</span>
                            {rec.checkIn !== '—' && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.7rem', color: 'var(--color-gray-400)', background: 'var(--color-gray-100)', padding: '1px 5px', borderRadius: 4 }}>
                                {PUNCH_ICONS[rec.punchMethod]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: rec.checkOut === '—' ? 'var(--color-gray-300)' : 'var(--color-gray-800)', fontVariantNumeric: 'tabular-nums' }}>{rec.checkOut}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: rec.hoursWorked === '—' ? 'var(--color-gray-300)' : 'var(--color-gray-700)', fontWeight: 500 }}>{rec.hoursWorked}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge label={rec.status} config={STATUS_CONFIG[rec.status as AttendanceStatus] ?? STATUS_CONFIG['Absent']} />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {rec.wfh ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #bfdbfe' }}>
                              <Home size={11} /> WFH
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-gray-300)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Request regularization"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                            onClick={() => openRegModal(rec as AttendanceRecord)}
                          >
                            <Edit size={13} />
                            Regularize
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 2 — Regularization Requests
        ════════════════════════════════════════ */}
        {activeTab === 'regularization' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Regularization Requests</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Review and approve employee attendance corrections</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.8rem', padding: '4px 12px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  {regRequests.filter((r) => r.status === 'Pending').length} Pending
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setRegLoaded(false) }}
                  disabled={loadingReg}
                  style={{ fontSize: '0.75rem' }}
                >
                  {loadingReg ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>

            {loadingReg ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Loading regularization requests…</p>
              </div>
            ) : regRequests.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No regularization requests</p>
                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Employees can submit requests from the attendance table.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                      {['Employee', 'Date', 'Requested In', 'Requested Out', 'Reason', 'Status', 'Requested On', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regRequests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <Avatar name={req.name} size={32} />
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>{req.name}</p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>{req.empId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-700)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{req.date}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-800)', fontVariantNumeric: 'tabular-nums' }}>{req.requestedIn}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-800)', fontVariantNumeric: 'tabular-nums' }}>{req.requestedOut}</td>
                        <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>{req.reason}</p>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge label={req.status} config={REG_STATUS_CONFIG[req.status]} />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>{req.requestedOn}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {req.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => approveReg(req.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => rejectReg(req.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — Monthly Summary
        ════════════════════════════════════════ */}
        {activeTab === 'monthly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Bar Chart */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Daily Attendance — {monthLabel}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Company-wide attendance percentage per working day</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={goPrevMonth}><ChevronLeft size={16} /></button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-700)', minWidth: 120, textAlign: 'center' }}>{monthLabel}</span>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={goNextMonth}
                    disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {loadingMonthly ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)' }}>
                  Loading chart data…
                </div>
              ) : dailyPct.length === 0 ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)' }}>
                  No attendance data for this month.
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', height: 160, gap: 4, alignItems: 'flex-end', paddingLeft: 36 }}>
                    <div style={{ position: 'absolute', left: 36, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
                      {[100, 75, 50, 25, 0].map((pct) => (
                        <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct * 1.6}px`, borderTop: '1px dashed var(--color-gray-200)', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: -34, fontSize: '0.65rem', color: 'var(--color-gray-400)', width: 30, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      ))}
                    </div>

                    {dailyPct.map((pct, i) => {
                      const isWeekend = pct === 0
                      const height = isWeekend ? 4 : Math.max(pct * 1.6, 4)
                      return (
                        <div
                          key={i}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                          title={isWeekend ? `Day ${i + 1}: Weekend` : `Day ${i + 1}: ${pct}%`}
                        >
                          <div style={{
                            width: '80%',
                            height: `${height}px`,
                            background: isWeekend
                              ? 'var(--color-gray-200)'
                              : pct >= 90 ? '#22c55e'
                              : pct >= 75 ? '#3b82f6'
                              : '#f59e0b',
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.3s ease',
                            position: 'relative',
                            zIndex: 1,
                          }} />
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', paddingLeft: 36, marginTop: 6 }}>
                    {dailyPct.map((_, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-gray-400)' }}>
                        {(i + 1) % 5 === 1 || i + 1 === dailyPct.length ? i + 1 : ''}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
                    {[
                      { color: '#22c55e', label: '≥90%' },
                      { color: '#3b82f6', label: '75–89%' },
                      { color: '#f59e0b', label: '<75%' },
                      { color: 'var(--color-gray-200)', label: 'Weekend/Holiday' },
                    ].map((l) => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Employee Monthly Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Employee Attendance Summary — {monthLabel}</h3>
              </div>

              {loadingMonthly ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading monthly summary…</p>
                </div>
              ) : monthlySummary.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No data for {monthLabel}</p>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Attendance records will appear here once employees punch in.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                        {['Employee', 'Department', 'Working Days', 'Present', 'Absent', 'LOP', 'WFH', 'Late', 'OT Hours', 'Attendance %'].map((h) => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.map((emp) => (
                        <tr key={emp.empId} style={{ borderBottom: '1px solid var(--color-gray-100)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar name={emp.name} size={30} />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>{emp.name}</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>{emp.empId}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>{emp.department}</td>
                          <td style={{ padding: '11px 14px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-700)', textAlign: 'center' }}>{emp.workingDays}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#15803d' }}>{emp.present}</span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: emp.absent > 0 ? '#dc2626' : 'var(--color-gray-400)' }}>{emp.absent}</span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: emp.lop > 0 ? '#b45309' : 'var(--color-gray-400)' }}>{emp.lop}</span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.875rem', color: emp.wfh > 0 ? '#1d4ed8' : 'var(--color-gray-400)', fontWeight: emp.wfh > 0 ? 600 : 400 }}>{emp.wfh}</span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.875rem', color: emp.late > 0 ? '#b45309' : 'var(--color-gray-400)', fontWeight: emp.late > 0 ? 600 : 400 }}>{emp.late}</span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-gray-700)', fontWeight: emp.otHours > 0 ? 600 : 400 }}>
                            {emp.otHours > 0 ? `${emp.otHours}h` : '—'}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--color-gray-200)', borderRadius: 4, minWidth: 60 }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(emp.attendancePct, 100)}%`,
                                  background: emp.attendancePct >= 90 ? '#22c55e' : emp.attendancePct >= 75 ? '#3b82f6' : '#f59e0b',
                                  borderRadius: 4,
                                }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: emp.attendancePct >= 90 ? '#15803d' : emp.attendancePct >= 75 ? '#1d4ed8' : '#b45309', minWidth: 36 }}>
                                {emp.attendancePct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Punch Method Legend */}
            <div className="card" style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-600)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Punch Method Legend</p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { icon: <Fingerprint size={16} />, label: 'Biometric', color: '#1E3A5F' },
                  { icon: <MapPin size={16} />,      label: 'Geo-tag',   color: '#1A7A4A' },
                  { icon: <Monitor size={16} />,     label: 'IP-based',  color: '#0369A1' },
                  { icon: <Smartphone size={16} />,  label: 'Mobile',    color: '#7C3AED' },
                  { icon: <PenLine size={16} />,     label: 'Manual',    color: '#B45309' },
                ].map((m) => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: `${m.color}12`, border: `1px solid ${m.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                      {m.icon}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', fontWeight: 500 }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Regularization Modal ── */}
      {regModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 480, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Request Regularization</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 3 }}>
                  {regModal.rec.name} &middot; {regModal.rec.empId}
                </p>
              </div>
              <button onClick={() => setRegModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--color-gray-50)', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Check-In</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>{regModal.rec.checkIn}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Check-Out</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>{regModal.rec.checkOut}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>{regModal.rec.status}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 5 }}>
                    Corrected Check-In
                  </label>
                  <input
                    type="time"
                    value={regForm.checkIn}
                    onChange={e => setRegForm(f => ({ ...f, checkIn: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--color-gray-200)', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 5 }}>
                    Corrected Check-Out
                  </label>
                  <input
                    type="time"
                    value={regForm.checkOut}
                    onChange={e => setRegForm(f => ({ ...f, checkOut: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--color-gray-200)', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 5 }}>
                  Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={regForm.reason}
                  onChange={e => setRegForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why attendance correction is needed..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-gray-200)', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setRegModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
                Cancel
              </button>
              <button
                onClick={submitRegularization}
                disabled={regSaving}
                className="btn btn-primary btn-sm"
                style={{ opacity: regSaving ? 0.7 : 1 }}
              >
                {regSaving ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
