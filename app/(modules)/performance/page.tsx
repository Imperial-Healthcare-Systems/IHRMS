'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { RefreshCw, Clock, CheckCircle, TrendingUp, X, Plus, Star } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type Tab = 'cycles' | 'teamreviews' | 'ratings' | 'goals' | 'feedback360'

interface ReviewCycle {
  id: string
  name: string
  cycle_type: string
  period_from: string
  period_to: string
  due_date: string | null
  status: 'active' | 'completed' | 'cancelled'
  description: string | null
  participants: number
  completion: number
}

interface ApiReview {
  id: string
  cycle: string
  cycle_id: string | null
  review_period_from: string
  review_period_to: string
  self_rating: number | null
  manager_rating: number | null
  final_rating: number | null
  kra_scores: Record<string, { self?: number; manager?: number; comment?: string }> | null
  goals: Array<{ name: string; target: string; achieved?: string; progress?: number }> | null
  next_goals: string[] | null
  strengths: string | null
  areas_of_improvement: string | null
  training_needs: string[] | null
  promotion_recommended: boolean | null
  increment_recommended: number | null
  manager_comments: string | null
  status: string
  employee_acknowledged_at: string | null
  employee: { id: string; first_name: string; last_name: string; emp_id: string; email: string; department: { name: string } | null; designation: { title: string } | null } | null
  reviewer: { id: string; first_name: string; last_name: string; emp_id: string } | null
  created_at: string
}

const KRA_ROWS = ['Job Knowledge', 'Target Achievement', 'Communication', 'Leadership', 'Initiative', 'Teamwork']

