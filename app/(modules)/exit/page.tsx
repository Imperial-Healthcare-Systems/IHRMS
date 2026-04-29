'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  UserMinus, LogOut, IndianRupee, Clock, X,
  CheckCircle2, Eye, FileText, Settings2, RefreshCw,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type ExitTab = 'exit' | 'fnf' | 'probation'
type ExitType = 'Resignation' | 'Termination' | 'Retirement' | 'Contract End' | 'Mutual Separation'
type ProbationOutcome = 'Confirmed' | 'Extended' | 'Terminated'

interface ApiExit {
  id: string
  employee_id: string
  exit_type: string
  reason: string | null
  resignation_date: string | null
  last_working_date: string | null
  notice_period_days: number | null
  status: string
  created_at: string
  employee: {
    id: string; first_name: string; last_name: string; emp_id: string | null
    department: { id: string; name: string } | null
    designation: { id: string; title: string } | null
  } | null
}

/* localStorage-backed state shapes */
interface ExitLocalState {
  clearance: Record<string, boolean>   // hr/it/finance/manager/admin
  fnf_paid: boolean
  fnf_amount: number | null
  fnf_date: string | null
  experience_letter: boolean
}

interface ApiProbEmp {
  id: string
  first_name: string
  last_name: string
  emp_id: string | null
  date_of_joining: string | null
  probation_end_date: string | null
  status: string
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
}

interface ApiSelectEmp {
  id: string
  first_name: string
  last_name: string
  emp_id: string | null
}

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F','#E8622A','#1A7A4A','#7C3AED','#0369A1','#BE185D','#0F766E','#B45309']

