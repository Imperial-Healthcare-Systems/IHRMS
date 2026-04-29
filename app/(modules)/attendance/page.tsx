'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
  Plus,
  Send,
} from 'lucide-react'

const MANAGEMENT_ROLES = ['super_admin', 'hr_admin', 'admin', 'hr', 'payroll_admin', 'finance_admin', 'operations_head', 'manager']

/* ── Geofencing constants ── */
const OFFICE_LAT = 28.4186153
const OFFICE_LNG = 77.0382462
const OFFICE_RADIUS_KM = 2

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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

// Departments are fetched from API; this is the fallback used during loading
const DEPARTMENTS_FALLBACK = ['All Departments']
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
  const { data: session } = useSession()
  const userRole = ((session?.user as Record<string, unknown>)?.role as string | null) ?? 'employee'
  const isEmployee = !MANAGEMENT_ROLES.includes(userRole)

  const [activeTab, setActiveTab] = useState<'today' | 'regularization' | 'monthly'>('today')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | AttendanceStatus>('All')
  const [deptFilter, setDeptFilter] = useState('All Departments')
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS_FALLBACK)

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(j => {
        const names = (j.data ?? []).map((d: { name: string }) => d.name)
        if (names.length > 0) setDepartments(['All Departments', ...names])
      })
      .catch(() => {/* use fallback */})
  }, [])

  /* Regularization requests — real data */
  const [regRequests, setRegRequests] = useState<RegularizationRequest[]>([])
  const [loadingReg, setLoadingReg] = useState(false)
  const [regLoaded, setRegLoaded] = useState(false)

  /* Employee — submit new regularization request */
  const [showEmpRegForm, setShowEmpRegForm] = useState(false)
  const [empRegForm, setEmpRegForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedIn: '',
    requestedOut: '',
    reason: '',
  })
  const [empRegSaving, setEmpRegSaving] = useState(false)

  async function submitEmpRegularization() {
    if (!empRegForm.reason.trim()) { toast.error('Please provide a reason for the correction'); return }
    if (!empRegForm.date) { toast.error('Please select the date'); return }
    setEmpRegSaving(true)
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:                empRegForm.date,
          reason:              empRegForm.reason.trim(),
          requested_punch_in:  empRegForm.requestedIn  || null,
          requested_punch_out: empRegForm.requestedOut || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      toast.success('Correction request submitted! HR will review it shortly.')
      setShowEmpRegForm(false)
      setEmpRegForm({ date: new Date().toISOString().split('T')[0], requestedIn: '', requestedOut: '', reason: '' })
      setRegLoaded(false) // trigger refresh of the list
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request')
    } finally { setEmpRegSaving(false) }
  }

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

  // Explicit punch state — seeded from own attendance fetch, updated on action
  const [hasPunchedIn,  setHasPunchedIn]  = useState(false)
  const [hasPunchedOut, setHasPunchedOut] = useState(false)
  const [punchInTime,   setPunchInTime]   = useState<string | null>(null)

  const myUserId = (session?.user as Record<string, unknown>)?.id as string | undefined

  // Work type drives geofencing rules — null means still loading from API
  const [myWorkType, setMyWorkType] = useState<'office' | 'home' | 'hybrid' | null>(null)
  // Hybrid employees toggle this when punching in on a WFH day
  const [isWfhToday, setIsWfhToday] = useState(false)
  // Live distance from office for geo-fence indicator
  const [officeDistKm, setOfficeDistKm]     = useState<number | null>(null)
  const [geoBlocked,   setGeoBlocked]       = useState(false)   // true = denied / unavailable
  const [geoChecking,  setGeoChecking]      = useState(false)

  const [today, setToday] = useState('')
  const todayISO = useMemo(() => {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0]
  }, [])

  useEffect(() => {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const istDate = new Date(Date.now() + IST_OFFSET_MS)
    setToday(istDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))
  }, [])

  // Fetch all today's attendance (for the table)
  useEffect(() => {
    setLoadingAttendance(true)
    attendanceApi.list({ date: todayISO, limit: 200 })
      .then(r => setAttendanceLogs(r.data))
      .catch(console.error)
      .finally(() => setLoadingAttendance(false))
  }, [todayISO])

  // Separately fetch own punch status for today — drives button state reliably
  useEffect(() => {
    if (!myUserId) return
    attendanceApi.list({ employee_id: myUserId, date: todayISO, limit: 1 })
      .then(r => {
        const own = r.data[0] ?? null
        setHasPunchedIn(!!own?.punch_in)
        setHasPunchedOut(!!own?.punch_out)
        setPunchInTime(own?.punch_in ?? null)
      })
      .catch(() => {})
  }, [myUserId, todayISO])

  // Fetch employee's work type for geofencing
  // Default to 'home' (no geofencing) when work_type is missing — admins/HR/org-owners
  // typically have no work_type set and should not be subject to office geofencing.
  // Only employees explicitly tagged 'office' or 'hybrid' are location-blocked.
  useEffect(() => {
    if (!myUserId) return
    fetch(`/api/employees/${myUserId}`)
      .then(r => r.json())
      .then(j => {
        const wt = (j.data?.work_type ?? 'home') as string
        setMyWorkType(wt === 'office' ? 'office' : wt === 'hybrid' ? 'hybrid' : 'home')
      })
      .catch(() => setMyWorkType('home'))
  }, [myUserId])

  // Proactively check distance from office whenever geo-fence applies
  useEffect(() => {
    if (myWorkType === null) return // still loading — do nothing until work type is known
    let cancelled = false
    const needsCheck = (myWorkType === 'office' || (myWorkType === 'hybrid' && !isWfhToday)) && !hasPunchedIn
    if (!needsCheck) {
      setOfficeDistKm(null)
      setGeoBlocked(false)
      setGeoChecking(false)
      return
    }
    if (!navigator.geolocation) { setGeoBlocked(true); return }
    setGeoChecking(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (cancelled) return // work type changed before this callback fired — discard
        const dist = haversineKm(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG)
        setOfficeDistKm(dist)
        setGeoBlocked(false)
        setGeoChecking(false)
      },
      () => { if (!cancelled) { setGeoBlocked(true); setGeoChecking(false) } },
      { timeout: 8000, maximumAge: 60000 },
    )
    return () => { cancelled = true }
  }, [myWorkType, isWfhToday, hasPunchedIn])

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
    geoLat: log.geo_lat,
    geoLng: log.geo_lng,
    geoLocation: log.geo_location,
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

  async function captureGeolocation(): Promise<{ geo_lat?: number; geo_lng?: number; geo_location?: string }> {
    if (!navigator.geolocation) return {}
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          let geo_location: string | undefined
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              { headers: { 'Accept-Language': 'en' } },
            )
            const json = await res.json()
            geo_location = json.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          } catch {
            geo_location = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          }
          resolve({ geo_lat: lat, geo_lng: lng, geo_location })
        },
        () => resolve({}),   // permission denied or unavailable — punch in without geo
        { timeout: 8000, maximumAge: 60000 },
      )
    })
  }

  async function handlePunchIn() {
    setPunchingIn(true)
    try {
      // Determine whether geo-fence check is required for this punch
      const isWfh = myWorkType === 'home' || myWorkType === null || (myWorkType === 'hybrid' && isWfhToday)
      const needsGeoFence = !isWfh // WFO always; hybrid on office days

      const geo = await captureGeolocation()

      if (needsGeoFence) {
        if (geo.geo_lat == null || geo.geo_lng == null) {
          toast.error('Location access is required for office punch-in. Please allow location permissions and try again.', { duration: 5000 })
          return
        }
        const distKm = haversineKm(geo.geo_lat, geo.geo_lng, OFFICE_LAT, OFFICE_LNG)
        if (distKm > OFFICE_RADIUS_KM) {
          toast.error(
            `You are ${distKm.toFixed(1)} km from the office. Punch-in is only allowed within ${OFFICE_RADIUS_KM} km of office premises.`,
            { duration: 6000 },
          )
          return
        }
      }

      const res = await attendanceApi.punchIn({ punch_method: 'Manual', ...geo, is_wfh: isWfh })
      setHasPunchedIn(true)
      setHasPunchedOut(false)
      setPunchInTime(res.data.punch_in ?? null)
      toast.success(isWfh ? 'Punched in — WFH day recorded!' : 'Punched in successfully!')
      attendanceApi.list({ date: todayISO, limit: 200 })
        .then(r => setAttendanceLogs(r.data))
        .catch(() => {})
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Punch in failed')
    } finally { setPunchingIn(false) }
  }

  async function handlePunchOut() {
    setPunchingOut(true)
    try {
      await attendanceApi.punchOut({ punch_method: 'Manual' })
      setHasPunchedOut(true)
      toast.success('Punched out successfully!')
      attendanceApi.list({ date: todayISO, limit: 200 })
        .then(r => setAttendanceLogs(r.data))
        .catch(() => {})
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

            {/* Hybrid: WFH-day toggle shown before first punch */}
            {myWorkType === 'hybrid' && !hasPunchedIn && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--color-gray-600)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', background: isWfhToday ? '#eff6ff' : '#fff' }}>
                <input
                  type="checkbox"
                  checked={isWfhToday}
                  onChange={e => setIsWfhToday(e.target.checked)}
                  style={{ width: 13, height: 13, accentColor: '#1d4ed8', cursor: 'pointer' }}
                />
                <Home size={12} style={{ color: isWfhToday ? '#1d4ed8' : 'inherit' }} />
                WFH today
              </label>
            )}

            {/* WFO / hybrid-office-day: live distance indicator */}
            {myWorkType !== null && (myWorkType === 'office' || (myWorkType === 'hybrid' && !isWfhToday)) && !hasPunchedIn && (() => {
              if (geoChecking) return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-md)', padding: '4px 8px' }}>
                  <MapPin size={11} />
                  Checking location…
                </span>
              )
              if (geoBlocked) return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '4px 8px' }}>
                  <MapPin size={11} />
                  Location access denied — cannot punch in
                </span>
              )
              if (officeDistKm !== null && officeDistKm > OFFICE_RADIUS_KM) return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '4px 8px' }}>
                  <MapPin size={11} />
                  {officeDistKm.toFixed(1)} km from office — out of range
                </span>
              )
              if (officeDistKm !== null && officeDistKm <= OFFICE_RADIUS_KM) return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '4px 8px' }}>
                  <MapPin size={11} />
                  {officeDistKm.toFixed(2)} km from office ✓
                </span>
              )
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '4px 8px' }}>
                  <MapPin size={11} />
                  Within 2 km required
                </span>
              )
            })()}

            <button
              className="btn btn-outline btn-sm"
              onClick={handlePunchOut}
              disabled={punchingOut || !hasPunchedIn || hasPunchedOut || loadingAttendance}
              title={!hasPunchedIn ? 'Punch in first' : hasPunchedOut ? 'Already punched out today' : ''}
            >
              <Clock size={14} />
              {punchingOut ? 'Punching Out…' : hasPunchedOut ? 'Punched Out ✓' : 'Punch Out'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePunchIn}
              disabled={
                punchingIn || hasPunchedIn || loadingAttendance ||
                (myWorkType !== 'home' && myWorkType !== null && geoBlocked) ||
                (myWorkType !== null && (myWorkType === 'office' || (myWorkType === 'hybrid' && !isWfhToday)) && officeDistKm !== null && officeDistKm > OFFICE_RADIUS_KM)
              }
              title={
                hasPunchedIn ? `Already punched in at ${punchInTime} IST`
                : geoBlocked && myWorkType !== 'home' ? 'Location access denied — enable GPS to punch in'
                : officeDistKm !== null && officeDistKm > OFFICE_RADIUS_KM ? `You are ${officeDistKm.toFixed(1)} km from the office — must be within ${OFFICE_RADIUS_KM} km`
                : ''
              }
            >
              <Clock size={14} />
              {punchingIn ? 'Punching In…' : hasPunchedIn ? 'Punched In ✓' : 'Punch In'}
            </button>
          </div>
        }
      />

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── Mobile-only Punch In/Out (topbar actions are hidden on mobile) ── */}
        <div className="flex flex-col sm:hidden" style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', padding: '12px', marginBottom: 16, gap: 10 }}>
          {/* Hybrid WFH toggle */}
          {myWorkType === 'hybrid' && !hasPunchedIn && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-gray-700)', cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', background: isWfhToday ? '#eff6ff' : '#fff' }}>
              <input type="checkbox" checked={isWfhToday} onChange={e => setIsWfhToday(e.target.checked)} style={{ width: 14, height: 14, accentColor: '#1d4ed8', cursor: 'pointer' }} />
              <Home size={13} style={{ color: isWfhToday ? '#1d4ed8' : 'inherit' }} />
              Working from home today
            </label>
          )}

          {/* Geo status indicator */}
          {myWorkType !== null && (myWorkType === 'office' || (myWorkType === 'hybrid' && !isWfhToday)) && !hasPunchedIn && (() => {
            if (geoChecking)  return <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-md)', padding: '5px 10px' }}><MapPin size={12} />Checking location…</span>
            if (geoBlocked)   return <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '5px 10px' }}><MapPin size={12} />Location access denied</span>
            if (officeDistKm !== null && officeDistKm > OFFICE_RADIUS_KM) return <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '5px 10px' }}><MapPin size={12} />{officeDistKm.toFixed(1)} km — out of range</span>
            if (officeDistKm !== null && officeDistKm <= OFFICE_RADIUS_KM) return <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '5px 10px' }}><MapPin size={12} />{officeDistKm.toFixed(2)} km from office ✓</span>
            return <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '5px 10px' }}><MapPin size={12} />Within 2 km required</span>
          })()}

          {/* Punch buttons row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handlePunchOut}
              disabled={punchingOut || !hasPunchedIn || hasPunchedOut || loadingAttendance}
            >
              <Clock size={14} />
              {punchingOut ? 'Punching Out…' : hasPunchedOut ? 'Punched Out ✓' : 'Punch Out'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handlePunchIn}
              disabled={
                punchingIn || hasPunchedIn || loadingAttendance ||
                (myWorkType !== 'home' && myWorkType !== null && geoBlocked) ||
                (myWorkType !== null && (myWorkType === 'office' || (myWorkType === 'hybrid' && !isWfhToday)) && officeDistKm !== null && officeDistKm > OFFICE_RADIUS_KM)
              }
            >
              <Clock size={14} />
              {punchingIn ? 'Punching In…' : hasPunchedIn ? 'Punched In ✓' : 'Punch In'}
            </button>
          </div>

          {/* Download report — full width below */}
          <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={downloadReport}>
            <Download size={14} />
            Download Report
          </button>
        </div>

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
                borderTop: 0,
                borderLeft: 0,
                borderRight: 0,
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
                {departments.map((d) => <option key={d}>{d}</option>)}
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
                      {['Employee', 'Department', 'Check-In', 'Check-Out', 'Hours Worked', 'Status', 'WFH', 'Location', 'Actions'].map((h) => (
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
                        <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                          {rec.geoLat && rec.geoLng ? (
                            <a
                              href={`https://www.google.com/maps?q=${rec.geoLat},${rec.geoLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={rec.geoLocation ?? `${rec.geoLat}, ${rec.geoLng}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#1d4ed8', fontSize: '0.8rem', textDecoration: 'none', maxWidth: 180 }}
                            >
                              <MapPin size={13} style={{ flexShrink: 0, color: '#ef4444' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rec.geoLocation
                                  ? rec.geoLocation.split(',').slice(0, 2).join(',').trim()
                                  : `${Number(rec.geoLat).toFixed(4)}, ${Number(rec.geoLng).toFixed(4)}`}
                              </span>
                            </a>
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
          isEmployee ? (
            /* ── EMPLOYEE VIEW: Submit + track own requests ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Submit new request banner */}
              <div style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)',
                border: '1px solid #BFDBFE', borderRadius: 12, padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
              }}>
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Attendance Correction Request</p>
                  <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 4 }}>
                    Missed a punch-in or punch-out? Submit a correction and HR will review it.
                  </p>
                </div>
                <button
                  onClick={() => setShowEmpRegForm(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', borderRadius: 9,
                    background: 'linear-gradient(135deg, #1E3A5F, #1565C0)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: '0.875rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(21,101,192,0.3)', flexShrink: 0,
                  }}
                >
                  <Plus size={15} /> New Correction Request
                </button>
              </div>

              {/* My submitted requests */}
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>My Correction Requests</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Track the status of your submitted attendance corrections</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setRegLoaded(false)} disabled={loadingReg} style={{ fontSize: '0.75rem' }}>
                    {loadingReg ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {loadingReg ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                    <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.875rem' }}>Loading your requests…</p>
                  </div>
                ) : regRequests.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                    <Edit size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No correction requests yet</p>
                    <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Click &ldquo;New Correction Request&rdquo; above to submit one.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                          {['Date', 'Requested Check-In', 'Requested Check-Out', 'Reason', 'Status', 'Submitted On'].map((h) => (
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
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-700)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{req.date}</td>
                            <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-800)', fontVariantNumeric: 'tabular-nums' }}>{req.requestedIn}</td>
                            <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-800)', fontVariantNumeric: 'tabular-nums' }}>{req.requestedOut}</td>
                            <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>{req.reason}</p>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <Badge label={req.status} config={REG_STATUS_CONFIG[req.status]} />
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>{req.requestedOn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Employee Submit Modal ── */}
              {showEmpRegForm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
                  <div style={{ background: '#fff', width: 500, maxWidth: '95vw', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

                    {/* Header */}
                    <div style={{ padding: '18px 22px 14px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Attendance Correction Request</h2>
                        <p style={{ fontSize: '0.775rem', color: '#9ca3af', margin: '3px 0 0' }}>Provide the correct times and a reason for the correction</p>
                      </div>
                      <button onClick={() => setShowEmpRegForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
                    </div>

                    {/* Form */}
                    <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Date */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date to Correct *</label>
                        <input
                          type="date"
                          value={empRegForm.date}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={e => setEmpRegForm(f => ({ ...f, date: e.target.value }))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Times row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Correct Check-In Time</label>
                          <input
                            type="time"
                            value={empRegForm.requestedIn}
                            onChange={e => setEmpRegForm(f => ({ ...f, requestedIn: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Correct Check-Out Time</label>
                          <input
                            type="time"
                            value={empRegForm.requestedOut}
                            onChange={e => setEmpRegForm(f => ({ ...f, requestedOut: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Reason for Correction *</label>
                        <textarea
                          value={empRegForm.reason}
                          onChange={e => setEmpRegForm(f => ({ ...f, reason: e.target.value }))}
                          placeholder="e.g. Forgot to punch in — was in office from 9:00 AM. Biometric device showed error."
                          rows={3}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Info note */}
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <AlertCircle size={14} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5, margin: 0 }}>
                          Your request will be reviewed by HR. You will be notified once it is approved or rejected.
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '14px 22px 20px', borderTop: '1.5px solid #f1f5f9', display: 'flex', gap: 10 }}>
                      <button onClick={() => setShowEmpRegForm(false)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button
                        onClick={submitEmpRegularization}
                        disabled={empRegSaving}
                        style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1E3A5F, #1565C0)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: empRegSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: empRegSaving ? 0.7 : 1 }}
                      >
                        {empRegSaving ? 'Submitting…' : <><Send size={14} /> Submit Request</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* ── MANAGEMENT VIEW: Review & approve all requests ── */
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
                  <button className="btn btn-ghost btn-sm" onClick={() => { setRegLoaded(false) }} disabled={loadingReg} style={{ fontSize: '0.75rem' }}>
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
                                <button onClick={() => approveReg(req.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                  <Check size={12} /> Approve
                                </button>
                                <button onClick={() => rejectReg(req.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
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
          )
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{isEmployee ? 'Your daily attendance for the month' : 'Company-wide attendance percentage per working day'}</p>
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
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{isEmployee ? 'My Attendance Summary' : 'Employee Attendance Summary'} — {monthLabel}</h3>
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
