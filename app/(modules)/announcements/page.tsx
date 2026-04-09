'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { announcementsApi, type Announcement as ApiAnnouncement } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Bell, Plus, Pin, Edit, Trash2, Users, MapPin,
  ChevronDown, ChevronUp, Megaphone, Calendar,
  AlertCircle, Info,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AnnouncementType = 'holiday' | 'policy' | 'event' | 'urgent' | 'general'
type TargetAudienceMode = 'all' | 'department' | 'location'

interface Announcement {
  id: number; type: AnnouncementType; title: string; body: string
  publisher: string; date: string; target: string; pinned: boolean; urgent: boolean
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const ANNOUNCEMENTS: Announcement[] = [
  { id: 1, type: 'holiday', title: 'Office Closure — Good Friday', body: 'April 18, 2026 is a public holiday on account of Good Friday. All offices will remain closed. Employees requiring emergency access must get prior approval from their manager.', publisher: 'HR Team', date: 'Apr 1, 2026', target: 'All Employees', pinned: true, urgent: false },
  { id: 2, type: 'policy',  title: 'Updated Work From Home Policy', body: 'Effective April 15, 2026: Maximum 2 WFH days per week are permitted. WFH must be pre-approved by the reporting manager. Employees on probation are not eligible for WFH. Please read the updated policy document on the portal.', publisher: 'HR Admin', date: 'Mar 28, 2026', target: 'All Employees', pinned: false, urgent: false },
  { id: 3, type: 'event',   title: 'Annual Company Day — Save the Date!', body: 'Join us for our Grand Annual Celebration on May 15, 2026 at Taj Hotel, Bengaluru. Awards, entertainment, gala dinner. Family members are welcome. RSVP by May 1 to hr@company.com', publisher: 'HR Team', date: 'Mar 25, 2026', target: 'All Employees', pinned: false, urgent: false },
  { id: 4, type: 'general', title: 'Q4 FY 2025-26 Performance Results Released', body: 'Annual appraisal outcomes for FY 2025-26 are now available. Employees can view their ratings and increment details in the Performance module. Please reach out to HR for any queries.', publisher: 'HR Admin', date: 'Mar 22, 2026', target: 'All Employees', pinned: false, urgent: false },
  { id: 5, type: 'urgent',  title: 'EPF KYC Update — Action Required by Apr 30', body: 'MANDATORY: All employees must link their Aadhaar with UAN (Universal Account Number) by April 30, 2026 for EPF KYC compliance. Failure to do so may result in EPF contribution being blocked. Visit the EPFO portal or contact HR for assistance.', publisher: 'Finance & Compliance', date: 'Mar 20, 2026', target: 'All Employees', pinned: true, urgent: true },
  { id: 6, type: 'policy',  title: 'New Leave Policy Effective April 2026', body: 'Key changes from April 1, 2026: Casual Leave increased from 8 to 12 days annually. Earned Leave carry forward limit raised to 30 days. LOP will now be tracked automatically from the attendance system. Full policy document available on the HR portal.', publisher: 'HR Admin', date: 'Mar 15, 2026', target: 'All Employees', pinned: false, urgent: false },
  { id: 7, type: 'general', title: 'Welcome to Our New Team Members!', body: "Please join us in welcoming 8 new colleagues joining in April 2026 across Engineering, HR, Sales, Finance, and Operations. Their profiles are now live on the Employee Directory. Let's make them feel at home!", publisher: 'HR Team', date: 'Mar 10, 2026', target: 'All Employees', pinned: false, urgent: false },
  { id: 8, type: 'general', title: 'Office Gymnasium Now Open', body: 'The gymnasium on Floor 2, Bengaluru office is now fully operational. Timings: 6:00 AM to 9:00 PM, Monday to Saturday. All employees are welcome. Please bring your ID card for access.', publisher: 'Admin Team', date: 'Mar 5, 2026', target: 'Bengaluru Office', pinned: false, urgent: false },
]

const DEPARTMENTS = ['Engineering', 'HR', 'Sales', 'Finance', 'Operations', 'Marketing', 'Customer Support']
const FILTER_OPTIONS = ['All', 'Holiday', 'Policy', 'Event', 'Urgent', 'General'] as const
type FilterOption = typeof FILTER_OPTIONS[number]

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const TYPE_CFG: Record<AnnouncementType, { bg: string; color: string; border: string; label: string; dot: string }> = {
  holiday: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Holiday', dot: '#22c55e' },
  policy:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Policy',  dot: '#3b82f6' },
  event:   { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'Event',   dot: '#8b5cf6' },
  urgent:  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Urgent',  dot: '#ef4444' },
  general: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', label: 'General', dot: '#9ca3af' },
}

const typeBreakdown: { type: AnnouncementType; count: number }[] = [
  { type: 'holiday', count: 3 }, { type: 'policy', count: 9 },
  { type: 'event', count: 7 },   { type: 'urgent', count: 5 },
  { type: 'general', count: 18 },
]

const FIELD_STYLE = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit', transition: 'border-color 150ms',
}
const LABEL_STYLE = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600 as const,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

