'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { announcementsApi, employeesApi, type Announcement as ApiAnnouncement } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Bell, Plus, Pin, Edit, Trash2, Users, MapPin,
  ChevronDown, ChevronUp, Megaphone, Calendar,
  AlertCircle, Info, Loader2, X, Check,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AnnouncementType = 'holiday' | 'policy' | 'event' | 'urgent' | 'general'
type TargetAudienceMode = 'all' | 'department' | 'location'

interface Announcement {
  id: string
  type: AnnouncementType
  title: string
  body: string
  publisher: string
  date: string
  target: string
  pinned: boolean
  urgent: boolean
  raw: ApiAnnouncement
}

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

// DB priority → UI type
function priorityToType(priority: string): AnnouncementType {
  const m: Record<string, AnnouncementType> = {
    urgent: 'urgent', low: 'holiday', high: 'policy', normal: 'general',
  }
  return m[priority?.toLowerCase()] ?? 'general'
}

// UI category → priority for posting
const CATEGORY_TO_PRIORITY: Record<string, string> = {
  urgent: 'urgent', holiday: 'low', policy: 'high', event: 'normal', general: 'normal',
}

// DB audience → readable label
function audienceLabel(audience: string): string {
  const m: Record<string, string> = {
    all: 'All Employees', department: 'By Department',
    location: 'By Location', designation: 'By Designation',
  }
  return m[audience?.toLowerCase()] ?? 'All Employees'
}

