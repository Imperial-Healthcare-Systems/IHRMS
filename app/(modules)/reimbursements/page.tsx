'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import { reimbursementsApi, type ExpenseClaim } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Clock, CheckCircle, XCircle, IndianRupee, X, Eye, Edit,
  Trash2, Check, AlertTriangle, Upload, Info, Filter, Plus,
  Car, Utensils, BedDouble, Phone, Monitor, GraduationCap,
  HeartPulse, MoreHorizontal, FileText, Receipt,
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
   SUBMIT CLAIM MODAL — fully redesigned
───────────────────────────────────────────────────────────── */
const CATEGORY_CARDS = [
  { key: 'Travel',        label: 'Travel',        Icon: Car,           bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  { key: 'Food',          label: 'Food & Meals',  Icon: Utensils,      bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  { key: 'Accommodation', label: 'Stay',          Icon: BedDouble,     bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  { key: 'Communication', label: 'Telecom',       Icon: Phone,         bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  { key: 'Equipment',     label: 'Equipment',     Icon: Monitor,       bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  { key: 'Training',      label: 'Training',      Icon: GraduationCap, bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' },
  { key: 'Medical',       label: 'Medical',       Icon: HeartPulse,    bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  { key: 'Other',         label: 'Other',         Icon: MoreHorizontal,bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
]

function getMonthOptions() {
  const now = new Date()
  const opts = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    })
  }
  return opts
}

function SubmitClaimModal({ onClose, newClaim, setNewClaim, uploadedFile, setUploadedFile, submitting, onSubmit, editMode = false }: {
  onClose: () => void
  newClaim: { month: string; category: string; description: string; amount: string }
  setNewClaim: React.Dispatch<React.SetStateAction<{ month: string; category: string; description: string; amount: string }>>
  uploadedFile: string | null
  setUploadedFile: (f: string | null) => void
  submitting: boolean
  onSubmit: () => void
  editMode?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched]   = useState({ month: false, category: false, description: false, amount: false })
  const [dragging, setDragging] = useState(false)

  const monthOpts   = getMonthOptions()
  const amountNum   = parseFloat(newClaim.amount) || 0
  const catCard     = CATEGORY_CARDS.find(c => c.key === newClaim.category)

  const errors = {
    month:       touched.month       && !newClaim.month,
    category:    touched.category    && !newClaim.category,
    description: touched.description && !newClaim.description.trim(),
    amount:      touched.amount      && (!newClaim.amount || amountNum <= 0),
  }
  const canSubmit = newClaim.month && newClaim.category && newClaim.description.trim() && amountNum > 0

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Only PDF, JPG, PNG allowed'); return }
    setUploadedFile(file.name)
  }

  const INP = (err: boolean): React.CSSProperties => ({
    width: '100%', borderRadius: 8,
    border: `1.5px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
    padding: '9px 12px', fontSize: '0.875rem', color: '#111827',
    background: err ? '#fff5f5' : '#fff', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 150ms',
  })
  const LBL: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#fff', width: 640, maxWidth: '98vw', maxHeight: '94vh', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#1565c0 100%)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Receipt size={16} style={{ color: '#fff' }} />
                </div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>{editMode ? 'Edit Claim' : 'Submit New Claim'}</h2>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{editMode ? 'Update the expense details below' : 'Fill in the expense details — all fields marked * are required'}</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 8px', borderRadius: 8, display: 'flex', flexShrink: 0 }}><X size={16} /></button>
          </div>

          {/* Live amount pill in header */}
          {amountNum > 0 && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 14px' }}>
              {catCard && <catCard.Icon size={13} style={{ color: '#fff' }} />}
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                {newClaim.category || 'Expense'} · ₹{amountNum.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Row: Month + Amount side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LBL}>Month / Year <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={newClaim.month}
                onChange={e => setNewClaim(p => ({ ...p, month: e.target.value }))}
                onBlur={() => setTouched(t => ({ ...t, month: true }))}
                style={{ ...INP(errors.month), appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 32, cursor: 'pointer' }}
              >
                <option value="">Select month…</option>
                {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.month && <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: '4px 0 0' }}>Please select a month</p>}
            </div>

            <div>
              <label style={LBL}>Amount (₹) <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: errors.amount ? '#fca5a5' : '#9ca3af', fontSize: '1rem', fontWeight: 600, pointerEvents: 'none' }}>₹</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={newClaim.amount}
                  onChange={e => setNewClaim(p => ({ ...p, amount: e.target.value }))}
                  onBlur={() => setTouched(t => ({ ...t, amount: true }))}
                  placeholder="0.00"
                  style={{ ...INP(errors.amount), paddingLeft: 30 }}
                />
              </div>
              {errors.amount && <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: '4px 0 0' }}>Enter a valid amount</p>}
              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {[500, 1000, 2000, 5000].map(v => (
                  <button key={v} type="button" onClick={() => setNewClaim(p => ({ ...p, amount: String(v) }))}
                    style={{ padding: '3px 10px', borderRadius: 20, border: `1.5px solid ${newClaim.amount === String(v) ? '#1E3A5F' : '#e5e7eb'}`, background: newClaim.amount === String(v) ? '#eff6ff' : '#fff', fontSize: '0.72rem', fontWeight: 600, color: newClaim.amount === String(v) ? '#1E3A5F' : '#6b7280', cursor: 'pointer' }}>
                    ₹{v.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category cards */}
          <div>
            <label style={LBL}>Category <span style={{ color: '#dc2626' }}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {CATEGORY_CARDS.map(({ key, label, Icon, bg, color, border }) => {
                const selected = newClaim.category === key
                return (
                  <button key={key} type="button"
                    onClick={() => { setNewClaim(p => ({ ...p, category: key })); setTouched(t => ({ ...t, category: true })) }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                      border: selected ? `2px solid ${color}` : `1.5px solid ${errors.category ? '#fca5a5' : '#e5e7eb'}`,
                      background: selected ? bg : '#fafafa',
                      transition: 'all 120ms', outline: 'none',
                      boxShadow: selected ? `0 0 0 3px ${color}18` : 'none',
                    }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: selected ? bg : '#f3f4f6', border: `1px solid ${selected ? border : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} style={{ color: selected ? color : '#9ca3af' }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: selected ? 700 : 500, color: selected ? color : '#6b7280', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                    {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
                  </button>
                )
              })}
            </div>
            {errors.category && <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: '6px 0 0' }}>Please select a category</p>}
          </div>

          {/* Description */}
          <div>
            <label style={LBL}>Description <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              value={newClaim.description}
              onChange={e => setNewClaim(p => ({ ...p, description: e.target.value }))}
              onBlur={() => setTouched(t => ({ ...t, description: true }))}
              rows={3}
              maxLength={300}
              placeholder="Describe the expense — purpose, vendor name, date of incurrence…"
              style={{ ...INP(errors.description), resize: 'none', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {errors.description
                ? <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: 0 }}>Description is required</p>
                : <span />}
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{newClaim.description.length}/300</span>
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label style={LBL}>Receipt <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af', letterSpacing: 0 }}>(optional)</span></label>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
              style={{
                border: `2px dashed ${uploadedFile ? '#22c55e' : dragging ? '#1d4ed8' : '#d1d5db'}`,
                borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
                background: uploadedFile ? '#f0fdf4' : dragging ? '#eff6ff' : '#fafafa',
                transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              {uploadedFile ? (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} style={{ color: '#16a34a' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedFile}</p>
                    <p style={{ fontSize: '0.75rem', color: '#16a34a', margin: '2px 0 0' }}>Receipt attached · Click to change</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}>
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: dragging ? '#dbeafe' : '#f3f4f6', border: `1px solid ${dragging ? '#93c5fd' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Upload size={17} style={{ color: dragging ? '#1d4ed8' : '#9ca3af' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: dragging ? '#1d4ed8' : '#374151', margin: 0 }}>
                      {dragging ? 'Drop file here' : 'Click or drag receipt here'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0 0' }}>PDF, JPG, PNG, WEBP · Max 5 MB</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Policy banner */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.78rem', color: '#78350f', margin: 0, lineHeight: 1.6 }}>
              Claims submitted by <strong style={{ color: '#92400e' }}>25th of the month</strong> are included in current month payroll. Claims without receipts above ₹500 may require approval.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Summary pill */}
          {canSubmit && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {catCard && <catCard.Icon size={13} style={{ color: catCard.color }} />}
              <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}>
                <strong style={{ color: catCard?.color ?? '#374151' }}>{newClaim.category}</strong>
                {' · '}
                <strong style={{ color: '#15803d' }}>₹{amountNum.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          )}
          {!canSubmit && <div style={{ flex: 1 }} />}
          <button type="button" onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            Cancel
          </button>
          <button type="button" onClick={() => { setTouched({ month: true, category: true, description: true, amount: true }); if (canSubmit) onSubmit() }}
            disabled={submitting}
            style={{
              padding: '9px 28px', borderRadius: 9, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? 'linear-gradient(135deg,#E8622A 0%,#d05520 100%)' : '#e5e7eb',
              color: canSubmit ? '#fff' : '#9ca3af', fontSize: '0.875rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 7, boxShadow: canSubmit ? '0 2px 8px rgba(232,98,42,0.35)' : 'none',
              transition: 'all 150ms', opacity: submitting ? 0.75 : 1,
            }}>
            <Receipt size={14} />
            {submitting ? (editMode ? 'Saving…' : 'Submitting…') : (editMode ? 'Save Changes' : 'Submit Claim')}
          </button>
        </div>
      </div>
    </div>
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
function toTitleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ReimbursementsPage() {
  const { data: session } = useSession()
  const sessionUserId = (session?.user as Record<string, unknown>)?.id as string | undefined

  const [activeTab, setActiveTab]   = useState<ReimbTab>('myClaims')
  const [myClaims, setMyClaims]     = useState<Claim[]>([])
  const [teamClaims, setTeamClaims] = useState<TeamClaim[]>([])
  const [approvals, setApprovals]   = useState<PendingApproval[]>([])

  const [submitModal, setSubmitModal] = useState(false)
  const [newClaim, setNewClaim] = useState({ month: '', category: '', description: '', amount: '' })
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [viewModal, setViewModal]   = useState<{ open: boolean; claim: Claim | null }>({ open: false, claim: null })
  const [editModal, setEditModal]   = useState<{ open: boolean; claim: Claim | null }>({ open: false, claim: null })
  const [editClaim, setEditClaim]   = useState({ month: '', category: '', description: '', amount: '' })
  const [editing, setEditing]       = useState(false)
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [rejectReason, setRejectReason] = useState('')

  const [teamMonthFilter,  setTeamMonthFilter]  = useState('All')
  const [teamStatusFilter, setTeamStatusFilter] = useState('All')

  // Fetch live data
  const [apiClaims, setApiClaims] = useState<ExpenseClaim[]>([])

  function mapApiClaims(data: ExpenseClaim[]) {
    setApiClaims(data)
    setMyClaims(data.map(c => {
      const raw = c as unknown as Record<string, unknown>
      const dateStr = (raw.claim_date as string | undefined) ?? c.expense_date
      return {
        id:          c.id,
        month:       dateStr ? new Date(dateStr).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : '—',
        category:    toTitleCase(c.category ?? 'other'),
        description: c.description ?? '—',
        amount:      c.amount,
        receipt:     !!(c.receipt_url ?? (raw.receipt_urls as unknown)),
        status:      (c.status.charAt(0).toUpperCase() + c.status.slice(1)) as Claim['status'],
        submittedOn: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      }
    }))
  }

  useEffect(() => {
    // My claims
    reimbursementsApi.list({ limit: 50 })
      .then(r => mapApiClaims(r.data))
      .catch(console.error)

    // Team claims (manager view)
    if (sessionUserId) {
      fetch(`/api/reimbursements?manager_id=${sessionUserId}&limit=100`)
        .then(r => r.json())
        .then((r: { data?: unknown[] }) => {
          const rows = (r.data ?? []) as Array<Record<string, unknown>>
          setTeamClaims(rows.map(c => {
            const emp = c.employee as Record<string, unknown> | undefined
            const dept = (emp?.department as Record<string, unknown> | undefined)?.name as string | undefined
            const dateStr = c.claim_date as string | undefined
            const status = c.status as string
            return {
              id:          c.id as string,
              employee:    emp ? `${emp.first_name} ${emp.last_name}` : '—',
              dept:        dept ?? '—',
              month:       dateStr ? new Date(dateStr).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : '—',
              category:    toTitleCase(c.category as string ?? 'other'),
              description: c.description as string ?? '—',
              amount:      Number(c.amount) || 0,
              status:      (status.charAt(0).toUpperCase() + status.slice(1)) as TeamClaim['status'],
              submittedOn: c.created_at ? new Date(c.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            }
          }))
        })
        .catch(console.error)
    }

    // Pending approvals (admin view — all pending/submitted claims)
    fetch('/api/reimbursements?status=pending&limit=100')
      .then(r => r.json())
      .then((r: { data?: unknown[] }) => {
        const rows = (r.data ?? []) as Array<Record<string, unknown>>
        setApprovals(rows.map(c => {
          const emp = c.employee as Record<string, unknown> | undefined
          const dept = (emp?.department as Record<string, unknown> | undefined)?.name as string | undefined
          const raw = c as Record<string, unknown>
          const status = c.status as string
          return {
            id:          c.id as string,
            employee:    emp ? `${emp.first_name} ${emp.last_name}` : '—',
            dept:        dept ?? '—',
            claimNo:     c.id as string,
            category:    toTitleCase(c.category as string ?? 'other'),
            description: c.description as string ?? '—',
            amount:      Number(c.amount) || 0,
            receipt:     !!(raw.receipt_urls),
            submittedOn: c.created_at ? new Date(c.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            status:      (status.charAt(0).toUpperCase() + status.slice(1)) as PendingApproval['status'],
          }
        }))
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId])

  void apiClaims

  async function handleSubmitClaim() {
    if (!newClaim.description || !newClaim.amount || !newClaim.month || !newClaim.category) return
    setSubmitting(true)
    try {
      // newClaim.month is "YYYY-MM" — split into year + month for the API
      const [yearStr, monthStr] = newClaim.month.split('-')

      await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category:    newClaim.category,
          description: newClaim.description,
          amount:      Number(newClaim.amount),
          month:       monthStr,
          year:        yearStr,
          receipt_url: uploadedFile ?? null,
        }),
      }).then(async res => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
        return json
      })

      toast.success('Claim submitted successfully!')
      setNewClaim({ month: '', category: '', description: '', amount: '' })
      setUploadedFile(null)
      setSubmitModal(false)
      reimbursementsApi.list({ limit: 50 }).then(r => mapApiClaims(r.data)).catch(console.error)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit claim')
    } finally { setSubmitting(false) }
  }

  async function handleEditClaim() {
    if (!editModal.claim || !editClaim.description || !editClaim.amount || !editClaim.month || !editClaim.category) return
    setEditing(true)
    try {
      const [yearStr, monthStr] = editClaim.month.split('-')
      const res = await fetch(`/api/reimbursements/${editModal.claim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:      'update',
          category:    editClaim.category,
          description: editClaim.description,
          amount:      Number(editClaim.amount),
          month:       monthStr,
          year:        yearStr,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success('Claim updated successfully!')
      setEditModal({ open: false, claim: null })
      reimbursementsApi.list({ limit: 50 }).then(r => mapApiClaims(r.data)).catch(console.error)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update claim')
    } finally { setEditing(false) }
  }

  async function handleApprove(id: string) {
    const ap = approvals.find(a => a.id === id)
    try {
      const res = await fetch(`/api/reimbursements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', approved_amount: ap?.amount ?? 0 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved' } : a))
      toast.success('Claim approved')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve claim')
    }
  }

  async function handleReject() {
    if (!rejectModal.id) return
    try {
      const res = await fetch(`/api/reimbursements/${rejectModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: rejectReason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setApprovals(prev => prev.map(a => a.id === rejectModal.id ? { ...a, status: 'Rejected' } : a))
      toast.success('Claim rejected')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject claim')
    }
    setRejectModal({ open: false, id: null })
    setRejectReason('')
  }

  const filteredTeam = teamClaims.filter((tc) =>
    (teamMonthFilter  === 'All' || tc.month  === teamMonthFilter) &&
    (teamStatusFilter === 'All' || tc.status === teamStatusFilter)
  )

  const pendingCount = approvals.filter((a) => a.status === 'Pending').length
  const teamMonths   = ['All', ...Array.from(new Set(teamClaims.map((t) => t.month)))]

  const tabs: { key: ReimbTab; label: string; count: number }[] = [
    { key: 'myClaims',        label: 'My Claims',              count: myClaims.length },
    { key: 'teamClaims',      label: 'Team Claims',            count: teamClaims.length },
    { key: 'pendingApprovals',label: 'Pending Approvals',      count: pendingCount },
  ]

  return (
    <>
      {/* ── Modals ── */}
      {/* Submit Claim */}
      {submitModal && <SubmitClaimModal
        onClose={() => { setSubmitModal(false); setNewClaim({ month: '', category: '', description: '', amount: '' }); setUploadedFile(null) }}
        newClaim={newClaim}
        setNewClaim={setNewClaim}
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        submitting={submitting}
        onSubmit={handleSubmitClaim}
      />}

      {/* View Claim */}
      {viewModal.open && viewModal.claim && (() => {
        const claim     = viewModal.claim!
        const catCard   = CATEGORY_CARDS.find(c => c.key === claim.category)
        const catCfg    = CATEGORY_CFG[claim.category] ?? CATEGORY_CFG.Other
        // Extract CLM/YYYY/NNNN from description like "[CLM/2026/0004] Test"
        const claimNoMatch = claim.description.match(/^\[([^\]]+)\]/)
        const claimNo   = claimNoMatch ? claimNoMatch[1] : claim.id.slice(0, 8).toUpperCase()
        const descBody  = claimNoMatch ? claim.description.replace(/^\[[^\]]+\]\s*/, '') : claim.description
        const statusCfg = STATUS_CFG[claim.status] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: '#fff', width: 520, maxWidth: '98vw', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#1565c0 100%)', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claim Details</p>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'monospace', letterSpacing: '0.03em' }}>{claimNo}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewModal({ open: false, claim: null })} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 8px', borderRadius: 8, display: 'flex' }}><X size={15} /></button>
                </div>

                {/* Amount hero */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Claim Amount</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>₹{claim.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, fontSize: '0.75rem', fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.color, display: 'inline-block' }} />
                      {claim.status}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.border}`, fontSize: '0.75rem', fontWeight: 700 }}>
                      {catCard && <catCard.Icon size={11} />}
                      {claim.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Month',        value: claim.month },
                    { label: 'Submitted On', value: claim.submittedOn },
                    { label: 'Receipt',      value: claim.receipt ? '✓ Attached' : 'Not attached', color: claim.receipt ? '#15803d' : '#6b7280' },
                    { label: 'Claim No',     value: claimNo, mono: true },
                  ].map(({ label, value, color, mono }) => (
                    <div key={label} style={{ padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: color ?? '#111827', margin: 0, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Description</p>
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>{descBody || '—'}</p>
                </div>

                {/* Rejection reason */}
                {claim.status === 'Rejected' && claim.rejectionReason && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <XCircle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejection Reason</p>
                      <p style={{ fontSize: '0.875rem', color: '#b91c1c', margin: 0, lineHeight: 1.5 }}>{claim.rejectionReason}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setViewModal({ open: false, claim: null })}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit Claim — reuses SubmitClaimModal pre-populated */}
      {editModal.open && editModal.claim && (
        <SubmitClaimModal
          onClose={() => setEditModal({ open: false, claim: null })}
          newClaim={editClaim}
          setNewClaim={setEditClaim}
          uploadedFile={null}
          setUploadedFile={() => {}}
          submitting={editing}
          onSubmit={handleEditClaim}
          editMode
        />
      )}

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

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── KPI Cards — same structure as Employee / Payroll pages ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12, marginBottom: 24 }}>
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
                                <button onClick={() => {
                                  const claimNoMatch = claim.description.match(/^\[([^\]]+)\]/)
                                  const descBody = claimNoMatch ? claim.description.replace(/^\[[^\]]+\]\s*/, '') : claim.description
                                  const d = new Date(claim.month + ' 1')
                                  const monthVal = isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                  setEditClaim({ month: monthVal, category: claim.category, description: descBody, amount: String(claim.amount) })
                                  setEditModal({ open: true, claim })
                                }} className="btn btn-ghost btn-sm btn-icon" title="Edit"><Edit size={15} /></button>
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
                  {filteredTeam.length} of {teamClaims.length} records
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
