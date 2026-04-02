'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  AlertTriangle,
  Award,
  UserX,
  Target,
  X,
  Plus,
  Eye,
  Edit2,
  ToggleLeft,
  CheckCircle,
  Info,
  Zap,
  Shield,
  Clock,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type WarnTab = 'warnings' | 'appreciation' | 'termination' | 'rules'
type WarningLevel = 'Verbal' | '1st Written' | '2nd Written' | 'Final'
type WarnStatus = 'Draft' | 'Issued' | 'Acknowledged'
type ApprecCategory = 'Excellence' | 'Teamwork' | 'Innovation' | 'Customer' | 'Leadership'
type TermStatus = 'Draft' | 'Under Review' | 'Approved' | 'Executed'

interface WarningEntry {
  id: number
  employee: string
  department: string
  level: WarningLevel
  date: string
  subject: string
  status: WarnStatus
  prevWarnings: number
}

interface ApprecEntry {
  id: number
  employee: string
  department: string
  category: ApprecCategory
  date: string
  subject: string
  isPublic: boolean
  givenBy: string
}

interface TermCase {
  id: number
  employee: string
  department: string
  reason: string
  trigger: 'Auto' | 'Manual'
  warningCount: number
  status: TermStatus
  createdDate: string
}

interface AutoRule {
  id: number
  name: string
  condition: string
  action: string
  active: boolean
  lastTriggered: string
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const WARNINGS: WarningEntry[] = [
  { id: 1, employee: 'Karan Desai', department: 'Engineering', level: 'Final', date: 'Mar 10, 2026', subject: 'Repeated Absenteeism & Insubordination', status: 'Issued', prevWarnings: 2 },
  { id: 2, employee: 'Meena Joshi', department: 'Sales', level: '2nd Written', date: 'Feb 22, 2026', subject: 'Target Miss Q3 — Second Occurrence', status: 'Acknowledged', prevWarnings: 1 },
  { id: 3, employee: 'Suresh Reddy', department: 'Customer Support', level: '1st Written', date: 'Feb 10, 2026', subject: 'Poor Customer Handling — Recorded Call', status: 'Issued', prevWarnings: 0 },
  { id: 4, employee: 'Pooja Iyer', department: 'Finance', level: 'Verbal', date: 'Jan 28, 2026', subject: 'Late Submission of Financial Reports', status: 'Draft', prevWarnings: 0 },
  { id: 5, employee: 'Aditya Rao', department: 'Operations', level: '1st Written', date: 'Jan 15, 2026', subject: 'Violation of Safety Protocol', status: 'Issued', prevWarnings: 0 },
  { id: 6, employee: 'Lakshmi Nair', department: 'HR', level: 'Verbal', date: 'Jan 5, 2026', subject: 'Confidentiality Breach (Minor)', status: 'Acknowledged', prevWarnings: 0 },
  { id: 7, employee: 'Rahul Sharma', department: 'Engineering', level: '1st Written', date: 'Dec 20, 2025', subject: 'Code Commit Without Review — Production Incident', status: 'Issued', prevWarnings: 0 },
  { id: 8, employee: 'Farhan Khan', department: 'Sales', level: '2nd Written', date: 'Dec 5, 2025', subject: 'Misrepresentation of Discount Rates to Client', status: 'Issued', prevWarnings: 1 },
  { id: 9, employee: 'Priti Gupta', department: 'Marketing', level: 'Verbal', date: 'Nov 18, 2025', subject: 'Delayed Campaign Deliverables', status: 'Draft', prevWarnings: 0 },
  { id: 10, employee: 'Sandeep Malhotra', department: 'Operations', level: '1st Written', date: 'Nov 5, 2025', subject: 'Attendance: 8 absences in Oct without leave approval', status: 'Acknowledged', prevWarnings: 0 },
]

const APPRECIATIONS: ApprecEntry[] = [
  { id: 1, employee: 'Vikram Nair', department: 'Operations', category: 'Excellence', date: 'Mar 28, 2026', subject: 'Outstanding Logistics Optimization — Saved ₹8L', isPublic: true, givenBy: 'Priya Menon (Manager)' },
  { id: 2, employee: 'Sunita Rao', department: 'HR', category: 'Leadership', date: 'Mar 20, 2026', subject: 'Led successful POSH compliance training for 200+ employees', isPublic: true, givenBy: 'HR Director' },
  { id: 3, employee: 'Arjun Patel', department: 'Engineering', category: 'Innovation', date: 'Mar 15, 2026', subject: 'Developed AI-powered attendance anomaly detection tool', isPublic: true, givenBy: 'CTO' },
  { id: 4, employee: 'Nisha Verma', department: 'Marketing', category: 'Customer', date: 'Mar 8, 2026', subject: 'Campaign achieved 340% ROI — highest in company history', isPublic: false, givenBy: 'CMO' },
  { id: 5, employee: 'Rohan Malhotra', department: 'Sales', category: 'Excellence', date: 'Feb 25, 2026', subject: 'Closed ₹1.2Cr deal single-handedly — Q4 champion', isPublic: true, givenBy: 'Sales VP' },
  { id: 6, employee: 'Anita Joshi', department: 'Finance', category: 'Teamwork', date: 'Feb 18, 2026', subject: 'Completed year-end audit 5 days ahead of schedule', isPublic: false, givenBy: 'CFO' },
  { id: 7, employee: 'Kiran Bhat', department: 'Operations', category: 'Teamwork', date: 'Feb 10, 2026', subject: 'Coordinated seamless warehouse migration across 3 locations', isPublic: false, givenBy: 'COO' },
  { id: 8, employee: 'Mohammed Irfan', department: 'Sales', category: 'Customer', date: 'Jan 30, 2026', subject: 'Achieved 100% customer retention in assigned territory', isPublic: true, givenBy: 'Sales VP' },
  { id: 9, employee: 'Deepika Sharma', department: 'Finance', category: 'Innovation', date: 'Jan 22, 2026', subject: 'Automated GST reconciliation — saves 40 hours/month', isPublic: false, givenBy: 'CFO' },
  { id: 10, employee: 'Sonia Kapoor', department: 'Marketing', category: 'Excellence', date: 'Jan 15, 2026', subject: 'Launched brand refresh project on time and under budget', isPublic: true, givenBy: 'CMO' },
]

const TERM_CASES: TermCase[] = [
  { id: 1, employee: 'Karan Desai', department: 'Engineering', reason: 'Performance and Conduct Issues (3 formal warnings in 2026)', trigger: 'Auto', warningCount: 3, status: 'Under Review', createdDate: 'Mar 10, 2026' },
]

const AUTO_RULES: AutoRule[] = [
  { id: 1, name: 'Warning Threshold', condition: '3 warnings within a calendar year', action: 'Generate termination draft and send for HR approval', active: true, lastTriggered: 'Mar 10, 2026' },
  { id: 2, name: 'Attendance Rule', condition: 'Absent > 5 consecutive days without approved leave', action: 'Auto-generate 1st Written Warning and notify manager', active: true, lastTriggered: 'Jan 6, 2026' },
  { id: 3, name: 'Probation Failure', condition: 'Probation review rating: Unsatisfactory', action: 'Extend probation by 3 months OR initiate exit process', active: true, lastTriggered: 'Never' },
  { id: 4, name: 'Appraisal Action', condition: 'Annual review rating: Unsatisfactory (1)', action: 'Auto-create PIP (Performance Improvement Plan) with 90-day timeline', active: true, lastTriggered: 'Dec 31, 2025' },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function WarningLevelBadge({ level }: { level: WarningLevel }) {
  const map: Record<WarningLevel, { bg: string; color: string }> = {
    'Verbal': { bg: '#f3f4f6', color: '#4b5563' },
    '1st Written': { bg: '#fffbeb', color: '#d97706' },
    '2nd Written': { bg: '#fff7ed', color: '#ea580c' },
    'Final': { bg: '#fef2f2', color: '#dc2626' },
  }
  const s = map[level]
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {level}
    </span>
  )
}

function WarnStatusBadge({ status }: { status: WarnStatus }) {
  const map: Record<WarnStatus, { bg: string; color: string }> = {
    'Draft': { bg: '#f3f4f6', color: '#6b7280' },
    'Issued': { bg: '#fffbeb', color: '#d97706' },
    'Acknowledged': { bg: '#f0fdf4', color: '#16a34a' },
  }
  const s = map[status]
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>{status}</span>
}

function ApprecCategoryBadge({ category }: { category: ApprecCategory }) {
  const map: Record<ApprecCategory, { bg: string; color: string }> = {
    'Excellence': { bg: '#fffbeb', color: '#d97706' },
    'Teamwork': { bg: '#eff6ff', color: '#2563eb' },
    'Innovation': { bg: '#faf5ff', color: '#7c3aed' },
    'Customer': { bg: '#ecfdf5', color: '#059669' },
    'Leadership': { bg: '#fff1f2', color: '#e11d48' },
  }
  const s = map[category]
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{category}</span>
}

function TermStatusBadge({ status }: { status: TermStatus }) {
  const map: Record<TermStatus, { bg: string; color: string }> = {
    'Draft': { bg: '#f3f4f6', color: '#6b7280' },
    'Under Review': { bg: '#fffbeb', color: '#d97706' },
    'Approved': { bg: '#fff1f2', color: '#dc2626' },
    'Executed': { bg: '#fef2f2', color: '#991b1b' },
  }
  const s = map[status]
  return <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>{status}</span>
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

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function WarningsPage() {
  const [activeTab, setActiveTab] = useState<WarnTab>('warnings')
  const [showWarnModal, setShowWarnModal] = useState(false)
  const [showApprecModal, setShowApprecModal] = useState(false)
  const [showWarnDetail, setShowWarnDetail] = useState(false)
  const [selectedWarn, setSelectedWarn] = useState<WarningEntry | null>(null)
  const [showTermModal, setShowTermModal] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState<TermCase | null>(null)

  // Warning form
  const [warnEmployee, setWarnEmployee] = useState('')
  const [warnLevel, setWarnLevel] = useState('1st Written')
  const [warnDate, setWarnDate] = useState('')
  const [warnSubject, setWarnSubject] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [warnDesc, setWarnDesc] = useState('')

  // Appreciation form
  const [apprecEmployee, setApprecEmployee] = useState('')
  const [apprecCategory, setApprecCategory] = useState('Excellence')
  const [apprecSubject, setApprecSubject] = useState('')
  const [apprecDesc, setApprecDesc] = useState('')
  const [apprecPublic, setApprecPublic] = useState(true)

  // Rules state
  const [ruleToggles, setRuleToggles] = useState<Record<number, boolean>>(
    Object.fromEntries(AUTO_RULES.map(r => [r.id, r.active]))
  )

  const publicAppreciations = APPRECIATIONS.filter(a => a.isPublic).slice(0, 3)

  const TABS: { key: WarnTab; label: string }[] = [
    { key: 'warnings', label: 'Warning Letters' },
    { key: 'appreciation', label: 'Appreciation Notes' },
    { key: 'termination', label: 'Termination Cases' },
    { key: 'rules', label: 'Auto-Trigger Rules' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Topbar
        title="Warnings & Employee Relations"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowApprecModal(true)}
              style={{ background: '#fff', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Award size={14} /> Give Appreciation
            </button>
            <button
              onClick={() => setShowWarnModal(true)}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <AlertTriangle size={14} /> Issue Warning
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
          <SummaryCard label="Warning Letters Issued" value={12} icon={AlertTriangle} color={{ bg: '#fef2f2', icon: '#dc2626', border: '#fecaca' }} />
          <SummaryCard label="Appreciation Notes" value={28} icon={Award} color={{ bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' }} />
          <SummaryCard label="Termination Pending" value={1} icon={UserX} color={{ bg: '#fef2f2', icon: '#dc2626', border: '#fecaca' }} />
          <SummaryCard label="PIP Active" value={3} icon={Target} color={{ bg: '#fffbeb', icon: '#d97706', border: '#fde68a' }} />
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 22px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: activeTab === t.key ? '#E8622A' : '#6b7280',
                  borderBottom: activeTab === t.key ? '2px solid #E8622A' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* ── TAB 1: Warning Letters ── */}
            {activeTab === 'warnings' && (
              <div>
                {/* Auto-termination banner */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: 500, margin: 0 }}>
                    <strong>Auto-Termination Rule Active:</strong> Employees receiving 3 or more warnings within a calendar year will automatically have a termination draft generated and sent for HR approval.
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Employee', 'Department', 'Warning Level', 'Date', 'Subject', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {WARNINGS.map((w, i) => (
                        <tr key={w.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{w.employee}</div>
                            {w.prevWarnings > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 500 }}>{w.prevWarnings} prior warning{w.prevWarnings > 1 ? 's' : ''} in 2026</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{w.department}</td>
                          <td style={{ padding: '12px 14px' }}><WarningLevelBadge level={w.level} /></td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{w.date}</td>
                          <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 220 }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.subject}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}><WarnStatusBadge status={w.status} /></td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setSelectedWarn(w); setShowWarnDetail(true) }}
                                style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                              >View</button>
                              {w.status === 'Draft' && (
                                <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Issue</button>
                              )}
                              <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Edit</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 2: Appreciation Notes ── */}
            {activeTab === 'appreciation' && (
              <div>
                <div style={{ overflowX: 'auto', marginBottom: 32 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Employee', 'Department', 'Category', 'Date', 'Subject', 'Public', 'Given By', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {APPRECIATIONS.map((a, i) => (
                        <tr key={a.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{a.employee}</td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{a.department}</td>
                          <td style={{ padding: '12px 14px' }}><ApprecCategoryBadge category={a.category} /></td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{a.date}</td>
                          <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 220 }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.subject}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: a.isPublic ? '#f0fdf4' : '#f9fafb', color: a.isPublic ? '#16a34a' : '#6b7280', fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
                              {a.isPublic ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.8rem' }}>{a.givenBy}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>View</button>
                              <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Edit</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Wall of Fame */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <Award size={20} color="#d97706" />
                    <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', margin: 0 }}>Wall of Fame</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Public recognitions visible to all employees</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                    {publicAppreciations.map(a => (
                      <div
                        key={a.id}
                        style={{
                          background: 'linear-gradient(135deg, #fff9f0 0%, #fff 100%)',
                          border: '1px solid #fde68a',
                          borderRadius: 14,
                          padding: 20,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, background: '#fef3c7', borderRadius: '50%', opacity: 0.5 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #E8622A 0%, #f59e0b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                            {a.employee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>{a.employee}</p>
                            <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>{a.department}</p>
                          </div>
                          <div style={{ marginLeft: 'auto' }}>
                            <ApprecCategoryBadge category={a.category} />
                          </div>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>"{a.subject}"</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>{a.givenBy}</p>
                          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{a.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: Termination Cases ── */}
            {activeTab === 'termination' && (
              <div>
                {TERM_CASES.filter(t => t.trigger === 'Auto').length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Zap size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500, margin: 0 }}>
                      <strong>Auto-Generated Case Detected:</strong> One termination draft was automatically generated by the auto-trigger rule for exceeding 3 warnings in the calendar year 2026. Please review and take action.
                    </p>
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Employee', 'Department', 'Reason', 'Trigger', 'Warning Count', 'Status', 'Created Date', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TERM_CASES.map((tc, i) => (
                        <tr key={tc.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{tc.employee}</td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{tc.department}</td>
                          <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 220, fontSize: '0.82rem' }}>{tc.reason}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: tc.trigger === 'Auto' ? '#faf5ff' : '#f0fdf4', color: tc.trigger === 'Auto' ? '#7c3aed' : '#16a34a', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                              {tc.trigger}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.875rem', padding: '2px 8px', borderRadius: 6 }}>{tc.warningCount}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}><TermStatusBadge status={tc.status} /></td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{tc.createdDate}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setSelectedTerm(tc); setShowTermModal(true) }}
                                style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                              >View Draft</button>
                              <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#E8622A', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Send to HR</button>
                              <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: Auto-Trigger Rules ── */}
            {activeTab === 'rules' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Configure automated HR action rules. Changes take effect immediately.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {AUTO_RULES.map(rule => (
                    <div
                      key={rule.id}
                      style={{
                        background: '#fff',
                        border: `1px solid ${ruleToggles[rule.id] ? '#bfdbfe' : '#e5e7eb'}`,
                        borderRadius: 12,
                        padding: '18px 22px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr auto auto',
                        gap: 20,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Shield size={16} color={ruleToggles[rule.id] ? '#2563eb' : '#9ca3af'} />
                          <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>{rule.name}</p>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                          <span style={{ fontWeight: 600, color: '#374151' }}>Trigger:</span> {rule.condition}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 4px', fontWeight: 600 }}>ACTION</p>
                        <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>{rule.action}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 6px', fontWeight: 500 }}>Last Triggered</p>
                        <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0, fontWeight: 500 }}>{rule.lastTriggered}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        {/* Toggle */}
                        <button
                          onClick={() => setRuleToggles(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                          style={{
                            width: 48,
                            height: 26,
                            borderRadius: 999,
                            background: ruleToggles[rule.id] ? '#16a34a' : '#d1d5db',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 3,
                              left: ruleToggles[rule.id] ? 25 : 3,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'left 0.2s',
                            }}
                          />
                        </button>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: ruleToggles[rule.id] ? '#16a34a' : '#9ca3af' }}>
                          {ruleToggles[rule.id] ? 'ON' : 'OFF'}
                        </span>
                        <button style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal: Issue Warning ── */}
      {showWarnModal && (
        <ModalOverlay onClose={() => setShowWarnModal(false)}>
          <div style={{ width: 560 }}>
            <ModalHeader title="Issue Warning Letter" onClose={() => setShowWarnModal(false)} />
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Warning count notice */}
              {warnEmployee === 'Karan Desai' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600, margin: 0 }}>
                    This employee has 2 previous warnings in 2026. Issuing this warning will trigger auto-termination draft!
                  </p>
                </div>
              )}
              <FormField label="Employee">
                <select value={warnEmployee} onChange={e => setWarnEmployee(e.target.value)} style={inputStyle}>
                  <option value="">Select Employee</option>
                  {['Karan Desai', 'Meena Joshi', 'Suresh Reddy', 'Pooja Iyer', 'Arjun Patel', 'Vikram Nair', 'Deepika Sharma', 'Ravi Shankar', 'Priya Menon', 'Ajay Gupta'].map(n => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Warning Level">
                <select value={warnLevel} onChange={e => setWarnLevel(e.target.value)} style={inputStyle}>
                  <option>Verbal</option>
                  <option>1st Written</option>
                  <option>2nd Written</option>
                  <option>Final</option>
                </select>
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Warning Date">
                  <input type="date" value={warnDate} onChange={e => setWarnDate(e.target.value)} style={inputStyle} />
                </FormField>
                <FormField label="Incident Date">
                  <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Subject">
                <input value={warnSubject} onChange={e => setWarnSubject(e.target.value)} placeholder="Brief subject of the warning" style={inputStyle} />
              </FormField>
              <FormField label="Detailed Description *">
                <textarea value={warnDesc} onChange={e => setWarnDesc(e.target.value)} rows={4} placeholder="Describe the incident, policy violation, and expected corrective action in detail..." style={{ ...inputStyle, resize: 'vertical' }} required />
              </FormField>
              <FormField label="Attach Document">
                <div style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '14px', textAlign: 'center', cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem' }}>
                  Click to upload or drag and drop (PDF, DOCX, JPG)
                </div>
              </FormField>
            </div>
            <ModalFooter>
              <button style={btnOutline} onClick={() => setShowWarnModal(false)}>Cancel</button>
              <button style={{ ...btnOutline, borderColor: '#bfdbfe', color: '#2563eb' }}>Preview Letter</button>
              <button style={{ ...btnOutline, borderColor: '#fde68a', color: '#d97706' }}>Save Draft</button>
              <button onClick={() => setShowWarnModal(false)} style={{ ...btnPrimary, background: '#dc2626' }}>Issue Warning</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Warning Detail ── */}
      {showWarnDetail && selectedWarn && (
        <ModalOverlay onClose={() => setShowWarnDetail(false)}>
          <div style={{ width: 600 }}>
            <ModalHeader title="Warning Letter Preview" onClose={() => setShowWarnDetail(false)} />
            <div style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: '70vh' }}>
              {/* Letterhead */}
              <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5391 100%)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>IH</span>
                </div>
                <p style={{ fontWeight: 800, color: '#1E3A5F', margin: '4px 0 2px', fontSize: '1.1rem' }}>Imperial HR Management Systems Pvt. Ltd.</p>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>123 Business Park, Andheri East, Mumbai – 400069</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>Warning Letter</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'right' }}>Date: {selectedWarn.date}</p>
              </div>

              <div style={{ marginBottom: 16, fontSize: '0.875rem', lineHeight: 1.7, color: '#374151' }}>
                <p><strong>To:</strong> {selectedWarn.employee}</p>
                <p><strong>Department:</strong> {selectedWarn.department}</p>
                <p><strong>Warning Level:</strong> <WarningLevelBadge level={selectedWarn.level} /></p>
              </div>

              <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#374151' }}>
                <p>Dear {selectedWarn.employee.split(' ')[0]},</p>
                <p>This letter serves as a formal <strong>{selectedWarn.level} Warning</strong> regarding the matter of: <strong>{selectedWarn.subject}</strong>.</p>
                <p>Your conduct/performance has been found to be in violation of company policies as outlined in the Employee Handbook. This behaviour is unacceptable and cannot be tolerated.</p>
                <p>You are hereby advised to immediately rectify your conduct/performance. Failure to do so may result in further disciplinary action, including termination of employment.</p>
                <p>Please acknowledge receipt of this letter by signing below. Your signature does not imply agreement, only receipt of this document.</p>
              </div>

              <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>HR Manager Signature</p>
                  </div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>Employee Acknowledgement</p>
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter>
              <button onClick={() => setShowWarnDetail(false)} style={btnOutline}>Close</button>
              <button style={btnPrimary}>Download PDF</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Appreciation ── */}
      {showApprecModal && (
        <ModalOverlay onClose={() => setShowApprecModal(false)}>
          <div style={{ width: 500 }}>
            <ModalHeader title="Give Appreciation" onClose={() => setShowApprecModal(false)} />
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Employee">
                <select value={apprecEmployee} onChange={e => setApprecEmployee(e.target.value)} style={inputStyle}>
                  <option value="">Select Employee</option>
                  {['Arjun Patel', 'Sunita Rao', 'Vikram Nair', 'Nisha Verma', 'Rohan Malhotra', 'Deepika Sharma', 'Mohammed Irfan', 'Sonia Kapoor'].map(n => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category">
                <select value={apprecCategory} onChange={e => setApprecCategory(e.target.value)} style={inputStyle}>
                  <option>Excellence</option>
                  <option>Teamwork</option>
                  <option>Innovation</option>
                  <option>Customer</option>
                  <option>Leadership</option>
                </select>
              </FormField>
              <FormField label="Subject">
                <input value={apprecSubject} onChange={e => setApprecSubject(e.target.value)} placeholder="Brief subject of the appreciation" style={inputStyle} />
              </FormField>
              <FormField label="Description">
                <textarea value={apprecDesc} onChange={e => setApprecDesc(e.target.value)} rows={4} placeholder="Describe the achievement or behaviour being recognised..." style={{ ...inputStyle, resize: 'vertical' }} />
              </FormField>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f9fafb', borderRadius: 8 }}>
                <button
                  onClick={() => setApprecPublic(p => !p)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 999,
                    background: apprecPublic ? '#16a34a' : '#d1d5db',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ position: 'absolute', top: 2, left: apprecPublic ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </button>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Make Public</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>Appears in Wall of Fame visible to all employees</p>
                </div>
              </div>
            </div>
            <ModalFooter>
              <button onClick={() => setShowApprecModal(false)} style={btnOutline}>Cancel</button>
              <button onClick={() => setShowApprecModal(false)} style={{ ...btnPrimary, background: '#16a34a' }}>Submit Appreciation</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Termination Letter ── */}
      {showTermModal && selectedTerm && (
        <ModalOverlay onClose={() => setShowTermModal(false)}>
          <div style={{ width: 640 }}>
            <ModalHeader title="Termination Letter Draft" onClose={() => setShowTermModal(false)} />
            <div style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: '70vh' }}>
              {/* Auto-generated banner */}
              {selectedTerm.trigger === 'Auto' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8 }}>
                  <Zap size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500, margin: 0 }}>
                    This termination was auto-generated due to 3 warnings within calendar year 2026.
                  </p>
                </div>
              )}

              {/* Letterhead */}
              <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5391 100%)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>IH</span>
                </div>
                <p style={{ fontWeight: 800, color: '#1E3A5F', margin: '4px 0 2px', fontSize: '1.1rem' }}>Imperial HR Management Systems Pvt. Ltd.</p>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>123 Business Park, Andheri East, Mumbai – 400069</p>
              </div>

              <p style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.15rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Notice of Termination</p>

              <div style={{ marginBottom: 16, fontSize: '0.875rem', lineHeight: 1.7, color: '#374151' }}>
                <p><strong>To:</strong> {selectedTerm.employee}</p>
                <p><strong>Department:</strong> {selectedTerm.department}</p>
                <p><strong>Date:</strong> {selectedTerm.createdDate}</p>
              </div>

              <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#374151', marginBottom: 20 }}>
                <p>Dear {selectedTerm.employee.split(' ')[0]},</p>
                <p>We regret to inform you that your employment with Imperial HR Management Systems Pvt. Ltd. is hereby terminated effective <strong>April 15, 2026</strong> (15 days from the date of this notice).</p>
                <p><strong>Reason for Termination:</strong> {selectedTerm.reason}</p>
                <p>This decision has been made following due process, including three formal warning letters issued in the calendar year 2026, and subsequent counselling sessions. The company's progressive discipline policy has been fully adhered to.</p>
                <p>Your last working date will be <strong>April 15, 2026</strong>. Please ensure all company property, access cards, laptops, and documents are returned on or before your last working day.</p>
                <p>The Finance & HR team will initiate the Full and Final (FnF) settlement process within 30 days of your last working day. You will receive your FnF statement including any outstanding dues, leave encashment, and gratuity (if applicable).</p>
              </div>

              <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>HR Manager</p>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', margin: '2px 0 0' }}>Imperial HR Management Systems</p>
                  </div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>Employee Acknowledgement</p>
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter>
              <button onClick={() => setShowTermModal(false)} style={{ ...btnOutline, borderColor: '#fecaca', color: '#dc2626' }}>Cancel Termination</button>
              <button style={{ ...btnOutline, borderColor: '#fde68a', color: '#d97706' }}>Request Changes</button>
              <button onClick={() => setShowTermModal(false)} style={{ ...btnPrimary, background: '#dc2626' }}>Approve & Execute</button>
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
