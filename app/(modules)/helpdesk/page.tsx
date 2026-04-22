'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  HelpCircle, Plus, X, Loader2, MessageSquare,
  CheckCircle, Clock, AlertCircle, ChevronDown,
} from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  created_at: string
  resolved_at: string | null
  raised_by_emp: { id: string; first_name: string; last_name: string; emp_id: string } | null
  assigned_to_emp: { id: string; first_name: string; last_name: string } | null
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  low:      { bg: '#f0fdf4', color: '#16a34a', label: 'Low' },
  normal:   { bg: '#eff6ff', color: '#1d4ed8', label: 'Normal' },
  high:     { bg: '#fffbeb', color: '#d97706', label: 'High' },
  urgent:   { bg: '#fef2f2', color: '#b91c1c', label: 'Urgent' },
}

const STATUS_CFG: Record<string, { bg: string; color: string; icon: React.ElementType; label: string }> = {
  open:        { bg: '#eff6ff', color: '#1d4ed8', icon: Clock,         label: 'Open' },
  in_progress: { bg: '#fffbeb', color: '#d97706', icon: AlertCircle,   label: 'In Progress' },
  resolved:    { bg: '#f0fdf4', color: '#16a34a', icon: CheckCircle,   label: 'Resolved' },
  closed:      { bg: '#f3f4f6', color: '#6b7280', icon: CheckCircle,   label: 'Closed' },
}

const ADMIN_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function NewTicketModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [subject, setSubject]       = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCategory]     = useState('general')
  const [priority, setPriority]     = useState('normal')
  const [saving, setSaving]         = useState(false)

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description, category, priority }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Ticket raised successfully')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to raise ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', width: 520, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={16} color="#E8622A" />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>Raise a Ticket</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL_STYLE}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Briefly describe your issue…" style={FIELD_STYLE} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...FIELD_STYLE, cursor: 'pointer' }}>
                <option value="general">General</option>
                <option value="payroll">Payroll</option>
                <option value="leave">Leave</option>
                <option value="attendance">Attendance</option>
                <option value="it">IT Support</option>
                <option value="facilities">Facilities</option>
                <option value="hr">HR Policy</option>
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...FIELD_STYLE, cursor: 'pointer' }}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span></label>
            <textarea rows={4} value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Provide additional details…"
              style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.55 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Raising…' : 'Raise Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HelpdeskPage() {
  const { data: session } = useSession()
  const isAdmin = ADMIN_ROLES.includes((session?.user as any)?.role ?? '')

  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [statusFilter, setFilter]   = useState('all')
  const [updating, setUpdating]     = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/helpdesk${params}`)
      const json = await res.json()
      setTickets(json.data ?? [])
    } catch {
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/helpdesk/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Ticket marked as ${status}`)
      fetchTickets()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  const openCount     = tickets.filter(t => t.status === 'open').length
  const inProgCount   = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  const STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed']

  return (
    <>
      {showModal && <NewTicketModal onClose={() => setShowModal(false)} onSuccess={fetchTickets} />}

      <Topbar
        title="Helpdesk"
        subtitle={isAdmin ? 'Manage employee support tickets' : 'Raise and track your support requests'}
      >
        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Ticket
        </button>
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Open',        value: openCount,     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: Clock },
            { label: 'In Progress', value: inProgCount,   color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: AlertCircle },
            { label: 'Resolved',    value: resolvedCount, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${border}`, background: bg }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '0.7rem', color, opacity: 0.8, margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 150ms', background: active ? '#1E3A5F' : '#fff', color: active ? '#fff' : '#6b7280', border: active ? '1.5px solid #1E3A5F' : '1.5px solid #e5e7eb' }}>
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Ticket list */}
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>Loading tickets…</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <HelpCircle size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px', fontSize: '0.875rem' }}>No tickets found</p>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>Raise a new ticket if you need help.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickets.map(ticket => {
              const priorityCfg = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.normal
              const statusCfg   = STATUS_CFG[ticket.status] ?? STATUS_CFG.open
              const StatusIcon  = statusCfg.icon
              return (
                <div key={ticket.id} className="card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <StatusIcon size={10} /> {statusCfg.label}
                        </span>
                        <span style={{ background: priorityCfg.bg, color: priorityCfg.color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                          {priorityCfg.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 999, padding: '2px 8px' }}>
                          {ticket.category}
                        </span>
                      </div>
                      <p style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem', margin: '0 0 4px' }}>{ticket.subject}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {ticket.raised_by_emp && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {ticket.raised_by_emp.first_name} {ticket.raised_by_emp.last_name} · {ticket.raised_by_emp.emp_id}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {fmtDate(ticket.created_at)}
                        </span>
                        {ticket.assigned_to_emp && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Assigned: {ticket.assigned_to_emp.first_name} {ticket.assigned_to_emp.last_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {isAdmin && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => updateStatus(ticket.id, 'in_progress')}
                            disabled={updating === ticket.id}
                            style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #fde68a', background: '#fffbeb', color: '#d97706', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {updating === ticket.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={11} />}
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(ticket.id, 'resolved')}
                          disabled={updating === ticket.id}
                          style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {updating === ticket.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
