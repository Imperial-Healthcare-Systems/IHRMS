'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  GraduationCap, Plus, X, Loader2, Users, Calendar,
  CheckCircle, Clock, BookOpen, Award,
} from 'lucide-react'

interface Enrollment {
  id: string
  employee_id: string
  status: string
  completed_at: string | null
}

interface Course {
  id: string
  title: string
  description: string | null
  trainer: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  enrollments: Enrollment[]
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

const STATUS_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  upcoming:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Upcoming' },
  ongoing:    { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Ongoing' },
  completed:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Completed' },
  cancelled:  { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: 'Cancelled' },
}

const ADMIN_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function NewCourseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [trainer, setTrainer]   = useState('')
  const [startDate, setStart]   = useState('')
  const [endDate, setEnd]       = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc || null, trainer: trainer || null, start_date: startDate || null, end_date: endDate || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Course created successfully')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', width: 520, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={16} color="#E8622A" />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>Create Training Course</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL_STYLE}>Course Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fire Safety Training" style={FIELD_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Trainer / Facilitator</label>
            <input value={trainer} onChange={e => setTrainer(e.target.value)} placeholder="Internal or external trainer name" style={FIELD_STYLE} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStart(e.target.value)} style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEnd(e.target.value)} style={FIELD_STYLE} />
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span></label>
            <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will employees learn?" style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.55 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Creating…' : 'Create Course'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TrainingPage() {
  const { data: session } = useSession()
  const isAdmin   = ADMIN_ROLES.includes((session?.user as any)?.role ?? '')
  const myId      = (session?.user as any)?.id as string | undefined

  const [courses, setCourses]     = useState<Course[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter]       = useState('all')
  const [enrolling, setEnrolling] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res  = await fetch(`/api/training${params}`)
      const json = await res.json()
      setCourses(json.data ?? [])
    } catch {
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const enroll = async (courseId: string) => {
    setEnrolling(courseId)
    try {
      const res = await fetch('/api/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll', course_id: courseId, employee_id: myId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Enrolled successfully')
      fetchCourses()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Enrolment failed')
    } finally {
      setEnrolling(null)
    }
  }

  const markComplete = async (courseId: string) => {
    setEnrolling(courseId)
    try {
      const res = await fetch('/api/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', course_id: courseId, employee_id: myId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Marked as completed')
      fetchCourses()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark complete')
    } finally {
      setEnrolling(null)
    }
  }

  const totalCourses    = courses.length
  const upcoming        = courses.filter(c => c.status === 'upcoming').length
  const myEnrolled      = courses.filter(c => c.enrollments?.some(e => e.employee_id === myId)).length
  const myCompleted     = courses.filter(c => c.enrollments?.some(e => e.employee_id === myId && e.status === 'completed')).length

  const FILTERS = ['all', 'upcoming', 'ongoing', 'completed']

  return (
    <>
      {showModal && <NewCourseModal onClose={() => setShowModal(false)} onSuccess={fetchCourses} />}

      <Topbar title="Training & Development" subtitle="Courses, certifications, and L&D programmes">
        {isAdmin && (
          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Course
          </button>
        )}
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Courses', value: totalCourses, color: '#E8622A', bg: '#fff7ed', border: '#fed7aa', icon: BookOpen },
            { label: 'Upcoming',      value: upcoming,     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: Calendar },
            { label: 'My Enrolments', value: myEnrolled,   color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Users },
            { label: 'Completed',     value: myCompleted,  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: Award },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, border: `1.5px solid ${border}`, background: bg }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '0.65rem', color, opacity: 0.8, margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {FILTERS.map(f => {
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: active ? '#1E3A5F' : '#fff', color: active ? '#fff' : '#6b7280', border: active ? '1.5px solid #1E3A5F' : '1.5px solid #e5e7eb' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Course cards */}
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>Loading courses…</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <GraduationCap size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px', fontSize: '0.875rem' }}>No courses found</p>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>
              {isAdmin ? 'Create the first training course.' : 'No training courses are available yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {courses.map(course => {
              const cfg         = STATUS_CFG[course.status] ?? STATUS_CFG.upcoming
              const myEnrollment = course.enrollments?.find(e => e.employee_id === myId)
              const enrollCount  = course.enrollments?.length ?? 0

              return (
                <div key={course.id} className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                        {cfg.label}
                      </span>
                      <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', margin: '8px 0 0', lineHeight: 1.3 }}>{course.title}</p>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,121,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <GraduationCap size={16} color="#F47920" />
                    </div>
                  </div>

                  {course.description && (
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
                      {course.description.length > 100 ? course.description.slice(0, 100) + '…' : course.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {course.trainer && (
                      <p style={{ fontSize: '0.75rem', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <GraduationCap size={12} color="#9ca3af" /> {course.trainer}
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} color="#9ca3af" />
                      {fmtDate(course.start_date)} — {fmtDate(course.end_date)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={12} color="#9ca3af" /> {enrollCount} enrolled
                    </p>
                  </div>

                  {/* CTA */}
                  <div style={{ marginTop: 4 }}>
                    {!myEnrollment ? (
                      <button
                        onClick={() => enroll(course.id)}
                        disabled={enrolling === course.id || course.status === 'completed' || course.status === 'cancelled'}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (course.status === 'completed' || course.status === 'cancelled') ? 0.5 : 1 }}>
                        {enrolling === course.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                        Enrol Now
                      </button>
                    ) : myEnrollment.status === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: '#f0fdf4', borderRadius: 8, color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Completed {fmtDate(myEnrollment.completed_at)}
                      </div>
                    ) : (
                      <button
                        onClick={() => markComplete(course.id)}
                        disabled={enrolling === course.id}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {enrolling === course.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                        Mark Complete
                      </button>
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
