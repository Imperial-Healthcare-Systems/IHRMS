'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  ClipboardList, Search, Filter, Download, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Edit3, Trash2, LogIn, LogOut, FileText, X, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Actor {
  id: string
  first_name: string
  last_name: string
  emp_id: string
  avatar_url: string | null
}

interface AuditRow {
  id: string
  actor_id: string
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'login' | 'logout'
  module: string | null
  entity_id: string | null
  summary: string | null
  meta: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  actor?: Actor | null
}

const ACTION_CFG: Record<string, { color: string; bg: string; border: string; Icon: typeof CheckCircle }> = {
  created:   { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle },
  updated:   { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', Icon: Edit3 },
  deleted:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: Trash2 },
  approved:  { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle },
  rejected:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: XCircle },
  login:     { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', Icon: LogIn },
  logout:    { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', Icon: LogOut },
}

const ACTIONS  = ['all', 'created', 'updated', 'deleted', 'approved', 'rejected', 'login', 'logout'] as const
const MODULES  = ['all', 'employees', 'leaves', 'attendance', 'payroll', 'training', 'documents', 'helpdesk', 'shifts', 'exit', 'onboarding', 'warnings', 'appreciation', 'performance']

const FIELD: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const PAGE_SIZE = 100

export default function AuditLogPage() {
  const [rows, setRows]           = useState<AuditRow[]>([])
  const [count, setCount]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [search, setSearch]       = useState('')
  const [actionFilter, setAction] = useState<typeof ACTIONS[number]>('all')
  const [moduleFilter, setModule] = useState<string>('all')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [page, setPage]           = useState(1)
  const [selected, setSelected]   = useState<AuditRow | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError(null)
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) })
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (moduleFilter !== 'all') params.set('module', moduleFilter)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo)   params.set('date_to', dateTo)

    try {
      const res  = await fetch(`/api/audit-log?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setRows(json.data ?? [])
      setCount(json.count ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [actionFilter, moduleFilter, dateFrom, dateTo, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Client-side text search across summary, actor name, module
  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r => {
      const actorName = r.actor ? `${r.actor.first_name} ${r.actor.last_name}`.toLowerCase() : ''
      const empId     = r.actor?.emp_id?.toLowerCase() ?? ''
      return (
        (r.summary ?? '').toLowerCase().includes(q) ||
        (r.module ?? '').toLowerCase().includes(q) ||
        (r.action ?? '').toLowerCase().includes(q) ||
        actorName.includes(q) ||
        empId.includes(q)
      )
    })
  }, [rows, search])

  // Stats from current page only (count is the unfiltered total)
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayCount    = rows.filter(r => r.created_at.startsWith(today)).length
    const createdCount  = rows.filter(r => r.action === 'created').length
    const updatedCount  = rows.filter(r => r.action === 'updated').length
    const sensitiveCount = rows.filter(r => r.action === 'deleted' || r.action === 'rejected').length
    return { today: todayCount, created: createdCount, updated: updatedCount, sensitive: sensitiveCount }
  }, [rows])

  function clearFilters() {
    setSearch(''); setAction('all'); setModule('all'); setDateFrom(''); setDateTo(''); setPage(1)
  }

  function exportCSV() {
    if (filtered.length === 0) { toast.error('No rows to export'); return }
    const header = ['Timestamp', 'Actor', 'Emp ID', 'Action', 'Module', 'Summary', 'Entity ID', 'IP']
    const csv = [
      header.join(','),
      ...filtered.map(r => [
        new Date(r.created_at).toISOString(),
        r.actor ? `"${r.actor.first_name} ${r.actor.last_name}"` : '—',
        r.actor?.emp_id ?? '—',
        r.action,
        r.module ?? '—',
        `"${(r.summary ?? '').replace(/"/g, '""')}"`,
        r.entity_id ?? '—',
        r.ip_address ?? '—',
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} rows`)
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const hasFilters = search || actionFilter !== 'all' || moduleFilter !== 'all' || dateFrom || dateTo

  return (
    <>
      <Topbar title="Audit Log" subtitle="Every system event — who did what, when, and where">
        <button className="btn btn-outline btn-sm" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={13} /> Export CSV
        </button>
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Events',    value: count,          color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: ClipboardList },
            { label: 'Today',           value: stats.today,    color: '#E8622A', bg: '#fff7ed', border: '#fed7aa', icon: FileText },
            { label: 'Records Created', value: stats.created,  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle },
            { label: 'Sensitive Acts',  value: stats.sensitive, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: Trash2 },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '0.72rem', color, opacity: 0.85, margin: '2px 0 0', fontWeight: 600 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search summary, module, actor, ID…" style={{ ...FIELD, paddingLeft: 32 }} />
            </div>
            <select value={actionFilter} onChange={e => { setAction(e.target.value as any); setPage(1) }} style={{ ...FIELD, flex: '0 0 130px' }}>
              {ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All actions' : a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select>
            <select value={moduleFilter} onChange={e => { setModule(e.target.value); setPage(1) }} style={{ ...FIELD, flex: '0 0 150px' }}>
              {MODULES.map(m => <option key={m} value={m}>{m === 'all' ? 'All modules' : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} style={{ ...FIELD, flex: '0 0 140px' }} title="From date" />
            <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setPage(1) }} style={{ ...FIELD, flex: '0 0 140px' }} title="To date" />
            {hasFilters && (
              <button onClick={clearFilters} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={11} /> Clear
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {filtered.length} {search ? `of ${rows.length}` : ''} · {count} total
            </span>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Timestamp', 'Actor', 'Action', 'Module', 'Summary', 'Entity'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', color: '#9ca3af' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }} />
                    Loading audit events…
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px 14px', textAlign: 'center', color: '#6b7280' }}>
                    <ClipboardList size={32} color="#d1d5db" style={{ marginBottom: 8 }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>{hasFilters ? 'No events match your filters' : 'No audit events yet'}</p>
                    <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '4px 0 0' }}>{hasFilters ? 'Try adjusting your filters.' : 'Events appear here as users create, update, or delete records.'}</p>
                  </td></tr>
                ) : filtered.map((r, i) => {
                  const cfg = ACTION_CFG[r.action] ?? { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', Icon: FileText }
                  const actorName = r.actor ? `${r.actor.first_name} ${r.actor.last_name}` : '—'
                  const initials  = r.actor ? `${r.actor.first_name[0] ?? ''}${r.actor.last_name[0] ?? ''}`.toUpperCase() : '?'
                  return (
                    <tr key={r.id} onClick={() => setSelected(r)} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}>
                      <td style={{ padding: '10px 14px', color: '#374151', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #F47920, #E8622A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.83rem' }}>{actorName}</p>
                            <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: 0, fontFamily: 'monospace' }}>{r.actor?.emp_id ?? r.actor_id.slice(0, 8) + '…'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${cfg.border}`, textTransform: 'capitalize' }}>
                          <cfg.Icon size={10} /> {r.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', textTransform: 'capitalize', fontWeight: 500 }}>{r.module ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#374151', maxWidth: 380 }}>
                        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary ?? '—'}</p>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.7rem' }}>{r.entity_id?.slice(0, 8) ?? '—'}{r.entity_id ? '…' : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {count > PAGE_SIZE && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280' }}>
              <span>Page {page} of {totalPages} · showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of {count}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ChevronLeft size={12} /> Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.3)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '90vw', zIndex: 51, background: '#fff', borderLeft: '1.5px solid #f1f5f9', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.92rem' }}>Audit Event Details</p>
              <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
              {(() => {
                const cfg = ACTION_CFG[selected.action] ?? { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', Icon: FileText }
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.78rem', fontWeight: 700, border: `1px solid ${cfg.border}`, textTransform: 'capitalize', marginBottom: 14 }}>
                    <cfg.Icon size={12} /> {selected.action} · {selected.module ?? 'unknown module'}
                  </span>
                )
              })()}
              <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 600, lineHeight: 1.5, margin: '0 0 18px' }}>{selected.summary ?? 'No summary'}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Actor',       selected.actor ? `${selected.actor.first_name} ${selected.actor.last_name} (${selected.actor.emp_id})` : selected.actor_id],
                  ['Module',      selected.module ?? '—'],
                  ['Action',      selected.action],
                  ['Entity ID',   selected.entity_id ?? '—'],
                  ['IP Address',  selected.ip_address ?? '—'],
                  ['User Agent',  selected.user_agent ?? '—'],
                  ['Timestamp',   new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' })],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>{label}</p>
                    <p style={{ fontSize: '0.82rem', color: '#111827', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>{val}</p>
                  </div>
                ))}
                {selected.meta && Object.keys(selected.meta).length > 0 && (
                  <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Metadata</p>
                    <pre style={{ fontSize: '0.72rem', color: '#374151', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace' }}>{JSON.stringify(selected.meta, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