const EXIT_TYPE_CFG: Record<ExitType, { bg: string; color: string; border: string }> = {
  Resignation:          { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Termination:          { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  Retirement:           { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Contract End':       { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  'Mutual Separation':  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
}

const STATUS_CFG: Record<string, { bg: string; color: string; border: string }> = {
  initiated:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  cleared:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  completed:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

const CLEARANCE_DEFS = [
  { id: 'hr',      label: 'HR Clearance',      description: 'Clear pending leaves, update records' },
  { id: 'it',      label: 'IT Clearance',       description: 'Return laptop, revoke access' },
  { id: 'finance', label: 'Finance Clearance',  description: 'No pending expense claims' },
  { id: 'manager', label: 'Manager Clearance',  description: 'Knowledge transfer done' },
  { id: 'admin',   label: 'Admin Clearance',    description: 'Return ID card, access card' },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function toExitType(raw: string): ExitType {
  const map: Record<string, ExitType> = {
    resignation:       'Resignation',
    termination:       'Termination',
    retirement:        'Retirement',
    end_of_contract:   'Contract End',
    mutual_separation: 'Mutual Separation',
    absconding:        'Termination',
    death:             'Retirement',
  }
  return map[raw] ?? 'Resignation'
}

function fromExitType(t: ExitType): string {
  const map: Record<ExitType, string> = {
    Resignation:         'resignation',
    Termination:         'termination',
    Retirement:          'retirement',
    'Contract End':      'end_of_contract',
    'Mutual Separation': 'mutual_separation',
  }
  return map[t]
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysRemaining(endDate: string | null | undefined): number {
  if (!endDate) return 0
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

/* ─────────────────────────────────────────────────────────────
   localStorage helpers (schema-independent persistence)
───────────────────────────────────────────────────────────── */
const LS_KEY = (id: string) => `ihrms_exit_${id}`

const DEFAULT_LOCAL: ExitLocalState = {
  clearance: { hr: false, it: false, finance: false, manager: false, admin: false },
  fnf_paid: false, fnf_amount: null, fnf_date: null,
  experience_letter: false,
}

function loadLocal(id: string): ExitLocalState {
  if (typeof window === 'undefined') return DEFAULT_LOCAL
  try { return { ...DEFAULT_LOCAL, ...JSON.parse(localStorage.getItem(LS_KEY(id)) ?? '{}') } }
  catch { return DEFAULT_LOCAL }
}

function saveLocal(id: string, state: ExitLocalState) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY(id), JSON.stringify(state)) } catch {}
}

/* ─────────────────────────────────────────────────────────────
   ATOM COMPONENTS
───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx], flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function ExitTypeBadge({ type }: { type: ExitType }) {
  const c = EXIT_TYPE_CFG[type]
  return <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{type}</span>
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.initiated
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Initiated'
  return <span className="badge badge-dot" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{label}</span>
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${size > 24 ? 3 : 2}px solid #e5e7eb`,
      borderTopColor: '#1E3A5F',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, sub, wide, header, children }: {
  open: boolean; onClose: () => void; title?: string; sub?: string; wide?: boolean
  header?: React.ReactNode; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="relative bg-white flex flex-col" style={{
        width: wide ? '640px' : '480px', maxWidth: '95vw', maxHeight: '90vh',
        borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
      }}>
        {header ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {header}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', flexShrink: 0,
              }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between px-6 pt-5 pb-4"
            style={{ borderBottom: '1.5px solid #f1f5f9', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
              {sub && <p style={{ fontSize: '0.775rem', color: '#9ca3af', margin: '3px 0 0', fontWeight: 400 }}>{sub}</p>}
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon" style={{ marginTop: -2 }}><X size={15} /></button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '9px 12px', fontSize: '0.875rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ExitPage() {
  const [tab, setTab] = useState<ExitTab>('exit')
  const [exits, setExits]         = useState<ApiExit[]>([])
  const [probEmps, setProbEmps]   = useState<ApiProbEmp[]>([])
  const [allEmps, setAllEmps]     = useState<ApiSelectEmp[]>([])
  const [loading, setLoading]     = useState(true)

  /* localStorage map: exitId → local state */
  const [localMap, setLocalMap] = useState<Record<string, ExitLocalState>>({})

  /* Modal state */
  const [showInitiateModal, setShowInitiateModal]   = useState(false)
  const [showManageModal, setShowManageModal]         = useState(false)
  const [showFnFModal, setShowFnFModal]               = useState(false)
  const [showProbModal, setShowProbModal]             = useState(false)
  const [selectedExitId, setSelectedExitId]           = useState<string | null>(null)
  const [selectedProbId, setSelectedProbId]           = useState<string | null>(null)

  /* Clearance (mirrors localMap[selectedExitId].clearance for the open modal) */
  const [clearance, setClearance]           = useState<Record<string, boolean>>({ hr: false, it: false, finance: false, manager: false, admin: false })
  const [savingClearance, setSavingClearance] = useState(false)

  /* FnF */
  const [fnfAmount, setFnfAmount]   = useState('')
  const [savingFnF, setSavingFnF]   = useState(false)

  /* Probation review */
  const [probRating, setProbRating]     = useState('4')
  const [probOutcome, setProbOutcome]   = useState<ProbationOutcome>('Confirmed')
  const [probExtend, setProbExtend]     = useState('3')
  const [probRemarks, setProbRemarks]   = useState('')
  const [probEffDate, setProbEffDate]   = useState('')
  const [savingReview, setSavingReview] = useState(false)

  /* Initiate Exit form */
  const [initEmployee, setInitEmployee]         = useState('')
  const [initExitType, setInitExitType]         = useState<ExitType>('Resignation')
  const [initResignDate, setInitResignDate]     = useState('')
  const [initLastDate, setInitLastDate]         = useState('')
  const [initNoticePeriod, setInitNoticePeriod] = useState('30')
  const [initReason, setInitReason]             = useState('')
  const [submittingExit, setSubmittingExit]     = useState(false)

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [exitRes, probRes] = await Promise.all([
        fetch('/api/exit?limit=100').then(r => r.json()),
        fetch('/api/employees?status=probation&limit=200').then(r => r.json()),
      ])
      setExits(exitRes.data ?? [])
      setProbEmps(probRes.data ?? [])
    } catch {
      toast.error('Failed to load exit data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    fetch('/api/employees?limit=500')
      .then(r => r.json())
      .then(j => setAllEmps(j.data ?? []))
      .catch(() => {})
  }, [loadData])

  /* Populate localMap from localStorage once exits are loaded */
  useEffect(() => {
    if (exits.length === 0) return
    const map: Record<string, ExitLocalState> = {}
    exits.forEach(e => { map[e.id] = loadLocal(e.id) })
    setLocalMap(map)
  }, [exits])

  /* ── Derived ── */
  const selectedExit    = exits.find(e => e.id === selectedExitId) ?? null
  const selectedProbEmp = probEmps.find(e => e.id === selectedProbId) ?? null
  const currentMonth    = new Date().toISOString().slice(0, 7)

  const getLocal = (id: string) => localMap[id] ?? DEFAULT_LOCAL

  const noticePeriodCount = exits.filter(e => e.status !== 'completed').length
  const exitThisMonth     = exits.filter(e => e.last_working_date?.startsWith(currentMonth)).length
  const fnfPendingCount   = exits.filter(e => !getLocal(e.id).fnf_paid).length
  const probDueCount      = probEmps.filter(e => daysRemaining(e.probation_end_date) <= 30).length

  const clearanceCount = Object.values(clearance).filter(Boolean).length

  /* ── Open Manage Modal ── */
  const openManage = (exitId: string) => {
    const loc = getLocal(exitId)
    setClearance({ ...loc.clearance })
    setSelectedExitId(exitId)
    setShowManageModal(true)
  }

  /* ── Open FnF Modal ── */
  const openFnF = (exitId: string) => {
    const loc = getLocal(exitId)
    setFnfAmount(loc.fnf_amount ? String(loc.fnf_amount) : '')
    setSelectedExitId(exitId)
    setShowFnFModal(true)
  }

  /* ── Open Probation Modal ── */
  const openProbReview = (empId: string) => {
    setSelectedProbId(empId)
    setProbRating('4')
    setProbOutcome('Confirmed')
    setProbRemarks('')
    setProbEffDate('')
    setShowProbModal(true)
  }

  /* ── Save Clearance (localStorage + API status update) ── */
  const saveClearance = async () => {
    if (!selectedExit) return
    setSavingClearance(true)
    try {
      const allDone = Object.values(clearance).every(Boolean)
      const updated: ExitLocalState = { ...getLocal(selectedExit.id), clearance }
      saveLocal(selectedExit.id, updated)
      setLocalMap(prev => ({ ...prev, [selectedExit.id]: updated }))

      // Only PATCH status if all cleared — avoids touching any missing columns
      if (allDone) {
        const res = await fetch(`/api/exit/${selectedExit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all_clearance_done: true }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed')
        setExits(prev => prev.map(e =>
          e.id === selectedExit.id ? { ...e, status: json.data?.status ?? 'cleared' } : e
        ))
      }
      toast.success(allDone ? 'All clearances done — status set to Cleared' : 'Clearance progress saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save clearance')
    } finally {
      setSavingClearance(false)
    }
  }

  /* ── Mark Experience Letter (localStorage only) ── */
  const markExperienceLetter = () => {
    if (!selectedExit) return
    const updated: ExitLocalState = { ...getLocal(selectedExit.id), experience_letter: true }
    saveLocal(selectedExit.id, updated)
    setLocalMap(prev => ({ ...prev, [selectedExit.id]: updated }))
    toast.success('Experience letter marked as issued')
  }

  /* ── Approve FnF (localStorage + API status + employee termination) ── */
  const approveFnF = async () => {
    if (!selectedExit) return
    const amount = parseFloat(fnfAmount)
    if (!fnfAmount || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid FnF amount')
      return
    }
    setSavingFnF(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const updated: ExitLocalState = {
        ...getLocal(selectedExit.id),
        fnf_paid: true, fnf_amount: amount, fnf_date: today,
      }
      saveLocal(selectedExit.id, updated)
      setLocalMap(prev => ({ ...prev, [selectedExit.id]: updated }))

      const res = await fetch(`/api/exit/${selectedExit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fnf_approved: true,
          employee_id_to_terminate: selectedExit.employee_id,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to approve FnF')
      setExits(prev => prev.map(e =>
        e.id === selectedExit.id ? { ...e, status: 'completed' } : e
      ))
      toast.success('FnF approved and marked as paid')
      setShowFnFModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve FnF')
    } finally {
      setSavingFnF(false)
    }
  }

  /* ── Submit Probation Review ── */
  const submitProbationReview = async () => {
    if (!selectedProbEmp) return
    if (!probEffDate) { toast.error('Effective date is required'); return }
    setSavingReview(true)
    try {
      const newStatus = probOutcome === 'Confirmed' ? 'active'
        : probOutcome === 'Terminated' ? 'terminated'
        : 'probation'
      const res = await fetch(`/api/employees/${selectedProbEmp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update employee')
      if (probOutcome !== 'Extended') {
        setProbEmps(prev => prev.filter(e => e.id !== selectedProbEmp.id))
      }
      toast.success(`Probation review submitted — Employee ${probOutcome.toLowerCase()}`)
      setShowProbModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSavingReview(false)
    }
  }

  /* ── Initiate Exit ── */
  const handleInitiateExit = async () => {
    if (!initEmployee || !initLastDate || !initReason) {
      toast.error('Employee, last working date, and reason are required')
      return
    }
    setSubmittingExit(true)
    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id:        initEmployee,
          exit_type:          fromExitType(initExitType),
          resignation_date:   initResignDate || null,
          last_working_date:  initLastDate,
          notice_period_days: parseInt(initNoticePeriod) || 30,
          reason:             initReason,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to initiate exit')
      toast.success('Exit process initiated successfully')
      setShowInitiateModal(false)
      setInitEmployee(''); setInitReason(''); setInitLastDate('')
      setInitResignDate(''); setInitNoticePeriod('30'); setInitExitType('Resignation')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate exit')
    } finally {
      setSubmittingExit(false)
    }
  }

  /* ── UI helpers ── */
  const exitTypeCfg = EXIT_TYPE_CFG[initExitType]
  const EXIT_TYPE_DESC: Record<ExitType, string> = {
    Resignation:         'Employee voluntarily leaving the organisation.',
    Termination:         'Employment ended by the company.',
    Retirement:          'Employee reaching superannuation age.',
    'Contract End':      'Fixed-term contract completing its tenure.',
    'Mutual Separation': 'Both parties agreed to end employment.',
  }

  const TABS: { key: ExitTab; label: string; count: number }[] = [
    { key: 'exit',      label: 'Exit Management',   count: exits.length },
    { key: 'fnf',       label: 'FnF Settlement',    count: exits.filter(e => !getLocal(e.id).fnf_paid).length },
    { key: 'probation', label: 'Probation Tracking', count: probEmps.length },
  ]

  const SEL: React.CSSProperties = { ...FIELD_STYLE, appearance: 'none', paddingRight: 32, cursor: 'pointer' }
  const chevron = (
    <svg style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )

  return (
    <>
      {/* ── Initiate Exit Modal ── */}
      <Modal open={showInitiateModal} onClose={() => setShowInitiateModal(false)} title="Initiate Exit Process" sub="Record a new employee exit or separation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Employee */}
          <div>
            <label style={LABEL_STYLE}>Employee <span style={{ color: '#dc2626' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <select value={initEmployee} onChange={e => setInitEmployee(e.target.value)} style={SEL}>
                <option value="">Select employee…</option>
                {allEmps.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}{e.emp_id ? ` (${e.emp_id})` : ''}
                  </option>
                ))}
              </select>
              {chevron}
            </div>
          </div>

          {/* Exit Type */}
          <div>
            <label style={LABEL_STYLE}>Exit Type</label>
            <div style={{ position: 'relative' }}>
              <select value={initExitType} onChange={e => setInitExitType(e.target.value as ExitType)} style={SEL}>
                {(['Resignation','Termination','Retirement','Contract End','Mutual Separation'] as ExitType[]).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              {chevron}
            </div>
            <div style={{ marginTop: 7, padding: '8px 12px', borderRadius: 8, background: exitTypeCfg.bg, border: `1px solid ${exitTypeCfg.border}`, fontSize: '0.775rem', color: exitTypeCfg.color, lineHeight: 1.4 }}>
              {EXIT_TYPE_DESC[initExitType]}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>
                {initExitType === 'Termination' ? 'Termination Date' : initExitType === 'Retirement' ? 'Retirement Date' : 'Resignation Date'}
              </label>
              <input type="date" value={initResignDate} onChange={e => setInitResignDate(e.target.value)} style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Last Working Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" value={initLastDate} onChange={e => setInitLastDate(e.target.value)} style={FIELD_STYLE} />
            </div>
          </div>

          {/* Notice Period */}
          <div>
            <label style={LABEL_STYLE}>Notice Period</label>
            <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb' }}>
              <input
                type="number" value={initNoticePeriod} onChange={e => setInitNoticePeriod(e.target.value)}
                placeholder="30"
                style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 12px', fontSize: '0.875rem', color: '#111827', background: 'transparent', fontFamily: 'inherit' }}
              />
              <div style={{ padding: '9px 14px', background: '#f1f5f9', borderLeft: '1.5px solid #e5e7eb', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', flexShrink: 0 }}>days</div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={LABEL_STYLE}>Reason for Exit <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              rows={3} value={initReason} onChange={e => setInitReason(e.target.value)}
              placeholder={initExitType === 'Resignation' ? 'e.g. Better opportunity, relocation, personal reasons…' : 'Describe the circumstances leading to exit…'}
              style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1.5px solid #f1f5f9' }}>
            <button onClick={() => setShowInitiateModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={handleInitiateExit}
              disabled={!initEmployee || !initLastDate || !initReason || submittingExit}
              className="btn btn-sm"
              style={{
                flex: 2,
                background: (initEmployee && initLastDate && initReason)
                  ? `linear-gradient(135deg, ${exitTypeCfg.color} 0%, ${exitTypeCfg.color}cc 100%)`
                  : '#e5e7eb',
                color: (initEmployee && initLastDate && initReason) ? 'white' : '#9ca3af',
                border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8375rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: (initEmployee && initLastDate && initReason) ? 'pointer' : 'not-allowed',
              }}
            >
              <LogOut size={14} /> {submittingExit ? 'Processing…' : 'Initiate Exit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Manage Exit / Clearance Modal ── */}
      <Modal
        open={showManageModal && !!selectedExit}
        onClose={() => setShowManageModal(false)}
        wide
        header={selectedExit ? (() => {
          const _empName  = `${selectedExit.employee?.first_name ?? ''} ${selectedExit.employee?.last_name ?? ''}`
          const _exitType = toExitType(selectedExit.exit_type)
          const _etCfg    = EXIT_TYPE_CFG[_exitType]
          const _stCfg    = STATUS_CFG[selectedExit.status] ?? STATUS_CFG.initiated
          const _stLabel  = selectedExit.status.charAt(0).toUpperCase() + selectedExit.status.slice(1)
          const _initials = _empName.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
          return (
            <div style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
              padding: '20px 24px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: 'rgba(255,255,255,0.14)',
                border: '2px solid rgba(255,255,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.125rem', fontWeight: 800, color: '#fff',
                letterSpacing: '-0.01em',
              }}>{_initials}</div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: '0 0 5px', lineHeight: 1.2 }}>{_empName}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
                  {selectedExit.employee?.designation?.title && (
                    <span style={{ fontSize: '0.775rem', color: '#bfdbfe', fontWeight: 500 }}>{selectedExit.employee.designation.title}</span>
                  )}
                  {selectedExit.employee?.department?.name && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>•</span>
                      <span style={{ fontSize: '0.775rem', color: '#bfdbfe', fontWeight: 500 }}>{selectedExit.employee.department.name}</span>
                    </>
                  )}
                  {selectedExit.employee?.emp_id && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>•</span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(191,219,254,0.75)', fontFamily: 'monospace', fontWeight: 500 }}>{selectedExit.employee.emp_id}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges (right, padded away from close btn) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, paddingRight: 38, flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: _etCfg.bg, color: _etCfg.color, border: `1px solid ${_etCfg.border}`,
                }}>{_exitType}</span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: _stCfg.bg, color: _stCfg.color, border: `1px solid ${_stCfg.border}`,
                }}>{_stLabel}</span>
              </div>
            </div>
          )
        })() : undefined}
      >
        {selectedExit && (() => {
          const selLocal = getLocal(selectedExit.id)
          const exitType = toExitType(selectedExit.exit_type)
          const etCfg    = EXIT_TYPE_CFG[exitType]
          const stCfg    = STATUS_CFG[selectedExit.status] ?? STATUS_CFG.initiated
          const clPct    = Math.round((clearanceCount / CLEARANCE_DEFS.length) * 100)
          const allDone  = clearanceCount === CLEARANCE_DEFS.length

          const INFO_ROWS: [string, React.ReactNode, string][] = [
            ['Exit Type',         <ExitTypeBadge key="et" type={exitType} />,          etCfg.color],
            ['Resignation Date',  fmtDate(selectedExit.resignation_date),               '#1E3A5F'],
            ['Last Working Date', fmtDate(selectedExit.last_working_date),              '#b91c1c'],
            ['Notice Period',     selectedExit.notice_period_days ? `${selectedExit.notice_period_days} days` : '—', '#6b7280'],
            ['Current Status',    <StatusBadge key="st" status={selectedExit.status} />, stCfg.color],
            ['Exp. Letter',       selLocal.experience_letter
              ? <span key="el" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.8rem', fontWeight:700, color:'#15803d' }}><CheckCircle2 size={13}/> Issued</span>
              : <span key="el" style={{ fontSize:'0.8rem', fontWeight:500, color:'#9ca3af' }}>Pending</span>,
              '#9ca3af'],
          ]

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* ── Info Strip ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {INFO_ROWS.map(([label, value, accent]) => (
                  <div key={label} style={{
                    padding: '10px 13px', borderRadius: 10,
                    background: '#fff',
                    borderTop: `3px solid ${accent}`,
                    borderRight: '1.5px solid #e5e7eb',
                    borderBottom: '1.5px solid #e5e7eb',
                    borderLeft: '1.5px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <p style={{ fontSize: '0.67rem', color: '#9ca3af', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</p>
                    {typeof value === 'string'
                      ? <p style={{ fontSize: '0.8375rem', fontWeight: 700, color: '#111827', margin: 0 }}>{value}</p>
                      : value}
                  </div>
                ))}
              </div>

              {/* ── Clearance Checklist ── */}
              <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Clearance Checklist</p>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                        background: allDone ? '#f0fdf4' : '#fffbeb',
                        color:      allDone ? '#15803d' : '#b45309',
                        border:     `1px solid ${allDone ? '#bbf7d0' : '#fde68a'}`,
                      }}>
                        {clearanceCount} / {CLEARANCE_DEFS.length} cleared
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99, transition: 'width 400ms ease',
                        width: `${clPct}%`,
                        background: allDone
                          ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                          : 'linear-gradient(90deg,#1E3A5F,#3b82f6)',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CLEARANCE_DEFS.map((item, idx) => {
                    const cleared = clearance[item.id] ?? false
                    const icons = ['🧑‍💼','💻','💰','👔','🪪']
                    return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 9,
                        border: `1.5px solid ${cleared ? '#bbf7d0' : '#e5e7eb'}`,
                        background: cleared ? '#f0fdf4' : '#fff',
                        transition: 'all 200ms ease',
                        boxShadow: cleared ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          {/* Checkbox */}
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                            border: `2px solid ${cleared ? '#16a34a' : '#d1d5db'}`,
                            background: cleared ? '#16a34a' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 200ms',
                          }}>
                            {cleared && (
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icons[idx]}</span>
                          <div>
                            <p style={{ fontSize: '0.8125rem', fontWeight: cleared ? 500 : 600, color: cleared ? '#6b7280' : '#111827', margin: 0, textDecoration: cleared ? 'line-through' : 'none' }}>{item.label}</p>
                            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0, marginTop: 1 }}>{item.description}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setClearance(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          style={{
                            flexShrink: 0, fontSize: '0.72rem', fontWeight: 600,
                            padding: '5px 11px', borderRadius: 7, cursor: 'pointer',
                            transition: 'all 150ms',
                            border: cleared ? '1.5px solid #fecaca' : '1.5px solid #bbf7d0',
                            background: cleared ? '#fef2f2' : '#f0fdf4',
                            color: cleared ? '#dc2626' : '#15803d',
                          }}>
                          {cleared ? '↩ Undo' : '✓ Clear'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Action Footer ── */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1.5px solid #f1f5f9', alignItems: 'center' }}>
                {/* Left group */}
                <button
                  onClick={markExperienceLetter}
                  disabled={selLocal.experience_letter}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 13px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                    cursor: selLocal.experience_letter ? 'default' : 'pointer',
                    border: '1.5px solid #e5e7eb',
                    background: selLocal.experience_letter ? '#f0fdf4' : '#fff',
                    color: selLocal.experience_letter ? '#15803d' : '#374151',
                    transition: 'all 150ms',
                  }}>
                  <FileText size={13} />
                  {selLocal.experience_letter ? 'Letter Issued ✓' : 'Experience Letter'}
                </button>

                <div style={{ flex: 1 }} />

                {/* Right group */}
                <button
                  onClick={saveClearance}
                  disabled={savingClearance}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                    cursor: savingClearance ? 'not-allowed' : 'pointer',
                    border: '1.5px solid #1E3A5F40',
                    background: '#eff6ff', color: '#1E3A5F',
                    transition: 'all 150ms',
                  }}>
                  <CheckCircle2 size={13} />
                  {savingClearance ? 'Saving…' : 'Save Clearance'}
                </button>

                <button
                  onClick={() => { setShowManageModal(false); openFnF(selectedExit.id) }}
                  disabled={selLocal.fnf_paid}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                    cursor: selLocal.fnf_paid ? 'default' : 'pointer',
                    border: 'none',
                    background: selLocal.fnf_paid
                      ? '#f0fdf4'
                      : 'linear-gradient(135deg,#E8622A 0%,#d4501e 100%)',
                    color: selLocal.fnf_paid ? '#15803d' : '#fff',
                    boxShadow: selLocal.fnf_paid ? 'none' : '0 2px 8px #E8622A40',
                    transition: 'all 150ms',
                  }}>
                  <IndianRupee size={13} />
                  {selLocal.fnf_paid ? 'FnF Settled ✓' : 'Initiate FnF'}
                </button>
              </div>

            </div>
          )
        })()}
      </Modal>

      {/* ── FnF Modal ── */}
      <Modal
        open={showFnFModal && !!selectedExit}
        onClose={() => setShowFnFModal(false)}
        title="Full & Final Settlement"
        sub={selectedExit ? `${selectedExit.employee?.first_name ?? ''} ${selectedExit.employee?.last_name ?? ''} · ${selectedExit.employee?.department?.name ?? ''}` : ''}
        wide
      >
        {selectedExit && (() => {
          const fnfLocal  = getLocal(selectedExit.id)
          const exitType  = toExitType(selectedExit.exit_type)
          const etCfg     = EXIT_TYPE_CFG[exitType]
          const empName   = `${selectedExit.employee?.first_name ?? ''} ${selectedExit.employee?.last_name ?? ''}`
          const amount    = parseFloat(fnfAmount) || 0
          const hasAmount = !!fnfAmount && amount > 0

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* ── Employee Banner ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', marginBottom: 18,
                background: 'linear-gradient(135deg,#1e3a5f08 0%,#e8622a08 100%)',
                borderRadius: 12, border: '1px solid #f1f5f9',
              }}>
                <Avatar name={empName} size={46} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', margin: '0 0 2px' }}>{empName}</p>
                  <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
                    {selectedExit.employee?.designation?.title ?? ''}{selectedExit.employee?.emp_id ? ` · ${selectedExit.employee.emp_id}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <ExitTypeBadge type={exitType} />
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '5px 0 0' }}>
                    Last day: <strong style={{ color: '#374151' }}>{fmtDate(selectedExit.last_working_date)}</strong>
                  </p>
                </div>
              </div>

              {/* ── Info Grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {([
                  ['📋 Notice Period',    selectedExit.notice_period_days ? `${selectedExit.notice_period_days} days` : '—', '#6b7280'],
                  ['📅 Resignation Date', fmtDate(selectedExit.resignation_date),   '#1E3A5F'],
                  ['🏁 Last Working Day', fmtDate(selectedExit.last_working_date),  '#b91c1c'],
                ] as [string, string, string][]).map(([label, value, color]) => (
                  <div key={label} style={{
                    padding: '10px 12px', borderRadius: 9,
                    background: '#f8fafc',
                    borderTop: `3px solid ${color}22`,
                    borderRight: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9',
                    borderLeft: '1px solid #f1f5f9',
                  }}>
                    <p style={{ fontSize: '0.67rem', color: '#9ca3af', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    <p style={{ fontSize: '0.8375rem', fontWeight: 700, color: '#111827', margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* ── Reason ── */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 14px', borderRadius: 9, marginBottom: 18,
                background: `${etCfg.bg}`, border: `1px solid ${etCfg.border}`,
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>💬</span>
                <div>
                  <p style={{ fontSize: '0.67rem', fontWeight: 700, color: etCfg.color, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Reason for Exit</p>
                  <p style={{ fontSize: '0.8125rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>{selectedExit.reason ?? '—'}</p>
                </div>
              </div>

              {/* ── FnF Paid Banner or Amount Input ── */}
              {fnfLocal.fnf_paid ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
                  border: '1.5px solid #86efac', marginBottom: 18,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={20} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#15803d', margin: '0 0 2px' }}>Full & Final Settlement Completed</p>
                      <p style={{ fontSize: '0.75rem', color: '#4ade80', margin: 0 }}>Settled on {fmtDate(fnfLocal.fnf_date)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.67rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Amount Paid</p>
                    <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: 0, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                      ₹{(fnfLocal.fnf_amount ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#f8fafc', borderRadius: 12, border: '1px solid #e5e7eb',
                  overflow: 'hidden', marginBottom: 18,
                }}>
                  {/* Amount Header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IndianRupee size={14} style={{ color: '#ea580c' }} />
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#111827', margin: 0 }}>Net FnF Settlement Amount</p>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>Required *</span>
                  </div>

                  {/* Amount Input */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      border: `2px solid ${hasAmount ? '#e8622a' : '#e5e7eb'}`,
                      borderRadius: 10, background: '#fff', overflow: 'hidden',
                      transition: 'border-color 200ms',
                      boxShadow: hasAmount ? '0 0 0 3px #e8622a18' : 'none',
                    }}>
                      <div style={{
                        padding: '0 14px', borderRight: `2px solid ${hasAmount ? '#e8622a30' : '#f1f5f9'}`,
                        fontSize: '1rem', fontWeight: 700, color: hasAmount ? '#e8622a' : '#9ca3af',
                        height: 48, display: 'flex', alignItems: 'center', flexShrink: 0,
                        transition: 'color 200ms',
                      }}>₹</div>
                      <input
                        type="number" value={fnfAmount}
                        onChange={e => setFnfAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                          flex: 1, border: 'none', outline: 'none',
                          padding: '0 14px', fontSize: '1.125rem', fontWeight: 700,
                          color: '#111827', background: 'transparent', fontFamily: 'inherit',
                          height: 48,
                        }}
                      />
                      {hasAmount && (
                        <div style={{ padding: '0 14px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px' }}>
                            ₹{amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>ℹ️</span> Enter the net amount after all earnings, deductions, and recoveries.
                    </p>
                  </div>

                  {/* Checklist reminder */}
                  <div style={{ margin: '0 16px 14px', padding: '10px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Before approving FnF, ensure:</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', marginTop: 6 }}>
                      {['All clearances completed','Notice period served / recovered','Leave encashment calculated','PF & gratuity settled'].map(t => (
                        <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#d97706' }}>•</span> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Actions ── */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={() => setShowFnFModal(false)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 9, fontSize: '0.8375rem', fontWeight: 600,
                    border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer',
                  }}>
                  {fnfLocal.fnf_paid ? 'Close' : 'Cancel'}
                </button>
                {!fnfLocal.fnf_paid && (
                  <button
                    onClick={approveFnF}
                    disabled={savingFnF || !hasAmount}
                    style={{
                      flex: 2, padding: '10px 16px', borderRadius: 9, fontSize: '0.8375rem', fontWeight: 700,
                      border: 'none', cursor: hasAmount && !savingFnF ? 'pointer' : 'not-allowed',
                      background: hasAmount
                        ? 'linear-gradient(135deg,#1A7A4A 0%,#16a34a 100%)'
                        : '#e5e7eb',
                      color: hasAmount ? '#fff' : '#9ca3af',
                      boxShadow: hasAmount ? '0 2px 10px #16a34a40' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      transition: 'all 200ms',
                    }}>
                    <CheckCircle2 size={15} />
                    {savingFnF ? 'Processing…' : 'Approve & Mark FnF Paid'}
                  </button>
                )}
              </div>

            </div>
          )
        })()}
      </Modal>

      {/* ── Probation Review Modal ── */}
      <Modal
        open={showProbModal && !!selectedProbEmp}
        onClose={() => setShowProbModal(false)}
        title="Complete Probation Review"
        sub={selectedProbEmp ? `${selectedProbEmp.first_name} ${selectedProbEmp.last_name} · ${selectedProbEmp.designation?.title ?? ''}` : ''}
      >
        {selectedProbEmp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Department',    selectedProbEmp.department?.name ?? '—'],
                ['Employee ID',   selectedProbEmp.emp_id ?? '—'],
                ['Join Date',     fmtDate(selectedProbEmp.date_of_joining)],
                ['Probation End', fmtDate(selectedProbEmp.probation_end_date)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ padding: '9px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k}</p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Rating */}
            <div>
              <label style={LABEL_STYLE}>Performance Rating</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {['1','2','3','4','5'].map(r => (
                  <button key={r} onClick={() => setProbRating(r)} style={{
                    width: 38, height: 38, borderRadius: '50%', fontSize: '0.875rem', fontWeight: 700,
                    border: `2px solid ${probRating === r ? '#1E3A5F' : '#e5e7eb'}`,
                    background: probRating === r ? '#1E3A5F' : 'white',
                    color: probRating === r ? '#fff' : '#6b7280', cursor: 'pointer', transition: 'all 150ms',
                  }}>{r}</button>
                ))}
                <span style={{ fontSize: '0.8125rem', color: '#6b7280', marginLeft: 4 }}>{probRating}/5</span>
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label style={LABEL_STYLE}>Outcome</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Confirmed','Extended','Terminated'] as ProbationOutcome[]).map(o => {
                  const active = probOutcome === o
                  const col = o === 'Confirmed' ? '#15803d' : o === 'Extended' ? '#b45309' : '#b91c1c'
                  const bg  = o === 'Confirmed' ? '#f0fdf4' : o === 'Extended' ? '#fffbeb' : '#fef2f2'
                  const bdr = o === 'Confirmed' ? '#bbf7d0' : o === 'Extended' ? '#fde68a' : '#fecaca'
                  return (
                    <button key={o} onClick={() => setProbOutcome(o)} style={{
                      flex: 1, padding: '9px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 150ms',
                      border: active ? `2px solid ${bdr}` : '2px solid #e5e7eb',
                      background: active ? bg : 'white', color: active ? col : '#6b7280',
                    }}>{o}</button>
                  )
                })}
              </div>
            </div>

            {probOutcome === 'Extended' && (
              <div>
                <label style={LABEL_STYLE}>Extend by (months)</label>
                <div style={{ position: 'relative' }}>
                  <select value={probExtend} onChange={e => setProbExtend(e.target.value)} style={SEL}>
                    {['1','2','3','6'].map(m => <option key={m} value={m}>{m} month{m !== '1' ? 's' : ''}</option>)}
                  </select>
                  {chevron}
                </div>
              </div>
            )}

            <div>
              <label style={LABEL_STYLE}>Remarks</label>
              <textarea rows={3} value={probRemarks} onChange={e => setProbRemarks(e.target.value)}
                placeholder="Enter review remarks…"
                style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.5 }} />
            </div>

            <div>
              <label style={LABEL_STYLE}>Effective Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" value={probEffDate} onChange={e => setProbEffDate(e.target.value)} style={FIELD_STYLE} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowProbModal(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button onClick={submitProbationReview} disabled={savingReview} className="btn btn-primary btn-sm" style={{ flex: 2 }}>
                {savingReview ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Page ── */}
      <Topbar
        title="Exit Management & Employee Lifecycle"
        subtitle="Manage exits, full & final settlements, and probation reviews"
        notificationCount={probDueCount}
      >
        <button onClick={() => setShowInitiateModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserMinus size={14} /> Initiate Exit Process
        </button>
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12, marginBottom: 24 }}>
          {([
            { label: 'On Notice Period', value: noticePeriodCount, icon: UserMinus,    color: '#E8622A' },
            { label: 'Exit This Month',  value: exitThisMonth,     icon: LogOut,        color: '#b91c1c' },
            { label: 'FnF Pending',      value: fnfPendingCount,   icon: IndianRupee,   color: '#b45309' },
            { label: 'Probation Due',    value: probDueCount,      icon: Clock,         color: '#1d4ed8' },
          ] as { label: string; value: number; icon: React.ElementType; color: string }[]).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card card-interactive" style={{ padding: '16px 18px', textAlign: 'center' }}>
              {loading ? (
                <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size={22} />
                </div>
              ) : (
                <>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>{label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Tab Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #f1f5f9', padding: '0 4px' }}>
            <div style={{ display: 'flex' }}>
              {TABS.map(t => {
                const active = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '14px 18px', fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
                    color: active ? '#1E3A5F' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: active ? '2px solid #1E3A5F' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 150ms',
                  }}>
                    {t.label}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: active ? '#dbeafe' : '#f1f5f9', color: active ? '#1d4ed8' : '#9ca3af' }}>{t.count}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={loadData} disabled={loading} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 8, fontSize: '0.8125rem' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 0.7s linear infinite' : undefined }} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af' }}>
              <Spinner size={32} />
              <p style={{ margin: '14px 0 0', fontSize: '0.875rem' }}>Loading…</p>
            </div>
          ) : (
            <>
              {/* TAB 1 — Exit Management */}
              {tab === 'exit' && (
                exits.length === 0 ? (
                  <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af' }}>
                    <UserMinus size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No exit records found.</p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>Use &quot;Initiate Exit Process&quot; to add one.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Employee','EMP ID','Department','Exit Type','Resignation Date','Last Working Date','Notice Period','Clearance','Status','Actions'].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exits.map(exit => {
                          const name    = exit.employee ? `${exit.employee.first_name} ${exit.employee.last_name}` : 'Unknown'
                          const loc     = getLocal(exit.id)
                          const cleared = Object.values(loc.clearance).filter(Boolean).length
                          const total   = CLEARANCE_DEFS.length
                          const pct     = (cleared / total) * 100
                          const done    = cleared === total
                          return (
                            <tr key={exit.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar name={name} size={32} />
                                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{name}</span>
                                </div>
                              </td>
                              <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{exit.employee?.emp_id ?? '—'}</span></td>
                              <td style={{ color: '#374151' }}>{exit.employee?.department?.name ?? '—'}</td>
                              <td><ExitTypeBadge type={toExitType(exit.exit_type)} /></td>
                              <td style={{ color: '#374151' }}>{fmtDate(exit.resignation_date)}</td>
                              <td style={{ color: '#374151' }}>{fmtDate(exit.last_working_date)}</td>
                              <td style={{ color: '#374151' }}>{exit.notice_period_days ? `${exit.notice_period_days} days` : '—'}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                                  <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: done ? '#22c55e' : '#3b82f6', transition: 'width 300ms' }} />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>{cleared}/{total}</span>
                                </div>
                              </td>
                              <td><StatusBadge status={exit.status} /></td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => openManage(exit.id)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                                    <Eye size={12} /> View
                                  </button>
                                  <button onClick={() => openManage(exit.id)} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                                    <Settings2 size={12} /> Manage
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* TAB 2 — FnF Settlement */}
              {tab === 'fnf' && (
                exits.length === 0 ? (
                  <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af' }}>
                    <IndianRupee size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No FnF records found.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Employee','Last Working Date','Exit Type','Reason','FnF Amount','FnF Status','Actions'].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exits.map(exit => {
                          const name    = exit.employee ? `${exit.employee.first_name} ${exit.employee.last_name}` : 'Unknown'
                          const fnfLoc  = getLocal(exit.id)
                          const isPaid  = fnfLoc.fnf_paid
                          return (
                            <tr key={exit.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar name={name} size={32} />
                                  <div>
                                    <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', margin: 0 }}>{name}</p>
                                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace', margin: 0 }}>{exit.employee?.emp_id ?? '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: '#374151' }}>{fmtDate(exit.last_working_date)}</td>
                              <td><ExitTypeBadge type={toExitType(exit.exit_type)} /></td>
                              <td style={{ color: '#374151', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exit.reason ?? '—'}</td>
                              <td style={{ fontWeight: 700, color: '#111827' }}>
                                {fnfLoc.fnf_amount
                                  ? `₹${fnfLoc.fnf_amount.toLocaleString('en-IN')}`
                                  : <span style={{ color: '#9ca3af', fontWeight: 400 }}>Not Set</span>}
                              </td>
                              <td>
                                <span className="badge badge-dot" style={{
                                  background: isPaid ? '#f0fdf4' : '#fffbeb',
                                  color:      isPaid ? '#15803d' : '#b45309',
                                  border:     `1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}`,
                                }}>
                                  {isPaid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => openFnF(exit.id)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                                    <Eye size={12} /> View
                                  </button>
                                  {!isPaid && (
                                    <button onClick={() => openFnF(exit.id)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                                      <IndianRupee size={12} /> Pay
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* TAB 3 — Probation Tracking */}
              {tab === 'probation' && (
                probEmps.length === 0 ? (
                  <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af' }}>
                    <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No employees currently on probation.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Employee','Designation','Department','Join Date','Probation End','Days Remaining','Actions'].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {probEmps.map(emp => {
                          const name    = `${emp.first_name} ${emp.last_name}`
                          const days    = daysRemaining(emp.probation_end_date)
                          const overdue = days < 0
                          const urgent  = days >= 0 && days < 7
                          return (
                            <tr key={emp.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar name={name} size={32} />
                                  <div>
                                    <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', margin: 0 }}>{name}</p>
                                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace', margin: 0 }}>{emp.emp_id ?? '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: '#374151' }}>{emp.designation?.title ?? '—'}</td>
                              <td style={{ color: '#374151' }}>{emp.department?.name ?? '—'}</td>
                              <td style={{ color: '#374151' }}>{fmtDate(emp.date_of_joining)}</td>
                              <td style={{ color: '#374151' }}>{fmtDate(emp.probation_end_date)}</td>
                              <td>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: overdue ? '#b91c1c' : urgent ? '#b45309' : '#15803d' }}>
                                  {overdue ? `${Math.abs(days)}d overdue` : `${days} days`}
                                </span>
                              </td>
                              <td>
                                <button onClick={() => openProbReview(emp.id)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
                                  Complete Review
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
