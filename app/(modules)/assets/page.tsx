'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Package, UserCheck, Box, Wrench, Search, Plus, X,
  Edit2, Eye, LogOut, RotateCcw,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AssetStatus    = 'Assigned' | 'Available' | 'Maintenance' | 'Disposed'
type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor'
type AssetCategory  = 'Laptop' | 'Monitor' | 'Keyboard' | 'Mobile' | 'SIM Card' | 'Headset' | 'Vehicle' | 'Other'

interface Asset {
  code: string; name: string; category: AssetCategory; brand: string; serial: string
  purchaseDate: string; purchaseValue: number; assignedTo: string | null
  condition: AssetCondition; status: AssetStatus
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const ASSETS: Asset[] = [
  { code: 'AST/2024/001', name: 'Dell Latitude 5520 Laptop',    category: 'Laptop',   brand: 'Dell',           serial: 'L2024-001',  purchaseDate: 'Jan 2024', purchaseValue: 75000,  assignedTo: 'Arjun Patel',             condition: 'Good',      status: 'Assigned' },
  { code: 'AST/2024/002', name: 'HP EliteBook 840 Laptop',      category: 'Laptop',   brand: 'HP',             serial: 'E2024-002',  purchaseDate: 'Jan 2024', purchaseValue: 82000,  assignedTo: 'Priya Sharma',            condition: 'Good',      status: 'Assigned' },
  { code: 'AST/2024/003', name: 'MacBook Pro 14"',              category: 'Laptop',   brand: 'Apple',          serial: 'M2024-003',  purchaseDate: 'Mar 2024', purchaseValue: 165000, assignedTo: 'Rahul Kumar (Manager)',    condition: 'Excellent', status: 'Assigned' },
  { code: 'AST/2024/004', name: 'Dell P2422H Monitor (24")',    category: 'Monitor',  brand: 'Dell',           serial: 'MON-001',    purchaseDate: 'Feb 2024', purchaseValue: 18500,  assignedTo: null,                      condition: 'Good',      status: 'Available' },
  { code: 'AST/2024/005', name: 'Dell P2422H Monitor (24")',    category: 'Monitor',  brand: 'Dell',           serial: 'MON-002',    purchaseDate: 'Feb 2024', purchaseValue: 18500,  assignedTo: 'Vivek Sharma',            condition: 'Good',      status: 'Assigned' },
  { code: 'AST/2024/006', name: 'Logitech MX Keys Keyboard',   category: 'Keyboard', brand: 'Logitech',       serial: 'KB-001',     purchaseDate: 'Mar 2024', purchaseValue: 8500,   assignedTo: null,                      condition: 'Excellent', status: 'Available' },
  { code: 'AST/2024/007', name: 'Lenovo ThinkPad Laptop',      category: 'Laptop',   brand: 'Lenovo',         serial: 'T2024-007',  purchaseDate: 'Apr 2024', purchaseValue: 68000,  assignedTo: null,                      condition: 'Fair',      status: 'Maintenance' },
  { code: 'AST/2024/008', name: 'iPhone 13 (Corporate)',        category: 'Mobile',   brand: 'Apple',          serial: 'IP-001',     purchaseDate: 'May 2024', purchaseValue: 72000,  assignedTo: 'Vikram Nair (Sales Head)',condition: 'Excellent', status: 'Assigned' },
  { code: 'AST/2024/009', name: 'Airtel SIM Card (Work)',      category: 'SIM Card', brand: 'Airtel',         serial: 'SIM-001',    purchaseDate: 'Jan 2024', purchaseValue: 500,    assignedTo: 'Anita Verma',             condition: 'Good',      status: 'Assigned' },
  { code: 'AST/2024/010', name: 'Bose QC45 Headset',           category: 'Headset',  brand: 'Bose',           serial: 'BH-001',     purchaseDate: 'Jun 2024', purchaseValue: 32000,  assignedTo: null,                      condition: 'Excellent', status: 'Available' },
  { code: 'AST/2024/011', name: 'Maruti Ertiga (Company Car)', category: 'Vehicle',  brand: 'Maruti',         serial: 'MH12AB1234', purchaseDate: 'Aug 2023', purchaseValue: 950000, assignedTo: null,                      condition: 'Good',      status: 'Available' },
  { code: 'AST/2024/012', name: 'Dell Latitude 5530 Laptop',   category: 'Laptop',   brand: 'Dell',           serial: 'L2024-012',  purchaseDate: 'Jul 2024', purchaseValue: 78000,  assignedTo: 'Deepika Sharma',          condition: 'Good',      status: 'Assigned' },
  { code: 'AST/2024/013', name: 'Samsung Galaxy A54 (Work)',   category: 'Mobile',   brand: 'Samsung',        serial: 'SAM-013',    purchaseDate: 'Aug 2024', purchaseValue: 35000,  assignedTo: 'Rajesh Kumar',            condition: 'Fair',      status: 'Assigned' },
  { code: 'AST/2024/014', name: 'Cisco IP Phone 7841',         category: 'Other',    brand: 'Cisco',          serial: 'PHONE-001',  purchaseDate: 'Jan 2024', purchaseValue: 12000,  assignedTo: null,                      condition: 'Fair',      status: 'Maintenance' },
  { code: 'AST/2024/015', name: 'External SSD 1TB (WD)',       category: 'Other',    brand: 'Western Digital', serial: 'SSD-001',   purchaseDate: 'Sep 2024', purchaseValue: 7500,   assignedTo: null,                      condition: 'Excellent', status: 'Available' },
]

const CATEGORIES: AssetCategory[] = ['Laptop', 'Monitor', 'Keyboard', 'Mobile', 'SIM Card', 'Headset', 'Vehicle', 'Other']
const STATUSES: AssetStatus[]     = ['Assigned', 'Available', 'Maintenance', 'Disposed']
const CONDITIONS: AssetCondition[] = ['Excellent', 'Good', 'Fair', 'Poor']
const EMPLOYEES = ['Arjun Patel', 'Priya Sharma', 'Rahul Kumar', 'Vivek Sharma', 'Anita Verma', 'Vikram Nair', 'Deepika Sharma', 'Rajesh Kumar', 'Sunita Reddy', 'Mohan Das']

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const PALETTE = ['#1E3A5F', '#E8622A', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']

const CAT_CFG: Record<AssetCategory, { bg: string; color: string; border: string }> = {
  Laptop:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Monitor:  { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  Keyboard: { bg: '#f9fafb', color: '#475569', border: '#e5e7eb' },
  Mobile:   { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'SIM Card': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Headset:  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Vehicle:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Other:    { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
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

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

const FIELD = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
}
const LBL = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600 as const,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
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
function Modal({ onClose, title, sub, children }: { onClose: () => void; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white flex flex-col" style={{ width: 520, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div className="flex items-start justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
            {sub && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>{sub}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon" style={{ marginTop: -2 }}><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ADD ASSET MODAL
───────────────────────────────────────────────────────────── */
function AddAssetModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ code: 'AST/2024/016', name: '', category: 'Laptop', brand: '', model: '', serial: '', purchaseDate: '', purchaseValue: '', condition: 'Good', notes: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal onClose={onClose} title="Add New Asset" sub="Register a new company-owned asset">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LBL}>Asset Code</label>
            <input value={form.code} readOnly style={{ ...FIELD, background: '#f1f5f9', color: '#6b7280' }} />
          </div>
          <div>
            <label style={LBL}>Asset Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dell Latitude 5520" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Category <span style={{ color: '#dc2626' }}>*</span></label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="form-select" style={{ width: '100%' }}>
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
            <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Purchase Value (₹)</label>
            <input type="number" value={form.purchaseValue} onChange={e => set('purchaseValue', e.target.value)} placeholder="75000" style={FIELD} />
          </div>
          <div>
            <label style={LBL}>Condition</label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)} className="form-select" style={{ width: '100%' }}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={LBL}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
            placeholder="Any additional notes about this asset…"
            style={{ ...FIELD, resize: 'none', lineHeight: 1.55 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
          <button onClick={onClose} className="btn btn-primary btn-sm" style={{ flex: 2 }}>Add Asset</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   ASSIGN MODAL
───────────────────────────────────────────────────────────── */
function AssignModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState('')
  const [date, setDate]       = useState('')
  const [notes, setNotes]     = useState('')
  const filteredEmps = EMPLOYEES.filter(e => e.toLowerCase().includes(search.toLowerCase()))

  return (
    <Modal onClose={onClose} title="Assign Asset" sub={`${asset.code} — ${asset.name}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <label style={LBL}>Select Employee <span style={{ color: '#dc2626' }}>*</span></label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
            style={{ ...FIELD, marginBottom: 6 }} />
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', maxHeight: 160, overflowY: 'auto' }}>
            {filteredEmps.map(e => (
              <button key={e} onClick={() => { setSelected(e); setSearch(e) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.8125rem',
                  background: selected === e ? '#fff7ed' : 'transparent',
                  color: selected === e ? '#E8622A' : '#374151',
                  fontWeight: selected === e ? 600 : 400,
                  border: 'none', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <Avatar name={e} size={22} />
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={LBL}>Assignment Date <span style={{ color: '#dc2626' }}>*</span></label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={FIELD} />
        </div>
        <div>
          <label style={LBL}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Assignment notes…" style={{ ...FIELD, resize: 'none', lineHeight: 1.55 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
          <button onClick={onClose} className="btn btn-primary btn-sm" style={{ flex: 2 }}>Assign Asset</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — ASSIGNED TO EMPLOYEES
───────────────────────────────────────────────────────────── */
const DEPT_MAP: Record<string, string> = {
  'Arjun Patel': 'Engineering', 'Priya Sharma': 'HR', 'Rahul Kumar (Manager)': 'Management',
  'Vivek Sharma': 'Finance', 'Vikram Nair (Sales Head)': 'Sales', 'Anita Verma': 'Operations',
  'Deepika Sharma': 'Engineering', 'Rajesh Kumar': 'Support',
}

function AssignedTab() {
  const assigned = ASSETS.filter(a => a.assignedTo !== null)
  const grouped = useMemo(() => {
    const map: Record<string, Asset[]> = {}
    assigned.forEach(a => { const k = a.assignedTo!; if (!map[k]) map[k] = []; map[k].push(a) })
    return map
  }, [assigned])

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {['Employee', 'Department', 'Assets', 'Asset List', 'Total Value', 'Actions'].map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([emp, assets]) => {
            const total = assets.reduce((s, a) => s + a.purchaseValue, 0)
            const c = CAT_CFG
            return (
              <tr key={emp}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={emp} size={34} />
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{emp}</span>
                  </div>
                </td>
                <td style={{ color: '#374151' }}>{DEPT_MAP[emp] ?? 'General'}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#E8622A', fontSize: '0.75rem', fontWeight: 700 }}>
                    {assets.length}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {assets.map(a => {
                      const cfg = c[a.category]
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
                  <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                    <Eye size={12} /> View All
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null)

  const totalAssets     = ASSETS.length
  const assignedCount   = ASSETS.filter(a => a.status === 'Assigned').length
  const availableCount  = ASSETS.filter(a => a.status === 'Available').length
  const maintenanceCount = ASSETS.filter(a => a.status === 'Maintenance').length

  const filtered = useMemo(() => ASSETS.filter(a => {
    const q = search.toLowerCase()
    return (!q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)) &&
      (catFilter === 'All' || a.category === catFilter) &&
      (statusFilter === 'All' || a.status === statusFilter)
  }), [search, catFilter, statusFilter])

  const TABS = [
    { key: 'inventory' as const, label: 'Asset Inventory',      count: ASSETS.length },
    { key: 'assigned'  as const, label: 'Assigned to Employees', count: assignedCount },
  ]

  return (
    <>
      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} />}
      {assignAsset  && <AssignModal asset={assignAsset} onClose={() => setAssignAsset(null)} />}

      <Topbar
        title="Asset Management"
        subtitle="Track and manage company-owned assets"
        notificationCount={maintenanceCount}
      >
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Asset
        </button>
      </Topbar>

      <div style={{ padding: '28px 28px 56px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {([
            { label: 'Total Assets',      value: totalAssets,     icon: Package,   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Assigned',          value: assignedCount,   icon: UserCheck, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Available',         value: availableCount,  icon: Box,       color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Under Maintenance', value: maintenanceCount,icon: Wrench,    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
          ] as { label: string; value: number; icon: React.ElementType; color: string; bg: string; border: string }[]).map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className="card card-interactive" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Main card */}
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
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                    background: active ? '#dbeafe' : '#f1f5f9',
                    color: active ? '#1d4ed8' : '#9ca3af',
                  }}>{t.count}</span>
                </button>
              )
            })}
          </div>

          {/* Inventory tab */}
          {activeTab === 'inventory' && (
            <>
              {/* Filter bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #f8fafc', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', background: '#f9fafb' }}>
                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search asset name or code…"
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#374151', width: '100%', fontFamily: 'inherit' }} />
                </div>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="form-select">
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select">
                  <option value="All">All Status</option>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>{filtered.length} assets</span>
              </div>

              {/* Table */}
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
                      const sCfg = STATUS_CFG[asset.status]
                      const cCfg = COND_CFG[asset.condition]
                      const catCfg = CAT_CFG[asset.category]
                      return (
                        <tr key={asset.code}>
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
                            <p style={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem', margin: 0 }}>{asset.brand}</p>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{asset.serial}</p>
                          </td>
                          <td style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{asset.purchaseDate}</td>
                          <td style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{fmt(asset.purchaseValue)}</td>
                          <td>
                            {asset.assignedTo ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Avatar name={asset.assignedTo} size={24} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>{asset.assignedTo}</span>
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
                            <div style={{ display: 'flex', gap: 2 }}>
                              {asset.status === 'Available' && (
                                <button onClick={() => setAssignAsset(asset)} title="Assign" className="btn btn-ghost btn-sm btn-icon" style={{ color: '#15803d' }}>
                                  <UserCheck size={13} />
                                </button>
                              )}
                              {asset.status === 'Assigned' && (
                                <button title="Unassign" className="btn btn-ghost btn-sm btn-icon" style={{ color: '#b45309' }}>
                                  <LogOut size={13} />
                                </button>
                              )}
                              {asset.status === 'Maintenance' && (
                                <button title="Mark Available" className="btn btn-ghost btn-sm btn-icon" style={{ color: '#1d4ed8' }}>
                                  <RotateCcw size={13} />
                                </button>
                              )}
                              <button title="Edit" className="btn btn-ghost btn-sm btn-icon">
                                <Edit2 size={13} />
                              </button>
                              <button title="Retire" className="btn btn-ghost btn-sm btn-icon" style={{ color: '#dc2626' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <Package size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>No assets found</p>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Assigned tab */}
          {activeTab === 'assigned' && <AssignedTab />}

        </div>
      </div>
    </>
  )
}
