'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { onboardingApi } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  UserPlus,
  Loader,
  CheckCircle,
  FileX,
  X,
  Plus,
  Bell,
  Check,
  Clock,
  Minus,
  ChevronDown,
  Eye,
  Mail,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type OnboardTab = 'queue' | 'checklist'
type OnboardStatus = 'In Progress' | 'Completed' | 'Not Started'

interface OnboardingEmployee {
  id: number
  name: string
  empId: string
  department: string
  joiningDate: string
  progress: number
  docsSubmitted: number
  docsTotal: number
  status: OnboardStatus
}

interface ChecklistItem {
  id: string
  label: string
  status: 'done' | 'pending' | 'not_required' | 'in_progress'
  detail?: string
  optional?: boolean
}

interface ChecklistSection {
  title: string
  icon: string
  items: ChecklistItem[]
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const ONBOARDING_EMPLOYEES: OnboardingEmployee[] = [
  { id: 1, name: 'Arjun Patel', empId: 'EMP/2026/013', department: 'Engineering', joiningDate: 'Apr 1, 2026', progress: 85, docsSubmitted: 8, docsTotal: 10, status: 'In Progress' },
  { id: 2, name: 'Sunita Rao', empId: 'EMP/2026/014', department: 'HR', joiningDate: 'Apr 1, 2026', progress: 60, docsSubmitted: 5, docsTotal: 10, status: 'In Progress' },
  { id: 3, name: 'Mohammed Irfan', empId: 'EMP/2026/015', department: 'Sales', joiningDate: 'Apr 1, 2026', progress: 100, docsSubmitted: 10, docsTotal: 10, status: 'Completed' },
  { id: 4, name: 'Deepika Sharma', empId: 'EMP/2026/016', department: 'Finance', joiningDate: 'Apr 7, 2026', progress: 20, docsSubmitted: 2, docsTotal: 10, status: 'Not Started' },
  { id: 5, name: 'Vikram Nair', empId: 'EMP/2026/017', department: 'Operations', joiningDate: 'Apr 7, 2026', progress: 40, docsSubmitted: 4, docsTotal: 10, status: 'In Progress' },
  { id: 6, name: 'Sonia Kapoor', empId: 'EMP/2026/018', department: 'Marketing', joiningDate: 'Apr 7, 2026', progress: 100, docsSubmitted: 10, docsTotal: 10, status: 'Completed' },
  { id: 7, name: 'Ravi Shankar', empId: 'EMP/2026/019', department: 'Engineering', joiningDate: 'Apr 14, 2026', progress: 10, docsSubmitted: 1, docsTotal: 10, status: 'Not Started' },
  { id: 8, name: 'Kavita Pillai', empId: 'EMP/2026/020', department: 'Customer Support', joiningDate: 'Apr 14, 2026', progress: 0, docsSubmitted: 0, docsTotal: 10, status: 'Not Started' },
]

const DEFAULT_CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    title: 'Personal Documents',
    icon: '📋',
    items: [
      { id: 'doc_aadhaar', label: 'Aadhaar Card', status: 'done', detail: 'Submitted Apr 1' },
      { id: 'doc_pan', label: 'PAN Card', status: 'done', detail: 'Submitted Apr 1' },
      { id: 'doc_passport', label: 'Passport', status: 'pending', detail: 'Not submitted', optional: true },
      { id: 'doc_academic', label: 'Academic Certificates', status: 'done', detail: 'Submitted Apr 1' },
      { id: 'doc_exp', label: 'Experience Letters', status: 'pending', detail: 'Pending' },
    ],
  },
  {
    title: 'Employment Forms',
    icon: '📝',
    items: [
      { id: 'form_offer', label: 'Offer Letter Acceptance', status: 'done', detail: 'Signed Apr 1' },
      { id: 'form_appt', label: 'Appointment Letter', status: 'done', detail: 'Generated Apr 1' },
      { id: 'form_nda', label: 'NDA Signing', status: 'pending', detail: 'Pending' },
      { id: 'form_conduct', label: 'Code of Conduct', status: 'pending', detail: 'Pending' },
    ],
  },
  {
    title: 'Payroll & Compliance',
    icon: '💰',
    items: [
      { id: 'pay_bank', label: 'Bank Account Details', status: 'done', detail: 'Submitted' },
      { id: 'pay_pf', label: 'PF Declaration Form', status: 'done', detail: 'Submitted' },
      { id: 'pay_12bb', label: 'Form 12BB (Tax Declaration)', status: 'pending', detail: 'Pending' },
      { id: 'pay_esic', label: 'ESIC Nomination', status: 'not_required', detail: 'Not required' },
    ],
  },
  {
    title: 'IT & Access Setup',
    icon: '💻',
    items: [
      { id: 'it_email', label: 'Email ID Created', status: 'done', detail: 'it@company.com' },
      { id: 'it_laptop', label: 'System/Laptop Assigned', status: 'done', detail: 'Laptop #L-2026-013' },
      { id: 'it_access_card', label: 'Access Cards', status: 'in_progress', detail: 'Processing' },
      { id: 'it_software', label: 'Software Access (Jira, Slack, etc.)', status: 'in_progress', detail: 'In Progress' },
    ],
  },
  {
    title: 'Orientation & Training',
    icon: '🎓',
    items: [
      { id: 'train_hr', label: 'HR Orientation Session', status: 'pending', detail: 'Scheduled Apr 7' },
      { id: 'train_team', label: 'Team Introduction', status: 'pending', detail: 'Scheduled Apr 7' },
      { id: 'train_policy', label: 'Company Policy Training', status: 'pending', detail: 'Not started' },
      { id: 'train_role', label: 'Role-specific Training', status: 'pending', detail: 'Not started' },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function OnboardStatusBadge({ status }: { status: OnboardStatus }) {
  const map: Record<OnboardStatus, { bg: string; color: string }> = {
    'In Progress': { bg: '#fffbeb', color: '#d97706' },
    'Completed': { bg: '#f0fdf4', color: '#16a34a' },
    'Not Started': { bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status]
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>{status}</span>
}

function ProgressBar({ value, color = '#2563eb' }: { value: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: { bg: string; icon: string; border: string } }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color.border}`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color.icon} />
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</p>
      </div>
    </div>
  )
}

function ItemStatusIcon({ status }: { status: ChecklistItem['status'] }) {
  if (status === 'done') return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={12} color="#fff" strokeWidth={3} /></div>
  if (status === 'in_progress') return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Loader size={12} color="#fff" /></div>
  if (status === 'not_required') return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Minus size={12} color="#9ca3af" /></div>
  return <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fef3c7', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={11} color="#d97706" /></div>
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState<OnboardTab>('queue')
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('Arjun Patel')
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>(DEFAULT_CHECKLIST_SECTIONS)

  // Form state for new onboarding
  const [newName, setNewName] = useState('')
  const [newDept, setNewDept] = useState('')
  const [newJoining, setNewJoining] = useState('')

  const [onboardingEmployees, setOnboardingEmployees] = useState<OnboardingEmployee[]>(ONBOARDING_EMPLOYEES)

  useEffect(() => {
    onboardingApi.list().then(res => {
      if (res.data.length > 0) {
        // API returns unknown[] — use as-is if it matches shape, else keep mock
        const data = res.data as OnboardingEmployee[]
        if (data[0] && typeof data[0].name === 'string') {
          setOnboardingEmployees(data)
        }
      }
    }).catch(() => {})
  }, [])

  const selectedEmployeeData = onboardingEmployees.find(e => e.name === selectedEmployee)

  const totalItems = checklistSections.reduce((a, s) => a + s.items.filter(i => i.status !== 'not_required').length, 0)
  const doneItems = checklistSections.reduce((a, s) => a + s.items.filter(i => i.status === 'done').length, 0)
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const pendingItems = checklistSections.reduce((a, s) => a + s.items.filter(i => i.status === 'pending').length, 0)

  function markItemComplete(sectionIdx: number, itemId: string) {
    setChecklistSections(prev => prev.map((section, si) =>
      si !== sectionIdx ? section : {
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, status: 'done' as const, detail: `Marked complete ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` } : item
        ),
      }
    ))
    // Sync to API
    const empData = onboardingEmployees.find(e => e.name === selectedEmployee)
    if (empData) {
      onboardingApi.update({ employee_id: String(empData.id), task_id: itemId, status: 'done' })
        .then(() => toast.success('Task marked complete'))
        .catch(() => {/* local state already updated */})
    }
  }

  const TABS: { key: OnboardTab; label: string }[] = [
    { key: 'queue', label: 'Onboarding Queue' },
    { key: 'checklist', label: 'Pre-boarding Checklist' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Topbar
        title="Employee Onboarding"
        actions={
          <button
            onClick={() => setShowOnboardModal(true)}
            style={{ background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Start Onboarding
          </button>
        }
      />

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
          <SummaryCard label="New Joiners This Month" value={8} icon={UserPlus} color={{ bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe' }} />
          <SummaryCard label="Onboarding In Progress" value={5} icon={Loader} color={{ bg: '#fffbeb', icon: '#d97706', border: '#fde68a' }} />
          <SummaryCard label="Onboarding Completed" value={3} icon={CheckCircle} color={{ bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' }} />
          <SummaryCard label="Documents Pending" value={12} icon={FileX} color={{ bg: '#fef2f2', icon: '#dc2626', border: '#fecaca' }} />
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 28px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: activeTab === t.key ? '#E8622A' : '#6b7280',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: activeTab === t.key ? '2px solid #E8622A' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* ── TAB 1: Onboarding Queue ── */}
            {activeTab === 'queue' && (
              <div>
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
                      {onboardingEmployees.map((emp, i) => {
                        const progressColor =
                          emp.status === 'Completed' ? '#16a34a' :
                          emp.progress >= 50 ? '#2563eb' :
                          emp.progress > 0 ? '#d97706' : '#9ca3af'
                        return (
                          <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #E8622A 0%, #f59e0b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>
                                  {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{emp.name}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.82rem', fontFamily: 'monospace' }}>{emp.empId}</td>
                            <td style={{ padding: '12px 14px', color: '#374151' }}>{emp.department}</td>
                            <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{emp.joiningDate}</td>
                            <td style={{ padding: '12px 14px', minWidth: 130 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <ProgressBar value={emp.progress} color={progressColor} />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: progressColor, whiteSpace: 'nowrap' }}>{emp.progress}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontWeight: 700, color: emp.docsSubmitted === emp.docsTotal ? '#16a34a' : '#d97706' }}>{emp.docsSubmitted}</span>
                                <span style={{ color: '#9ca3af' }}>/</span>
                                <span style={{ color: '#374151' }}>{emp.docsTotal}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}><OnboardStatusBadge status={emp.status} /></td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => { setSelectedEmployee(emp.name); setActiveTab('checklist') }}
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Eye size={11} /> Checklist
                                </button>
                                <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
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
              </div>
            )}

            {/* ── TAB 2: Pre-boarding Checklist ── */}
            {activeTab === 'checklist' && (
              <div>
                {/* Employee selector + overall progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Viewing Checklist for:</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedEmployee}
                        onChange={e => setSelectedEmployee(e.target.value)}
                        style={{ ...inputStyle, width: 220, paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
                      >
                        {onboardingEmployees.map(e => (
                          <option key={e.id} value={e.name}>{e.name} ({e.department})</option>
                        ))}
                      </select>
                      <ChevronDown size={14} color="#6b7280" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                    {selectedEmployeeData && (
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 6 }}>
                        {selectedEmployeeData.empId} · Joined {selectedEmployeeData.joiningDate}
                      </span>
                    )}
                  </div>
                  <button
                    style={{ fontSize: '0.875rem', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Mail size={14} /> Send All Pending Reminders
                  </button>
                </div>

                {/* Overall progress bar */}
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#0c4a6e', margin: 0, fontSize: '1rem' }}>{selectedEmployee} — Onboarding Progress</p>
                      <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '3px 0 0' }}>{doneItems} of {totalItems} tasks completed · {pendingItems} pending</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, color: '#0c4a6e', margin: 0, fontSize: '1.8rem', lineHeight: 1 }}>{overallProgress}%</p>
                      <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: '2px 0 0' }}>Overall Complete</p>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 10, background: '#bae6fd', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${overallProgress}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%)', borderRadius: 999, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Checklist Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {checklistSections.map((section, si) => {
                    const sectionDone = section.items.filter(i => i.status === 'done').length
                    const sectionTotal = section.items.filter(i => i.status !== 'not_required').length
                    return (
                      <div key={section.title} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                        {/* Section header */}
                        <div style={{ background: '#f9fafb', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.1rem' }}>{section.icon}</span>
                            <h3 style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>{section.title}</h3>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: sectionDone === sectionTotal ? '#16a34a' : '#d97706' }}>
                              {sectionDone}/{sectionTotal} done
                            </span>
                            <div style={{ width: 80, height: 5, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: sectionTotal > 0 ? `${(sectionDone / sectionTotal) * 100}%` : '0%', height: '100%', background: sectionDone === sectionTotal ? '#16a34a' : '#2563eb', borderRadius: 999 }} />
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div>
                          {section.items.map((item, ii) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                padding: '12px 18px',
                                borderTop: ii > 0 ? '1px solid #f3f4f6' : 'none',
                                background: item.status === 'done' ? '#fafffe' : '#fff',
                              }}
                            >
                              <ItemStatusIcon status={item.status} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <p style={{ fontWeight: item.status === 'done' ? 500 : 600, color: item.status === 'done' ? '#6b7280' : '#111827', margin: 0, fontSize: '0.875rem', textDecoration: item.status === 'not_required' ? 'line-through' : 'none' }}>
                                    {item.label}
                                  </p>
                                  {item.optional && (
                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', background: '#f3f4f6', padding: '1px 6px', borderRadius: 999 }}>optional</span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.78rem', color: item.status === 'done' ? '#16a34a' : item.status === 'in_progress' ? '#2563eb' : item.status === 'not_required' ? '#9ca3af' : '#d97706', margin: '2px 0 0', fontWeight: 500 }}>
                                  {item.detail}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {item.status === 'pending' && (
                                  <>
                                    <button
                                      style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                    >
                                      <Bell size={11} /> Remind
                                    </button>
                                    <button
                                      onClick={() => markItemComplete(si, item.id)}
                                      style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                    >
                                      <Check size={11} /> Mark Complete
                                    </button>
                                  </>
                                )}
                                {item.status === 'in_progress' && (
                                  <button
                                    onClick={() => markItemComplete(si, item.id)}
                                    style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Check size={11} /> Mark Complete
                                  </button>
                                )}
                                {item.status === 'done' && (
                                  <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                    <CheckCircle size={13} /> Done
                                  </span>
                                )}
                                {item.status === 'not_required' && (
                                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>N/A</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal: Start Onboarding ── */}
      {showOnboardModal && (
        <ModalOverlay onClose={() => setShowOnboardModal(false)}>
          <div style={{ width: 520, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <ModalHeader title="Start New Employee Onboarding" onClose={() => setShowOnboardModal(false)} />
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', fontSize: '0.8rem', color: '#0369a1' }}>
                This will create an onboarding record and send a welcome email with the pre-boarding checklist link to the employee.
              </div>
              <FormField label="Full Name">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Arjun Kumar Patel" style={inputStyle} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Employee ID">
                  <input placeholder="Auto-generated" disabled style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af' }} />
                </FormField>
                <FormField label="Joining Date">
                  <input type="date" value={newJoining} onChange={e => setNewJoining(e.target.value)} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Department">
                <select value={newDept} onChange={e => setNewDept(e.target.value)} style={inputStyle}>
                  <option value="">Select Department</option>
                  {['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing', 'Customer Support'].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Designation">
                <input placeholder="e.g. Senior Software Engineer" style={inputStyle} />
              </FormField>
              <FormField label="Reporting Manager">
                <select style={inputStyle}>
                  <option value="">Select Manager</option>
                  {['Priya Menon', 'Vikram Nair', 'Sunita Rao', 'Rohan Malhotra', 'Anita Joshi'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Personal Email (for welcome email)">
                <input type="email" placeholder="employee@gmail.com" style={inputStyle} />
              </FormField>
              <FormField label="Mobile Number">
                <input type="tel" placeholder="+91 98765 43210" style={inputStyle} />
              </FormField>
            </div>
            <ModalFooter>
              <button onClick={() => setShowOnboardModal(false)} style={btnOutline}>Cancel</button>
              <button onClick={() => setShowOnboardModal(false)} style={btnPrimary}>Start Onboarding & Send Welcome Email</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SHARED MODAL COMPONENTS
───────────────────────────────────────────────────────────── */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem' }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6 }}>
        <X size={18} />
      </button>
    </div>
  )
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
      {children}
    </div>
  )
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
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: '0.875rem',
  color: '#111827',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  background: '#E8622A',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 20px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
}

const btnOutline: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '9px 20px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
}
