'use client'

import { useEffect, useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  IndianRupee,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react'

type Subscription = {
  id: string
  product: string
  tier: string
  seats: number
  billing_cycle: string
  status: string
  amount_per_month: number | null
  next_billing_amount_inr: number | null
  currency: string | null
  trial_ends_at: string | null
  soft_locked_at: string | null
  read_only_at: string | null
  export_only_at: string | null
  deactivated_at: string | null
}

type Organisation = {
  id: string
  name: string
  slug: string
  billing_email: string
  gstin: string | null
  contact_phone: string | null
  plan_tier: string
  subscription_status: string
  hrms_enabled: boolean
  crm_enabled: boolean
  seat_count: number
  trial_ends_at: string | null
}

type Invoice = {
  id: string
  invoice_number: string
  product: string
  period_start: string
  period_end: string
  subtotal: number
  tax: number
  total: number
  currency: string
  status: string
  paid_at: string | null
  pdf_url: string | null
  created_at: string
}

type Credits = {
  allowance_remaining: number
  allowance_carry_over: number
  purchased_balance: number
  balance: number
  allowance_reset_date: string | null
  last_topup_at: string | null
  last_consume_at: string | null
}

type Plan = {
  product: string
  tier: string
  price_per_seat_inr: number
  min_seats: number
  ai_credits_included_monthly: number
  trial_requires_card: boolean
  trial_days: number
  is_active: boolean
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trial:      { label: 'Trial',         color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  active:     { label: 'Active',        color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  past_due:   { label: 'Past due',      color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  read_only:  { label: 'Read-only',     color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  export_only:{ label: 'Export-only',   color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  cancelled:  { label: 'Deactivated',   color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  deactivated:{ label: 'Deactivated',   color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
}

function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [organisation, setOrganisation] = useState<Organisation | null>(null)
  const [seats, setSeats] = useState<{ active_memberships: number; pending_invites: number; plan_limit: number | null }>({ active_memberships: 0, pending_invites: 0, plan_limit: null })
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [credits, setCredits] = useState<Credits | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [subRes, invRes, credRes, planRes] = await Promise.all([
          fetch('/api/billing/subscription'),
          fetch('/api/billing/invoices'),
          fetch('/api/billing/credits'),
          fetch('/api/billing/plans'),
        ])
        const [subJson, invJson, credJson, planJson] = await Promise.all([
          subRes.json(), invRes.json(), credRes.json(), planRes.json(),
        ])
        if (cancelled) return
        if (!subRes.ok) throw new Error(subJson.error ?? 'subscription load failed')
        setSubscription(subJson.subscription)
        setOrganisation(subJson.organisation)
        setSeats(subJson.seats ?? { active_memberships: 0, pending_invites: 0, plan_limit: null })
        setInvoices(invJson.data ?? [])
        setCredits(credJson.credits)
        setPlans(planJson.data ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load billing')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const status = subscription?.status ?? organisation?.subscription_status ?? 'trial'
  const statusCfg = STATUS_LABEL[status] ?? STATUS_LABEL.trial
  const seatsUsed = seats.active_memberships + seats.pending_invites
  const seatLimit = seats.plan_limit ?? subscription?.seats ?? organisation?.seat_count ?? 0
  const seatPct = seatLimit > 0 ? Math.min(100, Math.round((seatsUsed / seatLimit) * 100)) : 0

  const trialDaysLeft = useMemo(() => {
    const ends = subscription?.trial_ends_at ?? organisation?.trial_ends_at
    if (!ends) return null
    const ms = new Date(ends).getTime() - Date.now()
    return ms > 0 ? Math.ceil(ms / 86400000) : 0
  }, [subscription?.trial_ends_at, organisation?.trial_ends_at])

  return (
    <div>
      <Topbar title="Billing" subtitle="Subscription, invoices, and AI credit usage" />

      <div style={{ padding: '24px 28px', maxWidth: 1180, margin: '0 auto' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading billing details…
          </div>
        )}

        {!loading && error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', color: '#991B1B', fontSize: 13 }}>
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Status banner ──────────────────────────────────────────── */}
            <div
              style={{
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                borderRadius: 14,
                padding: '18px 22px',
                marginBottom: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: statusCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {status === 'active' || status === 'trial'
                  ? <CheckCircle2 size={20} color="#fff" />
                  : <AlertTriangle size={20} color="#fff" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: statusCfg.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{statusCfg.label}</span>
                  {trialDaysLeft !== null && status === 'trial' && (
                    <span style={{ fontSize: 11, color: '#64748B' }}>· {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left</span>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  {organisation?.name ?? '—'} · {(subscription?.product ?? 'ihrms').toUpperCase()} {subscription?.tier ?? organisation?.plan_tier ?? ''}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Billing email: <strong style={{ color: '#0F172A' }}>{organisation?.billing_email ?? '—'}</strong>
                  {organisation?.gstin ? <> · GSTIN: <strong style={{ color: '#0F172A' }}>{organisation.gstin}</strong></> : null}
                </div>
              </div>
              {(status === 'past_due' || status === 'cancelled') && (
                <button
                  onClick={() => alert('Self-serve reactivation coming soon. For now, please contact ops@imperialhealthcare.cloud.')}
                  style={{ padding: '10px 18px', borderRadius: 9, background: '#0F172A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Add payment method
                </button>
              )}
            </div>

            {/* ── Top metrics row (seats + plan + next billing + credits) ─ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
              <MetricCard
                icon={<Users size={16} color="#1d4ed8" />}
                title="Seats used"
                value={`${seatsUsed} / ${seatLimit || '∞'}`}
                hint={seatLimit ? `${seatPct}% used (${seats.pending_invites} pending invite${seats.pending_invites === 1 ? '' : 's'})` : null}
              />
              <MetricCard
                icon={<CreditCard size={16} color="#15803d" />}
                title="Plan"
                value={`${(subscription?.tier ?? organisation?.plan_tier ?? '—').toString().toUpperCase()}`}
                hint={subscription?.billing_cycle ? `Billed ${subscription.billing_cycle}` : null}
              />
              <MetricCard
                icon={<IndianRupee size={16} color="#c2410c" />}
                title="Next billing"
                value={fmtINR(subscription?.next_billing_amount_inr)}
                hint={subscription?.trial_ends_at ? `Trial ends ${fmtDate(subscription.trial_ends_at)}` : null}
              />
              <MetricCard
                icon={<Sparkles size={16} color="#7c3aed" />}
                title="AI credits"
                value={`${credits?.balance ?? 0}`}
                hint={credits?.allowance_remaining ? `${credits.allowance_remaining} from allowance` : null}
              />
            </div>

            {/* ── Invoices ─────────────────────────────────────────────── */}
            <Section title="Invoices">
              {invoices.length === 0 ? (
                <EmptyState text="No invoices yet. Your first invoice generates the day after your trial ends." icon={<Clock size={16} />} />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <Th>Invoice</Th>
                      <Th>Period</Th>
                      <Th>Total</Th>
                      <Th>Status</Th>
                      <Th>PDF</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Td><strong style={{ color: '#0F172A' }}>{inv.invoice_number}</strong></Td>
                        <Td>{fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}</Td>
                        <Td>{fmtINR(inv.total)}</Td>
                        <Td><InvoiceStatus status={inv.status} /></Td>
                        <Td>
                          {inv.pdf_url
                            ? <a href={inv.pdf_url} target="_blank" rel="noreferrer" style={{ color: '#E8622A', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Download size={13} />Download</a>
                            : <span style={{ color: '#94A3B8' }}>—</span>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* ── Plans ────────────────────────────────────────────────── */}
            <Section title="Available plans">
              {plans.length === 0 ? (
                <EmptyState text="Pricing catalogue is being prepared." icon={<Clock size={16} />} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {plans
                    .filter(p => !subscription?.product || p.product === subscription.product)
                    .map(p => {
                      const isCurrent = subscription?.product === p.product && subscription?.tier === p.tier
                      return (
                        <div
                          key={`${p.product}:${p.tier}`}
                          style={{
                            border: isCurrent ? '2px solid #F47920' : '1.5px solid #E2E8F0',
                            background: isCurrent ? '#FFF7ED' : '#FFFFFF',
                            borderRadius: 12,
                            padding: '14px 16px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{p.tier}</span>
                            {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: '#F47920', background: 'rgba(244,121,32,0.12)', padding: '2px 7px', borderRadius: 9 }}>CURRENT</span>}
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{fmtINR(p.price_per_seat_inr)}<span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>/seat/mo</span></div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                            Min {p.min_seats} seat{p.min_seats === 1 ? '' : 's'} · {p.ai_credits_included_monthly.toLocaleString('en-IN')} AI credits / mo
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </Section>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────── */

function MetricCard({ icon, title, value, hint }: { icon: React.ReactNode; title: string; value: string; hint?: string | null }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14, fontFamily: "'Outfit', sans-serif" }}>{title}</div>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '11px 12px', color: '#374151' }}>{children}</td>
}

function InvoiceStatus({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    paid:      { color: '#15803d', bg: '#f0fdf4' },
    open:      { color: '#1d4ed8', bg: '#eff6ff' },
    overdue:   { color: '#b91c1c', bg: '#fef2f2' },
    refunded:  { color: '#6d28d9', bg: '#f5f3ff' },
    void:      { color: '#64748b', bg: '#f1f5f9' },
  }
  const c = cfg[status] ?? cfg.open
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, textTransform: 'capitalize' }}>{status}</span>
}

function EmptyState({ text, icon }: { text: string; icon: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {icon}
      {text}
    </div>
  )
}