function adaptAnnouncement(a: ApiAnnouncement): Announcement {
  // Live DB uses: content, announcement_type, target_audience, published_by
  // Our added columns: body, audience, priority, is_pinned
  const raw = a as unknown as Record<string, unknown>
  const bodyText   = (raw.content ?? raw.body ?? '') as string
  const typeStr    = (raw.announcement_type ?? raw.priority ?? 'general') as string
  const audienceStr = (raw.target_audience ?? raw.audience ?? 'all') as string
  const publisher  = (raw.published_by_name ?? 'HR') as string
  const pinned     = (raw.is_pinned ?? false) as boolean
  const priority   = (raw.priority ?? 'normal') as string

  return {
    id:        a.id,
    type:      typeStr === 'urgent' || priority === 'urgent' ? 'urgent'
               : typeStr === 'holiday' || priority === 'low' ? 'holiday'
               : typeStr === 'policy'  || priority === 'high' ? 'policy'
               : typeStr === 'event' ? 'event'
               : 'general',
    title:     a.title,
    body:      bodyText,
    publisher,
    date:      new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    target:    audienceLabel(audienceStr),
    pinned,
    urgent:    priority === 'urgent' || typeStr === 'urgent',
    raw:       a,
  }
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 150ms',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

/* ─────────────────────────────────────────────────────────────
   EDIT MODAL
───────────────────────────────────────────────────────────── */
function EditModal({ announcement, onClose, onSuccess }: {
  announcement: Announcement; onClose: () => void; onSuccess: () => void
}) {
  const [title, setTitle]     = useState(announcement.title)
  const [body, setBody]       = useState(announcement.body)
  const [type, setType]       = useState<AnnouncementType>(announcement.type)
  const [pinned, setPinned]   = useState(announcement.pinned)
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Title and message are required'); return }
    setSaving(true)
    try {
      await announcementsApi.patch(announcement.id, {
        title, content: body, category: type,
        is_pinned: pinned,
      })
      toast.success('Announcement updated')
      onSuccess()
      onClose()
    } catch {
      toast.error('Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', width: 520, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>Edit Announcement</p>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={LABEL_STYLE}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={FIELD_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Type</label>
            <select value={type} onChange={e => setType(e.target.value as AnnouncementType)} style={{ ...FIELD_STYLE, cursor: 'pointer' }}>
              <option value="general">General</option>
              <option value="policy">Policy</option>
              <option value="event">Event</option>
              <option value="urgent">Urgent</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Message</label>
            <textarea rows={5} value={body} onChange={e => setBody(e.target.value)}
              style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.55 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}
              style={{ accentColor: '#E8622A', width: 14, height: 14 }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
              <Pin size={12} /> Pin to top
            </span>
          </label>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8375rem' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5899 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8375rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ANNOUNCEMENT CARD
───────────────────────────────────────────────────────────── */
function AnnouncementCard({ a, expanded, onToggle, onEdit, onDelete }: {
  a: Announcement; expanded: boolean; onToggle: () => void
  onEdit: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const cfg = TYPE_CFG[a.type]
  const preview = a.body.slice(0, 130)
  const needsTrunc = a.body.length > 130

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: 12,
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
            <button onClick={onEdit} className="btn btn-ghost btn-sm btn-icon" style={{ width: 26, height: 26 }} title="Edit">
              <Edit size={12} />
            </button>
            <button onClick={onDelete} className="btn btn-ghost btn-sm btn-icon" style={{ width: 26, height: 26, color: '#dc2626' }} title="Delete">
              <Trash2 size={12} />
            </button>
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
  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set())
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]             = useState(true)
  const [editTarget, setEditTarget]       = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Announcement | null>(null)
  const [deleting, setDeleting]           = useState(false)

  // Compose form
  const composeRef                        = useRef<HTMLDivElement>(null)
  const [composeTitle, setComposeTitle]   = useState('')
  const [composeType, setComposeType]     = useState<AnnouncementType>('general')
  const [composeBody, setComposeBody]     = useState('')
  const [targetMode, setTargetMode]       = useState<TargetAudienceMode>('all')
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())
  const [expiresOn, setExpiresOn]         = useState('')
  const [markUrgent, setMarkUrgent]       = useState(false)
  const [pinToTop, setPinToTop]           = useState(false)
  const [posting, setPosting]             = useState(false)
  const [deptList, setDeptList]           = useState<string[]>([])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await announcementsApi.list({ limit: 100 })
      setAnnouncements((res.data ?? []).map(adaptAnnouncement))
    } catch {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])
  useEffect(() => {
    employeesApi.departments().then(r => setDeptList((r.data ?? []).map((d: { name: string }) => d.name))).catch(console.error)
  }, [])

  const filtered = activeFilter === 'All'
    ? announcements
    : announcements.filter(a => a.type === activeFilter.toLowerCase())

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleDept = (d: string) =>
    setSelectedDepts(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n })

  const handleReset = () => {
    setComposeTitle(''); setComposeType('general'); setComposeBody('')
    setTargetMode('all'); setSelectedDepts(new Set()); setExpiresOn('')
    setMarkUrgent(false); setPinToTop(false)
  }

  const handlePost = async () => {
    if (!composeTitle.trim() || !composeBody.trim()) {
      toast.error('Title and message are required'); return
    }
    setPosting(true)
    try {
      const target = targetMode === 'all'
        ? 'All Employees'
        : targetMode === 'department'
          ? Array.from(selectedDepts).join(', ') || 'All Employees'
          : 'By Location'

      const type = markUrgent ? 'urgent' : composeType
      await announcementsApi.create({
        title:          composeTitle,
        content:        composeBody,
        category:       type,
        target_audience: target,
        priority:       CATEGORY_TO_PRIORITY[type] ?? 'normal',
        is_pinned:      pinToTop,
        expires_at:     expiresOn || null,
      })
      toast.success('Announcement posted successfully')
      handleReset()
      fetchAnnouncements()
    } catch {
      toast.error('Failed to post announcement')
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await announcementsApi.delete(deleteTarget.id)
      toast.success('Announcement deleted')
      setDeleteTarget(null)
      fetchAnnouncements()
    } catch {
      toast.error('Failed to delete announcement')
    } finally {
      setDeleting(false)
    }
  }

  // Compute live stats
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalCount    = announcements.length
  const thisMonth     = announcements.filter(a => new Date(a.raw.created_at) >= thisMonthStart).length
  const pinnedCount   = announcements.filter(a => a.pinned).length
  const urgentCount   = announcements.filter(a => a.urgent).length

  const typeBreakdown = (['holiday', 'policy', 'event', 'urgent', 'general'] as AnnouncementType[]).map(type => ({
    type,
    count: announcements.filter(a => a.type === type).length,
  }))

  return (
    <>
      {editTarget && (
        <EditModal
          announcement={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={fetchAnnouncements}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', width: 400, borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={16} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>Delete Announcement</p>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.8rem' }}>This action cannot be undone.</p>
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#374151', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', margin: '0 0 16px' }}>
              &ldquo;{deleteTarget.title}&rdquo;
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', background: '#dc2626', color: 'white', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {deleting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Topbar
        title="Announcements"
        subtitle="Post and manage company-wide communications"
        notificationCount={urgentCount}
      >
        <button
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <Plus size={14} /> Post Announcement
        </button>
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px]" style={{ gap: 24, alignItems: 'start' }}>

          {/* ── LEFT: Feed ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Company Announcements</p>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fff7ed', color: '#E8622A', border: '1px solid #fed7aa', borderRadius: 20, padding: '1px 8px' }}>
                  {totalCount}
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
            {loading ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>Loading announcements…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.length === 0 ? (
                  <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <Bell size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>
                      {totalCount === 0 ? 'No announcements yet' : 'No announcements for this filter'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
                      {totalCount === 0 ? 'Use the compose panel to post the first one.' : 'Try a different filter.'}
                    </p>
                  </div>
                ) : filtered.map(a => (
                  <AnnouncementCard
                    key={a.id}
                    a={a}
                    expanded={expandedIds.has(a.id)}
                    onToggle={() => toggleExpand(a.id)}
                    onEdit={() => setEditTarget(a)}
                    onDelete={() => setDeleteTarget(a)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Compose + Stats ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Compose card */}
            <div ref={composeRef} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1.5px solid #f1f5f9', background: '#fafafa' }}>
                <Megaphone size={14} style={{ color: '#E8622A' }} />
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Post Announcement</p>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div>
                  <label style={LABEL_STYLE}>Title</label>
                  <input type="text" value={composeTitle} onChange={e => setComposeTitle(e.target.value)}
                    placeholder="Announcement title…" style={FIELD_STYLE} />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Type</label>
                  <select value={composeType} onChange={e => setComposeType(e.target.value as AnnouncementType)} style={{ ...FIELD_STYLE, cursor: 'pointer' }}>
                    <option value="general">General</option>
                    <option value="policy">Policy</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>

                <div>
                  <label style={LABEL_STYLE}>Message</label>
                  <textarea rows={4} value={composeBody} onChange={e => setComposeBody(e.target.value)}
                    placeholder="Write your announcement here…"
                    style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.55 }} />
                </div>

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
                      {deptList.map(dept => (
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

                <div>
                  <label style={LABEL_STYLE}>Expires On <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span></label>
                  <input type="date" value={expiresOn} onChange={e => setExpiresOn(e.target.value)} style={FIELD_STYLE} />
                </div>

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

                <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                  <button onClick={handleReset} className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={posting}>Clear</button>
                  <button onClick={handlePost} className="btn btn-primary btn-sm" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={posting}>
                    {posting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Total',       value: totalCount,  icon: Megaphone,   color: '#E8622A', bg: '#fff7ed', border: '#fed7aa' },
                    { label: 'This Month',  value: thisMonth,   icon: Calendar,    color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                    { label: 'Pinned',      value: pinnedCount, icon: Pin,         color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                    { label: 'Urgent',      value: urgentCount, icon: AlertCircle, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
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
                      const max = Math.max(...typeBreakdown.map(t => t.count), 1)
                      return (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', color: '#4b5563', flex: 1 }}>{cfg.label}</span>
                          <div style={{ height: 5, flex: 3, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: cfg.dot, borderRadius: 99 }} />
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
