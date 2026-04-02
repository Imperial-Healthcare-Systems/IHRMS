'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  RefreshCw,
  Clock,
  CheckCircle,
  TrendingUp,
  X,
  ChevronDown,
  Plus,
  Star,
  Target,
  Users,
  BarChart2,
  Edit2,
  Eye,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type Tab = 'cycles' | 'teamreviews' | 'ratings' | 'goals'
type ReviewStatus = 'In Progress' | 'Completed' | 'Not Started'
type AppraisalStatus = 'Draft' | 'Submitted' | 'Acknowledged' | 'Completed'
type GoalStatus = 'On Track' | 'In Progress' | 'At Risk' | 'Completed' | 'Not Started'

interface ReviewCycle {
  id: number
  name: string
  period: string
  type: string
  status: ReviewStatus
  participants: number
  completion: number
  dueDate: string
}

interface TeamReview {
  id: number
  employee: string
  department: string
  period: string
  selfAssessment: string
  managerReview: string
  rating: string
  status: AppraisalStatus
}

interface RatingBand {
  label: string
  score: number
  count: number
  percentage: number
  color: string
  bg: string
}

interface DeptRating {
  dept: string
  avg: number
  topPerformer: string
}

interface GoalKRA {
  id: number
  name: string
  progress: number
  target: string
  achieved: string
  status: GoalStatus
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const REVIEW_CYCLES: ReviewCycle[] = [
  { id: 1, name: 'Annual Appraisal 2025-26', period: 'Apr 2025 – Mar 2026', type: 'Annual', status: 'In Progress', participants: 248, completion: 75, dueDate: 'Mar 31, 2026' },
  { id: 2, name: 'Mid-Year Review H2', period: 'Oct – Dec 2025', type: 'Mid-Year', status: 'Completed', participants: 248, completion: 100, dueDate: 'Dec 31, 2025' },
  { id: 3, name: 'Probation Review Q1 2026', period: 'Jan – Mar 2026', type: 'Probation', status: 'In Progress', participants: 15, completion: 60, dueDate: 'Mar 31, 2026' },
]

const TEAM_REVIEWS: TeamReview[] = [
  { id: 1, employee: 'Arjun Patel', department: 'Engineering', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Pending', rating: '—', status: 'Submitted' },
  { id: 2, employee: 'Sunita Rao', department: 'HR', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Submitted', rating: '4 – Exceeds', status: 'Acknowledged' },
  { id: 3, employee: 'Mohammed Irfan', department: 'Sales', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Submitted', rating: '3 – Meets', status: 'Completed' },
  { id: 4, employee: 'Deepika Sharma', department: 'Finance', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Not Started', managerReview: 'Pending', rating: '—', status: 'Draft' },
  { id: 5, employee: 'Vikram Nair', department: 'Operations', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Submitted', rating: '5 – Exceptional', status: 'Completed' },
  { id: 6, employee: 'Sonia Kapoor', department: 'Marketing', period: 'Apr 2025 – Mar 2026', selfAssessment: 'In Progress', managerReview: 'Pending', rating: '—', status: 'Draft' },
  { id: 7, employee: 'Ravi Shankar', department: 'Engineering', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Submitted', rating: '3 – Meets', status: 'Acknowledged' },
  { id: 8, employee: 'Kavita Pillai', department: 'Customer Support', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Submitted', rating: '2 – Needs Improvement', status: 'Completed' },
  { id: 9, employee: 'Priya Menon', department: 'Engineering', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Submitted', managerReview: 'Pending', rating: '—', status: 'Submitted' },
  { id: 10, employee: 'Ajay Gupta', department: 'Sales', period: 'Apr 2025 – Mar 2026', selfAssessment: 'Not Started', managerReview: 'Pending', rating: '—', status: 'Draft' },
]

const RATING_BANDS: RatingBand[] = [
  { label: 'Exceptional', score: 5, count: 18, percentage: 7.3, color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Exceeds Expectations', score: 4, count: 52, percentage: 21.0, color: '#2563eb', bg: '#eff6ff' },
  { label: 'Meets Expectations', score: 3, count: 142, percentage: 57.3, color: '#16a34a', bg: '#f0fdf4' },
  { label: 'Needs Improvement', score: 2, count: 28, percentage: 11.3, color: '#d97706', bg: '#fffbeb' },
  { label: 'Unsatisfactory', score: 1, count: 8, percentage: 3.2, color: '#dc2626', bg: '#fef2f2' },
]

const DEPT_RATINGS: DeptRating[] = [
  { dept: 'Engineering', avg: 3.8, topPerformer: 'Vikram Nair' },
  { dept: 'Sales', avg: 3.5, topPerformer: 'Rohan Malhotra' },
  { dept: 'HR', avg: 3.9, topPerformer: 'Sunita Rao' },
  { dept: 'Finance', avg: 3.6, topPerformer: 'Anita Joshi' },
  { dept: 'Operations', avg: 3.4, topPerformer: 'Kiran Bhat' },
  { dept: 'Marketing', avg: 3.7, topPerformer: 'Nisha Verma' },
  { dept: 'Customer Support', avg: 3.2, topPerformer: 'Suresh Reddy' },
]

const GOALS: GoalKRA[] = [
  { id: 1, name: 'Revenue Target', progress: 87, target: '₹50L', achieved: '₹43.5L', status: 'On Track' },
  { id: 2, name: 'Customer Satisfaction Score', progress: 92, target: '4.5/5', achieved: '4.1/5', status: 'On Track' },
  { id: 3, name: 'Team Development', progress: 67, target: '4 trainings', achieved: '3 done', status: 'In Progress' },
  { id: 4, name: 'Process Improvement', progress: 50, target: '2 process docs', achieved: '1 done', status: 'At Risk' },
  { id: 5, name: 'Cross-functional Projects', progress: 100, target: '2 projects', achieved: '2 done', status: 'Completed' },
  { id: 6, name: 'Certification', progress: 0, target: 'AWS Certified', achieved: 'Not started', status: 'Not Started' },
]

const KRA_ROWS = [
  'Job Knowledge',
  'Target Achievement',
  'Communication',
  'Leadership',
  'Initiative',
  'Teamwork',
]

/* ─────────────────────────────────────────────────────────────
   HELPERS / SMALL COMPONENTS
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'In Progress': { bg: '#fffbeb', color: '#d97706' },
    'Completed': { bg: '#f0fdf4', color: '#16a34a' },
    'Not Started': { bg: '#f9fafb', color: '#6b7280' },
    'Draft': { bg: '#f9fafb', color: '#6b7280' },
    'Submitted': { bg: '#eff6ff', color: '#2563eb' },
    'Acknowledged': { bg: '#faf5ff', color: '#7c3aed' },
  }
  const s = map[status] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
      {status}
    </span>
  )
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const map: Record<GoalStatus, { bg: string; color: string }> = {
    'On Track': { bg: '#f0fdf4', color: '#16a34a' },
    'In Progress': { bg: '#fffbeb', color: '#d97706' },
    'At Risk': { bg: '#fef2f2', color: '#dc2626' },
    'Completed': { bg: '#eff6ff', color: '#2563eb' },
    'Not Started': { bg: '#f9fafb', color: '#6b7280' },
  }
  const s = map[status]
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
      {status}
    </span>
  )
}

function ProgressBar({ value, color = '#2563eb' }: { value: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: { bg: string; icon: string; border: string } }) {
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
export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('cycles')
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState<TeamReview | null>(null)
  const [showGoalModal, setShowGoalModal] = useState(false)

  // Review modal form state
  const [kraRatings, setKraRatings] = useState<Record<string, number>>({})
  const [kraComments, setKraComments] = useState<Record<string, string>>({})
  const [overallRating, setOverallRating] = useState('')
  const [managerComments, setManagerComments] = useState('')
  const [nextGoals, setNextGoals] = useState(['', '', ''])
  const [incrementPct, setIncrementPct] = useState('')
  const [promote, setPromote] = useState(false)

  // Cycle modal state
  const [cycleName, setCycleName] = useState('')
  const [cycleStart, setCycleStart] = useState('')
  const [cycleEnd, setCycleEnd] = useState('')
  const [cycleType, setCycleType] = useState('Annual')
  const [cycleDesc, setCycleDesc] = useState('')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'cycles', label: 'Review Cycles' },
    { key: 'teamreviews', label: 'My Team Reviews' },
    { key: 'ratings', label: 'Performance Ratings' },
    { key: 'goals', label: 'Goals & KRAs' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Topbar
        title="Performance Management"
        actions={
          <button
            onClick={() => setShowCycleModal(true)}
            style={{ background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Start Review Cycle
          </button>
        }
      />

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
          <SummaryCard label="Active Review Cycles" value={2} icon={RefreshCw} color={{ bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe' }} />
          <SummaryCard label="Reviews Pending" value={34} icon={Clock} color={{ bg: '#fffbeb', icon: '#d97706', border: '#fde68a' }} />
          <SummaryCard label="Reviews Completed" value={186} icon={CheckCircle} color={{ bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' }} />
          <SummaryCard label="Promotions Recommended" value={8} icon={TrendingUp} color={{ bg: '#faf5ff', icon: '#7c3aed', border: '#e9d5ff' }} />
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 24px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: activeTab === t.key ? '#E8622A' : '#6b7280',
                  borderBottom: activeTab === t.key ? '2px solid #E8622A' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* ── TAB 1: Review Cycles ── */}
            {activeTab === 'cycles' && (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Cycle Name', 'Period', 'Type', 'Status', 'Participants', 'Completion %', 'Due Date', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {REVIEW_CYCLES.map((cycle, i) => (
                        <tr key={cycle.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{cycle.name}</td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{cycle.period}</td>
                          <td style={{ padding: '12px 14px', color: '#374151' }}>{cycle.type}</td>
                          <td style={{ padding: '12px 14px' }}><StatusBadge status={cycle.status} /></td>
                          <td style={{ padding: '12px 14px', color: '#374151', textAlign: 'center' }}>{cycle.participants}</td>
                          <td style={{ padding: '12px 14px', minWidth: 120 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <ProgressBar value={cycle.completion} color={cycle.completion === 100 ? '#16a34a' : '#2563eb'} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{cycle.completion}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{cycle.dueDate}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>View</button>
                              {cycle.status === 'In Progress' && (
                                <button style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>Close</button>
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

            {/* ── TAB 2: My Team Reviews ── */}
            {activeTab === 'teamreviews' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Showing appraisal status for your direct reports — Annual Appraisal 2025-26</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Employee', 'Department', 'Review Period', 'Self Assessment', 'Manager Review', 'Rating', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TEAM_REVIEWS.map((r, i) => (
                        <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{r.employee}</td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{r.department}</td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.8rem' }}>{r.period}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: r.selfAssessment === 'Submitted' ? '#16a34a' : '#d97706' }}>{r.selfAssessment}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: r.managerReview === 'Submitted' ? '#16a34a' : '#d97706' }}>{r.managerReview}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>{r.rating}</td>
                          <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(r.status === 'Draft' || r.status === 'Submitted') ? (
                                <button
                                  onClick={() => { setSelectedReview(r); setShowReviewModal(true) }}
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none', background: '#E8622A', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                                >Fill Review</button>
                              ) : (
                                <button
                                  onClick={() => { setSelectedReview(r); setShowReviewModal(true) }}
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                                >View</button>
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

            {/* ── TAB 3: Performance Ratings ── */}
            {activeTab === 'ratings' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                  {/* Rating Distribution */}
                  <div>
                    <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: 18, fontSize: '1rem' }}>Company-wide Rating Distribution</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {RATING_BANDS.map(band => (
                        <div key={band.score}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                              {band.label} ({band.score})
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{band.count} employees — {band.percentage}%</span>
                          </div>
                          <div style={{ width: '100%', height: 28, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                width: `${band.percentage}%`,
                                height: '100%',
                                background: band.color,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: 10,
                                transition: 'width 0.5s ease',
                              }}
                            >
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{band.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 20, padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                      <p style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 500 }}>
                        <strong>Bell Curve Insight:</strong> 57.3% of employees meet expectations — indicating a healthy, normally distributed performance spread. Only 3.2% are rated Unsatisfactory, suggesting strong talent quality across the organisation.
                      </p>
                    </div>
                  </div>

                  {/* Department-wise ratings */}
                  <div>
                    <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: 18, fontSize: '1rem' }}>Department-wise Average Ratings</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Department', 'Avg Rating', 'Top Performer'].map(h => (
                            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DEPT_RATINGS.map((d, i) => (
                          <tr key={d.dept} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 600, color: '#374151' }}>{d.dept}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} size={12} fill={s <= Math.round(d.avg) ? '#f59e0b' : 'none'} color={s <= Math.round(d.avg) ? '#f59e0b' : '#d1d5db'} />
                                  ))}
                                </div>
                                <span style={{ fontWeight: 700, color: '#374151' }}>{d.avg.toFixed(1)}</span>
                              </div>
                            </td>
                            <td style={{ padding: '11px 14px', color: '#6b7280' }}>{d.topPerformer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: Goals & KRAs ── */}
            {activeTab === 'goals' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Your goals for Annual Appraisal 2025-26</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setShowGoalModal(true)}
                      style={{ fontSize: '0.875rem', padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={14} /> Add New Goal
                    </button>
                    <button style={{ fontSize: '0.875rem', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#E8622A', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                      Request Review
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  {GOALS.map(goal => {
                    const barColor =
                      goal.status === 'Completed' ? '#2563eb' :
                      goal.status === 'On Track' ? '#16a34a' :
                      goal.status === 'In Progress' ? '#d97706' :
                      goal.status === 'At Risk' ? '#dc2626' : '#9ca3af'
                    return (
                      <div key={goal.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <h4 style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{goal.name}</h4>
                          <GoalStatusBadge status={goal.status} />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Progress</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: barColor }}>{goal.progress}%</span>
                          </div>
                          <ProgressBar value={goal.progress} color={barColor} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}>Target</p>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{goal.target}</p>
                          </div>
                          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}>Achieved</p>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{goal.achieved}</p>
                          </div>
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

      {/* ── Modal: Start Review Cycle ── */}
      {showCycleModal && (
        <ModalOverlay onClose={() => setShowCycleModal(false)}>
          <div style={{ width: 520 }}>
            <ModalHeader title="Start New Review Cycle" onClose={() => setShowCycleModal(false)} />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Cycle Name">
                <input value={cycleName} onChange={e => setCycleName(e.target.value)} placeholder="e.g. Annual Appraisal 2026-27" style={inputStyle} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Period Start">
                  <input type="date" value={cycleStart} onChange={e => setCycleStart(e.target.value)} style={inputStyle} />
                </FormField>
                <FormField label="Period End">
                  <input type="date" value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Review Type">
                <select value={cycleType} onChange={e => setCycleType(e.target.value)} style={inputStyle}>
                  <option>Annual</option>
                  <option>Mid-Year</option>
                  <option>Probation</option>
                  <option>Quarterly</option>
                </select>
              </FormField>
              <FormField label="Description">
                <textarea value={cycleDesc} onChange={e => setCycleDesc(e.target.value)} rows={3} placeholder="Brief description of this review cycle..." style={{ ...inputStyle, resize: 'vertical' }} />
              </FormField>
            </div>
            <ModalFooter>
              <button onClick={() => setShowCycleModal(false)} style={btnOutline}>Cancel</button>
              <button onClick={() => setShowCycleModal(false)} style={btnPrimary}>Save Cycle</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Fill Review ── */}
      {showReviewModal && selectedReview && (
        <ModalOverlay onClose={() => setShowReviewModal(false)}>
          <div style={{ width: 700, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ModalHeader title={`Performance Review — ${selectedReview.employee}`} onClose={() => setShowReviewModal(false)} />
            <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>
              {/* Employee info */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px', marginBottom: 22, display: 'flex', gap: 20 }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#0c4a6e' }}>{selectedReview.employee}</p>
                  <p style={{ fontSize: '0.8rem', color: '#0369a1' }}>{selectedReview.department} · {selectedReview.period}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={selectedReview.status} />
                </div>
              </div>

              {/* KRA Section */}
              <h4 style={{ fontWeight: 700, color: '#111827', marginBottom: 12, fontSize: '0.95rem' }}>KRA Ratings</h4>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>KRA</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: '0.8rem', width: 160 }}>Rating (1-5)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KRA_ROWS.map((kra, i) => (
                      <tr key={kra} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#374151' }}>{kra}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                            {[1,2,3,4,5].map(n => (
                              <button
                                key={n}
                                onClick={() => setKraRatings(prev => ({ ...prev, [kra]: n }))}
                                style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: kraRatings[kra] === n ? '#E8622A' : '#f3f4f6', color: kraRatings[kra] === n ? '#fff' : '#6b7280', transition: 'all 0.1s' }}
                              >{n}</button>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          <input
                            placeholder="Comment..."
                            value={kraComments[kra] || ''}
                            onChange={e => setKraComments(prev => ({ ...prev, [kra]: e.target.value }))}
                            style={{ ...inputStyle, padding: '6px 10px', fontSize: '0.8rem' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overall Rating */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <FormField label="Overall Rating">
                  <select value={overallRating} onChange={e => setOverallRating(e.target.value)} style={inputStyle}>
                    <option value="">Select Rating</option>
                    <option>Exceptional</option>
                    <option>Exceeds Expectations</option>
                    <option>Meets Expectations</option>
                    <option>Needs Improvement</option>
                    <option>Unsatisfactory</option>
                  </select>
                </FormField>
                <FormField label="Increment % Recommendation">
                  <input type="number" value={incrementPct} onChange={e => setIncrementPct(e.target.value)} placeholder="e.g. 12" style={inputStyle} />
                </FormField>
              </div>

              <FormField label="Manager Comments">
                <textarea value={managerComments} onChange={e => setManagerComments(e.target.value)} rows={3} placeholder="Overall performance summary, key strengths, areas of improvement..." style={{ ...inputStyle, resize: 'vertical' }} />
              </FormField>

              <h4 style={{ fontWeight: 700, color: '#111827', margin: '18px 0 10px', fontSize: '0.95rem' }}>Goals for Next Period</h4>
              {nextGoals.map((g, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <input
                    value={g}
                    onChange={e => setNextGoals(prev => prev.map((p, j) => j === i ? e.target.value : p))}
                    placeholder={`Goal ${i + 1}`}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <input type="checkbox" id="promote" checked={promote} onChange={e => setPromote(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="promote" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Recommend for Promotion</label>
              </div>
            </div>
            <ModalFooter>
              <button onClick={() => setShowReviewModal(false)} style={btnOutline}>Cancel</button>
              <button style={{ ...btnOutline, borderColor: '#d97706', color: '#d97706' }}>Save as Draft</button>
              <button onClick={() => setShowReviewModal(false)} style={btnPrimary}>Submit Review</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Add New Goal ── */}
      {showGoalModal && (
        <ModalOverlay onClose={() => setShowGoalModal(false)}>
          <div style={{ width: 480 }}>
            <ModalHeader title="Add New Goal / KRA" onClose={() => setShowGoalModal(false)} />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="KRA / Goal Name">
                <input placeholder="e.g. Revenue Target" style={inputStyle} />
              </FormField>
              <FormField label="Target">
                <input placeholder="e.g. ₹50L or 4.5/5" style={inputStyle} />
              </FormField>
              <FormField label="Weightage (%)">
                <input type="number" placeholder="e.g. 20" style={inputStyle} />
              </FormField>
              <FormField label="Due Date">
                <input type="date" style={inputStyle} />
              </FormField>
              <FormField label="Description">
                <textarea rows={2} placeholder="Brief description of this goal..." style={{ ...inputStyle, resize: 'vertical' }} />
              </FormField>
            </div>
            <ModalFooter>
              <button onClick={() => setShowGoalModal(false)} style={btnOutline}>Cancel</button>
              <button onClick={() => setShowGoalModal(false)} style={btnPrimary}>Add Goal</button>
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
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
