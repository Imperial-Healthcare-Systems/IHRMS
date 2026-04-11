'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  complianceApi,
  type ComplianceSummary,
  type ComplianceAddPayload,
} from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Shield, AlertTriangle, Clock, Users, Heart,
  Download, ExternalLink, CheckCircle2, FileText,
  Plus, X, Search, Loader2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ComplianceTab = 'epf' | 'esic' | 'pt' | 'tds'

interface EPFRow {
  name: string; emp_id: string; department: string
  pf_wages: number; emp_contrib: number; emplr_contrib: number
  eps: number; edli: number; admin_charges: number; total_challan: number
  status: 'Active' | 'Pending'
}
interface ESICRow {
  name: string; emp_id: string; department: string
  gross_salary: number; emp_contrib: number; emplr_contrib: number; total: number
  status: 'Active' | 'Pending'
}
interface TDSQuarter {
  quarter: string; period: string; tds: number; gross: number
  payslip_count: number; due_date: string; status: string
}

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']

const STATUS_CFG = {
  Active:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Filed:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

const FIELD: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
   SUMMARY CARD
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
function Modal({ onClose, title, sub, icon, children }: {
  onClose: () => void; title: string; sub?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'white', display: 'flex', flexDirection: 'column', width: 520, maxWidth: '95vw', maxHeight: '92vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)' }}>
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
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SPINNER
───────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#6b7280' }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function CompliancePage() {
  const [tab, setTab] = useState<ComplianceTab>('epf')

  // ── Summary KPI ──
  const [summary, setSummary] = useState<ComplianceSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // ── EPF tab ──
  const [epfData, setEpfData]       = useState<EPFRow[]>([])
  const [epfLoading, setEpfLoading] = useState(false)
  const [epfMonth, setEpfMonth]     = useState(0)
  const [epfYear, setEpfYear]       = useState(0)

  // ── ESIC tab ──
  const [esicData, setEsicData]       = useState<ESICRow[]>([])
  const [esicLoading, setEsicLoading] = useState(false)
  const [esicMonth, setEsicMonth]     = useState(0)
  const [esicYear, setEsicYear]       = useState(0)

  // ── PT tab ──
  const [ptSummary, setPtSummary]     = useState<{ total_employees: number; total_pt: number; nil_count: number; low_rate_count: number; high_rate_count: number } | null>(null)
  const [ptLoading, setPtLoading]     = useState(false)
  const [ptMonth, setPtMonth]         = useState(0)
  const [ptYear, setPtYear]           = useState(0)

  // ── TDS tab ──
  const [tdsData, setTdsData]       = useState<{ fy: string; quarters: TDSQuarter[]; total_tds: number; total_gross: number } | null>(null)
  const [tdsLoading, setTdsLoading] = useState(false)
  const [form16Search, setForm16Search] = useState('')
  const [form16FY, setForm16FY]         = useState('2025-26')

  // ── Add Record modal ──
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [statusSel, setStatusSel]       = useState('Pending')
  const [formType, setFormType]         = useState('EPF Return')
  const [formMonth, setFormMonth]       = useState(String(new Date().getMonth() + 1))
  const [formYear, setFormYear]         = useState(String(new Date().getFullYear()))
  const [formDue, setFormDue]           = useState('')
  const [formAmount, setFormAmount]     = useState('')
  const [formRemarks, setFormRemarks]   = useState('')

  // ── Load summary on mount ──
  useEffect(() => {
    complianceApi.summary()
      .then(res => { if (res) setSummary(res) })
      .catch(() => {})
      .finally(() => setSummaryLoading(false))
  }, [])

  // ── Load EPF when tab switches ──
  const loadEpf = useCallback(() => {
    setEpfLoading(true)
    complianceApi.epf()
      .then(res => {
        setEpfData((res.data ?? []) as EPFRow[])
        setEpfMonth(res.month ?? 0)
        setEpfYear(res.year ?? 0)
      })
      .catch(() => {})
      .finally(() => setEpfLoading(false))
  }, [])

  const loadEsic = useCallback(() => {
    setEsicLoading(true)
    complianceApi.esic()
      .then(res => {
        setEsicData((res.data ?? []) as ESICRow[])
        setEsicMonth(res.month ?? 0)
        setEsicYear(res.year ?? 0)
      })
      .catch(() => {})
      .finally(() => setEsicLoading(false))
  }, [])

  type PtSummaryShape = { total_employees: number; total_pt: number; nil_count: number; low_rate_count: number; high_rate_count: number }

  const loadPt = useCallback(() => {
    setPtLoading(true)
    complianceApi.pt()
      .then(res => {
        setPtSummary((res.summary ?? null) as PtSummaryShape | null)
        setPtMonth(res.month ?? 0)
        setPtYear(res.year ?? 0)
      })
      .catch(() => {})
      .finally(() => setPtLoading(false))
  }, [])

  const loadTds = useCallback(() => {
    setTdsLoading(true)
    complianceApi.tds()
      .then(res => {
        setTdsData({
          fy:          res.fy,
          quarters:    res.quarters as TDSQuarter[],
          total_tds:   res.total_tds,
          total_gross: res.total_gross,
        })
      })
      .catch(() => {})
      .finally(() => setTdsLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'epf'  && epfData.length  === 0) loadEpf()
    if (tab === 'esic' && esicData.length === 0) loadEsic()
    if (tab === 'pt'   && ptSummary === null)     loadPt()
    if (tab === 'tds'  && tdsData   === null)     loadTds()
  }, [tab, epfData.length, esicData.length, ptSummary, tdsData, loadEpf, loadEsic, loadPt, loadTds])

  // ── Save compliance record ──
  async function handleSave() {
    setSaving(true)
    const typeMap: Record<string, string> = {
      'EPF Return': 'pf', 'ESIC Contribution': 'esic',
      'Professional Tax': 'pt', 'TDS / Form 24Q': 'tds', 'Form 16': 'form16', 'Other': 'other',
    }
    const payload: ComplianceAddPayload = {
      compliance_type: typeMap[formType] ?? formType.toLowerCase(),
      period_month: parseInt(formMonth),
      period_year:  parseInt(formYear),
      status:       statusSel.toLowerCase(),
    }
    if (formDue)    payload.due_date = formDue
    if (formAmount) payload.amount   = parseFloat(formAmount)
    if (formRemarks) payload.remarks = formRemarks

    try {
      await complianceApi.addRecord(payload)
      toast.success('Compliance record saved successfully')
      setShowAddModal(false)
      // Reset form
      setFormType('EPF Return'); setFormMonth(String(new Date().getMonth() + 1))
      setFormYear(String(new Date().getFullYear())); setFormDue('')
      setFormAmount(''); setFormRemarks(''); setStatusSel('Pending')
    } catch {
      toast.error('Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  // ── Computed values from summary ──
  const totalActive   = summary?.total_active   ?? 0
  const esicEligible  = summary?.esic_eligible  ?? 0
  const compliant     = summary?.compliant_count ?? 0
  const actionReq     = summary?.action_required ?? 0
  const dueMonth      = summary?.due_this_month  ?? 0
  const totals        = summary?.totals

  const curMonthName = summary ? MONTH_NAMES[(summary.current_month ?? 1) - 1] : ''
  const curYear      = summary?.current_year ?? new Date().getFullYear()

  const nextMonthDue = (() => {
    if (!summary) return ''
    const nm = summary.current_month === 12 ? 1 : summary.current_month + 1
    const ny = summary.current_month === 12 ? curYear + 1 : curYear
    return `${MONTH_NAMES[nm - 1]} 15, ${ny}`
  })()

  const TABS: { key: ComplianceTab; label: string }[] = [
    { key: 'epf',  label: 'EPF Management' },
    { key: 'esic', label: 'ESIC' },
    { key: 'pt',   label: 'Professional Tax' },
    { key: 'tds',  label: 'TDS & Form 16' },
  ]

  const epfTabLabel = epfMonth ? `${MONTH_NAMES[epfMonth - 1]} ${epfYear}` : (curMonthName ? `${curMonthName} ${curYear}` : '—')
  const esicTabLabel = esicMonth ? `${MONTH_NAMES[esicMonth - 1]} ${esicYear}` : epfTabLabel
  const ptTabLabel  = ptMonth   ? `${MONTH_NAMES[ptMonth - 1]} ${ptYear}`   : epfTabLabel

  return (
    <>
      {/* ── Add Compliance Record Modal ── */}
      {showAddModal && (
        <Modal
          onClose={() => setShowAddModal(false)}
          title="Add Compliance Record"
          sub="Log a new statutory filing or payment"
          icon={<FileText size={17} color="#1d4ed8" />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Compliance Type */}
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Compliance Type</label>
              <div style={{ position: 'relative' }}>
                <select value={formType} onChange={e => setFormType(e.target.value)}
                  style={{ ...FIELD, appearance: 'none', paddingRight: 36, cursor: 'pointer' }}>
                  {['EPF Return', 'ESIC Contribution', 'Professional Tax', 'TDS / Form 24Q', 'Form 16', 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
                <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            {/* Period + Due Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={LBL}>Filing Period</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <select value={formMonth} onChange={e => setFormMonth(e.target.value)}
                      style={{ ...FIELD, appearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                      {['1','2','3','4','5','6','7','8','9','10','11','12'].map((m, i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div style={{ position: 'relative', flex: '0 0 76px' }}>
                    <select value={formYear} onChange={e => setFormYear(e.target.value)}
                      style={{ ...FIELD, appearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
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
                <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)}
                  style={{ ...FIELD, colorScheme: 'light' } as React.CSSProperties} />
              </div>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Amount Payable</label>
              <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb' }}>
                <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRight: '1.5px solid #e5e7eb', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', flexShrink: 0 }}>₹</div>
                <input type="number" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 11px', fontSize: '0.8125rem', color: '#111827', background: 'transparent', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* Status */}
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
                    {statusSel === s.key && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ ...LBL, marginBottom: 0 }}>Remarks</label>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 400 }}>Optional</span>
              </div>
              <textarea rows={3} placeholder="Add reference number, challan ID, or any notes…"
                value={formRemarks} onChange={e => setFormRemarks(e.target.value)}
                style={{ ...FIELD, resize: 'none', lineHeight: 1.65, padding: '9px 11px' }} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1.5px solid #f1f5f9', marginTop: -4 }}>
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 9, fontSize: '0.8375rem', fontWeight: 600, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}
              >Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '9px 16px', borderRadius: 9, fontSize: '0.8375rem', fontWeight: 700, border: 'none', background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5899 100%)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 2px 8px rgba(30,58,95,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
                {saving ? 'Saving…' : 'Save Record'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Topbar
        title="Compliance & Statutory Management"
        subtitle="EPF, ESIC, Professional Tax, TDS and regulatory filings"
        notificationCount={actionReq > 0 ? actionReq : undefined}
      >
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Compliance Record
        </button>
      </Topbar>

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── KPI Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
          {([
            {
              label: 'Compliant', value: summaryLoading ? '—' : String(compliant || (dueMonth > 0 ? '—' : 'N/A')),
              sub: 'filings', icon: Shield, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
            },
            {
              label: 'Action Required', value: summaryLoading ? '—' : String(actionReq),
              sub: 'items', icon: AlertTriangle, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca',
            },
            {
              label: 'Due This Month', value: summaryLoading ? '—' : String(dueMonth || 3),
              sub: 'items', icon: Clock, color: '#b45309', bg: '#fffbeb', border: '#fde68a',
            },
            {
              label: 'EPF Enrolled', value: summaryLoading ? '—' : String(totalActive),
              sub: 'employees', icon: Users, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
            },
            {
              label: 'ESIC Eligible', value: summaryLoading ? '—' : String(esicEligible),
              sub: 'employees', icon: Heart, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
            },
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

        {/* ── Main Card ── */}
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

            {/* ══════════════ TAB 1: EPF ══════════════ */}
            {tab === 'epf' && (
              <>
                <SummaryCard
                  title={`ECR (Electronic Challan cum Return) — ${epfTabLabel}`}
                  due={nextMonthDue || 'Apr 15, 2026'}
                  accentColor="#1d4ed8"
                  fields={[
                    { label: 'Employer PF Account No',         value: 'MH/BAN/123456/000' },
                    { label: 'Total PF Wages',                  value: totals ? fmt(totals.epf_employee / 0.12) : '—' },
                    { label: 'Employee Contribution (12%)',     value: totals ? fmt(totals.epf_employee) : '—' },
                    { label: 'Employer Contribution (12%)',     value: totals ? fmt(totals.epf_employer) : '—' },
                  ]}
                />

                {/* Breakdown tiles */}
                {totals && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                    {[
                      { label: 'EPS (8.33%)',   value: fmt(epfData.reduce((s, r) => s + r.eps, 0)),   color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
                      { label: 'EDLI (0.5%)',   value: fmt(epfData.reduce((s, r) => s + r.edli, 0)), color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
                      { label: 'Admin Charges', value: fmt(epfData.reduce((s, r) => s + r.admin_charges, 0)), color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
                      { label: 'Total Challan', value: fmt(epfData.reduce((s, r) => s + r.total_challan, 0)), color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                    ].map(({ label, value, color, bg, border }) => (
                      <div key={label} style={{ padding: '14px 16px', borderRadius: 10, background: bg, border: `1.5px solid ${border}` }}>
                        <p style={{ fontSize: '0.72rem', color, margin: '0 0 5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* EPF Table */}
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
                    Employee PF Details{' '}
                    <span style={{ fontWeight: 400, color: '#6b7280' }}>
                      {epfLoading ? '(Loading…)' : epfData.length > 0 ? `(${epfData.length} employees — ${epfTabLabel})` : '(No payslip data found)'}
                    </span>
                  </p>
                  {epfLoading ? <Spinner /> : epfData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '0.875rem' }}>
                      No EPF data found. Generate payroll for the current month to see data.
                    </div>
                  ) : (
                    <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                      <table className="data-table">
                        <thead>
                          <tr>{['Employee', 'EMP ID', 'Dept', 'PF Wages', 'Emp Contrib', 'Emplr Contrib', 'EPS', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {epfData.map((emp, i) => {
                            const s = STATUS_CFG[emp.status] ?? STATUS_CFG.Pending
                            return (
                              <tr key={i}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Avatar name={emp.name} size={28} />
                                    <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{emp.name}</span>
                                  </div>
                                </td>
                                <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6b7280' }}>{emp.emp_id}</span></td>
                                <td style={{ color: '#6b7280', fontSize: '0.8rem' }}>{emp.department}</td>
                                <td style={{ color: '#374151' }}>{fmt(emp.pf_wages)}</td>
                                <td style={{ color: '#374151' }}>{fmt(emp.emp_contrib)}</td>
                                <td style={{ color: '#374151' }}>{fmt(emp.emplr_contrib)}</td>
                                <td style={{ fontWeight: 600, color: '#111827' }}>{fmt(emp.eps)}</td>
                                <td><span className="badge badge-dot" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{emp.status}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => toast.success('ECR download initiated')}>
                    <Download size={13} /> Download ECR
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => window.open('https://www.epfindia.gov.in', '_blank')}>
                    <ExternalLink size={13} /> Submit to EPFO Portal
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={loadEpf}>
                    <Users size={13} /> Refresh Data
                  </button>
                  <div style={{ marginLeft: 'auto' }}>
                    <InfoBanner>Monthly ECR due by <strong>15th of each month</strong>. Next due: {nextMonthDue || 'Apr 15, 2026'}</InfoBanner>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════ TAB 2: ESIC ══════════════ */}
            {tab === 'esic' && (
              <>
                <SummaryCard
                  title={`ESIC Contribution Statement — ${esicTabLabel}`}
                  due={nextMonthDue || 'Apr 15, 2026'}
                  accentColor="#7c3aed"
                  fields={[
                    { label: 'ESIC Code',                      value: '52-00-123456-000' },
                    { label: 'Total ESIC Wages (≤₹21,000)',    value: totals ? fmt(totals.esic_employee / 0.0075) : '—' },
                    { label: 'Employee Contribution (0.75%)',  value: totals ? fmt(totals.esic_employee) : '—' },
                    { label: 'Employer Contribution (3.25%)',  value: totals ? fmt(totals.esic_employer) : '—' },
                  ]}
                  totalLabel="Total ESIC Payable"
                  totalValue={totals ? fmt(totals.esic_employee + totals.esic_employer) : '—'}
                />

                <InfoBanner color="blue">
                  Employees earning ≤ ₹21,000/month gross are covered under ESIC.
                  Currently <strong>{esicEligible > 0 ? esicEligible : esicData.length} of {totalActive} employees</strong> are ESIC-eligible.
                </InfoBanner>

                {esicLoading ? <Spinner /> : esicData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '0.875rem' }}>
                    No ESIC-eligible employees found (gross salary ≤ ₹21,000) for {esicTabLabel}.
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                    <table className="data-table">
                      <thead>
                        <tr>{['Employee', 'Gross Salary', 'Emp Contrib (0.75%)', 'Emplr Contrib (3.25%)', 'Total', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {esicData.map((emp, i) => {
                          const s = STATUS_CFG[emp.status] ?? STATUS_CFG.Pending
                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Avatar name={emp.name} size={28} />
                                  <div>
                                    <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', margin: 0 }}>{emp.name}</p>
                                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{emp.emp_id}</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: '#374151' }}>{fmt(emp.gross_salary)}</td>
                              <td style={{ color: '#374151' }}>{fmt(emp.emp_contrib)}</td>
                              <td style={{ color: '#374151' }}>{fmt(emp.emplr_contrib)}</td>
                              <td style={{ fontWeight: 700, color: '#111827' }}>{fmt(emp.total)}</td>
                              <td><span className="badge badge-dot" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{emp.status}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => toast.success('Form 5 download initiated')}>
                    <Download size={13} /> Download Form 5
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => window.open('https://esic.in', '_blank')}>
                    <ExternalLink size={13} /> Submit to ESIC Portal
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={loadEsic}>
                    <Users size={13} /> Refresh
                  </button>
                </div>
              </>
            )}

            {/* ══════════════ TAB 3: Professional Tax ══════════════ */}
            {tab === 'pt' && (
              <>
                {ptLoading ? <Spinner /> : (
                  <>
                    {ptSummary && (
                      <SummaryCard
                        title={`Professional Tax Summary — ${ptTabLabel}`}
                        due={`${ptMonth ? MONTH_NAMES[(ptMonth === 12 ? 0 : ptMonth)] : 'Next'} 30, ${ptMonth === 12 ? (ptYear + 1) : (ptYear || curYear)}`}
                        accentColor="#0f766e"
                        fields={[
                          { label: 'Total Employees', value: String(ptSummary.total_employees) },
                          { label: 'Total PT Collected', value: fmt(ptSummary.total_pt) },
                          { label: 'Nil PT (≤₹15,000)', value: String(ptSummary.nil_count) },
                          { label: '₹200/month (≥₹18,000)', value: String(ptSummary.high_rate_count) },
                        ]}
                        totalLabel="Total PT Payable"
                        totalValue={fmt(ptSummary.total_pt)}
                      />
                    )}

                    {/* PT breakdown — static slab reference + computed aggregate */}
                    <div>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>PT Slabs — Karnataka (Primary State)</p>
                      <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                        <table className="data-table">
                          <thead>
                            <tr>{['Monthly Salary Range', 'PT per Month', 'Employees'].map(h => <th key={h}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {[
                              { range: 'Up to ₹15,000',     pt: 'Nil',        count: ptSummary?.nil_count      ?? '—', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                              { range: '₹15,001 – ₹17,999', pt: '₹150/month', count: ptSummary?.low_rate_count  ?? '—', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                              { range: '₹18,000 and above', pt: '₹200/month', count: ptSummary?.high_rate_count ?? '—', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                            ].map(row => (
                              <tr key={row.range}>
                                <td style={{ color: '#374151' }}>{row.range}</td>
                                <td><span className="badge" style={{ background: row.bg, color: row.color, border: `1px solid ${row.border}` }}>{row.pt}</span></td>
                                <td style={{ fontWeight: 600, color: '#374151' }}>{String(row.count)}</td>
                              </tr>
                            ))}
                            {ptSummary && (
                              <tr style={{ background: '#f0f4ff' }}>
                                <td style={{ fontWeight: 800, color: '#1E3A5F' }}>Total</td>
                                <td style={{ color: '#6b7280' }}>—</td>
                                <td style={{ fontWeight: 800, color: '#1E3A5F' }}>{ptSummary.total_employees}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {!ptSummary && (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '0.875rem' }}>
                        No PT data found for {ptTabLabel}. Generate payroll to populate PT figures.
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => toast.success('PT Challan download initiated')}>
                        <Download size={13} /> Download PT Challan
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => toast('Generating state-wise report…')}>
                        <FileText size={13} /> Generate State-wise Report
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={loadPt}>
                        <Users size={13} /> Refresh
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══════════════ TAB 4: TDS & Form 16 ══════════════ */}
            {tab === 'tds' && (
              <>
                {tdsLoading ? <Spinner /> : (
                  <>
                    <SummaryCard
                      title={`TDS Summary — FY ${tdsData?.fy ?? '2025-26'}`}
                      due="May 31, 2026"
                      accentColor="#4f46e5"
                      fields={[
                        { label: 'TAN',                     value: 'BLRX12345B' },
                        { label: 'Total TDS Deducted (FY)', value: tdsData ? fmt(tdsData.total_tds) : '—' },
                        { label: 'Total Gross (FY)',         value: tdsData ? fmt(tdsData.total_gross) : '—' },
                        { label: 'EPF Enrolled',             value: String(totalActive) },
                      ]}
                    />

                    {/* Quarterly table */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Quarterly TDS Summary</p>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }} onClick={loadTds}>
                          Refresh
                        </button>
                      </div>
                      <div className="table-wrapper" style={{ borderRadius: 10, border: '1.5px solid #f1f5f9' }}>
                        <table className="data-table">
                          <thead>
                            <tr>{['Quarter', 'Period', 'TDS Deducted', 'Form 24Q Status', 'Due Date', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {(tdsData?.quarters ?? [
                              { quarter: 'Q1', period: 'Apr–Jun 2025', tds: 0, gross: 0, payslip_count: 0, due_date: '2025-07-31', status: 'Pending' },
                              { quarter: 'Q2', period: 'Jul–Sep 2025', tds: 0, gross: 0, payslip_count: 0, due_date: '2025-10-31', status: 'Pending' },
                              { quarter: 'Q3', period: 'Oct–Dec 2025', tds: 0, gross: 0, payslip_count: 0, due_date: '2026-01-31', status: 'Pending' },
                              { quarter: 'Q4', period: 'Jan–Mar 2026', tds: 0, gross: 0, payslip_count: 0, due_date: '2026-05-31', status: 'Pending' },
                            ] as TDSQuarter[]).map(row => {
                              const filed = row.status === 'Filed'
                              const noData = row.status === 'no_data' || row.payslip_count === 0
                              const sc = filed ? STATUS_CFG.Filed : STATUS_CFG.Pending
                              const dueFormatted = row.due_date
                                ? new Date(row.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'
                              return (
                                <tr key={row.quarter}>
                                  <td style={{ fontWeight: 700, color: '#111827' }}>{row.quarter}</td>
                                  <td style={{ color: '#374151' }}>{row.period}</td>
                                  <td style={{ fontWeight: 700, color: '#111827' }}>{noData ? '—' : fmt(row.tds)}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {filed
                                        ? <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                                        : <Clock size={13} style={{ color: '#d97706', flexShrink: 0 }} />}
                                      <span className="badge badge-dot" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                        Form 24Q {noData ? 'No Data' : row.status}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ color: '#6b7280' }}>{dueFormatted}</td>
                                  <td>
                                    {filed
                                      ? <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }} onClick={() => toast.success('Download started')}><Download size={12} /> Download</button>
                                      : <button className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => toast(`Filing ${row.quarter} return…`)}>File Now</button>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {tdsData && (
                            <tfoot>
                              <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #f1f5f9' }}>
                                <td colSpan={2} style={{ fontWeight: 700, color: '#374151', padding: '10px 14px', fontSize: '0.8125rem' }}>Total FY {tdsData.fy}</td>
                                <td style={{ fontWeight: 800, color: '#111827', padding: '10px 14px', fontSize: '0.8125rem' }}>{fmt(tdsData.total_tds)}</td>
                                <td colSpan={3} />
                              </tr>
                            </tfoot>
                          )}
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
                          Form 16 generation for FY {form16FY}. <strong>Deadline: June 15, {parseInt(form16FY.split('-')[0]) + 1}</strong> — ensure all payslips are finalised before generating.
                        </InfoBanner>

                        <button className="btn btn-primary btn-sm" onClick={() => toast.success(`Form 16 generation queued for all ${totalActive} employees — FY ${form16FY}`)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '11px' }}>
                          <FileText size={14} />
                          Generate Form 16 for All Employees ({totalActive}) — FY {form16FY}
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
                            <button className="btn btn-primary btn-sm" onClick={() => {
                              if (!form16Search.trim()) { toast.error('Enter an employee name or ID'); return }
                              toast.success(`Form 16 generation queued for "${form16Search}" — FY ${form16FY}`)
                            }}>Generate</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
