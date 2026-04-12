'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { recruitmentApi, type JobRequisition as ApiJobRequisition, type Candidate as ApiCandidate, type Interview as ApiInterview } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Search, Download, Eye, MoreVertical,
  X, Filter, Phone, Video, Building2, Mail,
  Plus, FileText, Clock, Users, MessageSquare, Pencil,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type Tab      = 'requisitions' | 'pipeline' | 'interviews' | 'offers'
type Priority = 'Urgent' | 'High' | 'Medium' | 'Low'
type Stage    = 'All' | 'Applied' | 'Screening' | 'Interview' | 'Technical' | 'HR Round' | 'Offer' | 'Selected' | 'Rejected'

const DEPARTMENTS = ['All Departments']
const STAGES: Stage[] = ['All', 'Applied', 'Screening', 'Interview', 'Technical', 'HR Round', 'Offer', 'Selected', 'Rejected']

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS  — same bg/color/border triads as Employee page
───────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Open:       { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'On Hold':  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Filled:     { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  Closed:     { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  Pending:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Accepted:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Scheduled:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Completed:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Rejected:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  Selected:   { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
}

const PRIORITY_CFG: Record<Priority, { bg: string; color: string; border: string }> = {
  Urgent: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  High:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Medium: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Low:    { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const STAGE_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Applied:   { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  Screening: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  Interview: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Technical: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'HR Round':{ bg: '#fdf4ff', color: '#7c3aed', border: '#e9d5ff' },
  Offer:     { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Selected:  { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  Rejected:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

const SOURCE_CFG: Record<string, { bg: string; color: string; border: string }> = {
  LinkedIn: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Naukri:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Referral: { bg: '#fdf4ff', color: '#7c3aed', border: '#e9d5ff' },
  Direct:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Indeed:   { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  Agency:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Campus:   { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
}

/* ─────────────────────────────────────────────────────────────
   SHARED ATOM COMPONENTS  — mirrors Employee page patterns
───────────────────────────────────────────────────────────── */

/** Avatar — same palette + transparency trick as Employee page */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${PALETTE[idx]}1A`,
      border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx],
      flexShrink: 0, letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

/** Status badge — uses badge-dot class exactly like Employee page */
function StatusBadge({ s }: { s: string }) {
  const c = STATUS_CFG[s] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span className="badge badge-dot" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {s}
    </span>
  )
}

/** Priority badge — uses badge class (no dot) */
function PriorityBadge({ p }: { p: Priority }) {
  const c = PRIORITY_CFG[p] ?? PRIORITY_CFG.Low
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {p}
    </span>
  )
}

/** Stage badge */
function StageBadge({ s }: { s: string }) {
  const c = STAGE_CFG[s] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {s}
    </span>
  )
}

/** Source badge */
function SourceBadge({ s }: { s: string }) {
  const c = SOURCE_CFG[s] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {s}
    </span>
  )
}

/** Mode badge */
function ModeBadge({ m }: { m: string }) {
  const icon = m === 'Video' ? <Video size={10} /> : m === 'In-person' ? <Building2 size={10} /> : <Phone size={10} />
  const c = m === 'Video'      ? { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
           : m === 'In-person' ? { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }
           :                     { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon}{m}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function RecruitmentPage() {
  const [tab, setTab] = useState<Tab>('requisitions')

  // Requisitions filters
  const [reqSearch,  setReqSearch]  = useState('')
  const [reqDept,    setReqDept]    = useState('All Departments')
  const [reqPri,     setReqPri]     = useState('All Priority')
  const [reqStatus,  setReqStatus]  = useState('All Status')

  // Pipeline filters
  const [pipeSearch, setPipeSearch] = useState('')
  const [pipeStage,  setPipeStage]  = useState<Stage>('All')

  // Real data — no mock fallback
  type JRRow = { id: string; title: string; dept: string; loc: string; open: number; filled: number; exp: string; sal: string; pri: Priority; status: string; apps: number; days: number }
  type CandRow = { id: string; name: string; co: string; pos: string; exp: string; ctc: string; src: string; stage: Stage; upd: string }
  type IVRow = { id: string; name: string; pos: string; round: string; date: string; time: string; mode: string; ivrs: string[]; status: string }

  const [apiJR, setApiJR]                   = useState<JRRow[]>([])
  const [apiCandidates, setApiCandidates]   = useState<CandRow[]>([])
  const [apiInterviews, setApiInterviews]   = useState<IVRow[]>([])
  const [loadingJR, setLoadingJR]           = useState(true)
  const [loadingCands, setLoadingCands]     = useState(true)
  const [loadingIVs, setLoadingIVs]         = useState(true)
  const [deptFilterList, setDeptFilterList] = useState<string[]>(['All Departments'])

  // Helper: cap priority to known values
  function toPriority(p?: string): Priority {
    const cap = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Medium'
    return (['Urgent','High','Medium','Low'].includes(cap) ? cap : 'Medium') as Priority
  }

  const fetchAll = useCallback(async () => {
    // Requisitions
    try {
      const res = await fetch('/api/recruitment/requisitions?limit=100')
      const json = await res.json()
      const rows: JRRow[] = (json.data ?? []).map((r: Record<string, unknown>) => {
        const dept = r.department as Record<string, unknown> | null
        const minExp = Number(r.min_experience_years ?? 0)
        const maxExp = r.max_experience_years ? Number(r.max_experience_years) : minExp + 3
        const minCtc = r.min_ctc ? Math.round(Number(r.min_ctc) / 100000) : null
        const maxCtc = r.max_ctc ? Math.round(Number(r.max_ctc) / 100000) : null
        const status = String(r.status ?? 'open')
        return {
          id: String(r.id ?? '').slice(0, 8).toUpperCase(),
          title: String(r.title ?? ''),
          dept: String(dept?.name ?? '—'),
          loc: String(r.location ?? 'Remote'),
          open: Number(r.no_of_positions ?? 1),
          filled: Number(r.filled_positions ?? 0),
          exp: `${minExp}–${maxExp} yr`,
          sal: minCtc ? `${minCtc}–${maxCtc ?? minCtc + 5} LPA` : 'Competitive',
          pri: toPriority(String(r.priority ?? 'medium')),
          status: status === 'open' ? 'Open' : status === 'on_hold' ? 'On Hold' : status === 'filled' ? 'Filled' : 'Closed',
          apps: 0,
          days: Math.floor((Date.now() - new Date(String(r.created_at)).getTime()) / 86400000),
        }
      })
      setApiJR(rows)
      // Build department dropdown from real data
      const depts = ['All Departments', ...Array.from(new Set(rows.map(r => r.dept).filter(d => d !== '—')))]
      setDeptFilterList(depts)
    } catch (e) { console.error('[recruitment JR]', e) }
    finally { setLoadingJR(false) }

    // Candidates
    try {
      const res = await fetch('/api/recruitment/candidates?limit=200')
      const json = await res.json()
      const rows: CandRow[] = (json.data ?? []).map((c: Record<string, unknown>) => {
        const req = c.requisition as Record<string, unknown> | null
        const rawStatus = String(c.status ?? 'applied')
        const stageMap: Record<string, Stage> = {
          applied: 'Applied', screening: 'Screening', interview: 'Interview',
          technical: 'Technical', hr_round: 'HR Round', offer: 'Offer',
          selected: 'Selected', rejected: 'Rejected',
        }
        return {
          id: String(c.id ?? ''),
          name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
          co: String(c.current_company ?? '—'),
          pos: String(req?.title ?? '—'),
          exp: c.total_experience != null ? `${c.total_experience} yr` : '—',
          ctc: c.current_ctc ? `${Math.round(Number(c.current_ctc) / 100000)} LPA` : '—',
          src: String(c.source ?? 'Direct'),
          stage: stageMap[rawStatus] ?? 'Applied',
          upd: c.updated_at ? new Date(String(c.updated_at)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
        }
      })
      setApiCandidates(rows)
    } catch (e) { console.error('[recruitment candidates]', e) }
    finally { setLoadingCands(false) }

    // Interviews
    try {
      const res = await fetch('/api/recruitment/interviews?limit=100')
      const json = await res.json()
      const rows: IVRow[] = (json.data ?? []).map((iv: Record<string, unknown>) => {
        const cand = iv.candidate as Record<string, unknown> | null
        const req  = iv.requisition as Record<string, unknown> | null
        const dt = iv.scheduled_at ? new Date(String(iv.scheduled_at)) : null
        const modeRaw = String(iv.mode ?? 'video')
        return {
          id: String(iv.id ?? ''),
          name: cand ? `${cand.first_name} ${cand.last_name}` : '—',
          pos: String(req?.title ?? '—'),
          round: `${iv.round_name ?? iv.round_number ?? 'Round'} · Round ${iv.round_number ?? 1}`,
          date: dt ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
          time: dt ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
          mode: modeRaw === 'video' ? 'Video' : modeRaw === 'phone' ? 'Phone' : 'In-person',
          ivrs: Array.isArray(iv.interviewers) ? iv.interviewers as string[] : [],
          status: iv.result === 'pass' || iv.result === 'fail' || iv.result === 'no_show' ? 'Completed' : 'Scheduled',
        }
      })
      setApiInterviews(rows)
    } catch (e) { console.error('[recruitment interviews]', e) }
    finally { setLoadingIVs(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filteredJR = useMemo(() => apiJR.filter((j) => {
    const q = reqSearch.toLowerCase()
    return (
      (!q || j.title.toLowerCase().includes(q) || j.id.toLowerCase().includes(q)) &&
      (reqDept   === 'All Departments' || j.dept   === reqDept) &&
      (reqPri    === 'All Priority'    || j.pri    === reqPri) &&
      (reqStatus === 'All Status'      || j.status === reqStatus)
    )
  }), [apiJR, reqSearch, reqDept, reqPri, reqStatus])

  const filteredCandidates = useMemo(() => apiCandidates.filter((c) => {
    const q = pipeSearch.toLowerCase()
    return (
      (!q || c.name.toLowerCase().includes(q) || c.pos.toLowerCase().includes(q)) &&
      (pipeStage === 'All' || c.stage === pipeStage)
    )
  }), [apiCandidates, pipeSearch, pipeStage])

  const groupedInterviews = useMemo(() => {
    const groups: Record<string, IVRow[]> = {}
    apiInterviews.forEach((iv) => {
      if (!groups[iv.date]) groups[iv.date] = []
      groups[iv.date].push(iv)
    })
    return groups
  }, [apiInterviews])

  // Funnel computed from real candidate stages
  const funnelStages = ['Applied','Screening','Interview','Technical','HR Round','Offer','Selected']
  const funnel = useMemo(() => funnelStages.map(label => ({
    label,
    count: apiCandidates.filter(c => c.stage === label).length,
  })), [apiCandidates])

  const hasReqFilters = reqSearch || reqDept !== 'All Departments' || reqPri !== 'All Priority' || reqStatus !== 'All Status'

  function clearReqFilters() {
    setReqSearch(''); setReqDept('All Departments'); setReqPri('All Priority'); setReqStatus('All Status')
  }

  /* ── View modals ── */
  const [viewJR, setViewJR]     = useState<JRRow | null>(null)
  const [viewCand, setViewCand] = useState<CandRow | null>(null)

  /* ── Row action dropdown ── */
  const [menuOpen, setMenuOpen] = useState<{ type: string; id: string | number } | null>(null)
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  const STAGES_ORDER: Stage[] = ['Applied', 'Screening', 'Interview', 'Technical', 'HR Round', 'Offer', 'Selected']

  function nextStage(current: Stage): Stage {
    const idx = STAGES_ORDER.indexOf(current)
    return idx >= 0 && idx < STAGES_ORDER.length - 1 ? STAGES_ORDER[idx + 1] : current
  }

  const MENU_STYLE: React.CSSProperties = {
    position: 'absolute', right: 0, top: '100%', zIndex: 200, marginTop: 4,
    background: '#fff', border: '1px solid var(--color-gray-200)',
    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: 180, overflow: 'hidden',
  }
  const MI_STYLE: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '9px 16px', fontSize: '0.8125rem', fontWeight: 500,
    color: 'var(--color-gray-700)', background: 'none', border: 'none',
    cursor: 'pointer',
  }
  const MI_RED: React.CSSProperties = { ...MI_STYLE, color: '#dc2626' }

  /* ── Remarks — persisted in localStorage ── */
  const [remarks, setRemarks] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('ihrms_remarks') ?? '{}') } catch { return {} }
  })
  const [remarkModal, setRemarkModal] = useState<{ key: string; label: string } | null>(null)
  const [remarkText, setRemarkText] = useState('')

  useEffect(() => { localStorage.setItem('ihrms_remarks', JSON.stringify(remarks)) }, [remarks])

  function openRemark(key: string, label: string) {
    setRemarkText(remarks[key] ?? '')
    setRemarkModal({ key, label })
  }
  function saveRemark() {
    if (!remarkModal) return
    if (remarkText.trim()) setRemarks(r => ({ ...r, [remarkModal.key]: remarkText.trim() }))
    else setRemarks(r => { const n = { ...r }; delete n[remarkModal.key]; return n })
    setRemarkModal(null)
    toast.success(remarkText.trim() ? 'Remark saved' : 'Remark removed')
  }

  /* ── Interview Comments — persisted in localStorage ── */
  type IvComment = { id: string; text: string; author: string; ts: string }
  const [comments, setComments] = useState<Record<string, IvComment[]>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('ihrms_iv_comments') ?? '{}') } catch { return {} }
  })
  const [commentPanel, setCommentPanel] = useState<IVRow | null>(null)
  const [newComment, setNewComment] = useState('')

  useEffect(() => { localStorage.setItem('ihrms_iv_comments', JSON.stringify(comments)) }, [comments])

  function addComment(ivKey: string) {
    if (!newComment.trim()) return
    const c: IvComment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      author: 'HR Admin',
      ts: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }
    setComments(prev => ({ ...prev, [ivKey]: [...(prev[ivKey] ?? []), c] }))
    setNewComment('')
  }
  function deleteComment(ivKey: string, commentId: string) {
    setComments(prev => ({ ...prev, [ivKey]: (prev[ivKey] ?? []).filter(c => c.id !== commentId) }))
  }

  /* ── New Requisition modal state ── */
  const [showNewReq, setShowNewReq] = useState(false)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [reqForm, setReqForm] = useState({
    title: '', department_id: '', location: '', employment_type: 'full_time',
    no_of_positions: '1', min_experience_years: '', max_experience_years: '',
    min_ctc: '', max_ctc: '', priority: 'medium', target_date: '', job_description: '',
  })
  const [reqSaving, setReqSaving] = useState(false)
  const [reqErr, setReqErr] = useState('')

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(j => setDepartments(j.data ?? [])).catch(() => {})
  }, [])

  const handleCreateReq = useCallback(async () => {
    if (!reqForm.title.trim() || !reqForm.department_id || !reqForm.location.trim() || !reqForm.employment_type) {
      setReqErr('Title, department, location and employment type are required.')
      return
    }
    setReqSaving(true); setReqErr('')
    try {
      const res = await fetch('/api/recruitment/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:               reqForm.title.trim(),
          department_id:       reqForm.department_id,
          location:            reqForm.location.trim(),
          employment_type:     reqForm.employment_type,
          openings:            reqForm.no_of_positions || '1',
          min_experience_years: reqForm.min_experience_years || '0',
          max_experience_years: reqForm.max_experience_years || null,
          min_ctc:             reqForm.min_ctc || null,
          max_ctc:             reqForm.max_ctc || null,
          priority:            reqForm.priority,
          target_date:         reqForm.target_date || null,
          job_description:     reqForm.job_description || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create')
      // Add to list immediately
      const r = json.data
      setApiJR(prev => [{
        id: r.id.slice(0, 8).toUpperCase(),
        title: r.title,
        dept: departments.find(d => d.id === r.department_id)?.name ?? '—',
        loc: r.location ?? '—',
        open: r.no_of_positions ?? 1,
        filled: 0,
        exp: r.min_experience_years != null ? `${r.min_experience_years}–${r.max_experience_years ?? (r.min_experience_years + 2)} yr` : 'Any',
        sal: r.min_ctc ? `${Math.round(r.min_ctc / 100000)}–${Math.round((r.max_ctc ?? r.min_ctc * 1.5) / 100000)} LPA` : 'Competitive',
        pri: (r.priority ? r.priority.charAt(0).toUpperCase() + r.priority.slice(1) : 'Medium') as Priority,
        status: 'Open',
        apps: 0,
        days: 0,
      }, ...prev])
      setShowNewReq(false)
      setReqForm({ title: '', department_id: '', location: '', employment_type: 'full_time', no_of_positions: '1', min_experience_years: '', max_experience_years: '', min_ctc: '', max_ctc: '', priority: 'medium', target_date: '', job_description: '' })
    } catch (e: unknown) {
      setReqErr(e instanceof Error ? e.message : 'Failed to create requisition')
    } finally {
      setReqSaving(false)
    }
  }, [reqForm, departments])

  const INP: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--color-gray-900)', background: '#fff', outline: 'none', boxSizing: 'border-box' }
  const LBL: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 6 }

  return (
    <>
      <Topbar
        title="Recruitment & Pre-boarding"
        subtitle="Manage requisitions, candidates, interviews and offers"
        notificationCount={3}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <Download size={14} />
              Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewReq(true)}>
              <Plus size={14} />
              New Requisition
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── Summary Cards — exact same structure as Employee page ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Open Positions',   value: '8',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Total Applicants', value: '47', color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
            { label: 'Interviews Today', value: '2',  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
            { label: 'Offers Pending',   value: '1',  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Hired This Month', value: '3',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
          ].map((s) => (
            <div key={s.label} className="card card-interactive" style={{ padding: '16px 18px', borderColor: s.border, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                {s.value}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Hiring Pipeline — clean segmented bar, single color ── */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>
                Hiring Pipeline
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                Click a stage to filter candidates
              </p>
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
              {apiCandidates.length} total applicants
            </span>
          </div>

          {/* Segmented funnel — computed from real candidate data */}
          <div style={{ display: 'flex', border: '1px solid var(--color-gray-200)', borderRadius: 8, overflow: 'hidden' }}>
            {funnel.map((stage, idx) => {
              const total = apiCandidates.length || 1
              const pct   = Math.round((stage.count / total) * 100)
              const active = pipeStage === stage.label
              return (
                <button
                  key={stage.label}
                  onClick={() => { setTab('pipeline'); setPipeStage(stage.label as Stage) }}
                  style={{
                    flex: 1,
                    padding: '14px 10px',
                    background: active ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#fafbfc',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderBottom: 'none',
                    borderRight: idx < funnel.length - 1 ? '1px solid var(--color-gray-200)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'background 150ms',
                    position: 'relative',
                  }}
                >
                  {/* Active indicator bar at top */}
                  {active && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#1d4ed8' }} />
                  )}
                  <p style={{
                    fontSize: '1.375rem', fontWeight: 700, lineHeight: 1, margin: 0,
                    color: active ? '#1d4ed8' : 'var(--color-gray-800)',
                  }}>
                    {stage.count}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: active ? '#1d4ed8' : 'var(--color-gray-500)', margin: '4px 0 0', fontWeight: 500 }}>
                    {stage.label}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: active ? '#93c5fd' : 'var(--color-gray-300)', marginTop: 2 }}>
                    {pct}%
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Main Content Card with Tabs ── */}
        <div className="card" style={{ overflow: 'hidden' }}>

          {/* Tab Bar */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-gray-200)', padding: '0 20px' }}>
            {([
              { key: 'requisitions', label: 'Job Requisitions',   count: apiJR.length },
              { key: 'pipeline',     label: 'Candidate Pipeline', count: apiCandidates.length },
              { key: 'interviews',   label: 'Interviews',         count: apiInterviews.length },
              { key: 'offers',       label: 'Offers',             count: apiCandidates.filter(c => c.stage === 'Offer' || c.stage === 'Selected').length },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '14px 16px',
                  fontSize: '0.875rem',
                  fontWeight: tab === t.key ? 600 : 500,
                  color: tab === t.key ? '#1E3A5F' : 'var(--color-gray-500)',
                  background: 'none',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: `2px solid ${tab === t.key ? '#1E3A5F' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                {t.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99,
                  fontSize: '0.7rem', fontWeight: 700,
                  background: tab === t.key ? '#dbeafe' : 'var(--color-gray-100)',
                  color:      tab === t.key ? '#1d4ed8' : 'var(--color-gray-500)',
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* ─── TAB: REQUISITIONS ─── */}
          {tab === 'requisitions' && (
            <div>
              {/* Filter bar — same pattern as Employee page */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 8,
                    border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
                    padding: '8px 12px', background: 'var(--color-gray-50)',
                  }}>
                    <Search size={15} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Search by role, JR ID..."
                      value={reqSearch}
                      onChange={(e) => setReqSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--color-gray-800)' }}
                    />
                    {reqSearch && (
                      <button onClick={() => setReqSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <select value={reqDept} onChange={(e) => setReqDept(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 170, fontSize: '0.875rem' }}>
                    {deptFilterList.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  <select value={reqPri} onChange={(e) => setReqPri(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 140, fontSize: '0.875rem' }}>
                    {(['All Priority', 'Urgent', 'High', 'Medium', 'Low'] as const).map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <select value={reqStatus} onChange={(e) => setReqStatus(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 140, fontSize: '0.875rem' }}>
                    {['All Status', 'Open', 'On Hold', 'Filled', 'Closed'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {hasReqFilters && (
                    <button className="btn btn-ghost btn-sm" onClick={clearReqFilters} style={{ color: '#ef4444' }}>
                      <X size={14} /> Clear
                    </button>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {filteredJR.length} of {apiJR.length} requisitions
                  </span>
                </div>
              </div>

              {/* Table — same data-table pattern as Employee page */}
              {loadingJR ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading requisitions…</p>
                </div>
              ) : (
              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 240 }}>Role</th>
                      <th style={{ minWidth: 190 }}>Department &amp; Location</th>
                      <th style={{ minWidth: 160 }}>Experience &amp; Salary</th>
                      <th style={{ minWidth: 110 }}>Priority</th>
                      <th style={{ minWidth: 110 }}>Status</th>
                      <th style={{ minWidth: 140 }}>Applicants / Fill</th>
                      <th style={{ minWidth: 90 }}>Days Open</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJR.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <FileText size={36} style={{ color: 'var(--color-gray-300)' }} />
                            <p style={{ fontWeight: 600, color: 'var(--color-gray-500)', fontSize: '0.9375rem' }}>No requisitions found</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>Try adjusting your search or filter criteria</p>
                            <button className="btn btn-outline btn-sm" onClick={clearReqFilters}>Clear Filters</button>
                          </div>
                        </td>
                      </tr>
                    ) : filteredJR.map((jr) => {
                      const fillPct = jr.open > 0 ? Math.round((jr.filled / jr.open) * 100) : 0
                      return (
                        <tr key={jr.id}>
                          {/* Role */}
                          <td>
                            <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>
                              {jr.title}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-imperial-blue)', fontFamily: 'monospace', marginTop: 2, fontWeight: 500 }}>
                              {jr.id}
                            </p>
                          </td>

                          {/* Department & Location */}
                          <td>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-800)' }}>{jr.dept}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                              📍 {jr.loc}
                            </p>
                          </td>

                          {/* Experience & Salary */}
                          <td>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{jr.exp}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>{jr.sal}</p>
                          </td>

                          {/* Priority */}
                          <td><PriorityBadge p={jr.pri} /></td>

                          {/* Status */}
                          <td><StatusBadge s={jr.status} /></td>

                          {/* Applicants + fill progress */}
                          <td>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                              {jr.apps} applicants
                            </p>
                            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--color-gray-100)', maxWidth: 64, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 99,
                                  background: fillPct === 100 ? '#15803d' : '#1d4ed8',
                                  width: `${fillPct}%`,
                                  transition: 'width 0.5s',
                                }} />
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                                {jr.filled}/{jr.open} filled
                              </span>
                            </div>
                          </td>

                          {/* Days Open */}
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>
                            {jr.days}d
                          </td>

                          {/* Actions */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={() => setViewJR(jr)}><Eye size={15} /></button>
                              <button
                                className="btn btn-ghost btn-sm btn-icon"
                                title={remarks[`jr_${jr.id}`] ? 'View / edit remark' : 'Add remark'}
                                onClick={() => openRemark(`jr_${jr.id}`, jr.title)}
                                style={{ position: 'relative' }}
                              >
                                <Pencil size={14} />
                                {remarks[`jr_${jr.id}`] && (
                                  <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #fff' }} />
                                )}
                              </button>
                              <div style={{ position: 'relative' }}>
                                <button
                                  className="btn btn-ghost btn-sm btn-icon" title="More"
                                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen?.id === jr.id && menuOpen.type === 'jr' ? null : { type: 'jr', id: jr.id }) }}
                                >
                                  <MoreVertical size={15} />
                                </button>
                                {menuOpen?.type === 'jr' && menuOpen.id === jr.id && (
                                  <div style={MENU_STYLE} onClick={e => e.stopPropagation()}>
                                    <button style={MI_STYLE} onClick={() => { toast('Edit feature coming soon'); setMenuOpen(null) }}>Edit Requisition</button>
                                    {jr.status === 'Open' && (
                                      <button style={MI_STYLE} onClick={() => { setApiJR(prev => prev.map(r => r.id === jr.id ? { ...r, status: 'On Hold' } : r)); toast.success('Requisition put on hold'); setMenuOpen(null) }}>Put On Hold</button>
                                    )}
                                    {jr.status === 'On Hold' && (
                                      <button style={MI_STYLE} onClick={() => { setApiJR(prev => prev.map(r => r.id === jr.id ? { ...r, status: 'Open' } : r)); toast.success('Requisition reopened'); setMenuOpen(null) }}>Reopen</button>
                                    )}
                                    {jr.status !== 'Closed' && jr.status !== 'Filled' && (
                                      <button style={MI_RED} onClick={() => { setApiJR(prev => prev.map(r => r.id === jr.id ? { ...r, status: 'Closed' } : r)); toast.success('Requisition closed'); setMenuOpen(null) }}>Close Requisition</button>
                                    )}
                                  </div>
                                )}
                              </div>
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

          {/* ─── TAB: PIPELINE ─── */}
          {tab === 'pipeline' && (
            <div>
              {/* Search + stage chips */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    flex: '0 1 260px', display: 'flex', alignItems: 'center', gap: 8,
                    border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
                    padding: '8px 12px', background: 'var(--color-gray-50)',
                  }}>
                    <Search size={15} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={pipeSearch}
                      onChange={(e) => setPipeSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--color-gray-800)' }}
                    />
                    {pipeSearch && (
                      <button onClick={() => setPipeSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Stage filter chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setPipeStage(s)}
                        style={{
                          padding: '5px 12px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 500,
                          cursor: 'pointer', transition: 'all 150ms',
                          background: pipeStage === s ? '#1E3A5F' : 'var(--color-gray-100)',
                          color:      pipeStage === s ? '#ffffff' : 'var(--color-gray-600)',
                          border:    `1px solid ${pipeStage === s ? '#1E3A5F' : 'var(--color-gray-200)'}`,
                          outline: 'none',
                        }}
                      >
                        {s}{s !== 'All' ? ` (${apiCandidates.filter((c) => c.stage === s).length})` : ` (${apiCandidates.length})`}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {filteredCandidates.length} candidates
                  </span>
                </div>
              </div>

              {/* Candidate table */}
              {loadingCands ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading candidates…</p>
                </div>
              ) : (
              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>Candidate</th>
                      <th style={{ minWidth: 210 }}>Applied For</th>
                      <th style={{ minWidth: 130 }}>Stage</th>
                      <th style={{ minWidth: 110 }}>Source</th>
                      <th style={{ minWidth: 120 }}>Current CTC</th>
                      <th style={{ minWidth: 110 }}>Last Updated</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <Users size={36} style={{ color: 'var(--color-gray-300)' }} />
                            <p style={{ fontWeight: 600, color: 'var(--color-gray-500)', fontSize: '0.9375rem' }}>No candidates found</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>Try adjusting your stage filter or search</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCandidates.map((c) => (
                      <tr key={c.id}>
                        {/* Candidate */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar name={c.name} size={36} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                {c.name}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                                {c.co} · {c.exp}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Applied For */}
                        <td>
                          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', fontWeight: 500 }}>{c.pos}</p>
                        </td>

                        {/* Stage */}
                        <td><StageBadge s={c.stage} /></td>

                        {/* Source */}
                        <td><SourceBadge s={c.src} /></td>

                        {/* CTC */}
                        <td>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>{c.ctc}</p>
                        </td>

                        {/* Updated */}
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{c.upd}</td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <button className="btn btn-ghost btn-sm btn-icon" title="View profile" onClick={() => setViewCand(c)}><Eye size={15} /></button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title={remarks[`cand_${c.id}`] ? 'View / edit remark' : 'Add remark'}
                              onClick={() => openRemark(`cand_${c.id}`, c.name)}
                              style={{ position: 'relative' }}
                            >
                              <Pencil size={14} />
                              {remarks[`cand_${c.id}`] && (
                                <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #fff' }} />
                              )}
                            </button>
                            <div style={{ position: 'relative' }}>
                              <button
                                className="btn btn-ghost btn-sm btn-icon" title="More"
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen?.id === c.id && menuOpen.type === 'cand' ? null : { type: 'cand', id: c.id }) }}
                              >
                                <MoreVertical size={15} />
                              </button>
                              {menuOpen?.type === 'cand' && menuOpen.id === c.id && (
                                <div style={MENU_STYLE} onClick={e => e.stopPropagation()}>
                                  {c.stage !== 'Selected' && c.stage !== 'Rejected' && (
                                    <button style={MI_STYLE} onClick={() => { setApiCandidates(prev => prev.map(x => x.id === c.id ? { ...x, stage: nextStage(x.stage) } : x)); toast.success(`Moved to ${nextStage(c.stage)}`); setMenuOpen(null) }}>
                                      Move to {nextStage(c.stage)}
                                    </button>
                                  )}
                                  <button style={MI_STYLE} onClick={() => { toast('Schedule Interview coming soon'); setMenuOpen(null) }}>Schedule Interview</button>
                                  {c.stage !== 'Rejected' && (
                                    <button style={MI_RED} onClick={() => { setApiCandidates(prev => prev.map(x => x.id === c.id ? { ...x, stage: 'Rejected' as Stage } : x)); toast.success('Candidate rejected'); setMenuOpen(null) }}>Reject Candidate</button>
                                  )}
                                </div>
                              )}
                            </div>
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

          {/* ─── TAB: INTERVIEWS ─── */}
          {tab === 'interviews' && (
            <div style={{ padding: '20px' }}>
              {loadingIVs ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading interviews…</p>
                </div>
              ) : Object.keys(groupedInterviews).length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No interviews scheduled</p>
                </div>
              ) : Object.entries(groupedInterviews).map(([date, ivs]) => (
                <div key={date} style={{ marginBottom: 28 }}>
                  {/* Date group header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                      {date === 'Apr 3' ? '📅 Today — Apr 3, 2026' : `📅 ${date}, 2026`}
                    </span>
                    <span
                      className="badge"
                      style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-500)', border: '1px solid var(--color-gray-200)' }}
                    >
                      {ivs.length} interview{ivs.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Interview table */}
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 190 }}>Candidate</th>
                          <th style={{ minWidth: 210 }}>Position &amp; Round</th>
                          <th style={{ minWidth: 110 }}>Time</th>
                          <th style={{ minWidth: 120 }}>Mode</th>
                          <th style={{ minWidth: 180 }}>Interviewers</th>
                          <th style={{ minWidth: 110 }}>Status</th>
                          <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ivs.map((iv) => (
                          <tr key={iv.id}>
                            {/* Candidate */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar name={iv.name} size={32} />
                                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-900)' }}>{iv.name}</p>
                              </div>
                            </td>

                            {/* Position & Round */}
                            <td>
                              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)', fontWeight: 500 }}>{iv.pos}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>{iv.round}</p>
                            </td>

                            {/* Time */}
                            <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                              <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: 'var(--color-gray-400)' }} />
                              {iv.time}
                            </td>

                            {/* Mode */}
                            <td><ModeBadge m={iv.mode} /></td>

                            {/* Interviewers */}
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {iv.ivrs.map((ivr) => (
                                  <span key={ivr} style={{
                                    fontSize: '0.75rem', color: 'var(--color-gray-600)',
                                    background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-200)',
                                    padding: '2px 8px', borderRadius: 99,
                                  }}>
                                    {ivr}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Status */}
                            <td><StatusBadge s={iv.status} /></td>

                            {/* Actions */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                {iv.status === 'Completed' ? (
                                  <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                                    Feedback
                                  </button>
                                ) : (
                                  <button className="btn btn-ghost btn-sm btn-icon" title="Join call"><Video size={15} /></button>
                                )}
                                {/* Comments */}
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  title="Comments"
                                  onClick={() => setCommentPanel(iv)}
                                  style={{ position: 'relative' }}
                                >
                                  <MessageSquare size={14} />
                                  {(comments[`iv_${iv.id}`] ?? []).length > 0 && (
                                    <span style={{
                                      position: 'absolute', top: 1, right: 1,
                                      minWidth: 14, height: 14, borderRadius: 99,
                                      background: '#1d4ed8', border: '1.5px solid #fff',
                                      fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      lineHeight: 1, padding: '0 3px',
                                    }}>
                                      {(comments[`iv_${iv.id}`] ?? []).length}
                                    </span>
                                  )}
                                </button>
                                {/* Remark */}
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  title={remarks[`iv_${iv.id}`] ? 'View / edit remark' : 'Add remark'}
                                  onClick={() => openRemark(`iv_${iv.id}`, iv.name)}
                                  style={{ position: 'relative' }}
                                >
                                  <Pencil size={14} />
                                  {remarks[`iv_${iv.id}`] && (
                                    <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #fff' }} />
                                  )}
                                </button>
                                <div style={{ position: 'relative' }}>
                                  <button
                                    className="btn btn-ghost btn-sm btn-icon" title="More"
                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen?.id === iv.id && menuOpen.type === 'iv' ? null : { type: 'iv', id: iv.id }) }}
                                  >
                                    <MoreVertical size={15} />
                                  </button>
                                  {menuOpen?.type === 'iv' && menuOpen.id === iv.id && (
                                    <div style={MENU_STYLE} onClick={e => e.stopPropagation()}>
                                      {iv.status !== 'Completed' && (
                                        <button style={MI_STYLE} onClick={() => { toast('Reschedule feature coming soon'); setMenuOpen(null) }}>Reschedule</button>
                                      )}
                                      {iv.status !== 'Completed' && (
                                        <button style={MI_RED} onClick={() => { setApiInterviews(prev => prev.map(x => x.id === iv.id ? { ...x, status: 'Completed' } : x)); toast.success('Interview cancelled'); setMenuOpen(null) }}>Cancel Interview</button>
                                      )}
                                      {iv.status === 'Completed' && (
                                        <button style={MI_STYLE} onClick={() => { toast('Feedback form coming soon'); setMenuOpen(null) }}>Add Feedback</button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── TAB: OFFERS — candidates at Offer or Selected stage ─── */}
          {tab === 'offers' && (() => {
            const offerCands = apiCandidates.filter(c => c.stage === 'Offer' || c.stage === 'Selected')
            return (
              <div>
                {loadingCands ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                    <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.875rem' }}>Loading offers…</p>
                  </div>
                ) : offerCands.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                    <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No offers yet</p>
                    <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Candidates at Offer or Selected stage will appear here.</p>
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 200 }}>Candidate</th>
                          <th style={{ minWidth: 220 }}>Position</th>
                          <th style={{ minWidth: 130 }}>Expected CTC</th>
                          <th style={{ minWidth: 150 }}>Current Company</th>
                          <th style={{ minWidth: 110 }}>Stage</th>
                          <th style={{ minWidth: 110 }}>Last Updated</th>
                          <th style={{ minWidth: 90, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offerCands.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <Avatar name={o.name} size={36} />
                                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-900)' }}>{o.name}</p>
                              </div>
                            </td>
                            <td>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-800)' }}>{o.pos}</p>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{o.ctc}</span>
                            </td>
                            <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>{o.co}</td>
                            <td><StageBadge s={o.stage} /></td>
                            <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{o.upd}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                <button className="btn btn-ghost btn-sm btn-icon" title="View details" onClick={() => setViewCand(o)}><Eye size={15} /></button>
                                <button className="btn btn-ghost btn-sm btn-icon" title="Add remark" onClick={() => openRemark(`offer_${o.id}`, o.name)} style={{ position: 'relative' }}>
                                  <Pencil size={14} />
                                  {remarks[`offer_${o.id}`] && <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #fff' }} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

        </div>
      </div>

      {/* ── View Requisition Modal ── */}
      {viewJR && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 520, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{viewJR.title}</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{viewJR.id} · {viewJR.dept}</p>
              </div>
              <button onClick={() => setViewJR(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {([
                  ['Department',       viewJR.dept],
                  ['Location',         viewJR.loc],
                  ['Experience',       viewJR.exp],
                  ['Salary Range',     viewJR.sal],
                  ['Positions',        `${viewJR.filled}/${viewJR.open} filled`],
                  ['Priority',         viewJR.pri],
                  ['Status',           viewJR.status],
                  ['Days Open',        `${viewJR.days}d`],
                  ['Total Applicants', String(viewJR.apps)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-gray-50)' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 500 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-gray-900)', marginTop: 2, fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>
              {/* Remarks section */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#b45309', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Pencil size={13} /> Remarks
                  </span>
                  <button onClick={() => { setViewJR(null); openRemark(`jr_${viewJR.id}`, viewJR.title) }} style={{ fontSize: '0.75rem', color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {remarks[`jr_${viewJR.id}`] ? 'Edit' : 'Add Remark'}
                  </button>
                </div>
                {remarks[`jr_${viewJR.id}`]
                  ? <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>{remarks[`jr_${viewJR.id}`]}</p>
                  : <p style={{ margin: 0, fontSize: '0.8125rem', color: '#d97706', fontStyle: 'italic' }}>No remarks added yet.</p>
                }
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewJR(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Candidate Modal ── */}
      {viewCand && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 500, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={viewCand.name} size={44} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{viewCand.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{viewCand.pos}</p>
                </div>
              </div>
              <button onClick={() => setViewCand(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {([
                ['Current Company',  viewCand.co],
                ['Experience',       viewCand.exp],
                ['Current CTC',      viewCand.ctc],
                ['Source',           viewCand.src],
                ['Stage',            viewCand.stage],
                ['Last Updated',     viewCand.upd],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-gray-50)' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-900)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              {/* Remarks section */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#b45309', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Pencil size={13} /> Remarks
                  </span>
                  <button onClick={() => { setViewCand(null); openRemark(`cand_${viewCand.id}`, viewCand.name) }} style={{ fontSize: '0.75rem', color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {remarks[`cand_${viewCand.id}`] ? 'Edit' : 'Add Remark'}
                  </button>
                </div>
                {remarks[`cand_${viewCand.id}`]
                  ? <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>{remarks[`cand_${viewCand.id}`]}</p>
                  : <p style={{ margin: 0, fontSize: '0.8125rem', color: '#d97706', fontStyle: 'italic' }}>No remarks added yet.</p>
                }
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewCand(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remark Modal ── */}
      {remarkModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', width: 460, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                  {remarkText ? 'Edit Remark' : 'Add Remark'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 3 }}>{remarkModal.label}</p>
              </div>
              <button onClick={() => setRemarkModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4, marginTop: -2 }}><X size={17} /></button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <textarea
                value={remarkText}
                onChange={e => setRemarkText(e.target.value)}
                placeholder="Type your remark or note here..."
                rows={5}
                autoFocus
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-gray-200)', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              {remarks[remarkModal.key] && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 6 }}>
                  Clear the field and save to remove the existing remark.
                </p>
              )}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {remarks[remarkModal.key] ? (
                <button
                  onClick={() => { setRemarkText(''); saveRemark() }}
                  style={{ fontSize: '0.8125rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  Remove Remark
                </button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRemarkModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button onClick={saveRemark} className="btn btn-primary btn-sm">Save Remark</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Interview Comments Panel ── */}
      {commentPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setCommentPanel(null)}>
          <div
            style={{ marginLeft: 'auto', background: '#fff', width: 440, maxWidth: '95vw', height: '100%', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--color-gray-100)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={17} style={{ color: '#1d4ed8' }} />
                    Interview Comments
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--color-gray-700)', fontWeight: 600 }}>{commentPanel.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{commentPanel.round} · {commentPanel.date}, {commentPanel.time} · {commentPanel.mode}</p>
                </div>
                <button onClick={() => setCommentPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4, marginTop: -2 }}><X size={18} /></button>
              </div>
              <div style={{ marginTop: 10 }}>
                <StatusBadge s={commentPanel.status} />
              </div>
            </div>

            {/* Remarks section inside panel */}
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--color-gray-100)', background: '#fffbeb', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b45309', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Pencil size={12} /> Remark
                </span>
                <button
                  onClick={() => openRemark(`iv_${commentPanel.id}`, commentPanel.name)}
                  style={{ fontSize: '0.75rem', color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {remarks[`iv_${commentPanel.id}`] ? 'Edit' : 'Add'}
                </button>
              </div>
              {remarks[`iv_${commentPanel.id}`]
                ? <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.5 }}>{remarks[`iv_${commentPanel.id}`]}</p>
                : <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d97706', fontStyle: 'italic' }}>No remark yet — click Add.</p>
              }
            </div>

            {/* Comment thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(comments[`iv_${commentPanel.id}`] ?? []).length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.6 }}>
                  <MessageSquare size={38} style={{ color: 'var(--color-gray-300)' }} />
                  <p style={{ fontWeight: 600, color: 'var(--color-gray-400)', fontSize: '0.875rem', margin: 0 }}>No comments yet</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-300)', margin: 0 }}>Add the first comment below</p>
                </div>
              ) : (comments[`iv_${commentPanel.id}`] ?? []).map(cm => (
                <div key={cm.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#eff6ff', border: '2px solid #bfdbfe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: '#1d4ed8', flexShrink: 0,
                  }}>
                    {cm.author.split(' ').map((w: string) => w[0]).join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>{cm.author}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{cm.ts}</span>
                        <button
                          onClick={() => deleteComment(`iv_${commentPanel.id}`, cm.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-300)', padding: 0, display: 'flex', alignItems: 'center' }}
                          title="Delete comment"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.875rem', color: 'var(--color-gray-700)', lineHeight: 1.55,
                      background: 'var(--color-gray-50)', padding: '10px 14px',
                      borderRadius: 10, border: '1px solid var(--color-gray-100)',
                      wordBreak: 'break-word',
                    }}>
                      {cm.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--color-gray-100)', flexShrink: 0, background: '#fafbfc' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(`iv_${commentPanel.id}`) } }}
                  placeholder="Write a comment… (Enter to send)"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 12px',
                    border: '1.5px solid var(--color-gray-200)', borderRadius: 10,
                    fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit',
                    outline: 'none', lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={() => addComment(`iv_${commentPanel.id}`)}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '9px 16px', flexShrink: 0 }}
                  disabled={!newComment.trim()}
                >
                  Send
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-gray-300)', marginTop: 5 }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── New Requisition Modal ── */}
      {showNewReq && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 580, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>New Job Requisition</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>Create a new hiring request</p>
              </div>
              <button onClick={() => setShowNewReq(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={LBL}>Job Title *</label>
                <input style={INP} value={reqForm.title} onChange={e => setReqForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Software Engineer" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Department *</label>
                  <select style={INP} value={reqForm.department_id} onChange={e => setReqForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">— Select Department —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Location *</label>
                  <input style={INP} value={reqForm.location} onChange={e => setReqForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Mumbai" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Employment Type *</label>
                  <select style={INP} value={reqForm.employment_type} onChange={e => setReqForm(f => ({ ...f, employment_type: e.target.value }))}>
                    {[['full_time','Full-time'],['part_time','Part-time'],['contract','Contract'],['intern','Intern']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>No. of Positions</label>
                  <input style={INP} type="number" min={1} value={reqForm.no_of_positions} onChange={e => setReqForm(f => ({ ...f, no_of_positions: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Min Experience (yrs)</label>
                  <input style={INP} type="number" min={0} value={reqForm.min_experience_years} onChange={e => setReqForm(f => ({ ...f, min_experience_years: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label style={LBL}>Max Experience (yrs)</label>
                  <input style={INP} type="number" min={0} value={reqForm.max_experience_years} onChange={e => setReqForm(f => ({ ...f, max_experience_years: e.target.value }))} placeholder="Optional" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Min CTC (₹)</label>
                  <input style={INP} type="number" min={0} value={reqForm.min_ctc} onChange={e => setReqForm(f => ({ ...f, min_ctc: e.target.value }))} placeholder="e.g. 500000" />
                </div>
                <div>
                  <label style={LBL}>Max CTC (₹)</label>
                  <input style={INP} type="number" min={0} value={reqForm.max_ctc} onChange={e => setReqForm(f => ({ ...f, max_ctc: e.target.value }))} placeholder="e.g. 1200000" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Priority</label>
                  <select style={INP} value={reqForm.priority} onChange={e => setReqForm(f => ({ ...f, priority: e.target.value }))}>
                    {[['low','Low'],['medium','Medium'],['high','High'],['urgent','Urgent']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Target Date</label>
                  <input style={INP} type="date" value={reqForm.target_date} onChange={e => setReqForm(f => ({ ...f, target_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label style={LBL}>Job Description</label>
                <textarea style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} rows={3} value={reqForm.job_description} onChange={e => setReqForm(f => ({ ...f, job_description: e.target.value }))} placeholder="Describe the role, responsibilities..." />
              </div>

              {reqErr && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626' }}>{reqErr}</div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewReq(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
              <button onClick={handleCreateReq} disabled={reqSaving} className="btn btn-primary btn-sm" style={{ opacity: reqSaving ? 0.7 : 1 }}>
                {reqSaving ? 'Creating…' : 'Create Requisition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
