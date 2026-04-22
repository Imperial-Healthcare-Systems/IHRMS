'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  CalendarClock, Plus, X, Loader2, Clock, Users,
  RefreshCw, CheckCircle, AlertCircle,
} from 'lucide-react'

interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  days: string[]
  is_active: boolean
}

interface SwapRequest {
  id: string
  swap_date: string
  reason: string | null
  status: string
  created_at: string
  requester: { id: string; first_name: string; last_name: string; emp_id: string } | null
  target: { id: string; first_name: string; last_name: string; emp_id: string } | null
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ADMIN_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
  approved: { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function NewShiftModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName]           = useState('')
  const [startTime, setStart]     = useState('09:00')
  const [endTime, setEnd]         = useState('18:00')
  const [days, setDays]           = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [saving, setSaving]       = useState(false)

  const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Shift name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_time: startTime, end_time: endTime, days }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Shift created successfully')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create shift')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', width: 480, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={16} color="#E8622A" />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>Create Shift</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL_STYLE}>Shift Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Shift, Night Shift" style={FIELD_STYLE} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Start Time</label>
              <input type="time" value={startTime} onChange={e => setStart(e.target.value)} style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>End Time</label>
              <input type="time" value={endTime} onChange={e => setEnd(e.target.value)} style={FIELD_STYLE} />
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Working Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map(d => {
                const active = days.includes(d)
                return (
                  <button key={d} onClick={() => toggleDay(d)}
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: active ? '#1E3A5F' : '#f9fafb', color: active ? '#fff' : '#6b7280', border: active ? '1.5px solid #1E3A5F' : '1.5px solid #e5e7eb' }}>
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Creating…' : 'Create Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type ShiftTab = 'shifts' | 'swaps'

export default function ShiftsPage() {
  const { data: session } = useSession()
  const isAdmin = ADMIN_ROLES.includes((session?.user as any)?.role ?? '')

  const [tab, setTab]             = useState<ShiftTab>('shifts')
  const [shifts, setShifts]       = useState<Shift[]>([])
  const [swaps, setSwaps]         = useState<SwapRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating]   = useState<string | null>(null)

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shifts')
      const json = await res.json()
      setShifts(json.data ?? [])
    } catch { toast.error('Failed to load shifts') }
    finally { setLoading(false) }
  }, [])

  const fetchSwaps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shifts/swaps')
      const json = await res.json()
      setSwaps(json.data ?? [])
    } catch { toast.error('Failed to load swap requests') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { tab === 'shifts' ? fetchShifts() : fetchSwaps() }, [tab, fetchShifts, fetchSwaps])

  const handleSwapAction = async (id: string, status: 'approved' | 'rejected') => {
    setUpdating(id)
    try {
      const res = await fetch('/api/shifts/swaps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Swap request ${status}`)
      fetchSwaps()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setUpdating(null)
    }
  }

  const pendingSwaps = swaps.filter(s => s.status === 'pending').length

  return (
    <>
      {showModal && <NewShiftModal onClose={() => setShowModal(false)} onSuccess={fetchShifts} />}

      <Topbar title="Shift Management" subtitle="Define shifts and manage employee swap requests">
        {isAdmin && tab === 'shifts' && (
          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Shift
          </button>
        )}
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {([['shifts', 'Shift Definitions', CalendarClock], ['swaps', `Swap Requests${pendingSwaps > 0 ? ` (${pendingSwaps})` : ''}`, RefreshCw]] as const).map(([key, label, Icon]) => {
            const active = tab === key
            return (
              <button key={key} onClick={() => setTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, transition: 'all 150ms', background: active ? '#fff' : 'transparent', color: active ? '#111827' : '#6b7280', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>Loading…</p>
          </div>
        ) : tab === 'shifts' ? (
          shifts.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <CalendarClock size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px', fontSize: '0.875rem' }}>No shifts defined yet</p>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>Create your first shift to assign to employees.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {shifts.map(shift => (
                <div key={shift.id} className="card" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,121,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarClock size={16} color="#F47920" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>{shift.name}</p>
                        <p style={{ fontSize: '0.72rem', color: shift.is_active ? '#16a34a' : '#9ca3af', margin: 0, fontWeight: 600 }}>
                          {shift.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={13} color="#9ca3af" />
                      <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>
                        {shift.start_time} — {shift.end_time}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {DAYS.map(d => (
                        <span key={d} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: shift.days?.includes(d) ? '#1E3A5F' : '#f3f4f6', color: shift.days?.includes(d) ? '#fff' : '#9ca3af' }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          swaps.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <RefreshCw size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px', fontSize: '0.875rem' }}>No swap requests</p>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>Swap requests will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {swaps.map(swap => {
                const cfg = STATUS_CFG[swap.status] ?? STATUS_CFG.pending
                return (
                  <div key={swap.id} className="card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Swap on {fmtDate(swap.swap_date)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={12} color="#9ca3af" />
                            {swap.requester?.first_name} {swap.requester?.last_name}
                            <span style={{ color: '#9ca3af', fontWeight: 400 }}>↔</span>
                            {swap.target?.first_name} {swap.target?.last_name}
                          </span>
                        </div>
                        {swap.reason && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0' }}>{swap.reason}</p>}
                      </div>

                      {isAdmin && swap.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => handleSwapAction(swap.id, 'approved')} disabled={updating === swap.id}
                            style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {updating === swap.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />} Approve
                          </button>
                          <button onClick={() => handleSwapAction(swap.id, 'rejected')} disabled={updating === swap.id}
                            style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={11} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </>
  )
}
