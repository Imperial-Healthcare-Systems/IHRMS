'use client'


import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Building2,
  Calendar,
  IndianRupee,
  Clock,
  GitBranch,
  Bell,
  Users,
  Plug,
  Save,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Upload,
  Layers,
  X,
  Play,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type Panel =
  | 'company'
  | 'leave'
  | 'payroll'
  | 'working'
  | 'approval'
  | 'notifications'
  | 'users'
  | 'integrations'
  | 'departments'
  | 'holidays'

/* ─────────────────────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────────────────────── */
const NAV_ITEMS: { key: Panel; label: string; icon: React.ElementType }[] = [
  { key: 'company', label: 'Company Profile', icon: Building2 },
  { key: 'departments', label: 'Departments', icon: Layers },
  { key: 'leave', label: 'Leave Configuration', icon: Calendar },
  { key: 'payroll', label: 'Payroll Settings', icon: IndianRupee },
  { key: 'working', label: 'Working Hours', icon: Clock },
  { key: 'approval', label: 'Approval Workflows', icon: GitBranch },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'holidays', label: 'Holiday Calendar', icon: Calendar },
]

/* ─────────────────────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────────────────────── */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)', margin: 0 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 4 }}>{description}</p>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid var(--color-gray-300)',
        borderRadius: 8,
        fontSize: '0.875rem',
        color: disabled ? 'var(--color-gray-400)' : 'var(--color-gray-900)',
        background: disabled ? 'var(--color-gray-50)' : '#fff',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange?: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 32px 8px 12px',
          border: '1px solid var(--color-gray-300)',
          borderRadius: 8,
          fontSize: '0.875rem',
          color: disabled ? 'var(--color-gray-400)' : 'var(--color-gray-900)',
          background: disabled ? 'var(--color-gray-50)' : '#fff',
          appearance: 'none',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: on ? '#22c55e' : '#d1d5db',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function NoteBlock({ text }: { text: string }) {
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color: '#d97706', fontSize: '0.875rem', fontWeight: 600, flexShrink: 0 }}>Note:</span>
      <p style={{ fontSize: '0.8125rem', color: '#92400e', margin: 0 }}>{text}</p>
    </div>
  )
}

function SaveButton({
  label = 'Save Changes',
  onClick,
  saving = false,
  saved = false,
}: {
  label?: string
  onClick?: () => void
  saving?: boolean
  saved?: boolean
}) {
  return (
    <button
      data-panel-save="true"
      onClick={onClick}
      disabled={saving}
      className="btn btn-primary btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}
    >
      <Save size={14} />
      {saving ? 'Saving…' : saved ? 'Saved!' : label}
    </button>
  )
}

