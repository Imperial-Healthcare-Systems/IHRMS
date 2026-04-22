'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  FileText, Upload, X, Loader2, Download, Trash2,
  File, FileImage, FileBadge, Search,
} from 'lucide-react'

interface Doc {
  id: string
  name: string
  type: string | null
  storage_path: string
  size_bytes: number | null
  created_at: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string } | null
  uploader: { id: string; first_name: string; last_name: string } | null
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

const ADMIN_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string | null }) {
  if (!type) return <File size={20} color="#9ca3af" />
  if (type.includes('image')) return <FileImage size={20} color="#8b5cf6" />
  if (type.includes('pdf')) return <FileBadge size={20} color="#ef4444" />
  return <FileText size={20} color="#3b82f6" />
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id as string
  const isAdmin = ADMIN_ROLES.includes((session?.user as any)?.role ?? '')

  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [docName, setDocName]   = useState('')
  const [docType, setDocType]   = useState('contract')
  const [empId, setEmpId]       = useState(myId)
  const [uploading, setUploading] = useState(false)

  const handleFile = (f: File) => {
    setFile(f)
    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = async () => {
    if (!file || !docName.trim()) { toast.error('File and name are required'); return }
    if (file.size > 50 * 1024 * 1024) { toast.error('File exceeds 50 MB limit'); return }
    setUploading(true)
    try {
      // Get presigned upload URL from server
      const uploadRes = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: empId, file_name: file.name, content_type: file.type }),
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error)

      // Upload directly to storage via signed URL
      const putRes = await fetch(uploadJson.signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error('Storage upload failed')

      // Save metadata
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: empId, name: docName, type: docType, storage_path: uploadJson.path, size_bytes: file.size }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success('Document uploaded successfully')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', width: 520, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} color="#E8622A" />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>Upload Document</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{ border: `2px dashed ${file ? '#E8622A' : '#e5e7eb'}`, borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: file ? '#fff7ed' : '#f9fafb', transition: 'all 150ms' }}>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <FileIcon type={file.type} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.875rem' }}>{file.name}</p>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem' }}>{fmtSize(file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={24} style={{ color: '#d1d5db', margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px', fontSize: '0.875rem' }}>Click or drag to upload</p>
                <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.75rem' }}>PDF, Word, Excel, Images — max 50 MB</p>
              </>
            )}
          </div>

          <div>
            <label style={LABEL_STYLE}>Document Name</label>
            <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Offer Letter" style={FIELD_STYLE} />
          </div>

          <div>
            <label style={LABEL_STYLE}>Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} style={{ ...FIELD_STYLE, cursor: 'pointer' }}>
              <option value="contract">Contract / Offer Letter</option>
              <option value="id_proof">ID Proof</option>
              <option value="educational">Educational Certificate</option>
              <option value="payslip">Payslip</option>
              <option value="appraisal">Appraisal Letter</option>
              <option value="policy">Policy Document</option>
              <option value="other">Other</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <label style={LABEL_STYLE}>Employee ID (for whom)</label>
              <input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="Employee UUID" style={FIELD_STYLE} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={uploading} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>Cancel</button>
            <button onClick={handleUpload} disabled={uploading || !file}
              style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: (uploading || !file) ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', opacity: (uploading || !file) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const { data: session } = useSession()
  const isAdmin = ADMIN_ROLES.includes((session?.user as any)?.role ?? '')

  const [docs, setDocs]           = useState<Doc[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch]       = useState('')
  const [deleting, setDeleting]   = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const res  = await fetch('/api/documents')
      const json = await res.json()
      setDocs(json.data ?? [])
    } catch {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleDownload = async (doc: Doc) => {
    try {
      const res = await fetch(`/api/documents/download?id=${doc.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      window.open(json.url, '_blank')
    } catch {
      toast.error('Failed to generate download link')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document permanently?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Document deleted')
      fetchDocs()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.employee?.first_name + ' ' + d.employee?.last_name).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {showModal && <UploadModal onClose={() => setShowModal(false)} onSuccess={fetchDocs} />}

      <Topbar title="Documents" subtitle="Employee files, contracts, and policy documents">
        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
          <Upload size={14} /> Upload
        </button>
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 380, marginBottom: 20 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or employee…"
            style={{ ...FIELD_STYLE, paddingLeft: 34, paddingRight: 12 }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>Loading documents…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px', fontSize: '0.875rem' }}>No documents found</p>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>Upload documents using the button above.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #f1f5f9', background: '#fafafa' }}>
                  {['Document', 'Type', 'Employee', 'Size', 'Uploaded', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #f9fafb' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileIcon type={doc.type} />
                        <span style={{ fontWeight: 600, color: '#111827' }}>{doc.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 999 }}>
                        {doc.type ?? 'Other'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>
                      {doc.employee ? `${doc.employee.first_name} ${doc.employee.last_name}` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{fmtSize(doc.size_bytes)}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(doc.created_at)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleDownload(doc)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Download size={11} /> Download
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                            style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: deleting === doc.id ? 0.6 : 1 }}>
                            {deleting === doc.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
