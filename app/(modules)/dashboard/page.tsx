'use client'

import { Topbar } from '@/components/layout/Topbar'
import {
  Users, UserCheck, Calendar, Briefcase, Clock, IndianRupee,
  TrendingUp, AlertCircle, CheckCircle2, FileText, CreditCard,
  ChevronRight, Star, ArrowUpRight, ArrowDownRight, Minus,
  Activity, Zap, Target, Shield,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES & DATA
───────────────────────────────────────────── */
const todayAttendance = [
  { name: 'Rajesh Kumar',   dept: 'Engineering',      checkIn: '09:02', checkOut: '—', status: 'Present', hours: '8.5h' },
  { name: 'Priya Sharma',   dept: 'Human Resources',  checkIn: '09:15', checkOut: '—', status: 'Present', hours: '8.2h' },
  { name: 'Amit Patel',     dept: 'Finance',          checkIn: '—',     checkOut: '—', status: 'WFH',     hours: '—' },
  { name: 'Sneha Gupta',    dept: 'Sales',            checkIn: '10:34', checkOut: '—', status: 'Late',    hours: '6.1h' },
  { name: 'Rahul Mehta',    dept: 'Operations',       checkIn: '—',     checkOut: '—', status: 'Absent',  hours: '—' },
  { name: 'Deepika Nair',   dept: 'Marketing',        checkIn: '08:55', checkOut: '—', status: 'Present', hours: '8.7h' },
  { name: 'Vikram Singh',   dept: 'Engineering',      checkIn: '—',     checkOut: '—', status: 'WFH',     hours: '—' },
  { name: 'Kavitha Reddy',  dept: 'Customer Support', checkIn: '09:08', checkOut: '—', status: 'Present', hours: '8.4h' },
]

const pendingActions = [
  { icon: Calendar,   color: '#F59E0B', bg: '#FFFBEB', label: '5 leave requests',            sub: 'Pending your approval',   btn: 'Review', urgency: 'medium' },
  { icon: Clock,      color: '#3B82F6', bg: '#EFF6FF', label: '3 attendance regularizations', sub: 'Employees requested edit', btn: 'Review', urgency: 'low' },
  { icon: CreditCard, color: '#8B5CF6', bg: '#F5F3FF', label: '2 expense claims',             sub: 'Total: ₹18,500 pending',  btn: 'Review', urgency: 'medium' },
  { icon: FileText,   color: '#EF4444', bg: '#FEF2F2', label: '1 payroll pending approval',   sub: 'April 2026 — ₹42,50,000', btn: 'Approve', urgency: 'high' },
]

const departments = [
  { name: 'Engineering', count: 72, total: 72, color: '#2563EB' },
  { name: 'Sales',       count: 48, total: 72, color: '#F47920' },
  { name: 'Operations',  count: 38, total: 72, color: '#10B981' },
  { name: 'Finance',     count: 30, total: 72, color: '#8B5CF6' },
  { name: 'HR',          count: 22, total: 72, color: '#F59E0B' },
]

const leaveStatus = [
  { type: 'Casual Leave (CL)',   used: 3,  total: 12, color: '#3B82F6', pct: 25 },
  { type: 'Sick Leave (SL)',     used: 5,  total: 8,  color: '#10B981', pct: 62.5 },
  { type: 'Earned Leave (EL)',   used: 8,  total: 20, color: '#8B5CF6', pct: 40 },
  { type: 'Loss of Pay (LOP)',   used: 2,  total: 0,  color: '#EF4444', pct: 100 },
]

const recentJoiners = [
  { name: 'Arjun Krishnan', dept: 'Engineering', designation: 'SDE-II',              joinDate: '28 Mar 2026', empId: 'EMP/2026/041', daysAgo: 4 },
  { name: 'Meena Iyer',     dept: 'HR',          designation: 'HR Executive',         joinDate: '25 Mar 2026', empId: 'EMP/2026/040', daysAgo: 7 },
  { name: 'Suresh Babu',    dept: 'Sales',        designation: 'Sales Associate',      joinDate: '20 Mar 2026', empId: 'EMP/2026/039', daysAgo: 12 },
  { name: 'Pooja Agarwal',  dept: 'Finance',      designation: 'Finance Analyst',      joinDate: '15 Mar 2026', empId: 'EMP/2026/038', daysAgo: 17 },
  { name: 'Kiran Rao',      dept: 'Marketing',    designation: 'Marketing Executive',  joinDate: '10 Mar 2026', empId: 'EMP/2026/037', daysAgo: 22 },
]

const upcomingEvents = [
  { label: 'Priya Desai — Last working day',   date: '15 Apr',  color: '#F59E0B', bg: '#FFFBEB', badge: 'Notice Period', icon: '👋' },
  { label: 'Rohit Jain — Last working day',    date: '22 Apr',  color: '#F59E0B', bg: '#FFFBEB', badge: 'Notice Period', icon: '👋' },
  { label: 'Arjun Krishnan — Probation ends',  date: '28 Sep',  color: '#8B5CF6', bg: '#F5F3FF', badge: 'Probation',     icon: '⏳' },
  { label: 'EPF Return Filing due',            date: '15 Apr',  color: '#EF4444', bg: '#FEF2F2', badge: 'Compliance',    icon: '📋' },
  { label: 'Ram Navami — Public Holiday',      date: '2 Apr',   color: '#10B981', bg: '#F0FDF4', badge: 'Holiday',       icon: '🎉' },
]

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    Present: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
    WFH:     { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
    Late:    { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
    Absent:  { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444' },
  }
  const s = map[status] ?? map['Absent']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: '3px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors = [
    { bg: '#EFF6FF', text: '#1D4ED8' },
    { bg: '#FFF7ED', text: '#C2410C' },
    { bg: '#F0FDF4', text: '#15803D' },
    { bg: '#F5F3FF', text: '#6D28D9' },
    { bg: '#FFF1F2', text: '#BE123C' },
    { bg: '#F0FDFA', text: '#0F766E' },
  ]
  const c = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 800,
      flexShrink: 0, fontFamily: "'Outfit', sans-serif",
      border: `1.5px solid ${c.text}20`,
    }}>
      {initials}
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, color, subtext, trend, trendDir,
}: {
  label: string; value: string; icon: React.ElementType
  color: { bg: string; icon: string; border: string; glow: string }
  subtext?: string; trend?: string; trendDir?: 'up' | 'down' | 'flat'
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
      border: `1px solid rgba(0,0,0,0.06)`,
      borderTop: `3px solid ${color.icon}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      transition: 'all 0.2s ease', cursor: 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color.glow}, 0 12px 32px rgba(0,0,0,0.06)`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)'
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: color.bg, opacity: 0.5,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </p>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
            {value}
          </p>
          {subtext && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              {trendDir === 'up' && <ArrowUpRight size={12} style={{ color: '#16A34A', flexShrink: 0 }} />}
              {trendDir === 'down' && <ArrowDownRight size={12} style={{ color: '#DC2626', flexShrink: 0 }} />}
              {trendDir === 'flat' && <Minus size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />}
              <p style={{
                fontSize: 11.5, fontWeight: 600,
                color: trendDir === 'up' ? '#16A34A' : trendDir === 'down' ? '#DC2626' : '#94A3B8',
              }}>
                {subtext}
              </p>
            </div>
          )}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: color.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} style={{ color: color.icon }} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="HR Dashboard"
        subtitle="Welcome back — April 2026"
        notificationCount={18}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '6px 12px' }}>
              <FileText size={13} />
              Export
            </button>
            <button
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #1E3A5F 0%, #1565C0 100%)',
                color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12.5, padding: '6px 14px', borderRadius: 8,
                boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
              }}
            >
              <Zap size={13} />
              Quick Actions
            </button>
          </div>
        }
      />

      <div style={{ padding: '24px 24px 56px', maxWidth: 1600 }}>

        {/* ── KPI Strip ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0,
          background: '#FFFFFF',
          borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {[
            { label: 'Total Staff', value: '248', delta: '↑12', up: true },
            { label: 'Present Today', value: '201', delta: '81%', up: true },
            { label: 'On Leave', value: '23', delta: '9.3%', up: false },
            { label: 'WFH Today', value: '18', delta: '7.3%', up: null },
            { label: 'Open Positions', value: '12', delta: 'hiring', up: null },
            { label: 'Monthly Payroll', value: '₹42.5L', delta: 'Apr 2026', up: null },
            { label: 'Compliance Score', value: '98%', delta: '↑2%', up: true },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px 16px', textAlign: 'center',
              borderRight: i < 6 ? '1px solid #F1F4F9' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFD'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {item.value}
              </div>
              <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 500, marginTop: 3 }}>{item.label}</div>
              {item.delta && (
                <div style={{
                  fontSize: 10, fontWeight: 700, marginTop: 2,
                  color: item.up === true ? '#16A34A' : item.up === false ? '#DC2626' : '#94A3B8',
                }}>
                  {item.delta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 6-card Stat Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Total Employees" value="248" icon={Users} subtext="↑ 12 this month" trendDir="up"
            color={{ bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE', glow: 'rgba(37,99,235,0.12)' }} />
          <StatCard label="Present Today" value="201" icon={UserCheck} subtext="81% attendance" trendDir="up"
            color={{ bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0', glow: 'rgba(22,163,74,0.12)' }} />
          <StatCard label="On Leave Today" value="23" icon={Calendar} subtext="9.3% of workforce" trendDir="flat"
            color={{ bg: '#FFFBEB', icon: '#D97706', border: '#FDE68A', glow: 'rgba(217,119,6,0.12)' }} />
          <StatCard label="Open Positions" value="12" icon={Briefcase} subtext="Actively hiring" trendDir="flat"
            color={{ bg: '#FFF7ED', icon: '#EA580C', border: '#FED7AA', glow: 'rgba(234,88,12,0.12)' }} />
          <StatCard label="Pending Approvals" value="18" icon={Clock} subtext="Action required" trendDir="down"
            color={{ bg: '#FEF2F2', icon: '#DC2626', border: '#FECACA', glow: 'rgba(220,38,38,0.12)' }} />
          <StatCard label="This Month Payroll" value="₹42.5L" icon={IndianRupee} subtext="April 2026" trendDir="up"
            color={{ bg: '#F5F3FF', icon: '#7C3AED', border: '#DDD6FE', glow: 'rgba(124,58,237,0.12)' }} />
        </div>

        {/* ── Quick Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>

          {/* Attendance Rate */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Attendance Rate</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>This month</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '3px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>Good</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: '#16A34A', lineHeight: 1 }}>
                94.2%
              </span>
              <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, paddingBottom: 4 }}>
                ↑ 1.4% vs last month
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: '94.2%', borderRadius: 99, background: 'linear-gradient(90deg, #16A34A, #22C55E)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer-progress 2s linear infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
              <span>Target: 90%</span>
              <span>14 working days left</span>
            </div>
          </div>

          {/* Headcount by Dept */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Headcount by Dept</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Top 5 departments</p>
              </div>
              <span style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 9px' }}>
                248 total
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {departments.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: '#374151', fontWeight: 500, minWidth: 0 }}>
                    {d.name}
                  </span>
                  <div style={{ width: 90, height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(d.count / d.total) * 100}%`,
                      borderRadius: 99, background: d.color, transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2937', minWidth: 28, textAlign: 'right' }}>
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Status */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Leave Status</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Organisation average</p>
              </div>
              <Target size={15} style={{ color: '#94A3B8' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {leaveStatus.map((l) => (
                <div key={l.type}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{l.type}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>
                      {l.used}{l.total > 0 ? ` / ${l.total}` : ' days'}
                    </span>
                  </div>
                  {l.total > 0 && (
                    <div style={{ height: 3, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${l.pct}%`, background: l.color, borderRadius: 99 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', fontSize: 11, color: '#94A3B8' }}>
              Average across all employees · April 2026
            </div>
          </div>
        </div>

        {/* ── Today's Attendance + Pending Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, marginBottom: 20 }}>

          {/* Today's Attendance */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Today&apos;s Attendance</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>1 April 2026 · 248 employees</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748B', marginRight: 4 }}>
                  {[['#22C55E', 'Present'], ['#3B82F6', 'WFH'], ['#F59E0B', 'Late'], ['#EF4444', 'Absent']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      {l}
                    </span>
                  ))}
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F47920', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  View All <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Employee', 'Department', 'Check-In', 'Hours', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '9px 16px', textAlign: 'left',
                        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: '#94A3B8',
                        borderBottom: '1px solid #EEF0F4', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((emp, i) => (
                    <tr key={emp.name}
                      style={{ borderBottom: i < todayAttendance.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar name={emp.name} size={28} />
                          <span style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748B', fontSize: 12.5 }}>{emp.dept}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#374151', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{emp.checkIn}</td>
                      <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: 12 }}>{emp.hours}</td>
                      <td style={{ padding: '10px 16px' }}><StatusBadge status={emp.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Actions */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Pending Actions</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Requires your attention</p>
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA',
                borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 9px',
              }}>
                <Activity size={10} />
                18 total
              </span>
            </div>

            <div style={{ padding: '6px 0' }}>
              {pendingActions.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                    borderBottom: i < pendingActions.length - 1 ? '1px solid #F8FAFC' : 'none',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFC'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: item.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: `1px solid ${item.color}20`,
                    }}>
                      <Icon size={16} style={{ color: item.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', lineHeight: 1.3 }}>{item.label}</p>
                      <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{item.sub}</p>
                    </div>
                    {item.urgency === 'high' && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#EF4444',
                        flexShrink: 0, boxShadow: '0 0 0 3px rgba(239,68,68,0.2)',
                        animation: 'notif-ring 1.5s ease-in-out infinite',
                      }} />
                    )}
                    <button style={{
                      background: '#F8FAFC', border: '1px solid #E2E8F0',
                      borderRadius: 7, padding: '5px 12px',
                      fontSize: 11.5, fontWeight: 600, color: '#374151', cursor: 'pointer',
                      transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.bg; (e.currentTarget as HTMLElement).style.borderColor = item.color; (e.currentTarget as HTMLElement).style.color = item.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#374151' }}
                    >
                      {item.btn}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderTop: '1px solid #F1F5F9',
              background: '#FAFBFD',
            }}>
              <AlertCircle size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: '#64748B' }}>
                4 action types · 18 items need resolution today
              </span>
            </div>
          </div>
        </div>

        {/* ── Recent Joiners + Upcoming Events ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 14 }}>

          {/* Recent Joiners */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Recent Joiners</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>New employees this month</p>
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0',
                borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 9px',
              }}>
                <Star size={10} />
                5 this month
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Employee', 'Dept / Designation', 'Joined', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '9px 16px', textAlign: 'left',
                        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: '#94A3B8',
                        borderBottom: '1px solid #EEF0F4', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentJoiners.map((emp, i) => (
                    <tr key={emp.empId}
                      style={{ borderBottom: i < recentJoiners.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar name={emp.name} size={28} />
                          <div>
                            <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13, lineHeight: 1.3 }}>{emp.name}</p>
                            <p style={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1.2 }}>{emp.empId}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: '#374151', lineHeight: 1.3 }}>{emp.dept}</p>
                        <p style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.2 }}>{emp.designation}</p>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.3 }}>{emp.joinDate}</p>
                        <p style={{ fontSize: 10.5, color: '#94A3B8' }}>{emp.daysAgo}d ago</p>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A',
                          borderRadius: 20, fontSize: 10.5, fontWeight: 700, padding: '2px 8px',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
                          Probation
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F1F4F9',
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Upcoming Events</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Next 30 days</p>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F47920', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Calendar <ChevronRight size={12} />
              </button>
            </div>
            <div>
              {upcomingEvents.map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  borderBottom: i < upcomingEvents.length - 1 ? '1px solid #F8FAFC' : 'none',
                  transition: 'background 0.1s', cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: ev.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, border: `1px solid ${ev.color}20`,
                  }}>
                    {ev.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, color: '#1E293B', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.label}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{ev.date}</p>
                  </div>
                  <span style={{
                    background: ev.bg, color: ev.color,
                    border: `1px solid ${ev.color}30`,
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  }}>
                    {ev.badge}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderTop: '1px solid #F1F5F9',
              background: '#FAFBFD',
            }}>
              <CheckCircle2 size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: '#64748B' }}>
                All statutory filings up to date · Last sync: today
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer info strip ── */}
        <div style={{
          marginTop: 20, padding: '14px 18px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)',
          border: '1px solid #BFDBFE',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1E3A5F, #1565C0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>IHRMS v2.0 — India Compliance Ready</p>
              <p style={{ fontSize: 11, color: '#3B82F6' }}>All data shown is demo. Connect Supabase to enable live payroll, attendance, and real-time dashboards.</p>
            </div>
          </div>
          <button style={{
            background: 'linear-gradient(135deg, #1E3A5F, #1565C0)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '7px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ArrowUpRight size={13} /> Connect Supabase
          </button>
        </div>

      </div>
    </>
  )
}
