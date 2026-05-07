'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  UserPlus, Loader, CheckCircle, FileX, X, Plus, Bell, Check,
  Clock, Minus, ChevronDown, Eye, Mail, RefreshCw,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type OnboardTab = 'queue' | 'checklist'
type OnboardStatus = 'In Progress' | 'Completed' | 'Not Started'

interface ProbationReview {
  id: string
  employee_id: string
  due_date: string
  outcome: string
}

interface ApiEmployee {
  id: string
  first_name: string
  last_name: string
  work_email: string
  emp_id?: string
  date_of_joining: string
  probation_end_date: string | null
  status: string
  avatar_url: string | null
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
  manager: { id: string; first_name: string; last_name: string } | null
  documents_count: number
  onboarding_complete: boolean
  probation_reviews: ProbationReview[]
}

/* ─────────────────────────────────────────────────────────────
   CHECKLIST DEFINITIONS (static structure — state from API)
───────────────────────────────────────────────────────────── */
const CHECKLIST_DEFS = [
  {
    title: 'Personal Documents', icon: '📋',
    items: [
      { id: 'doc_aadhaar', label: 'Aadhaar Card' },
      { id: 'doc_pan', label: 'PAN Card' },
      { id: 'doc_passport', label: 'Passport', optional: true },
      { id: 'doc_academic', label: 'Academic Certificates' },
      { id: 'doc_exp', label: 'Experience Letters' },
    ],
  },
  {
    title: 'Employment Forms', icon: '📝',
    items: [
      { id: 'form_offer', label: 'Offer Letter Acceptance' },
      { id: 'form_appt', label: 'Appointment Letter' },
      { id: 'form_nda', label: 'NDA Signing' },
      { id: 'form_conduct', label: 'Code of Conduct' },
    ],
  },
  {
    title: 'Payroll & Compliance', icon: '💰',
    items: [
      { id: 'pay_bank', label: 'Bank Account Details' },
      { id: 'pay_pf', label: 'PF Declaration Form' },
      { id: 'pay_12bb', label: 'Form 12BB (Tax Declaration)' },
      { id: 'pay_esic', label: 'ESIC Nomination', optional: true },
    ],
  },
  {
    title: 'IT & Access Setup', icon: '💻',
    items: [
      { id: 'it_email', label: 'Email ID Created' },
      { id: 'it_laptop', label: 'System / Laptop Assigned' },
      { id: 'it_access_card', label: 'Access Cards' },
      { id: 'it_software', label: 'Software Access (Jira, Slack, etc.)' },
    ],
  },
  {
    title: 'Orientation & Training', icon: '🎓',
    items: [
      { id: 'train_hr', label: 'HR Orientation Session' },
      { id: 'train_team', label: 'Team Introduction' },
      { id: 'train_policy', label: 'Company Policy Training' },
      { id: 'train_role', label: 'Role-specific Training' },
    ],
  },
]

const ALL_STEP_IDS = CHECKLIST_DEFS.flatMap(s => s.items.map(i => i.id))
const TOTAL_STEPS = ALL_STEP_IDS.length

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

/* ── localStorage persistence (survives page refresh, no schema needed) ── */
function lsKey(empId: string) { return `ihrms_ob_${empId}` }

function loadLocalSteps(empId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(lsKey(empId)) ?? '{}') } catch { return {} }
}

function saveLocalSteps(empId: string, steps: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(lsKey(empId), JSON.stringify(steps)) } catch {}
}

function computeProgress(steps: Record<string, boolean>): number {
  if (TOTAL_STEPS === 0) return 0
  return Math.round((ALL_STEP_IDS.filter(id => steps[id]).length / TOTAL_STEPS) * 100)
}

