'use client'

import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Shield,
  Edit, Camera, Building2, Clock, Award, FileText,
  CheckCircle2, AlertCircle, Download, Key, Bell, Lock,
} from 'lucide-react'
import { useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   MOCK PROFILE DATA
───────────────────────────────────────────────────────────── */
const PROFILE = {
  name:        'Nischay Mehra',
  email:       'nischay.mehra@imperiahealth.in',
  phone:       '+91 98765 43210',
  designation: 'HR Administrator',
  department:  'Human Resources',
  empId:       'EMP/2023/001',
  location:    'Bengaluru, Karnataka',
  joinDate:    '01 April 2023',
  reportingTo: 'Rahul Sharma (VP — People & Culture)',
  workMode:    'Hybrid',
  shift:       '9:00 AM – 6:00 PM IST',
  role:        'Super Admin',
  pan:         'ABCNM1234P',
  pf:          'KA/BLR/12345/001',
  bank:        'HDFC Bank — XXXX4321',
  ifsc:        'HDFC0001234',
}

const ACTIVITY = [
  { label: 'Approved Priya Sharma\'s leave request',  time: 'Today, 10:32 AM',   icon: CheckCircle2, color: '#16A34A' },
  { label: 'Ran February 2026 payroll',               time: 'Yesterday, 3:15 PM',icon: FileText,     color: '#1D4ED8' },
  { label: 'Onboarded Suresh Babu (EMP/2026/014)',    time: '2 days ago',         icon: User,         color: '#E8622A' },
  { label: 'Updated salary structure for Vikram Singh',time: '3 days ago',        icon: Edit,         color: '#7C3AED' },
  { label: 'Issued warning to Kiran Roy',             time: '5 days ago',         icon: AlertCircle,  color: '#DC2626' },
]

const STATS = [
  { label: 'Leaves Approved',    value: '142', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { label: 'Payrolls Processed', value: '24',  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  { label: 'Employees Onboarded',value: '38',  color: '#E8622A', bg: '#FFF7ED', border: '#FED7AA' },
  { label: 'Actions This Month', value: '91',  color: '#7C3AED', bg: '#FAF5FF', border: '#E9D5FF' },
]

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { data: session } = useSession()
  const name     = session?.user?.name  ?? PROFILE.name
  const email    = session?.user?.email ?? PROFILE.email
  const image    = session?.user?.image

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview')

  const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F1F4F9' }}>
      <Topbar
        title="My Profile"
        subtitle="View and manage your account information"
      />

      <div className="p-6 space-y-5">

        {/* ── PROFILE HERO CARD ── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Cover banner */}
          <div className="h-28 relative" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #E8622A 0%, transparent 50%), radial-gradient(circle at 80% 20%, #F59E0B 0%, transparent 40%)' }}/>
          </div>

          <div className="px-6 pb-5">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={name}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white"
                    style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-white text-2xl font-extrabold"
                    style={{ background: 'linear-gradient(135deg,#E8622A,#F59E0B)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {initials}
                  </div>
                )}
                <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-white"
                  style={{ background: '#E8622A' }}>
                  <Camera size={11} />
                </button>
              </div>

              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit size={13} /> Edit Profile
              </button>
            </div>

            {/* Name + role */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">{name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{PROFILE.designation} · {PROFILE.department}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail size={11} className="text-gray-400" />{email}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={11} className="text-gray-400" />{PROFILE.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Briefcase size={11} className="text-gray-400" />{PROFILE.empId}
                  </span>
                </div>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#FFF7ED,#FFEDD5)', color: '#EA580C', border: '1px solid #FED7AA' }}>
                  <Shield size={11} /> {PROFILE.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── STAT STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="rounded-xl p-4 border text-center transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ background: s.bg, borderColor: s.border }}>
              <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── TABS + CONTENT ── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex border-b border-gray-100">
            {([
              { key: 'overview',  label: 'Overview' },
              { key: 'activity',  label: 'Recent Activity' },
              { key: 'security',  label: 'Security & Access' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="relative px-5 py-4 text-sm font-semibold transition-colors"
                style={{ color: activeTab === tab.key ? '#E8622A' : '#94A3B8', background: activeTab === tab.key ? '#FFF7F5' : 'transparent' }}>
                {tab.label}
                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#E8622A' }} />}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ─── OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Personal Information */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Personal Information</p>
                  <div className="space-y-0 rounded-xl overflow-hidden border border-gray-100">
                    {[
                      { label: 'Full Name',    value: name,             icon: User },
                      { label: 'Email',        value: email,            icon: Mail },
                      { label: 'Phone',        value: PROFILE.phone,    icon: Phone },
                      { label: 'Location',     value: PROFILE.location, icon: MapPin },
                    ].map((row, i, arr) => (
                      <div key={row.label} className="flex items-center gap-4 px-4 py-3"
                        style={{ background: i % 2 === 0 ? '#FAFAFA' : '#fff', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#FFF7ED', color: '#E8622A' }}>
                          <row.icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">{row.label}</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employment Details */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Employment Details</p>
                  <div className="space-y-0 rounded-xl overflow-hidden border border-gray-100">
                    {[
                      { label: 'Designation',  value: PROFILE.designation,  icon: Briefcase },
                      { label: 'Department',   value: PROFILE.department,   icon: Building2 },
                      { label: 'Employee ID',  value: PROFILE.empId,        icon: Award },
                      { label: 'Joining Date', value: PROFILE.joinDate,     icon: Calendar },
                      { label: 'Reporting To', value: PROFILE.reportingTo,  icon: User },
                      { label: 'Work Mode',    value: PROFILE.workMode,     icon: Clock },
                      { label: 'Shift',        value: PROFILE.shift,        icon: Clock },
                    ].map((row, i, arr) => (
                      <div key={row.label} className="flex items-center gap-4 px-4 py-3"
                        style={{ background: i % 2 === 0 ? '#FAFAFA' : '#fff', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                          <row.icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">{row.label}</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payroll & Compliance */}
                <div className="lg:col-span-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payroll & Compliance</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'PAN Number',   value: PROFILE.pan,  icon: FileText, color: '#7C3AED', bg: '#FAF5FF' },
                      { label: 'PF Account',   value: PROFILE.pf,   icon: Shield,   color: '#15803D', bg: '#F0FDF4' },
                      { label: 'Bank Account', value: PROFILE.bank, icon: Building2,color: '#1D4ED8', bg: '#EFF6FF' },
                      { label: 'IFSC Code',    value: PROFILE.ifsc, icon: Key,      color: '#B45309', bg: '#FFFBEB' },
                    ].map(row => (
                      <div key={row.label} className="rounded-xl p-4 border border-gray-100"
                        style={{ background: row.bg }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                          style={{ background: 'rgba(255,255,255,0.7)', color: row.color }}>
                          <row.icon size={15} />
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium">{row.label}</p>
                        <p className="text-sm font-bold mt-0.5 font-mono" style={{ color: row.color }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ─── ACTIVITY ─── */}
            {activeTab === 'activity' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-900">Recent Activity</p>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700">
                    <Download size={12} /> Export Log
                  </button>
                </div>

                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-4 bottom-4 w-px" style={{ background: '#F1F5F9' }} />

                  <div className="space-y-1">
                    {ACTIVITY.map((item, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 z-10"
                          style={{ background: `${item.color}15`, color: item.color }}>
                          <item.icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center mt-4 pt-4 border-t border-gray-100">
                  <button className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                    View full activity log →
                  </button>
                </div>
              </div>
            )}

            {/* ─── SECURITY ─── */}
            {activeTab === 'security' && (
              <div className="space-y-5">

                {/* Login & Auth */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Login & Authentication</p>
                  <div className="space-y-3">
                    {[
                      {
                        icon: Mail, title: 'Google Account (SSO)',
                        desc: `Signed in via Google · ${email}`,
                        status: 'Connected', statusColor: '#15803D', statusBg: '#DCFCE7',
                        action: null,
                      },
                      {
                        icon: Key, title: 'Password',
                        desc: 'Managed by Google SSO — no separate password needed',
                        status: 'SSO Managed', statusColor: '#1D4ED8', statusBg: '#DBEAFE',
                        action: null,
                      },
                      {
                        icon: Lock, title: 'Two-Factor Authentication',
                        desc: 'Add an extra layer of security to your account',
                        status: 'Not Enabled', statusColor: '#B45309', statusBg: '#FEF3C7',
                        action: 'Enable 2FA',
                      },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#fff', color: '#64748B', border: '1px solid #E2E8F0' }}>
                          <row.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{row.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: row.statusBg, color: row.statusColor }}>
                            {row.status}
                          </span>
                          {row.action && (
                            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                              style={{ background: '#E8622A' }}>
                              {row.action}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Role & Permissions</p>
                  <div className="p-4 rounded-xl border border-orange-100" style={{ background: '#FFF7ED' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8622A', color: '#fff' }}>
                        <Shield size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Super Admin</p>
                        <p className="text-xs text-gray-500">Full access to all HRMS modules</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        'Employees','Payroll','Recruitment','Attendance',
                        'Leaves','Reports','Compliance','Settings','Announcements',
                      ].map(perm => (
                        <div key={perm} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <CheckCircle2 size={12} style={{ color: '#16A34A', flexShrink: 0 }} />
                          {perm}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notification Preferences</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Leave requests & approvals', enabled: true  },
                      { label: 'Payroll processing alerts',  enabled: true  },
                      { label: 'New employee onboarding',    enabled: true  },
                      { label: 'System & compliance alerts', enabled: true  },
                      { label: 'Weekly summary digest',      enabled: false },
                    ].map((pref, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <Bell size={13} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{pref.label}</span>
                        </div>
                        <div className="w-10 h-5.5 rounded-full flex items-center transition-all cursor-pointer flex-shrink-0"
                          style={{
                            background: pref.enabled ? '#E8622A' : '#E2E8F0',
                            padding: '2px',
                            height: 22, width: 40,
                          }}>
                          <div className="w-4 h-4 rounded-full bg-white transition-all"
                            style={{ marginLeft: pref.enabled ? 18 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
