'use client'


import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Package,
  UserCheck,
  Box,
  Wrench,
  Search,
  Plus,
  X,
  Edit2,
  ChevronDown,
  Filter,
  Eye,
  LogOut,
  RotateCcw,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AssetStatus = 'Assigned' | 'Available' | 'Maintenance' | 'Disposed'
type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor'
type AssetCategory =
  | 'Laptop'
  | 'Monitor'
  | 'Keyboard'
  | 'Mobile'
  | 'SIM Card'
  | 'Headset'
  | 'Vehicle'
  | 'Other'

interface Asset {
  code: string
  name: string
  category: AssetCategory
  brand: string
  serial: string
  purchaseDate: string
  purchaseValue: number
  assignedTo: string | null
  condition: AssetCondition
  status: AssetStatus
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const ASSETS: Asset[] = [
  { code: 'AST/2024/001', name: 'Dell Latitude 5520 Laptop', category: 'Laptop', brand: 'Dell', serial: 'L2024-001', purchaseDate: 'Jan 2024', purchaseValue: 75000, assignedTo: 'Arjun Patel', condition: 'Good', status: 'Assigned' },
  { code: 'AST/2024/002', name: 'HP EliteBook 840 Laptop', category: 'Laptop', brand: 'HP', serial: 'E2024-002', purchaseDate: 'Jan 2024', purchaseValue: 82000, assignedTo: 'Priya Sharma', condition: 'Good', status: 'Assigned' },
  { code: 'AST/2024/003', name: 'MacBook Pro 14"', category: 'Laptop', brand: 'Apple', serial: 'M2024-003', purchaseDate: 'Mar 2024', purchaseValue: 165000, assignedTo: 'Rahul Kumar (Manager)', condition: 'Excellent', status: 'Assigned' },
  { code: 'AST/2024/004', name: 'Dell P2422H Monitor (24")', category: 'Monitor', brand: 'Dell', serial: 'MON-001', purchaseDate: 'Feb 2024', purchaseValue: 18500, assignedTo: null, condition: 'Good', status: 'Available' },
  { code: 'AST/2024/005', name: 'Dell P2422H Monitor (24")', category: 'Monitor', brand: 'Dell', serial: 'MON-002', purchaseDate: 'Feb 2024', purchaseValue: 18500, assignedTo: 'Vivek Sharma', condition: 'Good', status: 'Assigned' },
  { code: 'AST/2024/006', name: 'Logitech MX Keys Keyboard', category: 'Keyboard', brand: 'Logitech', serial: 'KB-001', purchaseDate: 'Mar 2024', purchaseValue: 8500, assignedTo: null, condition: 'Excellent', status: 'Available' },
  { code: 'AST/2024/007', name: 'Lenovo ThinkPad Laptop', category: 'Laptop', brand: 'Lenovo', serial: 'T2024-007', purchaseDate: 'Apr 2024', purchaseValue: 68000, assignedTo: null, condition: 'Fair', status: 'Maintenance' },
  { code: 'AST/2024/008', name: 'iPhone 13 (Corporate)', category: 'Mobile', brand: 'Apple', serial: 'IP-001', purchaseDate: 'May 2024', purchaseValue: 72000, assignedTo: 'Vikram Nair (Sales Head)', condition: 'Excellent', status: 'Assigned' },
  { code: 'AST/2024/009', name: 'Airtel SIM Card (Work)', category: 'SIM Card', brand: 'Airtel', serial: 'SIM-001', purchaseDate: 'Jan 2024', purchaseValue: 500, assignedTo: 'Anita Verma', condition: 'Good', status: 'Assigned' },
  { code: 'AST/2024/010', name: 'Bose QC45 Headset', category: 'Headset', brand: 'Bose', serial: 'BH-001', purchaseDate: 'Jun 2024', purchaseValue: 32000, assignedTo: null, condition: 'Excellent', status: 'Available' },
  { code: 'AST/2024/011', name: 'Maruti Ertiga (Company Car)', category: 'Vehicle', brand: 'Maruti', serial: 'MH12AB1234', purchaseDate: 'Aug 2023', purchaseValue: 950000, assignedTo: null, condition: 'Good', status: 'Available' },
  { code: 'AST/2024/012', name: 'Dell Latitude 5530 Laptop', category: 'Laptop', brand: 'Dell', serial: 'L2024-012', purchaseDate: 'Jul 2024', purchaseValue: 78000, assignedTo: 'Deepika Sharma', condition: 'Good', status: 'Assigned' },
  { code: 'AST/2024/013', name: 'Samsung Galaxy A54 (Work)', category: 'Mobile', brand: 'Samsung', serial: 'SAM-013', purchaseDate: 'Aug 2024', purchaseValue: 35000, assignedTo: 'Rajesh Kumar', condition: 'Fair', status: 'Assigned' },
  { code: 'AST/2024/014', name: 'Cisco IP Phone 7841', category: 'Other', brand: 'Cisco', serial: 'PHONE-001', purchaseDate: 'Jan 2024', purchaseValue: 12000, assignedTo: null, condition: 'Fair', status: 'Maintenance' },
  { code: 'AST/2024/015', name: 'External SSD 1TB (WD)', category: 'Other', brand: 'Western Digital', serial: 'SSD-001', purchaseDate: 'Sep 2024', purchaseValue: 7500, assignedTo: null, condition: 'Excellent', status: 'Available' },
]

const CATEGORIES: AssetCategory[] = ['Laptop', 'Monitor', 'Keyboard', 'Mobile', 'SIM Card', 'Headset', 'Vehicle', 'Other']
const STATUSES: AssetStatus[] = ['Assigned', 'Available', 'Maintenance', 'Disposed']
const CONDITIONS: AssetCondition[] = ['Excellent', 'Good', 'Fair', 'Poor']

/* ─────────────────────────────────────────────────────────────
   BADGE HELPERS
───────────────────────────────────────────────────────────── */
function categoryBadge(cat: AssetCategory) {
  const map: Record<AssetCategory, { bg: string; color: string }> = {
    Laptop: { bg: '#EFF6FF', color: '#1D4ED8' },
    Monitor: { bg: '#ECFEFF', color: '#0E7490' },
    Keyboard: { bg: '#F8FAFC', color: '#475569' },
    Mobile: { bg: '#F5F3FF', color: '#7C3AED' },
    'SIM Card': { bg: '#F0FDF4', color: '#15803D' },
    Headset: { bg: '#FFF7ED', color: '#C2410C' },
    Vehicle: { bg: '#FFFBEB', color: '#B45309' },
    Other: { bg: '#F1F5F9', color: '#475569' },
  }
  const s = map[cat]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {cat}
    </span>
  )
}

