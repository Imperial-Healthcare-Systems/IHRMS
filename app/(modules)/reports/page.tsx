'use client'


import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Users,
  Clock,
  IndianRupee,
  CalendarDays,
  BarChart3,
  Shield,
  Download,
  FileText,
  Bell,
  Play,
  Settings,
  X,
  Check,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Edit,
  Trash2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type OutputFormat = 'Excel' | 'PDF' | 'CSV'
type ReportType = 'Employee' | 'Attendance' | 'Payroll' | 'Leave' | 'Performance' | 'Compliance'

interface QuickReport {
  icon: React.ReactNode
  name: string
  description: string
  color: string
}

interface ScheduledReport {
  id: number
  name: string
  frequency: string
  nextRun: string
  recipients: string
  format: string
  status: 'Active' | 'Paused'
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const QUICK_REPORTS: QuickReport[] = [
  { icon: <Users className="w-6 h-6" />, name: 'Employee Master Report', description: 'Complete employee directory with all details', color: 'blue' },
  { icon: <Clock className="w-6 h-6" />, name: 'Monthly Attendance Report', description: 'Attendance summary for all employees', color: 'green' },
  { icon: <IndianRupee className="w-6 h-6" />, name: 'Payroll Summary Report', description: 'Salary, deductions, net pay by department', color: 'purple' },
  { icon: <CalendarDays className="w-6 h-6" />, name: 'Leave Balance Report', description: 'Leave balances for all employees', color: 'amber' },
  { icon: <BarChart3 className="w-6 h-6" />, name: 'Headcount Report', description: 'Department/designation/location breakdowns', color: 'indigo' },
  { icon: <Shield className="w-6 h-6" />, name: 'Statutory Compliance Report', description: 'EPF, ESIC, PT, TDS summaries', color: 'red' },
]

const HEADCOUNT_DATA = [
  { month: 'Oct', value: 225 },
  { month: 'Nov', value: 230 },
  { month: 'Dec', value: 235 },
  { month: 'Jan', value: 240 },
  { month: 'Feb', value: 244 },
  { month: 'Mar', value: 248 },
]

const PAYROLL_DATA = [
  { month: 'Oct', value: 38, label: '₹38L' },
  { month: 'Nov', value: 39, label: '₹39L' },
  { month: 'Dec', value: 45, label: '₹45L' },
  { month: 'Jan', value: 40, label: '₹40L' },
  { month: 'Feb', value: 41, label: '₹41L' },
  { month: 'Mar', value: 42.5, label: '₹42.5L' },
]

const DEPARTMENT_DATA = [
  { dept: 'Engineering', count: 72, pct: 29 },
  { dept: 'Sales', count: 48, pct: 19.4 },
  { dept: 'Operations', count: 40, pct: 16.1 },
  { dept: 'Customer Support', count: 35, pct: 14.1 },
  { dept: 'Finance', count: 28, pct: 11.3 },
  { dept: 'HR', count: 15, pct: 6 },
  { dept: 'Marketing', count: 10, pct: 4 },
]

const COMPLIANCE_DEADLINES = [
  { status: 'red', label: 'EPF Monthly Return (Form 12A)', due: 'Apr 15, 2026', days: 14, action: 'Download' },
  { status: 'red', label: 'ESIC Monthly Contribution', due: 'Apr 15, 2026', days: 14, action: 'Download' },
  { status: 'amber', label: 'Professional Tax Challan (Karnataka)', due: 'Apr 30, 2026', days: 29, action: 'Download' },
  { status: 'amber', label: 'TDS Return Q4 (Form 24Q)', due: 'May 31, 2026', days: 60, action: 'Prepare' },
  { status: 'green', label: 'Form 16 Issue to Employees', due: 'Jun 15, 2026', days: 75, action: 'Generate' },
  { status: 'green', label: 'EPF Annual Return', due: 'Apr 30, 2026', days: 29, action: 'Download' },
]

const SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 1, name: 'Monthly Attendance Report', frequency: 'Monthly (1st)', nextRun: 'May 1, 2026', recipients: 'hr@company.com, ceo@company.com', format: 'Excel', status: 'Active' },
  { id: 2, name: 'Payroll Summary', frequency: 'Monthly (Last Day)', nextRun: 'Apr 30, 2026', recipients: 'finance@company.com', format: 'PDF', status: 'Active' },
  { id: 3, name: 'Headcount Report', frequency: 'Weekly (Monday)', nextRun: 'Apr 6, 2026', recipients: 'management@company.com', format: 'Excel', status: 'Paused' },
]