async function saveSettings(key: string, value: unknown): Promise<void> {
  const res = await fetch(`/api/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: string }).error ?? 'Failed to save')
  }
}

async function loadSettings<T>(key: string): Promise<T | null> {
  const res = await fetch(`/api/settings/${key}`)
  if (!res.ok) return null
  const j = await res.json()
  return (j as { data: T | null }).data ?? null
}

/* ─────────────────────────────────────────────────────────────
   PANEL: COMPANY PROFILE
───────────────────────────────────────────────────────────── */
const COMPANY_DEFAULTS = {
  companyName: 'Imperia Technologies Pvt. Ltd.',
  companyCode: 'IMPL',
  industry: 'IT/ITES',
  companySize: '201-500',
  address: '12th Floor, Prestige Tower, MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  cin: 'U72900KA2018PTC123456',
  pan: 'AABCI1234D',
  tan: 'BLRX12345B',
  epf: 'MH/BAN/123456/000',
  esic: '52-00-123456-000',
  fiscalYear: 'April-March',
}

function CompanyProfilePanel() {
  const [form, setForm] = useState(COMPANY_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    loadSettings<typeof COMPANY_DEFAULTS>('company').then((data) => {
      if (data) setForm((f) => ({ ...f, ...data }))
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveSettings('company', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* silent — still show defaults */ }
    finally { setSaving(false) }
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="Company Profile" description="Basic company information and registration details" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
        <div>
          <FieldLabel>Company Name</FieldLabel>
          <Input value={form.companyName} onChange={set('companyName')} />
        </div>
        <div>
          <FieldLabel>Company Code</FieldLabel>
          <Input value={form.companyCode} onChange={set('companyCode')} />
        </div>
        <div>
          <FieldLabel>Industry</FieldLabel>
          <Select
            value={form.industry}
            onChange={set('industry')}
            options={[
              { value: 'IT/ITES', label: 'IT/ITES' },
              { value: 'Manufacturing', label: 'Manufacturing' },
              { value: 'Healthcare', label: 'Healthcare' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Retail', label: 'Retail' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Company Size</FieldLabel>
          <Select
            value={form.companySize}
            onChange={set('companySize')}
            options={[
              { value: '1-50', label: '1–50 employees' },
              { value: '51-200', label: '51–200 employees' },
              { value: '201-500', label: '201–500 employees' },
              { value: '501-1000', label: '501–1000 employees' },
              { value: '1000+', label: '1000+ employees' },
            ]}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FieldLabel>Registered Address</FieldLabel>
          <textarea
            value={form.address}
            onChange={(e) => set('address')(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 8,
              fontSize: '0.875rem',
              color: 'var(--color-gray-900)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input value={form.city} onChange={set('city')} />
          </div>
          <div>
            <FieldLabel>State</FieldLabel>
            <Input value={form.state} onChange={set('state')} />
          </div>
          <div>
            <FieldLabel>Pincode</FieldLabel>
            <Input value={form.pincode} onChange={set('pincode')} />
          </div>
        </div>
        <div>
          <FieldLabel>CIN Number</FieldLabel>
          <Input value={form.cin} onChange={set('cin')} />
        </div>
        <div>
          <FieldLabel>PAN – Company</FieldLabel>
          <Input value={form.pan} onChange={set('pan')} />
        </div>
        <div>
          <FieldLabel>TAN</FieldLabel>
          <Input value={form.tan} onChange={set('tan')} />
        </div>
        <div>
          <FieldLabel>EPF Account No.</FieldLabel>
          <Input value={form.epf} onChange={set('epf')} />
        </div>
        <div>
          <FieldLabel>ESIC Code</FieldLabel>
          <Input value={form.esic} onChange={set('esic')} />
        </div>
        <div>
          <FieldLabel>Fiscal Year</FieldLabel>
          <Select
            value={form.fiscalYear}
            onChange={set('fiscalYear')}
            options={[
              { value: 'April-March', label: 'April–March (India Standard)' },
              { value: 'January-December', label: 'January–December' },
            ]}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FieldLabel>Company Logo</FieldLabel>
          <div
            style={{
              border: '2px dashed var(--color-gray-300)',
              borderRadius: 12,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--color-gray-50)',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1E3A5F')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-gray-300)')}
          >
            <Upload style={{ width: 28, height: 28, color: 'var(--color-gray-400)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', margin: 0 }}>Click to upload company logo</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>PNG, JPG or SVG up to 2MB. Recommended: 200×80px</p>
          </div>
        </div>
      </div>

      <div>
        <SaveButton label="Save Company Profile" onClick={handleSave} saving={saving} saved={saved} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: LEAVE CONFIGURATION
───────────────────────────────────────────────────────────── */
interface LeavePolicyRow {
  code: string
  name: string
  annualDays: number | null
  monthlyRate: number | null
  accrualType: 'monthly' | 'upfront' | 'on_event' | 'none'
  carryFwdMax: number
  paid: boolean
  encashable: boolean
  active: boolean
}

const DEFAULT_LEAVE_POLICY: LeavePolicyRow[] = [
  { code: 'CL',          name: 'Casual Leave',       annualDays: 12,  monthlyRate: null, accrualType: 'monthly',  carryFwdMax: 0,  paid: true,  encashable: false, active: true },
  { code: 'SL',          name: 'Sick Leave',          annualDays: 12,  monthlyRate: null, accrualType: 'monthly',  carryFwdMax: 3,  paid: true,  encashable: false, active: true },
  { code: 'EL',          name: 'Earned Leave',        annualDays: 15,  monthlyRate: 1.25, accrualType: 'monthly',  carryFwdMax: 30, paid: true,  encashable: true,  active: true },
  { code: 'LOP',         name: 'Loss of Pay',         annualDays: null,monthlyRate: null, accrualType: 'none',     carryFwdMax: 0,  paid: false, encashable: false, active: true },
  { code: 'ML',          name: 'Maternity Leave',     annualDays: 182, monthlyRate: null, accrualType: 'upfront',  carryFwdMax: 0,  paid: true,  encashable: false, active: true },
  { code: 'PL',          name: 'Paternity Leave',     annualDays: 15,  monthlyRate: null, accrualType: 'upfront',  carryFwdMax: 0,  paid: true,  encashable: false, active: true },
  { code: 'CompOff',     name: 'Compensatory Off',    annualDays: null,monthlyRate: null, accrualType: 'on_event', carryFwdMax: 2,  paid: true,  encashable: false, active: true },
  { code: 'Bereavement', name: 'Bereavement Leave',   annualDays: 3,   monthlyRate: null, accrualType: 'on_event', carryFwdMax: 0,  paid: true,  encashable: false, active: true },
]

const ACCRUAL_LABELS: Record<string, string> = {
  monthly:  'Monthly',
  upfront:  'Upfront (year start)',
  on_event: 'On Event',
  none:     'N/A',
}

function effectiveMonthlyRate(lt: LeavePolicyRow): string {
  if (lt.accrualType !== 'monthly') return '—'
  const r = lt.monthlyRate !== null ? lt.monthlyRate : (lt.annualDays ? lt.annualDays / 12 : null)
  if (!r) return '—'
  return `${Math.round(r * 100) / 100} days/mo`
}

function LeaveTypeEditModal({
  row, isNew, onClose, onSave,
}: {
  row: LeavePolicyRow; isNew: boolean; onClose: () => void; onSave: (r: LeavePolicyRow) => void
}) {
  const [form, setForm] = useState<LeavePolicyRow>({ ...row })
  const setF = <K extends keyof LeavePolicyRow>(k: K) => (v: LeavePolicyRow[K]) => setForm(f => ({ ...f, [k]: v }))
  const autoRate = form.annualDays ? Math.round(form.annualDays / 12 * 100) / 100 : null
  const displayRate = form.accrualType === 'monthly' ? (form.monthlyRate ?? autoRate) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)', margin: 0 }}>
            {isNew ? 'Add Leave Type' : `Edit — ${row.name}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 14 }}>
            <div>
              <FieldLabel>Code *</FieldLabel>
              <Input value={form.code} onChange={v => setF('code')(v.toUpperCase() as string)} placeholder="CL" disabled={!isNew} />
            </div>
            <div>
              <FieldLabel>Leave Name *</FieldLabel>
              <Input value={form.name} onChange={setF('name')} placeholder="Casual Leave" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <FieldLabel>Annual Days (blank = unlimited)</FieldLabel>
              <Input
                value={form.annualDays !== null ? String(form.annualDays) : ''}
                onChange={v => setF('annualDays')(v === '' ? null : (Number(v) as unknown as null))}
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <FieldLabel>Monthly Rate Override (blank = annual ÷ 12)</FieldLabel>
              <Input
                value={form.monthlyRate !== null ? String(form.monthlyRate) : ''}
                onChange={v => setF('monthlyRate')(v === '' ? null : (Number(v) as unknown as null))}
                placeholder={autoRate ? `auto: ${autoRate}` : 'e.g. 1.25'}
              />
              {displayRate !== null && (
                <p style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: 4 }}>
                  Will accrue {displayRate} days / month
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <FieldLabel>Accrual Type</FieldLabel>
              <Select
                value={form.accrualType}
                onChange={v => setF('accrualType')(v as LeavePolicyRow['accrualType'])}
                options={[
                  { value: 'monthly',  label: 'Monthly (credited each month)' },
                  { value: 'upfront',  label: 'Upfront (all at year start)' },
                  { value: 'on_event', label: 'On Event (comp-off, bereavement)' },
                  { value: 'none',     label: 'None / As Applicable (LOP)' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Carry Forward Max (0 = none)</FieldLabel>
              <Input value={String(form.carryFwdMax)} onChange={v => setF('carryFwdMax')(Number(v) || 0 as unknown as number)} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'var(--color-gray-50)', borderRadius: 10 }}>
            {([['paid', 'Paid Leave'], ['encashable', 'Encashable'], ['active', 'Active']] as [keyof LeavePolicyRow, string][]).map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                <input type="checkbox" checked={!!form[k]} onChange={e => setF(k)(e.target.checked as unknown as LeavePolicyRow[typeof k])} style={{ width: 15, height: 15, accentColor: '#1E3A5F' }} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-gray-200)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button
            onClick={() => {
              if (!form.code.trim() || !form.name.trim()) { alert('Code and Name are required'); return }
              onSave(form)
            }}
            className="btn btn-primary btn-sm"
          >
            {isNew ? 'Add Leave Type' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LeaveConfigPanel() {
  const [policy, setPolicy]       = useState<LeavePolicyRow[]>(DEFAULT_LEAVE_POLICY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [editRow, setEditRow]     = useState<LeavePolicyRow | null>(null)
  const [editIsNew, setEditIsNew] = useState(false)
  const [accruing, setAccruing]   = useState(false)
  const [lastRun, setLastRun]     = useState<string | null>(null)
  const [accrualMsg, setAccrualMsg] = useState('')

  useEffect(() => {
    Promise.all([
      loadSettings<LeavePolicyRow[]>('leave_policy'),
      loadSettings<{ timestamp: string }>('leave_accrual_last_run'),
    ]).then(([pol, run]) => {
      if (Array.isArray(pol) && pol.length) setPolicy(pol)
      if (run?.timestamp) setLastRun(run.timestamp)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await saveSettings('leave_policy', policy)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const handleRunAccrual = async () => {
    if (!confirm('Run monthly accrual now? This will credit leave balances for all active employees based on the saved policy.')) return
    setAccruing(true); setAccrualMsg('')
    try {
      const res = await fetch('/api/leaves/accrue', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Accrual failed')
      const ts = new Date().toISOString()
      setLastRun(ts)
      setAccrualMsg(`Accrual complete — ${j.updatedCount} balance records updated for ${j.employeeCount} employees (${j.month} ${j.year})`)
    } catch (e) {
      setAccrualMsg(e instanceof Error ? e.message : 'Accrual failed')
    } finally { setAccruing(false) }
  }

  const saveEdit = (updated: LeavePolicyRow) => {
    setPolicy(p => editIsNew ? [...p, updated] : p.map(r => r.code === updated.code ? updated : r))
    setEditRow(null); setEditIsNew(false)
  }

  const openAdd = () => {
    setEditIsNew(true)
    setEditRow({ code: '', name: '', annualDays: null, monthlyRate: null, accrualType: 'monthly', carryFwdMax: 0, paid: true, encashable: false, active: true })
  }

  const toggleActive = (code: string) =>
    setPolicy(p => p.map(r => r.code === code ? { ...r, active: !r.active } : r))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <SectionHeader
          title="Leave Policy Configuration"
          description="Define leave types, annual entitlements, and monthly accrual rates. Customisable per company for SaaS deployments."
        />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleRunAccrual}
            disabled={accruing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '0.8125rem', fontWeight: 600, cursor: accruing ? 'not-allowed' : 'pointer', opacity: accruing ? 0.7 : 1 }}
          >
            <Play size={13} />
            {accruing ? 'Running Accrual…' : 'Run Monthly Accrual'}
          </button>
          <button
            onClick={openAdd}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Add Leave Type
          </button>
        </div>
      </div>

      {/* Last run + accrual feedback */}
      {(lastRun || accrualMsg) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lastRun && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', width: 'fit-content' }}>
              <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '0.8rem', color: '#15803d' }}>
                Last accrual: {new Date(lastRun).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          )}
          {accrualMsg && (
            <div style={{ padding: '8px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1d4ed8' }}>
              {accrualMsg}
            </div>
          )}
        </div>
      )}

      {/* Policy table */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              {['Code', 'Leave Name', 'Annual Days', 'Monthly Rate', 'Accrual Type', 'Carry Fwd Max', 'Paid', 'Encash.', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: 'var(--color-gray-400)' }}>Loading policy…</td></tr>
            ) : policy.map((lt, i) => (
              <tr key={lt.code} style={{ borderBottom: i < policy.length - 1 ? '1px solid var(--color-gray-100)' : 'none', opacity: lt.active ? 1 : 0.5 }}>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ background: '#eff6ff', color: '#1E3A5F', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem' }}>{lt.code}</span>
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 500, color: 'var(--color-gray-900)' }}>{lt.name}</td>
                <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{lt.annualDays ?? '—'}</td>
                <td style={{ padding: '11px 14px', color: lt.accrualType === 'monthly' ? '#1d4ed8' : 'var(--color-gray-400)', fontWeight: lt.accrualType === 'monthly' ? 600 : 400 }}>
                  {effectiveMonthlyRate(lt)}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                    background: lt.accrualType === 'monthly' ? '#eff6ff' : lt.accrualType === 'upfront' ? '#f0fdf4' : '#f3f4f6',
                    color:      lt.accrualType === 'monthly' ? '#1d4ed8' : lt.accrualType === 'upfront' ? '#16a34a' : '#6b7280',
                  }}>
                    {ACCRUAL_LABELS[lt.accrualType] ?? lt.accrualType}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{lt.carryFwdMax > 0 ? `${lt.carryFwdMax} days` : '—'}</td>
                <td style={{ padding: '11px 14px', color: lt.paid ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{lt.paid ? 'Yes' : 'No'}</td>
                <td style={{ padding: '11px 14px', color: lt.encashable ? '#16a34a' : '#6b7280', fontWeight: 500 }}>{lt.encashable ? 'Yes' : 'No'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <button
                    onClick={() => toggleActive(lt.code)}
                    style={{ fontSize: '0.72rem', fontWeight: 500, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
                      background: lt.active ? '#f0fdf4' : '#f3f4f6', color: lt.active ? '#16a34a' : '#9ca3af',
                      border: 'none',
                    }}
                  >
                    {lt.active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <button
                    onClick={() => { setEditIsNew(false); setEditRow({ ...lt }) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}
                  >
                    <Edit2 style={{ width: 13, height: 13 }} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <SaveButton label="Save Policy" onClick={handleSave} saving={saving} saved={saved} />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>Save first, then run accrual.</span>
      </div>

      <NoteBlock text="Monthly accrual credits leave balances for all active employees each month. Run it on the 1st of each month or schedule it via your cron/automation. Changes take effect on the next accrual run — existing balances are not retroactively altered." />

      {editRow && (
        <LeaveTypeEditModal row={editRow} isNew={editIsNew} onClose={() => { setEditRow(null); setEditIsNew(false) }} onSave={saveEdit} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: PAYROLL SETTINGS
───────────────────────────────────────────────────────────── */
function PayrollSettingsPanel() {
  const [payCycle, setPayCycle] = useState('Monthly')
  const [processingDay, setProcessingDay] = useState('28')
  const [deliveryEmail, setDeliveryEmail] = useState(true)
  const [deliveryPortal, setDeliveryPortal] = useState(true)
  const [deliveryPhysical, setDeliveryPhysical] = useState(false)
  const [taxRegime, setTaxRegime] = useState('Old Regime')
  const [workingDays, setWorkingDays] = useState('26')
  const [otRate, setOtRate] = useState('1.5')
  const [metroCities, setMetroCities] = useState(['Mumbai', 'Delhi', 'Kolkata', 'Chennai'])
  const [newCity, setNewCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    type P = { payCycle: string; processingDay: string; deliveryEmail: boolean; deliveryPortal: boolean; deliveryPhysical: boolean; taxRegime: string; workingDays: string; otRate: string; metroCities: string[] }
    loadSettings<P>('payroll').then((d) => {
      if (!d) return
      if (d.payCycle)       setPayCycle(d.payCycle)
      if (d.processingDay)  setProcessingDay(d.processingDay)
      if (d.deliveryEmail  !== undefined) setDeliveryEmail(d.deliveryEmail)
      if (d.deliveryPortal !== undefined) setDeliveryPortal(d.deliveryPortal)
      if (d.deliveryPhysical !== undefined) setDeliveryPhysical(d.deliveryPhysical)
      if (d.taxRegime)      setTaxRegime(d.taxRegime)
      if (d.workingDays)    setWorkingDays(d.workingDays)
      if (d.otRate)         setOtRate(d.otRate)
      if (d.metroCities)    setMetroCities(d.metroCities)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await saveSettings('payroll', { payCycle, processingDay, deliveryEmail, deliveryPortal, deliveryPhysical, taxRegime, workingDays, otRate, metroCities })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const removeCity = (city: string) => setMetroCities((c) => c.filter((x) => x !== city))
  const addCity = () => {
    if (newCity.trim()) {
      setMetroCities((c) => [...c, newCity.trim()])
      setNewCity('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <SectionHeader title="Payroll Settings" description="Configure pay cycles, statutory defaults and compensation rules" />

      {/* Pay Cycle */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 16 }}>Pay Cycle</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          <div>
            <FieldLabel>Payroll Cycle</FieldLabel>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Monthly', 'Bi-weekly', 'Weekly'].map((c) => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                  <input type="radio" name="payCycle" value={c} checked={payCycle === c} onChange={() => setPayCycle(c)} style={{ accentColor: '#1E3A5F' }} />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Processing Day of Month</FieldLabel>
            <Select
              value={processingDay}
              onChange={setProcessingDay}
              options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}${[,'st','nd','rd'][Math.min(i+1,3)] || 'th'}` }))}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Payslip Delivery</FieldLabel>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Email', val: deliveryEmail, set: setDeliveryEmail },
                { label: 'Employee Portal', val: deliveryPortal, set: setDeliveryPortal },
                { label: 'Physical Copy', val: deliveryPhysical, set: setDeliveryPhysical },
              ].map(({ label, val, set }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                  <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} style={{ accentColor: '#1E3A5F', width: 15, height: 15 }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* India Statutory Defaults */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 16 }}>India Statutory Defaults</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          <div>
            <FieldLabel>EPF Wage Ceiling</FieldLabel>
            <Input value="₹15,000" disabled />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>Statutory limit as per EPF Act</p>
          </div>
          <div>
            <FieldLabel>ESIC Gross Ceiling</FieldLabel>
            <Input value="₹21,000/month" disabled />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>Statutory limit as per ESIC Act</p>
          </div>
          <div>
            <FieldLabel>Default Tax Regime</FieldLabel>
            <Select
              value={taxRegime}
              onChange={setTaxRegime}
              options={[
                { value: 'Old Regime', label: 'Old Regime' },
                { value: 'New Regime', label: 'New Regime' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* HRA Configuration */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 16 }}>HRA Configuration</h4>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Metro Cities</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, background: '#fff', minHeight: 42 }}>
            {metroCities.map((c) => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1E3A5F', padding: '2px 10px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 500 }}>
                {c}
                <button onClick={() => removeCity(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', lineHeight: 1 }}>×</button>
              </span>
            ))}
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCity()}
              placeholder="Add city…"
              style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', minWidth: 80, flex: 1 }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          <div>
            <FieldLabel>HRA for Metro Cities</FieldLabel>
            <Input value="50% of Basic" disabled />
          </div>
          <div>
            <FieldLabel>HRA for Non-Metro</FieldLabel>
            <Input value="40% of Basic" disabled />
          </div>
        </div>
      </div>

      {/* Other */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 16 }}>Other Settings</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          <div>
            <FieldLabel>Working Days per Month</FieldLabel>
            <Input value={workingDays} onChange={setWorkingDays} />
          </div>
          <div>
            <FieldLabel>OT Rate Multiplier</FieldLabel>
            <Input value={otRate} onChange={setOtRate} />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>× normal rate</p>
          </div>
        </div>
      </div>

      <div><SaveButton label="Save Payroll Settings" onClick={handleSave} saving={saving} saved={saved} /></div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: WORKING HOURS & SHIFTS
───────────────────────────────────────────────────────────── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SHIFTS = [
  { name: 'General Shift', type: 'General', start: '09:00', end: '18:00', breakMin: '60', days: 'Mon–Fri', grace: '15 min' },
  { name: 'Morning Shift', type: 'Morning', start: '07:00', end: '15:00', breakMin: '30', days: 'Mon–Sat', grace: '10 min' },
  { name: 'Night Shift', type: 'Night', start: '22:00', end: '06:00', breakMin: '30', days: 'Mon–Sat', grace: '15 min' },
  { name: 'Flexible', type: 'Flexible', start: 'Flexible', end: '—', breakMin: '60', days: 'Mon–Fri', grace: '30 min' },
]

function WorkingHoursPanel() {
  const [stdHours, setStdHours] = useState('9')
  const [grace, setGrace] = useState('15')
  const [halfDay, setHalfDay] = useState('4')
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    type W = { stdHours: string; grace: string; halfDay: string; workingDays: string[] }
    loadSettings<W>('working').then((d) => {
      if (!d) return
      if (d.stdHours)    setStdHours(d.stdHours)
      if (d.grace)       setGrace(d.grace)
      if (d.halfDay)     setHalfDay(d.halfDay)
      if (d.workingDays) setWorkingDays(d.workingDays)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await saveSettings('working', { stdHours, grace, halfDay, workingDays })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const toggleDay = (d: string) =>
    setWorkingDays((ds) => ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="Working Hours & Shifts" description="Define standard work hours, working days and shift configurations" />

      {/* General Settings */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 16 }}>General Settings</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 24px' }}>
          <div>
            <FieldLabel>Standard Work Hours / Day</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input value={stdHours} onChange={setStdHours} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>hours</span>
            </div>
          </div>
          <div>
            <FieldLabel>Grace Period</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input value={grace} onChange={setGrace} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>min</span>
            </div>
          </div>
          <div>
            <FieldLabel>Half-day If Less Than</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input value={halfDay} onChange={setHalfDay} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Working Days */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 16 }}>Working Days</h4>
        <div style={{ display: 'flex', gap: 10 }}>
          {DAYS.map((d) => {
            const active = workingDays.includes(d)
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  border: `2px solid ${active ? '#22c55e' : 'var(--color-gray-200)'}`,
                  background: active ? '#f0fdf4' : 'var(--color-gray-50)',
                  color: active ? '#16a34a' : 'var(--color-gray-400)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shifts Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', margin: 0 }}>Configured Shifts</h4>
          <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Shift
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                {['Shift Name', 'Type', 'Start', 'End', 'Break', 'Days', 'Grace', 'Edit'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map((s, i) => (
                <tr key={s.name} style={{ borderBottom: i < SHIFTS.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 500, color: 'var(--color-gray-900)' }}>{s.name}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 }}>{s.type}</span>
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{s.start}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{s.end}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{s.breakMin} min</td>
                  <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{s.days}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--color-gray-700)' }}>{s.grace}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                      <Edit2 style={{ width: 13, height: 13 }} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div><SaveButton label="Save Working Hours" onClick={handleSave} saving={saving} saved={saved} /></div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: APPROVAL WORKFLOWS
───────────────────────────────────────────────────────────── */
const WORKFLOWS = [
  { type: 'Leave Requests', l1: 'Reporting Manager', l2: 'Operations Head', escalate: '3 days', override: 'HR Admin' },
  { type: 'Attendance Regularization', l1: 'Reporting Manager', l2: 'HR Admin', escalate: '2 days', override: 'HR Admin' },
  { type: 'Expense Claims', l1: 'Reporting Manager', l2: 'Finance Head', escalate: '3 days', override: 'HR Admin' },
  { type: 'Payroll Approval', l1: 'HR Admin', l2: 'CEO', escalate: 'N/A', override: 'Super Admin' },
  { type: 'Warning Letters', l1: 'HR Admin', l2: 'N/A', escalate: 'N/A', override: 'Super Admin' },
  { type: 'Termination', l1: 'HR Admin', l2: 'CEO', escalate: 'N/A', override: 'Super Admin' },
]

function ApprovalWorkflowsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Approval Workflows" description="Configure multi-level approval chains for HR requests" />

      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              {['Request Type', 'Level 1', 'Level 2', 'Auto-Escalate', 'Override Role', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKFLOWS.map((w, i) => (
              <tr key={w.type} style={{ borderBottom: i < WORKFLOWS.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-gray-900)' }}>{w.type}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#eff6ff', color: '#1E3A5F', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 }}>{w.l1}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {w.l2 !== 'N/A' ? (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 }}>{w.l2}</span>
                  ) : (
                    <span style={{ color: 'var(--color-gray-400)', fontSize: '0.75rem' }}>N/A</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', color: w.escalate === 'N/A' ? 'var(--color-gray-400)' : 'var(--color-gray-700)', fontSize: '0.8125rem' }}>{w.escalate}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 }}>{w.override}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                    <Edit2 style={{ width: 13, height: 13 }} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NoteBlock text="Auto-escalation will reassign pending approvals to the Level 2 approver after the specified days with no action." />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: NOTIFICATIONS
───────────────────────────────────────────────────────────── */
type NotifRow = { label: string; email: boolean; sms: boolean; inApp: boolean }

const INITIAL_NOTIF: NotifRow[] = [
  { label: 'Leave Approval Updates', email: true, sms: false, inApp: true },
  { label: 'Payslip Generated', email: true, sms: false, inApp: true },
  { label: 'Probation Review Due', email: true, sms: false, inApp: true },
  { label: 'Document Expiry Alert', email: true, sms: false, inApp: true },
  { label: 'Statutory Deadline Alert', email: true, sms: false, inApp: false },
  { label: 'New Announcement', email: false, sms: false, inApp: true },
  { label: 'Expense Claim Status', email: true, sms: false, inApp: true },
  { label: 'Attendance Anomaly', email: true, sms: false, inApp: true },
  { label: 'Warning Letter Issued', email: true, sms: true, inApp: true },
  { label: 'Exit Process Update', email: true, sms: false, inApp: true },
]

function NotificationsPanel() {
  const [rows, setRows] = useState<NotifRow[]>(INITIAL_NOTIF)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    loadSettings<NotifRow[]>('notifications').then((data) => {
      if (Array.isArray(data) && data.length) setRows(data)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await saveSettings('notifications', rows)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const toggle = (idx: number, channel: keyof Omit<NotifRow, 'label'>) =>
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, [channel]: !r[channel] } : r))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Notifications" description="Configure which notification channels are active for each event type" />

      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)' }}>Notification Event</th>
              {['Email', 'SMS', 'In-App'].map((h) => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600, color: 'var(--color-gray-600)', width: 100 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                <td style={{ padding: '13px 20px', fontWeight: 500, color: 'var(--color-gray-800)' }}>{r.label}</td>
                <td style={{ padding: '13px 20px', textAlign: 'center' }}><Toggle on={r.email} onChange={() => toggle(i, 'email')} /></td>
                <td style={{ padding: '13px 20px', textAlign: 'center' }}><Toggle on={r.sms} onChange={() => toggle(i, 'sms')} /></td>
                <td style={{ padding: '13px 20px', textAlign: 'center' }}><Toggle on={r.inApp} onChange={() => toggle(i, 'inApp')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div><SaveButton label="Save Notification Preferences" onClick={handleSave} saving={saving} saved={saved} /></div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: USER MANAGEMENT
───────────────────────────────────────────────────────────── */
const PERM_MODULES = ['Dashboard', 'Employees', 'Recruitment', 'Attendance', 'Leaves', 'Payroll', 'Performance', 'Reports', 'Compliance', 'Settings']

const DEFAULT_ROLE_PERMS: Record<string, Record<string, boolean>> = {
  'Super Admin':     Object.fromEntries(PERM_MODULES.map((m) => [m, true])),
  'HR Admin':        Object.fromEntries(PERM_MODULES.map((m) => [m, m !== 'Settings'])),
  'Operations Head': Object.fromEntries(PERM_MODULES.map((m) => [m, ['Dashboard', 'Attendance', 'Leaves', 'Performance', 'Reports'].includes(m)])),
  'Manager':         Object.fromEntries(PERM_MODULES.map((m) => [m, ['Dashboard', 'Attendance', 'Leaves', 'Performance'].includes(m)])),
  'Employee':        Object.fromEntries(PERM_MODULES.map((m) => [m, ['Dashboard', 'Attendance', 'Leaves'].includes(m)])),
}

const ROLE_OPTIONS = [
  { value: 'super_admin',     label: 'Super Admin' },
  { value: 'hr_admin',        label: 'HR Admin' },
  { value: 'operations_head', label: 'Operations Head' },
  { value: 'manager',         label: 'Manager' },
  { value: 'payroll_admin',   label: 'Payroll Admin' },
  { value: 'employee',        label: 'Employee' },
]

function roleDisplay(role: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    super_admin:     { label: 'Super Admin',     color: '#dc2626', bg: '#fef2f2' },
    hr_admin:        { label: 'HR Admin',         color: '#1E3A5F', bg: '#eff6ff' },
    operations_head: { label: 'Operations Head',  color: '#d97706', bg: '#fffbeb' },
    manager:         { label: 'Manager',          color: '#16a34a', bg: '#f0fdf4' },
    payroll_admin:   { label: 'Payroll Admin',    color: '#7c3aed', bg: '#f5f3ff' },
    finance_admin:   { label: 'Finance Admin',    color: '#0891b2', bg: '#ecfeff' },
    employee:        { label: 'Employee',         color: '#6b7280', bg: '#f3f4f6' },
  }
  return map[role] ?? { label: role, color: '#374151', bg: '#f3f4f6' }
}

type AdminUser = {
  id: string
  emp_id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_admin: boolean
  status: string
  department: string
  updated_at: string
}

type SearchResult = { id: string; name: string; emp_id: string; email: string; role: string; is_admin: boolean; department: string }

function UserManagementPanel() {
  const [users, setUsers]               = useState<AdminUser[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  // Add User modal
  const [showAdd, setShowAdd]           = useState(false)
  const [searchQ, setSearchQ]           = useState('')
  const [searchRes, setSearchRes]       = useState<SearchResult[]>([])
  const [searching, setSearching]       = useState(false)
  const [selectedEmp, setSelectedEmp]   = useState<SearchResult | null>(null)
  const [newRole, setNewRole]           = useState('hr_admin')
  const [addSaving, setAddSaving]       = useState(false)
  const [addErr, setAddErr]             = useState('')

  // Edit modal
  const [editUser, setEditUser]         = useState<AdminUser | null>(null)
  const [editRole, setEditRole]         = useState('')
  const [editSaving, setEditSaving]     = useState(false)
  const [editErr, setEditErr]           = useState('')

  // Permissions matrix
  const [perms, setPerms]               = useState(DEFAULT_ROLE_PERMS)
  const [permSaving, setPermSaving]     = useState(false)
  const [permSaved, setPermSaved]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin-users')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to load')
      setUsers(j.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    loadSettings<Record<string, Record<string, boolean>>>('role_permissions').then((d) => {
      if (d && Object.keys(d).length) setPerms(d)
    }).catch(() => {})
  }, [load])

  // Search employees — only fires when no employee is selected
  useEffect(() => {
    if (selectedEmp) return // already selected, don't re-search
    if (!searchQ.trim() || searchQ.length < 2) { setSearchRes([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch('/api/admin-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'search', q: searchQ }),
        })
        const j = await res.json()
        setSearchRes(j.data ?? [])
      } catch { setSearchRes([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, selectedEmp])

  const handleAdd = async () => {
    if (!selectedEmp) { setAddErr('Select an employee first'); return }
    setAddSaving(true); setAddErr('')
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', employee_id: selectedEmp.id, role: newRole }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed')
      setShowAdd(false); setSearchQ(''); setSelectedEmp(null); setNewRole('hr_admin')
      load()
    } catch (e: unknown) {
      setAddErr(e instanceof Error ? e.message : 'Failed')
    } finally { setAddSaving(false) }
  }

  const handleEdit = async () => {
    if (!editUser) return
    setEditSaving(true); setEditErr('')
    try {
      const res = await fetch(`/api/admin-users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, is_admin: editRole !== 'employee' }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed')
      setEditUser(null); load()
    } catch (e: unknown) {
      setEditErr(e instanceof Error ? e.message : 'Failed')
    } finally { setEditSaving(false) }
  }

  const handleDeactivate = async (u: AdminUser) => {
    if (!confirm(`Remove admin access for ${u.first_name} ${u.last_name}?`)) return
    try {
      await fetch(`/api/admin-users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: false }),
      })
      load()
    } catch { /* silent */ }
  }

  const togglePerm = (role: string, mod: string) =>
    setPerms((p) => ({ ...p, [role]: { ...p[role], [mod]: !p[role]?.[mod] } }))

  const handleSavePerms = async () => {
    setPermSaving(true); setPermSaved(false)
    try {
      await saveSettings('role_permissions', perms)
      setPermSaved(true); setTimeout(() => setPermSaved(false), 2500)
    } catch { /* silent */ } finally { setPermSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <SectionHeader title="User Management" description="Manage admin roles and system access permissions" />

      {/* ── Admin Users Table ── */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', margin: 0 }}>
            Admin Users {!loading && <span style={{ color: 'var(--color-gray-400)', fontWeight: 400, fontSize: '0.8125rem' }}>({users.length})</span>}
          </h4>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setSearchQ(''); setSelectedEmp(null); setAddErr('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add User
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 20, color: '#dc2626', fontSize: '0.875rem', background: '#fef2f2', margin: 16, borderRadius: 8 }}>{error}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>No admin users found. Click <strong>Add User</strong> to add one.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                {['User', 'EMP ID', 'Role', 'Department', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rd = roleDisplay(u.role)
                const isActive = (u.status ?? '').toLowerCase() === 'active'
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#4338ca', flexShrink: 0 }}>
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{u.first_name} {u.last_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-gray-600)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{u.emp_id || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: rd.bg, color: rd.color, padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{rd.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>{u.department}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isActive ? '#16a34a' : '#6b7280', fontSize: '0.75rem', fontWeight: 500 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#22c55e' : '#9ca3af', display: 'inline-block' }} />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setEditUser(u); setEditRole(u.role); setEditErr('') }}
                          style={{ color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                        >
                          <Edit2 style={{ width: 13, height: 13 }} /> Edit
                        </button>
                        {u.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDeactivate(u)}
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Role Permissions Matrix ── */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', margin: 0 }}>Role Permissions Matrix</h4>
          <SaveButton label="Save Permissions" onClick={handleSavePerms} saving={permSaving} saved={permSaved} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', minWidth: 160 }}>Role</th>
                {PERM_MODULES.map((m) => (
                  <th key={m} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(perms).map(([role, modPerms], i, arr) => (
                <tr key={role} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--color-gray-800)' }}>{role}</td>
                  {PERM_MODULES.map((m) => (
                    <td key={m} style={{ padding: '11px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => togglePerm(role, m)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'inline-flex' }}
                        title={modPerms?.[m] ? 'Click to revoke' : 'Click to grant'}
                      >
                        {modPerms?.[m]
                          ? <CheckCircle2 style={{ width: 18, height: 18, color: '#22c55e' }} />
                          : <XCircle style={{ width: 18, height: 18, color: '#d1d5db' }} />
                        }
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>Add Admin User</h4>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <FieldLabel>Search Employee</FieldLabel>

                {/* Selected employee badge */}
                {selectedEmp ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#4338ca', flexShrink: 0 }}>
                      {selectedEmp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#15803d' }}>{selectedEmp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>{selectedEmp.emp_id} · {selectedEmp.department}</div>
                    </div>
                    <button
                      onClick={() => { setSelectedEmp(null); setSearchQ(''); setSearchRes([]) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Type name, EMP ID or email…"
                      autoFocus
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {(searchRes.length > 0 || searching) && (
                      <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                        {searching ? (
                          <div style={{ padding: '14px 16px', fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>Searching…</div>
                        ) : searchRes.length === 0 ? (
                          <div style={{ padding: '14px 16px', fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>No employees found</div>
                        ) : searchRes.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => { setSelectedEmp(r); setSearchQ(''); setSearchRes([]) }}
                            style={{ display: 'flex', width: '100%', gap: 10, padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f9fafb' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#4338ca', flexShrink: 0 }}>
                              {r.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-gray-900)' }}>{r.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{r.emp_id} · {r.department}</div>
                            </div>
                            {r.is_admin && (
                              <span style={{ fontSize: '0.7rem', color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, alignSelf: 'center' }}>Admin</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <FieldLabel>Assign Role</FieldLabel>
                <Select value={newRole} onChange={setNewRole} options={ROLE_OPTIONS.filter(r => r.value !== 'employee')} />
              </div>
            </div>

            {addErr && <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '8px 12px' }}>{addErr}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>Cancel</button>
              <button
                onClick={handleAdd}
                disabled={addSaving}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 18px', opacity: addSaving ? 0.7 : 1 }}
              >
                {addSaving ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ── */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>Edit Role</h4>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--color-gray-50)', borderRadius: 8, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#4338ca' }}>
                {editUser.first_name[0]}{editUser.last_name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{editUser.first_name} {editUser.last_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{editUser.emp_id} · {editUser.department}</div>
              </div>
            </div>

            <div>
              <FieldLabel>Role</FieldLabel>
              <Select value={editRole} onChange={setEditRole} options={ROLE_OPTIONS} />
            </div>

            {editErr && <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '8px 12px' }}>{editErr}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditUser(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>Cancel</button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 18px', opacity: editSaving ? 0.7 : 1 }}
              >
                {editSaving ? 'Saving…' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: INTEGRATIONS
───────────────────────────────────────────────────────────── */
type IntegCard = {
  title: string
  connected: boolean
  detail?: { label: string; value: string }[]
  description?: string
  buttons: { label: string; variant: 'primary' | 'outline'; color?: string }[]
}

const INTEGRATIONS: IntegCard[] = [
  {
    title: 'Biometric Integration',
    connected: true,
    detail: [
      { label: 'Device', value: 'ZKTeco F22 Face+Fingerprint' },
      { label: 'Last sync', value: '2 minutes ago' },
    ],
    buttons: [
      { label: 'Test Connection', variant: 'outline' },
      { label: 'Configure', variant: 'primary' },
    ],
  },
  {
    title: 'Tally ERP 9',
    connected: false,
    description: 'Sync payroll data to Tally for accounting',
    buttons: [{ label: 'Connect', variant: 'primary' }],
  },
  {
    title: 'Zoho Books',
    connected: false,
    description: 'Auto-export payroll entries to Zoho Books',
    buttons: [{ label: 'Connect', variant: 'primary' }],
  },
  {
    title: 'Email Gateway (SendGrid)',
    connected: true,
    detail: [
      { label: 'From address', value: 'hr@company.com' },
      { label: 'Last email', value: '15 minutes ago' },
    ],
    buttons: [
      { label: 'Test Email', variant: 'outline' },
      { label: 'Configure', variant: 'primary' },
    ],
  },
  {
    title: 'SMS Gateway (MSG91)',
    connected: true,
    detail: [
      { label: 'Sender ID', value: 'IHRMS' },
      { label: 'Credits', value: '4,250 remaining' },
    ],
    buttons: [
      { label: 'Test SMS', variant: 'outline' },
      { label: 'Configure', variant: 'primary' },
    ],
  },
  {
    title: 'Microsoft Teams / Slack',
    connected: false,
    description: 'Send HR notifications to Teams/Slack channels',
    buttons: [
      { label: 'Connect Teams', variant: 'primary', color: '#1E3A5F' },
      { label: 'Connect Slack', variant: 'primary', color: '#7c3aed' },
    ],
  },
]

function IntegrationsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Integrations" description="Connect third-party services and hardware to IHRMS" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {INTEGRATIONS.map((card) => (
          <div key={card.title} style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-gray-900)', margin: 0 }}>{card.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: card.connected ? '#22c55e' : '#9ca3af', display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: card.connected ? '#16a34a' : '#6b7280' }}>
                  {card.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {card.detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {card.detail.map((d) => (
                  <div key={d.label} style={{ display: 'flex', gap: 6, fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--color-gray-500)' }}>{d.label}:</span>
                    <span style={{ fontWeight: 500, color: 'var(--color-gray-800)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            {card.description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', margin: 0 }}>{card.description}</p>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 'auto' }}>
              {card.buttons.map((btn) => (
                <button
                  key={btn.label}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: btn.variant === 'outline' ? '1px solid var(--color-gray-300)' : 'none',
                    background: btn.variant === 'outline' ? '#fff' : (btn.color ?? '#1E3A5F'),
                    color: btn.variant === 'outline' ? 'var(--color-gray-700)' : '#fff',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   DEPARTMENTS PANEL
───────────────────────────────────────────────────────────── */
type Department = {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

function DepartmentsPanel() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<Department | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({ name: '', code: '' })
  const [formErr, setFormErr]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/departments')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setDepartments(json.data ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', code: '' })
    setFormErr('')
    setShowModal(true)
  }

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setForm({ name: dept.name, code: dept.code })
    setFormErr('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setFormErr('Name and code are required.')
      return
    }
    setSaving(true)
    setFormErr('')
    try {
      const url    = editing ? `/api/departments/${editing.id}` : '/api/departments'
      const method = editing ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), code: form.code.trim().toUpperCase() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      setShowModal(false)
      load()
    } catch (e: any) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (dept: Department) => {
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !dept.is_active }),
      })
      load()
    } catch { /* silent */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)', margin: 0 }}>Departments</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 4 }}>
            Manage your organisation's departments
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Department
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: '0.875rem', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>Loading…</div>
      ) : departments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>
          No departments yet. Click <strong>Add Department</strong> to create the first one.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-50)' }}>
                {['Name', 'Code', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', fontSize: '0.8125rem', borderBottom: '1px solid var(--color-gray-200)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, i) => (
                <tr key={dept.id} style={{ borderBottom: i < departments.length - 1 ? '1px solid var(--color-gray-100)' : 'none', background: '#fff' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-gray-900)', fontWeight: 500 }}>{dept.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-gray-500)', fontFamily: 'monospace' }}>{dept.code}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                      background: dept.is_active ? '#dcfce7' : '#f3f4f6',
                      color: dept.is_active ? '#16a34a' : '#6b7280',
                    }}>
                      {dept.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openEdit(dept)}
                        style={{ background: 'none', border: '1px solid var(--color-gray-300)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-gray-600)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(dept)}
                        style={{ background: 'none', border: `1px solid ${dept.is_active ? '#fca5a5' : '#86efac'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: dept.is_active ? '#dc2626' : '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {dept.is_active ? <><XCircle size={11} /> Deactivate</> : <><CheckCircle2 size={11} /> Activate</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>
                {editing ? 'Edit Department' : 'Add Department'}
              </h4>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <FieldLabel>Department Name *</FieldLabel>
                <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Engineering" />
              </div>
              <div>
                <FieldLabel>Department Code *</FieldLabel>
                <Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="e.g. ENG" />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>Short uppercase code (3–5 chars)</p>
              </div>
            </div>

            {formErr && (
              <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '8px 12px' }}>
                {formErr}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-gray-300)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 18px', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HOLIDAY CALENDAR PANEL
───────────────────────────────────────────────────────────── */
type Holiday = { id: string; name: string; date: string; type: string; description?: string | null }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TYPE_LABELS: Record<string, string> = {
  company: 'Fixed Holiday',
  national: 'National Holiday',
  state: 'State Holiday',
  optional: 'Optional Holiday',
  restricted: 'Restricted Holiday',
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  company:    { bg: '#dbeafe', color: '#1d4ed8' },
  national:   { bg: '#dcfce7', color: '#15803d' },
  state:      { bg: '#fef9c3', color: '#a16207' },
  optional:   { bg: '#fce7f3', color: '#be185d' },
  restricted: { bg: '#f3e8ff', color: '#7e22ce' },
}

function HolidayCalendarPanel() {
  const [year, setYear]           = useState(new Date().getFullYear())
  const [holidays, setHolidays]   = useState<Holiday[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [isAdmin, setIsAdmin]     = useState(false)
  const [form, setForm]           = useState({ name: '', date: '', type: 'company', description: '' })

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      const role = s?.user?.role as string | undefined
      setIsAdmin(['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? ''))
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/holidays?year=${year}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setHolidays(json.data ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name.trim() || !form.date || !form.type) {
      setFormErr('Name, date, and type are required.')
      return
    }
    setSaving(true)
    setFormErr('')
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), date: form.date, type: form.type, description: form.description.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      setShowAdd(false)
      setForm({ name: '', date: '', type: 'company', description: '' })
      load()
    } catch (e: any) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch('/api/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed') }
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  // Group by month
  const byMonth = holidays.reduce<Record<number, Holiday[]>>((acc, h) => {
    const m = new Date(h.date + 'T00:00:00').getMonth()
    ;(acc[m] ??= []).push(h)
    return acc
  }, {})

  const fixed    = holidays.filter(h => ['company', 'national'].includes(h.type))
  const optional = holidays.filter(h => !['company', 'national'].includes(h.type))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)', margin: 0 }}>Holiday Calendar</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: 4 }}>
            IHS company holidays — {fixed.length} fixed, {optional.length} optional
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '6px 28px 6px 10px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}
          >
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAdmin && (
            <button
              onClick={() => { setShowAdd(true); setFormErr('') }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={14} /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Holidays', count: holidays.length, bg: '#f0f4ff', color: '#1E3A5F' },
          { label: 'Fixed', count: fixed.length, bg: '#dbeafe', color: '#1d4ed8' },
          { label: 'Optional', count: optional.length, bg: '#fce7f3', color: '#be185d' },
        ].map(b => (
          <div key={b.label} style={{ padding: '12px 20px', borderRadius: 10, background: b.bg, minWidth: 120 }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: b.color }}>{b.count}</div>
            <div style={{ fontSize: '0.75rem', color: b.color, marginTop: 2 }}>{b.label}</div>
          </div>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Loading...</p>}
      {error   && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}

      {/* Month groups */}
      {!loading && !error && Object.keys(byMonth).sort((a, b) => Number(a) - Number(b)).map(mStr => {
        const m = Number(mStr)
        return (
          <div key={m}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {MONTH_NAMES[m]}
            </div>
            <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <colgroup>
                  <col style={{ width: 110 }} />
                  <col />
                  <col style={{ width: 140 }} />
                  {isAdmin && <col style={{ width: 60 }} />}
                </colgroup>
                <tbody>
                  {byMonth[m].map((h, i) => {
                    const d = new Date(h.date + 'T00:00:00')
                    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
                    const badgeStyle = TYPE_COLORS[h.type] ?? { bg: '#f3f4f6', color: '#374151' }
                    return (
                      <tr key={h.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-gray-100)', background: i % 2 === 0 ? '#fff' : 'var(--color-gray-50)' }}>
                        <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                          {d.getDate()} {MONTH_NAMES[m].slice(0,3)} · {dayName}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-900)' }}>
                          {h.name}
                          {h.description && <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginLeft: 8 }}>{h.description}</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.71rem', fontWeight: 600, background: badgeStyle.bg, color: badgeStyle.color }}>
                            {TYPE_LABELS[h.type] ?? h.type}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleDelete(h.id)}
                              disabled={deleting === h.id}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                            >
                              <X size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {!loading && holidays.length === 0 && !error && (
        <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', textAlign: 'center', padding: 40 }}>No holidays found for {year}.</p>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Holiday</h4>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-500)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <FieldLabel>Holiday Name *</FieldLabel>
                <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Independence Day" />
              </div>
              <div>
                <FieldLabel>Date *</FieldLabel>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>Type *</FieldLabel>
                <Select
                  value={form.type}
                  onChange={v => setForm(f => ({ ...f, type: v }))}
                  options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <Input value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Optional note" />
              </div>
              {formErr && <p style={{ color: '#ef4444', fontSize: '0.8125rem', margin: 0 }}>{formErr}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button onClick={() => setShowAdd(false)} style={{ padding: '8px 18px', border: '1px solid var(--color-gray-300)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 18px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                  {saving ? 'Saving…' : 'Add Holiday'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
// Panels that have a SaveButton — topbar "Save Changes" delegates to it
const SAVEABLE_PANELS: Panel[] = ['company', 'payroll', 'working', 'notifications', 'users']

export default function SettingsPage() {
  const [activePanel, setActivePanel] = useState<Panel>('company')

  const handleTopbarSave = () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-panel-save="true"]')
    btn?.click()
  }

  const renderPanel = () => {
    switch (activePanel) {
      case 'company':       return <CompanyProfilePanel />
      case 'departments':   return <DepartmentsPanel />
      case 'leave':         return <LeaveConfigPanel />
      case 'payroll':       return <PayrollSettingsPanel />
      case 'working':       return <WorkingHoursPanel />
      case 'approval':      return <ApprovalWorkflowsPanel />
      case 'notifications': return <NotificationsPanel />
      case 'users':         return <UserManagementPanel />
      case 'integrations':  return <IntegrationsPanel />
      case 'holidays':      return <HolidayCalendarPanel />
    }
  }

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="System configuration and preferences"
        notificationCount={0}
        actions={
          SAVEABLE_PANELS.includes(activePanel) ? (
            <button
              onClick={handleTopbarSave}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <Save size={14} />
              Save Changes
            </button>
          ) : null
        }
      />

      <div style={{ padding: '16px 16px 56px', gap: 24, alignItems: 'flex-start' }} className="sm:!px-7 flex flex-col lg:flex-row">
        {/* Left Nav */}
        <nav
          className="w-full lg:w-[220px]"
          style={{
            flexShrink: 0,
            background: '#fff',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 12,
            overflow: 'hidden',
            position: 'sticky',
            top: 24,
          }}
        >
          <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = activePanel === key
              return (
                <button
                  key={key}
                  onClick={() => setActivePanel(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? '#f0f4ff' : 'transparent',
                    color: active ? '#1E3A5F' : 'var(--color-gray-600)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-gray-50)' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content Panel */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, padding: 28 }}>
          {renderPanel()}
        </div>
      </div>
    </>
  )
}
