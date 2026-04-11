'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { assetsApi, employeesApi, type Asset as ApiAsset, type Employee } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  Package, UserCheck, Box, Wrench, Search, Plus, X,
  Edit2, Eye, LogOut, RotateCcw, Loader2, AlertTriangle, Trash2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AssetStatus    = 'Assigned' | 'Available' | 'Maintenance' | 'Disposed'
type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor'
type AssetCategory  = 'Laptop' | 'Monitor' | 'Keyboard' | 'Mobile' | 'SIM Card' | 'Headset' | 'Vehicle' | 'Other'

interface Asset {
  id: string
  code: string
  name: string
  category: AssetCategory
  brand: string
  model: string
  serial: string
  purchaseDate: string
  purchaseValue: number
  assignedTo: string | null
  assignedToId: string | null
  assignedDept: string | null
  condition: AssetCondition
  status: AssetStatus
  location: string
  notes: string
}

const CATEGORIES: AssetCategory[] = ['Laptop', 'Monitor', 'Keyboard', 'Mobile', 'SIM Card', 'Headset', 'Vehicle', 'Other']
const STATUSES: AssetStatus[]     = ['Assigned', 'Available', 'Maintenance', 'Disposed']
const CONDITIONS: AssetCondition[] = ['Excellent', 'Good', 'Fair', 'Poor']

// DB → display status mapping
const STATUS_FROM_DB: Record<string, AssetStatus> = {
  available: 'Available', assigned: 'Assigned',
  under_repair: 'Maintenance', maintenance: 'Maintenance',
  retired: 'Disposed', disposed: 'Disposed',
}
// DB → display condition mapping
function normalizeCondition(c: string): AssetCondition {
  // DB stores: 'new' | 'good' | 'fair' | 'poor'  ('new' = Excellent in UI)
  const m: Record<string, AssetCondition> = {
    new: 'Excellent', excellent: 'Excellent',
    good: 'Good', fair: 'Fair', poor: 'Poor',
  }
  return m[c?.toLowerCase()] ?? 'Good'
}
// Category normalizer
function normalizeCategory(c: string): AssetCategory {
  const m: Record<string, AssetCategory> = {
    laptop: 'Laptop', monitor: 'Monitor', keyboard: 'Keyboard',
    mobile: 'Mobile', sim_card: 'SIM Card', 'sim card': 'SIM Card',
    headset: 'Headset', vehicle: 'Vehicle',
  }
  return m[c?.toLowerCase()] ?? 'Other'
}

