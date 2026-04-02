'use client'


import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
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

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const MY_LEAVES: LeaveRequest[] = [
  { id: 'l1',  leaveType: 'CL',         fromDate: '5 Jan 2026',  toDate: '5 Jan 2026',  days: 1,  reason: 'Personal work at BBMP office', status: 'Approved',   appliedOn: '2 Jan 2026'  },
  { id: 'l2',  leaveType: 'SL',         fromDate: '14 Jan 2026', toDate: '15 Jan 2026', days: 2,  reason: 'Fever and throat infection',    status: 'Approved',   appliedOn: '14 Jan 2026' },
  { id: 'l3',  leaveType: 'EL',         fromDate: '20 Feb 2026', toDate: '22 Feb 2026', days: 3,  reason: 'Family vacation to Goa',        status: 'Approved',   appliedOn: '10 Feb 2026' },
  { id: 'l4',  leaveType: 'CL',         fromDate: '7 Mar 2026',  toDate: '7 Mar 2026',  days: 1,  reason: 'Bank work and vehicle renewal', status: 'Rejected',   appliedOn: '5 Mar 2026'  },
  { id: 'l5',  leaveType: 'SL',         fromDate: '18 Mar 2026', toDate: '18 Mar 2026', days: 1,  reason: 'Migraine — unwell',             status: 'Approved',   appliedOn: '18 Mar 2026' },
  { id: 'l6',  leaveType: 'CompOff',    fromDate: '25 Mar 2026', toDate: '25 Mar 2026', days: 1,  reason: 'Comp off for weekend deployment', status: 'Approved', appliedOn: '22 Mar 2026' },
  { id: 'l7',  leaveType: 'EL',         fromDate: '10 Apr 2026', toDate: '14 Apr 2026', days: 5,  reason: 'Travel to hometown for festival', status: 'Pending',  appliedOn: '28 Mar 2026' },
  { id: 'l8',  leaveType: 'CL',         fromDate: '18 Apr 2026', toDate: '18 Apr 2026', days: 1,  reason: 'Medical appointment',           status: 'Pending',    appliedOn: '30 Mar 2026' },
  { id: 'l9',  leaveType: 'Bereavement',fromDate: '2 Feb 2026',  toDate: '4 Feb 2026',  days: 3,  reason: 'Bereavement — grandfather',     status: 'Approved',   appliedOn: '2 Feb 2026'  },
  { id: 'l10', leaveType: 'EL',         fromDate: '1 May 2026',  toDate: '5 May 2026',  days: 5,  reason: 'Summer holiday — family trip',  status: 'Pending',    appliedOn: '31 Mar 2026' },
]

const PENDING_APPROVALS: PendingApproval[] = [
  { id: 'pa1', empId: 'EMP/2024/007', name: 'Vikram Singh',    department: 'Engineering',      leaveType: 'EL',      fromDate: '10 Apr 2026', toDate: '14 Apr 2026', days: 5, reason: 'Travel to hometown for Ugadi festival',  appliedOn: '28 Mar 2026', pendingSince: 3, status: 'Pending' },
  { id: 'pa2', empId: 'EMP/2024/003', name: 'Amit Patel',      department: 'Finance',          leaveType: 'CL',      fromDate: '18 Apr 2026', toDate: '18 Apr 2026', days: 1, reason: 'Medical appointment at Manipal Hospital', appliedOn: '30 Mar 2026', pendingSince: 1, status: 'Pending' },
  { id: 'pa3', empId: 'EMP/2024/012', name: 'Ananya Krishnan', department: 'Human Resources',  leaveType: 'SL',      fromDate: '2 Apr 2026',  toDate: '3 Apr 2026',  days: 2, reason: 'Viral fever — doctor advised rest',       appliedOn: '1 Apr 2026',  pendingSince: 0, status: 'Pending' },
  { id: 'pa4', empId: 'EMP/2024/014', name: 'Ritu Verma',      department: 'Marketing',        leaveType: 'CompOff', fromDate: '5 Apr 2026',  toDate: '5 Apr 2026',  days: 1, reason: 'Comp off for Sunday event coverage',      appliedOn: '29 Mar 2026', pendingSince: 2, status: 'Pending' },
  { id: 'pa5', empId: 'EMP/2024/010', name: 'Pooja Agarwal',   department: 'Finance',          leaveType: 'EL',      fromDate: '15 Apr 2026', toDate: '19 Apr 2026', days: 5, reason: 'Long pending earned leave — family event', appliedOn: '26 Mar 2026', pendingSince: 5, status: 'Pending' },
]

