'use client'

import { useState, useEffect, type FormEvent, type CSSProperties } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { payrollApi, employeesApi, type PayrollRun as ApiPayrollRun, type Employee } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Download, FileText, Eye, Mail, CheckCircle2,
  Clock, AlertTriangle, X, Printer,
  Play, Edit, Check, Users, Search, Calendar, Filter, Plus,
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
  email: string
  workingDays: number; presentDays: number; lopDays: number
  gross: string; deductions: string; net: string
  location: string; bankAccount: string; ifsc: string; pan: string; pf: string
  // Salary breakdown (real values from salary_structures)
  basicAmt: number; hraAmt: number; conveyanceAmt: number
  medicalAmt: number; specialAmt: number; ltaAmt: number
  empPF: number; empESIC: number; ptAmt: number; tdsAmt: number
  empPFContrib: number; empESICContrib: number
  grossNum: number; deductionsNum: number; netNum: number
  hasSalary: boolean
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

function buildPayslipFromComponents(overrides: Partial<Payslip> & { id: string; empId: string; name: string; email: string; department: string; designation: string; location: string; basicAmt: number; hraAmt: number; conveyanceAmt: number; medicalAmt: number; specialAmt: number; ltaAmt: number; workingDays?: number; presentDays?: number; lopDays?: number }): Payslip {
  const { basicAmt, hraAmt, conveyanceAmt, medicalAmt, specialAmt, ltaAmt } = overrides
  const grossNum = basicAmt + hraAmt + conveyanceAmt + medicalAmt + specialAmt + ltaAmt
  const pfBase   = Math.min(basicAmt, 15000)
  const empPF    = Math.round(pfBase * 0.12)
  const empESIC  = grossNum <= 21000 ? Math.round(grossNum * 0.0075) : 0
  const ptAmt    = basicAmt > 0 ? 200 : 0
  const tdsAmt   = 0
  const deductionsNum = empPF + empESIC + ptAmt + tdsAmt
  const netNum   = grossNum - deductionsNum
  const fmtINR   = (n: number) => `₹${n.toLocaleString('en-IN')}`
  return {
    id: overrides.id, empId: overrides.empId, name: overrides.name,
    email: overrides.email, department: overrides.department,
    designation: overrides.designation, location: overrides.location,
    workingDays: overrides.workingDays ?? 26,
    presentDays: overrides.presentDays ?? 26,
    lopDays:     overrides.lopDays     ?? 0,
    gross:       fmtINR(grossNum), deductions: fmtINR(deductionsNum), net: fmtINR(netNum),
    bankAccount: overrides.bankAccount ?? '—', ifsc: overrides.ifsc ?? '—',
    pan: overrides.pan ?? '—', pf: overrides.pf ?? '—',
    basicAmt, hraAmt, conveyanceAmt, medicalAmt, specialAmt, ltaAmt,
    empPF, empESIC, ptAmt, tdsAmt,
    empPFContrib: Math.round(pfBase * 0.12),
    empESICContrib: grossNum <= 21000 ? Math.round(grossNum * 0.0325) : 0,
    grossNum, deductionsNum, netNum, hasSalary: basicAmt > 0,
  }
}

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
function PayrollStepper({ doneCount = 2 }: { doneCount?: number }) {
  const stepLabels = [
    'Attendance\nFinalized',
    'Leave\nAdjusted',
    'Reimbursements\nAdded',
    'Salary\nComputed',
    'HR\nApproval',
    'Payslips\nGenerated',
  ]
  const steps = stepLabels.map((label, i) => ({ label, done: i < doneCount }))
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
function PayrollRunModal({ onClose, onSuccess, empCount = 0, existingRun }: { onClose: () => void; onSuccess?: () => void; empCount?: number; existingRun?: ApiPayrollRun | null }) {
  const [confirmed, setConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const periodLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const lastDay = new Date(year, month, 0).getDate()

  // Derive how far along the run already is
  const doneCount = existingRun
    ? existingRun.status === 'paid' ? 5
      : existingRun.status === 'approved' ? 4
      : existingRun.status === 'processed' ? 3
      : 2   // draft
    : 2     // no run yet — attendance/leave typically pre-done

  async function handleRunPayroll() {
    setRunning(true)
    try {
      await payrollApi.create({ month, year })
      setConfirmed(true)
      toast.success(`Payroll run initiated for ${periodLabel}`)
      onSuccess?.()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to initiate payroll run'
      // If already exists for this month, treat as success
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('unique')) {
        setConfirmed(true)
        toast.success(`Payroll for ${periodLabel} is already in progress`)
        onSuccess?.()
      } else {
        toast.error(msg)
      }
    } finally { setRunning(false) }
  }

  const steps = [
    { label: `Attendance data locked (${now.toLocaleString('en-IN', { month: 'long' })} 1–${lastDay})`, note: `${empCount > 0 ? `${empCount} employees` : 'All employees'} attendance captured` },
    { label: 'Leave adjustments applied',          note: 'LOP deductions applied' },
    { label: 'Reimbursements added',               note: 'Approved claims processed' },
    { label: 'Salary computation',                 note: `Computing for ${empCount > 0 ? empCount : '—'} employees` },
    { label: 'HR approval',                        note: 'Awaiting final approval from HR Head' },
  ]

  const alreadyRunning = !!existingRun && existingRun.status !== 'paid'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>Run Payroll — {periodLabel}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
              {empCount > 0 ? `${empCount} employees` : 'Fetching headcount…'}
              {existingRun?.total_net ? <> · Estimated Net: <span style={{ fontWeight: 700, color: '#15803d' }}>{fmtINR(existingRun.total_net)}</span></> : null}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon"><X size={15} /></button>
        </div>

        {alreadyRunning && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '0.75rem', color: '#1d4ed8', margin: 0 }}>
              A payroll run for {periodLabel} already exists with status <strong>{existingRun!.status}</strong>. You can re-trigger or approve it below.
            </p>
          </div>
        )}

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s, i) => {
            const done = i < doneCount
            const active = i === doneCount
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10,
                background: done ? '#f0fdf4' : active ? '#fffbeb' : '#fafafa',
                border: `1px solid ${done ? '#bbf7d0' : active ? '#fde68a' : 'var(--color-gray-200)'}`,
              }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>
                  {done
                    ? <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={11} color="#fff" /></div>
                    : active
                      ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={10} style={{ color: '#f59e0b' }} /></div>
                      : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--color-gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--color-gray-400)', fontWeight: 700 }}>{i + 1}</div>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: done ? '#15803d' : active ? '#92400e' : 'var(--color-gray-400)', margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: '0.75rem', color: done ? '#166534' : active ? '#b45309' : 'var(--color-gray-300)', marginTop: 2 }}>{s.note}</p>
                </div>
              </div>
            )
          })}
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
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d' }}>Payroll computation initiated for {periodLabel}!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleRunPayroll} disabled={running} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                {running ? 'Processing…' : alreadyRunning ? 'Re-trigger Computation' : 'Confirm & Run Payroll'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAYSLIP PRINT HELPERS
───────────────────────────────────────────────────────────── */
function buildPayslipHTML(emp: Payslip, period = 'March 2026'): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Payslip - ${emp.name} - ${period}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1f2937;padding:32px}
    .header{text-align:center;padding-bottom:16px;border-bottom:3px solid #E8622A;margin-bottom:20px}
    .company-logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:6px}
    .logo-box{width:40px;height:40px;border-radius:10px;background:#E8622A;color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center}
    .company-name{font-size:18px;font-weight:800;color:#111}
    .company-addr{font-size:11px;color:#6b7280;margin-top:4px}
    .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;margin-top:8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
    .info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px}
    .info-row{display:flex;gap:8px;padding:3px 0}
    .info-label{color:#9ca3af;min-width:120px;font-size:12px}
    .info-val{font-weight:600;font-size:12px}
    .attend-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
    .attend-box{text-align:center;padding:12px;border-radius:8px}
    .attend-num{font-size:24px;font-weight:800;line-height:1}
    .attend-lbl{font-size:11px;color:#6b7280;margin-top:4px}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding-bottom:6px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 0;font-size:12px}
    td:last-child{text-align:right;font-weight:600}
    tfoot td{padding-top:8px;font-weight:700;border-top:2px solid #e5e7eb}
    .net-box{text-align:center;padding:20px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;margin:20px 0}
    .net-amount{font-size:32px;font-weight:800;color:#15803d}
    .net-lbl{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em}
    .employer-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;font-size:12px;color:#1d4ed8}
    .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb}
    @media print{body{padding:16px}button{display:none!important}}
  </style></head><body>
  <div class="header">
    <div class="company-logo">
      <div class="logo-box">IH</div>
      <span class="company-name">Imperial Healthcare</span>
    </div>
    <div class="company-addr">123 Business Park, Whitefield, Bengaluru – 560066</div>
    <div class="badge">Payslip · ${period}</div>
  </div>
  <div class="grid2">
    <div class="info-box">
      <div class="info-row"><span class="info-label">Employee Name</span><span class="info-val">${emp.name}</span></div>
      <div class="info-row"><span class="info-label">Employee ID</span><span class="info-val">${emp.empId}</span></div>
      <div class="info-row"><span class="info-label">Designation</span><span class="info-val">${emp.designation}</span></div>
      <div class="info-row"><span class="info-label">PF Number</span><span class="info-val">${emp.pf}</span></div>
    </div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Department</span><span class="info-val">${emp.department}</span></div>
      <div class="info-row"><span class="info-label">Location</span><span class="info-val">${emp.location}</span></div>
      <div class="info-row"><span class="info-label">Bank Account</span><span class="info-val">${emp.bankAccount}</span></div>
      <div class="info-row"><span class="info-label">PAN</span><span class="info-val">${emp.pan}</span></div>
    </div>
  </div>
  <div class="attend-grid">
    <div class="attend-box" style="background:#eff6ff;border:1px solid #bfdbfe"><div class="attend-num" style="color:#1d4ed8">${emp.workingDays}</div><div class="attend-lbl">Working Days</div></div>
    <div class="attend-box" style="background:#f0fdf4;border:1px solid #bbf7d0"><div class="attend-num" style="color:#15803d">${emp.presentDays}</div><div class="attend-lbl">Days Present</div></div>
    <div class="attend-box" style="background:${emp.lopDays>0?'#fef2f2':'#f9fafb'};border:1px solid ${emp.lopDays>0?'#fecaca':'#e5e7eb'}"><div class="attend-num" style="color:${emp.lopDays>0?'#dc2626':'#6b7280'}">${emp.lopDays}</div><div class="attend-lbl">LOP Days</div></div>
  </div>
  <div class="grid2">
    <div>
      <div class="section-title" style="color:#15803d;border-bottom:2px solid #15803d">Earnings</div>
      <table><tbody>
        ${emp.basicAmt > 0 ? `<tr><td style="color:#6b7280">Basic Salary</td><td>₹${emp.basicAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        ${emp.hraAmt > 0 ? `<tr><td style="color:#6b7280">HRA</td><td>₹${emp.hraAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        ${emp.conveyanceAmt > 0 ? `<tr><td style="color:#6b7280">Conveyance</td><td>₹${emp.conveyanceAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        ${emp.medicalAmt > 0 ? `<tr><td style="color:#6b7280">Medical Allowance</td><td>₹${emp.medicalAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        ${emp.specialAmt > 0 ? `<tr><td style="color:#6b7280">Special Allowance</td><td>₹${emp.specialAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        ${emp.ltaAmt > 0 ? `<tr><td style="color:#6b7280">LTA</td><td>₹${emp.ltaAmt.toLocaleString('en-IN')}</td></tr>` : ''}
      </tbody><tfoot><tr><td>Gross Earnings</td><td style="color:#15803d">${emp.gross}</td></tr></tfoot></table>
    </div>
    <div>
      <div class="section-title" style="color:#dc2626;border-bottom:2px solid #dc2626">Deductions</div>
      <table><tbody>
        <tr><td style="color:#6b7280">PF (Employee 12%)</td><td>${emp.empPF > 0 ? `₹${emp.empPF.toLocaleString('en-IN')}` : '—'}</td></tr>
        <tr><td style="color:#6b7280">ESIC${emp.empESIC === 0 ? ' (N/A)' : ''}</td><td>${emp.empESIC > 0 ? `₹${emp.empESIC.toLocaleString('en-IN')}` : '—'}</td></tr>
        <tr><td style="color:#6b7280">Professional Tax</td><td>${emp.ptAmt > 0 ? `₹${emp.ptAmt.toLocaleString('en-IN')}` : '—'}</td></tr>
        <tr><td style="color:#6b7280">TDS (Income Tax)</td><td>${emp.tdsAmt > 0 ? `₹${emp.tdsAmt.toLocaleString('en-IN')}` : '—'}</td></tr>
      </tbody><tfoot><tr><td>Total Deductions</td><td style="color:#dc2626">${emp.deductions}</td></tr></tfoot></table>
    </div>
  </div>
  <div class="net-box">
    <div class="net-lbl">Net Salary (Take Home)</div>
    <div class="net-amount">${emp.net}</div>
  </div>
  <div class="employer-box"><strong>Employer Contributions (not deducted from salary):</strong>&nbsp;&nbsp;EPF: ${emp.empPFContrib > 0 ? `₹${emp.empPFContrib.toLocaleString('en-IN')}` : '—'} &nbsp;|&nbsp; ESIC: ${emp.empESICContrib > 0 ? `₹${emp.empESICContrib.toLocaleString('en-IN')}` : 'N/A'} &nbsp;|&nbsp; Gratuity: ₹${Math.round(emp.basicAmt * 4.81 / 100).toLocaleString('en-IN')}</div>
  <div class="footer">Computer-generated payslip. For queries: payroll@imperial.in</div>
  </body></html>`
}

function openPayslipWindow(html: string, autoPrint = false) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) { alert('Please allow pop-ups to download/print payslips.'); return }
  w.document.write(html)
  w.document.close()
  if (autoPrint) w.onload = () => { w.focus(); w.print() }
}

/** Renders the full payslip HTML in a hidden iframe → html2canvas → jsPDF → base64 */
async function generatePayslipPDF(emp: Payslip, period: string): Promise<string> {
  const html = buildPayslipHTML(emp, period)

  return new Promise<string>((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:1300px;border:none;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)

    iframe.onload = async () => {
      try {
        const [{ jsPDF }, h2c] = await Promise.all([
          import('jspdf'),
          import('html2canvas'),
        ])
        const html2canvas = h2c.default

        const body = iframe.contentDocument?.body
        if (!body) throw new Error('Could not access iframe body')

        // Brief pause so fonts/images inside the iframe can settle
        await new Promise(r => setTimeout(r, 250))

        const canvas = await html2canvas(body, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        })

        document.body.removeChild(iframe)

        const A4_W = 210   // mm
        const A4_H = 297   // mm
        const imgW = A4_W
        const imgH = (canvas.height * imgW) / canvas.width

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        // Multi-page support if payslip is taller than one A4
        let yOffset = 0
        while (yOffset < imgH) {
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, -yOffset, imgW, imgH)
          yOffset += A4_H
          if (yOffset < imgH) pdf.addPage()
        }

        // Return pure base64 (no "data:..." prefix)
        resolve(pdf.output('datauristring').split(',')[1])
      } catch (err) {
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
        reject(err)
      }
    }

    iframe.srcdoc = html
  })
}

/* ─────────────────────────────────────────────────────────────
   PAYSLIP MODAL
───────────────────────────────────────────────────────────── */
function PayslipModal({ emp, period = 'March 2026', onClose }: { emp: Payslip; period?: string; onClose: () => void }) {
  const [sending, setSending] = useState(false)

  function handlePDF() {
    const html = buildPayslipHTML(emp, period)
    openPayslipWindow(html + `<script>window.onload=()=>{window.print()}<\/script>`, false)
    toast.success('Payslip opened — use "Save as PDF" in the print dialog')
  }

  function handlePrint() {
    const html = buildPayslipHTML(emp, period)
    openPayslipWindow(html, true)
  }

  async function handleEmail() {
    if (!emp.email) { toast.error('No email address on file for this employee'); return }
    setSending(true)
    const tid = toast.loading('Generating PDF…')
    try {
      // 1. Render payslip → PDF → base64
      const pdfBase64 = await generatePayslipPDF(emp, period)

      toast.loading('Sending email…', { id: tid })

      // 2. POST with PDF attachment
      const res = await fetch('/api/payroll/send-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:          emp.email,
          name:        emp.name,
          empId:       emp.empId,
          department:  emp.department,
          period,
          gross:       emp.gross,
          deductions:  emp.deductions,
          net:         emp.net,
          workingDays: emp.workingDays,
          presentDays: emp.presentDays,
          lopDays:     emp.lopDays,
          designation: emp.designation,
          location:    emp.location,
          bankAccount: emp.bankAccount,
          pan:         emp.pan,
          pf:          emp.pf,
          pdfBase64,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(`Payslip (with PDF) sent to ${emp.email}`, { id: tid, duration: 5000 })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email', { id: tid })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white" style={{ borderBottom: '1px solid var(--color-gray-100)', zIndex: 10 }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>Payslip — March 2026</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePDF}><Download size={13} /> PDF</button>
            <button className="btn btn-outline btn-sm" onClick={handleEmail} disabled={sending} style={{ opacity: sending ? 0.7 : 1, minWidth: 80 }}>
              {sending ? <><Clock size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : <><Mail size={13} /> Email</>}
            </button>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16, marginBottom: 20, padding: '16px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
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
          <div className="grid grid-cols-3" style={{ gap: 12, marginBottom: 20 }}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16, marginBottom: 20 }}>
            {/* Earnings */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #15803d' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803d', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Earnings</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {([
                    ['Basic Salary',      emp.basicAmt],
                    ['HRA',               emp.hraAmt],
                    ['Conveyance',        emp.conveyanceAmt],
                    ['Medical Allowance', emp.medicalAmt],
                    ['Special Allowance', emp.specialAmt],
                    ['LTA',               emp.ltaAmt],
                  ] as [string, number][]).filter(([, v]) => v > 0).map(([label, amount]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--color-gray-600)' }}>{label}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-800)' }}>₹{amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-gray-200)' }}>
                    <td style={{ paddingTop: 8, fontWeight: 700, color: 'var(--color-gray-900)' }}>Gross Earnings</td>
                    <td style={{ paddingTop: 8, textAlign: 'right', fontWeight: 800, color: '#15803d' }}>{emp.gross}</td>
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
                  {([
                    ['PF (Employee 12%)',  emp.empPF],
                    [`ESIC${emp.empESIC === 0 ? ' (N/A)' : ''}`, emp.empESIC],
                    ['Professional Tax',  emp.ptAmt],
                    ['TDS (Income Tax)',   emp.tdsAmt],
                  ] as [string, number][]).map(([label, amount]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--color-gray-600)' }}>{label}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                        {amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-gray-200)' }}>
                    <td style={{ paddingTop: 8, fontWeight: 700, color: 'var(--color-gray-900)' }}>Total Deductions</td>
                    <td style={{ paddingTop: 8, textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{emp.deductions}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Net salary */}
          <div style={{ textAlign: 'center', padding: '20px', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', marginBottom: 16 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Net Salary (Take Home)</p>
            <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>{emp.net}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4, fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--color-gray-400)' }}>Gross: <strong style={{ color: '#1e293b' }}>{emp.gross}</strong></span>
              <span style={{ color: 'var(--color-gray-400)' }}>Deductions: <strong style={{ color: '#dc2626' }}>{emp.deductions}</strong></span>
            </div>
          </div>

          {/* Employer contributions */}
          <div style={{ padding: '12px 16px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 6px' }}>Employer Contributions (not deducted from salary)</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {([
                ['EPF (Employer 12%)', emp.empPFContrib > 0 ? `₹${emp.empPFContrib.toLocaleString('en-IN')}` : '—'],
                ['ESIC (Employer)',    emp.empESICContrib > 0 ? `₹${emp.empESICContrib.toLocaleString('en-IN')}` : 'N/A'],
                ['Gratuity Provision', `₹${Math.round(emp.basicAmt * 4.81 / 100).toLocaleString('en-IN')}`],
              ] as [string, string][]).map(([k, v]) => (
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
const MONTH_NAMES_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtINR(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function apiStatusToPayroll(s: string): PayrollStatus {
  if (s === 'paid') return 'Paid'
  if (s === 'approved' || s === 'processed') return 'Processing'
  return 'Draft'
}

/* ─────────────────────────────────────────────────────────────
   PAYROLL RUN DETAIL MODAL
───────────────────────────────────────────────────────────── */
function PayrollRunDetailModal({ run, onClose, onApprove }: { run: ApiPayrollRun; onClose: () => void; onApprove: (id: string) => void }) {
  const [acting, setActing] = useState(false)
  const period = `${MONTH_NAMES_SHORT[run.month]} ${run.year}`
  const status = apiStatusToPayroll(run.status)

  async function handleApprove() {
    setActing(true)
    try {
      const res = await fetch(`/api/payroll/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to approve')
      toast.success('Payroll run approved')
      onApprove(run.id)
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve')
    } finally { setActing(false) }
  }

  async function handleMarkPaid() {
    setActing(true)
    try {
      const res = await fetch(`/api/payroll/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed')
      toast.success('Payroll marked as paid')
      onApprove(run.id)
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally { setActing(false) }
  }

  const ROW = (label: string, value: string | number | null | undefined) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-gray-50)' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>{value ?? '—'}</span>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#fff', width: 480, maxWidth: '95vw', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>Payroll Run — {period}</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>Run ID: {run.id.slice(0, 8)}…</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={status} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
          </div>
        </div>

        {/* Summary KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid var(--color-gray-100)' }}>
          {[
            { label: 'Gross Pay',    value: fmtINR(run.total_gross),      color: '#2563eb' },
            { label: 'Deductions',   value: fmtINR(run.total_deductions),  color: '#dc2626' },
            { label: 'Net Payable',  value: fmtINR(run.total_net),         color: '#15803d' },
          ].map((kpi, i) => (
            <div key={kpi.label} style={{ padding: '16px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--color-gray-100)' : 'none' }}>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</p>
              <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Detail rows */}
        <div style={{ padding: '8px 24px 4px' }}>
          {ROW('Period',          period)}
          {ROW('Employees',       run.total_employees)}
          {ROW('Run Date',        run.run_date)}
          {ROW('Employer EPF',    fmtINR(run.total_employer_pf))}
          {ROW('Employer ESIC',   fmtINR(run.total_employer_esic))}
          {ROW('Remarks',         run.remarks)}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid var(--color-gray-200)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            Close
          </button>
          {(run.status === 'draft' || run.status === 'processed') && (
            <button onClick={handleApprove} disabled={acting} style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, opacity: acting ? 0.7 : 1 }}>
              {acting ? 'Processing…' : 'Approve Payroll'}
            </button>
          )}
          {run.status === 'approved' && (
            <button onClick={handleMarkPaid} disabled={acting} style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, opacity: acting ? 0.7 : 1 }}>
              {acting ? 'Processing…' : 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TabPayrollRuns({ onRunPayroll, runs, loading, onRefresh }: { onRunPayroll: () => void; runs: ApiPayrollRun[]; loading: boolean; onRefresh: () => void }) {
  const [viewRun, setViewRun] = useState<ApiPayrollRun | null>(null)
  const rows = runs
  const isLive = true

  return (
    <div>
      {viewRun && (
        <PayrollRunDetailModal
          run={viewRun}
          onClose={() => setViewRun(null)}
          onApprove={() => { setViewRun(null); onRefresh() }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', margin: 0 }}>
          {loading ? 'Loading…' : `${rows.length} payroll cycle${rows.length !== 1 ? 's' : ''}`}
        </p>
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
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-gray-400)' }}>Loading payroll runs…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-gray-400)' }}>No payroll runs yet. Click Run Payroll to get started.</td></tr>
            )}
            {!loading && isLive && (rows as ApiPayrollRun[]).map((run) => {
              const period = `${MONTH_NAMES_SHORT[run.month]} ${run.year}`
              const status = apiStatusToPayroll(run.status)
              return (
                <tr key={run.id}>
                  <td>
                    <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{period}</p>
                    {status === 'Draft' && <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2, fontWeight: 500 }}>In preparation</p>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={13} style={{ color: 'var(--color-gray-400)' }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{run.total_employees ?? '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-gray-800)', fontSize: '0.875rem' }}>{fmtINR(run.total_gross)}</td>
                  <td style={{ fontWeight: 500, color: '#dc2626', fontSize: '0.875rem' }}>{fmtINR(run.total_deductions)}</td>
                  <td style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>{fmtINR(run.total_net)}</td>
                  <td><StatusBadge status={status} /></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{run.run_date ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <button onClick={() => setViewRun(run)} className="btn btn-ghost btn-sm btn-icon" title="View details"><Eye size={15} /></button>
                      {status === 'Paid' && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Download report"><Download size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
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
  const [search, setSearch]         = useState('')
  const [period, setPeriod]         = useState('March 2026')
  const [payslips, setPayslips]     = useState<Payslip[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedEmp, setSelectedEmp] = useState<Payslip | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      employeesApi.list({ limit: 500 }),
      fetch('/api/payroll/salary-structures').then(r => r.json()),
    ])
      .then(([empRes, salRes]) => {
        const emps: Employee[] = (empRes as { data: Employee[] }).data ?? []
        const salaries: Record<string, unknown>[] = (salRes as { data: Record<string, unknown>[] }).data ?? []
        // Index by employee_id; API already returns latest first
        const salMap = new Map<string, Record<string, unknown>>()
        for (const sal of salaries) {
          if (!salMap.has(sal.employee_id as string)) salMap.set(sal.employee_id as string, sal)
        }
        const built = emps.map((emp) => {
          const sal = salMap.get(emp.id)
          return buildPayslipFromComponents({
            id:           emp.id,
            empId:        emp.emp_id,
            name:         `${emp.first_name} ${emp.last_name}`,
            email:        emp.email ?? '',
            department:   emp.department?.name ?? '—',
            designation:  emp.designation?.title ?? '—',
            location:     emp.work_location ?? '—',
            bankAccount:  '—',
            ifsc:         '—',
            pan:          '—',
            pf:           '—',
            basicAmt:     Number(sal?.basic_monthly)       || 0,
            hraAmt:       Number(sal?.hra_monthly)         || 0,
            conveyanceAmt: Number(sal?.conveyance_allowance) || 0,
            medicalAmt:   Number(sal?.medical_allowance)   || 0,
            specialAmt:   Number(sal?.special_allowance)   || 0,
            ltaAmt:       Number(sal?.lta_monthly)         || 0,
          })
        })
        setPayslips(built)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = payslips.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.empId.toLowerCase().includes(search.toLowerCase())
  )

  function exportCSV() {
    const header = ['Employee ID', 'Name', 'Department', 'Designation', 'Gross', 'Deductions', 'Net', 'Working Days', 'Present Days', 'LOP']
    const rows = filtered.map(p => [p.empId, `"${p.name}"`, `"${p.department}"`, `"${p.designation}"`, p.grossNum, p.deductionsNum, p.netNum, p.workingDays, p.presentDays, p.lopDays])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `payslips-${period.replace(' ', '-')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {selectedEmp && <PayslipModal emp={selectedEmp} period={period} onClose={() => setSelectedEmp(null)} />}

      {/* Filter bar */}
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
            <select className="form-select" value={period} onChange={e => setPeriod(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: 'var(--color-gray-800)', padding: 0 }}>
              <option>March 2026</option>
              <option>February 2026</option>
              <option>January 2026</option>
            </select>
          </div>

          <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={exportCSV}>
            <Download size={13} /> Export All
          </button>

          <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {loading ? '…' : `${filtered.length} employees`}
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
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>Loading payslips…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>No employees found.</td></tr>
            )}
            {!loading && filtered.map((emp) => (
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
                  {emp.hasSalary
                    ? <><span style={{ fontWeight: 600, color: '#15803d' }}>{emp.presentDays}</span><span style={{ color: 'var(--color-gray-400)' }}>/{emp.workingDays}</span></>
                    : <span style={{ color: 'var(--color-gray-300)' }}>—</span>}
                </td>
                <td>
                  {emp.hasSalary && emp.lopDays > 0
                    ? <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{emp.lopDays} days</span>
                    : <span style={{ color: 'var(--color-gray-300)', fontSize: '0.875rem' }}>—</span>}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-gray-800)', fontSize: '0.875rem' }}>
                  {emp.hasSalary ? emp.gross : <span className="badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: '0.7rem' }}>No salary set</span>}
                </td>
                <td style={{ fontWeight: 500, color: '#dc2626', fontSize: '0.875rem' }}>{emp.hasSalary ? emp.deductions : '—'}</td>
                <td style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>{emp.hasSalary ? emp.net : '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {emp.hasSalary && (
                      <button onClick={() => setSelectedEmp(emp)} className="btn btn-ghost btn-sm btn-icon" title="View payslip"><Eye size={15} /></button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm btn-icon" title={`Email payslip to ${emp.email}`}
                      disabled={!emp.email || !emp.hasSalary}
                      style={{ opacity: (!emp.email || !emp.hasSalary) ? 0.3 : 1 }}
                      onClick={async () => {
                        if (!emp.email) { toast.error('No email on file'); return }
                        if (!emp.hasSalary) { toast.error('No salary structure for this employee'); return }
                        const tid = toast.loading(`Generating PDF for ${emp.name}…`)
                        try {
                          const pdfBase64 = await generatePayslipPDF(emp, period)
                          toast.loading(`Sending to ${emp.email}…`, { id: tid })
                          const res = await fetch('/api/payroll/send-payslip', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to: emp.email, name: emp.name, empId: emp.empId, department: emp.department, period, gross: emp.gross, deductions: emp.deductions, net: emp.net, workingDays: emp.workingDays, presentDays: emp.presentDays, lopDays: emp.lopDays, designation: emp.designation, location: emp.location, bankAccount: emp.bankAccount, pan: emp.pan, pf: emp.pf, pdfBase64 }),
                          })
                          const json = await res.json()
                          if (!res.ok) throw new Error(json.error)
                          toast.success(`Payslip (PDF) sent to ${emp.email}`, { id: tid })
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : 'Send failed', { id: tid })
                        }
                      }}
                    ><Mail size={15} /></button>
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
   ADD EMPLOYEE SALARY MODAL  (two-panel: form + live preview)
───────────────────────────────────────────────────────────── */
const BLANK_SALARY = {
  employee_id: '', effective_from: new Date().toISOString().split('T')[0], effective_to: '',
  ctc_annual: '', basic: '', hra: '', conveyance: '1600',
  medical_allowance: '1250', special_allowance: '', lta: '0',
  metro: false,
  pf_employer: '12', esic_employer: '3.25',
  pf_employee: '12', esic_employee: '0.75',
  professional_tax: '200', tds: '0', remarks: '',
}

function AddSalaryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm]         = useState({ ...BLANK_SALARY })
  const [saving, setSaving]     = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empSearch, setEmpSearch] = useState('')
  const [activeSection, setActiveSection] = useState<'earnings'|'deductions'>('earnings')

  useEffect(() => {
    employeesApi.list({ limit: 300 })
      .then(r => setEmployees(r.data ?? []))
      .catch(console.error)
  }, [])

  const set = (field: string, val: string | boolean) =>
    setForm(f => ({ ...f, [field]: val }))

  // When CTC changes, auto-distribute into standard components
  function handleCTCChange(val: string) {
    const annual = parseFloat(val) || 0
    const monthly = Math.round(annual / 12)
    const basic   = Math.round(monthly * 0.40)
    const hra     = Math.round(basic * (form.metro ? 0.5 : 0.4))
    const special = Math.max(0, monthly - basic - hra - 1600 - 1250)
    setForm(f => ({
      ...f,
      ctc_annual: val,
      basic: String(basic),
      hra: String(hra),
      special_allowance: String(special),
    }))
  }

  // When basic changes, recalculate HRA
  function handleBasicChange(val: string) {
    const basic = parseFloat(val) || 0
    const hra   = Math.round(basic * (form.metro ? 0.5 : 0.4))
    setForm(f => ({ ...f, basic: val, hra: String(hra) }))
  }

  // Toggle metro/non-metro → recalculate HRA
  function handleMetroToggle(metro: boolean) {
    const basic = parseFloat(form.basic) || 0
    const hra   = Math.round(basic * (metro ? 0.5 : 0.4))
    setForm(f => ({ ...f, metro, hra: String(hra) }))
  }

  // ── Live calculations ─────────────────────────────────────
  const n = (v: string) => parseFloat(v) || 0
  const basic       = n(form.basic)
  const hra         = n(form.hra)
  const conveyance  = n(form.conveyance)
  const medical     = n(form.medical_allowance)
  const special     = n(form.special_allowance)
  const lta         = n(form.lta)
  const gross       = basic + hra + conveyance + medical + special + lta

  const pfBase      = Math.min(basic, 15000)          // PF ceiling ₹15,000
  const empPF       = Math.round(pfBase * n(form.pf_employee)  / 100)
  const esicApply   = gross <= 21000
  const empESIC     = esicApply ? Math.round(gross * n(form.esic_employee) / 100) : 0
  const pt          = n(form.professional_tax)
  const tds         = n(form.tds)
  const totalDed    = empPF + empESIC + pt + tds
  const netPay      = gross - totalDed

  const empPFAmt    = Math.round(pfBase * n(form.pf_employer)   / 100)
  const empESICAmt  = esicApply ? Math.round(gross * n(form.esic_employer) / 100) : 0

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.employee_id) { toast.error('Please select an employee'); return }
    if (!form.ctc_annual || !form.basic) { toast.error('Annual CTC and Basic are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payroll/salary-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to save')
      toast.success('Salary structure saved successfully!')
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const filteredEmps = employees.filter(e => {
    const t = empSearch.toLowerCase()
    return !t || `${e.first_name} ${e.last_name}`.toLowerCase().includes(t) || e.emp_id.toLowerCase().includes(t)
  })
  const selectedEmp = employees.find(e => e.id === form.employee_id)

  // Shared input style
  const INP: CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: '0.8125rem',
    border: '1.5px solid var(--color-gray-200)', background: '#fff',
    color: 'var(--color-gray-800)', outline: 'none', boxSizing: 'border-box',
  }
  const LBL: CSSProperties = { fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-gray-400)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const G2: CSSProperties  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#fff', width: 960, maxWidth: '98vw', maxHeight: '96vh', borderRadius: 18, boxShadow: '0 32px 80px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#1E3A5F' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Add Employee Salary</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              {selectedEmp ? `${selectedEmp.first_name} ${selectedEmp.last_name} · ${selectedEmp.emp_id}` : 'Select an employee to configure salary components'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 8px', borderRadius: 8, display: 'flex' }}><X size={16} /></button>
        </div>

        {/* ── Body: two columns ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT: Form */}
          <form id="salary-form" onSubmit={handleSubmit} style={{ flex: '0 0 55%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid var(--color-gray-100)' }}>

            {/* Employee selector */}
            <div>
              <label style={LBL}>Employee *</label>
              <input type="text" placeholder="Search name or ID…" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                style={{ ...INP, marginBottom: 6 }} />
              <select required value={form.employee_id} onChange={e => set('employee_id', e.target.value)} style={{ ...INP, height: 90 }} size={4}>
                <option value="">— Select employee —</option>
                {filteredEmps.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.emp_id}) — {e.department?.name ?? '—'}</option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div style={G2}>
              <div>
                <label style={LBL}>Effective From *</label>
                <input type="date" required value={form.effective_from} onChange={e => set('effective_from', e.target.value)} style={INP} />
              </div>
              <div>
                <label style={LBL}>Effective To</label>
                <input type="date" value={form.effective_to} onChange={e => set('effective_to', e.target.value)} style={INP} />
              </div>
            </div>

            {/* City type toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-600)', flex: 1 }}>City Type (affects HRA)</span>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1.5px solid var(--color-gray-200)' }}>
                {([false, true] as boolean[]).map(isMetro => (
                  <button key={String(isMetro)} type="button" onClick={() => handleMetroToggle(isMetro)}
                    style={{ padding: '5px 14px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: form.metro === isMetro ? '#1E3A5F' : '#fff',
                      color: form.metro === isMetro ? '#fff' : 'var(--color-gray-500)',
                    }}>
                    {isMetro ? 'Metro (50%)' : 'Non-Metro (40%)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Section tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--color-gray-100)' }}>
              {(['earnings', 'deductions'] as const).map(s => (
                <button key={s} type="button" onClick={() => setActiveSection(s)}
                  style={{ padding: '7px 16px', fontSize: '0.8125rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: 'none',
                    color: activeSection === s ? '#1E3A5F' : 'var(--color-gray-400)',
                    borderBottom: `2px solid ${activeSection === s ? '#1E3A5F' : 'transparent'}`, marginBottom: -2,
                  }}>
                  {s === 'earnings' ? 'Earnings' : 'Deductions'}
                </button>
              ))}
            </div>

            {activeSection === 'earnings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={LBL}>Annual CTC (₹) *</label>
                  <input type="number" required min="0" placeholder="e.g. 600000"
                    value={form.ctc_annual} onChange={e => handleCTCChange(e.target.value)} style={INP} />
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#1d4ed8' }}>Enter CTC to auto-fill components below</p>
                </div>
                <div style={G2}>
                  <div>
                    <label style={LBL}>Basic / Month (₹) *</label>
                    <input type="number" required min="0" value={form.basic} onChange={e => handleBasicChange(e.target.value)} style={INP} />
                    <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>Recommended: 40% of monthly CTC</p>
                  </div>
                  <div>
                    <label style={LBL}>HRA / Month (₹)</label>
                    <input type="number" min="0" value={form.hra} onChange={e => set('hra', e.target.value)} style={INP} />
                    <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>{form.metro ? '50%' : '40%'} of Basic</p>
                  </div>
                </div>
                <div style={G2}>
                  <div>
                    <label style={LBL}>Special Allowance (₹)</label>
                    <input type="number" min="0" value={form.special_allowance} onChange={e => set('special_allowance', e.target.value)} style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>Conveyance (₹)</label>
                    <input type="number" min="0" value={form.conveyance} onChange={e => set('conveyance', e.target.value)} style={INP} />
                  </div>
                </div>
                <div style={G2}>
                  <div>
                    <label style={LBL}>Medical Allowance (₹)</label>
                    <input type="number" min="0" value={form.medical_allowance} onChange={e => set('medical_allowance', e.target.value)} style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>LTA / Month (₹)</label>
                    <input type="number" min="0" value={form.lta} onChange={e => set('lta', e.target.value)} style={INP} />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'deductions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.75rem', color: '#15803d' }}>
                  PF ceiling: ₹15,000 basic · ESIC applies only when gross ≤ ₹21,000/month
                </div>
                <div style={G2}>
                  <div>
                    <label style={LBL}>Employee PF (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.pf_employee} onChange={e => set('pf_employee', e.target.value)} style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>Employer PF (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.pf_employer} onChange={e => set('pf_employer', e.target.value)} style={INP} />
                  </div>
                </div>
                <div style={G2}>
                  <div>
                    <label style={LBL}>Employee ESIC (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.esic_employee} onChange={e => set('esic_employee', e.target.value)} style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>Employer ESIC (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.esic_employer} onChange={e => set('esic_employer', e.target.value)} style={INP} />
                  </div>
                </div>
                <div style={G2}>
                  <div>
                    <label style={LBL}>Professional Tax (₹/mo)</label>
                    <input type="number" min="0" value={form.professional_tax} onChange={e => set('professional_tax', e.target.value)} style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>TDS (₹/mo)</label>
                    <input type="number" min="0" value={form.tds} onChange={e => set('tds', e.target.value)} style={INP} />
                  </div>
                </div>
                <div>
                  <label style={LBL}>Remarks</label>
                  <textarea rows={2} placeholder="e.g. Revised salary from Q2 2026" value={form.remarks}
                    onChange={e => set('remarks', e.target.value)} style={{ ...INP, resize: 'vertical' }} />
                </div>
              </div>
            )}
          </form>

          {/* RIGHT: Live salary slip preview */}
          <div style={{ flex: '0 0 45%', overflowY: 'auto', padding: '20px 22px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Salary Preview</p>

            {/* Net take-home hero */}
            <div style={{ textAlign: 'center', padding: '18px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5896 100%)', color: '#fff' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Net Take-Home</p>
              <p style={{ margin: '6px 0 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmtINR(netPay)}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', opacity: 0.6 }}>Annual: {fmtINR(netPay * 12)}</p>
            </div>

            {/* Earnings breakdown */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--color-gray-200)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</span>
              </div>
              {[
                ['Basic Salary',       basic],
                ['HRA',                hra],
                ['Special Allowance',  special],
                ['Conveyance',         conveyance],
                ['Medical Allowance',  medical],
                ['LTA',                lta],
              ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--color-gray-50)', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--color-gray-600)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{fmtINR(val as number)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: '#f0fdf4', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 700, color: '#15803d' }}>Gross Earnings</span>
                <span style={{ fontWeight: 800, color: '#15803d' }}>{fmtINR(gross)}</span>
              </div>
            </div>

            {/* Deductions breakdown */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--color-gray-200)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deductions</span>
              </div>
              {[
                [`PF (${form.pf_employee}% of ₹${Math.min(n(form.basic),15000).toLocaleString('en-IN')})`, empPF],
                [`ESIC (${form.esic_employee}%)${!esicApply ? ' — N/A' : ''}`, empESIC],
                ['Professional Tax', pt],
                ['TDS', tds],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--color-gray-50)', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--color-gray-600)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: (val as number) > 0 ? '#dc2626' : 'var(--color-gray-400)' }}>{(val as number) > 0 ? fmtINR(val as number) : '—'}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: '#fef2f2', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>Total Deductions</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}>{fmtINR(totalDed)}</span>
              </div>
            </div>

            {/* Employer contributions */}
            <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: '10px 14px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employer Contributions</p>
              {[
                [`Employer PF (${form.pf_employer}%)`, empPFAmt],
                [`Employer ESIC (${form.esic_employer}%)${!esicApply ? ' — N/A' : ''}`, empESICAmt],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                  <span style={{ color: '#1d4ed8' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{fmtINR(val as number)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginTop: 6, paddingTop: 6, borderTop: '1px solid #bfdbfe' }}>
                <span style={{ fontWeight: 700, color: '#1d4ed8' }}>Total CTC / Month</span>
                <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{fmtINR(gross + empPFAmt + empESICAmt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 10, flexShrink: 0, background: '#fff' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1.5px solid var(--color-gray-200)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            Cancel
          </button>
          <button type="submit" form="salary-form" disabled={saving} style={{ flex: 3, padding: '9px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : `Save Salary Structure${selectedEmp ? ` for ${selectedEmp.first_name} ${selectedEmp.last_name}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB: SALARY STRUCTURES
───────────────────────────────────────────────────────────── */
function TabSalaryStructures() {
  const [showAdd, setShowAdd]       = useState(false)
  const [liveData, setLiveData]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  function loadStructures() {
    setLoading(true)
    payrollApi.salaryStructures()
      .then(r => setLiveData((r as any).data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStructures() }, [])

  const rows = liveData
  const isLive = true

  const filtered = (rows as any[]).filter((s: any) => {
    if (!search) return true
    const term = search.toLowerCase()
    const name = `${s.employee?.first_name ?? ''} ${s.employee?.last_name ?? ''}`.toLowerCase()
    const empId = s.employee?.emp_id ?? ''
    return name.includes(term) || empId.toLowerCase().includes(term)
  })

  return (
    <div>
      {showAdd && <AddSalaryModal onClose={() => setShowAdd(false)} onSaved={loadStructures} />}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--color-gray-200)', borderRadius: 8, padding: '7px 12px', background: 'var(--color-gray-50)' }}>
          <Search size={14} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name or employee ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--color-gray-800)' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}><X size={13} /></button>}
        </div>

        <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
          {loading ? 'Loading…' : `${filtered.length} structure${filtered.length !== 1 ? 's' : ''}`}
        </span>

        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Add Salary Structure
        </button>
      </div>

      {/* HRA info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
        <span style={{ color: '#1d4ed8', fontSize: '0.875rem', flexShrink: 0 }}>ℹ</span>
        <p style={{ fontSize: '0.75rem', color: '#1d4ed8', margin: 0 }}>
          HRA: <strong>50% of Basic</strong> for metro cities · <strong>40% of Basic</strong> for non-metro. ESIC applicable if gross ≤ ₹21,000/month. PF ceiling: ₹15,000 basic.
        </p>
      </div>

      <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Employee</th>
              <th style={{ minWidth: 150 }}>Annual CTC</th>
              <th style={{ minWidth: 120 }}>Basic / Month</th>
              <th style={{ minWidth: 110 }}>HRA / Month</th>
              <th style={{ minWidth: 140 }}>Special Allow.</th>
              <th style={{ minWidth: 90 }}>EPF</th>
              <th style={{ minWidth: 90 }}>ESIC</th>
              <th style={{ minWidth: 130 }}>Effective From</th>
              <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-gray-400)' }}>Loading salary structures…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <p style={{ margin: 0, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>No salary structures found.</p>
                    <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Plus size={13} /> Add First Structure</button>
                  </div>
                </td>
              </tr>
            )}
            {!loading && isLive && filtered.map((s: any) => {
              const name = `${s.employee?.first_name ?? ''} ${s.employee?.last_name ?? ''}`.trim() || '—'
              const dept = s.employee?.department?.name ?? '—'
              const empId = s.employee?.emp_id ?? '—'
              const epfApplicable = (s.employer_pf ?? 0) > 0
              const esicApplicable = (s.employer_esic ?? 0) > 0
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={name} size={36} />
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{empId} · {dept}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{fmtINR(s.ctc_annual)}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{fmtINR(s.basic_monthly)}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{fmtINR(s.hra_monthly)}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{fmtINR(s.special_allowance)}</td>
                  <td>
                    <Badge label={epfApplicable ? 'Yes' : 'No'} bg={epfApplicable ? '#f0fdf4' : '#f9fafb'} color={epfApplicable ? '#15803d' : '#6b7280'} border={epfApplicable ? '#bbf7d0' : '#e5e7eb'} />
                  </td>
                  <td>
                    <Badge label={esicApplicable ? 'Yes' : 'No'} bg={esicApplicable ? '#fffbeb' : '#f9fafb'} color={esicApplicable ? '#b45309' : '#6b7280'} border={esicApplicable ? '#fde68a' : '#e5e7eb'} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{s.effective_from ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit structure"><Edit size={15} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
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
  const [activeTab, setActiveTab]       = useState<Tab>('runs')
  const [showRunModal, setShowRunModal] = useState(false)
  const [showAddSalary, setShowAddSalary] = useState(false)
  const [apiRuns, setApiRuns]           = useState<ApiPayrollRun[]>([])
  const [loadingRuns, setLoadingRuns]   = useState(true)
  const [empCount, setEmpCount]         = useState<number>(0)

  const fetchRuns = () => {
    setLoadingRuns(true)
    payrollApi.list({ limit: 24 })
      .then(r => setApiRuns(r.data ?? []))
      .catch(e => { console.error('[payroll page]', e); toast.error(e?.message ?? 'Failed to load payroll runs') })
      .finally(() => setLoadingRuns(false))
  }

  useEffect(() => {
    fetchRuns()
    // Fetch active employee headcount
    employeesApi.list({ status: 'active', limit: 1 })
      .then(r => setEmpCount(r.count ?? 0))
      .catch(console.error)
  }, [])

  /* Current month run lookup */
  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()
  const currentRun = apiRuns.find(r => r.month === curMonth && r.year === curYear) ?? null
  const latestRun  = apiRuns[0]

  /* Compute stepper progress from current run status */
  const stepperDone = currentRun
    ? currentRun.status === 'paid' ? 6
      : currentRun.status === 'approved' ? 5
      : currentRun.status === 'processed' ? 4
      : 3   // draft → computation started
    : 2     // no run yet

  const currentPeriod = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const lastDay = new Date(curYear, curMonth, 0).getDate()
  const targetPayDate = `${lastDay} ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`
  const currentStatus = currentRun ? (currentRun.status.charAt(0).toUpperCase() + currentRun.status.slice(1)) : 'Not Started'
  const statusBg: Record<string, string> = { Draft: '#f9fafb', Processed: '#fffbeb', Approved: '#f0fdf4', Paid: '#f0fdf4', 'Not Started': '#f1f5f9' }
  const statusColor: Record<string, string> = { Draft: '#6b7280', Processed: '#b45309', Approved: '#15803d', Paid: '#15803d', 'Not Started': '#64748b' }
  const statusBorder: Record<string, string> = { Draft: '#e5e7eb', Processed: '#fde68a', Approved: '#bbf7d0', Paid: '#bbf7d0', 'Not Started': '#e2e8f0' }

  const fmt = (n?: number | null) => n != null && n > 0 ? `₹${(n / 100000).toFixed(1)}L` : '—'

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'runs',       label: 'Payroll Runs',      count: loadingRuns ? '…' as any : apiRuns.length },
    { key: 'payslips',   label: 'Payslips',           count: empCount },
    { key: 'structures', label: 'Salary Structures',  count: 0 },
    { key: 'statutory',  label: 'Statutory Reports',  count: 6 },
  ]

  return (
    <>
      {showRunModal  && <PayrollRunModal onClose={() => setShowRunModal(false)} onSuccess={fetchRuns} empCount={empCount} existingRun={currentRun} />}
      {showAddSalary && <AddSalaryModal  onClose={() => setShowAddSalary(false)} onSaved={() => setActiveTab('structures')} />}

      <Topbar
        title="Payroll Management"
        subtitle="India-compliant payroll processing & compliance"
        notificationCount={2}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <FileText size={14} /> Form 16
            </button>
            <button onClick={() => setShowAddSalary(true)} className="btn btn-outline btn-sm">
              <Plus size={14} /> Add Employee Salary
            </button>
            <button onClick={() => setShowRunModal(true)} className="btn btn-primary btn-sm">
              <Play size={14} /> Run Payroll
            </button>
          </div>
        }
      />

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── KPI Cards — same exact structure as Employee page ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Gross Pay',  value: fmt(latestRun?.total_gross),        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Total Deductions', value: fmt(latestRun?.total_deductions),   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
            { label: 'Net Payable',      value: fmt(latestRun?.total_net),          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Employer EPF',     value: fmt(latestRun?.total_employer_pf),  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
            { label: 'Employees',        value: empCount > 0 ? String(empCount) : '—',  color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
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
                  {currentPeriod} Payroll
                </h3>
                <span className="badge" style={{ background: statusBg[currentStatus] ?? '#f9fafb', color: statusColor[currentStatus] ?? '#6b7280', border: `1px solid ${statusBorder[currentStatus] ?? '#e5e7eb'}` }}>
                  {currentStatus}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', margin: 0 }}>
                {empCount > 0 ? `${empCount} active employees` : 'Loading employee count…'} · Target pay date:
                <strong style={{ color: 'var(--color-gray-700)', marginLeft: 4 }}>{targetPayDate}</strong>
              </p>
            </div>

            {/* Centre: stepper */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
              <PayrollStepper doneCount={stepperDone} />
            </div>

            {/* Right: action */}
            <button
              onClick={() => setShowRunModal(true)}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, background: currentStatus === 'Paid' ? '#15803d' : undefined }}
            >
              <Play size={14} />
              {currentStatus === 'Paid' ? 'View Payroll' : currentStatus === 'Not Started' ? 'Process Now' : 'Continue Processing'}
            </button>
          </div>
          {currentRun && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Gross Pay',   value: fmtINR(currentRun.total_gross),      color: '#2563eb' },
                { label: 'Deductions',  value: fmtINR(currentRun.total_deductions), color: '#dc2626' },
                { label: 'Net Payable', value: fmtINR(currentRun.total_net),        color: '#15803d' },
                { label: 'Employees',   value: String(currentRun.total_employees ?? '—'), color: '#6d28d9' },
              ].map(k => (
                <div key={k.label}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{k.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.9375rem', fontWeight: 700, color: k.color }}>{k.value}</p>
                </div>
              ))}
              {currentRun.run_date && (
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>Run Date</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>{currentRun.run_date}</p>
                </div>
              )}
            </div>
          )}
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
          {activeTab === 'runs'       && <TabPayrollRuns onRunPayroll={() => setShowRunModal(true)} runs={apiRuns} loading={loadingRuns} onRefresh={fetchRuns} />}
          {activeTab === 'payslips'   && <TabPayslips />}
          {activeTab === 'structures' && <TabSalaryStructures />}
          {activeTab === 'statutory'  && <TabStatutoryReports />}
        </div>

      </div>
    </>
  )
}