function adaptAsset(a: ApiAsset): Asset {
  const emp = a.assigned_employee
  const status = STATUS_FROM_DB[a.status?.toLowerCase()] ?? 'Available'
  return {
    id:           a.id,
    code:         a.asset_code ?? a.id,
    name:         a.name,
    category:     normalizeCategory(a.category),
    brand:        a.brand ?? '',
    model:        a.model ?? '',
    serial:       a.serial_number ?? '',
    purchaseDate: a.purchase_date ? new Date(a.purchase_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—',
    purchaseValue: a.purchase_value ?? 0,
    assignedTo:   emp ? `${emp.first_name} ${emp.last_name}` : null,
    assignedToId: emp ? emp.id : null,
    assignedDept: emp?.department?.name ?? null,
    condition:    normalizeCondition(a.condition),
    status,
    location:     a.location ?? '',
    notes:        a.notes ?? '',
  }
}

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']

const CAT_CFG: Record<AssetCategory, { bg: string; color: string; border: string }> = {
  Laptop:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Monitor:    { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  Keyboard:   { bg: '#f9fafb', color: '#475569', border: '#e5e7eb' },
  Mobile:     { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'SIM Card': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Headset:    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Vehicle:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Other:      { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
}

const STATUS_CFG: Record<AssetStatus, { bg: string; color: string; border: string }> = {
  Assigned:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Available:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Maintenance: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Disposed:    { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

const COND_CFG: Record<AssetCondition, { bg: string; color: string; border: string }> = {
  Excellent: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Good:      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Fair:      { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Poor:      { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

const FIELD: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

/* ─────────────────────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTE.length
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${PALETTE[idx]}1A`, border: `2px solid ${PALETTE[idx]}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: PALETTE[idx],
    }}>{initials}</div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MODAL WRAPPER
───────────────────────────────────────────────────────────── */
function Modal({ onClose, title, sub, children, width = 520 }: {
  onClose: () => void; title: string; sub?: string; children: React.ReactNode; width?: number
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', display: 'flex', flexDirection: 'column', width, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
            {sub && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>{sub}</p>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', marginTop: -2, flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 22px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ADD ASSET MODAL
───────────────────────────────────────────────────────────── */
function AddAssetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', category: 'Laptop', brand: '', model: '',
    serial: '', purchaseDate: '', purchaseValue: '', condition: 'Good',
    location: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Asset name is required'); return }
    setSaving(true)
    try {
      await assetsApi.create({
        name:           form.name,
        category:       form.category.toLowerCase().replace(' ', '_'),
        brand:          form.brand || null,
        model:          form.model || null,
        serial_number:  form.serial || null,
        purchase_date:  form.purchaseDate || null,
        purchase_value: form.purchaseValue ? parseFloat(form.purchaseValue) : null,
        condition:      form.condition.toLowerCase(),
        location:       form.location || null,
        notes:          form.notes || null,
      })
      toast.success('Asset added successfully')
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add New Asset" sub="Register a new company-owned asset">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Asset Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dell Latitude 5520" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Category <span style={{ color: '#dc2626' }}>*</span></label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Brand</label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Dell" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Model</label>
            <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Model number" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Serial Number</label>
            <input value={form.serial} onChange={e => set('serial', e.target.value)} placeholder="e.g. L2024-001" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} style={{ ...FIELD, colorScheme: 'light' } as React.CSSProperties} />
          </div>
          <div>
            <label style={LBL}>Purchase Value (₹)</label>
            <input type="number" value={form.purchaseValue} onChange={e => set('purchaseValue', e.target.value)} placeholder="75000" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Condition</label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Head Office, Floor 2" style={FIELD} />
          </div>
        </div>
        <div>
          <label style={LBL}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            placeholder="Any additional notes…" style={{ ...FIELD, resize: 'none', lineHeight: 1.55 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8375rem' }}>Cancel</button>
          <button onClick={handleAdd} disabled={saving}
            style={{ flex: 2, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5899 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8375rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
            {saving ? 'Adding…' : 'Add Asset'}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   ASSIGN MODAL
───────────────────────────────────────────────────────────── */
function AssignModal({ asset, onClose, onSuccess }: { asset: Asset; onClose: () => void; onSuccess: () => void }) {
  const [search, setSearch]     = useState('')
  const [empList, setEmpList]   = useState<Employee[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    employeesApi.list({ limit: 200 }).then(res => setEmpList(res.data ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = empList.filter(e => {
    const q = search.toLowerCase()
    return !q || `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || (e.emp_id ?? '').toLowerCase().includes(q)
  })

  const handleAssign = async () => {
    if (!selected) { toast.error('Please select an employee'); return }
    setSaving(true)
    try {
      await assetsApi.patch(asset.id, { action: 'assign', assigned_to: selected.id })
      toast.success(`${asset.name} assigned to ${selected.first_name} ${selected.last_name}`)
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Assign Asset" sub={`${asset.code} — ${asset.name}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <label style={LBL}>Select Employee <span style={{ color: '#dc2626' }}>*</span></label>
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#f9fafb' }}>
              <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee by name or ID…"
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#374151', width: '100%', fontFamily: 'inherit' }} />
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', color: '#9ca3af', gap: 8 }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading employees…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem' }}>No employees found</div>
              ) : filtered.map(e => {
                const isSelected = selected?.id === e.id
                return (
                  <button key={e.id} onClick={() => { setSelected(e); setSearch(`${e.first_name} ${e.last_name}`) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: '0.8125rem',
                      background: isSelected ? '#fff7ed' : 'transparent',
                      color: isSelected ? '#E8622A' : '#374151',
                      fontWeight: isSelected ? 600 : 400,
                      border: 'none', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                      display: 'flex', alignItems: 'center', gap: 9,
                    }}>
                    <Avatar name={`${e.first_name} ${e.last_name}`} size={26} />
                    <div>
                      <p style={{ margin: 0, fontWeight: isSelected ? 600 : 500 }}>{e.first_name} {e.last_name}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#9ca3af' }}>{e.emp_id ?? ''}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div>
          <label style={LBL}>Assignment Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...FIELD, colorScheme: 'light' } as React.CSSProperties} />
        </div>
        <div>
          <label style={LBL}>Notes <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af' }}>Optional</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Assignment notes…" style={{ ...FIELD, resize: 'none', lineHeight: 1.55 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8375rem' }}>Cancel</button>
          <button onClick={handleAssign} disabled={saving || !selected}
            style={{ flex: 2, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1A7A4A 0%, #22c55e 100%)', color: 'white', fontWeight: 700, cursor: (saving || !selected) ? 'not-allowed' : 'pointer', fontSize: '0.8375rem', opacity: !selected ? 0.5 : saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={14} />}
            {saving ? 'Assigning…' : 'Assign Asset'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   EDIT MODAL
───────────────────────────────────────────────────────────── */
function EditModal({ asset, onClose, onSuccess }: { asset: Asset; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name:          asset.name,
    brand:         asset.brand,
    model:         asset.model,
    serial:        asset.serial,
    condition:     asset.condition,
    location:      asset.location,
    notes:         asset.notes,
    purchaseValue: String(asset.purchaseValue),
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await assetsApi.patch(asset.id, {
        name:          form.name,
        brand:         form.brand || undefined,
        model:         form.model || undefined,
        serial_number: form.serial || undefined,
        condition:     form.condition.toLowerCase(),
        location:      form.location || undefined,
        notes:         form.notes || undefined,
        purchase_value: form.purchaseValue ? parseFloat(form.purchaseValue) : undefined,
      })
      toast.success('Asset updated successfully')
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Edit Asset" sub={`${asset.code} — ${asset.name}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Asset Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Brand</label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Model</label>
            <input value={form.model} onChange={e => set('model', e.target.value)} style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Serial Number</label>
            <input value={form.serial} onChange={e => set('serial', e.target.value)} style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Purchase Value (₹)</label>
            <input type="number" value={form.purchaseValue} onChange={e => set('purchaseValue', e.target.value)} style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Condition</label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Head Office" style={FIELD} />
          </div>
        </div>
        <div>
          <label style={LBL}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            style={{ ...FIELD, resize: 'none', lineHeight: 1.55 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8375rem' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5899 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8375rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Edit2 size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   VIEW MODAL
───────────────────────────────────────────────────────────── */
function ViewModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const sCfg = STATUS_CFG[asset.status]
  const cCfg = COND_CFG[asset.condition]
  const catCfg = CAT_CFG[asset.category]

  const fields: { label: string; value: string }[] = [
    { label: 'Asset Code',    value: asset.code },
    { label: 'Category',      value: asset.category },
    { label: 'Brand',         value: asset.brand || '—' },
    { label: 'Model',         value: asset.model || '—' },
    { label: 'Serial Number', value: asset.serial || '—' },
    { label: 'Purchase Date', value: asset.purchaseDate },
    { label: 'Purchase Value', value: fmt(asset.purchaseValue) },
    { label: 'Location',      value: asset.location || '—' },
  ]

  return (
    <Modal onClose={onClose} title={asset.name} sub={`${asset.code} · ${asset.category}`} width={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status + Condition badges */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-dot" style={{ background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.border}` }}>{asset.status}</span>
          <span className="badge" style={{ background: cCfg.bg, color: cCfg.color, border: `1px solid ${cCfg.border}` }}>{asset.condition}</span>
          <span className="badge" style={{ background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.border}` }}>{asset.category}</span>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {fields.map(f => (
            <div key={f.label} style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
              <p style={{ fontSize: '0.8125rem', color: '#111827', fontWeight: 600, margin: 0 }}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Assigned to */}
        {asset.assignedTo && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={asset.assignedTo} size={36} />
            <div>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned To</p>
              <p style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 700, margin: 0 }}>{asset.assignedTo}</p>
              {asset.assignedDept && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{asset.assignedDept}</p>}
            </div>
          </div>
        )}

        {/* Notes */}
        {asset.notes && (
          <div>
            <p style={LBL}>Notes</p>
            <p style={{ fontSize: '0.8125rem', color: '#374151', lineHeight: 1.6, margin: 0, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>{asset.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   EMPLOYEE ASSETS MODAL (used in Assigned tab)
───────────────────────────────────────────────────────────── */
function EmployeeAssetsModal({ empName, dept, empAssets, onClose }: {
  empName: string; dept: string; empAssets: Asset[]; onClose: () => void
}) {
  const total = empAssets.reduce((s, a) => s + a.purchaseValue, 0)
  return (
    <Modal onClose={onClose} title={empName} sub={`${dept} · ${empAssets.length} asset${empAssets.length !== 1 ? 's' : ''} · Total: ${fmt(total)}`} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {empAssets.map(a => {
          const sCfg   = STATUS_CFG[a.status]
          const catCfg = CAT_CFG[a.category]
          const cCfg   = COND_CFG[a.condition]
          return (
            <div key={a.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid #f1f5f9', background: '#f8fafc', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>{a.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>{a.code}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.border}` }}>{a.category}</span>
                  <span className="badge badge-dot" style={{ background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.border}` }}>{a.status}</span>
                  <span className="badge" style={{ background: cCfg.bg, color: cCfg.color, border: `1px solid ${cCfg.border}` }}>{a.condition}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>{fmt(a.purchaseValue)}</p>
                {a.brand && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>{a.brand}{a.model ? ` · ${a.model}` : ''}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — ASSIGNED TO EMPLOYEES
───────────────────────────────────────────────────────────── */
function AssignedTab({ assets }: { assets: Asset[] }) {
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null)

  const assigned = assets.filter(a => a.assignedTo !== null)
  const grouped = useMemo(() => {
    const map: Record<string, { assets: Asset[]; dept: string }> = {}
    assigned.forEach(a => {
      const k = a.assignedTo!
      if (!map[k]) map[k] = { assets: [], dept: a.assignedDept ?? 'General' }
      map[k].assets.push(a)
    })
    return map
  }, [assigned])

  if (assigned.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <UserCheck size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>No assets assigned</p>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Assign assets from the Inventory tab</p>
      </div>
    )
  }

  const selectedEntry = selectedEmp ? grouped[selectedEmp] : null

  return (
    <>
      {selectedEntry && (
        <EmployeeAssetsModal
          empName={selectedEmp!}
          dept={selectedEntry.dept}
          empAssets={selectedEntry.assets}
          onClose={() => setSelectedEmp(null)}
        />
      )}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {['Employee', 'Department', 'Assets', 'Asset List', 'Total Value', 'Actions'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([emp, { assets: empAssets, dept }]) => {
              const total = empAssets.reduce((s, a) => s + a.purchaseValue, 0)
              return (
                <tr key={emp}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={emp} size={34} />
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{emp}</span>
                    </div>
                  </td>
                  <td style={{ color: '#374151' }}>{dept}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#E8622A', fontSize: '0.75rem', fontWeight: 700 }}>
                      {empAssets.length}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {empAssets.map(a => {
                        const cfg = CAT_CFG[a.category]
                        return (
                          <span key={a.code} className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {a.category}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#111827' }}>{fmt(total)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                      onClick={() => setSelectedEmp(emp)}
                    >
                      <Eye size={12} /> View All
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function AssetsPage() {
  const [activeTab, setActiveTab]     = useState<'inventory' | 'assigned'>('inventory')
  const [search, setSearch]           = useState('')
  const [catFilter, setCatFilter]     = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading]         = useState(true)
  const [allAssets, setAllAssets]     = useState<Asset[]>([])

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [assignAsset, setAssignAsset]   = useState<Asset | null>(null)
  const [editAsset, setEditAsset]       = useState<Asset | null>(null)
  const [viewAsset, setViewAsset]       = useState<Asset | null>(null)

  const fetchAssets = useCallback(() => {
    setLoading(true)
    assetsApi.list({ limit: 300 })
      .then(res => {
        const adapted = (res.data ?? []).map(adaptAsset)
        setAllAssets(adapted)
      })
      .catch(() => toast.error('Failed to load assets'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  // Quick-action helpers
  const handleUnassign = async (asset: Asset) => {
    if (!confirm(`Unassign "${asset.name}" from ${asset.assignedTo}?`)) return
    try {
      await assetsApi.patch(asset.id, { action: 'unassign' })
      toast.success('Asset unassigned')
      fetchAssets()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleSendMaintenance = async (asset: Asset) => {
    if (!confirm(`Send "${asset.name}" to maintenance?`)) return
    try {
      await assetsApi.patch(asset.id, { action: 'maintenance' })
      toast.success('Asset sent to maintenance')
      fetchAssets()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleRestore = async (asset: Asset) => {
    try {
      await assetsApi.patch(asset.id, { action: 'restore' })
      toast.success('Asset marked as available')
      fetchAssets()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleDispose = async (asset: Asset) => {
    if (!confirm(`Permanently retire "${asset.name}"? This cannot be undone.`)) return
    try {
      await assetsApi.patch(asset.id, { action: 'dispose' })
      toast.success('Asset retired')
      fetchAssets()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  // KPI counts
  const totalAssets      = allAssets.length
  const assignedCount    = allAssets.filter(a => a.status === 'Assigned').length
  const availableCount   = allAssets.filter(a => a.status === 'Available').length
  const maintenanceCount = allAssets.filter(a => a.status === 'Maintenance').length

  const filtered = useMemo(() => allAssets.filter(a => {
    const q = search.toLowerCase()
    return (!q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q) || a.serial.toLowerCase().includes(q)) &&
      (catFilter === 'All' || a.category === catFilter) &&
      (statusFilter === 'All' || a.status === statusFilter)
  }), [allAssets, search, catFilter, statusFilter])

  const TABS = [
    { key: 'inventory' as const, label: 'Asset Inventory',       count: allAssets.length },
    { key: 'assigned'  as const, label: 'Assigned to Employees', count: assignedCount },
  ]

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Modals */}
      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} onSuccess={fetchAssets} />}
      {assignAsset  && <AssignModal  asset={assignAsset} onClose={() => setAssignAsset(null)}  onSuccess={fetchAssets} />}
      {editAsset    && <EditModal    asset={editAsset}   onClose={() => setEditAsset(null)}    onSuccess={fetchAssets} />}
      {viewAsset    && <ViewModal    asset={viewAsset}   onClose={() => setViewAsset(null)} />}

      <Topbar
        title="Asset Management"
        subtitle="Track and manage company-owned assets"
        notificationCount={maintenanceCount || undefined}
      >
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Asset
        </button>
      </Topbar>

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── KPI Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {([
            { label: 'Total Assets',      value: loading ? '—' : totalAssets,      icon: Package,   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Assigned',          value: loading ? '—' : assignedCount,    icon: UserCheck, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Available',         value: loading ? '—' : availableCount,   icon: Box,       color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Under Maintenance', value: loading ? '—' : maintenanceCount, icon: Wrench,    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
          ] as { label: string; value: string | number; icon: React.ElementType; color: string; bg: string; border: string }[]).map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className="card card-interactive" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #f1f5f9', padding: '0 4px' }}>
            {TABS.map(t => {
              const active = activeTab === t.key
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '14px 18px',
                    fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
                    color: active ? '#1E3A5F' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: active ? '2px solid #1E3A5F' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 150ms',
                  }}>
                  {t.label}
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: active ? '#dbeafe' : '#f1f5f9', color: active ? '#1d4ed8' : '#9ca3af' }}>
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Inventory Tab ── */}
          {activeTab === 'inventory' && (
            <>
              {/* Filter bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #f8fafc', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', background: '#f9fafb' }}>
                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search asset name, code, brand…"
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#374151', width: '100%', fontFamily: 'inherit' }} />
                  {search && (
                    <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="form-select">
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select">
                  <option value="All">All Status</option>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {loading ? 'Loading…' : `${filtered.length} assets`}
                </span>
              </div>

              {/* Table */}
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: '#9ca3af', gap: 10 }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.875rem' }}>Loading assets…</span>
                </div>
              ) : (
                <div className="table-wrapper" style={{ borderRadius: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {['Asset Code', 'Asset Name', 'Category', 'Brand / Serial', 'Purchase Date', 'Value', 'Assigned To', 'Condition', 'Status', 'Actions'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(asset => {
                        const sCfg   = STATUS_CFG[asset.status]
                        const cCfg   = COND_CFG[asset.condition]
                        const catCfg = CAT_CFG[asset.category]
                        return (
                          <tr key={asset.id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 6px' }}>
                                {asset.code}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#111827', maxWidth: 180 }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
                            </td>
                            <td>
                              <span className="badge" style={{ background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.border}` }}>{asset.category}</span>
                            </td>
                            <td>
                              <p style={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem', margin: 0 }}>{asset.brand || '—'}</p>
                              <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{asset.serial || '—'}</p>
                            </td>
                            <td style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{asset.purchaseDate}</td>
                            <td style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{fmt(asset.purchaseValue)}</td>
                            <td>
                              {asset.assignedTo ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <Avatar name={asset.assignedTo} size={24} />
                                  <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', margin: 0 }}>{asset.assignedTo}</p>
                                    {asset.assignedDept && <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: 0 }}>{asset.assignedDept}</p>}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                              )}
                            </td>
                            <td>
                              <span className="badge" style={{ background: cCfg.bg, color: cCfg.color, border: `1px solid ${cCfg.border}` }}>{asset.condition}</span>
                            </td>
                            <td>
                              <span className="badge badge-dot" style={{ background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.border}` }}>{asset.status}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                {/* View */}
                                <button onClick={() => setViewAsset(asset)} title="View Details"
                                  className="btn btn-ghost btn-sm btn-icon">
                                  <Eye size={13} />
                                </button>
                                {/* Assign */}
                                {asset.status === 'Available' && (
                                  <button onClick={() => setAssignAsset(asset)} title="Assign to Employee"
                                    className="btn btn-ghost btn-sm btn-icon" style={{ color: '#15803d' }}>
                                    <UserCheck size={13} />
                                  </button>
                                )}
                                {/* Unassign */}
                                {asset.status === 'Assigned' && (
                                  <button onClick={() => handleUnassign(asset)} title="Unassign"
                                    className="btn btn-ghost btn-sm btn-icon" style={{ color: '#b45309' }}>
                                    <LogOut size={13} />
                                  </button>
                                )}
                                {/* Send to Maintenance */}
                                {asset.status === 'Available' && (
                                  <button onClick={() => handleSendMaintenance(asset)} title="Send to Maintenance"
                                    className="btn btn-ghost btn-sm btn-icon" style={{ color: '#d97706' }}>
                                    <Wrench size={13} />
                                  </button>
                                )}
                                {/* Restore from Maintenance */}
                                {asset.status === 'Maintenance' && (
                                  <button onClick={() => handleRestore(asset)} title="Mark Available"
                                    className="btn btn-ghost btn-sm btn-icon" style={{ color: '#1d4ed8' }}>
                                    <RotateCcw size={13} />
                                  </button>
                                )}
                                {/* Edit */}
                                {asset.status !== 'Disposed' && (
                                  <button onClick={() => setEditAsset(asset)} title="Edit Asset"
                                    className="btn btn-ghost btn-sm btn-icon">
                                    <Edit2 size={13} />
                                  </button>
                                )}
                                {/* Retire */}
                                {asset.status !== 'Disposed' && (
                                  <button onClick={() => handleDispose(asset)} title="Retire Asset"
                                    className="btn btn-ghost btn-sm btn-icon" style={{ color: '#dc2626' }}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                                {/* Disposed warning */}
                                {asset.status === 'Disposed' && (
                                  <span title="Asset retired" style={{ display: 'flex', alignItems: 'center', padding: '4px', color: '#dc2626' }}>
                                    <AlertTriangle size={13} />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {filtered.length === 0 && !loading && (
                    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <Package size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>
                        {allAssets.length === 0 ? 'No assets yet' : 'No assets match your filters'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
                        {allAssets.length === 0 ? 'Add your first asset using the button above' : 'Try adjusting your search or filters'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Assigned Tab ── */}
          {activeTab === 'assigned' && <AssignedTab assets={allAssets} />}

        </div>
      </div>
    </>
  )
}
