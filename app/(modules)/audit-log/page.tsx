'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'

interface AuditRow {
  id: string
  actor_id: string
  action: string
  resource_type: string
  resource_id: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/audit-log')
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <ClipboardList size={22} color="#F47920" />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#E2E8F0' }}>Audit Log</h1>
      </div>

      {loading && <p style={{ color: '#64748B' }}>Loading…</p>}
      {error && <p style={{ color: '#EF4444' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Timestamp', 'Actor', 'Action', 'Resource', 'Resource ID'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px 12px', color: '#64748B', textAlign: 'center' }}>No audit events yet.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#CBD5E1', fontFamily: 'monospace', fontSize: 11 }}>{r.actor_id.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 12px', color: '#F47920', fontWeight: 600 }}>{r.action}</td>
                  <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{r.resource_type}</td>
                  <td style={{ padding: '8px 12px', color: '#64748B', fontFamily: 'monospace', fontSize: 11 }}>{r.resource_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
