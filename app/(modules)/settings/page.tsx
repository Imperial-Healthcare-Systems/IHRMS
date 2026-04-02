'use client'


import { useState } from 'react'
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
  Wifi,
  WifiOff,
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

/* ─────────────────────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────────────────────── */
const NAV_ITEMS: { key: Panel; label: string; icon: React.ElementType }[] = [
  { key: 'company', label: 'Company Profile', icon: Building2 },
  { key: 'leave', label: 'Leave Configuration', icon: Calendar },
  { key: 'payroll', label: 'Payroll Settings', icon: IndianRupee },
  { key: 'working', label: 'Working Hours', icon: Clock },
  { key: 'approval', label: 'Approval Workflows', icon: GitBranch },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'integrations', label: 'Integrations', icon: Plug },
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

function SaveButton({ label = 'Save Changes', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '9px 18px',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      <Save style={{ width: 15, height: 15 }} />
      {label}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: COMPANY PROFILE
───────────────────────────────────────────────────────────── */
function CompanyProfilePanel() {
  const [form, setForm] = useState({
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
  })

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
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-gray-300)')}
          >
            <Upload style={{ width: 28, height: 28, color: 'var(--color-gray-400)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', margin: 0 }}>Click to upload company logo</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>PNG, JPG or SVG up to 2MB. Recommended: 200×80px</p>
          </div>
        </div>
      </div>

      <div>
        <SaveButton label="Save Company Profile" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: LEAVE CONFIGURATION
───────────────────────────────────────────────────────────── */
const LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave', days: '12', carryFwd: '0', accrual: 'Monthly', paid: 'Yes', encashable: 'No' },
  { code: 'SL', name: 'Sick Leave', days: '12', carryFwd: '3', accrual: 'Monthly', paid: 'Yes', encashable: 'No' },
  { code: 'EL', name: 'Earned Leave', days: '18', carryFwd: '30', accrual: 'Monthly', paid: 'Yes', encashable: 'Yes' },
  { code: 'LOP', name: 'Loss of Pay', days: '—', carryFwd: '—', accrual: '—', paid: 'No', encashable: 'No' },
  { code: 'ML', name: 'Maternity Leave', days: '182', carryFwd: '0', accrual: 'Upfront', paid: 'Yes', encashable: 'No' },
  { code: 'PL', name: 'Paternity Leave', days: '15', carryFwd: '0', accrual: 'Upfront', paid: 'Yes', encashable: 'No' },
  { code: 'CompOff', name: 'Compensatory Off', days: '—', carryFwd: '2', accrual: 'On approval', paid: 'Yes', encashable: 'No' },
  { code: 'Bereavement', name: 'Bereavement Leave', days: '3', carryFwd: '0', accrual: 'On event', paid: 'Yes', encashable: 'No' },
]

function LeaveConfigPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader title="Leave Configuration" description="Configure leave types, entitlements and policies" />
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Add Leave Type
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              {['Code', 'Leave Name', 'Annual Days', 'Carry Fwd Max', 'Accrual', 'Paid', 'Encashable', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEAVE_TYPES.map((lt, i) => (
              <tr key={lt.code} style={{ borderBottom: i < LEAVE_TYPES.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem' }}>{lt.code}</span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--color-gray-900)' }}>{lt.name}</td>
                <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>{lt.days}</td>
                <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>{lt.carryFwd}</td>
                <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>{lt.accrual}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: lt.paid === 'Yes' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{lt.paid}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: lt.encashable === 'Yes' ? '#16a34a' : '#6b7280', fontWeight: 500 }}>{lt.encashable}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}>
                    <Edit2 style={{ width: 13, height: 13 }} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NoteBlock text="Changes to leave policies will take effect from next accrual cycle. Current leave balances will not be altered retroactively." />
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
                  <input type="radio" name="payCycle" value={c} checked={payCycle === c} onChange={() => setPayCycle(c)} style={{ accentColor: '#2563eb' }} />
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
                  <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} style={{ accentColor: '#2563eb', width: 15, height: 15 }} />
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
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#2563eb', padding: '2px 10px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 500 }}>
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

      <div><SaveButton label="Save Payroll Settings" /></div>
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
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
            <Plus style={{ width: 13, height: 13 }} /> Add Shift
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
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                      <Edit2 style={{ width: 13, height: 13 }} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div><SaveButton label="Save Working Hours" /></div>
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
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 }}>{w.l1}</span>
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
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
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

      <div><SaveButton label="Save Notification Preferences" /></div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL: USER MANAGEMENT
