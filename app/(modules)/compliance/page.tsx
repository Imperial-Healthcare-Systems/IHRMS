'use client'


import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Shield,
  AlertTriangle,
  Clock,
  Users,
  Heart,
  Download,
  ExternalLink,
  CheckCircle2,
  FileText,
  IndianRupee,
  Plus,
  X,
  Search,
  ChevronDown,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ComplianceTab = 'epf' | 'esic' | 'pt' | 'tds'

interface EPFEmployee {
  name: string
  empId: string
  uan: string
  pfWages: number
  empContrib: number
  emplrContrib: number
  eps: number
  status: 'Active' | 'Pending'
}

interface ESICEmployee {
  name: string
  empId: string
  grossSalary: number
  ipNumber: string
  empContrib: number
  emplrContrib: number
  status: 'Active' | 'Pending'
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const EPF_EMPLOYEES: EPFEmployee[] = [
  { name: 'Rahul Verma', empId: 'EMP/2021/001', uan: '101234567890', pfWages: 25000, empContrib: 3000, emplrContrib: 3000, eps: 2082, status: 'Active' },
  { name: 'Priya Mehta', empId: 'EMP/2021/002', uan: '101234567891', pfWages: 30000, empContrib: 3600, emplrContrib: 3600, eps: 2499, status: 'Active' },
  { name: 'Arun Krishnan', empId: 'EMP/2021/003', uan: '101234567892', pfWages: 22000, empContrib: 2640, emplrContrib: 2640, eps: 1832, status: 'Active' },
  { name: 'Sneha Joshi', empId: 'EMP/2021/004', uan: '101234567893', pfWages: 28000, empContrib: 3360, emplrContrib: 3360, eps: 2332, status: 'Active' },
  { name: 'Mohan Das', empId: 'EMP/2021/005', uan: '101234567894', pfWages: 18000, empContrib: 2160, emplrContrib: 2160, eps: 1500, status: 'Active' },
  { name: 'Lakshmi Nair', empId: 'EMP/2021/006', uan: '101234567895', pfWages: 35000, empContrib: 4200, emplrContrib: 4200, eps: 2916, status: 'Active' },
  { name: 'Kartik Reddy', empId: 'EMP/2021/007', uan: '101234567896', pfWages: 20000, empContrib: 2400, emplrContrib: 2400, eps: 1665, status: 'Pending' },
  { name: 'Divya Pillai', empId: 'EMP/2021/008', uan: '101234567897', pfWages: 26000, empContrib: 3120, emplrContrib: 3120, eps: 2165, status: 'Active' },
  { name: 'Suresh Iyer', empId: 'EMP/2021/009', uan: '101234567898', pfWages: 32000, empContrib: 3840, emplrContrib: 3840, eps: 2665, status: 'Active' },
  { name: 'Ananya Gupta', empId: 'EMP/2021/010', uan: '101234567899', pfWages: 24000, empContrib: 2880, emplrContrib: 2880, eps: 1999, status: 'Active' },
]

const ESIC_EMPLOYEES: ESICEmployee[] = [
  { name: 'Rahul Verma', empId: 'EMP/2021/001', grossSalary: 18500, ipNumber: 'IP/KAR/001234', empContrib: 139, emplrContrib: 601, status: 'Active' },
  { name: 'Mohan Das', empId: 'EMP/2021/005', grossSalary: 16000, ipNumber: 'IP/KAR/001235', empContrib: 120, emplrContrib: 520, status: 'Active' },
  { name: 'Kartik Reddy', empId: 'EMP/2021/007', grossSalary: 19000, ipNumber: 'IP/KAR/001236', empContrib: 143, emplrContrib: 618, status: 'Pending' },
  { name: 'Meena Pillai', empId: 'EMP/2022/015', grossSalary: 17500, ipNumber: 'IP/KAR/001237', empContrib: 131, emplrContrib: 569, status: 'Active' },
  { name: 'Ravi Kumar', empId: 'EMP/2022/016', grossSalary: 20500, ipNumber: 'IP/KAR/001238', empContrib: 154, emplrContrib: 666, status: 'Active' },
  { name: 'Sita Devi', empId: 'EMP/2022/017', grossSalary: 15000, ipNumber: 'IP/KAR/001239', empContrib: 113, emplrContrib: 488, status: 'Active' },
  { name: 'Ganesh Bhat', empId: 'EMP/2022/018', grossSalary: 21000, ipNumber: 'IP/KAR/001240', empContrib: 158, emplrContrib: 683, status: 'Active' },
  { name: 'Padma Rao', empId: 'EMP/2022/019', grossSalary: 18000, ipNumber: 'IP/KAR/001241', empContrib: 135, emplrContrib: 585, status: 'Active' },
  { name: 'Venugopal S', empId: 'EMP/2022/020', grossSalary: 19500, ipNumber: 'IP/KAR/001242', empContrib: 146, emplrContrib: 634, status: 'Active' },
  { name: 'Ambika Nair', empId: 'EMP/2022/021', grossSalary: 20000, ipNumber: 'IP/KAR/001243', empContrib: 150, emplrContrib: 650, status: 'Active' },
]

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function CompliancePage() {
  const [tab, setTab] = useState<ComplianceTab>('epf')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form16Search, setForm16Search] = useState('')
  const [form16FY, setForm16FY] = useState('2025-26')