const TEAM_CALENDAR: TeamCalLeave[] = [
  { name: 'Rajesh Kumar',    color: '#1E3A5F', leaveType: 'EL',   days: [10, 11, 12, 13, 14] },
  { name: 'Vikram Singh',    color: '#FF6B00', leaveType: 'CL',   days: [7] },
  { name: 'Ananya Krishnan', color: '#1A7A4A', leaveType: 'SL',   days: [2, 3] },
  { name: 'Ritu Verma',      color: '#7C3AED', leaveType: 'CompOff', days: [5] },
  { name: 'Pooja Agarwal',   color: '#0369A1', leaveType: 'EL',   days: [15, 16, 17, 18, 19] },
]

const LEAVE_BALANCE = [
  { type: 'CL' as LeaveType, label: 'Casual Leave',           available: 8,  total: 12, used: 4,  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { type: 'SL' as LeaveType, label: 'Sick Leave',             available: 10, total: 12, used: 2,  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { type: 'EL' as LeaveType, label: 'Earned Leave',           available: 15, total: 18, used: 3,  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { type: 'LOP' as LeaveType,label: 'Loss of Pay',            available: 0,  total: 0,  used: 0,  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { type: 'ML' as LeaveType, label: 'Maternity/Paternity',    available: 90, total: 90, used: 0,  color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  { type: 'CompOff' as LeaveType, label: 'Comp Off',          available: 2,  total: 4,  used: 2,  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
]

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
  {
    type: 'CL', label: 'Casual Leave', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa',
    icon: <Calendar size={18} />,
    annualQuota: 12, carryForward: 0, accrual: '1 day/month', minNotice: '1 day',
    encashable: false, fromDay1: true, notes: 'Cannot be clubbed with other leaves. Max 3 days at a stretch.',
  },
  {
    type: 'SL', label: 'Sick Leave', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
    icon: <Shield size={18} />,
    annualQuota: 12, carryForward: 5, accrual: '1 day/month', minNotice: 'Immediate',
    encashable: false, fromDay1: true, notes: 'Medical certificate required for more than 2 consecutive days.',
  },
  {
    type: 'EL', label: 'Earned Leave', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
    icon: <Star size={18} />,
    annualQuota: 18, carryForward: 30, accrual: '1.5 days/month', minNotice: '7 days',
    encashable: true, fromDay1: false, notes: 'Accrued after 6 months of service. Encashable up to 15 days at year end.',
  },
  {
    type: 'LOP', label: 'Loss of Pay', color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    icon: <Ban size={18} />,
    annualQuota: '—', carryForward: 0, accrual: 'As applicable', minNotice: '—',
    encashable: false, fromDay1: true, notes: 'Applied when all leave balances are exhausted. Salary deducted proportionally.',
  },
  {
    type: 'ML', label: 'Maternity / Paternity', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe',
    icon: <Briefcase size={18} />,
    annualQuota: '90 / 15 days', carryForward: 0, accrual: 'One-time', minNotice: '30 days',
    encashable: false, fromDay1: false, notes: 'Maternity: 90 days as per Maternity Benefit Act. Paternity: 15 days. Applicable after 1 year of service.',
  },
  {
    type: 'CompOff', label: 'Comp Off', color: '#b45309', bg: '#fffbeb', border: '#fde68a',
    icon: <Clock size={18} />,
    annualQuota: 'As earned', carryForward: 0, accrual: 'Per weekend/holiday worked', minNotice: '1 day',
    encashable: false, fromDay1: true, notes: 'Must be availed within 60 days of the compensated work day. No carry forward.',
  },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F','#FF6B00','#1A7A4A','#7C3AED','#0369A1','#BE185D','#0F766E','#B45309']

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
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

function Badge({ label, config }: { label: string; config: { bg: string; color: string; border: string } }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem', fontWeight: 600,
      background: config.bg, color: config.color, border: `1px solid ${config.border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   APPLY LEAVE MODAL
───────────────────────────────────────────────────────────── */
function ApplyLeaveModal({ onClose }: { onClose: () => void }) {
  const [leaveType, setLeaveType] = useState<LeaveType>('CL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [halfDay, setHalfDay] = useState(false)
  const [reason, setReason] = useState('')

  const balance = LEAVE_BALANCE.find((b) => b.type === leaveType)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 'var(--z-modal)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Apply for Leave</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Submit a leave request for manager approval</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon"><X size={18} /></button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Leave Type */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leave Type *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--color-gray-800)' }}
            >
              {(['CL','SL','EL','LOP','ML','PL','CompOff','Bereavement'] as LeaveType[]).map((t) => (
                <option key={t} value={t}>{LEAVE_TYPE_CONFIG[t].label} ({t})</option>
              ))}
            </select>
            {balance && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: balance.bg, border: `1px solid ${balance.border}`, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={14} style={{ color: balance.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: balance.color, fontWeight: 600 }}>
                  Available Balance: {balance.available} days ({balance.used} used of {balance.total})
                </span>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From Date *</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To Date *</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
              />
            </div>
          </div>

          {/* Half Day */}
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="halfday"
              checked={halfDay}
              onChange={(e) => setHalfDay(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-imperial-blue)' }}
            />
            <label htmlFor="halfday" style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', fontWeight: 500, cursor: 'pointer' }}>
              Apply for Half Day (0.5 days)
            </label>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe the reason for leave…"
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none' }}
            />
          </div>

          {/* Approval Note */}
          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', marginBottom: 20, display: 'flex', gap: 10 }}>
            <Info size={15} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8', marginBottom: 2 }}>Multi-level Approval</p>
              <p style={{ fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.5 }}>
                Your leave will require approval from your Team Lead and then HR Manager. You will be notified via email and in-app notification at each stage.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!fromDate || !toDate || !reason}
              onClick={onClose}
            >
              <Check size={14} />
              Submit Request
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
            Provide a reason for rejecting <strong>{name}</strong>'s leave request. This will be shared with the employee.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason…"
            rows={3}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', resize: 'vertical', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button
              className="btn btn-sm"
              disabled={!reason}
              style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: reason ? 'pointer' : 'not-allowed', opacity: reason ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => { onReject(reason); onClose() }}
            >
              <X size={14} /> Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<'my' | 'calendar' | 'approvals' | 'policies'>('my')
  const [applyOpen, setApplyOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null)
  const [approvals, setApprovals] = useState(PENDING_APPROVALS)
  const [calMonth, setCalMonth] = useState({ month: 3, year: 2026 }) // April 2026

  const pendingCount = approvals.filter((a) => a.status === 'Pending').length

  function approveLeave(id: string) {
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Approved' as const } : a))
  }
  function rejectLeave(id: string) {
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Rejected' as const } : a))
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const calMonthName = MONTH_NAMES[calMonth.month]
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(calMonth.year, calMonth.month, 1).getDay()

  const TABS = [
    { key: 'my',        label: 'My Leave Requests' },
    { key: 'calendar',  label: 'Team Leave Calendar' },
    { key: 'approvals', label: 'Pending Approvals', badge: pendingCount },
    { key: 'policies',  label: 'Leave Policies' },
  ] as const

  return (
    <>
      {applyOpen && <ApplyLeaveModal onClose={() => setApplyOpen(false)} />}
      {rejectTarget && (
        <RejectModal
          name={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onReject={() => { rejectLeave(rejectTarget.id); setRejectTarget(null) }}
        />
      )}

      <Topbar
        title="Leave Management"
        subtitle="Track, apply and approve leaves"
        notificationCount={pendingCount}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setApplyOpen(true)}>
            <Plus size={14} />
            Apply Leave
          </button>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── Leave Balance Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
          {LEAVE_BALANCE.map((lb) => (
            <div
              key={lb.type}
              className="card card-interactive"
              style={{ padding: '16px 18px', borderColor: lb.border, position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: lb.color, borderRadius: '10px 10px 0 0', opacity: 0.6 }} />
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: lb.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{lb.type}</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1 }}>{lb.available}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', marginTop: 2 }}>of {lb.total} days</p>
              <div style={{ marginTop: 8, height: 4, background: 'var(--color-gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: lb.total > 0 ? `${(lb.available / lb.total) * 100}%` : '0%', background: lb.color, borderRadius: 4 }} />
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
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
                <Plus size={13} />
                Apply Leave
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                    {['Leave Type', 'From Date', 'To Date', 'Days', 'Reason', 'Status', 'Applied On', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MY_LEAVES.map((lr) => (
                    <tr key={lr.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={LEAVE_TYPE_CONFIG[lr.leaveType].label} config={LEAVE_TYPE_CONFIG[lr.leaveType]} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{lr.fromDate}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{lr.toDate}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-imperial-blue)' }}>{lr.days}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginLeft: 2 }}>day{lr.days > 1 ? 's' : ''}</span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.reason}>{lr.reason}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={lr.status} config={STATUS_CONFIG[lr.status]} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>{lr.appliedOn}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" title="View details">
                            <Eye size={14} />
                          </button>
                          {lr.status === 'Pending' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#dc2626', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Cancel request"
                            >
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
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 2 — Team Leave Calendar
        ════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <div className="card" style={{ padding: '24px' }}>
            {/* Month Nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Team Leave Calendar</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Team members on leave — current month view</p>
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

            {/* Calendar Grid */}
            <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {/* Day Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                ))}
              </div>

              {/* Day Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: 80, background: 'var(--color-gray-50)', borderRight: '1px solid var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-100)' }} />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const isWeekend = ((firstDayOfWeek + i) % 7 === 0 || (firstDayOfWeek + i) % 7 === 6)
                  const leavesOnDay = TEAM_CALENDAR.filter((m) => m.days.includes(day))
                  const isToday = calMonth.month === 3 && calMonth.year === 2026 && day === 1
                  return (
                    <div
                      key={day}
                      style={{
                        minHeight: 80,
                        padding: 6,
                        borderRight: '1px solid var(--color-gray-100)',
                        borderBottom: '1px solid var(--color-gray-100)',
                        background: isWeekend ? 'var(--color-gray-50)' : '#fff',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%',
                        fontSize: '0.78rem', fontWeight: isToday ? 700 : 500,
                        color: isToday ? '#fff' : isWeekend ? 'var(--color-gray-400)' : 'var(--color-gray-700)',
                        background: isToday ? 'var(--color-imperial-blue)' : 'transparent',
                        marginBottom: 4,
                      }}>
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

            {/* Legend */}
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {TEAM_CALENDAR.map((m) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: m.color }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', fontWeight: 500 }}>{m.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>({m.leaveType})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — Pending Approvals
        ════════════════════════════════════════ */}
        {activeTab === 'approvals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Escalation Notice */}
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
                <span style={{ fontSize: '0.8rem', padding: '4px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                  {pendingCount} Pending
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                      {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Applied On', 'Pending', 'Actions'].map((h) => (
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
                          <Badge label={LEAVE_TYPE_CONFIG[ap.leaveType].label} config={LEAVE_TYPE_CONFIG[ap.leaveType]} />
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
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700,
                              color: ap.pendingSince >= 3 ? '#dc2626' : '#b45309',
                              background: ap.pendingSince >= 3 ? '#fef2f2' : '#fffbeb',
                              border: `1px solid ${ap.pendingSince >= 3 ? '#fecaca' : '#fde68a'}`,
                              padding: '2px 8px', borderRadius: 'var(--radius-full)',
                            }}>
                              {ap.pendingSince === 0 ? 'Today' : `${ap.pendingSince}d`}
                              {ap.pendingSince >= 3 && ' ⚠'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: ap.status === 'Approved' ? '#15803d' : '#dc2626', fontWeight: 600 }}>{ap.status}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {ap.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => approveLeave(ap.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(ap)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <X size={12} /> Reject
                              </button>
                              {ap.pendingSince >= 3 && (
                                <button
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                  title="Escalate to Operations Head"
                                >
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {LEAVE_POLICIES.map((policy) => (
                <div
                  key={policy.type}
                  className="card"
                  style={{ padding: '22px', borderColor: policy.border, overflow: 'hidden', position: 'relative' }}
                >
                  {/* Color strip */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: policy.color }} />

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, paddingTop: 4 }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', background: policy.bg, border: `1px solid ${policy.border}`, color: policy.color, marginBottom: 8 }}>
                        {policy.icon}
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{policy.label}</h4>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: policy.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{policy.type}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      {policy.encashable && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>Encashable</span>
                      )}
                      {policy.fromDay1 ? (
                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>From Day 1</span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>Post Confirmation</span>
                      )}
                    </div>
                  </div>

                  {/* Policy Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Annual Quota',    value: typeof policy.annualQuota === 'number' ? `${policy.annualQuota} days` : policy.annualQuota },
                      { label: 'Carry Forward',   value: typeof policy.carryForward === 'number' ? (policy.carryForward > 0 ? `Up to ${policy.carryForward} days` : 'Not allowed') : policy.carryForward },
                      { label: 'Accrual',         value: policy.accrual },
                      { label: 'Min Notice',      value: policy.minNotice },
                    ].map((row) => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: '0.775rem', color: 'var(--color-gray-500)', fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-800)', fontWeight: 600, textAlign: 'right' }}>{row.value as string}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
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
    </>
  )
}
