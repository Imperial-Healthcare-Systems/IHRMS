'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Shield, AlertTriangle, Clock, Users, Heart,
  Download, ExternalLink, CheckCircle2, FileText,
  Plus, X, Search,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ComplianceTab = 'epf' | 'esic' | 'pt' | 'tds'

interface EPFEmployee  { name: string; empId: string; uan: string; pfWages: number; empContrib: number; emplrContrib: number; eps: number; status: 'Active' | 'Pending' }
interface ESICEmployee { name: string; empId: string; grossSalary: number; ipNumber: string; empContrib: number; emplrContrib: number; status: 'Active' | 'Pending' }

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const EPF_EMPLOYEES: EPFEmployee[] = [
  { name: 'Rahul Verma',   empId: 'EMP/2021/001', uan: '101234567890', pfWages: 25000, empContrib: 3000, emplrContrib: 3000, eps: 2082, status: 'Active' },
  { name: 'Priya Mehta',   empId: 'EMP/2021/002', uan: '101234567891', pfWages: 30000, empContrib: 3600, emplrContrib: 3600, eps: 2499, status: 'Active' },
  { name: 'Arun Krishnan', empId: 'EMP/2021/003', uan: '101234567892', pfWages: 22000, empContrib: 2640, emplrContrib: 2640, eps: 1832, status: 'Active' },
  { name: 'Sneha Joshi',   empId: 'EMP/2021/004', uan: '101234567893', pfWages: 28000, empContrib: 3360, emplrContrib: 3360, eps: 2332, status: 'Active' },
  { name: 'Mohan Das',     empId: 'EMP/2021/005', uan: '101234567894', pfWages: 18000, empContrib: 2160, emplrContrib: 2160, eps: 1500, status: 'Active' },
  { name: 'Lakshmi Nair',  empId: 'EMP/2021/006', uan: '101234567895', pfWages: 35000, empContrib: 4200, emplrContrib: 4200, eps: 2916, status: 'Active' },
  { name: 'Kartik Reddy',  empId: 'EMP/2021/007', uan: '101234567896', pfWages: 20000, empContrib: 2400, emplrContrib: 2400, eps: 1665, status: 'Pending' },
  { name: 'Divya Pillai',  empId: 'EMP/2021/008', uan: '101234567897', pfWages: 26000, empContrib: 3120, emplrContrib: 3120, eps: 2165, status: 'Active' },
  { name: 'Suresh Iyer',   empId: 'EMP/2021/009', uan: '101234567898', pfWages: 32000, empContrib: 3840, emplrContrib: 3840, eps: 2665, status: 'Active' },
  { name: 'Ananya Gupta',  empId: 'EMP/2021/010', uan: '101234567899', pfWages: 24000, empContrib: 2880, emplrContrib: 2880, eps: 1999, status: 'Active' },
]

