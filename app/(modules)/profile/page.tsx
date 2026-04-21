'use client'

import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Shield,
  Edit, Camera, Building2, Clock, Award, FileText,
  CheckCircle2, AlertCircle, Download, Key, Bell, Lock, X,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { employeesApi, leavesApi, payrollApi, warningsApi, type Employee as ApiEmployee } from '@/lib/api-client'

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

interface ActivityItem {
  label: string; time: string
  icon: React.ElementType; color: string
}

interface StatItem {
  label: string; value: string; color: string; bg: string; border: string
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
const ROLE_MAP: Record<string, string> = {
  super_admin: 'Super Admin', hr_admin: 'HR Administrator', admin: 'Administrator',
  hr: 'HR', operations_head: 'Operations Head', manager: 'Manager',
  payroll_admin: 'Payroll Admin', finance_admin: 'Finance Admin', employee: 'Employee',
}
const WORK_TYPE_MAP: Record<string, string> = {
  office: 'Work From Office', home: 'Work From Home', hybrid: 'Hybrid',
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const sessionUserId = (session?.user as any)?.id   as string | undefined
  const sessionRole   = (session?.user as any)?.role as string | undefined
  const isFullAccess  = ['hr_admin', 'super_admin', 'admin', 'hr'].includes(sessionRole ?? '')

  const [empProfile,    setEmpProfile]    = useState<ApiEmployee | null>(null)
  const [profileLoading,setProfileLoading]= useState(true)
  const [activityLog,   setActivityLog]   = useState<ActivityItem[]>([])
  const [profileStats,  setProfileStats]  = useState<StatItem[]>([
    { label: 'Leaves Taken',       value: '…', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    { label: 'Payslips',           value: '…', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'Days Present',       value: '…', color: '#E8622A', bg: '#FFF7ED', border: '#FED7AA' },
    { label: 'Warnings',           value: '…', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  ])

  // Avatar upload state
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null)
  const [avatarUploading,setAvatarUploading]= useState(false)
  const [avatarErr,      setAvatarErr]      = useState('')
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarErr('')
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res  = await fetch('/api/employees/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      // Append cache-buster so browser fetches the new image (Supabase upsert keeps same URL)
      const freshUrl = `${json.avatar_url}?t=${Date.now()}`
      setAvatarUrl(freshUrl)
      setEmpProfile(prev => prev ? { ...prev, avatar_url: freshUrl } as any : prev)
    } catch (err: any) {
      setAvatarErr(err.message)
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    if (!sessionUserId) return
    setAvatarUploading(true)
    setAvatarErr('')
    try {
      const res = await fetch(`/api/employees/${sessionUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: null }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed') }
      setAvatarUrl(null)
      setEmpProfile(prev => prev ? { ...prev, avatar_url: null } as any : prev)
    } catch (err: any) {
      setAvatarErr(err.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  // Edit Profile state
  const [showEdit,   setShowEdit]   = useState(false)
  const [editForm,   setEditForm]   = useState({ first_name:'', last_name:'', personal_phone:'', work_location:'', date_of_birth:'', gender:'' })
  const [editSaving, setEditSaving] = useState(false)
  const [editErr,    setEditErr]    = useState('')

  // Step 1 — fetch employee record by session ID (direct, reliable)
  useEffect(() => {
    if (!sessionUserId) return
    setProfileLoading(true)
    fetch(`/api/employees/${sessionUserId}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) {
          setEmpProfile(j.data as any)
          setEditForm({
            first_name:     j.data.first_name     ?? '',
            last_name:      j.data.last_name      ?? '',
            personal_phone: j.data.personal_phone ?? j.data.phone ?? '',
            work_location:  j.data.work_location  ?? '',
            date_of_birth:  j.data.date_of_birth  ?? '',
            gender:         j.data.gender         ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [sessionUserId])

  // Step 2 — fetch stats scoped to the user's role
  useEffect(() => {
    if (!sessionUserId) return
    const year = new Date().getFullYear()
    const month = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    if (isFullAccess) {
      // HR view — org-wide stats
      Promise.all([
        leavesApi.list({ status: 'approved', limit: 1 }),
        payrollApi.list({ limit: 1 }),
        employeesApi.list({ status: 'active', limit: 1 }),
        warningsApi.list({ limit: 1 }),
      ]).then(([lvRes, prRes, empRes, warnRes]) => {
        setProfileStats([
          { label: 'Leaves Approved',    value: String(lvRes.count   ?? 0), color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Payrolls Processed', value: String(prRes.count   ?? 0), color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'Employees Active',   value: String(empRes.count  ?? 0), color: '#E8622A', bg: '#FFF7ED', border: '#FED7AA' },
          { label: 'Warnings Issued',    value: String(warnRes.count ?? 0), color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ])
        // Activity for HR
        const items: ActivityItem[] = []
        for (const l of lvRes.data.slice(0, 3)) {
          const emp = l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : 'Employee'
          items.push({ label: `Approved ${emp}'s ${l.leave_type} leave`, time: relTime(l.updated_at ?? l.created_at), icon: CheckCircle2, color: '#16A34A' })
        }
        for (const p of prRes.data.slice(0, 2)) {
          const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          items.push({ label: `Payroll ${MONTHS[(p.month ?? 1) - 1]} ${p.year} — ${p.status}`, time: relTime(p.created_at ?? new Date().toISOString()), icon: FileText, color: '#1D4ED8' })
        }
        for (const w of warnRes.data.slice(0, 2)) {
          const emp = w.employee ? `${w.employee.first_name} ${w.employee.last_name}` : 'Employee'
          items.push({ label: `Warning issued to ${emp}`, time: relTime(w.issued_date ?? new Date().toISOString()), icon: AlertCircle, color: '#DC2626' })
        }
        setActivityLog(items.slice(0, 6))
      }).catch(console.error)
    } else {
      // Employee view — own stats
      Promise.all([
        leavesApi.list({ employee_id: sessionUserId, year: String(year), limit: 100 }),
        payrollApi.list({ limit: 100 }),
        fetch(`/api/attendance/summary?month=${month}`).then(r => r.json()),
        warningsApi.list({ limit: 100 }),
      ]).then(([lvRes, prRes, attJson, warnRes]) => {
        const myLeavesTaken = lvRes.data.filter((l: any) => ['approved'].includes(l.status)).length
        const myEmployee    = attJson?.employees?.[0]
        setProfileStats([
          { label: 'Leaves Taken',    value: String(myLeavesTaken),              color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Payslips',        value: String(prRes.data.length),           color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'Days Present',    value: String(myEmployee?.present ?? '—'),  color: '#E8622A', bg: '#FFF7ED', border: '#FED7AA' },
          { label: 'Warnings',        value: String(warnRes.data.length),         color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ])
        // Activity for employee — own leave requests
        const items: ActivityItem[] = []
        for (const l of lvRes.data.slice(0, 4)) {
          const statusColors: Record<string, string> = { approved:'#16A34A', pending:'#D97706', rejected:'#DC2626' }
          items.push({ label: `${l.leave_type} leave (${l.from_date} – ${l.to_date}) — ${l.status}`, time: relTime(l.updated_at ?? l.created_at), icon: Calendar, color: statusColors[l.status] ?? '#64748B' })
        }
        for (const w of warnRes.data.slice(0, 2)) {
          items.push({ label: `Warning: ${w.subject}`, time: relTime(w.issued_date ?? new Date().toISOString()), icon: AlertCircle, color: '#DC2626' })
        }
        setActivityLog(items.slice(0, 6))
      }).catch(console.error)
    }
  }, [sessionUserId, isFullAccess])

  // Derived display values
  const name        = empProfile ? `${(empProfile as any).first_name ?? ''} ${(empProfile as any).last_name ?? ''}`.trim() : (session?.user?.name ?? PROFILE.name)
  const email       = (empProfile as any)?.work_email ?? (empProfile as any)?.email ?? session?.user?.email ?? PROFILE.email
  const phone       = (empProfile as any)?.personal_phone ?? (empProfile as any)?.phone ?? PROFILE.phone
  const designation = (empProfile as any)?.designation?.title ?? PROFILE.designation
  const department  = (empProfile as any)?.department?.name   ?? PROFILE.department
  const empId       = (empProfile as any)?.emp_id ?? (empProfile as any)?.employee_code ?? PROFILE.empId
  const location    = (empProfile as any)?.work_location ?? PROFILE.location
  const joinDate    = (empProfile as any)?.date_of_joining ?? (empProfile as any)?.hire_date
    ? new Date((empProfile as any).date_of_joining ?? (empProfile as any).hire_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : PROFILE.joinDate
  const reportingTo = (empProfile as any)?.reporting_manager
    ? `${(empProfile as any).reporting_manager.first_name} ${(empProfile as any).reporting_manager.last_name}`
    : PROFILE.reportingTo
  const workMode    = WORK_TYPE_MAP[(empProfile as any)?.work_type ?? ''] ?? PROFILE.workMode
  // Only use explicitly uploaded/saved avatar — never session.user.image (stale JWT, may be company logo)
  const displayAvatar = avatarUrl  // seeded from DB on load, updated after upload

  // Seed from DB once profile loads — only if we don't already have a freshly uploaded URL
  useEffect(() => {
    const dbAvatar = (empProfile as any)?.avatar_url ?? null
    setAvatarUrl(prev => {
      // If we already set a cache-busted URL (contains ?t=), keep it
      if (prev && prev.includes('?t=')) return prev
      return dbAvatar
    })
  }, [empProfile])

  // Use session role (set by NextAuth from DB on login) — most reliable
  const roleLabel   = ROLE_MAP[sessionRole ?? ''] ?? (sessionRole ?? 'Employee')

  // Edit Profile save
  const handleEditSave = async () => {
    if (!sessionUserId) return
    setEditSaving(true)
    setEditErr('')
    try {
      const res = await fetch(`/api/employees/${sessionUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:     editForm.first_name.trim()     || undefined,
          last_name:      editForm.last_name.trim()      || undefined,
          personal_phone: editForm.personal_phone.trim() || undefined,
          work_location:  editForm.work_location.trim()  || undefined,
          date_of_birth:  editForm.date_of_birth         || undefined,
          gender:         editForm.gender                || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      // Refresh profile
      setEmpProfile(json.data as any)
      setShowEdit(false)
    } catch (e: any) {
      setEditErr(e.message)
    } finally {
      setEditSaving(false)
    }
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security' | 'notices'>('overview')

  // My Notices state
  const [myWarnings,      setMyWarnings]      = useState<any[]>([])
  const [myAppreciations, setMyAppreciations] = useState<any[]>([])
  const [noticesLoading,  setNoticesLoading]  = useState(false)
  const [selectedNotice,  setSelectedNotice]  = useState<any | null>(null)
  const [ackRemark,       setAckRemark]       = useState('')
  const [acking,          setAcking]          = useState(false)

  useEffect(() => {
    if (activeTab !== 'notices') return
    setNoticesLoading(true)
    Promise.all([
      fetch('/api/warnings?limit=50').then(r => r.json()),
      fetch('/api/appreciation?limit=50').then(r => r.json()),
    ]).then(([wj, aj]) => {
      setMyWarnings(wj.data ?? [])
      setMyAppreciations(aj.data ?? [])
    }).catch(() => {}).finally(() => setNoticesLoading(false))
  }, [activeTab])

  const handleAcknowledge = async (warning: any) => {
    setAcking(true)
    try {
      const res = await fetch('/api/warnings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: warning.id, action: 'acknowledge', employee_remarks: ackRemark }),
      })
      if (res.ok) {
        setMyWarnings(prev => prev.map(w => w.id === warning.id ? { ...w, status: 'acknowledged', employee_remarks: ackRemark } : w))
        setSelectedNotice(null)
        setAckRemark('')
      }
    } catch { /* silent */ } finally { setAcking(false) }
  }

  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'U'

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F1F4F9' }}>
      <Topbar
        title="My Profile"
        subtitle="View and manage your account information"
      />

      <div style={{ padding: '20px 24px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── PROFILE HERO CARD ── */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E8EDF5', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

          {/* Cover banner */}
          <div style={{ position: 'relative', height: 140, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 45%, #1E3A5F 100%)', overflow: 'hidden' }}>
            <div style={{ position:'absolute', top:-50, right:-50, width:220, height:220, borderRadius:'50%', background:'rgba(232,98,42,0.14)' }} />
            <div style={{ position:'absolute', top:18, right:100, width:90, height:90, borderRadius:'50%', background:'rgba(245,158,11,0.11)' }} />
            <div style={{ position:'absolute', bottom:-40, left:140, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
            <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize:'36px 36px' }} />
            <div style={{ position:'absolute', bottom:14, left:24 }}>
              <span style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.14em', textTransform:'uppercase' }}>Imperial Healthcare Systems</span>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '0 28px 28px' }}>

            {/* Avatar row */}
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop: -44, marginBottom: 20 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                {/* Hidden file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display:'none' }}
                  onChange={handleAvatarChange}
                />

                {/* Avatar display */}
                {displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt={name}
                    onError={() => setAvatarUrl(null)}  // broken URL → fall back to initials
                    style={{ width:88, height:88, borderRadius:18, objectFit:'cover', border:'4px solid #fff', boxShadow:'0 6px 24px rgba(0,0,0,0.16)', opacity: avatarUploading ? 0.6 : 1, transition:'opacity 0.2s' }}
                  />
                ) : (
                  <div style={{ width:88, height:88, borderRadius:18, background:'linear-gradient(135deg,#E8622A,#F59E0B)', border:'4px solid #fff', boxShadow:'0 6px 24px rgba(0,0,0,0.16)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'1.75rem', fontWeight:800, opacity: avatarUploading ? 0.6 : 1 }}>
                    {initials}
                  </div>
                )}

                {/* Uploading spinner overlay */}
                {avatarUploading && (
                  <div style={{ position:'absolute', inset:4, borderRadius:14, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:20, height:20, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  </div>
                )}

                {/* Camera button */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  title="Upload new photo"
                  style={{ position:'absolute', bottom:-6, right:-6, width:28, height:28, borderRadius:8, background:'#E8622A', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: avatarUploading ? 'not-allowed' : 'pointer', boxShadow:'0 2px 8px rgba(232,98,42,0.4)', opacity: avatarUploading ? 0.6 : 1 }}>
                  <Camera size={12} color="#fff" />
                </button>
              </div>

              {/* Remove photo link — only visible when a photo is set */}
              {displayAvatar && !avatarUploading && (
                <button
                  onClick={handleAvatarRemove}
                  style={{ position:'absolute', bottom:-24, left:0, fontSize:'0.7rem', color:'#94A3B8', background:'none', border:'none', cursor:'pointer', padding:0, textDecoration:'underline', whiteSpace:'nowrap' }}>
                  Remove photo
                </button>
              )}

              {/* Upload error toast */}
              {avatarErr && (
                <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:8, padding:'8px 16px', fontSize:'0.8rem', fontWeight:600, whiteSpace:'nowrap', zIndex:10, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                  {avatarErr}
                  <button onClick={() => setAvatarErr('')} style={{ marginLeft:10, background:'none', border:'none', cursor:'pointer', color:'#DC2626', fontWeight:700 }}>✕</button>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:4 }}>
                <span style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999, fontSize:'0.75rem', fontWeight:700, background:'#FFF7ED', color:'#EA580C', border:'1px solid #FED7AA' }}>
                  <Shield size={11} /> {roleLabel}
                </span>
                <button onClick={() => setShowEdit(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:10, fontSize:'0.8125rem', fontWeight:600, background:'#F8FAFC', border:'1px solid #E2E8F0', color:'#374151', cursor:'pointer' }}>
                  <Edit size={13} /> Edit Profile
                </button>
              </div>
            </div>

            {/* Name block */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin:0, fontSize:'1.5rem', fontWeight:800, color:'#0F172A', lineHeight:1.2 }}>{name}</h2>
              <p style={{ margin:'6px 0 0', fontSize:'0.875rem', fontWeight:500, color:'#64748B' }}>{designation}&nbsp;&nbsp;·&nbsp;&nbsp;{department}</p>
              <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:16, marginTop:12 }}>
                {[
                  { icon: Mail,     val: email },
                  { icon: MapPin,   val: location },
                  { icon: Briefcase,val: empId || '—' },
                ].map(({ icon: Icon, val }) => (
                  <span key={val} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.8rem', fontWeight:500, color:'#64748B' }}>
                    <Icon size={12} color="#94A3B8" /> {val}
                  </span>
                ))}
              </div>
            </div>

            {/* ── STATS ROW ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, paddingTop:20, borderTop:'1px solid #F1F5F9' }}
              className="grid-cols-2 sm:grid-cols-4">
              {profileStats.map(s => (
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, padding:'16px 12px', textAlign:'center', transition:'transform 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform='')}>
                  <p style={{ margin:0, fontSize:'1.5rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p>
                  <p style={{ margin:'6px 0 0', fontSize:'0.7rem', fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TABS + CONTENT ── */}
        <div style={{ background:'#fff', borderRadius:20, border:'1px solid #E8EDF5', boxShadow:'0 2px 16px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:'1px solid #F1F5F9', overflowX:'auto', scrollbarWidth:'none' }}>
            {([
              { key: 'overview',  label: 'Overview',          icon: User   },
              { key: 'activity',  label: 'Recent Activity',   icon: Clock  },
              { key: 'security',  label: 'Security & Access', icon: Shield },
              { key: 'notices',   label: 'My Notices',        icon: Bell   },
            ] as const).map(tab => {
              const active = activeTab === tab.key
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    position:'relative', display:'flex', alignItems:'center', gap:7,
                    padding:'15px 22px', whiteSpace:'nowrap', flexShrink:0,
                    fontSize:'0.8125rem', fontWeight: active ? 700 : 500,
                    color: active ? '#E8622A' : '#94A3B8',
                    background: active ? '#FFF7F5' : 'transparent',
                    border:'none', cursor:'pointer', transition:'color 0.15s',
                  }}>
                  <tab.icon size={14} />
                  {tab.label}
                  {active && <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'#E8622A', borderRadius:'2px 2px 0 0' }} />}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '28px 28px 32px' }}>

            {/* ─── OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Personal Information */}
                <div>
                  <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Personal Information</p>
                  <div className="space-y-0 rounded-xl overflow-hidden border border-gray-100">
                    {[
                      { label: 'Full Name',    value: name,             icon: User },
                      { label: 'Email',        value: email,            icon: Mail },
                      { label: 'Phone',        value: phone,    icon: Phone },
                      { label: 'Location',     value: location, icon: MapPin },
                    ].map((row, i, arr) => (
                      <div key={row.label} className="flex items-center gap-4 px-4 py-3.5"
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
                  <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Employment Details</p>
                  <div className="space-y-0 rounded-xl overflow-hidden border border-gray-100">
                    {[
                      { label: 'Designation',  value: designation,  icon: Briefcase },
                      { label: 'Department',   value: department,   icon: Building2 },
                      { label: 'Employee ID',  value: empId,        icon: Award },
                      { label: 'Joining Date', value: joinDate,     icon: Calendar },
                      { label: 'Reporting To', value: reportingTo,  icon: User },
                      { label: 'Work Mode',    value: workMode,             icon: Clock },
                      { label: 'Shift',        value: PROFILE.shift,        icon: Clock },
                    ].map((row, i, arr) => (
                      <div key={row.label} className="flex items-center gap-4 px-4 py-3.5"
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
                <div className="lg:col-span-2" style={{ marginTop: 8 }}>
                  <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Payroll & Compliance</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'PAN Number',   value: PROFILE.pan,  icon: FileText, color: '#7C3AED', bg: '#FAF5FF' },
                      { label: 'PF Account',   value: PROFILE.pf,   icon: Shield,   color: '#15803D', bg: '#F0FDF4' },
                      { label: 'Bank Account', value: PROFILE.bank, icon: Building2,color: '#1D4ED8', bg: '#EFF6FF' },
                      { label: 'IFSC Code',    value: PROFILE.ifsc, icon: Key,      color: '#B45309', bg: '#FFFBEB' },
                    ].map(row => (
                      <div key={row.label} className="rounded-xl border border-gray-100"
                        style={{ background: row.bg, padding: '16px 14px' }}>
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
                    {activityLog.length === 0 ? (
                      <p className="text-sm text-gray-400 py-6 text-center">No recent activity to display.</p>
                    ) : activityLog.map((item, i) => (
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
                        icon: Mail, title: 'Email OTP Sign-In',
                        desc: `Verification codes are delivered to ${email}`,
                        status: 'Enabled', statusColor: '#15803D', statusBg: '#DCFCE7',
                        action: null,
                      },
                      {
                        icon: Key, title: 'Passwordless Access',
                        desc: 'Password login is disabled. Every sign-in requires a fresh OTP.',
                        status: 'OTP Only', statusColor: '#1D4ED8', statusBg: '#DBEAFE',
                        action: null,
                      },
                      {
                        icon: Lock, title: 'Two-Factor Authentication',
                        desc: 'Email OTP is required at every login for account verification',
                        status: 'Protected', statusColor: '#B45309', statusBg: '#FEF3C7',
                        action: null,
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

            {/* ─── MY NOTICES ─── */}
            {activeTab === 'notices' && (
              <div className="space-y-6">
                {noticesLoading && <p className="text-sm text-gray-400">Loading…</p>}

                {/* Appreciations */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award size={13} className="text-yellow-500" /> Appreciations ({myAppreciations.length})
                  </p>
                  {myAppreciations.length === 0 && !noticesLoading && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-400">No appreciations yet.</div>
                  )}
                  <div className="space-y-3">
                    {myAppreciations.map((a: any) => (
                      <div key={a.id} className="rounded-xl border border-yellow-100 p-4" style={{ background: '#FFFBEB' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{a.subject}</p>
                            {a.description && <p className="text-xs text-gray-500 mt-1">{a.description}</p>}
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: '#FEF3C7', color: '#92400E' }}>
                            {a.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                          <span>By: <strong className="text-gray-600">{a.given_by ? `${a.given_by.first_name} ${a.given_by.last_name}` : 'HR'}</strong></span>
                          <span>·</span>
                          <span>{new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle size={13} className="text-red-500" /> Warnings ({myWarnings.length})
                  </p>
                  {myWarnings.length === 0 && !noticesLoading && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-400">No warnings on record.</div>
                  )}
                  <div className="space-y-3">
                    {myWarnings.map((w: any) => {
                      const isAcked = w.status === 'acknowledged'
                      return (
                        <div key={w.id} className="rounded-xl border p-4" style={{ borderColor: isAcked ? '#E5E7EB' : '#FCA5A5', background: isAcked ? '#F9FAFB' : '#FFF5F5' }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">{w.subject}</p>
                              {w.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{w.description}</p>}
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0"
                              style={{ background: isAcked ? '#DCFCE7' : '#FEE2E2', color: isAcked ? '#15803D' : '#DC2626' }}>
                              {isAcked ? 'Acknowledged' : 'Pending Acknowledgement'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                            <span>Issued: <strong className="text-gray-600">{w.issued_date}</strong></span>
                            <span>·</span>
                            <span>By: <strong className="text-gray-600">{w.issued_by ? `${w.issued_by.first_name} ${w.issued_by.last_name}` : 'HR'}</strong></span>
                          </div>
                          {w.employee_remarks && (
                            <p className="mt-2 text-xs text-gray-500 italic">Your remarks: "{w.employee_remarks}"</p>
                          )}
                          {!isAcked && (
                            <button
                              onClick={() => { setSelectedNotice(w); setAckRemark('') }}
                              className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold text-white"
                              style={{ background: '#DC2626' }}
                            >
                              Acknowledge Warning
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Acknowledge modal */}
                {selectedNotice && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Acknowledge Warning</h4>
                      <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#6B7280' }}>{selectedNotice.subject}</p>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Your Remarks <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                      </label>
                      <textarea
                        value={ackRemark}
                        onChange={e => setAckRemark(e.target.value)}
                        rows={3}
                        placeholder="Add your remarks or response…"
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button onClick={() => setSelectedNotice(null)} style={{ padding: '8px 18px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Cancel</button>
                        <button onClick={() => handleAcknowledge(selectedNotice)} disabled={acking} style={{ padding: '8px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: acking ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                          {acking ? 'Saving…' : 'Confirm Acknowledgement'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── EDIT PROFILE MODAL ── */}
      {showEdit && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:18, width:520, maxWidth:'95vw', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 24px 18px', borderBottom:'1px solid #F1F5F9' }}>
              <div>
                <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'#0F172A' }}>Edit Profile</h3>
                <p style={{ margin:'3px 0 0', fontSize:'0.8rem', color:'#94A3B8' }}>Update your personal information</p>
              </div>
              <button onClick={() => setShowEdit(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  { label:'First Name', key:'first_name', type:'text', placeholder:'First name' },
                  { label:'Last Name',  key:'last_name',  type:'text', placeholder:'Last name' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:6 }}>{f.label}</label>
                    <input type={f.type} value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.875rem', boxSizing:'border-box', outline:'none' }} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:6 }}>Phone Number</label>
                <input type="tel" value={editForm.personal_phone} onChange={e => setEditForm(p => ({ ...p, personal_phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.875rem', boxSizing:'border-box', outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:6 }}>Work Location</label>
                <input type="text" value={editForm.work_location} onChange={e => setEditForm(p => ({ ...p, work_location: e.target.value }))}
                  placeholder="e.g. Gurugram, Delhi NCR"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.875rem', boxSizing:'border-box', outline:'none' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:6 }}>Date of Birth</label>
                  <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.875rem', boxSizing:'border-box', outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:6 }}>Gender</label>
                  <select value={editForm.gender} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.875rem', boxSizing:'border-box', outline:'none', background:'#fff', cursor:'pointer' }}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {editErr && <p style={{ color:'#DC2626', fontSize:'0.8125rem', margin:0 }}>{editErr}</p>}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:6, borderTop:'1px solid #F1F5F9' }}>
                <button onClick={() => setShowEdit(false)} style={{ padding:'9px 20px', border:'1px solid #E2E8F0', borderRadius:9, background:'#fff', cursor:'pointer', fontSize:'0.875rem', fontWeight:600, color:'#374151' }}>
                  Cancel
                </button>
                <button onClick={handleEditSave} disabled={editSaving}
                  style={{ padding:'9px 20px', background:'#E8622A', color:'#fff', border:'none', borderRadius:9, fontWeight:700, cursor: editSaving ? 'not-allowed' : 'pointer', fontSize:'0.875rem', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