function statusBadge(status: AssetStatus) {
  const map: Record<AssetStatus, { bg: string; color: string }> = {
    Assigned: { bg: '#F0FDF4', color: '#15803D' },
    Available: { bg: '#EFF6FF', color: '#1D4ED8' },
    Maintenance: { bg: '#FFFBEB', color: '#B45309' },
    Disposed: { bg: '#FEF2F2', color: '#DC2626' },
  }
  const s = map[status]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function conditionBadge(cond: AssetCondition) {
  const map: Record<AssetCondition, { bg: string; color: string }> = {
    Excellent: { bg: '#F0FDF4', color: '#15803D' },
    Good: { bg: '#EFF6FF', color: '#1D4ED8' },
    Fair: { bg: '#FFFBEB', color: '#B45309' },
    Poor: { bg: '#FEF2F2', color: '#DC2626' },
  }
  const s = map[cond]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {cond}
    </span>
  )
}

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

/* ─────────────────────────────────────────────────────────────
   ADD ASSET MODAL
───────────────────────────────────────────────────────────── */
function AddAssetModal({ onClose }: { onClose: () => void }) {
  const nextCode = 'AST/2024/016'
  const [form, setForm] = useState({
    code: nextCode, name: '', category: 'Laptop', brand: '', model: '', serial: '',
    purchaseDate: '', purchaseValue: '', condition: 'Good', notes: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="text-lg font-bold text-gray-900">Add New Asset</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Code</label>
              <input value={form.code} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dell Latitude 5520" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Dell" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Model number" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Serial Number</label>
              <input value={form.serial} onChange={e => set('serial', e.target.value)} placeholder="e.g. L2024-001" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Value (₹)</label>
              <input type="number" value={form.purchaseValue} onChange={e => set('purchaseValue', e.target.value)} placeholder="e.g. 75000" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Condition</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any additional notes about this asset..." className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" style={{ borderColor: '#E2E8F0' }} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border hover:bg-gray-50" style={{ borderColor: '#E2E8F0' }}>Cancel</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#E8622A' }}>Add Asset</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ASSIGN ASSET MODAL
───────────────────────────────────────────────────────────── */
const EMPLOYEES = [
  'Arjun Patel', 'Priya Sharma', 'Rahul Kumar', 'Vivek Sharma', 'Anita Verma',
  'Vikram Nair', 'Deepika Sharma', 'Rajesh Kumar', 'Sunita Reddy', 'Mohan Das',
]

function AssignModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const filtered = EMPLOYEES.filter(e => e.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Asset</h2>
            <p className="text-xs text-gray-500">{asset.code} — {asset.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Select Employee *</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 mb-1" style={{ borderColor: '#E2E8F0' }} />
            <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto" style={{ borderColor: '#E2E8F0' }}>
              {filtered.map(e => (
                <button key={e} onClick={() => { setSelected(e); setSearch(e) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${selected === e ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-700'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assignment Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" style={{ borderColor: '#E2E8F0' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Assignment notes..." className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" style={{ borderColor: '#E2E8F0' }} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border hover:bg-gray-50" style={{ borderColor: '#E2E8F0' }}>Cancel</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#E8622A' }}>Assign</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — ASSIGNED TO EMPLOYEES
───────────────────────────────────────────────────────────── */
function AssignedToEmployeesTab() {
  const assigned = ASSETS.filter(a => a.assignedTo !== null)
  const grouped = useMemo(() => {
    const map: Record<string, Asset[]> = {}
    assigned.forEach(a => {
      const key = a.assignedTo!
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return map
  }, [assigned])

  const DEPT_MAP: Record<string, string> = {
    'Arjun Patel': 'Engineering', 'Priya Sharma': 'HR', 'Rahul Kumar (Manager)': 'Management',
    'Vivek Sharma': 'Finance', 'Vikram Nair (Sales Head)': 'Sales', 'Anita Verma': 'Operations',
    'Deepika Sharma': 'Engineering', 'Rajesh Kumar': 'Support',
  }

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            {['Employee', 'Department', 'Assets Count', 'Asset List', 'Total Value', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([emp, assets], i) => {
            const total = assets.reduce((s, a) => s + a.purchaseValue, 0)
            return (
              <tr key={emp} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #E8622A, #F59E0B)' }}>
                      {emp.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{emp}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{DEPT_MAP[emp] ?? 'General'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white" style={{ background: '#E8622A' }}>{assets.length}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {assets.map(a => (
                      <span key={a.code} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#F1F5F9', color: '#334155' }}>
                        {a.category}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(total)}</td>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors" style={{ borderColor: '#E2E8F0', color: '#475569' }}>
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
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'assigned'>('inventory')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null)

  const totalAssets = ASSETS.length
  const assignedCount = ASSETS.filter(a => a.status === 'Assigned').length
  const availableCount = ASSETS.filter(a => a.status === 'Available').length
  const maintenanceCount = ASSETS.filter(a => a.status === 'Maintenance').length

  const filtered = useMemo(() => {
    return ASSETS.filter(a => {
      const q = search.toLowerCase()
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
      const matchCat = catFilter === 'All' || a.category === catFilter
      const matchStatus = statusFilter === 'All' || a.status === statusFilter
      return matchSearch && matchCat && matchStatus
    })
  }, [search, catFilter, statusFilter])

  const summaryCards = [
    { label: 'Total Assets', value: totalAssets, color: '#2563EB', bg: '#EFF6FF', icon: Package },
    { label: 'Assigned', value: assignedCount, color: '#16A34A', bg: '#F0FDF4', icon: UserCheck },
    { label: 'Available', value: availableCount, color: '#D97706', bg: '#FFFBEB', icon: Box },
    { label: 'Under Maintenance', value: maintenanceCount, color: '#DC2626', bg: '#FEF2F2', icon: Wrench },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <Topbar
        title="Asset Management"
        subtitle="Track and manage company-owned assets"
        actions={
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: '#E8622A' }}>
            <Plus size={16} /> Add Asset
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-xl p-5 flex items-center gap-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
                  <Icon size={22} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#F1F5F9' }}>
          {(['inventory', 'assigned'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab ? { background: '#FFFFFF', color: '#E8622A', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#64748B' }}
            >
              {tab === 'inventory' ? 'Asset Inventory' : 'Assigned to Employees'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' ? (
          <div className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Filters */}
            <div className="px-5 py-4 flex flex-wrap items-center gap-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div className="flex items-center gap-2 flex-1 min-w-[200px] border rounded-lg px-3 py-2" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search asset name or code..." className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 w-full" />
              </div>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <Filter size={14} className="text-gray-400" />
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-transparent outline-none text-sm text-gray-700">
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <Filter size={14} className="text-gray-400" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent outline-none text-sm text-gray-700">
                  <option value="All">All Status</option>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <span className="text-xs text-gray-400 font-medium">{filtered.length} assets</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Asset Code', 'Asset Name', 'Category', 'Brand / Serial', 'Purchase Date', 'Value', 'Assigned To', 'Condition', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset, i) => (
                    <tr key={asset.code} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{asset.code}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px]">
                        <span className="truncate block">{asset.name}</span>
                      </td>
                      <td className="px-4 py-3">{categoryBadge(asset.category)}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{asset.brand}</div>
                        <div className="text-xs text-gray-400 font-mono">{asset.serial}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{asset.purchaseDate}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(asset.purchaseValue)}</td>
                      <td className="px-4 py-3">
                        {asset.assignedTo ? (
                          <span className="text-gray-800 text-xs font-medium">{asset.assignedTo}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Available</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{conditionBadge(asset.condition)}</td>
                      <td className="px-4 py-3">{statusBadge(asset.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {asset.status === 'Available' && (
                            <button onClick={() => setAssignAsset(asset)} title="Assign" className="p-1.5 rounded-lg hover:bg-green-50 hover:text-green-700 text-gray-400 transition-colors">
                              <UserCheck size={14} />
                            </button>
                          )}
                          {asset.status === 'Assigned' && (
                            <button title="Unassign" className="p-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-700 text-gray-400 transition-colors">
                              <LogOut size={14} />
                            </button>
                          )}
                          {asset.status === 'Maintenance' && (
                            <button title="Mark Available" className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-gray-400 transition-colors">
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button title="Edit" className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-gray-400 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button title="Retire" className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No assets found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <AssignedToEmployeesTab />
        )}
      </div>

      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} />}
      {assignAsset && <AssignModal asset={assignAsset} onClose={() => setAssignAsset(null)} />}
    </div>
  )
}