const ESIC_EMPLOYEES: ESICEmployee[] = [
  { name: 'Rahul Verma',  empId: 'EMP/2021/001', grossSalary: 18500, ipNumber: 'IP/KAR/001234', empContrib: 139, emplrContrib: 601, status: 'Active' },
  { name: 'Mohan Das',    empId: 'EMP/2021/005', grossSalary: 16000, ipNumber: 'IP/KAR/001235', empContrib: 120, emplrContrib: 520, status: 'Active' },
  { name: 'Kartik Reddy', empId: 'EMP/2021/007', grossSalary: 19000, ipNumber: 'IP/KAR/001236', empContrib: 143, emplrContrib: 618, status: 'Pending' },
  { name: 'Meena Pillai', empId: 'EMP/2022/015', grossSalary: 17500, ipNumber: 'IP/KAR/001237', empContrib: 131, emplrContrib: 569, status: 'Active' },
  { name: 'Ravi Kumar',   empId: 'EMP/2022/016', grossSalary: 20500, ipNumber: 'IP/KAR/001238', empContrib: 154, emplrContrib: 666, status: 'Active' },
  { name: 'Sita Devi',    empId: 'EMP/2022/017', grossSalary: 15000, ipNumber: 'IP/KAR/001239', empContrib: 113, emplrContrib: 488, status: 'Active' },
  { name: 'Ganesh Bhat',  empId: 'EMP/2022/018', grossSalary: 21000, ipNumber: 'IP/KAR/001240', empContrib: 158, emplrContrib: 683, status: 'Active' },
  { name: 'Padma Rao',    empId: 'EMP/2022/019', grossSalary: 18000, ipNumber: 'IP/KAR/001241', empContrib: 135, emplrContrib: 585, status: 'Active' },
  { name: 'Venugopal S',  empId: 'EMP/2022/020', grossSalary: 19500, ipNumber: 'IP/KAR/001242', empContrib: 146, emplrContrib: 634, status: 'Active' },
  { name: 'Ambika Nair',  empId: 'EMP/2022/021', grossSalary: 20000, ipNumber: 'IP/KAR/001243', empContrib: 150, emplrContrib: 650, status: 'Active' },
]

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']

const STATUS_CFG = {
  Active:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Filed:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

const FIELD = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
}
const LBL = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600 as const,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
}

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