  const TABS: { key: ComplianceTab; label: string }[] = [
    { key: 'epf', label: 'EPF Management' },
    { key: 'esic', label: 'ESIC' },
    { key: 'pt', label: 'Professional Tax' },
    { key: 'tds', label: 'TDS & Form 16' },
  ]

  return (
    <div className="p-6 space-y-6">
      <Topbar
        title="Compliance & Statutory Management"
        subtitle="EPF, ESIC, Professional Tax, TDS and regulatory filings"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Compliance Record
        </button>
      </Topbar>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Compliant', value: '8/10', sub: 'items', color: 'green', Icon: Shield },
          { label: 'Action Required', value: '2', sub: 'items', color: 'red', Icon: AlertTriangle },
          { label: 'Due This Month', value: '4', sub: 'items', color: 'amber', Icon: Clock },
          { label: 'EPF Enrolled', value: '248', sub: 'employees', color: 'blue', Icon: Users },
          { label: 'ESIC Eligible', value: '89', sub: 'employees', color: 'purple', Icon: Heart },
        ].map(({ label, value, sub, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-100 flex-shrink-0`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
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

        {/* ─── TAB 1: EPF ─── */}
        {tab === 'epf' && (
          <div className="p-6 space-y-6">
            {/* ECR Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900">ECR (Electronic Challan cum Return) — March 2026</h3>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Due: Apr 15, 2026</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600 text-xs">Employer PF Account No</p>
                  <p className="font-mono font-semibold text-blue-900">MH/BAN/123456/000</p>
                </div>
                <div>
                  <p className="text-blue-600 text-xs">Total PF Wages</p>
                  <p className="font-semibold text-blue-900">₹48,50,000</p>
                </div>
                <div>
                  <p className="text-blue-600 text-xs">Employee Contribution (12%)</p>
                  <p className="font-semibold text-blue-900">₹5,82,000</p>
                </div>
                <div>
                  <p className="text-blue-600 text-xs">Employer Contribution (12%)</p>
                  <p className="font-semibold text-blue-900">₹5,82,000</p>
                </div>
              </div>
            </div>

            {/* Breakdown summary */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'EPS (8.33%)', value: '₹4,03,935', color: 'purple' },
                { label: 'EDLI (0.5%)', value: '₹24,250', color: 'indigo' },
                { label: 'Admin Charges', value: '₹58,200', color: 'gray' },
                { label: 'Total Challan', value: '₹11,64,000', color: 'blue' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4`}>
                  <p className={`text-xs text-${color}-600`}>{label}</p>
                  <p className={`text-xl font-bold text-${color}-900 mt-1`}>{value}</p>
                </div>
              ))}
            </div>

            {/* EPF Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Employee PF Details (Showing top 10 of 248)</h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Employee', 'EMP ID', 'UAN Number', 'PF Wages', 'Employee Contrib', 'Employer Contrib', 'EPS', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {EPF_EMPLOYEES.map(emp => (
                      <tr key={emp.empId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.empId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{emp.uan}</td>
                        <td className="px-4 py-3 text-gray-700">₹{emp.pfWages.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">₹{emp.empContrib.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">₹{emp.emplrContrib.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">₹{emp.eps.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Download ECR
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <ExternalLink className="w-4 h-4" /> Submit to EPFO Portal
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="w-4 h-4" /> View All 248 Employees
              </button>
              <div className="ml-auto flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <Clock className="w-3.5 h-3.5" />
                Monthly ECR due by 15th of each month. April due: Apr 15, 2026
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ESIC ─── */}
        {tab === 'esic' && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-900">ESIC Contribution Statement — March 2026</h3>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Due: Apr 15, 2026</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-purple-600 text-xs">ESIC Code</p>
                  <p className="font-mono font-semibold text-purple-900">52-00-123456-000</p>
                </div>
                <div>
                  <p className="text-purple-600 text-xs">Total ESIC Wages (≤₹21,000)</p>
                  <p className="font-semibold text-purple-900">₹18,90,000</p>
                </div>
                <div>
                  <p className="text-purple-600 text-xs">Employee Contribution (0.75%)</p>
                  <p className="font-semibold text-purple-900">₹14,175</p>
                </div>
                <div>
                  <p className="text-purple-600 text-xs">Employer Contribution (3.25%)</p>
                  <p className="font-semibold text-purple-900">₹61,425</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-200 flex items-center justify-between">
                <p className="text-sm font-bold text-purple-900">Total ESIC Payable</p>
                <p className="text-xl font-bold text-purple-900">₹75,600</p>
              </div>
            </div>

            {/* Eligibility note */}
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Employees earning ≤ ₹21,000/month gross are covered under ESIC. Currently 89 of 248 employees are ESIC-eligible.
            </div>

            {/* ESIC Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Employee', 'Gross Salary', 'IP Number', 'Employee Contrib (0.75%)', 'Employer Contrib (3.25%)', 'Total', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ESIC_EMPLOYEES.map(emp => (
                    <tr key={emp.empId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs font-mono text-gray-400">{emp.empId}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">₹{emp.grossSalary.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{emp.ipNumber}</td>
                      <td className="px-4 py-3 text-gray-700">₹{emp.empContrib}</td>
                      <td className="px-4 py-3 text-gray-700">₹{emp.emplrContrib}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{emp.empContrib + emp.emplrContrib}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Download Form 5
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <ExternalLink className="w-4 h-4" /> Submit to ESIC Portal
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 3: Professional Tax ─── */}
        {tab === 'pt' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">State-wise PT Breakdown — March 2026</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['State', 'No. of Employees', 'Monthly Rate', 'Total PT Collected'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { state: 'Karnataka', employees: 180, rate: '₹200/month', total: 36000 },
                      { state: 'Maharashtra', employees: 45, rate: '₹200/month', total: 9000 },
                      { state: 'Tamil Nadu', employees: 15, rate: '₹150/month', total: 2250 },
                      { state: 'Others', employees: 8, rate: '₹100/month', total: 800 },
                    ].map(row => (
                      <tr key={row.state} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{row.state}</td>
                        <td className="px-5 py-3 text-gray-600">{row.employees}</td>
                        <td className="px-5 py-3 text-gray-600">{row.rate}</td>
                        <td className="px-5 py-3 font-semibold text-gray-900">₹{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-bold">
                      <td className="px-5 py-3 text-blue-900">Total</td>
                      <td className="px-5 py-3 text-blue-900">248</td>
                      <td className="px-5 py-3 text-blue-900">—</td>
                      <td className="px-5 py-3 text-blue-900">₹48,050</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PT Slabs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">PT Slabs — Karnataka</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Monthly Salary Range', 'PT per Month'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { range: 'Up to ₹15,000', pt: 'Nil', color: 'text-green-600' },
                      { range: '₹15,001 – ₹17,999', pt: '₹150/month', color: 'text-amber-600' },
                      { range: '₹18,000 and above', pt: '₹200/month', color: 'text-red-600' },
                    ].map(row => (
                      <tr key={row.range} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-700">{row.range}</td>
                        <td className={`px-5 py-3 font-semibold ${row.color}`}>{row.pt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Download PT Challan (All States)
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="w-4 h-4" /> Generate State-wise Report
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 4: TDS & Form 16 ─── */}
        {tab === 'tds' && (
          <div className="p-6 space-y-6">
            {/* TDS Header */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-indigo-900">TDS Summary — FY 2025-26</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-indigo-600">TAN: <span className="font-mono font-semibold">BLRX12345B</span></span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-indigo-600 text-xs">Total TDS Deducted (FY)</p>
                  <p className="text-2xl font-bold text-indigo-900">₹18,45,000</p>
                </div>
                <div>
                  <p className="text-indigo-600 text-xs">Old Regime Employees</p>
                  <p className="text-2xl font-bold text-indigo-900">168</p>
                </div>
                <div>
                  <p className="text-indigo-600 text-xs">New Regime Employees</p>
                  <p className="text-2xl font-bold text-indigo-900">80</p>
                </div>
              </div>
            </div>

            {/* Quarterly Table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Quarterly TDS Summary</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Quarter', 'Period', 'TDS Deducted', 'Form 24Q Status', 'Due Date', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { q: 'Q1', period: 'Apr–Jun 2025', tds: '₹4,20,000', status: 'Filed', statusColor: 'bg-green-100 text-green-700', due: 'Jul 31, 2025' },
                      { q: 'Q2', period: 'Jul–Sep 2025', tds: '₹4,35,000', status: 'Filed', statusColor: 'bg-green-100 text-green-700', due: 'Oct 31, 2025' },
                      { q: 'Q3', period: 'Oct–Dec 2025', tds: '₹4,55,000', status: 'Filed', statusColor: 'bg-green-100 text-green-700', due: 'Jan 31, 2026' },
                      { q: 'Q4', period: 'Jan–Mar 2026', tds: '₹5,35,000', status: 'Pending', statusColor: 'bg-amber-100 text-amber-700', due: 'May 31, 2026' },
                    ].map(row => (
                      <tr key={row.q} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{row.q}</td>
                        <td className="px-4 py-3 text-gray-600">{row.period}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{row.tds}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.status === 'Filed' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500" />
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.statusColor}`}>
                              Form 24Q {row.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.due}</td>
                        <td className="px-4 py-3">
                          {row.status === 'Filed' ? (
                            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" /> Download
                            </button>
                          ) : (
                            <button className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                              File Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold text-gray-800">Total FY 2025-26</td>
                      <td className="px-4 py-3 font-bold text-gray-900">₹18,45,000</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Form 16 Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Form 16 Generation</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Issue Form 16 to employees for income tax filing</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Financial Year:</label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form16FY}
                    onChange={e => setForm16FY(e.target.value)}
                  >
                    <option>2025-26</option>
                    <option>2024-25</option>
                    <option>2023-24</option>
                  </select>
                </div>
              </div>

              {/* Status banner */}
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Form 16 not yet generated for FY {form16FY}</p>
                  <p className="text-xs text-amber-600">Deadline: June 15, 2026 — 75 days remaining</p>
                </div>
              </div>

              {/* Generate all */}
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                <FileText className="w-5 h-5" />
                Generate Form 16 for All Employees (248) — FY {form16FY}
              </button>

              {/* Individual search */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Generate for Individual Employee</h4>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search employee by name or ID..."
                      value={form16Search}
                      onChange={e => setForm16Search(e.target.value)}
                    />
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Generate
                  </button>
                </div>
              </div>

              {/* Tax regime breakdown */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Old Tax Regime', count: 168, pct: 67.7, color: 'blue' },
                  { label: 'New Tax Regime', count: 80, pct: 32.3, color: 'purple' },
                ].map(({ label, count, pct, color }) => (
                  <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 flex items-center justify-between`}>
                    <div>
                      <p className={`text-xs text-${color}-600`}>{label}</p>
                      <p className={`text-2xl font-bold text-${color}-900`}>{count} <span className="text-sm font-normal">employees</span></p>
                    </div>
                    <div className={`text-xl font-bold text-${color}-400`}>{pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: Add Compliance Record ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Compliance Record</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>EPF Return</option>
                  <option>ESIC Contribution</option>
                  <option>Professional Tax</option>
                  <option>TDS / Form 24Q</option>
                  <option>Form 16</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <input type="month" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex gap-2">
                  {['Pending', 'Filed', 'Paid'].map(s => (
                    <button key={s} className="flex-1 py-2 border-2 border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:border-blue-400 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
