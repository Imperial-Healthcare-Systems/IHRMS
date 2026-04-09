'use client'

import { useState, useMemo, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { attendanceApi, type AttendanceLog } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Clock,
  Download,
  Search,
  Filter,
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
   MOCK DATA
───────────────────────────────────────────────────────────── */
const TODAY_ATTENDANCE: AttendanceRecord[] = [
  { id: '1',  empId: 'EMP/2024/001', name: 'Rajesh Kumar',     department: 'Engineering',      checkIn: '9:02 AM',  checkOut: '6:45 PM',  hoursWorked: '9h 43m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '2',  empId: 'EMP/2024/002', name: 'Priya Sharma',     department: 'Human Resources',  checkIn: '8:55 AM',  checkOut: '6:10 PM',  hoursWorked: '9h 15m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '3',  empId: 'EMP/2024/003', name: 'Amit Patel',       department: 'Finance',          checkIn: '10:15 AM', checkOut: '7:30 PM',  hoursWorked: '9h 15m', status: 'Late',    wfh: false, punchMethod: 'IP-based'  },
  { id: '4',  empId: 'EMP/2024/004', name: 'Sneha Gupta',      department: 'Sales',            checkIn: '—',        checkOut: '—',         hoursWorked: '—',      status: 'On Leave',wfh: false, punchMethod: 'Manual'    },
  { id: '5',  empId: 'EMP/2024/005', name: 'Rahul Mehta',      department: 'Operations',       checkIn: '9:00 AM',  checkOut: '6:00 PM',  hoursWorked: '9h 00m', status: 'WFH',     wfh: true,  punchMethod: 'Mobile'    },
  { id: '6',  empId: 'EMP/2024/006', name: 'Deepika Nair',     department: 'Marketing',        checkIn: '9:30 AM',  checkOut: '—',        hoursWorked: '—',      status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '7',  empId: 'EMP/2024/007', name: 'Vikram Singh',     department: 'Engineering',      checkIn: '8:48 AM',  checkOut: '5:55 PM',  hoursWorked: '9h 07m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '8',  empId: 'EMP/2024/008', name: 'Kavitha Reddy',    department: 'Customer Support', checkIn: '9:05 AM',  checkOut: '6:15 PM',  hoursWorked: '9h 10m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '9',  empId: 'EMP/2024/009', name: 'Suresh Babu',      department: 'Sales',            checkIn: '—',        checkOut: '—',         hoursWorked: '—',      status: 'Absent',  wfh: false, punchMethod: 'Biometric' },
  { id: '10', empId: 'EMP/2024/010', name: 'Pooja Agarwal',    department: 'Finance',          checkIn: '9:12 AM',  checkOut: '6:30 PM',  hoursWorked: '9h 18m', status: 'Present', wfh: false, punchMethod: 'IP-based'  },
  { id: '11', empId: 'EMP/2024/011', name: 'Kiran Rao',        department: 'Engineering',      checkIn: '9:00 AM',  checkOut: '—',        hoursWorked: '—',      status: 'WFH',     wfh: true,  punchMethod: 'Mobile'    },
  { id: '12', empId: 'EMP/2024/012', name: 'Ananya Krishnan',  department: 'Human Resources',  checkIn: '9:45 AM',  checkOut: '6:50 PM',  hoursWorked: '9h 05m', status: 'Late',    wfh: false, punchMethod: 'Biometric' },
  { id: '13', empId: 'EMP/2025/013', name: 'Mohammed Farouk',  department: 'Engineering',      checkIn: '8:50 AM',  checkOut: '6:20 PM',  hoursWorked: '9h 30m', status: 'Present', wfh: false, punchMethod: 'Geo-tag'   },
  { id: '14', empId: 'EMP/2025/014', name: 'Ritu Verma',       department: 'Marketing',        checkIn: '9:00 AM',  checkOut: '6:00 PM',  hoursWorked: '9h 00m', status: 'WFH',     wfh: true,  punchMethod: 'Mobile'    },
  { id: '15', empId: 'EMP/2026/015', name: 'Arjun Krishnan',   department: 'Engineering',      checkIn: '10:02 AM', checkOut: '7:10 PM',  hoursWorked: '9h 08m', status: 'Late',    wfh: false, punchMethod: 'IP-based'  },
  { id: '16', empId: 'EMP/2024/016', name: 'Nisha Bose',       department: 'Operations',       checkIn: '9:00 AM',  checkOut: '6:00 PM',  hoursWorked: '9h 00m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '17', empId: 'EMP/2024/017', name: 'Tarun Joshi',      department: 'Sales',            checkIn: '—',        checkOut: '—',         hoursWorked: '—',      status: 'Absent',  wfh: false, punchMethod: 'Biometric' },
  { id: '18', empId: 'EMP/2024/018', name: 'Meena Pillai',     department: 'Finance',          checkIn: '8:58 AM',  checkOut: '6:05 PM',  hoursWorked: '9h 07m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
  { id: '19', empId: 'EMP/2024/019', name: 'Sanjay Mishra',    department: 'Engineering',      checkIn: '9:00 AM',  checkOut: '—',        hoursWorked: '—',      status: 'WFH',     wfh: true,  punchMethod: 'Geo-tag'   },
  { id: '20', empId: 'EMP/2024/020', name: 'Lakshmi Iyer',     department: 'Customer Support', checkIn: '9:03 AM',  checkOut: '6:22 PM',  hoursWorked: '9h 19m', status: 'Present', wfh: false, punchMethod: 'Biometric' },
]

const REGULARIZATION_REQUESTS: RegularizationRequest[] = [
  { id: 'r1', empId: 'EMP/2024/003', name: 'Amit Patel',      date: '28 Mar 2026', requestedIn: '9:00 AM', requestedOut: '6:30 PM', reason: 'Forgot to punch — was in client meeting', status: 'Pending',  requestedOn: '29 Mar 2026' },
  { id: 'r2', empId: 'EMP/2024/009', name: 'Suresh Babu',     date: '27 Mar 2026', requestedIn: '9:15 AM', requestedOut: '6:00 PM', reason: 'Biometric malfunction at Goregaon office',  status: 'Pending',  requestedOn: '28 Mar 2026' },
  { id: 'r3', empId: 'EMP/2024/015', name: 'Arjun Krishnan',  date: '25 Mar 2026', requestedIn: '8:55 AM', requestedOut: '5:45 PM', reason: 'Site visit — worked from client premises',  status: 'Approved', requestedOn: '26 Mar 2026' },
  { id: 'r4', empId: 'EMP/2024/012', name: 'Ananya Krishnan', date: '26 Mar 2026', requestedIn: '9:00 AM', requestedOut: '6:15 PM', reason: 'System crash — could not log in to portal',  status: 'Rejected', requestedOn: '27 Mar 2026' },
  { id: 'r5', empId: 'EMP/2024/017', name: 'Tarun Joshi',     date: '24 Mar 2026', requestedIn: '9:30 AM', requestedOut: '6:00 PM', reason: 'Travel to Pune branch — biometric not available', status: 'Pending', requestedOn: '25 Mar 2026' },
  { id: 'r6', empId: 'EMP/2024/007', name: 'Vikram Singh',    date: '20 Mar 2026', requestedIn: '9:00 AM', requestedOut: '6:30 PM', reason: 'IP range changed due to office shift',       status: 'Approved', requestedOn: '21 Mar 2026' },
  { id: 'r7', empId: 'EMP/2024/019', name: 'Sanjay Mishra',   date: '18 Mar 2026', requestedIn: '9:10 AM', requestedOut: '7:00 PM', reason: 'Overtime — production deployment',           status: 'Approved', requestedOn: '19 Mar 2026' },
  { id: 'r8', empId: 'EMP/2024/001', name: 'Rajesh Kumar',    date: '15 Mar 2026', requestedIn: '8:50 AM', requestedOut: '6:45 PM', reason: 'Attended offsite sprint — no Biometric',     status: 'Pending',  requestedOn: '16 Mar 2026' },
]

const MONTHLY_SUMMARY: MonthlySummary[] = [
  { empId: 'EMP/2024/001', name: 'Rajesh Kumar',    department: 'Engineering',      workingDays: 26, present: 24, absent: 0, lop: 0, wfh: 5, late: 2, otHours: 6,  attendancePct: 96 },
  { empId: 'EMP/2024/002', name: 'Priya Sharma',    department: 'Human Resources',  workingDays: 26, present: 25, absent: 0, lop: 0, wfh: 2, late: 1, otHours: 2,  attendancePct: 98 },
  { empId: 'EMP/2024/003', name: 'Amit Patel',      department: 'Finance',          workingDays: 26, present: 22, absent: 2, lop: 2, wfh: 3, late: 4, otHours: 0,  attendancePct: 85 },
  { empId: 'EMP/2024/004', name: 'Sneha Gupta',     department: 'Sales',            workingDays: 26, present: 18, absent: 0, lop: 0, wfh: 1, late: 0, otHours: 0,  attendancePct: 69 },
  { empId: 'EMP/2024/005', name: 'Rahul Mehta',     department: 'Operations',       workingDays: 26, present: 24, absent: 1, lop: 0, wfh: 6, late: 1, otHours: 4,  attendancePct: 92 },
  { empId: 'EMP/2024/006', name: 'Deepika Nair',    department: 'Marketing',        workingDays: 26, present: 23, absent: 1, lop: 1, wfh: 4, late: 3, otHours: 1,  attendancePct: 88 },
  { empId: 'EMP/2024/007', name: 'Vikram Singh',    department: 'Engineering',      workingDays: 26, present: 25, absent: 0, lop: 0, wfh: 3, late: 0, otHours: 8,  attendancePct: 100 },
  { empId: 'EMP/2024/008', name: 'Kavitha Reddy',   department: 'Customer Support', workingDays: 26, present: 24, absent: 1, lop: 0, wfh: 2, late: 2, otHours: 3,  attendancePct: 92 },
  { empId: 'EMP/2024/009', name: 'Suresh Babu',     department: 'Sales',            workingDays: 26, present: 20, absent: 4, lop: 2, wfh: 0, late: 3, otHours: 0,  attendancePct: 77 },
  { empId: 'EMP/2024/010', name: 'Pooja Agarwal',   department: 'Finance',          workingDays: 26, present: 25, absent: 0, lop: 0, wfh: 3, late: 1, otHours: 2,  attendancePct: 96 },
  { empId: 'EMP/2024/011', name: 'Kiran Rao',       department: 'Engineering',      workingDays: 26, present: 24, absent: 1, lop: 0, wfh: 7, late: 0, otHours: 5,  attendancePct: 92 },
  { empId: 'EMP/2024/012', name: 'Ananya Krishnan', department: 'Human Resources',  workingDays: 26, present: 23, absent: 1, lop: 1, wfh: 2, late: 5, otHours: 0,  attendancePct: 88 },
]

/* Daily attendance % for bar chart (31 days of March) */
const DAILY_PCT = [88,92,90,95,87,0,0,94,96,91,89,93,0,0,95,88,92,90,87,0,0,93,91,94,88,92,0,0,89,91,95]

const DEPARTMENTS = ['All Departments', 'Engineering', 'Human Resources', 'Sales', 'Finance', 'Operations', 'Marketing', 'Customer Support']
const STATUSES: ['All', ...AttendanceStatus[]] = ['All', 'Present', 'Absent', 'Late', 'WFH', 'On Leave']

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
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
  const [regRequests, setRegRequests] = useState(REGULARIZATION_REQUESTS)

  /* Live data */
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(true)
  const [punchingIn, setPunchingIn] = useState(false)
  const [punchingOut, setPunchingOut] = useState(false)

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setLoadingAttendance(true)
    attendanceApi.list({ date: todayISO, limit: 200 })
      .then(r => setAttendanceLogs(r.data))
      .catch(console.error)
      .finally(() => setLoadingAttendance(false))
  }, [todayISO])

  /* Adapt API shape → existing UI shape */
  const adaptedLogs = useMemo(() => attendanceLogs.map(log => ({
    id: log.id,
    empId: log.employee?.emp_id ?? '—',
    name: log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : '—',
    department: log.employee?.department?.name ?? '—',
    checkIn: log.punch_in ?? '—',
    checkOut: log.punch_out ?? '—',
    hoursWorked: log.hours_worked != null ? `${log.hours_worked}h` : '—',
    status: ({ present: 'Present', late: 'Late', absent: 'Absent', work_from_home: 'WFH', on_leave: 'On Leave' } as Record<string, string>)[log.status] ?? log.status as AttendanceStatus,
    wfh: log.is_wfh,
    punchMethod: 'Manual' as const,
  })), [attendanceLogs])

  /* Fall back to mock data if API hasn't returned yet */
  const displayLogs = loadingAttendance ? TODAY_ATTENDANCE : (adaptedLogs.length > 0 ? adaptedLogs : TODAY_ATTENDANCE)

  const filteredAttendance = useMemo(() => {
    return displayLogs.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.empId.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || r.status === statusFilter
      const matchDept = deptFilter === 'All Departments' || r.department === deptFilter
      return matchSearch && matchStatus && matchDept
    })
  }, [displayLogs, search, statusFilter, deptFilter])

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
      await attendanceApi.requestRegularization({ date: todayISO, reason: 'Approved by HR' })
      setRegRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Approved' as RegStatus } : r))
    } catch { setRegRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Approved' as RegStatus } : r)) }
  }
  function rejectReg(id: string) {
    setRegRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Rejected' as RegStatus } : r))
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
    { label: 'Present Today',  value: String(presentCount), color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle2 size={20} /> },
    { label: 'Absent Today',   value: String(absentCount),  color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={20} /> },
    { label: 'WFH Today',      value: String(wfhCount),     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: <Home size={20} /> },
    { label: 'Late Arrivals',  value: String(lateCount),    color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: <AlertCircle size={20} /> },
    { label: 'On Leave',       value: String(onLeaveCount), color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: <Calendar size={20} /> },
  ]

  return (
    <>
      <Topbar
        title="Attendance Management"
        subtitle={today}
        notificationCount={3}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
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

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
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
                Showing {filteredAttendance.length} of 278 employees
              </span>
            </div>

            {/* Table */}
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
                  {filteredAttendance.map((rec, i) => (
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
              <span style={{ fontSize: '0.8rem', padding: '4px 12px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                {regRequests.filter((r) => r.status === 'Pending').length} Pending
              </span>
            </div>
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Daily Attendance — March 2026</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Company-wide attendance percentage per working day</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>March 2026</span>
                  <button className="btn btn-ghost btn-sm btn-icon"><ChevronRight size={16} /></button>
                </div>
              </div>

              {/* Chart */}
              <div style={{ position: 'relative' }}>
                {/* Y-axis labels */}
                <div style={{ display: 'flex', height: 160, gap: 4, alignItems: 'flex-end', paddingLeft: 36 }}>
                  {/* Y gridlines */}
                  <div style={{ position: 'absolute', left: 36, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
                    {[100, 75, 50, 25, 0].map((pct) => (
                      <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct * 1.6}px`, borderTop: '1px dashed var(--color-gray-200)', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: -34, fontSize: '0.65rem', color: 'var(--color-gray-400)', width: 30, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    ))}
                  </div>

                  {DAILY_PCT.map((pct, i) => {
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

                {/* X-axis labels */}
                <div style={{ display: 'flex', paddingLeft: 36, marginTop: 6 }}>
                  {DAILY_PCT.map((_, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-gray-400)' }}>
                      {(i + 1) % 5 === 1 || i + 1 === 31 ? i + 1 : ''}
                    </div>
                  ))}
                </div>

                {/* Legend */}
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
            </div>

            {/* Employee Monthly Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Employee Attendance Summary — March 2026</h3>
              </div>
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
                    {MONTHLY_SUMMARY.map((emp) => (
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
                                width: `${emp.attendancePct}%`,
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
    </>
  )
}
