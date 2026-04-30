'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Topbar } from '@/components/layout/Topbar'
import {
  Users, UserCheck, Calendar, Briefcase, Clock, IndianRupee,
  AlertCircle, CheckCircle2, FileText, CreditCard,
  ChevronRight, Star, ArrowUpRight, ArrowDownRight, Minus,
  Activity, Zap, Target, Shield, Download, UserPlus, PlayCircle,
  ClipboardList, BarChart2, ChevronDown, X,
} from 'lucide-react'
import {
  dashboardApi, attendanceApi, reportsApi, employeesApi, leavesApi,
  type DashboardStats, type AttendanceLog, type Employee, type LeaveBalance,
} from '@/lib/api-client'

const MANAGEMENT_ROLES = ['super_admin', 'hr_admin', 'admin', 'hr', 'payroll_admin', 'finance_admin', 'operations_head', 'manager']

/* ─────────────────────────────────────────────────────────────
   TYPES & DATA
───────────────────────────────────────────── */

// upcomingEvents is populated from live holidays API — see useEffect below
type UpcomingEvent = { label: string; date: string; color: string; bg: string; badge: string; icon: string }
const HOLIDAY_TYPE_CFG: Record<string, { color: string; bg: string; badge: string; icon: string }> = {
  national:   { color: '#10B981', bg: '#F0FDF4', badge: 'Holiday',  icon: '🎉' },
  regional:   { color: '#10B981', bg: '#F0FDF4', badge: 'Holiday',  icon: '🎉' },
  optional:   { color: '#8B5CF6', bg: '#F5F3FF', badge: 'Optional', icon: '📅' },
  restricted: { color: '#8B5CF6', bg: '#F5F3FF', badge: 'Optional', icon: '📅' },
  company:    { color: '#3B82F6', bg: '#EFF6FF', badge: 'Company',  icon: '🏢' },
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    Present: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
    WFH:     { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
    Late:    { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
    Absent:  { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444' },
  }
  const s = map[status] ?? map['Absent']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: '3px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors = [
    { bg: '#EFF6FF', text: '#1D4ED8' },
    { bg: '#FFF7ED', text: '#C2410C' },
    { bg: '#F0FDF4', text: '#15803D' },
    { bg: '#F5F3FF', text: '#6D28D9' },
    { bg: '#FFF1F2', text: '#BE123C' },
    { bg: '#F0FDFA', text: '#0F766E' },
  ]
  const c = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 800,
      flexShrink: 0, fontFamily: "'Outfit', sans-serif",
      border: `1.5px solid ${c.text}20`,
    }}>
      {initials}
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, color, subtext, trendDir,
}: {
  label: string; value: string; icon: React.ElementType
  color: { bg: string; icon: string; border: string; glow: string }
  subtext?: string; trendDir?: 'up' | 'down' | 'flat'
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
      borderTop: `3px solid ${color.icon}`,
      borderRight: '1px solid rgba(0,0,0,0.06)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      borderLeft: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      transition: 'all 0.2s ease', cursor: 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color.glow}, 0 12px 32px rgba(0,0,0,0.06)`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)'
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: color.bg, opacity: 0.5,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
            {value}
          </p>
          {subtext && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              {trendDir === 'up' && <ArrowUpRight size={12} style={{ color: '#16A34A', flexShrink: 0 }} />}
              {trendDir === 'down' && <ArrowDownRight size={12} style={{ color: '#DC2626', flexShrink: 0 }} />}
              {trendDir === 'flat' && <Minus size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />}
              <p style={{
                fontSize: 11.5, fontWeight: 600,
                color: trendDir === 'up' ? '#16A34A' : trendDir === 'down' ? '#DC2626' : '#94A3B8',
              }}>
                {subtext}
              </p>
            </div>
          )}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: color.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} style={{ color: color.icon }} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   EXPORT HELPERS
