'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { payrollApi, type PayrollRun as ApiPayrollRun } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Download, FileText, Eye, Mail, CheckCircle2,
  Clock, AlertTriangle, X, Printer,
  Play, Edit, Check, Users, Search, Calendar, Filter,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type PayrollStatus = 'Paid' | 'Processing' | 'Draft'
type Tab = 'runs' | 'payslips' | 'structures' | 'statutory'

interface PayrollRun {
  id: string; period: string; employees: number; gross: string
  deductions: string; net: string; status: PayrollStatus; runDate: string
}
interface Payslip {
  id: string; empId: string; name: string; department: string; designation: string
  workingDays: number; presentDays: number; lopDays: number
  gross: string; deductions: string; net: string
  location: string; bankAccount: string; ifsc: string; pan: string; pf: string
}
interface SalaryStructure {
  id: string; empId: string; name: string; department: string; annualCTC: string
  basic: string; hra: string; specialAllowance: string; conveyance: string; medical: string
  epfApplicable: boolean; esicApplicable: boolean; effectiveFrom: string; location: string
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const PAYROLL_RUNS: PayrollRun[] = [
  { id: '1', period: 'March 2026',    employees: 87, gross: '₹48,25,000', deductions: '₹6,15,200', net: '₹42,09,800', status: 'Draft',      runDate: '—' },
  { id: '2', period: 'February 2026', employees: 87, gross: '₹47,80,000', deductions: '₹6,08,500', net: '₹41,71,500', status: 'Paid',       runDate: '05 Mar 2026' },
  { id: '3', period: 'January 2026',  employees: 85, gross: '₹47,20,000', deductions: '₹5,98,000', net: '₹41,22,000', status: 'Paid',       runDate: '05 Feb 2026' },
  { id: '4', period: 'December 2025', employees: 84, gross: '₹46,90,000', deductions: '₹5,92,000', net: '₹40,98,000', status: 'Paid',       runDate: '05 Jan 2026' },
  { id: '5', period: 'November 2025', employees: 83, gross: '₹46,10,000', deductions: '₹5,85,000', net: '₹40,25,000', status: 'Paid',       runDate: '05 Dec 2025' },
  { id: '6', period: 'October 2025',  employees: 82, gross: '₹45,60,000', deductions: '₹5,78,000', net: '₹39,82,000', status: 'Paid',       runDate: '05 Nov 2025' },
]

const PAYSLIPS: Payslip[] = [
  { id: '1', empId: 'EMP/2024/001', name: 'Rajesh Kumar',   department: 'Engineering',      designation: 'Senior Software Engineer', workingDays: 26, presentDays: 26, lopDays: 0, gross: '₹48,850', deductions: '₹4,700', net: '₹44,150', location: 'Bengaluru', bankAccount: 'XXXX3210', ifsc: 'HDFC0001234', pan: 'ABCPK1234D', pf: 'KA/BLR/12345/001' },
  { id: '2', empId: 'EMP/2024/002', name: 'Priya Sharma',   department: 'Human Resources',  designation: 'HR Manager',               workingDays: 26, presentDays: 25, lopDays: 1, gross: '₹62,500', deductions: '₹6,200', net: '₹56,300', location: 'Mumbai',    bankAccount: 'XXXX3211', ifsc: 'ICIC0002345', pan: 'BCDPS5678E', pf: 'MH/MUM/23456/002' },
  { id: '3', empId: 'EMP/2024/003', name: 'Amit Patel',     department: 'Finance',          designation: 'Finance Manager',          workingDays: 26, presentDays: 26, lopDays: 0, gross: '₹58,000', deductions: '₹5,800', net: '₹52,200', location: 'Ahmedabad', bankAccount: 'XXXX3212', ifsc: 'SBIN0003456', pan: 'CDEAP9012F', pf: 'GJ/AMD/34567/003' },
  { id: '4', empId: 'EMP/2024/004', name: 'Sneha Gupta',    department: 'Sales',            designation: 'Sales Executive',          workingDays: 26, presentDays: 22, lopDays: 4, gross: '₹35,200', deductions: '₹3,500', net: '₹31,700', location: 'Delhi',     bankAccount: 'XXXX3213', ifsc: 'AXIS0004567', pan: 'DEFSG3456G', pf: 'DL/DEL/45678/004' },
  { id: '5', empId: 'EMP/2024/005', name: 'Rahul Mehta',    department: 'Operations',       designation: 'Operations Lead',          workingDays: 26, presentDays: 26, lopDays: 0, gross: '₹52,000', deductions: '₹5,200', net: '₹46,800', location: 'Pune',      bankAccount: 'XXXX3214', ifsc: 'KOTAK0005678', pan: 'EFGRM7890H', pf: 'MH/PUN/56789/005' },
  { id: '6', empId: 'EMP/2024/006', name: 'Deepika Nair',   department: 'Marketing',        designation: 'Marketing Manager',        workingDays: 26, presentDays: 24, lopDays: 2, gross: '₹55,600', deductions: '₹5,560', net: '₹50,040', location: 'Chennai',   bankAccount: 'XXXX3215', ifsc: 'HDFC0006789', pan: 'FGHDN1234I', pf: 'TN/CHE/67890/006' },
  { id: '7', empId: 'EMP/2024/007', name: 'Vikram Singh',   department: 'Engineering',      designation: 'DevOps Engineer',          workingDays: 26, presentDays: 26, lopDays: 0, gross: '₹68,000', deductions: '₹6,800', net: '₹61,200', location: 'Hyderabad', bankAccount: 'XXXX3216', ifsc: 'ICIC0007890', pan: 'GHIVS5678J', pf: 'TS/HYD/78901/007' },
  { id: '8', empId: 'EMP/2024/008', name: 'Kavitha Reddy',  department: 'Customer Support', designation: 'Support Lead',             workingDays: 26, presentDays: 25, lopDays: 1, gross: '₹42,500', deductions: '₹4,250', net: '₹38,250', location: 'Bengaluru', bankAccount: 'XXXX3217', ifsc: 'SBIN0008901', pan: 'HIJKR9012K', pf: 'KA/BLR/89012/008' },
]

const SALARY_STRUCTURES: SalaryStructure[] = [
  { id: '1', empId: 'EMP/2024/001', name: 'Rajesh Kumar',  department: 'Engineering',      annualCTC: '₹5,86,200', basic: '₹25,000', hra: '₹12,500', specialAllowance: '₹8,500',  conveyance: '₹1,600', medical: '₹1,250', epfApplicable: true,  esicApplicable: false, effectiveFrom: '01 Jan 2024', location: 'Bengaluru' },
  { id: '2', empId: 'EMP/2024/002', name: 'Priya Sharma',  department: 'Human Resources',  annualCTC: '₹7,50,000', basic: '₹31,250', hra: '₹15,625', specialAllowance: '₹12,125', conveyance: '₹1,600', medical: '₹1,900', epfApplicable: true,  esicApplicable: false, effectiveFrom: '01 Jan 2024', location: 'Mumbai' },
  { id: '3', empId: 'EMP/2024/003', name: 'Amit Patel',    department: 'Finance',          annualCTC: '₹6,96,000', basic: '₹29,000', hra: '₹11,600', specialAllowance: '₹14,150', conveyance: '₹1,600', medical: '₹1,650', epfApplicable: true,  esicApplicable: false, effectiveFrom: '01 Jan 2024', location: 'Ahmedabad' },
  { id: '4', empId: 'EMP/2024/004', name: 'Sneha Gupta',   department: 'Sales',            annualCTC: '₹4,22,400', basic: '₹17,600', hra: '₹8,800',  specialAllowance: '₹6,800',  conveyance: '₹1,600', medical: '₹1,000', epfApplicable: true,  esicApplicable: true,  effectiveFrom: '01 Feb 2024', location: 'Delhi' },
  { id: '5', empId: 'EMP/2024/005', name: 'Rahul Mehta',   department: 'Operations',       annualCTC: '₹6,24,000', basic: '₹26,000', hra: '₹10,400', specialAllowance: '₹11,600', conveyance: '₹1,600', medical: '₹2,400', epfApplicable: true,  esicApplicable: false, effectiveFrom: '01 Jan 2024', location: 'Pune' },
  { id: '6', empId: 'EMP/2024/006', name: 'Deepika Nair',  department: 'Marketing',        annualCTC: '₹6,67,200', basic: '₹27,800', hra: '₹11,120', specialAllowance: '₹13,280', conveyance: '₹1,600', medical: '₹1,800', epfApplicable: true,  esicApplicable: false, effectiveFrom: '01 Jan 2024', location: 'Chennai' },
  { id: '7', empId: 'EMP/2024/007', name: 'Vikram Singh',  department: 'Engineering',      annualCTC: '₹8,16,000', basic: '₹34,000', hra: '₹13,600', specialAllowance: '₹16,200', conveyance: '₹1,600', medical: '₹2,600', epfApplicable: true,  esicApplicable: false, effectiveFrom: '01 Mar 2024', location: 'Hyderabad' },
  { id: '8', empId: 'EMP/2024/008', name: 'Kavitha Reddy', department: 'Customer Support', annualCTC: '₹5,10,000', basic: '₹21,250', hra: '₹8,500',  specialAllowance: '₹8,750',  conveyance: '₹1,600', medical: '₹2,400', epfApplicable: true,  esicApplicable: true,  effectiveFrom: '01 Mar 2024', location: 'Bengaluru' },
]

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS  — same bg/color/border triads as Employee page
───────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<PayrollStatus, { bg: string; color: string; border: string }> = {
  Paid:       { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Processing: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Draft:      { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

/* ─────────────────────────────────────────────────────────────
   ATOM COMPONENTS  — matching Employee page patterns exactly
───────────────────────────────────────────────────────────── */

/** Avatar — same palette + transparency trick as Employee page */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${PALETTE[idx]}1A`,
      border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx],
      flexShrink: 0, letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

/** Status badge — badge-dot class, same as Employee page */
function StatusBadge({ status }: { status: PayrollStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span className="badge badge-dot" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {status}
    </span>
  )
}

/** Generic badge */
function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span className="badge" style={{ background: bg, color, border: `1px solid ${border}` }}>{label}</span>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAYROLL STEPPER  — white background version for card context
───────────────────────────────────────────────────────────── */
function PayrollStepper() {
  const steps = [
    { label: 'Attendance\nFinalized', done: true  },
    { label: 'Leave\nAdjusted',       done: true  },
    { label: 'Reimbursements\nAdded', done: true  },
    { label: 'Salary\nComputed',      done: false },
    { label: 'HR\nApproval',          done: false },
    { label: 'Payslips\nGenerated',   done: false },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done ? '#15803d' : 'var(--color-gray-100)',
              border: s.done ? 'none' : '1.5px solid var(--color-gray-300)',
              color: s.done ? '#fff' : 'var(--color-gray-400)',
              fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
            }}>
              {s.done ? <Check size={13} /> : i + 1}
            </div>
            <span style={{
              fontSize: '0.65rem', marginTop: 4, textAlign: 'center',
              color: s.done ? '#15803d' : 'var(--color-gray-400)',
              maxWidth: 64, lineHeight: 1.2, whiteSpace: 'pre-line',
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 24, height: 2, marginBottom: 16, margin: '0 4px 16px',
              background: s.done ? '#15803d' : 'var(--color-gray-200)',
              borderRadius: 99, flexShrink: 0,
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAYROLL RUN MODAL
───────────────────────────────────────────────────────────── */
function PayrollRunModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [confirmed, setConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  async function handleRunPayroll() {
    setRunning(true)
    try {
      await payrollApi.create({ month, year })
      setConfirmed(true)
      toast.success(`Payroll run initiated for ${now.toLocaleString('en-IN', { month: 'long' })} ${year}`)
      onSuccess?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to initiate payroll run')
    } finally { setRunning(false) }
  }
  const steps = [
    { label: 'Attendance data locked (March 1–31)', done: true,  note: 'All 87 employees attendance captured' },
    { label: 'Leave adjustments applied',           done: true,  note: '2 LOP deductions applied' },
    { label: 'Reimbursements added',                done: true,  note: '12 approved claims totalling ₹28,400' },
    { label: 'Salary computation in progress',      done: false, note: 'Computing for 87 employees…' },
    { label: 'Pending HR approval',                 done: false, note: 'Awaiting final approval from HR Head' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>Run Payroll — March 2026</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
              87 employees · Estimated Net: <span style={{ fontWeight: 700, color: '#15803d' }}>₹42,09,800</span>
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon"><X size={15} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10,
              background: s.done ? '#f0fdf4' : '#fafafa',
              border: `1px solid ${s.done ? '#bbf7d0' : 'var(--color-gray-200)'}`,
            }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {s.done
                  ? <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={11} color="#fff" /></div>
                  : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={10} style={{ color: '#f59e0b' }} /></div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: s.done ? '#15803d' : '#92400e', margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: '0.75rem', color: s.done ? '#166534' : '#b45309', marginTop: 2 }}>{s.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: 16 }}>
            <p style={{ fontSize: '0.75rem', color: '#c2410c' }}>
              <strong>Note:</strong> Once confirmed, salary computation will begin. This action cannot be undone for the current month.
            </p>
          </div>
          {confirmed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 8, background: '#f0fdf4' }}>
              <CheckCircle2 size={18} style={{ color: '#15803d' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d' }}>Payroll computation initiated!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleRunPayroll} disabled={running} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                {running ? 'Running…' : 'Confirm & Run Payroll'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAYSLIP MODAL
───────────────────────────────────────────────────────────── */
function PayslipModal({ emp, onClose }: { emp: Payslip; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white" style={{ borderBottom: '1px solid var(--color-gray-100)', zIndex: 10 }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>Payslip — March 2026</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-primary btn-sm"><Download size={13} /> PDF</button>
            <button className="btn btn-outline btn-sm"><Mail size={13} /> Email</button>
            <button className="btn btn-outline btn-sm"><Printer size={13} /> Print</button>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon"><X size={15} /></button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Company header */}
          <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #E8622A' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E8622A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>IH</div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Imperial Healthcare</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>123 Business Park, Whitefield, Bengaluru – 560066</p>
            <span className="badge" style={{ marginTop: 8, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', display: 'inline-flex' }}>
              Payslip · March 2026
            </span>
          </div>

          {/* Employee info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, padding: '16px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
            {[
              [['Employee Name', emp.name], ['Employee ID', emp.empId], ['Designation', emp.designation]],
              [['Department', emp.department], ['Bank Account', emp.bankAccount], ['PAN', emp.pan]],
            ].map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {col.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', width: 110, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Attendance summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Working Days', value: emp.workingDays, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
              { label: 'Days Present',  value: emp.presentDays, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
              { label: 'LOP Days',      value: emp.lopDays,     color: emp.lopDays > 0 ? '#dc2626' : '#6b7280', bg: emp.lopDays > 0 ? '#fef2f2' : '#f9fafb', border: emp.lopDays > 0 ? '#fecaca' : '#e5e7eb' },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', padding: '12px', borderRadius: 8, background: item.bg, border: `1px solid ${item.border}` }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 4 }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Earnings */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #15803d' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803d', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Earnings</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[['Basic Salary', '₹25,000'], ['HRA', '₹12,500'], ['Conveyance', '₹1,600'], ['Medical Allowance', '₹1,250'], ['Special Allowance', '₹8,500']].map(([label, amount]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--color-gray-600)' }}>{label}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-800)' }}>{amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-gray-200)' }}>
                    <td style={{ paddingTop: 8, fontWeight: 700, color: 'var(--color-gray-900)' }}>Gross Earnings</td>
                    <td style={{ paddingTop: 8, textAlign: 'right', fontWeight: 800, color: '#15803d' }}>₹48,850</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #dc2626' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deductions</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[['PF (Employee 12%)', '₹3,000'], ['ESIC', '₹0 (N/A)'], ['Professional Tax', '₹200'], ['TDS (Income Tax)', '₹1,500'], ['LOP Deduction', '₹0']].map(([label, amount]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--color-gray-600)' }}>{label}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-800)' }}>{amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-gray-200)' }}>
                    <td style={{ paddingTop: 8, fontWeight: 700, color: 'var(--color-gray-900)' }}>Total Deductions</td>
                    <td style={{ paddingTop: 8, textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>₹4,700</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Net salary */}
          <div style={{ textAlign: 'center', padding: '20px', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', marginBottom: 16 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Net Salary (Take Home)</p>
            <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>₹44,150</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', margin: 0 }}>Forty Four Thousand One Hundred and Fifty Rupees Only</p>
          </div>

          {/* Employer contributions */}
          <div style={{ padding: '12px 16px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 6px' }}>Employer Contributions (not deducted from salary)</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[['EPF (Employer 12%)', '₹3,000'], ['ESIC (Employer)', '₹0 (N/A)'], ['Gratuity Provision', '₹1,202']].map(([k, v]) => (
                <span key={k} style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>{k}: <strong>{v}</strong></span>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 16 }}>
            Computer-generated payslip. For queries: payroll@imperial.in
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB: PAYROLL RUNS
───────────────────────────────────────────────────────────── */
function TabPayrollRuns({ onRunPayroll }: { onRunPayroll: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', margin: 0 }}>Last 6 payroll cycles</p>
        <button onClick={onRunPayroll} className="btn btn-primary btn-sm">
          <Play size={13} /> Run Payroll
        </button>
      </div>
      <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Period</th>
              <th style={{ minWidth: 120 }}>Employees</th>
              <th style={{ minWidth: 150 }}>Gross Amount</th>
              <th style={{ minWidth: 140 }}>Deductions</th>
              <th style={{ minWidth: 150 }}>Net Amount</th>
              <th style={{ minWidth: 120 }}>Status</th>
              <th style={{ minWidth: 130 }}>Run Date</th>
              <th style={{ minWidth: 120, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {PAYROLL_RUNS.map((run) => (
              <tr key={run.id}>
                <td>
                  <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{run.period}</p>
                  {run.status === 'Draft' && <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2, fontWeight: 500 }}>In preparation</p>}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} style={{ color: 'var(--color-gray-400)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{run.employees}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-gray-800)', fontSize: '0.875rem' }}>{run.gross}</td>
                <td style={{ fontWeight: 500, color: '#dc2626', fontSize: '0.875rem' }}>{run.deductions}</td>
                <td style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>{run.net}</td>
                <td><StatusBadge status={run.status} /></td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{run.runDate}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="View"><Eye size={15} /></button>
                    {run.status === 'Paid' && (
                      <button className="btn btn-ghost btn-sm btn-icon" title="Download"><Download size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB: PAYSLIPS
───────────────────────────────────────────────────────────── */
function TabPayslips() {
  const [search, setSearch] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<Payslip | null>(null)

  const filtered = PAYSLIPS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.empId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {selectedEmp && <PayslipModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}

      {/* Filter bar — same pattern as Employee page */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 8,
            border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
            padding: '8px 12px', background: 'var(--color-gray-50)',
          }}>
            <Search size={15} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search employee or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--color-gray-800)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--color-gray-50)' }}>
            <Calendar size={14} style={{ color: 'var(--color-gray-400)' }} />
            <select className="form-select" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: 'var(--color-gray-800)', padding: 0 }}>
              <option>March 2026</option>
              <option>February 2026</option>
              <option>January 2026</option>
            </select>
          </div>

          <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>
            <Download size={13} /> Export All
          </button>

          <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {filtered.length} employees
          </span>
        </div>
      </div>

      <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Employee</th>
              <th style={{ minWidth: 170 }}>Department</th>
              <th style={{ minWidth: 100 }}>Days Present</th>
              <th style={{ minWidth: 90 }}>LOP</th>
              <th style={{ minWidth: 130 }}>Gross</th>
              <th style={{ minWidth: 130 }}>Deductions</th>
              <th style={{ minWidth: 130 }}>Net Salary</th>
              <th style={{ minWidth: 110, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar name={emp.name} size={36} />
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{emp.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-imperial-blue)', fontFamily: 'monospace', marginTop: 2, fontWeight: 500 }}>{emp.empId}</p>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{emp.department}</td>
                <td>
                  <span style={{ fontWeight: 600, color: '#15803d' }}>{emp.presentDays}</span>
                  <span style={{ color: 'var(--color-gray-400)' }}>/{emp.workingDays}</span>
                </td>
                <td>
                  {emp.lopDays > 0
                    ? <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{emp.lopDays} days</span>
                    : <span style={{ color: 'var(--color-gray-300)', fontSize: '0.875rem' }}>—</span>}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-gray-800)', fontSize: '0.875rem' }}>{emp.gross}</td>
                <td style={{ fontWeight: 500, color: '#dc2626', fontSize: '0.875rem' }}>{emp.deductions}</td>
                <td style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>{emp.net}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <button onClick={() => setSelectedEmp(emp)} className="btn btn-ghost btn-sm btn-icon" title="View payslip"><Eye size={15} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Email payslip"><Mail size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB: SALARY STRUCTURES
───────────────────────────────────────────────────────────── */
function TabSalaryStructures() {
  const METROS = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata']
  return (
    <div>
      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', margin: '16px 20px' }}>
        <span style={{ color: '#1d4ed8', fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d4ed8', margin: 0 }}>India Salary Structure — HRA Calculation Rule</p>
          <p style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: 3, opacity: 0.85 }}>
            HRA is <strong>50% of Basic</strong> for metro cities and <strong>40% of Basic</strong> for non-metro cities. ESIC applies for gross salary ≤ ₹21,000/month.
          </p>
        </div>
      </div>

      <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Employee</th>
              <th style={{ minWidth: 140 }}>Annual CTC</th>
              <th style={{ minWidth: 110 }}>Basic</th>
              <th style={{ minWidth: 120 }}>HRA</th>
              <th style={{ minWidth: 140 }}>Special Allow.</th>
              <th style={{ minWidth: 90 }}>EPF</th>
              <th style={{ minWidth: 90 }}>ESIC</th>
              <th style={{ minWidth: 130 }}>Effective From</th>
              <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {SALARY_STRUCTURES.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar name={s.name} size={36} />
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{s.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{s.department}</p>
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{s.annualCTC}</td>
                <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{s.basic}</td>
                <td>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{s.hra}</p>
                  <p style={{ fontSize: '0.7rem', color: METROS.includes(s.location) ? '#1d4ed8' : '#6d28d9', marginTop: 2, fontWeight: 500 }}>
                    {METROS.includes(s.location) ? '50% metro' : '40% non-metro'}
                  </p>
                </td>
                <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{s.specialAllowance}</td>
                <td>
                  <Badge
                    label={s.epfApplicable ? 'Yes' : 'No'}
                    bg={s.epfApplicable ? '#f0fdf4' : '#f9fafb'}
                    color={s.epfApplicable ? '#15803d' : '#6b7280'}
                    border={s.epfApplicable ? '#bbf7d0' : '#e5e7eb'}
                  />
                </td>
                <td>
                  <Badge
                    label={s.esicApplicable ? 'Yes' : 'No'}
                    bg={s.esicApplicable ? '#fffbeb' : '#f9fafb'}
                    color={s.esicApplicable ? '#b45309' : '#6b7280'}
                    border={s.esicApplicable ? '#fde68a' : '#e5e7eb'}
                  />
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{s.effectiveFrom}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Edit structure"><Edit size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB: STATUTORY REPORTS
───────────────────────────────────────────────────────────── */
function TabStatutoryReports() {
  const reports = [
    { name: 'EPF Monthly Contribution', form: 'Form 12A / ECR',   frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', description: 'Employee Provident Fund monthly challan for 87 employees' },
    { name: 'ESIC Contribution',        form: 'Form 5',           frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', description: 'Employee State Insurance Corporation monthly return' },
    { name: 'Professional Tax',         form: 'PT Challan',       frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', description: 'State-wise Professional Tax challan for all employees' },
    { name: 'TDS on Salary',            form: 'Form 24Q',         frequency: 'Quarterly', lastGenerated: '15 Jan 2026', type: 'download', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', description: 'Quarterly TDS return for Q3 FY 2025-26 (Oct–Dec 2025)' },
    { name: 'Annual TDS Certificate',   form: 'Form 16',          frequency: 'Annual',    lastGenerated: '15 Jun 2025', type: 'generate', color: '#b45309', bg: '#fffbeb', border: '#fde68a', description: 'Income Tax Form 16 for FY 2024-25 — 84 employees' },
    { name: 'PF Electronic Challan',    form: 'PF ECR',           frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', description: 'Electronic Challan cum Return for PF remittance' },
  ]

  return (
    <div>
      {/* Filing alert */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', margin: '16px 20px' }}>
        <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e', margin: 0 }}>EPF &amp; ESIC Filing Due Soon</p>
          <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>
            EPF challan for March 2026 must be filed by <strong>15 April 2026</strong> (13 days remaining). ESIC contribution also due.
          </p>
        </div>
        <button className="btn btn-sm" style={{ background: '#d97706', color: '#fff', flexShrink: 0 }}>File Now</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, padding: '0 20px 20px' }}>
        {reports.map((r) => (
          <div key={r.name} className="card card-interactive" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: r.bg, border: `1px solid ${r.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={16} style={{ color: r.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0, lineHeight: 1.3 }}>{r.name}</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: r.color, marginTop: 2 }}>{r.form}</p>
              </div>
              <span className="badge" style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}`, flexShrink: 0 }}>{r.frequency}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', lineHeight: 1.5, marginBottom: 12 }}>{r.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--color-gray-100)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>Last: {r.lastGenerated}</span>
              {r.type === 'generate'
                ? <button className="btn btn-outline btn-sm"><FileText size={12} /> Generate</button>
                : <button className="btn btn-outline btn-sm"><Download size={12} /> Download</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<Tab>('runs')
  const [showRunModal, setShowRunModal] = useState(false)
  const [apiRuns, setApiRuns] = useState<ApiPayrollRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  const fetchRuns = () => {
    setLoadingRuns(true)
    payrollApi.list({ limit: 24 })
      .then(r => setApiRuns(r.data))
      .catch(console.error)
      .finally(() => setLoadingRuns(false))
  }

  useEffect(() => { fetchRuns() }, [])

  /* Latest run for KPI cards */
  const latestRun = apiRuns[0]
  const fmt = (n?: number) => n != null ? `₹${(n / 100000).toFixed(1)}L` : '—'

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'runs',       label: 'Payroll Runs',      count: apiRuns.length || PAYROLL_RUNS.length },
    { key: 'payslips',   label: 'Payslips',           count: PAYSLIPS.length },
    { key: 'structures', label: 'Salary Structures',  count: SALARY_STRUCTURES.length },
    { key: 'statutory',  label: 'Statutory Reports',  count: 6 },
  ]

  void loadingRuns

  return (
    <>
      {showRunModal && <PayrollRunModal onClose={() => setShowRunModal(false)} onSuccess={fetchRuns} />}

      <Topbar
        title="Payroll Management"
        subtitle="India-compliant payroll processing & compliance"
        notificationCount={2}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <FileText size={14} /> Form 16
            </button>
            <button onClick={() => setShowRunModal(true)} className="btn btn-primary btn-sm">
              <Play size={14} /> Run Payroll
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── KPI Cards — same exact structure as Employee page ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Gross Pay',  value: fmt(latestRun?.total_gross),        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Total Deductions', value: fmt(latestRun?.total_deductions),   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
            { label: 'Net Payable',      value: fmt(latestRun?.total_net),          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Employer EPF',     value: fmt(latestRun?.total_employer_pf),  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
            { label: 'Employees',        value: String(latestRun?.total_employees ?? '—'), color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
          ].map((s) => (
            <div key={s.label} className="card card-interactive" style={{ padding: '16px 18px', borderColor: s.border, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                {s.value}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Current Payroll Status Card ── */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            {/* Left: period info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>
                  March 2026 Payroll
                </h3>
                <span className="badge" style={{ background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  Draft
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', margin: 0 }}>
                87 employees · Target pay date:
                <strong style={{ color: 'var(--color-gray-700)', marginLeft: 4 }}>31 March 2026</strong>
              </p>
            </div>

            {/* Centre: stepper */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
              <PayrollStepper />
            </div>

            {/* Right: action */}
            <button onClick={() => setShowRunModal(true)} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              <Play size={14} /> Process Now
            </button>
          </div>
        </div>

        {/* ── Main Content Card with Tabs ── */}
        <div className="card" style={{ overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-gray-200)', padding: '0 20px' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '14px 16px',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === t.key ? 600 : 500,
                  color: activeTab === t.key ? '#1E3A5F' : 'var(--color-gray-500)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === t.key ? '#1E3A5F' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                {t.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99,
                  fontSize: '0.7rem', fontWeight: 700,
                  background: activeTab === t.key ? '#dbeafe' : 'var(--color-gray-100)',
                  color:      activeTab === t.key ? '#1d4ed8' : 'var(--color-gray-500)',
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'runs'       && <TabPayrollRuns onRunPayroll={() => setShowRunModal(true)} />}
          {activeTab === 'payslips'   && <TabPayslips />}
          {activeTab === 'structures' && <TabSalaryStructures />}
          {activeTab === 'statutory'  && <TabStatutoryReports />}
        </div>

      </div>
    </>
  )
}
