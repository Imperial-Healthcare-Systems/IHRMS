'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { leavesApi, type LeaveRequest as ApiLeave } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Clock,
  FileText,
  Info,
  Calendar,
  Briefcase,
  Star,
  Shield,
  Eye,
  Ban,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type LeaveType = 'CL' | 'SL' | 'EL' | 'LOP' | 'ML' | 'PL' | 'CompOff' | 'Bereavement'
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

interface LeaveRequest {
  id: string
  leaveType: LeaveType
  fromDate: string
  toDate: string
  days: number
  reason: string
  status: LeaveStatus
  appliedOn: string
}

interface PendingApproval {
  id: string
  empId: string
  name: string
  department: string
  leaveType: LeaveType
  fromDate: string
  toDate: string
  days: number
  reason: string
  appliedOn: string
  pendingSince: number
  status: 'Pending' | 'Approved' | 'Rejected'
}

interface TeamCalLeave {
  name: string
  color: string
  days: number[]
  leaveType: string
}

interface LeavePolicy {
  type: LeaveType
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
  annualQuota: number | string
  carryForward: number | string
  accrual: string
  minNotice: string
  encashable: boolean
  fromDay1: boolean
  notes: string
}

interface BalanceCard {
  type: LeaveType
  label: string
  dbType: string
  total: number
  available: number
  used: number
  color: string
  bg: string
  border: string
}

