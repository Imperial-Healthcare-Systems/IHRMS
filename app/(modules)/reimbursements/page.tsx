'use client'


import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Clock,
  CheckCircle,
  XCircle,
  IndianRupee,
  X,
  Eye,
  Edit,
  Trash2,
  Check,
  AlertTriangle,
  Upload,
  Info,
  ChevronDown,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ReimbTab = 'myClaims' | 'teamClaims' | 'pendingApprovals'
type ClaimStatus = 'Approved' | 'Pending' | 'Rejected'

interface Claim {
  id: string
  month: string
  category: string
  description: string
  amount: number
  receipt: boolean
  status: ClaimStatus
  submittedOn: string
  rejectionReason?: string
}

interface TeamClaim {
  id: string
  employee: string
  dept: string
  month: string
  category: string
  description: string
  amount: number
  status: ClaimStatus
  submittedOn: string
}

interface PendingApproval {
  id: string
  employee: string
  dept: string
  claimNo: string
  category: string
  description: string
  amount: number
  receipt: boolean
  submittedOn: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA — My Claims
───────────────────────────────────────────────────────────── */
const INITIAL_MY_CLAIMS: Claim[] = [
  {
    id: 'CLM/2026/001',
    month: 'March 2026',
    category: 'Travel',
    description: 'Mumbai to Pune cab for client meeting',
    amount: 1850,
    receipt: true,
    status: 'Approved',
    submittedOn: 'Mar 28, 2026',
  },
  {
    id: 'CLM/2026/002',
    month: 'March 2026',
    category: 'Food',
    description: 'Team lunch - client entertaining',
    amount: 3200,
    receipt: true,
    status: 'Approved',
    submittedOn: 'Mar 28, 2026',
  },
  {
    id: 'CLM/2026/003',
    month: 'March 2026',
    category: 'Accommodation',
    description: 'Hotel stay - Hyderabad conference',
    amount: 5400,
    receipt: true,
    status: 'Pending',
    submittedOn: 'Mar 29, 2026',
  },
  {
    id: 'CLM/2026/004',
    month: 'March 2026',
    category: 'Communication',
    description: 'Mobile recharge for work',
    amount: 299,
    receipt: false,
    status: 'Pending',
    submittedOn: 'Mar 30, 2026',
  },
  {
    id: 'CLM/2026/005',
    month: 'Feb 2026',
    category: 'Travel',
    description: 'Ola/Uber office visits - 15 trips',
    amount: 4700,
    receipt: true,
    status: 'Approved',
    submittedOn: 'Feb 25, 2026',
  },
  {
    id: 'CLM/2026/006',
    month: 'Feb 2026',
    category: 'Equipment',
    description: 'Laptop bag',
    amount: 2500,
    receipt: true,
    status: 'Rejected',
    submittedOn: 'Feb 20, 2026',
    rejectionReason: 'Exceeds policy limit of ₹2,000 for equipment purchases',
  },
  {
    id: 'CLM/2026/007',
    month: 'Feb 2026',
    category: 'Training',
    description: 'Online course - AWS certification',
    amount: 3999,
    receipt: true,
    status: 'Approved',
    submittedOn: 'Feb 18, 2026',
  },
  {
    id: 'CLM/2026/008',
    month: 'Jan 2026',
    category: 'Medical',
    description: 'Medical consultation reimbursement',
    amount: 800,
    receipt: true,
    status: 'Approved',
    submittedOn: 'Jan 28, 2026',
  },
  {
    id: 'CLM/2026/009',
    month: 'Jan 2026',
    category: 'Food',
    description: 'Working overtime meals',
    amount: 1200,
    receipt: true,
    status: 'Approved',
    submittedOn: 'Jan 26, 2026',
  },
  {
    id: 'CLM/2026/010',
    month: 'Jan 2026',
    category: 'Communication',
    description: 'Internet allowance',
    amount: 599,
    receipt: true,
    status: 'Pending',
    submittedOn: 'Jan 27, 2026',
  },
]

/* ─────────────────────────────────────────────────────────────
   MOCK DATA — Team Claims
───────────────────────────────────────────────────────────── */
const TEAM_CLAIMS: TeamClaim[] = [
  { id: 'T001', employee: 'Rohit Verma', dept: 'Engineering', month: 'March 2026', category: 'Travel', description: 'Client site visits - Bengaluru', amount: 3200, status: 'Approved', submittedOn: 'Mar 27, 2026' },
  { id: 'T002', employee: 'Ananya Singh', dept: 'HR', month: 'March 2026', category: 'Training', description: 'HR Summit registration fee', amount: 5500, status: 'Pending', submittedOn: 'Mar 28, 2026' },
  { id: 'T003', employee: 'Vikas Sharma', dept: 'Sales', month: 'March 2026', category: 'Food', description: 'Client entertaining - dinner', amount: 4800, status: 'Approved', submittedOn: 'Mar 25, 2026' },
  { id: 'T004', employee: 'Meera Nair', dept: 'Engineering', month: 'March 2026', category: 'Communication', description: 'Broadband for WFH', amount: 799, status: 'Pending', submittedOn: 'Mar 29, 2026' },
  { id: 'T005', employee: 'Sanjay Gupta', dept: 'Engineering', month: 'March 2026', category: 'Accommodation', description: 'Pune offsite stay', amount: 6200, status: 'Approved', submittedOn: 'Mar 20, 2026' },
  { id: 'T006', employee: 'Divya Krishnan', dept: 'Finance', month: 'Feb 2026', category: 'Travel', description: 'Mumbai - Delhi flight for audit', amount: 8900, status: 'Approved', submittedOn: 'Feb 22, 2026' },
  { id: 'T007', employee: 'Karan Joshi', dept: 'Operations', month: 'Feb 2026', category: 'Equipment', description: 'Ergonomic keyboard', amount: 1800, status: 'Approved', submittedOn: 'Feb 18, 2026' },
  { id: 'T008', employee: 'Pooja Rao', dept: 'HR', month: 'Feb 2026', category: 'Training', description: 'Online SHRM certification', amount: 7500, status: 'Rejected', submittedOn: 'Feb 15, 2026' },
  { id: 'T009', employee: 'Rahul Tiwari', dept: 'Sales', month: 'Feb 2026', category: 'Food', description: 'Team outing expenses', amount: 3400, status: 'Approved', submittedOn: 'Feb 24, 2026' },
  { id: 'T010', employee: 'Kavya Menon', dept: 'Engineering', month: 'Feb 2026', category: 'Communication', description: 'Mobile bill reimbursement', amount: 499, status: 'Approved', submittedOn: 'Feb 26, 2026' },
  { id: 'T011', employee: 'Aditya Kumar', dept: 'Finance', month: 'Jan 2026', category: 'Travel', description: 'Cab - office field visits', amount: 2100, status: 'Approved', submittedOn: 'Jan 27, 2026' },
  { id: 'T012', employee: 'Rohit Verma', dept: 'Engineering', month: 'Jan 2026', category: 'Medical', description: 'Eye test reimbursement', amount: 600, status: 'Approved', submittedOn: 'Jan 25, 2026' },
  { id: 'T013', employee: 'Vikas Sharma', dept: 'Sales', month: 'Jan 2026', category: 'Travel', description: 'Delhi - Jaipur client trip', amount: 4500, status: 'Pending', submittedOn: 'Jan 28, 2026' },
  { id: 'T014', employee: 'Sanjay Gupta', dept: 'Engineering', month: 'Jan 2026', category: 'Training', description: 'Kubernetes certification', amount: 4200, status: 'Approved', submittedOn: 'Jan 20, 2026' },
  { id: 'T015', employee: 'Meera Nair', dept: 'Engineering', month: 'Jan 2026', category: 'Equipment', description: 'USB hub for WFH', amount: 1200, status: 'Approved', submittedOn: 'Jan 22, 2026' },
]

/* ─────────────────────────────────────────────────────────────
   MOCK DATA — Pending Approvals
───────────────────────────────────────────────────────────── */
const INITIAL_APPROVALS: PendingApproval[] = [
  {
    id: 'PA001',
    employee: 'Ananya Singh',
    dept: 'HR',
    claimNo: 'CLM/2026/042',
    category: 'Training',
    description: 'HR Summit registration fee',
    amount: 5500,
    receipt: true,
    submittedOn: 'Mar 28, 2026',
    status: 'Pending',
  },
  {
    id: 'PA002',
    employee: 'Meera Nair',
    dept: 'Engineering',
    claimNo: 'CLM/2026/043',
    category: 'Communication',
    description: 'Broadband for WFH - March',
    amount: 799,
    receipt: true,
    submittedOn: 'Mar 29, 2026',
    status: 'Pending',
  },
  {
    id: 'PA003',
    employee: 'Vikas Sharma',
    dept: 'Sales',
    claimNo: 'CLM/2026/044',
    category: 'Travel',
    description: 'Delhi - Jaipur client trip',
    amount: 4500,
    receipt: false,
    submittedOn: 'Mar 30, 2026',
    status: 'Pending',
  },
  {
    id: 'PA004',
    employee: 'Karan Joshi',
    dept: 'Operations',
    claimNo: 'CLM/2026/045',
    category: 'Equipment',
    description: 'Noise-cancelling headset for calls',
    amount: 3200,
    receipt: true,
    submittedOn: 'Mar 31, 2026',
    status: 'Pending',
  },
]

/* ─────────────────────────────────────────────────────────────
   BADGE HELPERS
───────────────────────────────────────────────────────────── */
function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Travel: { bg: '#DBEAFE', color: '#1D4ED8' },
    Food: { bg: '#DCFCE7', color: '#15803D' },
    Accommodation: { bg: '#EDE9FE', color: '#6D28D9' },
    Communication: { bg: '#CFFAFE', color: '#0E7490' },
    Equipment: { bg: '#FFEDD5', color: '#C2410C' },
    Training: { bg: '#E0E7FF', color: '#3730A3' },
    Medical: { bg: '#FEE2E2', color: '#B91C1C' },
    Other: { bg: '#F1F5F9', color: '#475569' },
  }
  const s = map[category] ?? map['Other']
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {category}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Approved: { bg: '#DCFCE7', color: '#16A34A' },
    Pending: { bg: '#FEF9C3', color: '#B45309' },
    Rejected: { bg: '#FEE2E2', color: '#DC2626' },
  }
  const s = map[status] ?? { bg: '#F1F5F9', color: '#64748B' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #E8622A 0%, #F59E0B 100%)' }}
      title={name}
    >
      {initials}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   MODAL WRAPPER
───────────────────────────────────────────────────────────── */
function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: wide ? '640px' : '480px', maxWidth: '95vw', maxHeight: '90vh' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #E2E8F0' }}
        >
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function ReimbursementsPage() {
  const [activeTab, setActiveTab] = useState<ReimbTab>('myClaims')
  const [myClaims, setMyClaims] = useState<Claim[]>(INITIAL_MY_CLAIMS)
  const [approvals, setApprovals] = useState<PendingApproval[]>(INITIAL_APPROVALS)

  /* ── Submit Claim Modal ── */
  const [submitModal, setSubmitModal] = useState(false)
  const [newClaim, setNewClaim] = useState({
    month: '',
    category: '',
    description: '',
    amount: '',
    note: '',
  })
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)

  /* ── View Claim Modal ── */
  const [viewModal, setViewModal] = useState<{ open: boolean; claim: Claim | null }>({
    open: false,
    claim: null,
  })

  /* ── Reject Approval Modal ── */
  const [rejectApprovalModal, setRejectApprovalModal] = useState<{
    open: boolean
    approvalId: string | null
  }>({ open: false, approvalId: null })
  const [rejectReason, setRejectReason] = useState('')

  /* ── Team filter ── */
  const [teamMonthFilter, setTeamMonthFilter] = useState('All')
  const [teamStatusFilter, setTeamStatusFilter] = useState('All')

  /* ── Handlers ── */
  function handleSubmitClaim() {
    const id = `CLM/2026/0${myClaims.length + 11}`
    setMyClaims((prev) => [
      {
        id,
        month: newClaim.month || 'April 2026',
        category: newClaim.category || 'Other',
        description: newClaim.description,
        amount: Number(newClaim.amount) || 0,
        receipt: !!uploadedFile,
        status: 'Pending',
        submittedOn: 'Apr 1, 2026',
      },
      ...prev,
    ])
    setNewClaim({ month: '', category: '', description: '', amount: '', note: '' })
    setUploadedFile(null)
    setSubmitModal(false)
  }

  function handleDeleteClaim(id: string) {
    setMyClaims((prev) => prev.filter((c) => c.id !== id))
  }

  function handleApprove(approvalId: string) {
    setApprovals((prev) =>
      prev.map((a) => (a.id === approvalId ? { ...a, status: 'Approved' } : a))
    )
  }

  function handleRejectApproval() {
    if (!rejectApprovalModal.approvalId) return
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === rejectApprovalModal.approvalId ? { ...a, status: 'Rejected' } : a
      )
    )
    setRejectApprovalModal({ open: false, approvalId: null })
    setRejectReason('')
  }

  /* ── Computed ── */
  const filteredTeamClaims = TEAM_CLAIMS.filter((tc) => {
    const monthMatch = teamMonthFilter === 'All' || tc.month === teamMonthFilter
    const statusMatch = teamStatusFilter === 'All' || tc.status === teamStatusFilter
    return monthMatch && statusMatch
  })

  const pendingCount = approvals.filter((a) => a.status === 'Pending').length

  const tabs: { key: ReimbTab; label: string; badge?: number }[] = [
    { key: 'myClaims', label: 'My Claims' },
    { key: 'teamClaims', label: 'Team Claims (Manager)' },
    { key: 'pendingApprovals', label: 'Pending Approvals', badge: pendingCount },
  ]

  const teamMonths = ['All', ...Array.from(new Set(TEAM_CLAIMS.map((t) => t.month)))]

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Topbar */}
      <Topbar
        title="Reimbursements & Expenses"
        actions={
          <button
            onClick={() => setSubmitModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: '#E8622A' }}
          >
            <IndianRupee size={14} />
            Submit Claim
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reimbursements & Expense Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track, submit, and manage expense reimbursement claims</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'My Pending Claims',
              value: '₹12,450',
              icon: Clock,
              bg: '#FFFBEB',
              iconColor: '#D97706',
              border: '#FDE68A',
              sub: '3 claims awaiting approval',
            },
            {
              label: 'Approved This Month',
              value: '₹28,300',
              icon: CheckCircle,
              bg: '#F0FDF4',
              iconColor: '#16A34A',
              border: '#BBF7D0',
              sub: '7 claims approved',
            },
            {
              label: 'Rejected Claims',
              value: '₹3,200',
              icon: XCircle,
              bg: '#FEF2F2',
              iconColor: '#DC2626',
              border: '#FECACA',
              sub: '1 claim rejected',
            },
            {
              label: 'Included in Payroll',
              value: '₹24,750',
              icon: IndianRupee,
              bg: '#EFF6FF',
              iconColor: '#2563EB',
              border: '#BFDBFE',
              sub: 'Disbursed Mar 31, 2026',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-5 flex items-center gap-4"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}
              >
                <card.icon size={22} style={{ color: card.iconColor }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="flex border-b" style={{ borderColor: '#E2E8F0' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.key ? '#E8622A' : '#64748B',
                  borderBottom: activeTab === tab.key ? '2px solid #E8622A' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: '#E8622A' }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── TAB 1: MY CLAIMS ── */}
            {activeTab === 'myClaims' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing <strong>{myClaims.length}</strong> claims
                  </p>
                  <button
                    onClick={() => setSubmitModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: '#E8622A' }}
                  >
                    <IndianRupee size={14} />
                    Submit New Claim
                  </button>
                </div>

                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-lg"
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
                >
                  <Info size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#2563EB' }} />
                  <p className="text-xs text-blue-700">
                    Claims submitted by <strong>25th of the month</strong> will be included in the current month payroll automatically.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        {['Claim No', 'Month', 'Category', 'Description', 'Amount', 'Receipt', 'Status', 'Submitted On', 'Actions'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {myClaims.map((claim, i) => (
                        <tr
                          key={claim.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={{ borderBottom: i < myClaims.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                        >
                          <td className="py-3 px-3">
                            <p className="font-mono text-xs font-semibold text-gray-700">{claim.id}</p>
                          </td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{claim.month}</td>
                          <td className="py-3 px-3">
                            <CategoryBadge category={claim.category} />
                          </td>
                          <td className="py-3 px-3 text-gray-700 max-w-[200px]">
                            <p className="truncate">{claim.description}</p>
                            {claim.status === 'Rejected' && claim.rejectionReason && (
                              <p className="text-xs text-red-500 mt-0.5 truncate" title={claim.rejectionReason}>
                                Reason: {claim.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                            ₹{claim.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {claim.receipt ? (
                              <span className="text-green-600 font-semibold text-xs">Yes</span>
                            ) : (
                              <span className="text-red-500 font-semibold text-xs">No</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={claim.status} />
                          </td>
                          <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{claim.submittedOn}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setViewModal({ open: true, claim })}
                                className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                title="View"
                              >
                                <Eye size={13} />
                              </button>
                              {claim.status === 'Pending' && (
                                <>
                                  <button
                                    className="p-1.5 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClaim(claim.id)}
                                    className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
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

            {/* ── TAB 2: TEAM CLAIMS ── */}
            {activeTab === 'teamClaims' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <select
                      value={teamMonthFilter}
                      onChange={(e) => setTeamMonthFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm text-gray-700 focus:outline-none cursor-pointer"
                      style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
                    >
                      {teamMonths.map((m) => (
                        <option key={m} value={m}>
                          {m === 'All' ? 'All Months' : m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={teamStatusFilter}
                      onChange={(e) => setTeamStatusFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm text-gray-700 focus:outline-none cursor-pointer"
                      style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
                    >
                      {['All', 'Approved', 'Pending', 'Rejected'].map((s) => (
                        <option key={s} value={s}>
                          {s === 'All' ? 'All Statuses' : s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-sm text-gray-500 ml-auto">
                    {filteredTeamClaims.length} of {TEAM_CLAIMS.length} records
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        {['Employee', 'Month', 'Category', 'Description', 'Amount', 'Status', 'Submitted On'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeamClaims.map((tc, i) => (
                        <tr
                          key={tc.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={{
                            borderBottom: i < filteredTeamClaims.length - 1 ? '1px solid #F1F5F9' : 'none',
                          }}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <AvatarInitials name={tc.employee} />
                              <div>
                                <p className="font-semibold text-gray-900">{tc.employee}</p>
                                <p className="text-xs text-gray-400">{tc.dept}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{tc.month}</td>
                          <td className="py-3 px-3">
                            <CategoryBadge category={tc.category} />
                          </td>
                          <td className="py-3 px-3 text-gray-700 max-w-[200px]">
                            <p className="truncate">{tc.description}</p>
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                            ₹{tc.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={tc.status} />
                          </td>
                          <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{tc.submittedOn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTeamClaims.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No claims found for the selected filters
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: PENDING APPROVALS ── */}
            {activeTab === 'pendingApprovals' && (
              <div className="space-y-4">
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-lg"
                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
                >
                  <Info size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#16A34A' }} />
                  <p className="text-xs text-green-700">
                    <strong>Note:</strong> Approved claims will be automatically included in the current month payroll during the next payroll run.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        {['Employee', 'Claim No', 'Category', 'Description', 'Amount', 'Receipt', 'Submitted On', 'Actions'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map((ap, i) => (
                        <tr
                          key={ap.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={{
                            borderBottom: i < approvals.length - 1 ? '1px solid #F1F5F9' : 'none',
                            opacity: ap.status !== 'Pending' ? 0.6 : 1,
                          }}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <AvatarInitials name={ap.employee} />
                              <div>
                                <p className="font-semibold text-gray-900">{ap.employee}</p>
                                <p className="text-xs text-gray-400">{ap.dept}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-mono text-xs font-semibold text-gray-700">{ap.claimNo}</p>
                          </td>
                          <td className="py-3 px-3">
                            <CategoryBadge category={ap.category} />
                          </td>
                          <td className="py-3 px-3 text-gray-700 max-w-[180px]">
                            <p className="truncate">{ap.description}</p>
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                            ₹{ap.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {ap.receipt ? (
                              <span className="text-green-600 font-semibold text-xs">Yes</span>
                            ) : (
                              <span className="text-red-500 font-semibold text-xs">No</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{ap.submittedOn}</td>
                          <td className="py-3 px-3">
                            {ap.status === 'Pending' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApprove(ap.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                  style={{ background: '#16A34A' }}
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectReason('')
                                    setRejectApprovalModal({ open: true, approvalId: ap.id })
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <StatusBadge status={ap.status} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SUBMIT CLAIM MODAL ── */}
      <Modal
        open={submitModal}
        onClose={() => setSubmitModal(false)}
        title="Submit New Claim"
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Month / Year</label>
              <div className="relative">
                <select
                  value={newClaim.month}
                  onChange={(e) => setNewClaim((prev) => ({ ...prev, month: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg border text-sm text-gray-700 focus:outline-none"
                  style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
                >
                  <option value="">Select month...</option>
                  {['April 2026', 'March 2026', 'Feb 2026', 'Jan 2026'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <div className="relative">
                <select
                  value={newClaim.category}
                  onChange={(e) => setNewClaim((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg border text-sm text-gray-700 focus:outline-none"
                  style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
                >
                  <option value="">Select category...</option>
                  {['Travel', 'Food', 'Accommodation', 'Communication', 'Equipment', 'Training', 'Medical', 'Other'].map(
                    (c) => <option key={c} value={c}>{c}</option>
                  )}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={newClaim.description}
              onChange={(e) => setNewClaim((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe the expense (purpose, vendor, date, etc.)..."
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:outline-none resize-none"
              style={{ background: '#F8FAFC' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
              <input
                type="number"
                value={newClaim.amount}
                onChange={(e) => setNewClaim((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0"
                className="w-full pl-7 pr-4 py-2.5 rounded-lg border text-sm text-gray-700 focus:outline-none"
                style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
              />
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Receipt</label>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: uploadedFile ? '#16A34A' : '#CBD5E1' }}
              onClick={() => setUploadedFile('receipt_document.pdf')}
            >
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#DCFCE7' }}
                  >
                    <Check size={18} style={{ color: '#16A34A' }} />
                  </div>
                  <p className="text-sm font-medium text-green-700">{uploadedFile}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null) }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#F1F5F9' }}
                  >
                    <Upload size={18} style={{ color: '#94A3B8' }} />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Click to upload or drag receipt here</p>
                  <p className="text-xs text-gray-400">Supported formats: PDF, JPG, PNG · Max 5 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Policy note */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
            <p className="text-xs text-amber-800">
              Claims submitted by <strong>25th of the month</strong> will be included in the current month payroll. Claims after this date will be processed in the following month.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setSubmitModal(false)}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E2E8F0' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitClaim}
              disabled={!newClaim.description.trim() || !newClaim.amount}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: '#E8622A' }}
            >
              Submit Claim
            </button>
          </div>
        </div>
      </Modal>

      {/* ── VIEW CLAIM MODAL ── */}
      <Modal
        open={viewModal.open}
        onClose={() => setViewModal({ open: false, claim: null })}
        title="Claim Details"
      >
        {viewModal.claim && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Claim No', value: viewModal.claim.id },
                { label: 'Month', value: viewModal.claim.month },
                { label: 'Category', value: viewModal.claim.category },
                { label: 'Amount', value: `₹${viewModal.claim.amount.toLocaleString('en-IN')}` },
                { label: 'Receipt Attached', value: viewModal.claim.receipt ? 'Yes' : 'No' },
                { label: 'Submitted On', value: viewModal.claim.submittedOn },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg p-3"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <p className="text-xs text-gray-500 mb-1">{row.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                </div>
              ))}
            </div>

            <div
              className="rounded-lg p-3"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-800">{viewModal.claim.description}</p>
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={viewModal.claim.status} />
            </div>

            {viewModal.claim.status === 'Rejected' && viewModal.claim.rejectionReason && (
              <div
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
              >
                <XCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-0.5">Rejection Reason</p>
                  <p className="text-sm text-red-700">{viewModal.claim.rejectionReason}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setViewModal({ open: false, claim: null })}
              className="w-full px-4 py-2.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E2E8F0' }}
            >
              Close
            </button>
          </div>
        )}
      </Modal>

      {/* ── REJECT APPROVAL MODAL ── */}
      <Modal
        open={rejectApprovalModal.open}
        onClose={() => setRejectApprovalModal({ open: false, approvalId: null })}
        title="Reject Claim"
      >
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
          >
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
            <p className="text-sm text-amber-800">
              The employee will be notified about the rejection. Please provide a clear reason to help them resubmit if applicable.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g., Exceeds policy limit, Missing receipt, Not within expense policy..."
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:outline-none resize-none"
              style={{ background: '#F8FAFC' }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setRejectApprovalModal({ open: false, approvalId: null })}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E2E8F0' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRejectApproval}
              disabled={!rejectReason.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: '#DC2626' }}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