───────────────────────────────────────────────────────────── */
const ADMIN_USERS = [
  { name: 'Deepa Srinivas', empId: 'EMP/2022/001', role: 'Super Admin', roleColor: '#dc2626', roleBg: '#fef2f2', dept: 'HR', lastLogin: '2 hours ago', status: 'Active', canDeactivate: true },
  { name: 'Anita Verma', empId: 'EMP/2022/005', role: 'HR Admin', roleColor: '#2563eb', roleBg: '#eff6ff', dept: 'HR', lastLogin: '1 day ago', status: 'Active', canDeactivate: false },
  { name: 'Kiran Reddy', empId: 'EMP/2023/012', role: 'Manager', roleColor: '#16a34a', roleBg: '#f0fdf4', dept: 'Engineering', lastLogin: '3 hours ago', status: 'Active', canDeactivate: false },
  { name: 'Ritu Sharma', empId: 'EMP/2023/019', role: 'HR Admin', roleColor: '#2563eb', roleBg: '#eff6ff', dept: 'HR', lastLogin: '5 hours ago', status: 'Active', canDeactivate: false },
  { name: 'Pradeep Nair', empId: 'EMP/2023/045', role: 'Manager', roleColor: '#16a34a', roleBg: '#f0fdf4', dept: 'Sales', lastLogin: '2 days ago', status: 'Active', canDeactivate: false },
]

const PERM_MODULES = ['Dashboard', 'Employees', 'Recruitment', 'Attendance', 'Leaves', 'Payroll', 'Performance', 'Reports', 'Compliance', 'Settings']

const ROLE_PERMS: Record<string, Record<string, boolean>> = {
  'Super Admin': Object.fromEntries(PERM_MODULES.map((m) => [m, true])),
  'HR Admin': Object.fromEntries(PERM_MODULES.map((m) => [m, m !== 'Settings'])),
  'Operations Head': Object.fromEntries(PERM_MODULES.map((m) => [m, ['Dashboard', 'Attendance', 'Leaves', 'Performance', 'Reports'].includes(m)])),
  'Manager': Object.fromEntries(PERM_MODULES.map((m) => [m, ['Dashboard', 'Attendance', 'Leaves', 'Performance'].includes(m)])),
  'Employee': Object.fromEntries(PERM_MODULES.map((m) => [m, ['Dashboard', 'Attendance', 'Leaves'].includes(m)])),
}

function UserManagementPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <SectionHeader title="User Management" description="Manage admin roles and system access permissions" />

      {/* Admin Users Table */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', margin: 0 }}>Admin Users</h4>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
            <Plus style={{ width: 13, height: 13 }} /> Add User
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              {['User', 'EMP ID', 'Role', 'Department', 'Last Login', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_USERS.map((u, i) => (
              <tr key={u.empId} style={{ borderBottom: i < ADMIN_USERS.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#4338ca', flexShrink: 0 }}>
                      {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--color-gray-600)', fontFamily: 'monospace' }}>{u.empId}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: u.roleBg, color: u.roleColor, padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>{u.dept}</td>
                <td style={{ padding: '12px 16px', color: 'var(--color-gray-500)' }}>{u.lastLogin}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: '0.75rem', fontWeight: 500 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    {u.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Edit2 style={{ width: 13, height: 13 }} /> Edit
                    </button>
                    {u.canDeactivate && (
                      <button style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>Deactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Permissions Matrix */}
      <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-200)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-gray-800)', margin: 0 }}>Role Permissions Matrix</h4>
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
              {Object.entries(ROLE_PERMS).map(([role, perms], i, arr) => (
                <tr key={role} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--color-gray-800)' }}>{role}</td>
                  {PERM_MODULES.map((m) => (
                    <td key={m} style={{ padding: '11px 10px', textAlign: 'center' }}>
                      {perms[m]
                        ? <CheckCircle2 style={{ width: 17, height: 17, color: '#22c55e', display: 'inline-block' }} />
                        : <XCircle style={{ width: 17, height: 17, color: '#e5e7eb', display: 'inline-block' }} />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
      { label: 'Connect Teams', variant: 'primary', color: '#2563eb' },
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
                    background: btn.variant === 'outline' ? '#fff' : (btn.color ?? '#2563eb'),
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
   PAGE
───────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activePanel, setActivePanel] = useState<Panel>('company')

  const renderPanel = () => {
    switch (activePanel) {
      case 'company':       return <CompanyProfilePanel />
      case 'leave':         return <LeaveConfigPanel />
      case 'payroll':       return <PayrollSettingsPanel />
      case 'working':       return <WorkingHoursPanel />
      case 'approval':      return <ApprovalWorkflowsPanel />
      case 'notifications': return <NotificationsPanel />
      case 'users':         return <UserManagementPanel />
      case 'integrations':  return <IntegrationsPanel />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Topbar title="Settings" subtitle="System Configuration">
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Save style={{ width: 15, height: 15 }} />
          Save Changes
        </button>
      </Topbar>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left Nav */}
        <nav
          style={{
            width: 220,
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
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : 'var(--color-gray-600)',
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
    </div>
  )
}
