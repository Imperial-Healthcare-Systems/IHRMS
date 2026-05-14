'use client'

/**
 * Admin: Team Attendance settings — per-tenant manager-grid configuration.
 *
 * Per admin-hookup.md §2. Backed by /api/tenant-attendance-settings (GET, PATCH).
 * Validates pinned codes against live leave_types via the server-side
 * validate_pinned_codes() RPC.
 */
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { AlertCircle, CheckCircle2, GripVertical, Loader2, Save, X } from 'lucide-react'

type Settings = {
  org_id: string
  pinned_codes: string[]
  weekly_off_days: number[]
  flag_absent_at: number
  flag_punch_miss_at: number
  fiscal_year_start: number
}

type LeaveType = {
  id: string
  code: string
  label: string
  letter: string | null
  color_hex: string
  is_active: boolean
  display_order: number
}

const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MAX_PINNED = 6

export default function TeamAttendanceSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [sRes, ltRes] = await Promise.all([
        fetch('/api/tenant-attendance-settings'),
        fetch('/api/leave-types'),
      ])
      const [sJson, ltJson] = await Promise.all([sRes.json(), ltRes.json()])
      if (!sRes.ok) throw new Error(sJson.error ?? 'Settings load failed')
      if (!ltRes.ok) throw new Error(ltJson.error ?? 'Leave types load failed')
      setSettings(sJson.data as Settings)
      setLeaveTypes((ltJson.data as LeaveType[]).filter(l => l.is_active))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const payload = {
        pinned_codes: settings.pinned_codes,
        weekly_off_days: settings.weekly_off_days,
        flag_absent_at: settings.flag_absent_at,
        flag_punch_miss_at: settings.flag_punch_miss_at,
        fiscal_year_start: settings.fiscal_year_start,
      }
      const res = await fetch('/api/tenant-attendance-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSettings(data.data as Settings)
      setSuccess('Saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function togglePin(code: string) {
    if (!settings) return
    if (settings.pinned_codes.includes(code)) {
      setSettings({ ...settings, pinned_codes: settings.pinned_codes.filter(c => c !== code) })
    } else {
      if (settings.pinned_codes.length >= MAX_PINNED) {
        setError(`You can pin at most ${MAX_PINNED} codes. Unpin one first.`)
        return
      }
      setSettings({ ...settings, pinned_codes: [...settings.pinned_codes, code] })
    }
  }

  function reorderPin(from: number, to: number) {
    if (!settings) return
    const arr = [...settings.pinned_codes]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    setSettings({ ...settings, pinned_codes: arr })
  }

  function toggleWeeklyOff(dow: number) {
    if (!settings) return
    const set = new Set(settings.weekly_off_days)
    if (set.has(dow)) set.delete(dow); else set.add(dow)
    setSettings({ ...settings, weekly_off_days: Array.from(set).sort() })
  }

  return (
    <div>
      <Topbar title="Team Attendance Settings" subtitle="Configure the manager grid for your organisation" />
      <div style={{ padding: '24px 28px', maxWidth: 820, margin: '0 auto' }}>
        {error && (
          <div style={banner('#FEF2F2', '#FECACA', '#991B1B')}>
            <AlertCircle size={15} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
              <X size={14} />
            </button>
          </div>
        )}
        {success && (
          <div style={banner('#ECFDF5', '#A7F3D0', '#047857')}>
            <CheckCircle2 size={15} /> {success}
          </div>
        )}

        {loading || !settings ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 8 }}>Loading…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Pinned aggregate columns */}
            <Section
              title="Pinned aggregate columns"
              description={`Up to ${MAX_PINNED} leave codes show as aggregate columns on the right side of the manager grid. Drag to reorder.`}
            >
              {leaveTypes.length === 0 ? (
                <div style={{ padding: '16px 4px', fontSize: 12.5, color: '#94A3B8' }}>
                  No active leave types yet. <a href="/settings/leave-types" style={{ color: '#E8622A', fontWeight: 600 }}>Create one</a> first.
                </div>
              ) : (
                <>
                  {/* Pinned list (ordered) */}
                  <div style={{ marginBottom: 14 }}>
                    <Label muted>Pinned ({settings.pinned_codes.length} / {MAX_PINNED})</Label>
                    {settings.pinned_codes.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: '#94A3B8', padding: '6px 0' }}>None selected.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                        {settings.pinned_codes.map((code, idx) => {
                          const lt = leaveTypes.find(l => l.code === code)
                          return (
                            <PinRow
                              key={code}
                              code={code}
                              label={lt?.label ?? '(unknown)'}
                              color={lt?.color_hex ?? '#94A3B8'}
                              index={idx}
                              total={settings.pinned_codes.length}
                              onMoveUp={() => reorderPin(idx, idx - 1)}
                              onMoveDown={() => reorderPin(idx, idx + 1)}
                              onRemove={() => togglePin(code)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Available to pin */}
                  <div>
                    <Label muted>Available</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {leaveTypes
                        .filter(lt => !settings.pinned_codes.includes(lt.code))
                        .map(lt => (
                          <button
                            key={lt.code}
                            type="button"
                            onClick={() => togglePin(lt.code)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '6px 11px', borderRadius: 8,
                              border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer',
                              fontSize: 12.5, color: '#475569', fontWeight: 500,
                            }}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: lt.color_hex }} />
                            {lt.code}
                            <span style={{ color: '#94A3B8' }}>{lt.label}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </Section>

            {/* Weekly off */}
            <Section
              title="Weekly off days"
              description="Days the manager grid renders as 'WO' by default when no attendance row exists."
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DOW_LABEL.map((label, dow) => {
                  const on = settings.weekly_off_days.includes(dow)
                  return (
                    <label
                      key={dow}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '7px 12px', borderRadius: 8,
                        border: on ? '1.5px solid #F47920' : '1.5px solid #E2E8F0',
                        background: on ? '#FFF7ED' : '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: 12.5, fontWeight: 600,
                        color: on ? '#C2410C' : '#475569',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleWeeklyOff(dow)}
                        style={{ margin: 0, cursor: 'pointer' }}
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </Section>

            {/* Flag thresholds */}
            <Section title="Flag thresholds" description="When the manager grid marks a row as 'Action needed'.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Flag at absent days ≥">
                  <input
                    type="number" min={0} max={31}
                    value={settings.flag_absent_at}
                    onChange={e => setSettings({ ...settings, flag_absent_at: parseInt(e.target.value || '0', 10) })}
                    style={input(false)}
                  />
                </Field>
                <Field label="Flag at punch-missed days ≥">
                  <input
                    type="number" min={0} max={31}
                    value={settings.flag_punch_miss_at}
                    onChange={e => setSettings({ ...settings, flag_punch_miss_at: parseInt(e.target.value || '0', 10) })}
                    style={input(false)}
                  />
                </Field>
              </div>
            </Section>

            {/* Fiscal year */}
            <Section title="Fiscal year" description="Affects leave-accrual reporting elsewhere; default for India is April.">
              <Field label="Start month">
                <select
                  value={settings.fiscal_year_start}
                  onChange={e => setSettings({ ...settings, fiscal_year_start: parseInt(e.target.value, 10) })}
                  style={{ ...input(false), maxWidth: 200 }}
                >
                  {MONTH_LABEL.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </Field>
            </Section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="submit" disabled={busy} style={btnPrimary(busy)}>
                {busy ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save settings</>}
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── sub-components ──────────────────────────────────────── */

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Outfit', sans-serif" }}>{title}</h3>
        {description && <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', lineHeight: 1.5 }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

function PinRow({
  code, label, color, index, total, onMoveUp, onMoveDown, onRemove,
}: {
  code: string; label: string; color: string
  index: number; total: number
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 9,
      background: '#F8FAFC', border: '1px solid #E2E8F0',
    }}>
      <GripVertical size={14} color="#CBD5E1" />
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <strong style={{ fontSize: 13, color: '#0F172A' }}>{code}</strong>
      <span style={{ fontSize: 12, color: '#64748B' }}>{label}</span>
      <div style={{ flex: 1 }} />
      <button type="button" onClick={onMoveUp} disabled={index === 0} style={miniBtn(index === 0)}>↑</button>
      <button type="button" onClick={onMoveDown} disabled={index === total - 1} style={miniBtn(index === total - 1)}>↓</button>
      <button type="button" onClick={onRemove} style={{ ...miniBtn(false), color: '#A32D2D', borderColor: '#FECACA' }}>×</button>
    </div>
  )
}

function Label({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: muted ? '#94A3B8' : '#374151', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

/* ── styles ──────────────────────────────────────────────── */

function banner(bg: string, border: string, color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    background: bg, border: `1px solid ${border}`, color,
    borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 14,
  }
}

function input(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #E5E7EB', borderRadius: 9,
    fontSize: 13, color: disabled ? '#94A3B8' : '#0F172A',
    background: disabled ? '#F8FAFC' : '#FFFFFF', outline: 'none',
  }
}

const btnPrimary = (busy: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 22px', borderRadius: 9,
  border: 'none', cursor: busy ? 'wait' : 'pointer',
  background: busy ? '#CBD5E1' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)',
  color: '#FFFFFF', fontSize: 13, fontWeight: 700,
})

const miniBtn = (disabled: boolean): React.CSSProperties => ({
  width: 24, height: 24, borderRadius: 6,
  border: '1px solid #E2E8F0', background: disabled ? '#F1F5F9' : '#FFFFFF',
  color: disabled ? '#CBD5E1' : '#475569',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 11, lineHeight: 1,
})