/* ─────────────────────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx],
    }}>{initials}</div>
  )
}

/* ─────────────────────────────────────────────────────────────
   INFO BANNER
───────────────────────────────────────────────────────────── */
function InfoBanner({ children, color = 'amber' }: { children: React.ReactNode; color?: 'amber' | 'blue' }) {
  const cfg = color === 'blue'
    ? { bg: '#eff6ff', border: '#bfdbfe', icon: '#1d4ed8', text: '#1e3a8a' }
    : { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#78350f' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <AlertTriangle size={13} style={{ color: cfg.icon, flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: '0.75rem', color: cfg.text, margin: 0, lineHeight: 1.55 }}>{children}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SUMMARY INFO CARD (replaces old blue/purple banner)
───────────────────────────────────────────────────────────── */
function SummaryCard({ title, due, fields, totalLabel, totalValue, accentColor }: {
  title: string; due: string; fields: { label: string; value: string }[];
  totalLabel?: string; totalValue?: string; accentColor: string
}) {
  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${accentColor}30`, background: `${accentColor}08`, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', margin: 0 }}>{title}</p>
        <span className="badge badge-dot" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
          Due: {due}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: 16 }}>
        {fields.map(f => (
          <div key={f.label}>
            <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0 0 3px', fontWeight: 500 }}>{f.label}</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>{f.value}</p>
          </div>
        ))}
      </div>
      {totalLabel && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${accentColor}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', margin: 0 }}>{totalLabel}</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: accentColor, margin: 0 }}>{totalValue}</p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
function Modal({ onClose, title, sub, icon, children }: { onClose: () => void; title: string; sub?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'white', display: 'flex', flexDirection: 'column', width: 520, maxWidth: '95vw', maxHeight: '92vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon && (
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0f4ff', border: '1.5px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
              {sub && <p style={{ fontSize: '0.775rem', color: '#94a3b8', margin: '2px 0 0', fontWeight: 400 }}>{sub}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'all 150ms', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb' }}>
            <X size={14} />
          </button>
        </div>
        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function CompliancePage() {
  const [tab, setTab]                   = useState<ComplianceTab>('epf')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form16Search, setForm16Search] = useState('')
  const [form16FY, setForm16FY]         = useState('2025-26')
  const [statusSel, setStatusSel]       = useState('Pending')

  const TABS: { key: ComplianceTab; label: string }[] = [
    { key: 'epf',  label: 'EPF Management' },
    { key: 'esic', label: 'ESIC' },
    { key: 'pt',   label: 'Professional Tax' },
    { key: 'tds',  label: 'TDS & Form 16' },
  ]

  return (
    <>
      {showAddModal && (
        <Modal
          onClose={() => setShowAddModal(false)}
          title="Add Compliance Record"
          sub="Log a new statutory filing or payment"
          icon={<FileText size={17} color="#1d4ed8" />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── Compliance Type ── */}
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Compliance Type</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...FIELD, appearance: 'none', paddingRight: 36, cursor: 'pointer' }}>
                  {['EPF Return', 'ESIC Contribution', 'Professional Tax', 'TDS / Form 24Q', 'Form 16', 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
                <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            {/* ── Period + Due Date ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={LBL}>Filing Period</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Month */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    <select style={{ ...FIELD, appearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  {/* Year */}
                  <div style={{ position: 'relative', flex: '0 0 76px' }}>
                    <select style={{ ...FIELD, appearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                      {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label style={LBL}>Due Date</label>
                <input type="date" style={{ ...FIELD, colorScheme: 'light' } as React.CSSProperties} />
              </div>
            </div>

            {/* ── Amount ── */}
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Amount Payable</label>
              <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb' }}>
                <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRight: '1.5px solid #e5e7eb', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', flexShrink: 0 }}>₹</div>
                <input type="number" placeholder="0.00" style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 11px', fontSize: '0.8125rem', color: '#111827', background: 'transparent', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* ── Status ── */}
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Filing Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { key: 'Pending', icon: '⏳', activeBg: '#fffbeb', color: '#b45309', border: '#fcd34d', dot: '#f59e0b' },
                  { key: 'Filed',   icon: '📄', activeBg: '#f0fdf4', color: '#15803d', border: '#86efac', dot: '#22c55e' },
                  { key: 'Paid',    icon: '✅', activeBg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', dot: '#3b82f6' },
                ].map(s => (
                  <button key={s.key} onClick={() => setStatusSel(s.key)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 150ms',
                      border: statusSel === s.key ? `2px solid ${s.border}` : '2px solid #e5e7eb',
                      background: statusSel === s.key ? s.activeBg : '#f9fafb',
                      color: statusSel === s.key ? s.color : '#9ca3af',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{s.icon}</span>
                    <span>{s.key}</span>
                    {statusSel === s.key && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Remarks ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ ...LBL, marginBottom: 0 }}>Remarks</label>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 400 }}>Optional</span>
              </div>
              <textarea rows={3} placeholder="Add reference number, challan ID, or any notes…"
                style={{ ...FIELD, resize: 'none', lineHeight: 1.65, padding: '9px 11px' }} />
            </div>

            {/* ── Footer Actions ── */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1.5px solid #f1f5f9', marginTop: -4 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 9, fontSize: '0.8375rem', fontWeight: 600,
                  border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}
              >Cancel</button>
              <button
                style={{
                  flex: 2, padding: '9px 16px', borderRadius: 9, fontSize: '0.8375rem', fontWeight: 700,
                  border: 'none', background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5899 100%)',
                  color: 'white', cursor: 'pointer', letterSpacing: '0.01em',
                  boxShadow: '0 2px 8px rgba(30,58,95,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <FileText size={14} />
                Save Record
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Topbar
        title="Compliance & Statutory Management"
        subtitle="EPF, ESIC, Professional Tax, TDS and regulatory filings"
        notificationCount={2}
      >
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Compliance Record
        </button>
      </Topbar>

      <div style={{ padding: '28px 28px 56px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
          {([
            { label: 'Compliant',     value: '8/10', sub: 'items',     icon: Shield,        color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Action Required',value: '2',   sub: 'items',     icon: AlertTriangle, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
            { label: 'Due This Month', value: '4',   sub: 'items',     icon: Clock,         color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'EPF Enrolled',   value: '248', sub: 'employees', icon: Users,         color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'ESIC Eligible',  value: '89',  sub: 'employees', icon: Heart,         color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          ] as { label: string; value: string; sub: string; icon: React.ElementType; color: string; bg: string; border: string }[]).map(({ label, value, sub, icon: Icon, color, bg, border }) => (
            <div key={label} className="card card-interactive" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '3px 0 0' }}>{label}</p>
              <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: '1px 0 0' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #f1f5f9', padding: '0 4px' }}>
            {TABS.map(t => {
              const active = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    padding: '14px 20px', fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
                    color: active ? '#1E3A5F' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: active ? '2px solid #1E3A5F' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 150ms',
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── TAB 1: EPF ── */}
            {tab === 'epf' && (
              <>
                <SummaryCard
                  title="ECR (Electronic Challan cum Return) — March 2026"
                  due="Apr 15, 2026"
                  accentColor="#1d4ed8"
                  fields={[
                    { label: 'Employer PF Account No', value: 'MH/BAN/123456/000' },
                    { label: 'Total PF Wages',          value: '₹48,50,000' },
                    { label: 'Employee Contribution (12%)', value: '₹5,82,000' },
                    { label: 'Employer Contribution (12%)', value: '₹5,82,000' },
                  ]}
                />

                {/* Breakdown tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  {[
                    { label: 'EPS (8.33%)',    value: '₹4,03,935',  color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
                    { label: 'EDLI (0.5%)',    value: '₹24,250',    color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
                    { label: 'Admin Charges',  value: '₹58,200',    color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
                    { label: 'Total Challan',  value: '₹11,64,000', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} style={{ padding: '14px 16px', borderRadius: 10, background: bg, border: `1.5px solid ${border}` }}>
                      <p style={{ fontSize: '0.72rem', color, margin: '0 0 5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* EPF Table */}
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
                    Employee PF Details <span style={{ fontWeight: 400, color: '#6b7280' }}>(Showing top 10 of 248)</span>
                  </p>
                  <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Employee', 'EMP ID', 'UAN Number', 'PF Wages', 'Emp Contrib', 'Emplr Contrib', 'EPS', 'Status'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {EPF_EMPLOYEES.map(emp => {
                          const s = STATUS_CFG[emp.status]
                          return (
                            <tr key={emp.empId}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Avatar name={emp.name} size={28} />
                                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{emp.name}</span>
                                </div>
                              </td>
                              <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6b7280' }}>{emp.empId}</span></td>
                              <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#374151' }}>{emp.uan}</span></td>
                              <td style={{ color: '#374151' }}>{fmt(emp.pfWages)}</td>
                              <td style={{ color: '#374151' }}>{fmt(emp.empContrib)}</td>
                              <td style={{ color: '#374151' }}>{fmt(emp.emplrContrib)}</td>
                              <td style={{ fontWeight: 600, color: '#111827' }}>{fmt(emp.eps)}</td>
                              <td><span className="badge badge-dot" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{emp.status}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={13} /> Download ECR
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ExternalLink size={13} /> Submit to EPFO Portal
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} /> View All 248 Employees
                  </button>
                  <div style={{ marginLeft: 'auto' }}>
                    <InfoBanner>Monthly ECR due by <strong>15th of each month</strong>. April due: Apr 15, 2026</InfoBanner>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB 2: ESIC ── */}
            {tab === 'esic' && (
              <>
                <SummaryCard
                  title="ESIC Contribution Statement — March 2026"
                  due="Apr 15, 2026"
                  accentColor="#7c3aed"
                  fields={[
                    { label: 'ESIC Code',                     value: '52-00-123456-000' },
                    { label: 'Total ESIC Wages (≤₹21,000)',   value: '₹18,90,000' },
                    { label: 'Employee Contribution (0.75%)', value: '₹14,175' },
                    { label: 'Employer Contribution (3.25%)', value: '₹61,425' },
                  ]}
                  totalLabel="Total ESIC Payable"
                  totalValue="₹75,600"
                />

                <InfoBanner color="blue">
                  Employees earning ≤ ₹21,000/month gross are covered under ESIC. Currently <strong>89 of 248 employees</strong> are ESIC-eligible.
                </InfoBanner>

                <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {['Employee', 'Gross Salary', 'IP Number', 'Emp Contrib (0.75%)', 'Emplr Contrib (3.25%)', 'Total', 'Status'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ESIC_EMPLOYEES.map(emp => {
                        const s = STATUS_CFG[emp.status]
                        return (
                          <tr key={emp.empId}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={emp.name} size={28} />
                                <div>
                                  <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', margin: 0 }}>{emp.name}</p>
                                  <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{emp.empId}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ color: '#374151' }}>{fmt(emp.grossSalary)}</td>
                            <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#374151' }}>{emp.ipNumber}</span></td>
                            <td style={{ color: '#374151' }}>{fmt(emp.empContrib)}</td>
                            <td style={{ color: '#374151' }}>{fmt(emp.emplrContrib)}</td>
                            <td style={{ fontWeight: 700, color: '#111827' }}>{fmt(emp.empContrib + emp.emplrContrib)}</td>
                            <td><span className="badge badge-dot" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{emp.status}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={13} /> Download Form 5
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ExternalLink size={13} /> Submit to ESIC Portal
                  </button>
                </div>
              </>
            )}

            {/* ── TAB 3: Professional Tax ── */}
            {tab === 'pt' && (
              <>
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>State-wise PT Breakdown — March 2026</p>
                  <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['State', 'No. of Employees', 'Monthly Rate', 'Total PT Collected'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { state: 'Karnataka',   employees: 180, rate: '₹200/month', total: 36000 },
                          { state: 'Maharashtra', employees: 45,  rate: '₹200/month', total: 9000 },
                          { state: 'Tamil Nadu',  employees: 15,  rate: '₹150/month', total: 2250 },
                          { state: 'Others',      employees: 8,   rate: '₹100/month', total: 800 },
                        ].map(row => (
                          <tr key={row.state}>
                            <td style={{ fontWeight: 600, color: '#111827' }}>{row.state}</td>
                            <td style={{ color: '#374151' }}>{row.employees}</td>
                            <td style={{ color: '#374151' }}>{row.rate}</td>
                            <td style={{ fontWeight: 700, color: '#111827' }}>{fmt(row.total)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f0f4ff' }}>
                          <td style={{ fontWeight: 800, color: '#1E3A5F' }}>Total</td>
                          <td style={{ fontWeight: 700, color: '#1E3A5F' }}>248</td>
                          <td style={{ color: '#6b7280' }}>—</td>
                          <td style={{ fontWeight: 800, color: '#1E3A5F' }}>₹48,050</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>PT Slabs — Karnataka</p>
                  <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Monthly Salary Range', 'PT per Month'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { range: 'Up to ₹15,000',       pt: 'Nil',        color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                          { range: '₹15,001 – ₹17,999',   pt: '₹150/month', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                          { range: '₹18,000 and above',   pt: '₹200/month', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                        ].map(row => (
                          <tr key={row.range}>
                            <td style={{ color: '#374151' }}>{row.range}</td>
                            <td>
                              <span className="badge" style={{ background: row.bg, color: row.color, border: `1px solid ${row.border}` }}>{row.pt}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={13} /> Download PT Challan (All States)
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={13} /> Generate State-wise Report
                  </button>
                </div>
              </>
            )}

            {/* ── TAB 4: TDS & Form 16 ── */}
            {tab === 'tds' && (
              <>
                <SummaryCard
                  title="TDS Summary — FY 2025-26"
                  due="May 31, 2026"
                  accentColor="#4f46e5"
                  fields={[
                    { label: 'TAN',                       value: 'BLRX12345B' },
                    { label: 'Total TDS Deducted (FY)',   value: '₹18,45,000' },
                    { label: 'Old Regime Employees',      value: '168' },
                    { label: 'New Regime Employees',      value: '80' },
                  ]}
                />

                {/* Quarterly table */}
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>Quarterly TDS Summary</p>
                  <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Quarter', 'Period', 'TDS Deducted', 'Form 24Q Status', 'Due Date', 'Actions'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { q: 'Q1', period: 'Apr–Jun 2025', tds: '₹4,20,000', status: 'Filed',   due: 'Jul 31, 2025' },
                          { q: 'Q2', period: 'Jul–Sep 2025', tds: '₹4,35,000', status: 'Filed',   due: 'Oct 31, 2025' },
                          { q: 'Q3', period: 'Oct–Dec 2025', tds: '₹4,55,000', status: 'Filed',   due: 'Jan 31, 2026' },
                          { q: 'Q4', period: 'Jan–Mar 2026', tds: '₹5,35,000', status: 'Pending', due: 'May 31, 2026' },
                        ].map(row => {
                          const filed = row.status === 'Filed'
                          const sc = filed ? STATUS_CFG.Filed : STATUS_CFG.Pending
                          return (
                            <tr key={row.q}>
                              <td style={{ fontWeight: 700, color: '#111827' }}>{row.q}</td>
                              <td style={{ color: '#374151' }}>{row.period}</td>
                              <td style={{ fontWeight: 700, color: '#111827' }}>{row.tds}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {filed
                                    ? <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                                    : <Clock size={13} style={{ color: '#d97706', flexShrink: 0 }} />}
                                  <span className="badge badge-dot" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                    Form 24Q {row.status}
                                  </span>
                                </div>
                              </td>
                              <td style={{ color: '#6b7280' }}>{row.due}</td>
                              <td>
                                {filed
                                  ? <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}><Download size={12} /> Download</button>
                                  : <button className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>File Now</button>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #f1f5f9' }}>
                          <td colSpan={2} style={{ fontWeight: 700, color: '#374151', padding: '10px 14px', fontSize: '0.8125rem' }}>Total FY 2025-26</td>
                          <td style={{ fontWeight: 800, color: '#111827', padding: '10px 14px', fontSize: '0.8125rem' }}>₹18,45,000</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Form 16 */}
                <div style={{ borderRadius: 12, border: '1.5px solid #f1f5f9', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.875rem', margin: 0 }}>Form 16 Generation</p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>Issue Form 16 to employees for income tax filing</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>Financial Year:</label>
                      <select value={form16FY} onChange={e => setForm16FY(e.target.value)} className="form-select" style={{ width: 'auto' }}>
                        <option>2025-26</option><option>2024-25</option><option>2023-24</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <InfoBanner>
                      Form 16 not yet generated for FY {form16FY}. <strong>Deadline: June 15, 2026</strong> — 75 days remaining.
                    </InfoBanner>

                    <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '11px' }}>
                      <FileText size={14} />
                      Generate Form 16 for All Employees (248) — FY {form16FY}
                    </button>

                    <div>
                      <p style={LBL}>Generate for Individual Employee</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', background: '#f9fafb' }}>
                          <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                          <input value={form16Search} onChange={e => setForm16Search(e.target.value)}
                            placeholder="Search employee by name or ID…"
                            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#374151', width: '100%', fontFamily: 'inherit' }} />
                        </div>
                        <button className="btn btn-primary btn-sm">Generate</button>
                      </div>
                    </div>

                    {/* Tax regime breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Old Tax Regime', count: 168, pct: '67.7%', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                        { label: 'New Tax Regime', count: 80,  pct: '32.3%', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
                      ].map(({ label, count, pct, color, bg, border }) => (
                        <div key={label} style={{ padding: '14px 16px', borderRadius: 10, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: '0.72rem', color, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color, margin: 0 }}>
                              {count} <span style={{ fontSize: '0.75rem', fontWeight: 400, color }}>employees</span>
                            </p>
                          </div>
                          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: `${color}60`, margin: 0 }}>{pct}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
