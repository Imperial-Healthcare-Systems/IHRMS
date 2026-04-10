'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { employeesApi, type Employee as ApiEmployee, type Department } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Users,
  UserPlus,
  Search,
  Download,
  Upload,
  Eye,
  Edit,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Filter,
  X,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type EmployeeStatus = 'Active' | 'Probation' | 'On Leave' | 'Notice Period' | 'Inactive'
type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern'

interface Employee {
  id: string
  empId: string
  name: string
  email: string
  phone: string
  department: string
  designation: string
  location: string
  employmentType: EmploymentType
  status: EmployeeStatus
  hireDate: string
}

// Employee data is fetched live from /api/employees
const STATUSES: ['All Status', ...EmployeeStatus[]] = ['All Status', 'Active', 'Probation', 'On Leave', 'Notice Period', 'Inactive']
const EMP_TYPES: ['All Types', ...EmploymentType[]] = ['All Types', 'Full-time', 'Part-time', 'Contract', 'Intern']

/* ─────────────────────────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<EmployeeStatus, { bg: string; color: string; border: string }> = {
  'Active':        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Probation':     { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'On Leave':      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Notice Period': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Inactive':      { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const EMP_TYPE_CONFIG: Record<EmploymentType, { bg: string; color: string; border: string }> = {
  'Full-time': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Part-time': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'Contract':  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Intern':    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

/* ─────────────────────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const PALETTE = ['#1E3A5F', '#FF6B00', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']
  const idx = (name.charCodeAt(0) + name.charCodeAt(1)) % PALETTE.length
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${PALETTE[idx]}1A`,
        border: `2px solid ${PALETTE[idx]}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        color: PALETTE[idx],
        flexShrink: 0,
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   DOCUMENTS MODAL
───────────────────────────────────────────────────────────── */
type Doc = { id: string; name: string; type: string; url: string; uploaded_at: string }