───────────────────────────────────────────── */
function exportToCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportDashboardCSV(stats: DashboardStats | null, totalStaff: number, presentToday: number, onLeave: number, wfhToday: number, payrollNet: string, payrollPeriod: string) {
  const rows: string[][] = [
    ['HR Dashboard Export — Imperial Healthcare HRMS'],
    ['Generated', new Date().toLocaleString('en-IN')],
    [],
    ['WORKFORCE OVERVIEW'],
    ['Metric', 'Value'],
    ['Total Employees', String(totalStaff)],
    ['Present Today',   String(presentToday)],
    ['On Leave Today',  String(onLeave)],
    ['WFH Today',       String(wfhToday)],
    ['Attendance Rate', stats?.today.attendance_rate ? `${stats.today.attendance_rate}%` : '—'],
    ['Open Positions',  String(stats?.recruitment.open_positions ?? '—')],
    [],
    ['PAYROLL'],
    ['Period', payrollPeriod],
    ['Total Net', payrollNet],
    [],
    ['PENDING ACTIONS'],
    ['Leaves Pending',          String(stats?.pending.leaves ?? 0)],
    ['Expenses Pending',        String(stats?.pending.expenses ?? 0)],
    ['Regularizations Pending', String(stats?.pending.regularizations ?? 0)],
  ]
  exportToCSV(rows, `IHRMS_Dashboard_${new Date().toISOString().slice(0,10)}.csv`)
}