const CYCLE_TYPE_MAP: Record<string, string> = {
  annual: 'Annual', half_yearly: 'Half-Year', quarterly: 'Quarterly', probation: 'Probation', pip: 'PIP',
}
const CYCLE_TYPE_TO_DB: Record<string, string> = {
  Annual: 'annual', 'Mid-Year': 'half_yearly', Quarterly: 'quarterly', Probation: 'probation', PIP: 'pip',
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtPeriod(from: string, to: string) {
  const f = new Date(from), t = new Date(to)
  return `${f.toLocaleString('en-IN', { month: 'short', year: 'numeric' })} – ${t.toLocaleString('en-IN', { month: 'short', year: 'numeric' })}`
}
function ratingLabel(n: number | null | undefined) {
  if (!n) return '—'
  const map: Record<number, string> = { 5: 'Exceptional', 4: 'Exceeds', 3: 'Meets', 2: 'Needs Improvement', 1: 'Unsatisfactory' }
  return `${n} – ${map[n] ?? n}`
}

/* ── Small UI components ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:        { bg: '#fffbeb', color: '#d97706' },
    'In Progress': { bg: '#fffbeb', color: '#d97706' },
    completed:     { bg: '#f0fdf4', color: '#16a34a' },
    Completed:     { bg: '#f0fdf4', color: '#16a34a' },
    cancelled:     { bg: '#fef2f2', color: '#dc2626' },
    draft:         { bg: '#f9fafb', color: '#6b7280' },
    Draft:         { bg: '#f9fafb', color: '#6b7280' },
    submitted:     { bg: '#eff6ff', color: '#2563eb' },
    Submitted:     { bg: '#eff6ff', color: '#2563eb' },
    acknowledged:  { bg: '#faf5ff', color: '#7c3aed' },
    Acknowledged:  { bg: '#faf5ff', color: '#7c3aed' },
  }
  const s = map[status] ?? { bg: '#f3f4f6', color: '#374151' }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, border: `1px solid ${s.color}22` }}>
      {label}
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

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
function ModalHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '3px 0 0' }}>{sub}</p>}
      </div>
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

const INP: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box' }
const BTN_PRIMARY: React.CSSProperties = { background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }
const BTN_OUTLINE: React.CSSProperties = { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function PerformancePage() {
  const { data: session } = useSession()
  const sessionUserId = (session?.user as Record<string, unknown>)?.id as string | undefined
  const sessionRole   = (session?.user as Record<string, unknown>)?.role as string | undefined
  const isAdmin       = (session?.user as Record<string, unknown>)?.isAdmin as boolean | undefined
                         || ['hr_admin', 'super_admin', 'admin', 'hr'].includes(sessionRole ?? '')

  const [activeTab, setActiveTab] = useState<Tab>('cycles')

  /* ── Data state ── */
  const [cycles,  setCycles]  = useState<ReviewCycle[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)

  /* ── Cycle modal ── */
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [cycleName,  setCycleName]  = useState('')
  const [cycleFrom,  setCycleFrom]  = useState('')
  const [cycleTo,    setCycleTo]    = useState('')
  const [cycleDue,   setCycleDue]   = useState('')
  const [cycleType,  setCycleType]  = useState('Annual')
  const [cycleDesc,  setCycleDesc]  = useState('')
  const [savingCycle, setSavingCycle] = useState(false)

  /* ── Review fill modal ── */
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [activeReview,    setActiveReview]    = useState<ApiReview | null>(null)
  const [kraRatings,   setKraRatings]   = useState<Record<string, number>>({})
  const [kraComments,  setKraComments]  = useState<Record<string, string>>({})
  const [managerRating,   setManagerRating]   = useState<number>(0)
  const [managerComments, setManagerComments] = useState('')
  const [nextGoals,    setNextGoals]    = useState(['', '', ''])
  const [incrementPct, setIncrementPct] = useState('')
  const [promote,      setPromote]      = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  /* ── Goal modal ── */
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalName,   setGoalName]   = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDue,    setGoalDue]    = useState('')
  const [goalDesc,   setGoalDesc]   = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  /* ── 360° Feedback state ── */
  interface Feedback360 {
    id: string
    subject_employee_id: string
    reviewer_id: string | null
    is_anonymous: boolean
    rating: number
    relationship: string
    comments: string | null
    created_at: string
    reviewer?: { first_name: string; last_name: string } | null
    subject_employee?: { first_name: string; last_name: string; emp_id: string } | null
  }
  const [feedback360,    setFeedback360]    = useState<Feedback360[]>([])
  const [f360Loading,    setF360Loading]    = useState(false)
  const [f360Employees,  setF360Employees]  = useState<{ id: string; first_name: string; last_name: string; emp_id: string }[]>([])
  const [f360Target,     setF360Target]     = useState('')
  const [f360Rating,     setF360Rating]     = useState(0)
  const [f360Relation,   setF360Relation]   = useState('peer')
  const [f360Comments,   setF360Comments]   = useState('')
  const [f360Anonymous,  setF360Anonymous]  = useState(false)
  const [f360Submitting, setF360Submitting] = useState(false)
  const [f360View,       setF360View]       = useState<'received' | 'given'>('received')
  const [cycleFilterId,  setCycleFilterId]  = useState<string>('')

  /* ─── Fetch ─── */
  const fetchAll = useCallback(async () => {
    if (!sessionUserId) return
    setLoading(true)
    try {
      const [cRes, rRes] = await Promise.all([
        fetch('/api/performance/cycles'),
        fetch(`/api/performance/reviews?limit=200`),
      ])
      const cJson = await cRes.json()
      const rJson = await rRes.json()
      setCycles(cJson.data ?? [])
      setReviews(rJson.data ?? [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [sessionUserId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ─── Fetch 360° data when tab opens ─── */
  useEffect(() => {
    if (activeTab !== 'feedback360' || !sessionUserId) return
    setF360Loading(true)
    Promise.all([
      fetch('/api/performance/feedback-360').then(r => r.json()),
      fetch('/api/employees?limit=200').then(r => r.json()),
    ]).then(([fbJson, empJson]) => {
      setFeedback360(fbJson.data ?? [])
      setF360Employees(empJson.data ?? [])
    }).catch(() => {}).finally(() => setF360Loading(false))
  }, [activeTab, sessionUserId])

  async function handleSubmitFeedback360() {
    if (!f360Target || f360Rating < 1) { toast.error('Select an employee and rating'); return }
    setF360Submitting(true)
    try {
      const res = await fetch('/api/performance/feedback-360', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: f360Target, rating: f360Rating, relationship: f360Relation, comments: f360Comments || null, is_anonymous: f360Anonymous }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success('Feedback submitted!')
      // Refetch so the new entry has joined subject/reviewer data for the list display
      try {
        const refRes  = await fetch('/api/performance/feedback-360')
        const refJson = await refRes.json()
        if (refRes.ok) setFeedback360(refJson.data ?? [])
      } catch { /* non-fatal — already toasted success */ }
      setF360Target(''); setF360Rating(0); setF360Comments(''); setF360Anonymous(false)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to submit') }
    finally { setF360Submitting(false) }
  }

  /* ─── Derived stats ─── */
  const activeCycles         = cycles.filter(c => c.status === 'active').length
  const pendingReviews       = reviews.filter(r => r.status === 'draft' || r.status === 'submitted').length
  const completedReviews     = reviews.filter(r => r.status === 'completed' || r.status === 'acknowledged').length
  const promotionsRecommended = reviews.filter(r => r.promotion_recommended).length

  // Team reviews = reviews where current user is reviewer
  const teamReviews = reviews
    .filter(r => r.reviewer?.id === sessionUserId || isAdmin)
    .filter(r => !cycleFilterId || r.cycle_id === cycleFilterId)

  // My reviews = reviews where I am the employee
  const myReviews = reviews.filter(r => r.employee?.id === sessionUserId)

  // Rating distribution from final/manager ratings
  const ratedReviews = reviews.filter(r => r.final_rating ?? r.manager_rating)
  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of ratedReviews) {
    const score = r.final_rating ?? r.manager_rating ?? 0
    if (score >= 1 && score <= 5) ratingCounts[score]++
  }
  const totalRated = ratedReviews.length || 1

  const RATING_BANDS = [
    { label: 'Exceptional',          score: 5, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Exceeds Expectations', score: 4, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Meets Expectations',   score: 3, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Needs Improvement',    score: 2, color: '#d97706', bg: '#fffbeb' },
    { label: 'Unsatisfactory',       score: 1, color: '#dc2626', bg: '#fef2f2' },
  ].map(b => ({ ...b, count: ratingCounts[b.score], percentage: Math.round((ratingCounts[b.score] / totalRated) * 100) }))

  // Dept average ratings
  const deptMap: Record<string, { total: number; count: number; top: string; topScore: number }> = {}
  for (const r of ratedReviews) {
    const dept = r.employee?.department?.name ?? 'Unknown'
    const score = r.final_rating ?? r.manager_rating ?? 0
    const name = r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0, top: '', topScore: 0 }
    deptMap[dept].total += score
    deptMap[dept].count++
    if (score > deptMap[dept].topScore) { deptMap[dept].topScore = score; deptMap[dept].top = name }
  }
  const deptRatings = Object.entries(deptMap).map(([dept, v]) => ({ dept, avg: v.count ? v.total / v.count : 0, top: v.top }))

  /* ─── Action handlers ─── */
  async function handleStartCycle() {
    if (!cycleName || !cycleFrom || !cycleTo) { toast.error('Name, period from and to are required'); return }
    setSavingCycle(true)
    try {
      const res = await fetch('/api/performance/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cycleName, cycle_type: CYCLE_TYPE_TO_DB[cycleType] ?? 'annual', period_from: cycleFrom, period_to: cycleTo, due_date: cycleDue || null, description: cycleDesc || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      const participants = json.data?.participants ?? 0
      toast.success(participants > 0
        ? `Cycle started! ${participants} reviews auto-generated for active employees.`
        : 'Review cycle started!')
      setCycles(prev => [{ ...json.data }, ...prev])
      // Refetch reviews so the newly auto-generated ones appear in My Team Reviews tab
      try {
        const rRes  = await fetch('/api/performance/reviews?limit=200')
        const rJson = await rRes.json()
        if (rRes.ok) setReviews(rJson.data ?? [])
      } catch { /* non-fatal */ }
      setShowCycleModal(false)
      setCycleName(''); setCycleFrom(''); setCycleTo(''); setCycleDue(''); setCycleDesc('')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to start cycle') }
    finally { setSavingCycle(false) }
  }

  async function handleCloseCycle(cycleId: string) {
    try {
      const res = await fetch(`/api/performance/cycles/${cycleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error) }
      setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, status: 'completed' } : c))
      toast.success('Cycle closed')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to close cycle') }
  }

  function openFillReview(review: ApiReview) {
    setActiveReview(review)
    // Pre-populate from existing data
    const kra = review.kra_scores ?? {}
    const ratings: Record<string, number> = {}
    const comments: Record<string, string> = {}
    for (const k of KRA_ROWS) {
      if (kra[k]?.manager) ratings[k] = kra[k].manager!
      if (kra[k]?.comment) comments[k] = kra[k].comment!
    }
    setKraRatings(ratings)
    setKraComments(comments)
    setManagerRating(review.manager_rating ?? 0)
    setManagerComments(review.manager_comments ?? '')
    setNextGoals(review.next_goals?.length ? [...review.next_goals, '', ''].slice(0, 3) : ['', '', ''])
    setIncrementPct(review.increment_recommended ? String(review.increment_recommended) : '')
    setPromote(review.promotion_recommended ?? false)
    setShowReviewModal(true)
  }

  async function handleSubmitReview(submitStatus: 'draft' | 'submitted') {
    if (!activeReview) return
    setSubmittingReview(true)
    try {
      const kraScores: Record<string, { self?: number; manager?: number; comment?: string }> = {}
      for (const k of KRA_ROWS) {
        kraScores[k] = { manager: kraRatings[k] ?? undefined, comment: kraComments[k] || undefined }
      }
      const goalsArr = nextGoals.filter(Boolean).map(g => ({ name: g }))

      let reviewId = activeReview.id
      // If no existing id (shouldn't happen normally), create first
      const payload: Record<string, unknown> = {
        kra_scores:             kraScores,
        manager_rating:         managerRating || null,
        manager_comments:       managerComments || null,
        promotion_recommended:  promote,
        increment_recommended:  incrementPct ? parseFloat(incrementPct) : null,
        next_goals:             nextGoals.filter(Boolean),
        goals:                  goalsArr.length ? goalsArr : activeReview.goals,
        status:                 submitStatus,
      }

      const res = await fetch(`/api/performance/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

      toast.success(submitStatus === 'submitted' ? 'Review submitted!' : 'Draft saved!')
      setShowReviewModal(false)
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ...payload, status: submitStatus } : r))
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save review') }
    finally { setSubmittingReview(false) }
  }

  async function handleAddGoal() {
    if (!goalName || !goalTarget) { toast.error('Goal name and target are required'); return }
    // Add goal to the user's latest review, or create one if none exists
    const myReview = myReviews[0]
    if (!myReview) { toast.error('No active review found for your profile'); return }
    setSavingGoal(true)
    try {
      const existing = myReview.goals ?? []
      const newGoal = { name: goalName, target: goalTarget, due_date: goalDue || null, description: goalDesc || null, achieved: '', progress: 0 }
      const res = await fetch(`/api/performance/reviews/${myReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: [...existing, newGoal] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Goal added!')
      setReviews(prev => prev.map(r => r.id === myReview.id ? { ...r, goals: json.data.goals } : r))
      setShowGoalModal(false)
      setGoalName(''); setGoalTarget(''); setGoalDue(''); setGoalDesc('')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to add goal') }
    finally { setSavingGoal(false) }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'cycles',      label: 'Review Cycles' },
    { key: 'teamreviews', label: 'My Team Reviews' },
    { key: 'ratings',     label: 'Performance Ratings' },
    { key: 'goals',       label: 'Goals & KRAs' },
    { key: 'feedback360', label: '360° Feedback' },
  ]

  /* ─── Goals from my review ─── */
  const myGoals = myReviews.flatMap(r => r.goals ?? [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Topbar
        title="Performance Management"
        subtitle="Manage review cycles, appraisals, and goals"
        actions={
          isAdmin ? (
            <button onClick={() => setShowCycleModal(true)} style={{ background: '#E8622A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Start Review Cycle
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: '16px 16px', maxWidth: 1400, margin: '0 auto' }} className="sm:!px-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16, marginBottom: 28 }}>
          <SummaryCard label="Active Review Cycles"    value={loading ? '…' : activeCycles}          icon={RefreshCw}   color={{ bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe' }} />
          <SummaryCard label="Reviews Pending"         value={loading ? '…' : pendingReviews}         icon={Clock}       color={{ bg: '#fffbeb', icon: '#d97706', border: '#fde68a' }} />
          <SummaryCard label="Reviews Completed"       value={loading ? '…' : completedReviews}       icon={CheckCircle} color={{ bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' }} />
          <SummaryCard label="Promotions Recommended"  value={loading ? '…' : promotionsRecommended}  icon={TrendingUp}  color={{ bg: '#faf5ff', icon: '#7c3aed', border: '#e9d5ff' }} />
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '14px 24px', fontSize: '0.875rem', fontWeight: 600, color: activeTab === t.key ? '#E8622A' : '#6b7280', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: `2px solid ${activeTab === t.key ? '#E8622A' : 'transparent'}`, background: 'none', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* ── TAB 1: Review Cycles ── */}
            {activeTab === 'cycles' && (
              <div>
                {loading ? (
                  <p style={{ color: '#6b7280', padding: 24, textAlign: 'center' }}>Loading cycles…</p>
                ) : cycles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <RefreshCw size={36} style={{ color: '#d1d5db', marginBottom: 12 }} />
                    <p style={{ color: '#6b7280', fontWeight: 500 }}>No review cycles yet.</p>
                    {isAdmin && <button onClick={() => setShowCycleModal(true)} style={{ ...BTN_PRIMARY, marginTop: 16 }}>Start First Cycle</button>}
                  </div>
                ) : (
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
                        {cycles.map((cycle, i) => (
                          <tr key={cycle.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{cycle.name}</td>
                            <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtPeriod(cycle.period_from, cycle.period_to)}</td>
                            <td style={{ padding: '12px 14px', color: '#374151' }}>{CYCLE_TYPE_MAP[cycle.cycle_type] ?? cycle.cycle_type}</td>
                            <td style={{ padding: '12px 14px' }}><StatusBadge status={cycle.status} /></td>
                            <td style={{ padding: '12px 14px', color: '#374151', textAlign: 'center' }}>{cycle.participants}</td>
                            <td style={{ padding: '12px 14px', minWidth: 130 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ProgressBar value={cycle.completion} color={cycle.completion === 100 ? '#16a34a' : '#2563eb'} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{cycle.completion}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(cycle.due_date)}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {cycle.status === 'active' && isAdmin && (
                                  <button
                                    onClick={() => handleCloseCycle(cycle.id)}
                                    style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                                  >Close</button>
                                )}
                                <button
                                  onClick={() => { setCycleFilterId(cycle.id); setActiveTab('teamreviews') }}
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                                >View</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: My Team Reviews ── */}
            {activeTab === 'teamreviews' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {isAdmin ? `All reviews — ${teamReviews.length} of ${reviews.length}` : `Your direct reports — ${teamReviews.length} reviews`}
                  </p>
                  {cycleFilterId && (() => {
                    const c = cycles.find(c => c.id === cycleFilterId)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px' }}>
                        Filtered by cycle: <strong>{c?.name ?? '—'}</strong>
                        <button onClick={() => setCycleFilterId('')} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: '1rem', lineHeight: 1, padding: 0 }} title="Clear filter">×</button>
                      </div>
                    )
                  })()}
                </div>
                {loading ? <p style={{ color: '#6b7280', textAlign: 'center', padding: 32 }}>Loading…</p>
                : teamReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                    <p style={{ fontWeight: 500 }}>No team reviews found.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Reviews will appear here once they are assigned to you as a reviewer.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Employee', 'Department', 'Review Period', 'Self Rating', 'Manager Rating', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamReviews.map((r, i) => (
                          <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '—'}</p>
                              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0 0' }}>{r.employee?.emp_id ?? ''}</p>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#6b7280' }}>{r.employee?.department?.name ?? '—'}</td>
                            <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtPeriod(r.review_period_from, r.review_period_to)}</td>
                            <td style={{ padding: '12px 14px' }}>
                              {r.self_rating ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {[1,2,3,4,5].map(s => <Star key={s} size={11} fill={s <= r.self_rating! ? '#f59e0b' : 'none'} color={s <= r.self_rating! ? '#f59e0b' : '#d1d5db'} />)}
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginLeft: 4 }}>{r.self_rating}</span>
                                </div>
                              ) : <span style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 500 }}>Pending</span>}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {r.manager_rating ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {[1,2,3,4,5].map(s => <Star key={s} size={11} fill={s <= r.manager_rating! ? '#E8622A' : 'none'} color={s <= r.manager_rating! ? '#E8622A' : '#d1d5db'} />)}
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginLeft: 4 }}>{r.manager_rating}</span>
                                </div>
                              ) : <span style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 500 }}>Pending</span>}
                            </td>
                            <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                            <td style={{ padding: '12px 14px' }}>
                              <button
                                onClick={() => openFillReview(r)}
                                style={{
                                  fontSize: '0.78rem', padding: '5px 12px', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
                                  ...(r.status === 'draft' || r.status === 'submitted'
                                    ? { background: '#E8622A', color: '#fff', border: 'none' }
                                    : { background: '#fff', color: '#374151', border: '1px solid #e5e7eb' })
                                }}
                              >{r.status === 'draft' || r.status === 'submitted' ? 'Fill Review' : 'View'}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: Performance Ratings ── */}
            {activeTab === 'ratings' && (
              <div>
                {ratedReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                    <p style={{ fontWeight: 500 }}>No rated reviews yet.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Ratings will appear here once manager reviews are submitted.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                    {/* Rating Distribution */}
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: 18, fontSize: '1rem' }}>Company-wide Rating Distribution</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {RATING_BANDS.map(band => (
                          <div key={band.score}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{band.label} ({band.score})</span>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{band.count} employees — {band.percentage}%</span>
                            </div>
                            <div style={{ width: '100%', height: 28, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${band.percentage}%`, height: '100%', background: band.color, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, minWidth: band.count > 0 ? 40 : 0 }}>
                                {band.count > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{band.percentage}%</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 20, padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <p style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 500 }}>
                          <strong>Summary:</strong> {ratedReviews.length} reviews rated out of {reviews.length} total. Average rating: {ratedReviews.length ? (ratedReviews.reduce((a, r) => a + (r.final_rating ?? r.manager_rating ?? 0), 0) / ratedReviews.length).toFixed(1) : '—'}.
                        </p>
                      </div>
                    </div>

                    {/* Department ratings */}
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: 18, fontSize: '1rem' }}>Department-wise Average Ratings</h3>
                      {deptRatings.length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No department data yet.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead>
                            <tr style={{ background: '#f9fafb' }}>
                              {['Department', 'Avg Rating', 'Top Performer'].map(h => (
                                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {deptRatings.map((d, i) => (
                              <tr key={d.dept} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '11px 14px', fontWeight: 600, color: '#374151' }}>{d.dept}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= Math.round(d.avg) ? '#f59e0b' : 'none'} color={s <= Math.round(d.avg) ? '#f59e0b' : '#d1d5db'} />)}
                                    <span style={{ fontWeight: 700, color: '#374151' }}>{d.avg.toFixed(1)}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '11px 14px', color: '#6b7280' }}>{d.top || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: Goals & KRAs ── */}
            {activeTab === 'goals' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Your goals linked to active performance reviews</p>
                  <button onClick={() => setShowGoalModal(true)} style={{ ...BTN_OUTLINE, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
                    <Plus size={14} /> Add New Goal
                  </button>
                </div>
                {myGoals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                    <p style={{ fontWeight: 500 }}>No goals yet.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Add goals to your active performance review.</p>
                    <button onClick={() => setShowGoalModal(true)} style={{ ...BTN_PRIMARY, marginTop: 16 }}>Add First Goal</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                    {myGoals.map((goal, idx) => {
                      const progress = goal.progress ?? 0
                      const barColor = progress >= 100 ? '#2563eb' : progress >= 70 ? '#16a34a' : progress >= 40 ? '#d97706' : '#dc2626'
                      return (
                        <div key={idx} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <h4 style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', margin: 0 }}>{goal.name}</h4>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Progress</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: barColor }}>{progress}%</span>
                            </div>
                            <ProgressBar value={progress} color={barColor} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                              <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}>Target</p>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{goal.target}</p>
                            </div>
                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                              <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}>Achieved</p>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{goal.achieved || '—'}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 5: 360° Feedback ── */}
            {activeTab === 'feedback360' && (
              <div>
                {/* Sub-nav */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {(['received', 'given'] as const).map(v => (
                    <button key={v} onClick={() => setF360View(v)} style={{ padding: '7px 18px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${f360View === v ? '#E8622A' : '#e5e7eb'}`, background: f360View === v ? '#fff7f5' : '#fff', color: f360View === v ? '#E8622A' : '#6b7280' }}>
                      {v === 'received' ? 'Received' : 'Given'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'flex-start' }}>

                  {/* Feedback list */}
                  <div>
                    {f360Loading ? (
                      <p style={{ color: '#6b7280', textAlign: 'center', padding: 32 }}>Loading feedback…</p>
                    ) : (() => {
                      const list = f360View === 'received'
                        ? feedback360.filter(f => (f.subject_id ?? f.subject?.id) === sessionUserId)
                        : feedback360.filter(f => (f.reviewer_id ?? f.reviewer?.id) === sessionUserId)
                      if (list.length === 0) return (
                        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                          <Star size={36} style={{ color: '#d1d5db', marginBottom: 12 }} />
                          <p style={{ fontWeight: 500 }}>{f360View === 'received' ? 'No feedback received yet.' : 'You haven\'t given any feedback yet.'}</p>
                        </div>
                      )
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {list.map(fb => {
                            const reviewerName = fb.is_anonymous && !isAdmin ? 'Anonymous' : fb.reviewer ? `${fb.reviewer.first_name} ${fb.reviewer.last_name}` : '—'
                            const subjectName  = fb.subject ? `${fb.subject.first_name} ${fb.subject.last_name}` : '—'
                            const RELATION_COLORS: Record<string, string> = { peer: '#2563eb', manager: '#7c3aed', reportee: '#16a34a', other: '#6b7280' }
                            return (
                              <div key={fb.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                  <div>
                                    <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>
                                      {f360View === 'received' ? `From: ${reviewerName}` : `To: ${subjectName}`}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: `${RELATION_COLORS[fb.relationship] ?? '#6b7280'}15`, color: RELATION_COLORS[fb.relationship] ?? '#6b7280', border: `1px solid ${RELATION_COLORS[fb.relationship] ?? '#6b7280'}33` }}>
                                        {fb.relationship.charAt(0).toUpperCase() + fb.relationship.slice(1)}
                                      </span>
                                      {fb.is_anonymous && <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontStyle: 'italic' }}>Anonymous</span>}
                                      <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{fmtDate(fb.created_at)}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    {[1,2,3,4,5].map(s => <Star key={s} size={16} fill={s <= fb.rating ? '#f59e0b' : 'none'} color={s <= fb.rating ? '#f59e0b' : '#d1d5db'} />)}
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginLeft: 6 }}>{fb.rating}/5</span>
                                  </div>
                                </div>
                                {fb.comments && (
                                  <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0, lineHeight: 1.6, background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>{fb.comments}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Submit feedback form */}
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, position: 'sticky', top: 80 }}>
                    <h3 style={{ fontWeight: 700, color: '#111827', margin: '0 0 18px', fontSize: '0.95rem' }}>Submit 360° Feedback</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <FormField label="Employee *">
                        <select value={f360Target} onChange={e => setF360Target(e.target.value)} style={INP}>
                          <option value="">Select employee…</option>
                          {f360Employees.filter(e => e.id !== sessionUserId).map(e => (
                            <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.emp_id})</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Relationship *">
                        <select value={f360Relation} onChange={e => setF360Relation(e.target.value)} style={INP}>
                          <option value="peer">Peer</option>
                          <option value="manager">Manager</option>
                          <option value="reportee">Reportee</option>
                          <option value="other">Other</option>
                        </select>
                      </FormField>
                      <FormField label="Rating (1–5) *">
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setF360Rating(n)} style={{ width: 38, height: 38, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: f360Rating >= n ? '#E8622A' : '#e5e7eb', color: f360Rating >= n ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </FormField>
                      <FormField label="Comments">
                        <textarea value={f360Comments} onChange={e => setF360Comments(e.target.value)} rows={4} placeholder="Share your thoughts…" style={{ ...INP, resize: 'vertical' }} />
                      </FormField>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                        <input type="checkbox" checked={f360Anonymous} onChange={e => setF360Anonymous(e.target.checked)} style={{ width: 16, height: 16 }} />
                        Submit anonymously
                      </label>
                      <button onClick={handleSubmitFeedback360} disabled={f360Submitting} style={{ ...BTN_PRIMARY, opacity: f360Submitting ? 0.7 : 1 }}>
                        {f360Submitting ? 'Submitting…' : 'Submit Feedback'}
                      </button>
                    </div>
                  </div>
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
            <ModalHeader title="Start New Review Cycle" sub="Create a new performance appraisal cycle for your organisation" onClose={() => setShowCycleModal(false)} />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '70vh' }}>
              <FormField label="Cycle Name *">
                <input value={cycleName} onChange={e => setCycleName(e.target.value)} placeholder="e.g. Annual Appraisal 2026-27" style={INP} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Period From *">
                  <input type="date" value={cycleFrom} onChange={e => setCycleFrom(e.target.value)} style={INP} />
                </FormField>
                <FormField label="Period To *">
                  <input type="date" value={cycleTo} onChange={e => setCycleTo(e.target.value)} style={INP} />
                </FormField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Review Type *">
                  <select value={cycleType} onChange={e => setCycleType(e.target.value)} style={INP}>
                    <option>Annual</option>
                    <option>Mid-Year</option>
                    <option>Quarterly</option>
                    <option>Probation</option>
                    <option>PIP</option>
                  </select>
                </FormField>
                <FormField label="Due Date">
                  <input type="date" value={cycleDue} onChange={e => setCycleDue(e.target.value)} style={INP} />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea value={cycleDesc} onChange={e => setCycleDesc(e.target.value)} rows={3} placeholder="Brief description of this review cycle…" style={{ ...INP, resize: 'vertical' }} />
              </FormField>
            </div>
            <ModalFooter>
              <button onClick={() => setShowCycleModal(false)} style={BTN_OUTLINE}>Cancel</button>
              <button onClick={handleStartCycle} disabled={savingCycle} style={{ ...BTN_PRIMARY, opacity: savingCycle ? 0.7 : 1 }}>{savingCycle ? 'Creating…' : 'Start Cycle'}</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Fill Review ── */}
      {showReviewModal && activeReview && (
        <ModalOverlay onClose={() => setShowReviewModal(false)}>
          <div style={{ width: 720, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ModalHeader
              title={`Performance Review — ${activeReview.employee ? `${activeReview.employee.first_name} ${activeReview.employee.last_name}` : 'Employee'}`}
              sub={`${activeReview.employee?.department?.name ?? ''} · ${fmtPeriod(activeReview.review_period_from, activeReview.review_period_to)}`}
              onClose={() => setShowReviewModal(false)}
            />
            <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>

              {/* Employee info banner */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#0c4a6e', margin: 0 }}>
                    {activeReview.employee ? `${activeReview.employee.first_name} ${activeReview.employee.last_name}` : '—'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '2px 0 0' }}>
                    {activeReview.employee?.designation?.title ?? ''} · {activeReview.employee?.emp_id ?? ''}
                  </p>
                </div>
                <StatusBadge status={activeReview.status} />
              </div>

              {/* KRA Ratings */}
              <h4 style={{ fontWeight: 700, color: '#111827', marginBottom: 12, fontSize: '0.95rem' }}>KRA Ratings (Manager Assessment)</h4>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>KRA</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: '0.8rem', width: 170 }}>Rating (1–5)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KRA_ROWS.map(kra => (
                      <tr key={kra} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#374151' }}>{kra}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                            {[1,2,3,4,5].map(n => (
                              <button key={n} onClick={() => setKraRatings(p => ({ ...p, [kra]: n }))}
                                style={{ width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: kraRatings[kra] === n ? '#E8622A' : '#f3f4f6', color: kraRatings[kra] === n ? '#fff' : '#6b7280' }}
                              >{n}</button>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          <input placeholder="Comment…" value={kraComments[kra] || ''} onChange={e => setKraComments(p => ({ ...p, [kra]: e.target.value }))} style={{ ...INP, padding: '6px 10px', fontSize: '0.8rem' }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overall + Increment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <FormField label="Overall Manager Rating (1–5)">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setManagerRating(n)}
                        style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: managerRating === n ? '#E8622A' : '#f3f4f6', color: managerRating === n ? '#fff' : '#6b7280' }}
                      >{n}</button>
                    ))}
                  </div>
                  {managerRating > 0 && <p style={{ fontSize: '0.75rem', color: '#E8622A', marginTop: 4, fontWeight: 600 }}>{ratingLabel(managerRating)}</p>}
                </FormField>
                <FormField label="Increment % Recommendation">
                  <input type="number" value={incrementPct} onChange={e => setIncrementPct(e.target.value)} placeholder="e.g. 12" style={INP} />
                </FormField>
              </div>

              <div style={{ marginBottom: 16 }}>
                <FormField label="Manager Comments">
                  <textarea value={managerComments} onChange={e => setManagerComments(e.target.value)} rows={3} placeholder="Overall performance summary, strengths, areas of improvement…" style={{ ...INP, resize: 'vertical' }} />
                </FormField>
              </div>

              <h4 style={{ fontWeight: 700, color: '#111827', margin: '18px 0 10px', fontSize: '0.95rem' }}>Goals for Next Period</h4>
              {nextGoals.map((g, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <input value={g} onChange={e => setNextGoals(p => p.map((v, j) => j === i ? e.target.value : v))} placeholder={`Goal ${i + 1}`} style={INP} />
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 14px', background: '#faf5ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
                <input type="checkbox" id="promote" checked={promote} onChange={e => setPromote(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }} />
                <label htmlFor="promote" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6d28d9', cursor: 'pointer' }}>Recommend for Promotion</label>
              </div>
            </div>

            <ModalFooter>
              <button onClick={() => setShowReviewModal(false)} style={BTN_OUTLINE}>Cancel</button>
              <button onClick={() => handleSubmitReview('draft')} disabled={submittingReview} style={{ ...BTN_OUTLINE, borderColor: '#d97706', color: '#d97706', opacity: submittingReview ? 0.7 : 1 }}>Save as Draft</button>
              <button onClick={() => handleSubmitReview('submitted')} disabled={submittingReview} style={{ ...BTN_PRIMARY, opacity: submittingReview ? 0.7 : 1 }}>{submittingReview ? 'Saving…' : 'Submit Review'}</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Add Goal ── */}
      {showGoalModal && (
        <ModalOverlay onClose={() => setShowGoalModal(false)}>
          <div style={{ width: 480 }}>
            <ModalHeader title="Add New Goal / KRA" sub="Goal will be linked to your active performance review" onClose={() => setShowGoalModal(false)} />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Goal / KRA Name *">
                <input value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="e.g. Revenue Target" style={INP} />
              </FormField>
              <FormField label="Target *">
                <input value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="e.g. ₹50L or 4.5/5" style={INP} />
              </FormField>
              <FormField label="Due Date">
                <input type="date" value={goalDue} onChange={e => setGoalDue(e.target.value)} style={INP} />
              </FormField>
              <FormField label="Description">
                <textarea rows={2} value={goalDesc} onChange={e => setGoalDesc(e.target.value)} placeholder="Brief description of this goal…" style={{ ...INP, resize: 'vertical' }} />
              </FormField>
            </div>
            <ModalFooter>
              <button onClick={() => setShowGoalModal(false)} style={BTN_OUTLINE}>Cancel</button>
              <button onClick={handleAddGoal} disabled={savingGoal} style={{ ...BTN_PRIMARY, opacity: savingGoal ? 0.7 : 1 }}>{savingGoal ? 'Adding…' : 'Add Goal'}</button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
