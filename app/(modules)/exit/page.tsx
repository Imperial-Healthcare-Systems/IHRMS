'use client'


import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  UserMinus,
  LogOut,
  IndianRupee,
  Clock,
  X,
  CheckCircle2,
  Circle,
  Eye,
  ChevronRight,
  Download,
  FileText,
  Play,
  Calendar,
  User,
  AlertTriangle,
  Check,
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
  id: number
  name: string
  empId: string
  department: string
  exitType: ExitType
  resignationDate: string
  lastWorkingDate: string
  noticePeriod: number
  clearanceCleared: number
  clearanceTotal: number
  fnfStatus: FnFStatus
}

interface ClearanceItem {
  id: string
  label: string
  description: string
  cleared: boolean
}

interface FnFRecord {
  id: number
  name: string
  empId: string
  lastWorkingDate: string
  salaryEarned: number
  leaveEncashment: number
  noticePeriodRecovery: number
  bonusArrears: number
  deductions: number
  netFnF: number
  status: FnFStatus
}

interface ProbationEmployee {
  id: number
  name: string
  empId: string
  designation: string
  department: string
  joinDate: string
  probationEndDate: string
  manager: string
  reviewStatus: ReviewStatus
  daysRemaining: number
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const EXIT_RECORDS: ExitRecord[] = [
  { id: 1, name: 'Vivek Sharma', empId: 'EMP/2024/045', department: 'Engineering', exitType: 'Resignation', resignationDate: 'Mar 15, 2026', lastWorkingDate: 'Apr 14, 2026', noticePeriod: 30, clearanceCleared: 3, clearanceTotal: 5, fnfStatus: 'Pending' },
  { id: 2, name: 'Anita Nair', empId: 'EMP/2023/012', department: 'HR', exitType: 'Resignation', resignationDate: 'Mar 20, 2026', lastWorkingDate: 'May 19, 2026', noticePeriod: 60, clearanceCleared: 1, clearanceTotal: 5, fnfStatus: 'Pending' },
  { id: 3, name: 'Suresh Kumar', empId: 'EMP/2022/008', department: 'Finance', exitType: 'Retirement', resignationDate: 'Feb 28, 2026', lastWorkingDate: 'Feb 28, 2026', noticePeriod: 0, clearanceCleared: 5, clearanceTotal: 5, fnfStatus: 'Completed' },
  { id: 4, name: 'Pradeep Singh', empId: 'EMP/2023/078', department: 'Sales', exitType: 'Termination', resignationDate: 'Mar 1, 2026', lastWorkingDate: 'Mar 31, 2026', noticePeriod: 30, clearanceCleared: 4, clearanceTotal: 5, fnfStatus: 'Pending' },
  { id: 5, name: 'Kavya Menon', empId: 'EMP/2024/091', department: 'Operations', exitType: 'Resignation', resignationDate: 'Apr 1, 2026', lastWorkingDate: 'Apr 30, 2026', noticePeriod: 30, clearanceCleared: 0, clearanceTotal: 5, fnfStatus: 'Not Started' },
]

const INITIAL_CLEARANCE: ClearanceItem[] = [
  { id: 'hr', label: 'HR Clearance', description: 'Clear pending leaves, update records', cleared: true },
  { id: 'it', label: 'IT Clearance', description: 'Return laptop, revoke access', cleared: true },
  { id: 'finance', label: 'Finance Clearance', description: 'No pending expense claims', cleared: true },
  { id: 'manager', label: 'Manager Clearance', description: 'Knowledge transfer done', cleared: false },
  { id: 'admin', label: 'Admin Clearance', description: 'Return ID card, access card', cleared: false },
]

const FNF_RECORDS: FnFRecord[] = [
  { id: 1, name: 'Vivek Sharma', empId: 'EMP/2024/045', lastWorkingDate: 'Apr 14, 2026', salaryEarned: 14423, leaveEncashment: 7696, noticePeriodRecovery: 0, bonusArrears: 5000, deductions: 4331, netFnF: 22788, status: 'Pending' },
  { id: 2, name: 'Anita Nair', empId: 'EMP/2023/012', lastWorkingDate: 'May 19, 2026', salaryEarned: 29167, leaveEncashment: 4808, noticePeriodRecovery: 0, bonusArrears: 0, deductions: 3992, netFnF: 29983, status: 'Pending' },
  { id: 3, name: 'Suresh Kumar', empId: 'EMP/2022/008', lastWorkingDate: 'Feb 28, 2026', salaryEarned: 45000, leaveEncashment: 12000, noticePeriodRecovery: 0, bonusArrears: 10000, deductions: 7200, netFnF: 59800, status: 'Approved' },
  { id: 4, name: 'Pradeep Singh', empId: 'EMP/2023/078', lastWorkingDate: 'Mar 31, 2026', salaryEarned: 38000, leaveEncashment: 6000, noticePeriodRecovery: 0, bonusArrears: 0, deductions: 5320, netFnF: 38680, status: 'Pending' },
]

const PROBATION_EMPLOYEES: ProbationEmployee[] = [
  { id: 1, name: 'Arjun Patel', empId: 'EMP/2026/013', designation: 'Software Engineer', department: 'Engineering', joinDate: 'Oct 1, 2025', probationEndDate: 'Apr 1, 2026', manager: 'Rajeev Gupta', reviewStatus: 'Overdue', daysRemaining: -1 },
  { id: 2, name: 'Sunita Rao', empId: 'EMP/2026/014', designation: 'HR Executive', department: 'HR', joinDate: 'Oct 1, 2025', probationEndDate: 'Apr 1, 2026', manager: 'Meena Iyer', reviewStatus: 'Overdue', daysRemaining: -1 },
  { id: 3, name: 'Mohammed Irfan', empId: 'EMP/2026/015', designation: 'Sales Executive', department: 'Sales', joinDate: 'Oct 15, 2025', probationEndDate: 'Apr 15, 2026', manager: 'Suresh Nair', reviewStatus: 'Scheduled', daysRemaining: 14 },
  { id: 4, name: 'Deepika Sharma', empId: 'EMP/2026/016', designation: 'Finance Analyst', department: 'Finance', joinDate: 'Oct 15, 2025', probationEndDate: 'Apr 15, 2026', manager: 'Priya Menon', reviewStatus: 'Pending', daysRemaining: 14 },
  { id: 5, name: 'Vikram Nair', empId: 'EMP/2026/017', designation: 'Operations Executive', department: 'Operations', joinDate: 'Nov 1, 2025', probationEndDate: 'May 1, 2026', manager: 'Anil Kumar', reviewStatus: 'Pending', daysRemaining: 30 },
  { id: 6, name: 'Sonia Kapoor', empId: 'EMP/2026/018', designation: 'Marketing Analyst', department: 'Marketing', joinDate: 'Nov 1, 2025', probationEndDate: 'May 1, 2026', manager: 'Neha Singh', reviewStatus: 'Pending', daysRemaining: 30 },
  { id: 7, name: 'Ravi Shankar', empId: 'EMP/2026/019', designation: 'Senior Engineer', department: 'Engineering', joinDate: 'Nov 15, 2025', probationEndDate: 'May 15, 2026', manager: 'Rajeev Gupta', reviewStatus: 'Pending', daysRemaining: 44 },
  { id: 8, name: 'Kavita Pillai', empId: 'EMP/2026/020', designation: 'Support Executive', department: 'Customer Support', joinDate: 'Apr 5, 2026', probationEndDate: 'Apr 7, 2026', manager: 'Deepak Rao', reviewStatus: 'Pending', daysRemaining: 6 },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function exitTypeBadge(type: ExitType) {
  const map: Record<ExitType, string> = {
    Resignation: 'bg-orange-100 text-orange-700',
    Termination: 'bg-red-100 text-red-700',
    Retirement: 'bg-blue-100 text-blue-700',
    'Contract End': 'bg-gray-100 text-gray-700',
    'Mutual Separation': 'bg-purple-100 text-purple-700',
  }
  return map[type] ?? 'bg-gray-100 text-gray-700'
}

function fnfBadge(status: FnFStatus) {
  const map: Record<FnFStatus, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    Completed: 'bg-green-100 text-green-700',
    Approved: 'bg-green-100 text-green-700',
    'Not Started': 'bg-gray-100 text-gray-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

function daysRemainingColor(days: number) {
  if (days < 0) return 'text-red-600 font-semibold'
  if (days < 7) return 'text-amber-600 font-semibold'
  return 'text-green-600 font-semibold'
}

function reviewStatusBadge(status: ReviewStatus) {
  const map: Record<ReviewStatus, string> = {
    Overdue: 'bg-red-100 text-red-700',
    Pending: 'bg-amber-100 text-amber-700',
    Scheduled: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ExitPage() {
  const [tab, setTab] = useState<ExitTab>('exit')
  const [showInitiateModal, setShowInitiateModal] = useState(false)
  const [selectedExit, setSelectedExit] = useState<ExitRecord | null>(null)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showFnFModal, setShowFnFModal] = useState(false)
  const [selectedFnF, setSelectedFnF] = useState<FnFRecord | null>(null)
  const [showProbationModal, setShowProbationModal] = useState(false)
  const [selectedProbation, setSelectedProbation] = useState<ProbationEmployee | null>(null)
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>(INITIAL_CLEARANCE)

  // Initiate modal state
  const [initEmployee, setInitEmployee] = useState('')
  const [initExitType, setInitExitType] = useState<ExitType>('Resignation')
  const [initResignDate, setInitResignDate] = useState('')
  const [initLastDate, setInitLastDate] = useState('')
  const [initNoticePeriod, setInitNoticePeriod] = useState('30')
  const [initReason, setInitReason] = useState('')

  // Probation review modal state
  const [probRating, setProbRating] = useState('4')
  const [probOutcome, setProbOutcome] = useState<ProbationOutcome>('Confirmed')
  const [probExtendMonths, setProbExtendMonths] = useState('3')
  const [probRemarks, setProbRemarks] = useState('')
  const [probEffectiveDate, setProbEffectiveDate] = useState('')

  const toggleClearance = (id: string) => {
    setClearanceItems(prev => prev.map(item => item.id === id ? { ...item, cleared: !item.cleared } : item))
  }

  const openManage = (exit: ExitRecord) => {
    setSelectedExit(exit)
    setShowManageModal(true)
  }

  const openFnF = (fnf: FnFRecord) => {
    setSelectedFnF(fnf)
    setShowFnFModal(true)
  }

  const openProbationReview = (emp: ProbationEmployee) => {
    setSelectedProbation(emp)
    setShowProbationModal(true)
  }

  const TABS: { key: ExitTab; label: string }[] = [
    { key: 'exit', label: 'Exit Management' },
    { key: 'fnf', label: 'FnF Settlement' },
    { key: 'probation', label: 'Probation Tracking' },
  ]

  return (
    <div className="p-6 space-y-6">
      <Topbar
        title="Exit Management & Employee Lifecycle"
        subtitle="Manage exits, full & final settlements, and probation reviews"
      >
        <button
          onClick={() => setShowInitiateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserMinus className="w-4 h-4" />
          Initiate Exit Process
        </button>
      </Topbar>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'On Notice Period', value: 5, color: 'orange', Icon: UserMinus },
          { label: 'Exit This Month', value: 3, color: 'red', Icon: LogOut },
          { label: 'FnF Pending', value: 2, color: 'amber', Icon: IndianRupee },
          { label: 'Probation Due', value: 4, color: 'blue', Icon: Clock },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-100`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1 — Exit Management */}
        {tab === 'exit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Employee', 'EMP ID', 'Department', 'Exit Type', 'Resignation Date', 'Last Working Date', 'Notice Period', 'Clearance', 'FnF Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {EXIT_RECORDS.map(exit => (
                  <tr key={exit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{exit.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{exit.empId}</td>
                    <td className="px-4 py-3 text-gray-600">{exit.department}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${exitTypeBadge(exit.exitType)}`}>
                        {exit.exitType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{exit.resignationDate}</td>
                    <td className="px-4 py-3 text-gray-600">{exit.lastWorkingDate}</td>
                    <td className="px-4 py-3 text-gray-600">{exit.noticePeriod} days</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5" style={{ minWidth: 60 }}>
                          <div
                            className={`h-1.5 rounded-full ${exit.clearanceCleared === exit.clearanceTotal ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${(exit.clearanceCleared / exit.clearanceTotal) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{exit.clearanceCleared}/{exit.clearanceTotal}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${fnfBadge(exit.fnfStatus)}`}>
                        {exit.fnfStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openManage(exit)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button onClick={() => openManage(exit)} className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-xs font-medium">
                          <ChevronRight className="w-3.5 h-3.5" /> Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2 — FnF Settlement */}
        {tab === 'fnf' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Employee', 'Last Working Date', 'Salary Earned', 'Leave Encashment', 'Notice Recovery', 'Bonus/Arrears', 'Deductions', 'Net FnF', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FNF_RECORDS.map(fnf => (
                  <tr key={fnf.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{fnf.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{fnf.empId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fnf.lastWorkingDate}</td>
                    <td className="px-4 py-3 text-gray-600">₹{fnf.salaryEarned.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">₹{fnf.leaveEncashment.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {fnf.noticePeriodRecovery > 0 ? <span className="text-red-600">-₹{fnf.noticePeriodRecovery.toLocaleString()}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">₹{fnf.bonusArrears.toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-600">-₹{fnf.deductions.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{fnf.netFnF.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${fnfBadge(fnf.status)}`}>
                        {fnf.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openFnF(fnf)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {fnf.status !== 'Approved' && (
                          <button onClick={() => openFnF(fnf)} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium">
                            <IndianRupee className="w-3.5 h-3.5" /> Pay
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Employee', 'EMP ID', 'Designation', 'Join Date', 'Probation End', 'Manager', 'Review Status', 'Days Remaining', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PROBATION_EMPLOYEES.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.empId}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.designation}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.joinDate}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.probationEndDate}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.manager}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${reviewStatusBadge(emp.reviewStatus)}`}>
                        {emp.reviewStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={daysRemainingColor(emp.daysRemaining)}>
                        {emp.daysRemaining < 0
                          ? `${Math.abs(emp.daysRemaining)} day(s) overdue`
                          : `${emp.daysRemaining} days`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {emp.reviewStatus === 'Overdue' || emp.reviewStatus === 'Pending' ? (
                          <>
                            <button className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Schedule</button>
                            <button onClick={() => openProbationReview(emp)} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Complete</button>
                            <button className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100">Extend</button>
                          </>
                        ) : emp.reviewStatus === 'Scheduled' ? (
                          <>
                            <button onClick={() => openProbationReview(emp)} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Complete</button>
                            <button className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100">Confirm</button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
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

      {/* ─── MODAL: Initiate Exit Process ─── */}
      {showInitiateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Initiate Exit Process</h2>
              <button onClick={() => setShowInitiateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={initEmployee}
                  onChange={e => setInitEmployee(e.target.value)}
                >
                  <option value="">Select employee...</option>
                  <option>Vivek Sharma (EMP/2024/045)</option>
                  <option>Anita Nair (EMP/2023/012)</option>
                  <option>Kavya Menon (EMP/2024/091)</option>
                  <option>Ravi Shankar (EMP/2026/019)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exit Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={initExitType}
                  onChange={e => setInitExitType(e.target.value as ExitType)}
                >
                  <option>Resignation</option>
                  <option>Termination</option>
                  <option>Retirement</option>
                  <option>Contract End</option>
                  <option>Mutual Separation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={initResignDate}
                    onChange={e => setInitResignDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={initLastDate}
                    onChange={e => setInitLastDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (days)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={initNoticePeriod}
                  onChange={e => setInitNoticePeriod(e.target.value)}
                  placeholder="Auto-calculated or override"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={initReason}
                  onChange={e => setInitReason(e.target.value)}
                  placeholder="Enter reason for exit..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowInitiateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                Initiate Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Manage Exit / Clearance ─── */}
      {showManageModal && selectedExit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedExit.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500 font-mono">{selectedExit.empId}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-500">{selectedExit.department}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exitTypeBadge(selectedExit.exitType)}`}>
                    {selectedExit.exitType}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Exit Info */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Resignation Date</p>
                  <p className="font-medium text-gray-800">{selectedExit.resignationDate}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Last Working Date</p>
                  <p className="font-medium text-gray-800">{selectedExit.lastWorkingDate}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Notice Period</p>
                  <p className="font-medium text-gray-800">{selectedExit.noticePeriod} days</p>
                </div>
              </div>

              {/* Clearance Checklist */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Clearance Checklist</h3>
                <div className="space-y-3">
                  {clearanceItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        {item.cleared
                          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleClearance(item.id)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                          item.cleared
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {item.cleared ? 'Undo' : 'Mark Cleared'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
                  <FileText className="w-4 h-4" /> Generate Experience Letter
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  <IndianRupee className="w-4 h-4" /> Initiate FnF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FnF Calculation ─── */}
      {showFnFModal && selectedFnF && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">FnF Calculation Statement — {selectedFnF.name}</h2>
              <button onClick={() => setShowFnFModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Earnings */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Earnings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salary for Apr 1–14 (14 days of 26 working days)</span>
                    <span className="font-medium">₹14,423</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leave Encashment (8 EL days @ ₹962/day)</span>
                    <span className="font-medium">₹7,696</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performance Bonus (pro-rated)</span>
                    <span className="font-medium">₹5,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gratuity (3 years service — not eligible)</span>
                    <span className="font-medium text-gray-400">₹0</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold text-green-700">
                    <span>Total Earnings</span>
                    <span>₹27,119</span>
                  </div>
                </div>
              </div>

              <hr />

              {/* Deductions */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deductions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PF for partial month</span>
                    <span className="font-medium text-red-600">₹1,731</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PT for partial month</span>
                    <span className="font-medium text-red-600">₹100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TDS on FnF</span>
                    <span className="font-medium text-red-600">₹2,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding Advance</span>
                    <span className="font-medium text-gray-400">₹0</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold text-red-700">
                    <span>Total Deductions</span>
                    <span>₹4,331</span>
                  </div>
                </div>
              </div>

              <hr />

              {/* Net */}
              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                <span className="font-bold text-gray-800 text-lg">NET FnF PAYABLE</span>
                <span className="font-bold text-blue-700 text-2xl">₹22,788</span>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Approve FnF
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" /> Download Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Complete Probation Review ─── */}
      {showProbationModal && selectedProbation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Complete Probation Review</h2>
                <p className="text-sm text-gray-500">{selectedProbation.name} — {selectedProbation.designation}</p>
              </div>
              <button onClick={() => setShowProbationModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Performance Rating during Probation</label>
                <div className="flex gap-2">
                  {['1', '2', '3', '4', '5'].map(r => (
                    <button
                      key={r}
                      onClick={() => setProbRating(r)}
                      className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition-colors ${
                        probRating === r
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 self-center ml-2">{probRating}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <div className="flex gap-2">
                  {(['Confirmed', 'Extended', 'Terminated'] as ProbationOutcome[]).map(o => (
                    <button
                      key={o}
                      onClick={() => setProbOutcome(o)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                        probOutcome === o
                          ? o === 'Confirmed' ? 'bg-green-600 border-green-600 text-white'
                            : o === 'Extended' ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {probOutcome === 'Extended' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extend by (months)</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={probExtendMonths}
                    onChange={e => setProbExtendMonths(e.target.value)}
                  >
                    <option value="1">1 month</option>
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={probRemarks}
                  onChange={e => setProbRemarks(e.target.value)}
                  placeholder="Enter review remarks..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={probEffectiveDate}
                  onChange={e => setProbEffectiveDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowProbationModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