function exportDashboardHTML(totalStaff: number, presentToday: number, onLeave: number, wfhToday: number, payrollNet: string, payrollPeriod: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>IHRMS Dashboard Report</title>
  <style>
    body{font-family:Arial,sans-serif;margin:32px;color:#1f2937}
    h1{color:#1e3a5f;border-bottom:3px solid #E8622A;padding-bottom:8px}
    h2{color:#374151;margin-top:24px;font-size:14px;text-transform:uppercase;letter-spacing:.05em}
    table{border-collapse:collapse;width:100%;margin-top:8px}
    th{background:#1e3a5f;color:#fff;padding:8px 12px;text-align:left;font-size:12px}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
    tr:nth-child(even) td{background:#f9fafb}
    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
    .present{background:#f0fdf4;color:#16a34a} .absent{background:#fef2f2;color:#dc2626}
    .wfh{background:#eff6ff;color:#1d4ed8} .late{background:#fffbeb;color:#b45309}
    .meta{font-size:11px;color:#94a3b8;margin-top:4px}
  </style></head><body>
  <h1>HR Dashboard Report — Imperial Healthcare</h1>
  <p class="meta">Generated: ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; Period: ${payrollPeriod}</p>
  <h2>Workforce Overview</h2>
  <table><tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Total Employees</td><td><b>${totalStaff}</b></td></tr>
  <tr><td>Present Today</td><td><b>${presentToday}</b></td></tr>
  <tr><td>On Leave</td><td><b>${onLeave}</b></td></tr>
  <tr><td>WFH Today</td><td><b>${wfhToday}</b></td></tr>
  <tr><td>Monthly Payroll</td><td><b>${payrollNet}</b></td></tr>
  </table>
  <h2>Summary</h2>
  <table><tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Present</td><td>${presentToday}</td></tr>
  <tr><td>On Leave</td><td>${onLeave}</td></tr>
  <tr><td>WFH</td><td>${wfhToday}</td></tr>
  </table>
  </body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `IHRMS_Dashboard_${new Date().toISOString().slice(0,10)}.html`; a.click()
  URL.revokeObjectURL(url)
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DashboardPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const userRole = ((session?.user as Record<string, unknown>)?.role as string | null) ?? 'employee'
  const userName = session?.user?.name ?? 'there'
  const isEmployee = !MANAGEMENT_ROLES.includes(userRole)
  const [stats,          setStats]          = useState<DashboardStats | null>(null)
  const [todayLogs,      setTodayLogs]      = useState<AttendanceLog[]>([])
  const [deptDist,       setDeptDist]       = useState<{ dept: string; count: number; pct: number; color: string }[]>([])
  const [recentEmps,     setRecentEmps]     = useState<Employee[]>([])
  const [leaveBalance,   setLeaveBalance]   = useState<LeaveBalance[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loadingWidgets, setLoadingWidgets] = useState(true)
  const [showExport,       setShowExport]       = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const exportRef   = useRef<HTMLDivElement>(null)
  const quickActRef = useRef<HTMLDivElement>(null)

  // Show access-denied toast when middleware redirected with ?denied=
  useEffect(() => {
    const denied = searchParams.get('denied')
    if (denied) {
      toast.error(`Access denied: you don't have permission to view /${denied}`, { duration: 5000 })
      // Clean the query param from the URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete('denied')
      window.history.replaceState({}, '', url.toString())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const todayISO = new Date().toISOString().split('T')[0]
    const year = new Date().getFullYear()
    Promise.all([
      dashboardApi.stats(),
      attendanceApi.list({ date: todayISO, limit: 8 }),
      reportsApi.analytics(),
      employeesApi.list({ status: 'active', limit: 20 }),
      leavesApi.balance(),
      fetch(`/api/holidays?year=${year}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([statsRes, attendRes, analyticsRes, empsRes, balRes, holidaysRes]) => {
      setStats(statsRes)
      setTodayLogs(attendRes.data.slice(0, 8))
      setDeptDist((analyticsRes.department_distribution ?? []).slice(0, 5))
      const sorted = [...empsRes.data].sort(
        (a, b) => new Date(b.hire_date ?? 0).getTime() - new Date(a.hire_date ?? 0).getTime()
      )
      setRecentEmps(sorted.slice(0, 5))
      setLeaveBalance(balRes.data ?? [])

      // Build upcoming events from live holidays (next 60 days)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const cutoff = new Date(today); cutoff.setDate(today.getDate() + 60)
      const holidays: UpcomingEvent[] = ((holidaysRes.data ?? []) as Record<string, unknown>[])
        .filter(h => {
          const d = new Date(h.date as string)
          return d >= today && d <= cutoff
        })
        .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())
        .slice(0, 6)
        .map(h => {
          const cfg = HOLIDAY_TYPE_CFG[(h.type as string) ?? 'national'] ?? HOLIDAY_TYPE_CFG.national
          const d = new Date(h.date as string)
          const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          return { label: h.name as string, date: dateLabel, ...cfg }
        })
      setUpcomingEvents(holidays)
    }).catch(console.error).finally(() => setLoadingWidgets(false))
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current   && !exportRef.current.contains(e.target as Node))   setShowExport(false)
      if (quickActRef.current && !quickActRef.current.contains(e.target as Node)) setShowQuickActions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loading        = loadingWidgets
  const totalStaff     = stats?.headcount.total               ?? 0
  const presentToday   = stats?.today.present                 ?? 0
  const onLeave        = stats?.today.on_leave                ?? 0
  const wfhToday       = stats?.today.wfh                     ?? 0
  const openPositions  = stats?.recruitment.open_positions    ?? 0
  const attendanceRate = stats?.today.attendance_rate         ?? 0
  const pendingLeaves  = stats?.pending.leaves                ?? 0
  const pendingExpenses= stats?.pending.expenses              ?? 0
  const pendingRegs    = stats?.pending.regularizations       ?? 0
  const payrollPeriod  = stats?.payroll.current_period        ?? '—'
  const payrollNet     = stats?.payroll.total_net ? `₹${(stats.payroll.total_net / 100000).toFixed(1)}L` : '—'
  const newJoiners     = stats?.headcount.new_joiners_this_month ?? 0

  // Build live pending actions from real stats
  const livePendingActions = [
    { icon: Calendar,   color: '#F59E0B', bg: '#FFFBEB', label: `${pendingLeaves} leave request${pendingLeaves !== 1 ? 's' : ''}`,            sub: 'Pending your approval',   btn: 'Review', urgency: pendingLeaves > 5 ? 'high' : 'medium', path: '/leaves' },
    { icon: Clock,      color: '#3B82F6', bg: '#EFF6FF', label: `${pendingRegs} attendance regularization${pendingRegs !== 1 ? 's' : ''}`,    sub: 'Employees requested edit', btn: 'Review', urgency: 'low',                               path: '/attendance' },
    { icon: CreditCard, color: '#8B5CF6', bg: '#F5F3FF', label: `${pendingExpenses} expense claim${pendingExpenses !== 1 ? 's' : ''}`,         sub: 'Awaiting reimbursement approval', btn: 'Review', urgency: 'medium',               path: '/reimbursements' },
    { icon: FileText,   color: '#EF4444', bg: '#FEF2F2', label: `Payroll — ${payrollPeriod}`,                                                   sub: stats?.payroll.status ? `Status: ${stats.payroll.status}` : 'Check payroll status', btn: 'View', urgency: stats?.payroll.status === 'draft' ? 'high' : 'low', path: '/payroll' },
  ]

  // Build leave balance rows from API (my balance)
  const leaveTypeLabels: Record<string, { label: string; color: string }> = {
    casual:       { label: 'Casual Leave (CL)',  color: '#3B82F6' },
    sick:         { label: 'Sick Leave (SL)',     color: '#10B981' },
    earned:       { label: 'Earned Leave (EL)',   color: '#8B5CF6' },
    unpaid:       { label: 'Loss of Pay (LOP)',   color: '#EF4444' },
    maternity:    { label: 'Maternity Leave',     color: '#EC4899' },
    paternity:    { label: 'Paternity Leave',     color: '#0369A1' },
    compensatory: { label: 'Comp Off',            color: '#F59E0B' },
    bereavement:  { label: 'Bereavement',         color: '#64748B' },
  }
  const leaveStatusRows = leaveBalance.slice(0, 4).map(b => {
    const cfg = leaveTypeLabels[b.leave_type] ?? { label: b.leave_type, color: '#94A3B8' }
    const raw   = b as unknown as Record<string, unknown>
    const total = (typeof raw.total_days === 'number' ? raw.total_days : null) ?? (b.opening_balance + b.credited)
    const used  = b.used ?? 0
    const pct   = total > 0 ? Math.round((used / total) * 100) : 0
    return { type: cfg.label, used, total, color: cfg.color, pct }
  })

  return (
    <>
      <Topbar
        title={isEmployee ? 'My Dashboard' : 'HR Dashboard'}
        subtitle={isEmployee ? `Welcome, ${userName} — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : `Welcome back — ${payrollPeriod}`}
        notificationCount={isEmployee ? 0 : pendingLeaves + pendingExpenses + pendingRegs}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* ── Export dropdown — management only ── */}
            {!isEmployee && <div ref={exportRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowExport(v => !v); setShowQuickActions(false) }}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '6px 12px' }}
              >
                <FileText size={13} />
                Export
                <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: showExport ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {showExport && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                  background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden',
                }}>
                  <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Export As
                  </div>
                  {[
                    { icon: FileText, label: 'Export as CSV',          sub: 'Spreadsheet-ready data',    action: () => { exportDashboardCSV(stats, totalStaff, presentToday, onLeave, wfhToday, payrollNet, payrollPeriod ?? 'Apr 2026'); setShowExport(false) } },
                    { icon: Download, label: 'Export as HTML Report',  sub: 'Printable summary page',    action: () => { exportDashboardHTML(totalStaff, presentToday, onLeave, wfhToday, payrollNet, payrollPeriod ?? 'Apr 2026'); setShowExport(false) } },
                    { icon: BarChart2, label: 'Export Attendance CSV', sub: "Today's attendance log",    action: () => { exportToCSV([['Name','Department','Check-In','Hours','Status'], ...todayLogs.map(l=>[l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : '—', l.employee?.department?.name ?? '—', l.punch_in ?? '—', l.hours_worked != null ? `${l.hours_worked}h` : '—', l.status])], `IHRMS_Attendance_${new Date().toISOString().slice(0,10)}.csv`); setShowExport(false) } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <item.icon size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.sub}</div>
                      </div>
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px 14px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <X size={11} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Files download to your device</span>
                  </div>
                </div>
              )}
            </div>}

            {/* ── Quick Actions dropdown — management only ── */}
            {!isEmployee && <div ref={quickActRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowQuickActions(v => !v); setShowExport(false) }}
                style={{
                  background: 'linear-gradient(135deg, #1E3A5F 0%, #1565C0 100%)',
                  color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
                }}
              >
                <Zap size={13} />
                Quick Actions
                <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: showQuickActions ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {showQuickActions && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                  background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 230, overflow: 'hidden',
                }}>
                  <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    HR Actions
                  </div>
                  {[
                    { icon: UserPlus,     label: 'Add New Employee',     sub: 'Onboard a new hire',             color: '#2563eb', path: '/employees' },
                    { icon: ClipboardList,label: 'Review Leave Requests', sub: `${pendingLeaves} awaiting approval`, color: '#d97706', path: '/leaves' },
                    { icon: PlayCircle,   label: 'Run Payroll',           sub: 'Process current month salary',   color: '#7c3aed', path: '/payroll' },
                    { icon: UserCheck,    label: 'Mark Attendance',       sub: "Record today's attendance",       color: '#16a34a', path: '/attendance' },
                    { icon: Briefcase,    label: 'Post Job Opening',       sub: 'Add a new recruitment listing',  color: '#ea580c', path: '/recruitment' },
                    { icon: BarChart2,    label: 'View Reports',          sub: 'Analytics & compliance reports',  color: '#0891b2', path: '/reports' },
                  ].map(item => (
                    <button key={item.label}
                      onClick={() => { router.push(item.path); setShowQuickActions(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <item.icon size={14} style={{ color: item.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.sub}</div>
                      </div>
                      <ChevronRight size={12} style={{ color: '#cbd5e1', marginLeft: 'auto', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>}

          </div>
        }
      />

      <div style={{ padding: '16px 16px 56px', maxWidth: 1600 }} className="sm:!px-6">

        {/* ══════════════════════════════════════════
            EMPLOYEE PERSONAL DASHBOARD
            Shown only to users with role=employee
        ══════════════════════════════════════════ */}
        {isEmployee ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Welcome banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1E3A5F 0%, #1565C0 100%)',
              borderRadius: 14, padding: '24px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              boxShadow: '0 4px 20px rgba(21,101,192,0.2)',
            }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: 0 }}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {userName.split(' ')[0]}!
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                  Imperial Healthcare Systems · Employee Portal
                </p>
              </div>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserCheck size={26} color="#FFFFFF" />
              </div>
            </div>

            {/* Quick action tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12 }}>
              {[
                { icon: Clock,     label: 'My Attendance', sub: 'View your records',    color: '#2563EB', bg: '#EFF6FF', path: '/attendance' },
                { icon: Calendar,  label: 'Apply Leave',   sub: 'Submit leave request', color: '#16A34A', bg: '#F0FDF4', path: '/leaves' },
                { icon: IndianRupee, label: 'My Payslips', sub: 'View salary slips',    color: '#7C3AED', bg: '#F5F3FF', path: '/payslips' },
                { icon: AlertCircle, label: 'Announcements', sub: 'Company updates',    color: '#EA580C', bg: '#FFF7ED', path: '/announcements' },
              ].map(tile => (
                <button
                  key={tile.label}
                  onClick={() => router.push(tile.path)}
                  style={{
                    background: '#FFFFFF', borderRadius: 12, padding: '18px 16px',
                    borderTop: `3px solid ${tile.color}`,
                    borderRight: '1px solid rgba(0,0,0,0.06)',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    borderLeft: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${tile.color}20` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: tile.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <tile.icon size={18} style={{ color: tile.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{tile.label}</p>
                    <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{tile.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Leave balance + upcoming events */}
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>

              {/* My Leave Balance */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>My Leave Balance</p>
                    <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Current year · {new Date().getFullYear()}</p>
                  </div>
                  <button onClick={() => router.push('/leaves')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F47920', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Apply Leave <ChevronRight size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {loading ? (
                    <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>Loading…</p>
                  ) : leaveStatusRows.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>No leave balance data</p>
                  ) : leaveStatusRows.map((l) => (
                    <div key={l.type}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: '#374151', fontWeight: 500 }}>{l.type}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: l.color }}>
                          {l.used}{l.total > 0 ? ` / ${l.total} days` : ' days used'}
                        </span>
                      </div>
                      {l.total > 0 && (
                        <div style={{ height: 4, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${l.pct}%`, background: l.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F4F9' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Upcoming Events</p>
                    <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Holidays & company events</p>
                  </div>
                </div>
                <div>
                  {upcomingEvents.length === 0 && !loadingWidgets && (
                    <p style={{ textAlign: 'center', padding: '24px', fontSize: 12.5, color: '#94A3B8' }}>No upcoming holidays in the next 60 days</p>
                  )}
                  {upcomingEvents.slice(0, 4).map((ev, i, arr) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                      borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: ev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {ev.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, color: '#1E293B', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.label}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{ev.date}</p>
                      </div>
                      <span style={{ background: ev.bg, color: ev.color, border: `1px solid ${ev.color}30`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                        {ev.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (<>

        {/* ── KPI Strip ── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
          style={{
          gap: 0,
          background: '#FFFFFF',
          borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {[
            { label: 'Total Staff',      value: String(totalStaff),    delta: `↑${newJoiners}`,                          up: true  },
            { label: 'Present Today',    value: String(presentToday),  delta: `${attendanceRate}%`,                      up: true  },
            { label: 'On Leave',         value: String(onLeave),       delta: `${totalStaff ? ((onLeave/totalStaff)*100).toFixed(1) : 0}%`, up: false },
            { label: 'WFH Today',        value: String(wfhToday),      delta: `${totalStaff ? ((wfhToday/totalStaff)*100).toFixed(1) : 0}%`, up: null  },
            { label: 'Open Positions',   value: String(openPositions), delta: 'hiring',                                  up: null  },
            { label: 'Monthly Payroll',  value: payrollNet,            delta: payrollPeriod ?? 'Current',                up: null  },
            { label: 'Pending Actions',  value: String(pendingLeaves + pendingExpenses + pendingRegs), delta: 'to review', up: null },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px 16px', textAlign: 'center',
              borderRight: i < 6 ? '1px solid #F1F4F9' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFD'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {item.value}
              </div>
              <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 500, marginTop: 3 }}>{item.label}</div>
              {item.delta && (
                <div style={{
                  fontSize: 10, fontWeight: 700, marginTop: 2,
                  color: item.up === true ? '#16A34A' : item.up === false ? '#DC2626' : '#94A3B8',
                }}>
                  {item.delta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 6-card Stat Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 14, marginBottom: 20 }}>
          <StatCard label="Total Employees" value={String(totalStaff)} icon={Users} subtext={`↑ ${newJoiners} this month`} trendDir="up"
            color={{ bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE', glow: 'rgba(37,99,235,0.12)' }} />
          <StatCard label="Present Today" value={String(presentToday)} icon={UserCheck} subtext={`${attendanceRate}% attendance`} trendDir="up"
            color={{ bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0', glow: 'rgba(22,163,74,0.12)' }} />
          <StatCard label="On Leave Today" value={String(onLeave)} icon={Calendar} subtext={`${totalStaff ? ((onLeave/totalStaff)*100).toFixed(1) : 0}% of workforce`} trendDir="flat"
            color={{ bg: '#FFFBEB', icon: '#D97706', border: '#FDE68A', glow: 'rgba(217,119,6,0.12)' }} />
          <StatCard label="Open Positions" value={String(openPositions)} icon={Briefcase} subtext="Actively hiring" trendDir="flat"
            color={{ bg: '#FFF7ED', icon: '#EA580C', border: '#FED7AA', glow: 'rgba(234,88,12,0.12)' }} />
          <StatCard label="Pending Approvals" value={String(pendingLeaves + pendingExpenses + pendingRegs)} icon={Clock} subtext="Action required" trendDir="down"
            color={{ bg: '#FEF2F2', icon: '#DC2626', border: '#FECACA', glow: 'rgba(220,38,38,0.12)' }} />
          <StatCard label="This Month Payroll" value={payrollNet} icon={IndianRupee} subtext={payrollPeriod ?? 'Current'} trendDir="up"
            color={{ bg: '#F5F3FF', icon: '#7C3AED', border: '#DDD6FE', glow: 'rgba(124,58,237,0.12)' }} />
        </div>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 14, marginBottom: 20 }}>

          {/* Attendance Rate */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Attendance Rate</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Today</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: attendanceRate >= 80 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${attendanceRate >= 80 ? '#BBF7D0' : '#FECACA'}`, borderRadius: 20, padding: '3px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: attendanceRate >= 80 ? '#22C55E' : '#EF4444' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: attendanceRate >= 80 ? '#15803D' : '#B91C1C' }}>{attendanceRate >= 80 ? 'Good' : 'Low'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: loading ? '#94A3B8' : '#16A34A', lineHeight: 1 }}>
                {loading ? '…' : `${attendanceRate}%`}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${attendanceRate}%`, borderRadius: 99, background: 'linear-gradient(90deg, #16A34A, #22C55E)', position: 'relative', overflow: 'hidden', transition: 'width 0.6s ease' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer-progress 2s linear infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
              <span>Target: 90%</span>
              <span>14 working days left</span>
            </div>
          </div>

          {/* Headcount by Dept */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Headcount by Dept</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Top 5 departments</p>
              </div>
              <span style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 9px' }}>
                {loading ? '…' : `${totalStaff} total`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? (
                <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>Loading…</p>
              ) : deptDist.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>No data</p>
              ) : deptDist.map((d) => (
                <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: '#374151', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.dept}
                  </span>
                  <div style={{ width: 90, height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${d.pct}%`,
                      borderRadius: 99, background: d.color, transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2937', minWidth: 28, textAlign: 'right' }}>
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Status */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>My Leave Balance</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Current year</p>
              </div>
              <Target size={15} style={{ color: '#94A3B8' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>Loading…</p>
              ) : leaveStatusRows.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>No balance data</p>
              ) : leaveStatusRows.map((l) => (
                <div key={l.type}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{l.type}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>
                      {l.used}{l.total > 0 ? ` / ${l.total}` : ' days'}
                    </span>
                  </div>
                  {l.total > 0 && (
                    <div style={{ height: 3, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${l.pct}%`, background: l.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', fontSize: 11, color: '#94A3B8' }}>
              Your leave balance · {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* ── Today's Attendance + Pending Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr]" style={{ gap: 14, marginBottom: 20 }}>

          {/* Today's Attendance */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Today&apos;s Attendance</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {totalStaff} employees</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748B', marginRight: 4 }}>
                  {[['#22C55E', 'Present'], ['#3B82F6', 'WFH'], ['#F59E0B', 'Late'], ['#EF4444', 'Absent']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      {l}
                    </span>
                  ))}
                </div>
                <button onClick={() => router.push('/attendance')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F47920', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  View All <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading attendance…</div>
              ) : todayLogs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No attendance records for today</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Employee', 'Department', 'Check-In', 'Hours', 'Status'].map(h => (
                        <th key={h} style={{
                          padding: '9px 16px', textAlign: 'left',
                          fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: '#94A3B8',
                          borderBottom: '1px solid #EEF0F4', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayLogs.map((log, i) => {
                      const name = log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : '—'
                      const dept = log.employee?.department?.name ?? '—'
                      const checkIn = log.punch_in ?? '—'
                      const hours = log.hours_worked != null ? `${log.hours_worked}h` : '—'
                      const statusMap: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent', work_from_home: 'WFH', on_leave: 'On Leave', half_day: 'Present' }
                      const status = statusMap[log.status] ?? log.status
                      return (
                        <tr key={log.id}
                          style={{ borderBottom: i < todayLogs.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar name={name} size={28} />
                              <span style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', color: '#64748B', fontSize: 12.5 }}>{dept}</td>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#374151', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{checkIn}</td>
                          <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: 12 }}>{hours}</td>
                          <td style={{ padding: '10px 16px' }}><StatusBadge status={status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Pending Actions</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Requires your attention</p>
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA',
                borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 9px',
              }}>
                <Activity size={10} />
                {loading ? '…' : `${pendingLeaves + pendingExpenses + pendingRegs} total`}
              </span>
            </div>

            <div style={{ padding: '6px 0' }}>
              {livePendingActions.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                    borderBottom: i < livePendingActions.length - 1 ? '1px solid #F8FAFC' : 'none',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFC'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: item.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: `1px solid ${item.color}20`,
                    }}>
                      <Icon size={16} style={{ color: item.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', lineHeight: 1.3 }}>{item.label}</p>
                      <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{item.sub}</p>
                    </div>
                    {item.urgency === 'high' && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#EF4444',
                        flexShrink: 0, boxShadow: '0 0 0 3px rgba(239,68,68,0.2)',
                        animation: 'notif-ring 1.5s ease-in-out infinite',
                      }} />
                    )}
                    <button onClick={() => router.push(item.path)} style={{
                      background: '#F8FAFC', border: '1px solid #E2E8F0',
                      borderRadius: 7, padding: '5px 12px',
                      fontSize: 11.5, fontWeight: 600, color: '#374151', cursor: 'pointer',
                      transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.bg; (e.currentTarget as HTMLElement).style.borderColor = item.color; (e.currentTarget as HTMLElement).style.color = item.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#374151' }}
                    >
                      {item.btn}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderTop: '1px solid #F1F5F9',
              background: '#FAFBFD',
            }}>
              <AlertCircle size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: '#64748B' }}>
                {loading ? 'Loading…' : `${pendingLeaves + pendingExpenses + pendingRegs} items need resolution`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Recent Joiners + Upcoming Events ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr]" style={{ gap: 14 }}>

          {/* Recent Joiners */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Recent Joiners</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Latest active employees</p>
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0',
                borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 9px',
              }}>
                <Star size={10} />
                {loading ? '…' : `${newJoiners} this month`}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
              ) : recentEmps.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No employees found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Employee', 'Dept / Designation', 'Joined', 'Status'].map(h => (
                        <th key={h} style={{
                          padding: '9px 16px', textAlign: 'left',
                          fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: '#94A3B8',
                          borderBottom: '1px solid #EEF0F4', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmps.map((emp, i) => {
                      const name = `${emp.first_name} ${emp.last_name}`
                      const joinDate = emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
                      const daysAgo = emp.hire_date ? Math.floor((Date.now() - new Date(emp.hire_date).getTime()) / 86400000) : null
                      const statusLabel = emp.status === 'probation' ? 'Probation' : emp.status === 'active' ? 'Active' : emp.status
                      const statusStyles = emp.status === 'probation'
                        ? { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#F59E0B' }
                        : { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E' }
                      return (
                        <tr key={emp.id}
                          style={{ borderBottom: i < recentEmps.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar name={name} size={28} />
                              <div>
                                <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13, lineHeight: 1.3 }}>{name}</p>
                                <p style={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1.2 }}>{emp.emp_id}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <p style={{ fontSize: 12.5, fontWeight: 500, color: '#374151', lineHeight: 1.3 }}>{emp.department?.name ?? '—'}</p>
                            <p style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.2 }}>{emp.designation?.title ?? '—'}</p>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.3 }}>{joinDate}</p>
                            {daysAgo !== null && <p style={{ fontSize: 10.5, color: '#94A3B8' }}>{daysAgo}d ago</p>}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: statusStyles.bg, color: statusStyles.color, border: `1px solid ${statusStyles.border}`,
                              borderRadius: 20, fontSize: 10.5, fontWeight: 700, padding: '2px 8px',
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusStyles.dot }} />
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Upcoming Events</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Next 30 days</p>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F47920', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Calendar <ChevronRight size={12} />
              </button>
            </div>
            <div>
              {upcomingEvents.length === 0 && !loadingWidgets && (
                <p style={{ textAlign: 'center', padding: '24px', fontSize: 12.5, color: '#94A3B8' }}>No upcoming holidays in the next 60 days</p>
              )}
              {upcomingEvents.map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  borderBottom: i < upcomingEvents.length - 1 ? '1px solid #F8FAFC' : 'none',
                  transition: 'background 0.1s', cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: ev.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, border: `1px solid ${ev.color}20`,
                  }}>
                    {ev.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, color: '#1E293B', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.label}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{ev.date}</p>
                  </div>
                  <span style={{
                    background: ev.bg, color: ev.color,
                    border: `1px solid ${ev.color}30`,
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  }}>
                    {ev.badge}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderTop: '1px solid #F1F5F9',
              background: '#FAFBFD',
            }}>
              <CheckCircle2 size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: '#64748B' }}>
                All statutory filings up to date · Last sync: today
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer info strip ── */}
        <div style={{
          marginTop: 20, padding: '14px 18px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)',
          border: '1px solid #BFDBFE',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1E3A5F, #1565C0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>IHRMS v2.0 — India Compliance Ready</p>
              <p style={{ fontSize: 11, color: '#3B82F6' }}>All data shown is demo. Connect Supabase to enable live payroll, attendance, and real-time dashboards.</p>
            </div>
          </div>
          <button style={{
            background: 'linear-gradient(135deg, #1E3A5F, #1565C0)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '7px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ArrowUpRight size={13} /> Connect Supabase
          </button>
        </div>

        </>)}

      </div>
    </>
  )
}