function getOnboardStatus(emp: ApiEmployee): OnboardStatus {
  if (emp.onboarding_complete) return 'Completed'
  const localSteps = loadLocalSteps(emp.id)
  const p = computeProgress(localSteps)
  if (p === 100) return 'Completed'
  if (p > 0) return 'In Progress'
  return 'Not Started'
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nameInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

/* ── Badge & UI components ── */
function OnboardStatusBadge({ status }: { status: OnboardStatus }) {
  const map: Record<OnboardStatus, { bg: string; color: string }> = {
    'In Progress': { bg: '#fffbeb', color: '#d97706' },
    'Completed':   { bg: '#f0fdf4', color: '#16a34a' },
    'Not Started': { bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status]
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>{status}</span>
}

function ProgressBar({ value, color = '#2563eb' }: { value: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number; icon: React.ElementType
  color: { bg: string; icon: string; border: string }
  loading?: boolean
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color.border}`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color.icon} />
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{loading ? '…' : value}</p>
      </div>
    </div>
  )
}

function ItemStatusIcon({ done, marking }: { done: boolean; marking: boolean }) {
  if (marking) return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Loader size={12} color="#9ca3af" /></div>
  if (done) return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={12} color="#fff" strokeWidth={3} /></div>
  return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fef3c7', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={11} color="#d97706" /></div>
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function OnboardingPage() {

  const [activeTab,    setActiveTab]    = useState<OnboardTab>('queue')
  const [loading,      setLoading]      = useState(true)
  const [employees,    setEmployees]    = useState<ApiEmployee[]>([])
  const [selectedId,   setSelectedId]   = useState<string>('')
  const [stepsDone,     setStepsDone]    = useState<Record<string, boolean>>({})
  const [markingStep,   setMarkingStep]  = useState<string | null>(null)
  const [remindedSteps, setRemindedSteps] = useState<Record<string, boolean>>({})
  const [showModal,     setShowModal]    = useState(false)

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/onboarding?limit=100')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      const data: ApiEmployee[] = json.data ?? []
      setEmployees(data)
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
    } catch { /* show empty state */ }
    finally { setLoading(false) }
  }, [selectedId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── Reset reminded state when employee changes ── */
  useEffect(() => { setRemindedSteps({}) }, [selectedId])

  /* ── Load steps: merge localStorage + API notes (localStorage wins) ── */
  useEffect(() => {
    if (!selectedId) { setStepsDone({}); return }
    const local = loadLocalSteps(selectedId)
    setStepsDone(local)
  }, [selectedId, employees])

  /* ── Derived stats ── */
  const currentMonth        = new Date().toISOString().slice(0, 7)
  const newJoinersThisMonth = employees.filter(e => e.date_of_joining?.startsWith(currentMonth)).length
  const completedCount  = employees.filter(e => getOnboardStatus(e) === 'Completed').length
  const inProgressCount = employees.filter(e => getOnboardStatus(e) === 'In Progress').length
  const docsPending         = employees.reduce((sum, e) => sum + Math.max(0, 3 - (e.documents_count ?? 0)), 0)

  /* ── Checklist derived ── */
  const selectedEmp    = employees.find(e => e.id === selectedId)
  const doneCount      = ALL_STEP_IDS.filter(id => stepsDone[id]).length
  const pendingCount   = TOTAL_STEPS - doneCount
  const overallPct     = TOTAL_STEPS > 0 ? Math.round((doneCount / TOTAL_STEPS) * 100) : 0

  /* ── Mark step complete — localStorage-first, API is background sync ── */
  function handleMarkComplete(stepId: string) {
    if (!selectedId) return
    setMarkingStep(stepId)

    // 1. Update React state immediately
    const newSteps = { ...stepsDone, [stepId]: true }
    setStepsDone(newSteps)

    // 2. Persist to localStorage immediately (survives refresh, no schema needed)
    saveLocalSteps(selectedId, newSteps)

    // 3. Also update employees list so queue progress bar reflects change
    setEmployees(prev => prev.map(e => {
      if (e.id !== selectedId) return e
      const notesJson = JSON.stringify(
        Object.fromEntries(
          Object.entries(newSteps).map(([k, v]) => [k, { completed: v, updated_at: new Date().toISOString() }])
        )
      )
      const reviews = e.probation_reviews.length > 0
        ? e.probation_reviews.map((r, i) => i === 0 ? { ...r, notes: notesJson } : r)
        : [{ id: '', employee_id: e.id, due_date: '', outcome: 'pending', notes: notesJson }]
      return { ...e, probation_reviews: reviews }
    }))

    toast.success('Step marked complete')
    setMarkingStep(null)

    // 4. Background API sync (fire-and-forget — no error shown if schema still missing)
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: selectedId, step: stepId, completed: true }),
    }).catch(() => {/* schema not ready yet — localStorage already saved */})
  }

  /* ── Build pending step list for API ── */
  function getPendingSteps(ids: string[]) {
    return ids.map(id => {
      const section = CHECKLIST_DEFS.find(s => s.items.some(i => i.id === id))
      const item    = section?.items.find(i => i.id === id)
      return { id, label: item?.label ?? id, section: section?.title ?? '' }
    }).filter(s => s.label)
  }

  /* ── Send reminder for a single step ── */
  async function handleRemind(stepId: string, stepLabel: string) {
    if (!selectedId) return
    const emp = employees.find(e => e.id === selectedId)
    if (!emp) return
    const empName = `${emp.first_name} ${emp.last_name}`

    setRemindedSteps(prev => ({ ...prev, [stepId]: true }))
    const toastId = toast.loading(`Sending reminder to ${empName}…`)

    try {
      const res  = await fetch('/api/onboarding/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedId, pending_steps: getPendingSteps([stepId]) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(
        json.sent
          ? `Reminder email sent to ${empName} for "${stepLabel}"`
          : `Reminder recorded for "${stepLabel}" (email: ${json.message})`,
        { id: toastId, duration: 4000 }
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminder', { id: toastId })
      setRemindedSteps(prev => ({ ...prev, [stepId]: false }))
    }
  }

  /* ── Send reminders for all pending steps ── */
  async function handleRemindAll() {
    if (!selectedId) return
    const emp = employees.find(e => e.id === selectedId)
    if (!emp) return
    const empName  = `${emp.first_name} ${emp.last_name}`
    const pendingIds = ALL_STEP_IDS.filter(id => !stepsDone[id])
    if (pendingIds.length === 0) { toast('No pending steps — all tasks are complete!'); return }

    const newReminded: Record<string, boolean> = {}
    pendingIds.forEach(id => { newReminded[id] = true })
    setRemindedSteps(prev => ({ ...prev, ...newReminded }))

    const toastId = toast.loading(`Sending ${pendingIds.length} reminder${pendingIds.length > 1 ? 's' : ''} to ${empName}…`)

    try {
      const res  = await fetch('/api/onboarding/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedId, pending_steps: getPendingSteps(pendingIds) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(
        json.sent
          ? `Reminder email sent to ${empName} (${pendingIds.length} pending items)`
          : `Reminders recorded (${json.message})`,
        { id: toastId, duration: 4500 }
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminders', { id: toastId })
      setRemindedSteps(prev => {
        const reverted = { ...prev }
        pendingIds.forEach(id => { reverted[id] = false })
        return reverted
      })
    }
  }

  const TABS: { key: OnboardTab; label: string }[] = [
    { key: 'queue',     label: 'Onboarding Queue' },
    { key: 'checklist', label: 'Pre-boarding Checklist' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Topbar
        title="Employee Onboarding"
        subtitle="Track and manage new joiner pre-boarding and document checklist"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={fetchAll}
              style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{ background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} /> Start Onboarding
            </button>
          </div>
        }
      />

      <div style={{ padding: '16px 16px', maxWidth: 1400, margin: '0 auto' }} className="sm:!px-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16, marginBottom: 28 }}>
          <SummaryCard label="New Joiners This Month"    value={newJoinersThisMonth} loading={loading} icon={UserPlus}    color={{ bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe' }} />
          <SummaryCard label="Onboarding In Progress"    value={inProgressCount}     loading={loading} icon={Loader}      color={{ bg: '#fffbeb', icon: '#d97706', border: '#fde68a' }} />
          <SummaryCard label="Onboarding Completed"      value={completedCount}       loading={loading} icon={CheckCircle} color={{ bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' }} />
          <SummaryCard label="Documents Pending"         value={docsPending}          loading={loading} icon={FileX}       color={{ bg: '#fef2f2', icon: '#dc2626', border: '#fecaca' }} />
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 28px', fontSize: '0.875rem', fontWeight: 600,
                  color: activeTab === t.key ? '#E8622A' : '#6b7280',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: activeTab === t.key ? '2px solid #E8622A' : '2px solid transparent',
                  background: 'none', cursor: 'pointer',
                }}
              >{t.label}</button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* ── TAB 1: Onboarding Queue ── */}
            {activeTab === 'queue' && (
              <div>
                {loading ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Loading onboarding queue…</p>
                ) : employees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <UserPlus size={40} style={{ color: '#d1d5db', marginBottom: 14 }} />
                    <p style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>No employees in onboarding.</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 18 }}>Employees with status &ldquo;probation&rdquo; appear here automatically.</p>
                    <button onClick={() => setShowModal(true)} style={BTN_PRIMARY}>Start Onboarding</button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Employee', 'EMP ID', 'Department', 'Joining Date', 'Progress', 'Documents', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp, i) => {
                          const steps    = loadLocalSteps(emp.id)
                          const progress = computeProgress(steps)
                          const status   = getOnboardStatus(emp)
                          const color    = status === 'Completed' ? '#16a34a' : progress >= 50 ? '#2563eb' : progress > 0 ? '#d97706' : '#9ca3af'
                          const empName  = `${emp.first_name} ${emp.last_name}`

                          return (
                            <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#E8622A 0%,#f59e0b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>
                                    {nameInitials(emp.first_name, emp.last_name)}
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{empName}</p>
                                    {emp.designation && <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{emp.designation.title}</p>}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.82rem', fontFamily: 'monospace' }}>{emp.emp_id ?? '—'}</td>
                              <td style={{ padding: '12px 14px', color: '#374151' }}>{emp.department?.name ?? '—'}</td>
                              <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(emp.date_of_joining)}</td>
                              <td style={{ padding: '12px 14px', minWidth: 130 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1 }}><ProgressBar value={progress} color={color} /></div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>{progress}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontWeight: 700, color: emp.documents_count >= 3 ? '#16a34a' : '#d97706' }}>{emp.documents_count}</span>
                                <span style={{ color: '#9ca3af' }}> / 3</span>
                              </td>
                              <td style={{ padding: '12px 14px' }}><OnboardStatusBadge status={status} /></td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => { setSelectedId(emp.id); setActiveTab('checklist') }}
                                    style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Eye size={11} /> Checklist
                                  </button>
                                  <button
                                    style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                                  >
                                    <Bell size={11} /> Remind
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: Pre-boarding Checklist ── */}
            {activeTab === 'checklist' && (
              <div>
                {/* Employee selector + send reminders */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Viewing Checklist for:</label>
                    {employees.length > 0 ? (
                      <div style={{ position: 'relative' }}>
                        <select
                          value={selectedId}
                          onChange={e => setSelectedId(e.target.value)}
                          style={{ ...INP, width: 260, paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
                        >
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.first_name} {e.last_name} {e.department ? `· ${e.department.name}` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No employees in onboarding</span>
                    )}
                    {selectedEmp && (
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 6 }}>
                        {selectedEmp.emp_id ? `${selectedEmp.emp_id} · ` : ''}Joined {fmtDate(selectedEmp.date_of_joining)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRemindAll}
                    style={{ fontSize: '0.875rem', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Mail size={14} /> Send All Pending Reminders
                  </button>
                </div>

                {/* Overall progress */}
                {selectedEmp && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <p style={{ fontWeight: 700, color: '#0c4a6e', margin: 0, fontSize: '1rem' }}>
                          {selectedEmp.first_name} {selectedEmp.last_name} — Onboarding Progress
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '3px 0 0' }}>
                          {doneCount} of {TOTAL_STEPS} tasks completed · {pendingCount} pending
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: '#0c4a6e', margin: 0, fontSize: '1.8rem', lineHeight: 1 }}>{overallPct}%</p>
                        <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: '2px 0 0' }}>Overall Complete</p>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 10, background: '#bae6fd', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${overallPct}%`, height: '100%', background: 'linear-gradient(90deg,#0284c7 0%,#0ea5e9 100%)', borderRadius: 999, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}

                {loading ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Loading checklist…</p>
                ) : !selectedEmp ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                    <UserPlus size={36} style={{ color: '#d1d5db', marginBottom: 12 }} />
                    <p style={{ fontWeight: 500 }}>No employees in onboarding queue.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {CHECKLIST_DEFS.map(section => {
                      const secDone  = section.items.filter(item => stepsDone[item.id]).length
                      const secTotal = section.items.length
                      return (
                        <div key={section.title} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                          {/* Section header */}
                          <div style={{ background: '#f9fafb', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '1.1rem' }}>{section.icon}</span>
                              <h3 style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>{section.title}</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: secDone === secTotal ? '#16a34a' : '#d97706' }}>
                                {secDone}/{secTotal} done
                              </span>
                              <div style={{ width: 80, height: 5, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: secTotal > 0 ? `${(secDone / secTotal) * 100}%` : '0%', height: '100%', background: secDone === secTotal ? '#16a34a' : '#2563eb', borderRadius: 999 }} />
                              </div>
                            </div>
                          </div>

                          {/* Items */}
                          <div>
                            {section.items.map((item, ii) => {
                              const done    = !!stepsDone[item.id]
                              const marking = markingStep === item.id
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '12px 18px',
                                    borderTop: ii > 0 ? '1px solid #f3f4f6' : 'none',
                                    background: done ? '#fafffe' : '#fff',
                                  }}
                                >
                                  <ItemStatusIcon done={done} marking={marking} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <p style={{ fontWeight: done ? 500 : 600, color: done ? '#6b7280' : '#111827', margin: 0, fontSize: '0.875rem' }}>
                                        {item.label}
                                      </p>
                                      {item.optional && (
                                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', background: '#f3f4f6', padding: '1px 6px', borderRadius: 999 }}>optional</span>
                                      )}
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: done ? '#16a34a' : '#d97706', margin: '2px 0 0', fontWeight: 500 }}>
                                      {done ? '✓ Completed' : 'Pending'}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    {done ? (
                                      <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                        <CheckCircle size={13} /> Done
                                      </span>
                                    ) : (
                                      <>
                                        {remindedSteps[item.id] ? (
                                          <span style={{ fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, padding: '4px 10px' }}>
                                            <Bell size={11} /> Reminded
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => handleRemind(item.id, item.label)}
                                            style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                          >
                                            <Bell size={11} /> Remind
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleMarkComplete(item.id)}
                                          disabled={marking}
                                          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: marking ? '#f3f4f6' : '#f0fdf4', color: marking ? '#9ca3af' : '#16a34a', cursor: marking ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                          <Check size={11} /> Mark Complete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal: Start Onboarding ── */}
      {showModal && (
        <StartOnboardingModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   START ONBOARDING MODAL
───────────────────────────────────────────────────────────── */
function StartOnboardingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [employees, setEmployees] = useState<Array<{ id: string; first_name: string; last_name: string; emp_id?: string; department?: { name: string } | null }>>([])
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingEmps, setLoadingEmps] = useState(true)

  useEffect(() => {
    // Fetch active employees who aren't already in probation
    fetch('/api/employees?limit=200')
      .then(r => r.json())
      .then(j => {
        setEmployees(j.data ?? [])
        setLoadingEmps(false)
      })
      .catch(() => setLoadingEmps(false))
  }, [])

  async function handleStart() {
    if (!selectedEmpId) { toast.error('Please select an employee'); return }
    setSaving(true)
    try {
      // Initialize onboarding by creating the first step entry
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedEmpId, step: 'onboarding_started', completed: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success('Onboarding initialized successfully')
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start onboarding')
    } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 480, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <ModalHeader title="Start New Employee Onboarding" onClose={onClose} />
        <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', fontSize: '0.8rem', color: '#0369a1' }}>
            Select an employee (in probation status) to begin their onboarding. This creates an onboarding checklist and allows tracking pre-boarding tasks.
          </div>
          <FormField label="Employee *">
            {loadingEmps ? (
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Loading employees…</p>
            ) : (
              <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} style={INP}>
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                    {emp.emp_id ? ` (${emp.emp_id})` : ''}
                    {emp.department ? ` — ${emp.department.name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
        <ModalFooter>
          <button onClick={onClose} style={BTN_OUTLINE}>Cancel</button>
          <button
            onClick={handleStart}
            disabled={saving || !selectedEmpId}
            style={{ ...BTN_PRIMARY, opacity: (!selectedEmpId || saving) ? 0.7 : 1 }}
          >
            {saving ? 'Starting…' : 'Initialize Onboarding'}
          </button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  )
}

/* ─────────────────────────────────────────────────────────────
   SHARED MODAL COMPONENTS
───────────────────────────────────────────────────────────── */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem', margin: 0 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, display: 'flex' }}><X size={18} /></button>
    </div>
  )
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>{children}</div>
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SHARED STYLES
───────────────────────────────────────────────────────────── */
const INP: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: '0.875rem', color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
}

const BTN_PRIMARY: React.CSSProperties = {
  background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
}

const BTN_OUTLINE: React.CSSProperties = {
  background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
}

// Suppress unused import warnings for icons only used in JSX
void [Minus]