function DocumentsModal({ empId, empName, onClose }: { empId: string; empName: string; onClose: () => void }) {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/employees/${empId}/documents`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load documents')
      setDocs(json.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [empId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      const res  = await fetch(`/api/employees/${empId}/documents`, { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      await fetch(`/api/employees/${empId}/documents/${docId}`, { method: 'DELETE' })
      setDocs(d => d.filter(x => x.id !== docId))
    } catch {
      setError('Failed to delete document')
    }
  }

  const DOC_ICONS: Record<string, string> = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️' }
  const getIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    return DOC_ICONS[ext] ?? '📎'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>Employee Documents</h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{empName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Upload bar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--color-gray-300)',
            cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', color: 'var(--color-gray-600)',
            background: uploading ? 'var(--color-gray-50)' : '#fff', width: '100%', justifyContent: 'center',
          }}>
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Click to upload a document'}
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 20px' }}>
          {error && (
            <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626' }}>
              {error}
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>Loading…</div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>
              No documents uploaded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--color-gray-100)', borderRadius: 8, background: '#fafafa' }}>
                  <span style={{ fontSize: '1.25rem' }}>{getIcon(doc.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                      {doc.type} · {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-gray-300)', fontSize: '0.75rem', color: 'var(--color-gray-600)', textDecoration: 'none', background: '#fff' }}>
                      <Eye size={11} /> View
                    </a>
                    <button onClick={() => handleDelete(doc.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', fontSize: '0.75rem', color: '#dc2626', background: '#fff', cursor: 'pointer' }}>
                      <X size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   EXIT PROCESS MODAL
───────────────────────────────────────────────────────────── */
const EXIT_TYPES = [
  { value: 'resignation',      label: 'Resignation' },
  { value: 'termination',      label: 'Termination' },
  { value: 'retirement',       label: 'Retirement' },
  { value: 'end_of_contract',  label: 'End of Contract' },
  { value: 'absconding',       label: 'Absconding' },
]

function ExitProcessModal({ empId, empName, onClose, onSuccess }: { empId: string; empName: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    exit_type:        'resignation',
    reason:           '',
    resignation_date: '',
    last_working_date: '',
    notice_period_days: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async () => {
    if (!form.reason.trim() || !form.last_working_date) {
      setError('Reason and last working date are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res  = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id:        empId,
          exit_type:          form.exit_type,
          reason:             form.reason.trim(),
          last_working_date:  form.last_working_date,
          resignation_date:   form.resignation_date || null,
          notice_period_days: form.notice_period_days ? parseInt(form.notice_period_days) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to initiate exit process')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to initiate exit process')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--color-gray-900)', background: '#fff', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #fee2e2', background: '#fff5f5' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#dc2626' }}>Initiate Exit Process</h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{empName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Exit Type *</label>
            <select value={form.exit_type} onChange={e => setForm(f => ({ ...f, exit_type: e.target.value }))} style={inputStyle}>
              {EXIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Resignation Date</label>
              <input type="date" value={form.resignation_date} onChange={e => setForm(f => ({ ...f, resignation_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Working Date *</label>
              <input type="date" value={form.last_working_date} onChange={e => setForm(f => ({ ...f, last_working_date: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notice Period (days)</label>
            <input type="number" min={0} value={form.notice_period_days} onChange={e => setForm(f => ({ ...f, notice_period_days: e.target.value }))} placeholder="e.g. 30" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Reason *</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for exit..." rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Initiating…' : 'Initiate Exit'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MORE MENU
───────────────────────────────────────────────────────────── */
function MoreMenu({ empId, empName, onExitSuccess }: { empId: string; empName: string; onExitSuccess: () => void }) {
  const [open, setOpen]       = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [showExit, setShowExit] = useState(false)
  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => setOpen((v) => !v)}
          title="More options"
        >
          <MoreVertical size={15} />
        </button>
        {open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                zIndex: 20,
                background: '#fff',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                minWidth: 180,
                overflow: 'hidden',
              }}
            >
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: '0.8125rem', color: 'var(--color-gray-700)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                onClick={() => { setOpen(false); setShowDocs(true) }}
              >
                <FileText size={14} style={{ color: 'var(--color-gray-400)' }} />
                Manage Documents
              </button>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: '0.8125rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderTop: '1px solid var(--color-gray-100)' }}
                onClick={() => { setOpen(false); setShowExit(true) }}
              >
                <LogOut size={14} style={{ color: '#dc2626' }} />
                Exit Process
              </button>
            </div>
          </>
        )}
      </div>
      {showDocs && <DocumentsModal empId={empId} empName={empName} onClose={() => setShowDocs(false)} />}
      {showExit && <ExitProcessModal empId={empId} empName={empName} onClose={() => setShowExit(false)} onSuccess={onExitSuccess} />}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   EDIT EMPLOYEE FORM
───────────────────────────────────────────────────────────── */
function EditEmployeeForm({ emp, departments, onClose, onSaved }: {
  emp: ApiEmployee
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    first_name:      emp.first_name,
    last_name:       emp.last_name,
    work_location:   emp.work_location ?? '',
    employment_type: emp.employment_type ?? 'full_time',
    status:          emp.status ?? 'active',
    role:            emp.role ?? 'employee',
    department_id:   emp.department?.id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--color-gray-900)', background: '#fff', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 6 }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First name and last name are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res  = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:      form.first_name.trim(),
          last_name:       form.last_name.trim(),
          full_name:       `${form.first_name.trim()} ${form.last_name.trim()}`,
          work_location:   form.work_location,
          employment_type: form.employment_type,
          status:          form.status,
          role:            form.role,
          department_id:   form.department_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Department</label>
          <select style={inputStyle} value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
            <option value="">— No Department —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Employment Type</label>
            <select style={inputStyle} value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
              {[['full_time','Full-time'],['part_time','Part-time'],['contract','Contract'],['intern','Intern']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {[['active','Active'],['probation','Probation'],['on_leave','On Leave'],['notice_period','Notice Period'],['inactive','Inactive']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Work Location</label>
          <input style={inputStyle} value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} placeholder="e.g. Mumbai" />
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {[['employee','Employee'],['manager','Manager'],['hr','HR'],['admin','Admin']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626' }}>{error}</div>}
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function EmployeesPage() {
  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('All Departments')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter, setTypeFilter]   = useState('All Types')
  const [currentPage, setCurrentPage] = useState(1)

  /* Live data */
  const [employees, setEmployees]     = useState<ApiEmployee[]>([])
  const [totalCount, setTotalCount]   = useState(0)
  const [loading, setLoading]         = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])

  /* View / Edit modals */
  const [viewEmp, setViewEmp]         = useState<ApiEmployee | null>(null)
  const [editEmp, setEditEmp]         = useState<ApiEmployee | null>(null)

  /* Add Employee modal */
  const [showAdd, setShowAdd]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    first_name: '', last_name: '', email: '', phone: '',
    department_id: '', designation_id: '', employment_type: 'full_time',
    hire_date: '', work_location: '', role: 'employee',
  })

  const PAGE_SIZE = 50

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const statusMap: Record<string, string> = {
        'Active': 'active', 'Probation': 'probation',
        'On Leave': 'on_leave', 'Notice Period': 'notice_period', 'Inactive': 'inactive',
      }
      const typeMap: Record<string, string> = {
        'Full-time': 'full_time', 'Part-time': 'part_time', 'Contract': 'contract', 'Intern': 'intern',
      }
      const { data, count } = await employeesApi.list({
        search: search || undefined,
        status: statusFilter !== 'All Status' ? statusMap[statusFilter] : undefined,
        employment_type: typeFilter !== 'All Types' ? typeMap[typeFilter] : undefined,
        department_id: deptFilter !== 'All Departments' ? departments.find(d => d.name === deptFilter)?.id : undefined,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      })
      setEmployees(data)
      setTotalCount(count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, deptFilter, currentPage, departments])

  useEffect(() => { employeesApi.departments().then(r => setDepartments(r.data)).catch(console.error) }, [])
  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  /* Adapt API shape → local shape for existing UI */
  const adapted = useMemo(() => employees.map(e => ({
    id: e.id,
    empId: e.emp_id,
    name: `${e.first_name} ${e.last_name}`,
    email: e.email,
    phone: e.phone ?? '—',
    department: e.department?.name ?? '—',
    designation: e.designation?.title ?? '—',
    location: e.work_location ?? '—',
    employmentType: ({ full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', intern: 'Intern' } as Record<string, string>)[e.employment_type] ?? e.employment_type,
    status: ({ active: 'Active', probation: 'Probation', on_leave: 'On Leave', notice_period: 'Notice Period', inactive: 'Inactive', terminated: 'Inactive' } as Record<string, string>)[e.status] ?? e.status,
    hireDate: e.hire_date ? new Date(e.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
  })), [employees])

  /* Local filter for department name (server already filters the rest) */
  const filtered = useMemo(() => adapted, [adapted])
  const paginated = filtered
  const totalFiltered = totalCount

  const hasActiveFilters = deptFilter !== 'All Departments' || statusFilter !== 'All Status' || typeFilter !== 'All Types' || search

  function clearFilters() {
    setSearch('')
    setDeptFilter('All Departments')
    setStatusFilter('All Status')
    setTypeFilter('All Types')
    setCurrentPage(1)
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await employeesApi.create({
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.phone || undefined,
        department_id: form.department_id, designation_id: form.designation_id || undefined,
        employment_type: form.employment_type, hire_date: form.hire_date,
        work_location: form.work_location || undefined, role: form.role,
      })
      toast.success('Employee added successfully')
      setShowAdd(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', department_id: '', designation_id: '', employment_type: 'full_time', hire_date: '', work_location: '', role: 'employee' })
      fetchEmployees()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add employee')
    } finally {
      setSaving(false)
    }
  }

  const LBL: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
  const FLD: React.CSSProperties = { width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb', padding: '8px 11px', fontSize: '0.875rem', color: '#111827', background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const SEL: React.CSSProperties = { ...FLD, appearance: 'none', cursor: 'pointer' }

  return (
    <>
      <Topbar
        title="Employee Directory"
        subtitle="Manage your workforce"
        notificationCount={5}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <Upload size={14} />
              Bulk Import
            </button>
            <button className="btn btn-outline btn-sm">
              <Download size={14} />
              Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <UserPlus size={14} />
              Add Employee
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── Summary Cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Total Employees', value: String(totalCount || employees.length), color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Active',          value: String(employees.filter(e => e.status === 'active').length),         color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Probation',       value: String(employees.filter(e => e.status === 'probation').length),      color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'On Leave',        value: String(employees.filter(e => e.status === 'on_leave').length),       color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Notice Period',   value: String(employees.filter(e => e.status === 'notice_period').length),  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
          ].map((s) => (
            <div
              key={s.label}
              className="card card-interactive"
              style={{
                padding: '16px 18px',
                borderColor: s.border,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter Bar ── */}
        <div
          className="card"
          style={{ padding: '16px 20px', marginBottom: 16 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <div
              style={{
                flex: '1 1 260px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1.5px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                background: 'var(--color-gray-50)',
              }}
            >
              <Search size={15} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by name, EMP ID, email, or designation..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.875rem',
                  color: 'var(--color-gray-800)',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1) }}
              className="form-select"
              style={{ width: 'auto', minWidth: 170, flex: '0 1 auto', fontSize: '0.875rem' }}
            >
              <option value="All Departments">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              className="form-select"
              style={{ width: 'auto', minWidth: 150, flex: '0 1 auto', fontSize: '0.875rem' }}
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>

            {/* Employment Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1) }}
              className="form-select"
              style={{ width: 'auto', minWidth: 140, flex: '0 1 auto', fontSize: '0.875rem' }}
            >
              {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: '#ef4444' }}>
                <X size={14} />
                Clear
              </button>
            )}

            {/* Results count */}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.8125rem',
                color: 'var(--color-gray-500)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              {paginated.length} of {totalFiltered} results
            </span>
          </div>
        </div>

        {/* ── Employee Table ── */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Employee</th>
                <th style={{ minWidth: 200 }}>Department &amp; Designation</th>
                <th style={{ minWidth: 220 }}>Contact</th>
                <th style={{ minWidth: 130 }}>Employment Type</th>
                <th style={{ minWidth: 130 }}>Status</th>
                <th style={{ minWidth: 120 }}>Hire Date</th>
                <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Users size={36} style={{ color: 'var(--color-gray-300)' }} />
                      <p style={{ fontWeight: 600, color: 'var(--color-gray-500)', fontSize: '0.9375rem' }}>
                        No employees found
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>
                        Try adjusting your search or filter criteria
                      </p>
                      <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => {
                  const sc = STATUS_CONFIG[emp.status as EmployeeStatus] ?? STATUS_CONFIG['Inactive']
                  const tc = EMP_TYPE_CONFIG[emp.employmentType as EmploymentType] ?? EMP_TYPE_CONFIG['Full-time']
                  return (
                    <tr key={emp.id}>
                      {/* Employee */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <Avatar name={emp.name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontWeight: 600,
                                color: 'var(--color-gray-900)',
                                fontSize: '0.875rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {emp.name}
                            </p>
                            <p
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-imperial-blue)',
                                fontFamily: 'monospace',
                                marginTop: 2,
                                fontWeight: 500,
                              }}
                            >
                              {emp.empId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-800)' }}>
                          {emp.department}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 2 }}>
                          {emp.designation}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                          📍 {emp.location}
                        </p>
                      </td>

                      {/* Contact */}
                      <td>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-700)' }}>
                          {emp.email}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 3 }}>
                          {emp.phone}
                        </p>
                      </td>

                      {/* Employment Type */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: tc.bg,
                            color: tc.color,
                            border: `1px solid ${tc.border}`,
                          }}
                        >
                          {emp.employmentType}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="badge badge-dot"
                          style={{
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                          }}
                        >
                          {emp.status}
                        </span>
                      </td>

                      {/* Hire Date */}
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                        {emp.hireDate}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title={`View ${emp.name}`}
                            onClick={() => setViewEmp(employees.find(e => e.id === emp.id) ?? null)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title={`Edit ${emp.name}`}
                            onClick={() => setEditEmp(employees.find(e => e.id === emp.id) ?? null)}
                          >
                            <Edit size={15} />
                          </button>
                          <MoreMenu empId={emp.id} empName={emp.name} onExitSuccess={fetchEmployees} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
            {loading ? 'Loading…' : <>
              Showing{' '}
              <strong style={{ color: 'var(--color-gray-800)' }}>
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalFiltered)}–{Math.min(currentPage * PAGE_SIZE, totalFiltered)}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--color-gray-800)' }}>{totalFiltered}</strong>{' '}
              employees
            </>}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 12px' }}
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            {/* Page numbers */}
            {[1, 2, 3, '...', 17].map((pg, idx) => (
              typeof pg === 'number' ? (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(pg)}
                  style={{
                    minWidth: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    border: currentPage === pg ? 'none' : '1.5px solid var(--color-gray-200)',
                    background: currentPage === pg
                      ? 'linear-gradient(135deg,#1E3A5F 0%,#2D5391 100%)'
                      : 'transparent',
                    color: currentPage === pg ? '#fff' : 'var(--color-gray-600)',
                    fontWeight: currentPage === pg ? 700 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {pg}
                </button>
              ) : (
                <span
                  key={idx}
                  style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', padding: '0 4px' }}
                >
                  {pg}
                </span>
              )
            ))}

            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage * PAGE_SIZE >= totalFiltered}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={{ padding: '6px 12px' }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* ── Add Employee Modal ── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 560, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 22px 16px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add New Employee</h2>
                <p style={{ fontSize: '0.775rem', color: '#9ca3af', margin: '3px 0 0' }}>Fill in the details to onboard a new team member</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost btn-sm btn-icon"><X size={15} /></button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LBL}>First Name *</label>
                    <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} style={FLD} placeholder="e.g. Rahul" />
                  </div>
                  <div>
                    <label style={LBL}>Last Name *</label>
                    <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} style={FLD} placeholder="e.g. Sharma" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LBL}>Work Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={FLD} placeholder="rahul@company.in" />
                  </div>
                  <div>
                    <label style={LBL}>Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={FLD} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LBL}>Department *</label>
                    <div style={{ position: 'relative' }}>
                      <select required value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={SEL}>
                        <option value="">Select department…</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div>
                    <label style={LBL}>Employment Type</label>
                    <div style={{ position: 'relative' }}>
                      <select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} style={SEL}>
                        <option value="full_time">Full-time</option>
                        <option value="part_time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="intern">Intern</option>
                      </select>
                      <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LBL}>Hire Date *</label>
                    <input required type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} style={FLD} />
                  </div>
                  <div>
                    <label style={LBL}>Work Location</label>
                    <input value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} style={FLD} placeholder="e.g. Bengaluru, Remote" />
                  </div>
                </div>
                <div>
                  <label style={LBL}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={SEL}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr_admin">HR Admin</option>
                      <option value="operations_head">Operations Head</option>
                    </select>
                    <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 22px 20px', borderTop: '1.5px solid #f1f5f9', display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 2 }}>
                  {saving ? 'Adding…' : <><UserPlus size={14} /> Add Employee</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Employee Modal ── */}
      {viewEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 540, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>Employee Details</h3>
              <button onClick={() => setViewEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--color-gray-50)', borderRadius: 12 }}>
                <Avatar name={`${viewEmp.first_name} ${viewEmp.last_name}`} size={52} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--color-gray-900)' }}>{viewEmp.first_name} {viewEmp.last_name}</p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{viewEmp.designation?.title ?? '—'} · {viewEmp.emp_id}</p>
                </div>
              </div>
              {/* Fields */}
              {([
                ['Email',           viewEmp.email],
                ['Phone',           viewEmp.phone || '—'],
                ['Department',      viewEmp.department?.name ?? '—'],
                ['Designation',     viewEmp.designation?.title ?? '—'],
                ['Employment Type', viewEmp.employment_type],
                ['Work Location',   viewEmp.work_location || '—'],
                ['Status',          viewEmp.status],
                ['Joining Date',    viewEmp.hire_date || '—'],
                ['Role',            viewEmp.role],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-gray-50)' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-900)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setViewEmp(null); setEditEmp(viewEmp) }} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Edit size={13} /> Edit Employee
              </button>
              <button onClick={() => setViewEmp(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Employee Modal ── */}
      {editEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: 560, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-gray-100)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>Edit Employee</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{editEmp.first_name} {editEmp.last_name} · {editEmp.emp_id}</p>
              </div>
              <button onClick={() => setEditEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
            </div>
            <EditEmployeeForm emp={editEmp} departments={departments} onClose={() => setEditEmp(null)} onSaved={() => { setEditEmp(null); fetchEmployees() }} />
          </div>
        </div>
      )}
    </>
  )
}
