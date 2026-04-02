'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  IndianRupee, Download, FileText, Eye, Mail, CheckCircle2,
  Clock, AlertTriangle, X, Building2, Calendar, Shield,
  BarChart3, Printer, Play, Edit, Check, TrendingUp,
  Users, ArrowUpRight,
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
   HELPERS
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: PayrollStatus }) {
  const cfg: Record<PayrollStatus, { bg: string; color: string; dot: string }> = {
    Paid:       { bg: '#DCFCE7', color: '#15803D', dot: '#16A34A' },
    Processing: { bg: '#FEF9C3', color: '#A16207', dot: '#CA8A04' },
    Draft:      { bg: '#F1F5F9', color: '#475569', dot: '#94A3B8' },
  }
  const c = cfg[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {status}
    </span>
  )
}

function Pill({ label, color }: { label: string; color: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    blue:   { bg: '#DBEAFE', text: '#1D4ED8' },
    green:  { bg: '#DCFCE7', text: '#15803D' },
    red:    { bg: '#FEE2E2', text: '#DC2626' },
    amber:  { bg: '#FEF3C7', text: '#B45309' },
    purple: { bg: '#F3E8FF', text: '#6D28D9' },
    gray:   { bg: '#F1F5F9', text: '#475569' },
  }
  const c = map[color] ?? map.gray
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  )
}

function EmpAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const colors = ['#E8622A', '#1565C0', '#16A34A', '#7C3AED', '#BE185D', '#0369A1', '#B45309']
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: colors[idx] }}>
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAYROLL RUN MODAL
───────────────────────────────────────────────────────────── */
function PayrollRunModal({ onClose }: { onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false)
  const steps = [
    { label: 'Attendance data locked (March 1–31)', done: true,  note: 'All 87 employees attendance captured' },
    { label: 'Leave adjustments applied',           done: true,  note: '2 LOP deductions applied' },
    { label: 'Reimbursements added',                done: true,  note: '12 approved claims totalling ₹28,400' },
    { label: 'Salary computation in progress',      done: false, note: 'Computing for 87 employees…' },
    { label: 'Pending HR approval',                 done: false, note: 'Awaiting final approval from HR Head' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Run Payroll — March 2026</h2>
            <p className="text-sm text-gray-500 mt-0.5">87 employees · Estimated Net: <span className="font-semibold text-green-700">₹42,09,800</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl transition-all"
              style={{ background: s.done ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${s.done ? '#BBF7D0' : '#E2E8F0'}` }}>
              <div className="flex-shrink-0 mt-0.5">
                {s.done
                  ? <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#16A34A' }}><Check size={11} color="#fff" /></div>
                  : <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-amber-400"><Clock size={10} style={{ color: '#F59E0B' }} /></div>
                }
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: s.done ? '#15803D' : '#92400E' }}>{s.label}</p>
                <p className="text-xs mt-0.5" style={{ color: s.done ? '#166534' : '#B45309' }}>{s.note}</p>
              </div>
              {s.done && <div className="ml-auto flex-shrink-0"><span className="text-xs text-green-600 font-semibold">✓ Done</span></div>}
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <div className="p-3 rounded-xl mb-4" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <p className="text-xs text-orange-700">
              <strong>Note:</strong> Once confirmed, salary computation will begin. Payslips will be generated after HR approval. This action cannot be undone for the current month.
            </p>
          </div>
          {confirmed ? (
            <div className="flex items-center gap-2 justify-center p-3 rounded-xl" style={{ background: '#DCFCE7' }}>
              <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
              <span className="text-sm font-semibold text-green-700">Payroll computation initiated!</span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => setConfirmed(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #E8622A, #F59E0B)' }}>
                Confirm & Run Payroll
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-3 sticky top-0 bg-white z-10" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="text-sm font-bold text-gray-900">Payslip — March 2026</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: '#E8622A' }}>
              <Download size={13} /> PDF
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              <Mail size={13} /> Email
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Company Header */}
          <div className="text-center mb-5 pb-4" style={{ borderBottom: '2px solid #E8622A' }}>
            <div className="inline-flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: '#E8622A' }}>IH</div>
              <span className="text-xl font-extrabold text-gray-900">Imperia HRMS</span>
            </div>
            <p className="text-xs text-gray-500">123 Business Park, Whitefield, Bengaluru – 560066 · CIN: U72900KA2020PTC123456</p>
            <div className="mt-2 inline-flex px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>
              Payslip · March 2026
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-5 p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="space-y-1.5">
              {[['Employee Name', emp.name], ['Employee ID', emp.empId], ['Designation', emp.designation], ['Department', emp.department], ['Location', emp.location]].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0">{k}</span>
                  <span className="text-xs font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[['Bank Account', emp.bankAccount], ['IFSC Code', emp.ifsc], ['PAN', emp.pan], ['PF Account', emp.pf], ['Pay Period', 'March 2026']].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0">{k}</span>
                  <span className="text-xs font-semibold text-gray-800 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[{ label: 'Working Days', value: emp.workingDays, color: '#1D4ED8' }, { label: 'Days Present', value: emp.presentDays, color: '#15803D' }, { label: 'LOP Days', value: emp.lopDays, color: emp.lopDays > 0 ? '#DC2626' : '#94A3B8' }].map((item) => (
              <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <p className="text-2xl font-extrabold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 pb-1.5 flex items-center gap-1.5" style={{ borderBottom: '2px solid #16A34A' }}>
                <span className="w-2 h-2 rounded-full bg-green-600" /> Earnings
              </h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100">
                  {[['Basic Salary', '₹25,000'], ['HRA', '₹12,500'], ['Conveyance', '₹1,600'], ['Medical Allowance', '₹1,250'], ['Special Allowance', '₹8,500']].map(([label, amount]) => (
                    <tr key={label}>
                      <td className="py-1.5 text-gray-600">{label}</td>
                      <td className="py-1.5 text-right font-semibold text-gray-800">{amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #E2E8F0' }}>
                    <td className="pt-2 font-bold text-gray-900">Gross Earnings</td>
                    <td className="pt-2 text-right font-extrabold text-green-700">₹48,850</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 pb-1.5 flex items-center gap-1.5" style={{ borderBottom: '2px solid #DC2626' }}>
                <span className="w-2 h-2 rounded-full bg-red-600" /> Deductions
              </h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100">
                  {[['PF (Employee 12%)', '₹3,000'], ['ESIC', '₹0 (N/A)'], ['Professional Tax', '₹200'], ['TDS (Income Tax)', '₹1,500'], ['LOP Deduction', '₹0']].map(([label, amount]) => (
                    <tr key={label}>
                      <td className="py-1.5 text-gray-600">{label}</td>
                      <td className="py-1.5 text-right font-semibold text-gray-800">{amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #E2E8F0' }}>
                    <td className="pt-2 font-bold text-gray-900">Total Deductions</td>
                    <td className="pt-2 text-right font-extrabold text-red-600">₹4,700</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Net Salary */}
          <div className="text-center py-5 rounded-xl mb-4" style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #BBF7D0' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Salary (Take Home)</p>
            <p className="text-4xl font-extrabold text-green-700">₹44,150</p>
            <p className="text-xs text-gray-500 mt-1">Forty Four Thousand One Hundred and Fifty Rupees Only</p>
          </div>

          {/* Employer Contributions */}
          <div className="p-3.5 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-bold text-blue-800 mb-2">Employer Contributions (Not deducted from salary)</p>
            <div className="flex gap-6 flex-wrap">
              <span className="text-xs text-blue-700">EPF (Employer 12%): <strong>₹3,000</strong></span>
              <span className="text-xs text-blue-700">ESIC (Employer): <strong>₹0 (N/A)</strong></span>
              <span className="text-xs text-blue-700">Gratuity Provision: <strong>₹1,202</strong></span>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            This is a computer-generated payslip and does not require a signature. For queries contact payroll@imperia.in
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Last 6 payroll cycles</p>
        <button onClick={onRunPayroll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #E8622A, #F59E0B)' }}>
          <Play size={14} /> Run Payroll
        </button>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Period', 'Employees', 'Gross Amount', 'Deductions', 'Net Amount', 'Status', 'Run Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAYROLL_RUNS.map((run, i) => (
              <tr key={run.id} className="transition-colors hover:bg-orange-50/40"
                style={{ borderBottom: i < PAYROLL_RUNS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-gray-900">{run.period}</p>
                  {run.status === 'Draft' && <p className="text-xs text-amber-600 font-medium mt-0.5">In preparation</p>}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Users size={13} className="text-gray-400" />
                    {run.employees}
                  </div>
                </td>
                <td className="px-4 py-3.5 font-semibold text-gray-800">{run.gross}</td>
                <td className="px-4 py-3.5 text-red-600 font-medium">{run.deductions}</td>
                <td className="px-4 py-3.5 text-green-700 font-bold">{run.net}</td>
                <td className="px-4 py-3.5"><StatusBadge status={run.status} /></td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">{run.runDate}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
                      <Eye size={11} /> View
                    </button>
                    {run.status === 'Paid' && (
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                        <Download size={11} /> Download
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
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
          <Calendar size={13} className="text-gray-400" />
          <select className="text-sm text-gray-700 bg-transparent outline-none">
            <option>March 2026</option>
            <option>February 2026</option>
            <option>January 2026</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white flex-1 max-w-xs">
          <span className="text-gray-400 text-xs">🔍</span>
          <input type="text" placeholder="Search employee or ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="text-sm text-gray-700 bg-transparent outline-none w-full" />
        </div>
        <div className="ml-auto">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={13} /> Export All
          </button>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{filtered.length} employees</div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Employee', 'Dept', 'Days', 'LOP', 'Gross', 'Deductions', 'Net Salary', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, i) => (
              <tr key={emp.id} className="transition-colors hover:bg-orange-50/40"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <EmpAvatar name={emp.name} />
                    <div>
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{emp.empId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-gray-600 text-sm">{emp.department}</td>
                <td className="px-4 py-3.5">
                  <span className="text-green-700 font-semibold">{emp.presentDays}</span>
                  <span className="text-gray-400">/{emp.workingDays}</span>
                </td>
                <td className="px-4 py-3.5">
                  {emp.lopDays > 0
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#FEE2E2', color: '#DC2626' }}>{emp.lopDays} days</span>
                    : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3.5 font-semibold text-gray-800">{emp.gross}</td>
                <td className="px-4 py-3.5 text-red-600 font-medium">{emp.deductions}</td>
                <td className="px-4 py-3.5">
                  <span className="font-extrabold text-green-700">{emp.net}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setSelectedEmp(emp)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
                      <Eye size={11} /> View
                    </button>
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                      <Mail size={11} /> Email
                    </button>
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
  return (
    <div>
      <div className="flex items-start gap-3 p-4 rounded-xl mb-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <span className="text-blue-500 flex-shrink-0 text-base mt-0.5">ℹ️</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">India Salary Structure — HRA Calculation Rule</p>
          <p className="text-xs text-blue-700 mt-0.5">
            HRA is <strong>50% of Basic</strong> for metro cities (Mumbai, Delhi, Kolkata, Chennai) and <strong>40% of Basic</strong> for non-metro cities as per the Income Tax Act. ESIC is applicable for employees with gross salary ≤ ₹21,000/month.
          </p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Employee', 'Annual CTC', 'Basic', 'HRA', 'Special Allow.', 'EPF', 'ESIC', 'Effective', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SALARY_STRUCTURES.map((s, i) => (
              <tr key={s.id} className="transition-colors hover:bg-orange-50/40"
                style={{ borderBottom: i < SALARY_STRUCTURES.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <EmpAvatar name={s.name} />
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.department}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-bold text-gray-900">{s.annualCTC}</td>
                <td className="px-4 py-3.5 text-gray-700">{s.basic}</td>
                <td className="px-4 py-3.5">
                  <p className="text-gray-700">{s.hra}</p>
                  <p className="text-xs mt-0.5" style={{ color: ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'].includes(s.location) ? '#1D4ED8' : '#6D28D9' }}>
                    {['Mumbai', 'Delhi', 'Chennai', 'Kolkata'].includes(s.location) ? '50% (metro)' : '40% (non-metro)'}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-gray-700">{s.specialAllowance}</td>
                <td className="px-4 py-3.5"><Pill label={s.epfApplicable ? 'Yes' : 'No'} color={s.epfApplicable ? 'green' : 'gray'} /></td>
                <td className="px-4 py-3.5"><Pill label={s.esicApplicable ? 'Yes' : 'No'} color={s.esicApplicable ? 'amber' : 'gray'} /></td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">{s.effectiveFrom}</td>
                <td className="px-4 py-3.5">
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors">
                    <Edit size={11} /> Edit
                  </button>
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
    { name: 'EPF Monthly Contribution', form: 'Form 12A / ECR',   frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#1D4ED8', bg: '#DBEAFE', icon: '🏦', description: 'Employee Provident Fund monthly challan for 87 employees' },
    { name: 'ESIC Contribution',        form: 'Form 5',           frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#059669', bg: '#D1FAE5', icon: '🏥', description: 'Employee State Insurance Corporation monthly return' },
    { name: 'Professional Tax',         form: 'PT Challan',       frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#6D28D9', bg: '#EDE9FE', icon: '📋', description: 'State-wise Professional Tax challan for all employees' },
    { name: 'TDS on Salary',            form: 'Form 24Q',         frequency: 'Quarterly', lastGenerated: '15 Jan 2026', type: 'download', color: '#DC2626', bg: '#FEE2E2', icon: '💸', description: 'Quarterly TDS return for Q3 FY 2025-26 (Oct–Dec 2025)' },
    { name: 'Annual TDS Certificate',   form: 'Form 16',          frequency: 'Annual',    lastGenerated: '15 Jun 2025', type: 'generate', color: '#B45309', bg: '#FEF3C7', icon: '📄', description: 'Income Tax Form 16 for FY 2024-25 — 84 employees' },
    { name: 'PF Electronic Challan',    form: 'PF ECR',           frequency: 'Monthly',   lastGenerated: '05 Mar 2026', type: 'download', color: '#0891B2', bg: '#CFFAFE', icon: '💼', description: 'Electronic Challan cum Return for PF remittance' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
        <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">EPF & ESIC Filing Due Soon</p>
          <p className="text-xs text-amber-700 mt-0.5">
            EPF challan for March 2026 must be filed by <strong>15 April 2026</strong> (13 days remaining). ESIC contribution also due by <strong>15 April 2026</strong>.
          </p>
        </div>
        <button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 flex-shrink-0" style={{ background: '#D97706' }}>
          File Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.name} className="p-5 rounded-2xl bg-white transition-all hover:shadow-md" style={{ border: '1px solid #E2E8F0' }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: r.bg }}>
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight">{r.name}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: r.color }}>{r.form}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: r.bg, color: r.color }}>
                {r.frequency}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{r.description}</p>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
              <span className="text-xs text-gray-400">Last: {r.lastGenerated}</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: r.color }}>
                {r.type === 'generate' ? <><FileText size={12} /> Generate</> : <><Download size={12} /> Download</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PROGRESS STEPPER
───────────────────────────────────────────────────────────── */
function PayrollStepper() {
  const steps = [
    { label: 'Attendance Finalized', done: true  },
    { label: 'Leave Adjusted',       done: true  },
    { label: 'Reimbursements Added', done: true  },
    { label: 'Salary Computed',      done: false },
    { label: 'HR Approval',          done: false },
    { label: 'Payslips Generated',   done: false },
  ]
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{ background: s.done ? '#16A34A' : 'rgba(255,255,255,0.15)', color: s.done ? '#fff' : 'rgba(255,255,255,0.5)', border: s.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)' }}>
              {s.done ? <Check size={13} /> : i + 1}
            </div>
            <span className="text-[10px] mt-1 text-center whitespace-nowrap" style={{ color: s.done ? '#86EFAC' : 'rgba(255,255,255,0.35)', maxWidth: '68px', lineHeight: 1.2 }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 mb-4 mx-1 flex-shrink-0 rounded-full"
              style={{ background: s.done ? '#16A34A' : 'rgba(255,255,255,0.15)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<Tab>('runs')
  const [showRunModal, setShowRunModal] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'runs',       label: 'Payroll Runs' },
    { key: 'payslips',   label: 'Payslips' },
    { key: 'structures', label: 'Salary Structures' },
    { key: 'statutory',  label: 'Statutory Reports' },
  ]

  return (
    <>
      {showRunModal && <PayrollRunModal onClose={() => setShowRunModal(false)} />}

      <Topbar
        title="Payroll Management"
        subtitle="India-compliant payroll processing & compliance"
        notificationCount={2}
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-orange-50" style={{ borderColor: '#E8622A', color: '#E8622A' }}>
              <FileText size={14} /> Form 16
            </button>
            <button onClick={() => setShowRunModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E8622A, #F59E0B)' }}>
              <Play size={14} /> Run Payroll
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5" style={{ background: '#F1F4F9', minHeight: '100vh' }}>

        {/* ── STATUS BANNER ── */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
          {/* Decorative orb */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E8622A, transparent)' }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-white font-extrabold text-xl">March 2026 Payroll</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' }}>
                  Draft
                </span>
              </div>
              <p className="text-slate-400 text-sm">87 employees · Target pay date: <span className="text-slate-300 font-medium">31 March 2026</span></p>
              <div className="flex items-center gap-3 mt-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Net Payable</p>
                  <p className="text-lg font-extrabold text-green-400">₹42.1L</p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div className="text-center">
                  <p className="text-xs text-slate-500">Gross</p>
                  <p className="text-lg font-extrabold text-slate-200">₹48.3L</p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div className="text-center">
                  <p className="text-xs text-slate-500">Deductions</p>
                  <p className="text-lg font-extrabold text-red-400">₹6.2L</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <PayrollStepper />
            </div>
            <button onClick={() => setShowRunModal(true)}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E8622A, #F59E0B)' }}>
              <Play size={15} /> Process Now
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Gross Pay',      value: '₹48,25,000', sub: '87 employees · March 2026', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', iconBg: '#DBEAFE', icon: <IndianRupee size={17} />, trend: '+0.9%' },
            { label: 'Total Deductions',     value: '₹6,15,200',  sub: 'PF + TDS + PT + ESIC',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', iconBg: '#FEE2E2', icon: <span className="text-sm font-extrabold">−</span>, trend: '' },
            { label: 'Net Payable',          value: '₹42,09,800', sub: 'After all deductions',       color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', iconBg: '#DCFCE7', icon: <IndianRupee size={17} />, trend: '+1.0%' },
            { label: 'Employer EPF',         value: '₹2,16,000',  sub: '12% employer contribution',  color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', iconBg: '#FFEDD5', icon: <Shield size={17} />,       trend: '' },
            { label: 'Total TDS',            value: '₹1,45,000',  sub: 'Income tax withheld',        color: '#6D28D9', bg: '#FAF5FF', border: '#E9D5FF', iconBg: '#F3E8FF', icon: <BarChart3 size={17} />,    trend: '' },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl p-4 transition-all hover:shadow-md"
              style={{ background: card.bg, border: `1px solid ${card.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-tight">{card.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.iconBg, color: card.color }}>
                  {card.icon}
                </div>
              </div>
              <p className="text-xl font-extrabold" style={{ color: card.color }}>{card.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {card.trend && <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5"><ArrowUpRight size={10} />{card.trend}</span>}
                <p className="text-[10px] text-gray-500">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TAB NAV + CONTENT ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex" style={{ borderBottom: '1px solid #E2E8F0' }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className="px-6 py-4 text-sm font-semibold transition-colors relative"
                style={{ color: activeTab === t.key ? '#E8622A' : '#64748B', background: activeTab === t.key ? '#FFF7F5' : 'transparent' }}>
                {t.label}
                {activeTab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#E8622A' }} />}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'runs'       && <TabPayrollRuns onRunPayroll={() => setShowRunModal(true)} />}
            {activeTab === 'payslips'   && <TabPayslips />}
            {activeTab === 'structures' && <TabSalaryStructures />}
            {activeTab === 'statutory'  && <TabStatutoryReports />}
          </div>
        </div>
      </div>
    </>
  )
}