/* ─────────────────────────────────────────────────────────────
   LEAVE BALANCE CONFIG
───────────────────────────────────────────────────────────── */
const BALANCE_DEFAULTS: Omit<BalanceCard, 'available' | 'used'>[] = [
  { type: 'CL',         label: 'Casual Leave',        dbType: 'casual',       total: 12, color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { type: 'SL',         label: 'Sick Leave',          dbType: 'sick',         total: 12, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { type: 'EL',         label: 'Earned Leave',        dbType: 'earned',       total: 18, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { type: 'LOP',        label: 'Loss of Pay',         dbType: 'unpaid',       total: 0,  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { type: 'ML',         label: 'Maternity/Paternity', dbType: 'maternity',    total: 90, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  { type: 'CompOff',    label: 'Comp Off',            dbType: 'compensatory', total: 4,  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
]

function buildBalanceCards(apiData: Record<string, unknown>[]): BalanceCard[] {
  return BALANCE_DEFAULTS.map(def => {
    const row = apiData.find(r => r.leave_type === def.dbType || r.leave_type === def.type)
    const total     = Number(row?.total_days     ?? row?.allocated_days ?? def.total)
    const used      = Number(row?.used_days      ?? row?.taken_days     ?? 0)
    const available = Number(row?.remaining_days ?? row?.balance_days   ?? Math.max(0, total - used))
    return { ...def, available, total, used }
  })
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const DB_LEAVE_TO_SHORT: Record<string, LeaveType> = {
  casual: 'CL', sick: 'SL', earned: 'EL', unpaid: 'LOP',
  maternity: 'ML', paternity: 'PL', compensatory: 'CompOff', bereavement: 'Bereavement',
  work_from_home: 'LOP',
  CL: 'CL', SL: 'SL', EL: 'EL', LOP: 'LOP', ML: 'ML', PL: 'PL',
  CompOff: 'CompOff', Bereavement: 'Bereavement',
}

function safeLeaveType(raw: string): LeaveType {
  return DB_LEAVE_TO_SHORT[raw] ?? 'CL'
}

function safeStatus(raw: string): LeaveStatus {
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1)
  const valid: LeaveStatus[] = ['Pending', 'Approved', 'Rejected', 'Cancelled']
  return valid.includes(cap as LeaveStatus) ? (cap as LeaveStatus) : 'Pending'
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return s }
}

function daysBetween(a: string, b: string): number {
  try {
    return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1)
  } catch { return 0 }
}

const PALETTE = ['#1E3A5F','#FF6B00','#1A7A4A','#7C3AED','#0369A1','#BE185D','#0F766E','#B45309']

function buildTeamCalendar(leaves: ApiLeave[], month: number, year: number): TeamCalLeave[] {
  const entries: TeamCalLeave[] = []
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth  = new Date(year, month + 1, 0)

  leaves
    .filter(l => l.from_date && l.to_date && (l.status === 'approved' || l.status === 'pending'))
    .forEach((l, idx) => {
      const from = new Date(l.from_date! + 'T00:00:00')
      const to   = new Date(l.to_date!   + 'T00:00:00')
      const start = from < firstOfMonth ? firstOfMonth : from
      const end   = to   > lastOfMonth  ? lastOfMonth  : to
      const days: number[] = []
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.getDate())
      }
      if (!days.length) return
      const emp = l.employee as Record<string, unknown> | undefined
      const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'
      entries.push({ name, color: PALETTE[idx % PALETTE.length], leaveType: safeLeaveType(l.leave_type), days })
    })

  return entries
}

const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; color: string; bg: string; border: string }> = {
  'CL':          { label: 'Casual Leave',        color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  'SL':          { label: 'Sick Leave',           color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  'EL':          { label: 'Earned Leave',         color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  'LOP':         { label: 'Loss of Pay',          color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  'ML':          { label: 'Maternity Leave',      color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  'PL':          { label: 'Paternity Leave',      color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  'CompOff':     { label: 'Comp Off',             color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  'Bereavement': { label: 'Bereavement',          color: '#1f2937', bg: '#f9fafb', border: '#e5e7eb' },
}

const STATUS_CONFIG: Record<LeaveStatus, { bg: string; color: string; border: string }> = {
  'Pending':   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Approved':  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Rejected':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Cancelled': { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const LEAVE_POLICIES: LeavePolicy[] = [
  { type: 'CL', label: 'Casual Leave', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: <Calendar size={18} />, annualQuota: 12, carryForward: 0, accrual: '1 day/month', minNotice: '1 day', encashable: false, fromDay1: true, notes: 'Cannot be clubbed with other leaves. Max 3 days at a stretch.' },
  { type: 'SL', label: 'Sick Leave', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: <Shield size={18} />, annualQuota: 12, carryForward: 5, accrual: '1 day/month', minNotice: 'Immediate', encashable: false, fromDay1: true, notes: 'Medical certificate required for more than 2 consecutive days.' },
  { type: 'EL', label: 'Earned Leave', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: <Star size={18} />, annualQuota: 18, carryForward: 30, accrual: '1.5 days/month', minNotice: '7 days', encashable: true, fromDay1: false, notes: 'Accrued after 6 months of service. Encashable up to 15 days at year end.' },
  { type: 'LOP', label: 'Loss of Pay', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <Ban size={18} />, annualQuota: '—', carryForward: 0, accrual: 'As applicable', minNotice: '—', encashable: false, fromDay1: true, notes: 'Applied when all leave balances are exhausted. Salary deducted proportionally.' },
  { type: 'ML', label: 'Maternity / Paternity', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', icon: <Briefcase size={18} />, annualQuota: '90 / 15 days', carryForward: 0, accrual: 'One-time', minNotice: '30 days', encashable: false, fromDay1: false, notes: 'Maternity: 90 days as per Maternity Benefit Act. Paternity: 15 days. Applicable after 1 year of service.' },
  { type: 'CompOff', label: 'Comp Off', color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: <Clock size={18} />, annualQuota: 'As earned', carryForward: 0, accrual: 'Per weekend/holiday worked', minNotice: '1 day', encashable: false, fromDay1: true, notes: 'Must be availed within 60 days of the compensated work day. No carry forward.' },
]

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 700, color: PALETTE[idx], flexShrink: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.02em' }}>
      {initials}
    </div>
  )
}

function Badge({ label, config }: { label: string; config: { bg: string; color: string; border: string } }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, background: config.bg, color: config.color, border: `1px solid ${config.border}`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   APPLY LEAVE MODAL
───────────────────────────────────────────────────────────── */
function ApplyLeaveModal({ onClose, balanceCards, onSuccess }: { onClose: () => void; balanceCards: BalanceCard[]; onSuccess: () => void }) {
  const [leaveType, setLeaveType] = useState<LeaveType>('CL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [halfDay, setHalfDay] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const balance = balanceCards.find((b) => b.type === leaveType)

  async function handleSubmit() {
    if (!fromDate || !toDate || !reason) return
    setSubmitting(true)
    try {
      const from = new Date(fromDate)
      const to = new Date(toDate)
      const days = halfDay ? 0.5 : Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1)
      await leavesApi.create({ leave_type: leaveType, from_date: fromDate, to_date: toDate, days, reason })
      toast.success('Leave request submitted successfully!')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 'var(--z-modal)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Apply for Leave</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Submit a leave request for manager approval</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon"><X size={18} /></button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leave Type *</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--color-gray-800)' }}>
              {(['CL','SL','EL','LOP','ML','PL','CompOff','Bereavement'] as LeaveType[]).map((t) => (
                <option key={t} value={t}>{LEAVE_TYPE_CONFIG[t].label} ({t})</option>
              ))}
            </select>
            {balance && balance.total > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: balance.bg, border: `1px solid ${balance.border}`, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={14} style={{ color: balance.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: balance.color, fontWeight: 600 }}>
                  Available Balance: {balance.available} days ({balance.used} used of {balance.total})
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From Date *</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To Date *</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate} style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="halfday" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-imperial-blue)' }} />
            <label htmlFor="halfday" style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', fontWeight: 500, cursor: 'pointer' }}>Apply for Half Day (0.5 days)</label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the reason for leave…" rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none' }} />
          </div>

          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', marginBottom: 20, display: 'flex', gap: 10 }}>
            <Info size={15} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8', marginBottom: 2 }}>Multi-level Approval</p>
              <p style={{ fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.5 }}>Your leave will require approval from your Team Lead and then HR Manager. You will be notified via in-app notification at each stage.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!fromDate || !toDate || !reason || submitting} onClick={handleSubmit}>
              <Check size={14} />
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   REJECT REASON MODAL
───────────────────────────────────────────────────────────── */
function RejectModal({ name, onClose, onReject }: { name: string; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 'var(--z-modal)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 420 }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Reject Leave Request</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon"><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', marginBottom: 14 }}>
            Provide a reason for rejecting <strong>{name}</strong>'s leave request.
          </p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter rejection reason…" rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', resize: 'vertical', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button className="btn btn-sm" disabled={!reason} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: reason ? 'pointer' : 'not-allowed', opacity: reason ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { onReject(reason); onClose() }}>
              <X size={14} /> Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HOLIDAY CALENDAR TAB
───────────────────────────────────────────────────────────── */
const HOLIDAY_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  company:    'Fixed Holiday',
  national:   'National Holiday',
  optional:   'Optional Holiday',
  state:      'State Holiday',
  restricted: 'Restricted Holiday',
}
const HOLIDAY_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  company:    { bg: '#dbeafe', color: '#1d4ed8' },
  national:   { bg: '#dcfce7', color: '#15803d' },
  optional:   { bg: '#fce7f3', color: '#be185d' },
  state:      { bg: '#fef9c3', color: '#a16207' },
  restricted: { bg: '#f3e8ff', color: '#7e22ce' },
}

type HolidayEntry = { id: string; name: string; date: string; type: string; description?: string | null }
type HolidayClaim = { id: string; from_date: string; reason: string }

const MAX_CLAIMS = 2

function HolidayCalendarTab() {
  const [year, setYear]         = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState<HolidayEntry[]>([])
  const [claims, setClaims]     = useState<HolidayClaim[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [acting, setActing]     = useState<string | null>(null)
  const [actionErr, setActionErr] = useState('')

  const loadAll = (yr: number) => {
    setLoading(true)
    setError('')
    Promise.all([
      fetch(`/api/holidays?year=${yr}`).then(r => r.json()),
      fetch(`/api/holidays/claim?year=${yr}`).then(r => r.json()),
    ]).then(([hJson, cJson]) => {
      if (hJson.error) throw new Error(hJson.error)
      setHolidays(hJson.data ?? [])
      setClaims(cJson.data ?? [])
    }).catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll(year) }, [year])

  const claimedHolidayIds = new Set(
    claims.map(c => {
      const m = c.reason?.match(/\[holiday:([^\]]+)\]/)
      return m ? m[1] : null
    }).filter(Boolean) as string[]
  )

  const getClaimForHoliday = (holidayId: string) =>
    claims.find(c => c.reason?.includes(`[holiday:${holidayId}]`))

  const today = new Date().toISOString().split('T')[0]

  const handleClaim = async (h: HolidayEntry) => {
    setActing(h.id)
    setActionErr('')
    try {
      const res = await fetch('/api/holidays/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holiday_id: h.id, holiday_date: h.date, holiday_name: h.name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to claim')
      loadAll(year)
    } catch (e: any) {
      setActionErr(e.message)
    } finally {
      setActing(null)
    }
  }

  const handleUnclaim = async (h: HolidayEntry) => {
    const claim = getClaimForHoliday(h.id)
    if (!claim) return
    setActing(h.id)
    setActionErr('')
    try {
      const res = await fetch('/api/holidays/claim', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claim.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to cancel')
      loadAll(year)
    } catch (e: any) {
      setActionErr(e.message)
    } finally {
      setActing(null)
    }
  }

  const fixed    = holidays.filter(h => ['company', 'national'].includes(h.type))
  const optional = holidays.filter(h => !['company', 'national'].includes(h.type))
  const claimsUsed = claims.length
  const claimsLeft = MAX_CLAIMS - claimsUsed

  const byMonth = holidays.reduce<Record<number, HolidayEntry[]>>((acc, h) => {
    const m = new Date(h.date + 'T00:00:00').getMonth()
    ;(acc[m] ??= []).push(h)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>IHS Holiday Calendar {year}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 4 }}>
            {fixed.length} fixed holidays · {optional.length} optional holidays
          </p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '6px 10px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}
        >
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Holidays', count: holidays.length, bg: '#f0f4ff', color: '#1E3A5F' },
          { label: 'Fixed',          count: fixed.length,    bg: '#dbeafe', color: '#1d4ed8' },
          { label: 'Optional',       count: optional.length, bg: '#fce7f3', color: '#be185d' },
        ].map(b => (
          <div key={b.label} style={{ padding: '12px 20px', borderRadius: 10, background: b.bg }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: b.color }}>{b.count}</div>
            <div style={{ fontSize: '0.75rem', color: b.color, marginTop: 2 }}>{b.label}</div>
          </div>
        ))}
        {/* Optional claims tracker */}
        <div style={{ padding: '12px 20px', borderRadius: 10, background: claimsLeft === 0 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${claimsLeft === 0 ? '#bbf7d0' : '#fde68a'}`, marginLeft: 'auto' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: claimsLeft === 0 ? '#15803d' : '#92400e' }}>{claimsLeft} / {MAX_CLAIMS}</div>
          <div style={{ fontSize: '0.75rem', color: claimsLeft === 0 ? '#15803d' : '#92400e', marginTop: 2 }}>Optional claims left</div>
        </div>
      </div>

      {/* Optional holiday claim info banner */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', fontSize: '0.8125rem', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: '1rem' }}>💡</span>
        <span>You can claim up to <strong>2 optional holidays</strong> per year as paid leave. Choose wisely — claims auto-approved. You can cancel anytime before the holiday date.</span>
      </div>

      {actionErr && <p style={{ color: '#ef4444', fontSize: '0.8125rem', margin: 0 }}>{actionErr}</p>}

      {loading && <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>Loading holidays…</p>}
      {error   && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}

      {/* Month-grouped table */}
      {!loading && !error && Object.keys(byMonth).sort((a, b) => Number(a) - Number(b)).map(mStr => {
        const m = Number(mStr)
        return (
          <div key={m}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {HOLIDAY_MONTH_NAMES[m]}
            </div>
            <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {byMonth[m].map((h, i) => {
                    const d = new Date(h.date + 'T00:00:00')
                    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
                    const badge = HOLIDAY_TYPE_COLORS[h.type] ?? { bg: '#f3f4f6', color: '#374151' }
                    const isOptional = !['company', 'national'].includes(h.type)
                    const isClaimed  = claimedHolidayIds.has(h.id)
                    const isPast     = h.date < today
                    const isActing   = acting === h.id
                    return (
                      <tr key={h.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-gray-100)', background: isClaimed ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : 'var(--color-gray-50)') }}>
                        <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap', width: 130 }}>
                          {d.getDate()} {HOLIDAY_MONTH_NAMES[m].slice(0,3)} · {dayName}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-900)' }}>
                          {h.name}
                          {h.description && <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginLeft: 8 }}>{h.description}</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.71rem', fontWeight: 600, background: badge.bg, color: badge.color }}>
                            {HOLIDAY_TYPE_LABELS[h.type] ?? h.type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', width: 120 }}>
                          {isOptional && !isPast && (
                            isClaimed ? (
                              <button
                                onClick={() => handleUnclaim(h)}
                                disabled={isActing}
                                style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                {isActing ? '…' : '✓ Claimed'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleClaim(h)}
                                disabled={isActing || claimsLeft === 0}
                                title={claimsLeft === 0 ? 'You have used both optional holiday claims' : 'Claim this optional holiday'}
                                style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, background: claimsLeft === 0 ? 'var(--color-gray-100)' : '#1E3A5F', color: claimsLeft === 0 ? 'var(--color-gray-400)' : '#fff', border: 'none', borderRadius: 6, cursor: claimsLeft === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                              >
                                {isActing ? '…' : 'Claim'}
                              </button>
                            )
                          )}
                          {isOptional && isPast && isClaimed && (
                            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>✓ Used</span>
                          )}
                          {isOptional && isPast && !isClaimed && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-300)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {!loading && !error && holidays.length === 0 && (
        <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', textAlign: 'center', padding: 40 }}>No holidays found for {year}.</p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<'my' | 'calendar' | 'approvals' | 'policies' | 'holidays'>('my')
  const [applyOpen, setApplyOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null)
  const [viewLeave, setViewLeave] = useState<LeaveRequest | null>(null)

  /* ── My Leave Requests ── */
  const [myLeaves, setMyLeaves] = useState<ApiLeave[]>([])
  const [loadingLeaves, setLoadingLeaves] = useState(true)

  /* ── Pending Approvals ── */
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [loadingApprovals, setLoadingApprovals] = useState(true)

  /* ── Leave Balance ── */
  const [balanceCards, setBalanceCards] = useState<BalanceCard[]>(buildBalanceCards([]))
  const [loadingBalance, setLoadingBalance] = useState(true)

  /* ── Team Calendar ── */
  const [teamLeaves, setTeamLeaves] = useState<ApiLeave[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [calLoaded, setCalLoaded] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })

  const todayObj = useMemo(() => new Date(), [])

  /* Fetch my leaves + balance on mount */
  const fetchMyLeaves = useCallback(async () => {
    setLoadingLeaves(true)
    try {
      const res = await leavesApi.list({ limit: 100 })
      setMyLeaves(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLeaves(false)
    }
  }, [])

  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true)
    try {
      const res = await fetch('/api/leaves/balance')
      const json = await res.json()
      if (res.ok) setBalanceCards(buildBalanceCards(json.data ?? []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingBalance(false)
    }
  }, [])

  const fetchApprovals = useCallback(async () => {
    setLoadingApprovals(true)
    try {
      const res = await fetch('/api/leaves?status=pending&limit=100')
      const json = await res.json()
      const raw: ApiLeave[] = json.data ?? []
      const now = Date.now()
      setApprovals(raw.map(l => {
        const emp = l.employee as Record<string, unknown> | undefined
        const dept = emp?.department as Record<string, unknown> | undefined
        const appliedAt = l.created_at ? new Date(l.created_at).getTime() : now
        const pendingSince = Math.floor((now - appliedAt) / 86400000)
        return {
          id: l.id,
          empId: String(emp?.emp_id ?? '—'),
          name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
          department: String(dept?.name ?? '—'),
          leaveType: safeLeaveType(l.leave_type),
          fromDate: fmtDate(l.from_date),
          toDate: fmtDate(l.to_date),
          days: l.total_days ?? (l.from_date && l.to_date ? daysBetween(l.from_date, l.to_date) : 0),
          reason: l.reason ?? '',
          appliedOn: fmtDate(l.created_at?.split('T')[0]),
          pendingSince,
          status: 'Pending' as const,
        }
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingApprovals(false)
    }
  }, [])

  useEffect(() => {
    fetchMyLeaves()
    fetchBalance()
    fetchApprovals()
  }, [fetchMyLeaves, fetchBalance, fetchApprovals])

  /* Fetch team calendar leaves when tab active or month changes */
  useEffect(() => {
    if (activeTab !== 'calendar') return
    const key = `${calMonth.year}-${calMonth.month}`
    if (calLoaded === key) return

    setLoadingCalendar(true)
    const y = calMonth.year
    const m = String(calMonth.month + 1).padStart(2, '0')
    const lastDay = new Date(y, calMonth.month + 1, 0).getDate()
    const from = `${y}-${m}-01`
    const to   = `${y}-${m}-${String(lastDay).padStart(2, '0')}`

    fetch(`/api/leaves?date_from=${from}&date_to=${to}&limit=200`)
      .then(r => r.json())
      .then(json => { setTeamLeaves(json.data ?? []); setCalLoaded(key) })
      .catch(console.error)
      .finally(() => setLoadingCalendar(false))
  }, [activeTab, calMonth, calLoaded])

  /* Derived data */
  const myLeaveRequests: LeaveRequest[] = myLeaves.map(l => ({
    id: l.id,
    leaveType: safeLeaveType(l.leave_type),
    fromDate: fmtDate(l.from_date),
    toDate: fmtDate(l.to_date),
    days: l.total_days ?? (l.from_date && l.to_date ? daysBetween(l.from_date, l.to_date) : 0),
    reason: l.reason ?? '',
    status: safeStatus(l.status),
    appliedOn: fmtDate(l.created_at?.split('T')[0]),
  }))

  const teamCalendar = useMemo(
    () => buildTeamCalendar(teamLeaves, calMonth.month, calMonth.year),
    [teamLeaves, calMonth]
  )

  const pendingCount = approvals.filter(a => a.status === 'Pending').length

  /* Actions */
  async function cancelLeave(id: string) {
    if (!confirm('Cancel this leave request?')) return
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed') }
      toast.success('Leave request cancelled')
      setMyLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'cancelled' } : l))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel')
    }
  }

  async function approveLeave(id: string) {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed') }
      toast.success('Leave approved')
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved' as const } : a))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve')
    }
  }

  async function rejectLeave(id: string, remarks: string) {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', remarks }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed') }
      toast.success('Leave rejected')
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'Rejected' as const } : a))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject')
    }
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const calMonthName  = MONTH_NAMES[calMonth.month]
  const daysInMonth   = new Date(calMonth.year, calMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(calMonth.year, calMonth.month, 1).getDay()

  const TABS = [
    { key: 'my',        label: 'My Leave Requests' },
    { key: 'calendar',  label: 'Team Leave Calendar' },
    { key: 'approvals', label: 'Pending Approvals', badge: pendingCount },
    { key: 'policies',  label: 'Leave Policies' },
    { key: 'holidays',  label: 'Holiday Calendar' },
  ] as const

  return (
    <>
      {applyOpen && (
        <ApplyLeaveModal
          onClose={() => setApplyOpen(false)}
          balanceCards={balanceCards}
          onSuccess={() => { fetchMyLeaves(); fetchBalance() }}
        />
      )}
      {rejectTarget && (
        <RejectModal
          name={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onReject={(reason) => { rejectLeave(rejectTarget.id, reason); setRejectTarget(null) }}
        />
      )}

      <Topbar
        title="Leave Management"
        subtitle="Track, apply and approve leaves"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setApplyOpen(true)}>
            <Plus size={14} />
            Apply Leave
          </button>
        }
      />

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── Leave Balance Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 12, marginBottom: 28 }}>
          {balanceCards.map((lb) => (
            <div key={lb.type} className="card card-interactive" style={{ padding: '16px 18px', borderColor: lb.border, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: lb.color, borderRadius: '10px 10px 0 0', opacity: 0.6 }} />
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: lb.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{lb.type}</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1 }}>
                {loadingBalance ? '—' : lb.available}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', marginTop: 2 }}>of {lb.total} days</p>
              <div style={{ marginTop: 8, height: 4, background: 'var(--color-gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: lb.total > 0 ? `${Math.min((lb.available / lb.total) * 100, 100)}%` : '0%', background: lb.color, borderRadius: 4 }} />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', marginTop: 4 }}>{lb.used} used</p>
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
                padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600,
                background: 'none', border: 'none',
                borderBottom: activeTab === t.key ? '2px solid var(--color-imperial-blue)' : '2px solid transparent',
                marginBottom: '-2px',
                color: activeTab === t.key ? 'var(--color-imperial-blue)' : 'var(--color-gray-500)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {'badge' in t && t.badge > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-full)', lineHeight: 1.5 }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            TAB 1 — My Leave Requests
        ════════════════════════════════════════ */}
        {activeTab === 'my' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>My Leave Requests</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>All leave applications for the current year</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setApplyOpen(true)}>
                <Plus size={13} />Apply Leave
              </button>
            </div>

            {loadingLeaves ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Loading your leave requests…</p>
              </div>
            ) : myLeaveRequests.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No leave requests yet</p>
                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Click "Apply Leave" to submit your first request.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                      {['Leave Type','From Date','To Date','Days','Reason','Status','Applied On','Actions'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaveRequests.map((lr) => (
                      <tr key={lr.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <Badge label={LEAVE_TYPE_CONFIG[lr.leaveType]?.label ?? lr.leaveType} config={LEAVE_TYPE_CONFIG[lr.leaveType] ?? LEAVE_TYPE_CONFIG['CL']} />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{lr.fromDate}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{lr.toDate}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-imperial-blue)' }}>{lr.days}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginLeft: 2 }}>day{lr.days !== 1 ? 's' : ''}</span>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.reason}>{lr.reason}</p>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge label={lr.status} config={STATUS_CONFIG[lr.status] ?? STATUS_CONFIG['Pending']} />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>{lr.appliedOn}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm btn-icon" title="View details" onClick={() => setViewLeave(lr)}>
                              <Eye size={14} />
                            </button>
                            {lr.status === 'Pending' && (
                              <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => cancelLeave(lr.id)}>
                                <X size={12} /> Cancel
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
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 2 — Team Leave Calendar
        ════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Team Leave Calendar</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Approved and pending leaves — {calMonthName} {calMonth.year}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCalMonth((m) => m.month === 0 ? { month: 11, year: m.year - 1 } : { ...m, month: m.month - 1 })}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-gray-800)', minWidth: 130, textAlign: 'center' }}>
                  {calMonthName} {calMonth.year}
                </span>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCalMonth((m) => m.month === 11 ? { month: 0, year: m.year + 1 } : { ...m, month: m.month + 1 })}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {loadingCalendar ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Loading calendar…</p>
              </div>
            ) : (
              <>
                <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                      <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ minHeight: 80, background: 'var(--color-gray-50)', borderRight: '1px solid var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-100)' }} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const isWeekend = ((firstDayOfWeek + i) % 7 === 0 || (firstDayOfWeek + i) % 7 === 6)
                      const leavesOnDay = teamCalendar.filter((m) => m.days.includes(day))
                      const isToday = calMonth.month === todayObj.getMonth() && calMonth.year === todayObj.getFullYear() && day === todayObj.getDate()
                      return (
                        <div key={day} style={{ minHeight: 80, padding: 6, borderRight: '1px solid var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-100)', background: isWeekend ? 'var(--color-gray-50)' : '#fff', position: 'relative' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: '0.78rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : isWeekend ? 'var(--color-gray-400)' : 'var(--color-gray-700)', background: isToday ? 'var(--color-imperial-blue)' : 'transparent', marginBottom: 4 }}>
                            {day}
                          </span>
                          {leavesOnDay.map((lv, idx) => (
                            <div key={idx} style={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff', background: lv.color, borderRadius: 3, padding: '1px 5px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${lv.name} — ${lv.leaveType}`}>
                              {lv.name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {teamCalendar.length === 0 ? (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-gray-400)', marginTop: 20 }}>No leaves recorded for {calMonthName} {calMonth.year}.</p>
                ) : (
                  <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {teamCalendar.map((m) => (
                      <div key={m.name + m.leaveType} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: m.color }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', fontWeight: 500 }}>{m.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>({m.leaveType})</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — Pending Approvals
        ════════════════════════════════════════ */}
        {activeTab === 'approvals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} style={{ color: '#b45309', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500 }}>
                <strong>Auto-escalation policy:</strong> Leave requests pending for more than 3 days are automatically escalated to the Operations Head for action.
              </p>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Pending Approvals</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Manager view — review and act on team leave requests</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.8rem', padding: '4px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                    {pendingCount} Pending
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={fetchApprovals} disabled={loadingApprovals} style={{ fontSize: '0.75rem' }}>
                    {loadingApprovals ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {loadingApprovals ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading pending approvals…</p>
                </div>
              ) : approvals.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Check size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>All caught up!</p>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>No pending leave requests to review.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                        {['Employee','Leave Type','From','To','Days','Reason','Applied On','Pending','Actions'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map((ap) => (
                        <tr key={ap.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar name={ap.name} size={32} />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>{ap.name}</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>{ap.department}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <Badge label={LEAVE_TYPE_CONFIG[ap.leaveType]?.label ?? ap.leaveType} config={LEAVE_TYPE_CONFIG[ap.leaveType] ?? LEAVE_TYPE_CONFIG['CL']} />
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{ap.fromDate}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{ap.toDate}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-imperial-blue)', textAlign: 'center' }}>{ap.days}</td>
                          <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ap.reason}>{ap.reason}</p>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>{ap.appliedOn}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {ap.status === 'Pending' ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ap.pendingSince >= 3 ? '#dc2626' : '#b45309', background: ap.pendingSince >= 3 ? '#fef2f2' : '#fffbeb', border: `1px solid ${ap.pendingSince >= 3 ? '#fecaca' : '#fde68a'}`, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                                {ap.pendingSince === 0 ? 'Today' : `${ap.pendingSince}d`}{ap.pendingSince >= 3 && ' ⚠'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: ap.status === 'Approved' ? '#15803d' : '#dc2626', fontWeight: 600 }}>{ap.status}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {ap.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                <button onClick={() => approveLeave(ap.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                  <Check size={12} /> Approve
                                </button>
                                <button onClick={() => setRejectTarget(ap)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                  <X size={12} /> Reject
                                </button>
                                {ap.pendingSince >= 3 && (
                                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                    <AlertTriangle size={11} /> Escalate
                                  </button>
                                )}
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
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 4 — Leave Policies
        ════════════════════════════════════════ */}
        {activeTab === 'policies' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <FileText size={18} style={{ color: 'var(--color-imperial-blue)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Leave Policies — FY 2025–26</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
              {LEAVE_POLICIES.map((policy) => (
                <div key={policy.type} className="card" style={{ padding: '22px', borderColor: policy.border, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: policy.color }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, paddingTop: 4 }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', background: policy.bg, border: `1px solid ${policy.border}`, color: policy.color, marginBottom: 8 }}>
                        {policy.icon}
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{policy.label}</h4>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: policy.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{policy.type}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      {policy.encashable && <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>Encashable</span>}
                      {policy.fromDay1 ? <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>From Day 1</span> : <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>Post Confirmation</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Annual Quota',  value: typeof policy.annualQuota === 'number' ? `${policy.annualQuota} days` : policy.annualQuota },
                      { label: 'Carry Forward', value: typeof policy.carryForward === 'number' ? (policy.carryForward > 0 ? `Up to ${policy.carryForward} days` : 'Not allowed') : policy.carryForward },
                      { label: 'Accrual',       value: policy.accrual },
                      { label: 'Min Notice',    value: policy.minNotice },
                    ].map((row) => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: '0.775rem', color: 'var(--color-gray-500)', fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-800)', fontWeight: 600, textAlign: 'right' }}>{row.value as string}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <Info size={12} style={{ color: 'var(--color-gray-400)', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', lineHeight: 1.5 }}>{policy.notes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* ════════════════════════════════════════
            TAB 5 — Holiday Calendar
        ════════════════════════════════════════ */}
        {activeTab === 'holidays' && (
          <HolidayCalendarTab />
        )}

      {/* ── View Leave Detail Modal ── */}
      {viewLeave && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 460, maxWidth: '95vw', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Leave Request Details</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 3 }}>{LEAVE_TYPE_CONFIG[viewLeave.leaveType]?.label ?? viewLeave.leaveType}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge label={viewLeave.status} config={STATUS_CONFIG[viewLeave.status] ?? STATUS_CONFIG['Pending']} />
                <button onClick={() => setViewLeave(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {([
                ['Leave Type', LEAVE_TYPE_CONFIG[viewLeave.leaveType]?.label ?? viewLeave.leaveType],
                ['From Date',  viewLeave.fromDate],
                ['To Date',    viewLeave.toDate],
                ['Duration',   `${viewLeave.days} day${viewLeave.days !== 1 ? 's' : ''}`],
                ['Applied On', viewLeave.appliedOn],
                ['Status',     viewLeave.status],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-gray-50)' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-900)', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-gray-50)', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 500, marginBottom: 5 }}>REASON</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-gray-700)', lineHeight: 1.55 }}>{viewLeave.reason}</p>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {viewLeave.status === 'Pending' && (
                <button onClick={() => { cancelLeave(viewLeave.id); setViewLeave(null) }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <X size={13} /> Cancel Request
                </button>
              )}
              <button onClick={() => setViewLeave(null)} style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