/* ─────────────────────────────────────────────────────────────
   ANNOUNCEMENT CARD
───────────────────────────────────────────────────────────── */
function AnnouncementCard({ a, expanded, onToggle }: { a: Announcement; expanded: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false)
  const cfg = TYPE_CFG[a.type]
  const preview = a.body.slice(0, 130)
  const needsTrunc = a.body.length > 130

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: `1.5px solid ${a.urgent ? '#fecaca' : '#f1f5f9'}`,
        borderLeft: `4px solid ${a.urgent ? '#ef4444' : cfg.dot}`,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 150ms, border-color 150ms',
        padding: '14px 16px',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
          <span className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, flexShrink: 0, marginTop: 1 }}>{cfg.label}</span>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', lineHeight: 1.35, margin: 0 }}>{a.title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {a.pinned && (
            <span className="badge" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Pin size={10} /> Pinned
            </span>
          )}
          <div style={{ display: 'flex', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 150ms' }}>
            <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 26, height: 26 }}><Edit size={12} /></button>
            <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 26, height: 26, color: '#dc2626' }}><Trash2 size={12} /></button>
          </div>
        </div>
      </div>

      {/* Body */}
      <p style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.6, margin: '0 0 10px' }}>
        {expanded || !needsTrunc ? a.body : `${preview}…`}
        {needsTrunc && (
          <button onClick={onToggle} style={{ marginLeft: 4, color: '#E8622A', fontWeight: 600, fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {expanded ? <><ChevronUp size={11} /> Show less</> : <>Read more <ChevronDown size={11} /></>}
          </button>
        )}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>{a.publisher}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#9ca3af' }}>
            <Calendar size={11} /> {a.date}
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 20, padding: '2px 8px', fontWeight: 500 }}>
          <Users size={10} /> {a.target}
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function AnnouncementsPage() {
  const [activeFilter, setActiveFilter]   = useState<FilterOption>('All')
  const [expandedIds, setExpandedIds]     = useState<Set<number>>(new Set())
  const [composeTitle, setComposeTitle]   = useState('')
  const [composeType, setComposeType]     = useState<AnnouncementType>('general')
  const [composeBody, setComposeBody]     = useState('')
  const [targetMode, setTargetMode]       = useState<TargetAudienceMode>('all')
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())
  const [expiresOn, setExpiresOn]         = useState('')
  const [markUrgent, setMarkUrgent]       = useState(false)
  const [pinToTop, setPinToTop]           = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS)
  const [posting, setPosting]             = useState(false)

  useEffect(() => {
    announcementsApi.list().then(res => {
      if (res.data.length > 0) {
        const adapted: Announcement[] = res.data.map((a: ApiAnnouncement, idx: number) => ({
          id: idx + 1,
          type: (a.category ?? 'general') as AnnouncementType,
          title: a.title,
          body: a.content ?? '',
          publisher: a.created_by_employee
            ? `${a.created_by_employee.first_name} ${a.created_by_employee.last_name}`
            : 'HR',
          date: new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          target: a.target_audience ?? 'All Employees',
          pinned: a.is_pinned ?? false,
          urgent: a.priority === 'urgent',
        }))
        setAnnouncements(adapted)
      }
    }).catch(() => {/* keep mock */})
  }, [])

  const filtered = activeFilter === 'All'
    ? announcements
    : announcements.filter(a => a.type === activeFilter.toLowerCase())

  const toggleExpand = (id: number) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleDept = (d: string) =>
    setSelectedDepts(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n })

  const handleReset = () => {
    setComposeTitle(''); setComposeType('general'); setComposeBody('')
    setTargetMode('all'); setSelectedDepts(new Set()); setExpiresOn('')
    setMarkUrgent(false); setPinToTop(false)
  }

  const handlePostAnnouncement = async () => {
    if (!composeTitle.trim() || !composeBody.trim()) {
      toast.error('Title and message are required')
      return
    }
    setPosting(true)
    try {
      const target = targetMode === 'all'
        ? 'All Employees'
        : targetMode === 'department'
          ? Array.from(selectedDepts).join(', ') || 'All Employees'
          : 'By Location'
      await announcementsApi.create({
        title: composeTitle,
        content: composeBody,
        category: composeType,
        target_audience: target,
        priority: markUrgent ? 'urgent' : 'normal',
        is_pinned: pinToTop,
        expires_at: expiresOn || null,
        status: 'published',
      })
      toast.success('Announcement posted successfully')
      handleReset()
      // Refresh list
      const res = await announcementsApi.list()
      if (res.data.length > 0) {
        setAnnouncements(res.data.map((a: ApiAnnouncement, idx: number) => ({
          id: idx + 1,
          type: (a.category ?? 'general') as AnnouncementType,
          title: a.title,
          body: a.content ?? '',
          publisher: a.created_by_employee
            ? `${a.created_by_employee.first_name} ${a.created_by_employee.last_name}`
            : 'HR',
          date: new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          target: a.target_audience ?? 'All Employees',
          pinned: a.is_pinned ?? false,
          urgent: a.priority === 'urgent',
        })))
      }
    } catch {
      toast.error('Failed to post announcement')
    } finally {
      setPosting(false)
    }
  }

  const urgentCount = announcements.filter(a => a.urgent).length

  return (
    <>
      <Topbar
        title="Announcements"
        subtitle="Post and manage company-wide communications"
        notificationCount={urgentCount}
      >
        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Post Announcement
        </button>
      </Topbar>

      <div style={{ padding: '28px 28px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT: Feed ── */}
          <div>
            {/* Header + filter chips */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Company Announcements</p>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fff7ed', color: '#E8622A', border: '1px solid #fed7aa', borderRadius: 20, padding: '1px 8px' }}>
                  {announcements.length}
                </span>
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {FILTER_OPTIONS.map(f => {
                const active = activeFilter === f
                return (
                  <button key={f} onClick={() => setActiveFilter(f)}
                    style={{
                      padding: '5px 13px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 150ms',
                      background: active ? '#1E3A5F' : '#fff',
                      color: active ? '#fff' : '#6b7280',
                      border: active ? '1.5px solid #1E3A5F' : '1.5px solid #e5e7eb',
                    }}>
                    {f}
                  </button>
                )
              })}
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.length === 0 ? (
                <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <Bell size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No announcements for this filter.</p>
                </div>
              ) : filtered.map(a => (
                <AnnouncementCard key={a.id} a={a} expanded={expandedIds.has(a.id)} onToggle={() => toggleExpand(a.id)} />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Compose + Stats ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Compose card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1.5px solid #f1f5f9', background: '#fafafa' }}>
                <Megaphone size={14} style={{ color: '#E8622A' }} />
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Post Announcement</p>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                {/* Title */}
                <div>
                  <label style={LABEL_STYLE}>Title</label>
                  <input type="text" value={composeTitle} onChange={e => setComposeTitle(e.target.value)}
                    placeholder="Announcement title…" style={FIELD_STYLE} />
                </div>

                {/* Type */}
                <div>
                  <label style={LABEL_STYLE}>Type</label>
                  <select value={composeType} onChange={e => setComposeType(e.target.value as AnnouncementType)} className="form-select" style={{ width: '100%' }}>
                    <option value="general">General</option>
                    <option value="policy">Policy</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label style={LABEL_STYLE}>Message</label>
                  <textarea rows={4} value={composeBody} onChange={e => setComposeBody(e.target.value)}
                    placeholder="Write your announcement here…"
                    style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.55 }} />
                </div>

                {/* Target Audience */}
                <div>
                  <label style={LABEL_STYLE}>Target Audience</label>
                  <div style={{ display: 'flex', gap: 12, marginBottom: targetMode !== 'all' ? 10 : 0 }}>
                    {([
                      { value: 'all', label: 'All Employees' },
                      { value: 'department', label: 'By Department' },
                      { value: 'location', label: 'By Location' },
                    ] as { value: TargetAudienceMode; label: string }[]).map(({ value, label }) => (
                      <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#374151', cursor: 'pointer', fontWeight: targetMode === value ? 600 : 400 }}>
                        <input type="radio" name="targetMode" value={value} checked={targetMode === value}
                          onChange={() => setTargetMode(value)}
                          style={{ accentColor: '#E8622A', cursor: 'pointer' }} />
                        {label}
                      </label>
                    ))}
                  </div>

                  {targetMode === 'department' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      {DEPARTMENTS.map(dept => (
                        <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#374151', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedDepts.has(dept)} onChange={() => toggleDept(dept)}
                            style={{ accentColor: '#E8622A', cursor: 'pointer' }} />
                          {dept}
                        </label>
                      ))}
                    </div>
                  )}

                  {targetMode === 'location' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                      <MapPin size={13} style={{ color: '#1d4ed8', flexShrink: 0 }} />
                      <p style={{ fontSize: '0.75rem', color: '#1d4ed8', margin: 0 }}>Location-based targeting uses office location from employee profiles.</p>
                    </div>
                  )}
                </div>

                {/* Expires On */}
                <div>
                  <label style={LABEL_STYLE}>Expires On <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span></label>
                  <input type="date" value={expiresOn} onChange={e => setExpiresOn(e.target.value)} style={FIELD_STYLE} />
                </div>

                {/* Flags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={markUrgent} onChange={e => setMarkUrgent(e.target.checked)}
                      style={{ accentColor: '#dc2626', width: 14, height: 14, cursor: 'pointer' }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>
                      <AlertCircle size={12} /> Mark as Urgent
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={pinToTop} onChange={e => setPinToTop(e.target.checked)}
                      style={{ accentColor: '#E8622A', width: 14, height: 14, cursor: 'pointer' }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                      <Pin size={12} /> Pin to top
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                  <button onClick={handleReset} className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={posting}>Save Draft</button>
                  <button onClick={handlePostAnnouncement} className="btn btn-primary btn-sm" style={{ flex: 2 }} disabled={posting}>
                    {posting ? 'Posting…' : 'Post Now'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1.5px solid #f1f5f9', background: '#fafafa' }}>
                <Info size={14} style={{ color: '#1d4ed8' }} />
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Statistics</p>
              </div>

              <div style={{ padding: '16px 18px' }}>
                {/* 4 KPI tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Total',        value: 42, icon: Megaphone, color: '#E8622A', bg: '#fff7ed', border: '#fed7aa' },
                    { label: 'This Month',   value: 8,  icon: Calendar,  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                    { label: 'Pinned',       value: 2,  icon: Pin,       color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                    { label: 'Unread Urgent',value: 1,  icon: AlertCircle, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                  ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} style={{ color }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                        <p style={{ fontSize: '0.65rem', color, opacity: 0.8, margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* By Type */}
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>By Type</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {typeBreakdown.map(({ type, count }) => {
                      const cfg = TYPE_CFG[type]
                      return (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', color: '#4b5563', flex: 1 }}>{cfg.label}</span>
                          <div style={{ height: 5, flex: 3, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(count / 42) * 100}%`, background: cfg.dot, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, minWidth: 14, textAlign: 'right' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
