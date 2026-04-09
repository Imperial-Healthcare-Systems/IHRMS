'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { reimbursementsApi, type ExpenseClaim } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Clock, CheckCircle, XCircle, IndianRupee, X, Eye, Edit,
  Trash2, Check, AlertTriangle, Upload, Info, Filter, Plus,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ReimbTab    = 'myClaims' | 'teamClaims' | 'pendingApprovals'
type ClaimStatus = 'Approved' | 'Pending' | 'Rejected'

interface Claim {
  id: string; month: string; category: string; description: string
  amount: number; receipt: boolean; status: ClaimStatus
  submittedOn: string; rejectionReason?: string
}
interface TeamClaim {
  id: string; employee: string; dept: string; month: string
  category: string; description: string; amount: number
  status: ClaimStatus; submittedOn: string
}
interface PendingApproval {
  id: string; employee: string; dept: string; claimNo: string
  category: string; description: string; amount: number
  receipt: boolean; submittedOn: string; status: 'Pending' | 'Approved' | 'Rejected'
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const INITIAL_MY_CLAIMS: Claim[] = [
  { id: 'CLM/2026/001', month: 'March 2026', category: 'Travel',        description: 'Mumbai to Pune cab for client meeting',    amount: 1850, receipt: true,  status: 'Approved', submittedOn: 'Mar 28, 2026' },
  { id: 'CLM/2026/002', month: 'March 2026', category: 'Food',          description: 'Team lunch - client entertaining',          amount: 3200, receipt: true,  status: 'Approved', submittedOn: 'Mar 28, 2026' },
  { id: 'CLM/2026/003', month: 'March 2026', category: 'Accommodation', description: 'Hotel stay - Hyderabad conference',         amount: 5400, receipt: true,  status: 'Pending',  submittedOn: 'Mar 29, 2026' },
  { id: 'CLM/2026/004', month: 'March 2026', category: 'Communication', description: 'Mobile recharge for work',                  amount: 299,  receipt: false, status: 'Pending',  submittedOn: 'Mar 30, 2026' },
  { id: 'CLM/2026/005', month: 'Feb 2026',   category: 'Travel',        description: 'Ola/Uber office visits - 15 trips',         amount: 4700, receipt: true,  status: 'Approved', submittedOn: 'Feb 25, 2026' },
  { id: 'CLM/2026/006', month: 'Feb 2026',   category: 'Equipment',     description: 'Laptop bag',                                amount: 2500, receipt: true,  status: 'Rejected', submittedOn: 'Feb 20, 2026', rejectionReason: 'Exceeds policy limit of ₹2,000 for equipment purchases' },
  { id: 'CLM/2026/007', month: 'Feb 2026',   category: 'Training',      description: 'Online course - AWS certification',         amount: 3999, receipt: true,  status: 'Approved', submittedOn: 'Feb 18, 2026' },
  { id: 'CLM/2026/008', month: 'Jan 2026',   category: 'Medical',       description: 'Medical consultation reimbursement',        amount: 800,  receipt: true,  status: 'Approved', submittedOn: 'Jan 28, 2026' },
  { id: 'CLM/2026/009', month: 'Jan 2026',   category: 'Food',          description: 'Working overtime meals',                    amount: 1200, receipt: true,  status: 'Approved', submittedOn: 'Jan 26, 2026' },
  { id: 'CLM/2026/010', month: 'Jan 2026',   category: 'Communication', description: 'Internet allowance',                        amount: 599,  receipt: true,  status: 'Pending',  submittedOn: 'Jan 27, 2026' },
]

const TEAM_CLAIMS: TeamClaim[] = [
  { id: 'T001', employee: 'Rohit Verma',    dept: 'Engineering', month: 'March 2026', category: 'Travel',        description: 'Client site visits - Bengaluru',   amount: 3200, status: 'Approved', submittedOn: 'Mar 27, 2026' },
  { id: 'T002', employee: 'Ananya Singh',   dept: 'HR',          month: 'March 2026', category: 'Training',       description: 'HR Summit registration fee',        amount: 5500, status: 'Pending',  submittedOn: 'Mar 28, 2026' },
  { id: 'T003', employee: 'Vikas Sharma',   dept: 'Sales',       month: 'March 2026', category: 'Food',           description: 'Client entertaining - dinner',      amount: 4800, status: 'Approved', submittedOn: 'Mar 25, 2026' },
  { id: 'T004', employee: 'Meera Nair',     dept: 'Engineering', month: 'March 2026', category: 'Communication',  description: 'Broadband for WFH',                 amount: 799,  status: 'Pending',  submittedOn: 'Mar 29, 2026' },
  { id: 'T005', employee: 'Sanjay Gupta',   dept: 'Engineering', month: 'March 2026', category: 'Accommodation',  description: 'Pune offsite stay',                 amount: 6200, status: 'Approved', submittedOn: 'Mar 20, 2026' },
  { id: 'T006', employee: 'Divya Krishnan', dept: 'Finance',     month: 'Feb 2026',   category: 'Travel',         description: 'Mumbai - Delhi flight for audit',   amount: 8900, status: 'Approved', submittedOn: 'Feb 22, 2026' },
  { id: 'T007', employee: 'Karan Joshi',    dept: 'Operations',  month: 'Feb 2026',   category: 'Equipment',      description: 'Ergonomic keyboard',                amount: 1800, status: 'Approved', submittedOn: 'Feb 18, 2026' },
  { id: 'T008', employee: 'Pooja Rao',      dept: 'HR',          month: 'Feb 2026',   category: 'Training',       description: 'Online SHRM certification',          amount: 7500, status: 'Rejected', submittedOn: 'Feb 15, 2026' },
  { id: 'T009', employee: 'Rahul Tiwari',   dept: 'Sales',       month: 'Feb 2026',   category: 'Food',           description: 'Team outing expenses',              amount: 3400, status: 'Approved', submittedOn: 'Feb 24, 2026' },
  { id: 'T010', employee: 'Kavya Menon',    dept: 'Engineering', month: 'Feb 2026',   category: 'Communication',  description: 'Mobile bill reimbursement',         amount: 499,  status: 'Approved', submittedOn: 'Feb 26, 2026' },
  { id: 'T011', employee: 'Aditya Kumar',   dept: 'Finance',     month: 'Jan 2026',   category: 'Travel',         description: 'Cab - office field visits',         amount: 2100, status: 'Approved', submittedOn: 'Jan 27, 2026' },
  { id: 'T012', employee: 'Rohit Verma',    dept: 'Engineering', month: 'Jan 2026',   category: 'Medical',        description: 'Eye test reimbursement',            amount: 600,  status: 'Approved', submittedOn: 'Jan 25, 2026' },
  { id: 'T013', employee: 'Vikas Sharma',   dept: 'Sales',       month: 'Jan 2026',   category: 'Travel',         description: 'Delhi - Jaipur client trip',        amount: 4500, status: 'Pending',  submittedOn: 'Jan 28, 2026' },
  { id: 'T014', employee: 'Sanjay Gupta',   dept: 'Engineering', month: 'Jan 2026',   category: 'Training',       description: 'Kubernetes certification',          amount: 4200, status: 'Approved', submittedOn: 'Jan 20, 2026' },
  { id: 'T015', employee: 'Meera Nair',     dept: 'Engineering', month: 'Jan 2026',   category: 'Equipment',      description: 'USB hub for WFH',                   amount: 1200, status: 'Approved', submittedOn: 'Jan 22, 2026' },
]

const INITIAL_APPROVALS: PendingApproval[] = [
  { id: 'PA001', employee: 'Ananya Singh',  dept: 'HR',          claimNo: 'CLM/2026/042', category: 'Training',      description: 'HR Summit registration fee',          amount: 5500, receipt: true,  submittedOn: 'Mar 28, 2026', status: 'Pending' },
  { id: 'PA002', employee: 'Meera Nair',    dept: 'Engineering', claimNo: 'CLM/2026/043', category: 'Communication', description: 'Broadband for WFH - March',           amount: 799,  receipt: true,  submittedOn: 'Mar 29, 2026', status: 'Pending' },
  { id: 'PA003', employee: 'Vikas Sharma',  dept: 'Sales',       claimNo: 'CLM/2026/044', category: 'Travel',        description: 'Delhi - Jaipur client trip',          amount: 4500, receipt: false, submittedOn: 'Mar 30, 2026', status: 'Pending' },
  { id: 'PA004', employee: 'Karan Joshi',   dept: 'Operations',  claimNo: 'CLM/2026/045', category: 'Equipment',     description: 'Noise-cancelling headset for calls',  amount: 3200, receipt: true,  submittedOn: 'Mar 31, 2026', status: 'Pending' },
]

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS — same triads as Employee / Payroll pages
───────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Approved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Pending:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

const CATEGORY_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Travel:        { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Food:          { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Accommodation: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  Communication: { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  Equipment:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Training:      { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' },
  Medical:       { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  Other:         { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

/* ─────────────────────────────────────────────────────────────
   ATOM COMPONENTS — mirror Employee page exactly
───────────────────────────────────────────────────────────── */

/** Avatar — same palette + transparency trick */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx],
      flexShrink: 0, letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

/** Status badge — badge-dot class */
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span className="badge badge-dot" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {status}
    </span>
  )
}

/** Category badge — badge class */
function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_CFG[category] ?? CATEGORY_CFG.Other
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {category}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   MODAL WRAPPER
───────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, sub, wide, children }: {
  open: boolean; onClose: () => void; title: string; sub?: string; wide?: boolean; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="relative bg-white flex flex-col" style={{ width: wide ? '600px' : '460px', maxWidth: '95vw', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div className="flex items-start justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
            {sub && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0', fontWeight: 400 }}>{sub}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon" style={{ marginTop: -2 }}><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ReimbursementsPage() {
  const [activeTab, setActiveTab]   = useState<ReimbTab>('myClaims')
  const [myClaims, setMyClaims]     = useState<Claim[]>(INITIAL_MY_CLAIMS)
  const [approvals, setApprovals]   = useState<PendingApproval[]>(INITIAL_APPROVALS)

  const [submitModal, setSubmitModal] = useState(false)
  const [newClaim, setNewClaim] = useState({ month: '', category: '', description: '', amount: '' })
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [viewModal, setViewModal] = useState<{ open: boolean; claim: Claim | null }>({ open: false, claim: null })
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [rejectReason, setRejectReason] = useState('')

  const [teamMonthFilter,  setTeamMonthFilter]  = useState('All')
  const [teamStatusFilter, setTeamStatusFilter] = useState('All')

  // Fetch live data
  const [apiClaims, setApiClaims] = useState<ExpenseClaim[]>([])
  useEffect(() => {
    reimbursementsApi.list({ limit: 50 })
      .then(r => {
        setApiClaims(r.data)
        if (r.data.length > 0) {
          setMyClaims(r.data.map(c => ({
            id: c.id,
            month: c.expense_date ? new Date(c.expense_date).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : '—',
            category: c.category,
            description: c.description ?? '—',
            amount: c.amount,
            receipt: !!c.receipt_url,
            status: c.status.charAt(0).toUpperCase() + c.status.slice(1) as Claim['status'],
            submittedOn: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
          })))
        }
      })
      .catch(console.error)
  }, [])

  void apiClaims

  async function handleSubmitClaim() {
    if (!newClaim.description || !newClaim.amount) return
    setSubmitting(true)
    try {
      const now = new Date()
      await reimbursementsApi.create({
        title: newClaim.description.slice(0, 80),
        category: newClaim.category || 'Other',
        amount: Number(newClaim.amount),
        expense_date: now.toISOString().split('T')[0],
        description: newClaim.description,
        status: 'submitted',
      } as Partial<ExpenseClaim>)
      toast.success('Claim submitted successfully!')
      setNewClaim({ month: '', category: '', description: '', amount: '' })
      setUploadedFile(null)
      setSubmitModal(false)
      reimbursementsApi.list({ limit: 50 }).then(r => setApiClaims(r.data)).catch(console.error)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit claim')
    } finally { setSubmitting(false) }
  }

  async function handleApprove(id: string) {
    try {
      await reimbursementsApi.update(id, { status: 'approved' } as Partial<ExpenseClaim>)
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Approved' } : a))
      toast.success('Claim approved')
    } catch { setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Approved' } : a)) }
  }

  async function handleReject() {
    if (!rejectModal.id) return
    try {
      await reimbursementsApi.update(rejectModal.id, { status: 'rejected' } as Partial<ExpenseClaim>)
    } catch { /* optimistic */ }
    setApprovals((prev) => prev.map((a) => a.id === rejectModal.id ? { ...a, status: 'Rejected' } : a))
    setRejectModal({ open: false, id: null })
    setRejectReason('')
  }

  const filteredTeam = TEAM_CLAIMS.filter((tc) =>
    (teamMonthFilter  === 'All' || tc.month  === teamMonthFilter) &&
    (teamStatusFilter === 'All' || tc.status === teamStatusFilter)
  )

  const pendingCount = approvals.filter((a) => a.status === 'Pending').length
  const teamMonths   = ['All', ...Array.from(new Set(TEAM_CLAIMS.map((t) => t.month)))]

  const tabs: { key: ReimbTab; label: string; count: number }[] = [
    { key: 'myClaims',        label: 'My Claims',              count: myClaims.length },
    { key: 'teamClaims',      label: 'Team Claims',            count: TEAM_CLAIMS.length },
    { key: 'pendingApprovals',label: 'Pending Approvals',      count: pendingCount },
  ]

  return (
    <>
      {/* ── Modals ── */}
      {/* Submit Claim */}
      <Modal open={submitModal} onClose={() => setSubmitModal(false)} title="Submit New Claim" sub="Fill in the expense details below" wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: Month + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Month / Year</label>
              <select value={newClaim.month} onChange={(e) => setNewClaim((p) => ({ ...p, month: e.target.value }))} className="form-select" style={{ width: '100%' }}>
                <option value="">Select month…</option>
                {['April 2026', 'March 2026', 'Feb 2026', 'Jan 2026'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</label>
              <select value={newClaim.category} onChange={(e) => setNewClaim((p) => ({ ...p, category: e.target.value }))} className="form-select" style={{ width: '100%' }}>
                <option value="">Select category…</option>
                {['Travel', 'Food', 'Accommodation', 'Communication', 'Equipment', 'Training', 'Medical', 'Other'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
            <textarea
              value={newClaim.description}
              onChange={(e) => setNewClaim((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe the expense (purpose, vendor, date…)"
              style={{
                width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
                padding: '9px 12px', fontSize: '0.875rem', color: '#111827', lineHeight: 1.5,
                background: '#f9fafb', outline: 'none', resize: 'none', boxSizing: 'border-box',
                transition: 'border-color 150ms',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Amount (₹) <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.9rem', fontWeight: 500, pointerEvents: 'none' }}>₹</span>
              <input
                type="number"
                value={newClaim.amount}
                onChange={(e) => setNewClaim((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                style={{
                  width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                  borderRadius: 8, border: '1.5px solid #e5e7eb',
                  fontSize: '0.875rem', color: '#111827', background: '#f9fafb',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Upload Receipt <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af', letterSpacing: 0 }}>(optional)</span></label>
            <div
              onClick={() => setUploadedFile('receipt_document.pdf')}
              style={{
                border: `1.5px dashed ${uploadedFile ? '#22c55e' : '#d1d5db'}`,
                borderRadius: 10, padding: '18px 16px', textAlign: 'center', cursor: 'pointer',
                background: uploadedFile ? '#f0fdf4' : '#fafafa',
                transition: 'all 150ms',
              }}
            >
              {uploadedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={15} style={{ color: '#16a34a' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d', margin: 0 }}>{uploadedFile}</p>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null) }} style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                      Remove file
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', border: '1.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={15} style={{ color: '#9ca3af' }} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 500, margin: 0 }}>Click to upload receipt</p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>PDF, JPG, PNG · Max 5 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Policy note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.75rem', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
              Claims submitted by <strong style={{ color: '#92400e' }}>25th of the month</strong> will be included in the current month payroll.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
            <button onClick={() => setSubmitModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={handleSubmitClaim}
              disabled={!newClaim.description.trim() || !newClaim.amount || submitting}
              className="btn btn-primary btn-sm"
              style={{ flex: 2, opacity: (!newClaim.description.trim() || !newClaim.amount) ? 0.55 : 1, cursor: (!newClaim.description.trim() || !newClaim.amount) ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Claim */}
      <Modal open={viewModal.open} onClose={() => setViewModal({ open: false, claim: null })} title="Claim Details">
        {viewModal.claim && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Claim No',       viewModal.claim.id],
                ['Month',          viewModal.claim.month],
                ['Category',       viewModal.claim.category],
                ['Amount',         `₹${viewModal.claim.amount.toLocaleString('en-IN')}`],
                ['Receipt',        viewModal.claim.receipt ? 'Attached' : 'Not attached'],
                ['Submitted On',   viewModal.claim.submittedOn],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', margin: '0 0 3px' }}>{k}</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', margin: '0 0 3px' }}>Description</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-800)', margin: 0 }}>{viewModal.claim.description}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>Status</span>
              <StatusBadge status={viewModal.claim.status} />
            </div>
            {viewModal.claim.status === 'Rejected' && viewModal.claim.rejectionReason && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
                <XCircle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c', margin: '0 0 2px' }}>Rejection Reason</p>
                  <p style={{ fontSize: '0.8125rem', color: '#b91c1c', margin: 0 }}>{viewModal.claim.rejectionReason}</p>
                </div>
              </div>
            )}
            <button onClick={() => setViewModal({ open: false, claim: null })} className="btn btn-outline btn-sm" style={{ width: '100%' }}>Close</button>
          </div>
        )}
      </Modal>

      {/* Reject Approval */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null })} title="Reject Claim" sub="Provide a reason for rejection">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 6 }}>Reason <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Explain why this claim is being rejected…"
              style={{
                width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-gray-200)',
                padding: '10px 12px', fontSize: '0.875rem', color: 'var(--color-gray-800)',
                background: 'var(--color-gray-50)', outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setRejectModal({ open: false, id: null })} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="btn btn-sm disabled:opacity-50"
              style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      <Topbar
        title="Reimbursements & Expenses"
        subtitle="Track, submit, and manage expense reimbursement claims"
        notificationCount={pendingCount}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSubmitModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Submit Claim
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── KPI Cards — same structure as Employee / Payroll pages ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'My Pending Claims',    value: '₹12,450', sub: '3 claims awaiting approval', color: '#b45309', bg: '#fffbeb', border: '#fde68a',  icon: <Clock size={18} /> },
            { label: 'Approved This Month',  value: '₹28,300', sub: '7 claims approved',           color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',  icon: <CheckCircle size={18} /> },
            { label: 'Rejected Claims',      value: '₹3,200',  sub: '1 claim rejected',            color: '#dc2626', bg: '#fef2f2', border: '#fecaca',  icon: <XCircle size={18} /> },
            { label: 'Included in Payroll',  value: '₹24,750', sub: 'Disbursed Mar 31, 2026',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',  icon: <IndianRupee size={18} /> },
          ].map((s) => (
            <div key={s.label} className="card card-interactive" style={{ padding: '16px 18px', borderColor: s.border, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                {s.value}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Main Card with Tabs ── */}
        <div className="card" style={{ overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-gray-200)', padding: '0 20px' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '14px 16px', fontSize: '0.875rem',
                  fontWeight: activeTab === t.key ? 600 : 500,
                  color: activeTab === t.key ? '#1E3A5F' : 'var(--color-gray-500)',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${activeTab === t.key ? '#1E3A5F' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 150ms', marginBottom: -1,
                  whiteSpace: 'nowrap', outline: 'none',
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

          {/* ── TAB: MY CLAIMS ── */}
          {activeTab === 'myClaims' && (
            <div>
              {/* Filter bar */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', flex: 1 }}>
                  <Info size={13} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.75rem', color: '#1d4ed8', margin: 0 }}>
                    Claims submitted by <strong>25th of the month</strong> are included in the current month payroll automatically.
                  </p>
                </div>
                <button onClick={() => setSubmitModal(true)} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                  <Plus size={13} /> New Claim
                </button>
              </div>

              {/* Table */}
              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 140 }}>Claim No</th>
                      <th style={{ minWidth: 130 }}>Month</th>
                      <th style={{ minWidth: 130 }}>Category</th>
                      <th style={{ minWidth: 240 }}>Description</th>
                      <th style={{ minWidth: 110 }}>Amount</th>
                      <th style={{ minWidth: 90 }}>Receipt</th>
                      <th style={{ minWidth: 110 }}>Status</th>
                      <th style={{ minWidth: 130 }}>Submitted On</th>
                      <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td>
                          <p style={{ fontSize: '0.8125rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-imperial-blue)' }}>{claim.id}</p>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>{claim.month}</td>
                        <td><CategoryBadge category={claim.category} /></td>
                        <td>
                          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {claim.description}
                          </p>
                          {claim.status === 'Rejected' && claim.rejectionReason && (
                            <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {claim.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>
                          ₹{claim.amount.toLocaleString('en-IN')}
                        </td>
                        <td>
                          {claim.receipt
                            ? <span className="badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Yes</span>
                            : <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>No</span>
                          }
                        </td>
                        <td><StatusBadge status={claim.status} /></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{claim.submittedOn}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <button onClick={() => setViewModal({ open: true, claim })} className="btn btn-ghost btn-sm btn-icon" title="View"><Eye size={15} /></button>
                            {claim.status === 'Pending' && (
                              <>
                                <button className="btn btn-ghost btn-sm btn-icon" title="Edit"><Edit size={15} /></button>
                                <button onClick={() => setMyClaims((p) => p.filter((c) => c.id !== claim.id))} className="btn btn-ghost btn-sm btn-icon" title="Delete" style={{ color: '#dc2626' }}><Trash2 size={15} /></button>
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

          {/* ── TAB: TEAM CLAIMS ── */}
          {activeTab === 'teamClaims' && (
            <div>
              {/* Filter bar */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <select value={teamMonthFilter} onChange={(e) => setTeamMonthFilter(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 150, fontSize: '0.875rem' }}>
                  {teamMonths.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Months' : m}</option>)}
                </select>
                <select value={teamStatusFilter} onChange={(e) => setTeamStatusFilter(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 140, fontSize: '0.875rem' }}>
                  {['All', 'Approved', 'Pending', 'Rejected'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                </select>
                <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
                  <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {filteredTeam.length} of {TEAM_CLAIMS.length} records
                </span>
              </div>

              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Employee</th>
                      <th style={{ minWidth: 130 }}>Month</th>
                      <th style={{ minWidth: 130 }}>Category</th>
                      <th style={{ minWidth: 220 }}>Description</th>
                      <th style={{ minWidth: 110 }}>Amount</th>
                      <th style={{ minWidth: 110 }}>Status</th>
                      <th style={{ minWidth: 130 }}>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeam.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>
                          No claims found for the selected filters
                        </td>
                      </tr>
                    ) : filteredTeam.map((tc) => (
                      <tr key={tc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar name={tc.employee} size={34} />
                            <div>
                              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{tc.employee}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>{tc.dept}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>{tc.month}</td>
                        <td><CategoryBadge category={tc.category} /></td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', maxWidth: 200 }}>
                          <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{tc.description}</p>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>
                          ₹{tc.amount.toLocaleString('en-IN')}
                        </td>
                        <td><StatusBadge status={tc.status} /></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{tc.submittedOn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: PENDING APPROVALS ── */}
          {activeTab === 'pendingApprovals' && (
            <div>
              {/* Info banner */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Info size={13} style={{ color: '#15803d', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.75rem', color: '#15803d', margin: 0 }}>
                    Approved claims will be automatically included in the current month payroll during the next payroll run.
                  </p>
                </div>
              </div>

              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Employee</th>
                      <th style={{ minWidth: 140 }}>Claim No</th>
                      <th style={{ minWidth: 130 }}>Category</th>
                      <th style={{ minWidth: 220 }}>Description</th>
                      <th style={{ minWidth: 110 }}>Amount</th>
                      <th style={{ minWidth: 90 }}>Receipt</th>
                      <th style={{ minWidth: 130 }}>Submitted On</th>
                      <th style={{ minWidth: 160, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((ap) => (
                      <tr key={ap.id} style={{ opacity: ap.status !== 'Pending' ? 0.55 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar name={ap.employee} size={34} />
                            <div>
                              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>{ap.employee}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>{ap.dept}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p style={{ fontSize: '0.8125rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-imperial-blue)' }}>{ap.claimNo}</p>
                        </td>
                        <td><CategoryBadge category={ap.category} /></td>
                        <td>
                          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{ap.description}</p>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>
                          ₹{ap.amount.toLocaleString('en-IN')}
                        </td>
                        <td>
                          {ap.receipt
                            ? <span className="badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Yes</span>
                            : <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>No</span>
                          }
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{ap.submittedOn}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            {ap.status === 'Pending' ? (
                              <>
                                <button onClick={() => handleApprove(ap.id)} className="btn btn-sm" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Check size={13} /> Approve
                                </button>
                                <button onClick={() => { setRejectReason(''); setRejectModal({ open: true, id: ap.id }) }} className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <X size={13} /> Reject
                                </button>
                              </>
                            ) : (
                              <StatusBadge status={ap.status} />
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

        </div>
      </div>
    </>
  )
}
