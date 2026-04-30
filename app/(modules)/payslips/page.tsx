'use client'

import { useEffect, useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  IndianRupee, Download, Calendar, Loader2, FileText, X, CheckCircle, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Payslip {
  id: string
  payroll_run_id: string | null
  employee_id: string
  month?: number | null
  year?: number | null
  gross_salary?: number | null
  net_salary?: number | null
  total_deductions?: number | null
  basic?: number | null
  hra?: number | null
  conveyance?: number | null
  medical_allowance?: number | null
  special_allowance?: number | null
  lta?: number | null
  pf_employee?: number | null
  esic_employee?: number | null
  tds?: number | null
  professional_tax?: number | null
  loss_of_pay?: number | null
  working_days?: number | null
  paid_days?: number | null
  status?: string | null
  pdf_url?: string | null
  created_at: string
  period: string
  run_status: string | null
  run?: { id: string; month: number; year: number; status: string } | null
}

const PAGE_BG = '#fff'
const STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  paid:      { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Paid' },
  approved:  { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Approved' },
  draft:     { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Draft' },
  pending:   { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Pending' },
  processing:{ color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', label: 'Processing' },
}

function formatINR(n: number | null | undefined) {
  if (n == null) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<Payslip | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/payslips/me')
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error)
        setPayslips(j.data ?? [])
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load payslips'))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const totalNet = payslips.reduce((acc, p) => acc + (Number(p.net_salary) || 0), 0)
    const ytdGross = payslips
      .filter(p => p.year === new Date().getFullYear())
      .reduce((acc, p) => acc + (Number(p.gross_salary) || 0), 0)
    const lastNet = payslips[0]?.net_salary
    return { count: payslips.length, totalNet, ytdGross, lastNet }
  }, [payslips])

  function downloadPDF(p: Payslip) {
    if (p.pdf_url) {
      window.open(p.pdf_url, '_blank')
      return
    }
    toast.error('PDF not yet generated for this payslip. Please contact HR.')
  }

  return (
    <>
      <Topbar title="My Payslips" subtitle="Salary slips for every payroll cycle" />

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Payslips',     value: stats.count,                            color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: FileText },
            { label: 'Last Net Salary',    value: stats.lastNet != null ? formatINR(stats.lastNet) : '—',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: IndianRupee },
            { label: `YTD Gross (${new Date().getFullYear()})`, value: stats.ytdGross > 0 ? formatINR(stats.ytdGross) : '—',           color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', icon: Calendar },
            { label: 'Lifetime Net',       value: stats.totalNet > 0 ? formatINR(stats.totalNet) : '—',    color: '#E8622A', bg: '#fff7ed', border: '#fed7aa', icon: CheckCircle },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '1rem', fontWeight: 800, color, margin: 0, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
                <p style={{ fontSize: '0.7rem', color, opacity: 0.85, margin: '2px 0 0', fontWeight: 600 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* List / table */}
        {loading ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0 }}>Loading your payslips…</p>
          </div>
        ) : payslips.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <IndianRupee size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>No payslips yet</p>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Your salary slips will appear here once HR runs payroll.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Period', 'Working / Paid Days', 'Gross', 'Deductions', 'Net Salary', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p, i) => {
                    const cfg = STATUS_CFG[p.run_status ?? p.status ?? ''] ?? { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: p.run_status ?? p.status ?? 'Unknown' }
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? PAGE_BG : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{p.period}</td>
                        <td style={{ padding: '12px 14px', color: '#374151' }}>{p.working_days ?? '—'} / {p.paid_days ?? '—'}</td>
                        <td style={{ padding: '12px 14px', color: '#15803d', fontWeight: 600 }}>{formatINR(p.gross_salary)}</td>
                        <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 600 }}>{formatINR(p.total_deductions)}</td>
                        <td style={{ padding: '12px 14px', color: '#1d4ed8', fontWeight: 700 }}>{formatINR(p.net_salary)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${cfg.border}`, textTransform: 'capitalize' }}>
                            {cfg.label.toLowerCase().includes('paid') ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', display: 'flex', gap: 6 }}>
                          <button onClick={() => setSelected(p)} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', padding: '5px 10px' }}>View</button>
                          {p.pdf_url && (
                            <button onClick={() => downloadPDF(p)} className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Download size={11} /> PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, background: '#fff', borderRadius: 14, width: '92%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Payslip</p>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: '3px 0 0' }}>{selected.period}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Headline */}
              <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #1d4ed8 100%)', color: '#fff', padding: '18px 22px', borderRadius: 12 }}>
                <p style={{ fontSize: '0.7rem', opacity: 0.8, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Net Salary</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, lineHeight: 1 }}>{formatINR(selected.net_salary)}</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.8, margin: '6px 0 0' }}>
                  Gross {formatINR(selected.gross_salary)} · Deductions {formatINR(selected.total_deductions)} · {selected.paid_days ?? '—'} paid days
                </p>
              </div>

              {/* Earnings */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Earnings</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Basic',       selected.basic],
                    ['HRA',         selected.hra],
                    ['Conveyance',  selected.conveyance],
                    ['Medical',     selected.medical_allowance],
                    ['Special',     selected.special_allowance],
                    ['LTA',         selected.lta],
                  ].filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 7, fontSize: '0.83rem' }}>
                      <span style={{ color: '#374151' }}>{k}</span>
                      <span style={{ color: '#15803d', fontWeight: 700 }}>{formatINR(v as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Deductions</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Employee PF',       selected.pf_employee],
                    ['Employee ESIC',     selected.esic_employee],
                    ['TDS',               selected.tds],
                    ['Professional Tax',  selected.professional_tax],
                    ['Loss of Pay',       selected.loss_of_pay],
                  ].filter(([, v]) => v != null && (v as number) > 0).map(([k, v]) => (
                    <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 7, fontSize: '0.83rem' }}>
                      <span style={{ color: '#374151' }}>{k}</span>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatINR(v as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Working days */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Working days</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{selected.working_days ?? '—'} / Paid {selected.paid_days ?? '—'}</span>
              </div>
            </div>

            {selected.pdf_url && (
              <div style={{ padding: '14px 22px', borderTop: '1.5px solid #f1f5f9' }}>
                <button onClick={() => downloadPDF(selected)} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Download size={14} /> Download PDF
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