const DEPT_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-indigo-500', 'bg-red-500', 'bg-pink-500']

const ALL_DEPARTMENTS = ['All', 'Engineering', 'HR', 'Sales', 'Finance', 'Operations', 'Marketing', 'Customer Support']

const REPORT_FIELDS: { id: string; label: string }[] = [
  { id: 'empId', label: 'Employee ID' },
  { id: 'name', label: 'Name' },
  { id: 'department', label: 'Department' },
  { id: 'designation', label: 'Designation' },
  { id: 'joinDate', label: 'Join Date' },
  { id: 'salary', label: 'Salary' },
  { id: 'manager', label: 'Manager' },
  { id: 'location', label: 'Location' },
  { id: 'pf', label: 'PF Number' },
  { id: 'esic', label: 'ESIC Number' },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function deadlineBadge(status: string) {
  if (status === 'red') return { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' }
  if (status === 'amber') return { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' }
  return { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' }
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  red: 'bg-red-100 text-red-600',
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('Employee')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['All'])
  const [selectedFields, setSelectedFields] = useState<string[]>(['empId', 'name', 'department', 'designation'])
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('Excel')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string>('')

  const headcountMax = Math.max(...HEADCOUNT_DATA.map(d => d.value))
  const payrollMax = Math.max(...PAYROLL_DATA.map(d => d.value))

  const toggleDept = (dept: string) => {
    if (dept === 'All') {
      setSelectedDepts(['All'])
    } else {
      setSelectedDepts(prev => {
        const without = prev.filter(d => d !== 'All')
        if (without.includes(dept)) {
          const next = without.filter(d => d !== dept)
          return next.length === 0 ? ['All'] : next
        }
        return [...without, dept]
      })
    }
  }

  const toggleField = (id: string) => {
    setSelectedFields(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const openGenerate = (name: string) => {
    setSelectedReport(name)
    setShowGenerateModal(true)
  }

  return (
    <div className="p-6 space-y-8">
      <Topbar
        title="Reports & Analytics"
        subtitle="Generate, schedule, and analyse HR reports"
      >
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Bell className="w-4 h-4" />
          Schedule Report
        </button>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Generate Report
        </button>
      </Topbar>

      {/* ─── Section 1: Quick Reports ─── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Reports</h2>
        <div className="grid grid-cols-3 gap-4">
          {QUICK_REPORTS.map(report => (
            <div key={report.name} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[report.color]}`}>
                  {report.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{report.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => openGenerate(report.name)}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Generate
                    </button>
                    <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Section 2: Analytics Dashboard ─── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Analytics Dashboard</h2>
        <div className="grid grid-cols-3 gap-4">

          {/* Chart 1: Headcount Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Headcount Trend</h3>
            <p className="text-xs text-gray-500 mb-4">Last 6 months</p>
            <div className="flex items-end gap-2 h-40">
              {HEADCOUNT_DATA.map(d => {
                const pct = (d.value / headcountMax) * 100
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-600 font-medium">{d.value}</span>
                    <div className="w-full flex items-end" style={{ height: 100 }}>
                      <div
                        className="w-full bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{d.month}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chart 2: Payroll Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Monthly Payroll Trend</h3>
            <p className="text-xs text-gray-500 mb-4">Last 6 months</p>
            <div className="flex items-end gap-2 h-40">
              {PAYROLL_DATA.map(d => {
                const pct = (d.value / payrollMax) * 100
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-600 font-medium">{d.label}</span>
                    <div className="w-full flex items-end" style={{ height: 100 }}>
                      <div
                        className={`w-full rounded-t-md hover:opacity-80 transition-opacity ${d.month === 'Dec' ? 'bg-purple-500' : 'bg-green-500'}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{d.month}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Dec includes annual bonus payout</p>
          </div>

          {/* Chart 3: Department Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Department Distribution</h3>
            <p className="text-xs text-gray-500 mb-4">Total: 248 employees</p>
            <div className="space-y-2">
              {DEPARTMENT_DATA.map((d, i) => (
                <div key={d.dept} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-28 truncate flex-shrink-0">{d.dept}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                    <div
                      className={`h-4 rounded-full ${DEPT_COLORS[i]}`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{d.count} ({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 3: Compliance Deadlines ─── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Compliance Deadlines</h2>
        <div className="space-y-2">
          {COMPLIANCE_DEADLINES.map((item, i) => {
            const style = deadlineBadge(item.status)
            return (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${style.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
                  <div>
                    <p className={`text-sm font-medium ${style.text}`}>{item.label}</p>
                    <p className="text-xs text-gray-500">Due: {item.due}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${style.badge}`}>
                    {item.days} days away
                  </span>
                  <button className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    {item.action}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── Section 4: Custom Report Builder ─── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Custom Report Builder</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={reportType}
                onChange={e => setReportType(e.target.value as ReportType)}
              >
                {(['Employee', 'Attendance', 'Payroll', 'Leave', 'Performance', 'Compliance'] as ReportType[]).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department Filter</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => toggleDept(dept)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedDepts.includes(dept)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fields to Include</label>
            <div className="grid grid-cols-5 gap-2">
              {REPORT_FIELDS.map(field => (
                <label key={field.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
            <div className="flex gap-2">
              {(['Excel', 'PDF', 'CSV'] as OutputFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    outputFormat === fmt
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Play className="w-4 h-4" /> Generate Custom Report
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4" /> Save as Template
            </button>
          </div>
        </div>
      </section>

      {/* ─── Section 5: Scheduled Reports ─── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Scheduled Reports</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Report Name', 'Frequency', 'Next Run', 'Recipients', 'Format', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SCHEDULED_REPORTS.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.frequency}</td>
                  <td className="px-4 py-3 text-gray-600">{r.nextRun}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.recipients}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{r.format}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-500 hover:text-blue-700" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button className="text-red-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium"><Play className="w-3 h-3" />Run Now</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── MODAL: Generate Report ─── */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Generate Report</h2>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedReport && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 font-medium">
                  {selectedReport}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <div className="flex gap-2">
                  {(['Excel', 'PDF', 'CSV'] as OutputFormat[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setOutputFormat(f)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${outputFormat === f ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Schedule Report ─── */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Schedule Report</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Employee Master Report</option>
                  <option>Monthly Attendance Report</option>
                  <option>Payroll Summary Report</option>
                  <option>Leave Balance Report</option>
                  <option>Headcount Report</option>
                  <option>Statutory Compliance Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Daily</option>
                  <option>Weekly (Monday)</option>
                  <option>Monthly (1st)</option>
                  <option>Monthly (Last Day)</option>
                  <option>Quarterly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (email, comma-separated)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="hr@company.com, ceo@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <div className="flex gap-2">
                  {(['Excel', 'PDF', 'CSV'] as OutputFormat[]).map(f => (
                    <button key={f} className="flex-1 py-2 rounded-lg text-sm font-medium border-2 border-gray-300 text-gray-600 hover:border-blue-400 transition-colors">{f}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Bell className="w-4 h-4" /> Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
