'use client'

/**
 * Admin: Leave Types — manage the tenant-configured leave taxonomy.
 *
 * Per admin-hookup.md §1. Backed by the existing /api/leave-types CRUD.
 * Per spec, leave codes are tenant data — never hardcoded. The four
 * system codes (P/A/PM/WO) are reserved at the API layer.
 */
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  AlertCircle, CheckCircle2, Edit3, Eye, EyeOff, Loader2, Plus, Trash2, X,
} from 'lucide-react'

type LeaveType = {
  id: string
  code: string
  label: string
  letter: string | null
  color_hex: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

type FormState = {
  code: string
  label: string
  letter: string
  color_hex: string
  display_order: number
}

const RESERVED = new Set(['P', 'A', 'PM', 'WO'])

const PRESET_COLORS = [
  '#185FA5', '#378ADD', '#3C3489', '#7F77DD',
  '#A05195', '#854F0B', '#BA7517', '#0E7C66',
  '#A32D2D', '#3B6D11',
]

export default function LeaveTypesPage() {
  const [list, setList] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/leave-types')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setList(data.data as LeaveType[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setEditId(null); setForm(emptyForm()); setShowForm(true); setError(''); setSuccess('')
  }

  function openEdit(lt: LeaveType) {
    setEditId(lt.id)
    setForm({
      code: lt.code,
      label: lt.label,
      letter: lt.letter ?? '',
      color_hex: lt.color_hex,
      display_order: lt.display_order,
    })
    setShowForm(true); setError(''); setSuccess('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setBusy(true)

    try {
      const payload: Record<string, unknown> = {
        label: form.label.trim(),
        letter: form.letter.trim() ? form.letter.trim().toUpperCase().slice(0, 1) : null,
        color_hex: form.color_hex.toUpperCase(),
        display_order: form.display_order,
      }
      let res: Response
      if (editId) {
        res = await fetch(`/api/leave-types/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        const code = form.code.trim().toUpperCase()
        if (RESERVED.has(code)) {
          throw new Error(`"${code}" is reserved as a system status code`)
        }
        res = await fetch('/api/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, code }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSuccess(editId ? 'Leave type updated.' : 'Leave type created.')
      setShowForm(false)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActive(lt: LeaveType) {
    setBusy(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/leave-types/${lt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !lt.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setSuccess(lt.is_active ? `Deactivated ${lt.code}.` : `Reactivated ${lt.code}.`)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(lt: LeaveType) {
    if (!confirm(`Deactivate "${lt.code} — ${lt.label}"? Historical attendance records keep working; you can reactivate later.`)) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/leave-types/${lt.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      setSuccess(`${lt.code} deactivated.`)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const displayed = list.filter(lt => showInactive || lt.is_active)

  return (
    <div>
      <Topbar title="Leave Types" subtitle="Configure the leave taxonomy your team uses" />
      <div style={{ padding: '24px 28px', maxWidth: 980, margin: '0 auto' }}>
        {/* Banner reminding admins of the architecture rule */}
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, fontSize: 12.5, color: '#1E3A8A', lineHeight: 1.6,
        }}>
          <strong>System codes are fixed.</strong> P (Present), A (Absent), PM (Punch Missed) and
          WO (Weekly Off) exist for every tenant and cannot be defined here. Everything else —
          casual leave, earned leave, maternity, comp-off — is yours to define.
        </div>

        {error && (
          <div style={banner('#FEF2F2', '#FECACA', '#991B1B')}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div style={banner('#ECFDF5', '#A7F3D0', '#047857')}>
            <CheckCircle2 size={15} /> {success}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 9,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)',
              color: '#FFFFFF', fontSize: 13, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(244,121,32,0.35)',
            }}
          >
            <Plus size={14} /> New leave type
          </button>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{displayed.length} leave type{displayed.length === 1 ? '' : 's'}</span>
        </div>

        {/* List */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: 8 }}>Loading…</div>
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No leave types {showInactive ? '' : 'active'} yet. Click &ldquo;New leave type&rdquo; to add one.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <Th>Code</Th>
                  <Th>Label</Th>
                  <Th>Letter</Th>
                  <Th>Color</Th>
                  <Th>Order</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(lt => (
                  <tr key={lt.id} style={{ borderBottom: '1px solid #F1F5F9', opacity: lt.is_active ? 1 : 0.55 }}>
                    <Td><strong style={{ color: '#0F172A' }}>{lt.code}</strong></Td>
                    <Td>{lt.label}</Td>
                    <Td>
                      {lt.letter ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 16, height: 16, borderRadius: '50%',
                          background: lt.color_hex, color: '#fff',
                          fontSize: 9, fontWeight: 700,
                        }}>{lt.letter}</span>
                      ) : <span style={{ color: '#94A3B8' }}>—</span>}
                    </Td>
                    <Td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: lt.color_hex, border: '1px solid #E2E8F0' }} />
                        <code style={{ fontSize: 11, color: '#64748B' }}>{lt.color_hex}</code>
                      </span>
                    </Td>
                    <Td>{lt.display_order}</Td>
                    <Td>
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 10,
                        color: lt.is_active ? '#15803d' : '#64748b',
                        background: lt.is_active ? '#f0fdf4' : '#f1f5f9',
                      }}>{lt.is_active ? 'Active' : 'Inactive'}</span>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <IconBtn onClick={() => openEdit(lt)} title="Edit">
                          <Edit3 size={13} />
                        </IconBtn>
                        <IconBtn onClick={() => void handleToggleActive(lt)} title={lt.is_active ? 'Deactivate' : 'Reactivate'}>
                          {lt.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                        </IconBtn>
                        <IconBtn onClick={() => void handleDelete(lt)} title="Delete (soft)" danger>
                          <Trash2 size={13} />
                        </IconBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div
          onClick={() => !busy && setShowForm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit}
            style={{
              width: '100%', maxWidth: 480,
              background: '#FFFFFF', borderRadius: 14, padding: '24px 26px',
              boxShadow: '0 24px 50px rgba(15,23,42,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {editId ? 'Edit leave type' : 'New leave type'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <Field label="Code" hint={editId ? 'Code cannot be changed after creation' : 'e.g. CL, EL, ML — uppercase letters and digits only'}>
              <input
                type="text"
                required
                disabled={!!editId}
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) })}
                placeholder="CL"
                style={input(!!editId)}
              />
            </Field>
            <Field label="Label" hint="What employees see — e.g. Casual leave">
              <input
                type="text"
                required
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value.slice(0, 80) })}
                placeholder="Casual leave"
                style={input(false)}
              />
            </Field>
            <Field label="Letter overlay (optional)" hint="Single character shown inside the dot — e.g. C">
              <input
                type="text"
                value={form.letter}
                onChange={e => setForm({ ...form, letter: e.target.value.toUpperCase().slice(0, 1) })}
                placeholder="C"
                style={{ ...input(false), maxWidth: 80 }}
              />
            </Field>
            <Field label="Color" hint="Pick a preset or enter a custom hex">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="color"
                  value={form.color_hex}
                  onChange={e => setForm({ ...form, color_hex: e.target.value.toUpperCase() })}
                  style={{ width: 44, height: 36, padding: 2, border: '1.5px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  required
                  value={form.color_hex}
                  onChange={e => setForm({ ...form, color_hex: e.target.value.toUpperCase() })}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  style={{ ...input(false), maxWidth: 110, fontFamily: 'monospace' }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color_hex: c })}
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: form.color_hex.toUpperCase() === c ? '2px solid #0F172A' : '1px solid #E2E8F0',
                        background: c,
                        cursor: 'pointer',
                      }}
                      aria-label={`Set color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Display order" hint="Lower numbers appear first in the legend">
              <input
                type="number"
                value={form.display_order}
                onChange={e => setForm({ ...form, display_order: parseInt(e.target.value || '100', 10) })}
                style={{ ...input(false), maxWidth: 120 }}
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} style={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={busy} style={btnPrimary(busy)}>
                {busy ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : (editId ? 'Save changes' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────── */

function emptyForm(): FormState {
  return { code: '', label: '', letter: '', color_hex: '#185FA5', display_order: 100 }
}

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
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', borderRadius: 9,
  border: 'none', cursor: busy ? 'wait' : 'pointer',
  background: busy ? '#CBD5E1' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)',
  color: '#FFFFFF', fontSize: 13, fontWeight: 700,
})

const btnSecondary: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 9,
  border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '11px 14px', color: '#374151', fontSize: 13 }}>{children}</td>
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}
function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 6,
        border: '1px solid #E2E8F0', background: '#FFFFFF',
        color: danger ? '#A32D2D' : '#475569',
        cursor: 'pointer',
      }}
    >{children}</button>
  )
}
