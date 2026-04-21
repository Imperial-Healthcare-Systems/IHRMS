'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import { employeesApi, payrollApi, type Employee as ApiEmployee, type Department } from '@/lib/api-client'
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
  UserCheck,
  CheckCircle2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type EmployeeStatus = 'Active' | 'Probation' | 'On Leave' | 'Notice Period' | 'Inactive'
type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern'

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
  onSaved: (updated: ApiEmployee) => void
}) {
  const [tab, setTab] = useState<'details' | 'salary'>('details')

  /* ── Details state ── */
  const [form, setForm] = useState({
    first_name:      emp.first_name,
    last_name:       emp.last_name,
    work_location:   emp.work_location ?? '',
    work_type:       (emp as any).work_type ?? 'office',
    employment_type: emp.employment_type ?? 'full_time',
    status:          emp.status ?? 'active',
    role:            emp.role ?? 'employee',
    department_id:   emp.department?.id ?? '',
    designation_id:  (emp as any).designation?.id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [designations, setDesignations] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    fetch('/api/designations')
      .then(r => r.json())
      .then(j => setDesignations((j.data ?? []).filter((d: any) => d.is_active !== false)))
      .catch(() => {})
  }, [])

  /* ── Salary state ── */
  const BLANK_SAL = { ctc_annual: '', basic: '', hra: '', conveyance: '', medical: '', special: '', lta: '', pf: '', esic: '', metro: true, effective_from: new Date().toISOString().slice(0, 10) }
  const [sal, setSal]             = useState(BLANK_SAL)
  const [salLoading, setSalLoading] = useState(false)
  const [salError, setSalError]   = useState('')
  const [hasSal, setHasSal]       = useState(false)   // true = existing structure found

  useEffect(() => {
    if (tab !== 'salary') return
    setSalLoading(true); setSalError('')
    // Direct fetch so we can see the real error text
    fetch(`/api/payroll/salary-structures?employee_id=${emp.id}`)
      .then(async res => {
        const json = await res.json()
        if (!res.ok) {
          // Show real server error but still allow form entry
          setSalError(`Server: ${json?.error ?? `HTTP ${res.status}`}`)
          return
        }
        const rows = (json.data ?? []) as Record<string, unknown>[]
        if (rows.length > 0) {
          const r = rows[0]
          setHasSal(true)
          setSal({
            ctc_annual:    String(r.ctc_annual            ?? ''),
            basic:         String(r.basic_monthly         ?? ''),
            hra:           String(r.hra_monthly           ?? ''),
            conveyance:    String(r.conveyance_allowance  ?? ''),
            medical:       String(r.medical_allowance     ?? ''),
            special:       String(r.special_allowance     ?? ''),
            lta:           String(r.lta_monthly           ?? ''),
            pf:            String(r.employer_pf           ?? ''),
            esic:          String(r.employer_esic         ?? ''),
            metro:         true,
            effective_from: new Date().toISOString().slice(0, 10),
          })
        }
      })
      .catch(err => setSalError(`Network error: ${err?.message ?? err}`))
      .finally(() => setSalLoading(false))
  }, [tab, emp.id])

  function recalcSal(ctcAnnual: string, metro: boolean) {
    const ctc   = parseFloat(ctcAnnual) || 0
    if (ctc === 0) return
    const basic   = Math.round(ctc * 0.40 / 12)
    const hra     = Math.round(basic * (metro ? 0.50 : 0.40))
    const convey  = 1600
    const medical = 1250
    const pfBase  = Math.min(basic, 15000)
    const pf      = Math.round(pfBase * 0.12)
    const gross   = Math.round(ctc / 12)
    const esic    = gross <= 21000 ? Math.round(gross * 0.0325) : 0
    const special = Math.max(0, gross - basic - hra - convey - medical - pf - esic)
    setSal(s => ({ ...s, basic: String(basic), hra: String(hra), conveyance: String(convey), medical: String(medical), special: String(special), pf: String(pf), esic: String(esic) }))
  }

  const IS: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--color-gray-900)', background: '#fff', outline: 'none', boxSizing: 'border-box' }
  const LS: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 6 }
  const LBs: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
  const FLs: React.CSSProperties = { width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb', padding: '8px 11px', fontSize: '0.875rem', color: '#111827', background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }

  const handleSaveDetails = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('First name and last name are required.'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:      form.first_name.trim(),
          last_name:       form.last_name.trim(),
          work_location:   form.work_location,
          work_type:       form.work_type,
          employment_type: form.employment_type,
          status:          form.status,
          role:            form.role,
          department_id:   form.department_id || null,
          designation_id:  form.designation_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      onSaved(json.data as ApiEmployee)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleSaveSalary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true); setSalError('')
    try {
      await payrollApi.createSalaryStructure({
        employee_id:       emp.id,
        effective_from:    sal.effective_from,
        ctc_annual:        parseFloat(sal.ctc_annual)  || 0,
        basic:             parseFloat(sal.basic)        || 0,
        hra:               parseFloat(sal.hra)          || 0,
        conveyance:        parseFloat(sal.conveyance)   || 0,
        medical_allowance: parseFloat(sal.medical)      || 0,
        special_allowance: parseFloat(sal.special)      || 0,
        lta:               parseFloat(sal.lta)          || 0,
        pf_employer:       parseFloat(sal.pf)           || 0,
        esic_employer:     parseFloat(sal.esic)         || 0,
        remarks:           hasSal ? 'Salary amended' : 'Salary set up',
      })
      toast.success(
        hasSal ? 'Salary updated!' : 'Salary structure saved!',
        { duration: 5000 }
      )
      onSaved(emp)
      // Show a follow-up toast prompting payroll
      setTimeout(() => {
        toast(
          (t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Ready to generate payroll?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { toast.dismiss(t.id); window.location.href = '/payroll' }}
                  style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Go to Payroll →
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Later
                </button>
              </div>
            </div>
          ),
          { duration: 8000, icon: '💰' }
        )
      }, 800)
    } catch (err: unknown) {
      setSalError(err instanceof Error ? err.message : 'Failed to save salary')
    } finally { setSaving(false) }
  }

  return (
    <>
      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        {([['details', 'Employee Details'], ['salary', 'Salary & Components']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '11px 22px', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
            color: tab === key ? '#E8622A' : '#6b7280',
            borderBottom: tab === key ? '2px solid #E8622A' : '2px solid transparent',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Employee Details ── */}
      {tab === 'details' && (
        <>
          <div style={{ overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }} className="sm:!px-6">
            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626', flexShrink: 0 }}>{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <div>
                <label style={LS}>First Name *</label>
                <input style={IS} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label style={LS}>Last Name *</label>
                <input style={IS} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <div>
                <label style={LS}>Department</label>
                <select style={IS} value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                  <option value="">— No Department —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={LS}>Designation</label>
                <select style={IS} value={form.designation_id} onChange={e => setForm(f => ({ ...f, designation_id: e.target.value }))}>
                  <option value="">— No Designation —</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <div>
                <label style={LS}>Employment Type</label>
                <select style={IS} value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
                  {[['full_time','Full-time'],['part_time','Part-time'],['contract','Contract'],['intern','Intern']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={LS}>Status</label>
                <select style={IS} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {[['active','Active'],['probation','Probation'],['on_leave','On Leave'],['notice_period','Notice Period'],['inactive','Inactive']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={LS}>Work Location</label>
              <input style={IS} value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} placeholder="e.g. Mumbai" />
            </div>
            <div>
              <label style={LS}>Work Type</label>
              <select style={IS} value={form.work_type} onChange={e => setForm(f => ({ ...f, work_type: e.target.value }))}>
                <option value="office">Work From Office</option>
                <option value="home">Work From Home</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label style={LS}>Role</label>
              <select style={IS} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {[['employee','Employee'],['manager','Manager'],['hr','HR'],['admin','Admin']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleSaveDetails} disabled={saving} className="btn btn-primary btn-sm" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </>
      )}

      {/* ── TAB: Salary & Components ── */}
      {tab === 'salary' && (
        salLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Loading salary data…</div>
        ) : (
          <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Status banner */}
              {hasSal ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>
                  <span style={{ fontSize: '1rem' }}>ℹ️</span>
                  Existing salary structure loaded. Changes will create a new revision effective from the date below.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  No salary structure found. Set one up below.
                </div>
              )}

              {/* CTC + Metro + Effective From */}
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={LBs}>Annual CTC (₹) *</label>
                  <input required type="number" min="0" step="1000" value={sal.ctc_annual} placeholder="e.g. 600000"
                    onChange={e => { setSal(s => ({ ...s, ctc_annual: e.target.value })); recalcSal(e.target.value, sal.metro) }}
                    style={{ ...FLs, fontWeight: 700, fontSize: '1rem', color: '#c2410c' }} />
                </div>
                <div style={{ minWidth: 160 }}>
                  <label style={LBs}>Effective From *</label>
                  <input required type="date" value={sal.effective_from} onChange={e => setSal(s => ({ ...s, effective_from: e.target.value }))} style={FLs} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 2 }}>
                  <input type="checkbox" id="edit-metro" checked={sal.metro} style={{ width: 15, height: 15, cursor: 'pointer' }}
                    onChange={e => { setSal(s => ({ ...s, metro: e.target.checked })); recalcSal(sal.ctc_annual, e.target.checked) }} />
                  <label htmlFor="edit-metro" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>Metro City (50% HRA)</label>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Earnings (Monthly ₹)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 11 }}>
                  {([['basic','Basic Salary *', true],['hra','HRA', false],['conveyance','Conveyance', false],['medical','Medical Allow.', false],['special','Special Allow.', false],['lta','LTA (monthly)', false]] as [string, string, boolean][]).map(([k, lbl, req]) => (
                    <div key={k}>
                      <label style={LBs}>{lbl}</label>
                      <input required={req} type="number" min="0" step="1" placeholder="0"
                        value={(sal as unknown as Record<string, string>)[k]}
                        onChange={e => setSal(s => ({ ...s, [k]: e.target.value }))}
                        style={FLs} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Employer contributions */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Employer Contributions (Monthly ₹)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                  <div>
                    <label style={LBs}>Employer PF <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(12% of Basic, max ₹1,800)</span></label>
                    <input type="number" min="0" step="1" placeholder="0" value={sal.pf} onChange={e => setSal(s => ({ ...s, pf: e.target.value }))} style={FLs} />
                  </div>
                  <div>
                    <label style={LBs}>Employer ESIC <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(3.25%, if gross ≤ ₹21,000)</span></label>
                    <input type="number" min="0" step="1" placeholder="0" value={sal.esic} onChange={e => setSal(s => ({ ...s, esic: e.target.value }))} style={FLs} />
                  </div>
                </div>
              </div>

              {/* Live summary */}
              {sal.ctc_annual && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Salary Summary</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                    {[
                      { label: 'Annual CTC',    val: `₹${(parseFloat(sal.ctc_annual)||0).toLocaleString('en-IN')}` },
                      { label: 'Monthly Gross', val: `₹${Math.round((parseFloat(sal.ctc_annual)||0)/12).toLocaleString('en-IN')}` },
                      { label: 'Basic / mo',    val: `₹${(parseFloat(sal.basic)||0).toLocaleString('en-IN')}` },
                      { label: 'Take-home est.', val: `₹${Math.max(0, Math.round((parseFloat(sal.ctc_annual)||0)/12) - (parseFloat(sal.pf)||0) - (parseFloat(sal.esic)||0)).toLocaleString('en-IN')}` },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>{item.val}</div>
                        <div style={{ fontSize: '0.68rem', color: '#4ade80' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626' }}>
                  <strong>Could not load existing salary data.</strong> You can still enter salary details below and save them.<br />
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{salError}</span>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: saving ? '#9ca3af' : '#16a34a', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : hasSal ? '✓ Amend Salary' : '✓ Save Salary'}
              </button>
            </div>
          </form>
        )
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   ASSIGN MANAGER MODAL
───────────────────────────────────────────────────────────── */
function AssignManagerModal({
  emp,
  onClose,
  onSaved,
}: {
  emp: ApiEmployee
  onClose: () => void
  onSaved: () => void
}) {
  const [search, setSearch]         = useState('')
  const [candidates, setCandidates] = useState<ApiEmployee[]>([])
  const [fetching, setFetching]     = useState(false)
  const [selected, setSelected]     = useState<ApiEmployee | null>(
    emp.reporting_manager
      ? ({ id: (emp.reporting_manager as Record<string,string>).id, first_name: (emp.reporting_manager as Record<string,string>).first_name, last_name: (emp.reporting_manager as Record<string,string>).last_name } as ApiEmployee)
      : null
  )
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      setFetching(true)
      try {
        const params = new URLSearchParams({ limit: '60', status: 'active' })
        if (search) params.set('search', search)
        const res = await fetch(`/api/employees?${params}`)
        const j   = await res.json()
        setCandidates((j.data ?? []).filter((e: ApiEmployee) => e.id !== emp.id))
      } catch { setCandidates([]) }
      finally { setFetching(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [search, emp.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporting_manager_id: selected?.id ?? null }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Update failed')
      }
      toast.success(`Manager ${selected ? 'assigned' : 'removed'} for ${emp.first_name} ${emp.last_name}`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign manager')
    } finally { setSaving(false) }
  }

  const currentName = emp.reporting_manager
    ? `${(emp.reporting_manager as Record<string,string>).first_name} ${(emp.reporting_manager as Record<string,string>).last_name}`
    : 'None'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>Assign Reporting Manager</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 2 }}>
              {emp.first_name} {emp.last_name} · Current: <strong>{currentName}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
            <input
              autoFocus
              placeholder="Search by name or employee ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Unassign option */}
          <button
            onClick={() => setSelected(null)}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${selected === null ? '#1E3A5F' : 'var(--color-gray-200)'}`,
              background: selected === null ? '#eff6ff' : '#fff',
              color: selected === null ? '#1E3A5F' : 'var(--color-gray-500)',
              fontSize: '0.8125rem', fontWeight: selected === null ? 600 : 400, marginBottom: 4,
            }}
          >
            — No manager (unassign)
          </button>

          {fetching ? (
            <p style={{ textAlign: 'center', padding: 16, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>Loading…</p>
          ) : candidates.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 16, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>No employees found</p>
          ) : candidates.map(c => {
            const isSel = selected?.id === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${isSel ? '#1E3A5F' : 'transparent'}`,
                  background: isSel ? '#eff6ff' : 'var(--color-gray-50)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <Avatar name={`${c.first_name} ${c.last_name}`} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: isSel ? '#1E3A5F' : 'var(--color-gray-800)', margin: 0 }}>
                    {c.first_name} {c.last_name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', margin: 0 }}>
                    {c.emp_id} · {c.designation?.title ?? c.department?.name ?? 'Employee'}
                  </p>
                </div>
                {isSel && <CheckCircle2 size={16} style={{ color: '#1E3A5F', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-gray-200)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
          >
            <UserCheck size={14} />
            {saving ? 'Saving…' : 'Assign Manager'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function EmployeesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = ((session?.user as Record<string, unknown>)?.role as string) ?? 'employee'
  const canAssignManager = ['super_admin', 'hr_admin', 'admin', 'hr'].includes(userRole)

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
  const [assignMgrEmp, setAssignMgrEmp] = useState<ApiEmployee | null>(null)

  /* Add Employee modal — 2-step wizard */
  const [showAdd, setShowAdd]         = useState(false)
  const [addStep, setAddStep]         = useState<1 | 2 | 3>(1)
  const [newEmpId, setNewEmpId]       = useState<string>('')
  const [newEmpName, setNewEmpName]   = useState<string>('')
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    first_name: '', last_name: '', email: '', phone: '',
    department_id: '', designation_id: '', employment_type: 'full_time',
    hire_date: '', work_location: '', work_type: 'office', role: 'employee',
  })

  const BLANK_SALARY = { ctc_annual: '', basic: '', hra: '', conveyance: '', medical: '', special: '', lta: '', pf: '', esic: '', metro: true, effective_from: new Date().toISOString().slice(0, 10) }
  const [salary, setSalary]           = useState(BLANK_SALARY)

  function closAddModal() {
    setShowAdd(false); setAddStep(1); setNewEmpId(''); setNewEmpName('')
    setForm({ first_name: '', last_name: '', email: '', phone: '', department_id: '', designation_id: '', employment_type: 'full_time', hire_date: '', work_location: '', work_type: 'office', role: 'employee' })
    setSalary(BLANK_SALARY)
  }

  /* Auto-calculate salary fields from CTC */
  function recalcSalary(ctcAnnual: string, metroCity: boolean) {
    const ctc = parseFloat(ctcAnnual) || 0
    if (ctc === 0) return
    const basic     = Math.round(ctc * 0.40 / 12)
    const hra       = Math.round(basic * (metroCity ? 0.50 : 0.40))
    const convey    = 1600
    const medical   = 1250
    const pfBase    = Math.min(basic, 15000)
    const pf        = Math.round(pfBase * 0.12)
    const grossEst  = Math.round(ctc / 12)
    const esic      = grossEst <= 21000 ? Math.round(grossEst * 0.0325) : 0
    const special   = Math.max(0, grossEst - basic - hra - convey - medical - pf - esic)
    setSalary(s => ({
      ...s,
      basic: String(basic), hra: String(hra),
      conveyance: String(convey), medical: String(medical),
      special: String(special), pf: String(pf), esic: String(esic),
    }))
  }

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

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await employeesApi.create({
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.phone || undefined,
        department_id: form.department_id, designation_id: form.designation_id || undefined,
        employment_type: form.employment_type, hire_date: form.hire_date,
        work_location: form.work_location || undefined, work_type: form.work_type || undefined, role: form.role,
      })
      const empId   = (res as { data?: { id?: string } }).data?.id ?? ''
      const empName = `${form.first_name} ${form.last_name}`.trim()
      setNewEmpId(empId)
      setNewEmpName(empName)
      toast.success('Employee added! Now set up salary.')
      fetchEmployees()
      setAddStep(2)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add employee')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSalary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newEmpId) { closAddModal(); return }
    setSaving(true)
    try {
      await payrollApi.createSalaryStructure({
        employee_id:       newEmpId,
        effective_from:    salary.effective_from,
        ctc_annual:        parseFloat(salary.ctc_annual) || 0,
        basic:             parseFloat(salary.basic)      || 0,
        hra:               parseFloat(salary.hra)        || 0,
        conveyance:        parseFloat(salary.conveyance) || 0,
        medical_allowance: parseFloat(salary.medical)    || 0,
        special_allowance: parseFloat(salary.special)    || 0,
        lta:               parseFloat(salary.lta)        || 0,
        pf_employer:       parseFloat(salary.pf)         || 0,
        esic_employer:     parseFloat(salary.esic)       || 0,
        remarks:           'Set during onboarding',
      })
      setAddStep(3)   // go to success screen
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save salary')
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

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">

        {/* ── Summary Cards ── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          style={{ gap: 12, marginBottom: 24 }}
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
                          {canAssignManager && (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title={`Assign manager to ${emp.name}`}
                              onClick={() => setAssignMgrEmp(employees.find(e => e.id === emp.id) ?? null)}
                            >
                              <UserCheck size={15} />
                            </button>
                          )}
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
            {(() => {
              const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
              const pages: (number | '...')[] = []
              if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) pages.push(i)
              } else {
                pages.push(1)
                if (currentPage > 3) pages.push('...')
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
                if (currentPage < totalPages - 2) pages.push('...')
                pages.push(totalPages)
              }
              return pages.map((pg, idx) =>
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
                  <span key={idx} style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', padding: '0 4px' }}>…</span>
                )
              )
            })()}

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

      {/* ── Add Employee Modal (2-step wizard) ── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', width: addStep === 2 ? 680 : addStep === 3 ? 520 : 560, maxWidth: '95vw', maxHeight: '92vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', transition: 'width 0.25s ease' }}>

            {/* Header — hidden on success screen */}
            {addStep !== 3 && (
              <div style={{ padding: '18px 22px 14px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {addStep === 1 ? 'Add New Employee' : 'Set Up Salary Structure'}
                  </h2>
                  <p style={{ fontSize: '0.775rem', color: '#9ca3af', margin: '3px 0 0' }}>
                    {addStep === 1 ? 'Fill in the details to onboard a new team member' : `Setting up salary for ${newEmpName}`}
                  </p>
                </div>
                <button onClick={closAddModal} className="btn btn-ghost btn-sm btn-icon"><X size={15} /></button>
              </div>
            )}

            {/* Step indicator — hidden on success screen */}
            {addStep !== 3 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '12px 22px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                {[{ n: 1, label: 'Basic Info' }, { n: 2, label: 'Salary Setup' }, { n: 3, label: 'Done' }].map((s, i) => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 0, flex: i < 2 ? 0 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        background: addStep > s.n ? '#16a34a' : addStep === s.n ? '#E8622A' : '#e5e7eb',
                        color: addStep >= s.n ? '#fff' : '#9ca3af',
                        flexShrink: 0,
                      }}>
                        {addStep > s.n ? '✓' : s.n}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: addStep === s.n ? '#E8622A' : addStep > s.n ? '#16a34a' : '#9ca3af', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 1.5, background: addStep > s.n ? '#16a34a' : '#e5e7eb', margin: '0 12px', minWidth: 32 }} />}
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 1: Basic Info ── */}
            {addStep === 1 && (
              <form onSubmit={handleAddEmployee} style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }} className="sm:!px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
                    <div>
                      <label style={LBL}>First Name *</label>
                      <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} style={FLD} placeholder="e.g. Rahul" />
                    </div>
                    <div>
                      <label style={LBL}>Last Name *</label>
                      <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} style={FLD} placeholder="e.g. Sharma" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
                    <div>
                      <label style={LBL}>Work Email *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={FLD} placeholder="rahul@company.in" />
                    </div>
                    <div>
                      <label style={LBL}>Phone</label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={FLD} placeholder="+91 98765 43210" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
                    <div>
                      <label style={LBL}>Hire Date *</label>
                      <input required type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} style={FLD} />
                    </div>
                    <div>
                      <label style={LBL}>Work Location</label>
                      <input value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} style={FLD} placeholder="e.g. Bengaluru, Remote" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={LBL}>Work Type</label>
                      <select value={form.work_type} onChange={e => setForm(f => ({ ...f, work_type: e.target.value }))} style={FLD}>
                        <option value="office">Work From Office</option>
                        <option value="home">Work From Home</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
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
                </div>
                <div style={{ padding: '14px 22px 20px', borderTop: '1.5px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button type="button" onClick={closAddModal} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 2 }}>
                    {saving ? 'Saving…' : <><UserPlus size={14} /> Save &amp; Set Up Salary →</>}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2: Salary Setup ── */}
            {addStep === 2 && (
              <form onSubmit={handleSaveSalary} style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* CTC + Metro row */}
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <label style={LBL}>Annual CTC (₹) *</label>
                      <input
                        required type="number" min="0" step="1000"
                        value={salary.ctc_annual}
                        onChange={e => { setSalary(s => ({ ...s, ctc_annual: e.target.value })); recalcSalary(e.target.value, salary.metro) }}
                        style={{ ...FLD, fontWeight: 700, fontSize: '1rem', color: '#c2410c' }}
                        placeholder="e.g. 600000"
                      />
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <label style={LBL}>Effective From *</label>
                      <input required type="date" value={salary.effective_from} onChange={e => setSalary(s => ({ ...s, effective_from: e.target.value }))} style={FLD} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
                      <input
                        type="checkbox" id="metro" checked={salary.metro}
                        onChange={e => { setSalary(s => ({ ...s, metro: e.target.checked })); recalcSalary(salary.ctc_annual, e.target.checked) }}
                        style={{ width: 15, height: 15, cursor: 'pointer' }}
                      />
                      <label htmlFor="metro" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Metro City (50% HRA)</label>
                    </div>
                  </div>

                  {/* Earnings grid */}
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Earnings (Monthly ₹)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {[
                        { key: 'basic',     label: 'Basic Salary *', required: true },
                        { key: 'hra',       label: 'HRA',            required: false },
                        { key: 'conveyance',label: 'Conveyance',     required: false },
                        { key: 'medical',   label: 'Medical Allow.', required: false },
                        { key: 'special',   label: 'Special Allow.', required: false },
                        { key: 'lta',       label: 'LTA (monthly)',  required: false },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={LBL}>{f.label}</label>
                          <input
                            required={f.required} type="number" min="0" step="1"
                            value={(salary as unknown as Record<string, string>)[f.key]}
                            onChange={e => setSalary(s => ({ ...s, [f.key]: e.target.value }))}
                            style={FLD} placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions grid */}
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Employer Contributions (Monthly ₹)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={LBL}>Employer PF <span style={{ color: '#9ca3af', fontWeight: 400 }}>(12% of Basic, max ₹1,800)</span></label>
                        <input type="number" min="0" step="1" value={salary.pf} onChange={e => setSalary(s => ({ ...s, pf: e.target.value }))} style={FLD} placeholder="0" />
                      </div>
                      <div>
                        <label style={LBL}>Employer ESIC <span style={{ color: '#9ca3af', fontWeight: 400 }}>(3.25%, if gross ≤ ₹21,000)</span></label>
                        <input type="number" min="0" step="1" value={salary.esic} onChange={e => setSalary(s => ({ ...s, esic: e.target.value }))} style={FLD} placeholder="0" />
                      </div>
                    </div>
                  </div>

                  {/* Live CTC breakup summary */}
                  {salary.ctc_annual && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Salary Summary</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {[
                          { label: 'Annual CTC',    val: `₹${(parseFloat(salary.ctc_annual)||0).toLocaleString('en-IN')}` },
                          { label: 'Monthly Gross', val: `₹${Math.round((parseFloat(salary.ctc_annual)||0)/12).toLocaleString('en-IN')}` },
                          { label: 'Basic/mo',      val: `₹${(parseFloat(salary.basic)||0).toLocaleString('en-IN')}` },
                          { label: 'HRA/mo',        val: `₹${(parseFloat(salary.hra)||0).toLocaleString('en-IN')}` },
                        ].map(item => (
                          <div key={item.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>{item.val}</div>
                            <div style={{ fontSize: '0.68rem', color: '#86efac' }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                <div style={{ padding: '14px 22px 20px', borderTop: '1.5px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button type="button" onClick={closAddModal} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                    Skip for Now
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 2, background: '#16a34a', borderColor: '#16a34a' }}>
                    {saving ? 'Saving…' : '✓ Save Salary & Finish'}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: Success ── */}
            {addStep === 3 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center', gap: 20 }}>
                {/* Success icon */}
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(22,163,74,0.3)' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                    {newEmpName} is ready!
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                    Employee profile and salary structure have been saved.<br />
                    Head to <strong>Payroll</strong> to run this month&apos;s payroll and generate payslips.
                  </p>
                </div>

                {/* Flow diagram */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f8fafc', borderRadius: 12, padding: '14px 20px', border: '1px solid #e5e7eb', width: '100%', maxWidth: 380 }}>
                  {[
                    { icon: '👤', label: 'Employee Added', done: true },
                    { icon: '💰', label: 'Salary Set',     done: true },
                    { icon: '⚙️', label: 'Run Payroll',    done: false },
                    { icon: '🧾', label: 'Payslip Ready',  done: false },
                  ].map((s, i) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                        <div style={{ fontSize: '1.25rem', opacity: s.done ? 1 : 0.4 }}>{s.icon}</div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: s.done ? '#16a34a' : '#9ca3af', textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
                      </div>
                      {i < 3 && <div style={{ width: 20, height: 1.5, background: s.done ? '#16a34a' : '#e5e7eb', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 380 }}>
                  <button
                    onClick={() => { closAddModal(); router.push('/payroll') }}
                    style={{ padding: '11px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1e3a5f, #1565c0)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(21,101,192,0.3)' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="10 8 14 12 10 16"/></svg>
                    Go to Payroll → Run Payroll
                  </button>
                  <button
                    onClick={closAddModal}
                    style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    Done — Stay on Employees
                  </button>
                </div>
              </div>
            )}

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
                ['Work Type',       ({ office: 'Work From Office', home: 'Work From Home', hybrid: 'Hybrid' } as Record<string, string>)[(viewEmp as any).work_type] ?? '—'],
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
          <div style={{ background: '#fff', width: 660, maxWidth: '95vw', maxHeight: '92vh', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>Edit Employee</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{editEmp.first_name} {editEmp.last_name} · {editEmp.emp_id}</p>
              </div>
              <button onClick={() => setEditEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
            </div>
            <EditEmployeeForm
  emp={editEmp}
  departments={departments}
  onClose={() => setEditEmp(null)}
  onSaved={(updated) => {
    // Immediately update the row in the list so department shows without waiting for full refetch
    setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
    setEditEmp(null)
    fetchEmployees()
  }}
/>
          </div>
        </div>
      )}

      {/* ── Assign Manager Modal ── */}
      {assignMgrEmp && (
        <AssignManagerModal
          emp={assignMgrEmp}
          onClose={() => setAssignMgrEmp(null)}
          onSaved={() => { setAssignMgrEmp(null); fetchEmployees() }}
        />
      )}
    </>
  )
}
