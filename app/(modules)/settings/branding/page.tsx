'use client'

import { useEffect, useRef, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Lock,
  Palette,
  Save,
  Upload,
} from 'lucide-react'

type WhitelabelLevel = 'none' | 'logo' | 'full' | 'custom_domain'

type Branding = {
  org_id: string
  level: WhitelabelLevel
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  primary_color: string | null
  accent_color: string | null
  app_name_hrms: string | null
  app_name_crm: string | null
  email_from_name: string | null
  email_from_addr: string | null
  email_dns_verified: boolean
  custom_domain_hrms: string | null
  custom_domain_crm: string | null
  custom_domain_verified: boolean
  hide_powered_by: boolean
  invoice_logo_url: string | null
  invoice_footer_text: string | null
  pdf_template: string | null
}

const LEVEL_BLURB: Record<WhitelabelLevel, { label: string; bullets: string[]; cta: string | null }> = {
  none: {
    label: 'None',
    bullets: ['Imperial logo and colors are used everywhere.'],
    cta: 'Upgrade to Pro to customise branding.',
  },
  logo: {
    label: 'Logo customisation',
    bullets: ['Upload your logo, dark logo, favicon.', 'Set primary + accent colours.'],
    cta: null,
  },
  full: {
    label: 'Full white-label',
    bullets: ['Everything in Logo +', 'Override the app name (e.g. "Acme HR").', 'Set a custom email From name + address (DNS verified).', 'Hide the "Powered by IHRMS" watermark.'],
    cta: null,
  },
  custom_domain: {
    label: 'Custom domain',
    bullets: ['Everything in Full +', 'Run on hr.acme.com / crm.acme.com.', 'Custom-domain field is set by Imperial ops once DNS is verified.'],
    cta: null,
  },
}

export default function BrandingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [b, setB] = useState<Branding | null>(null)

  const logoFile = useRef<HTMLInputElement>(null)
  const faviconFile = useRef<HTMLInputElement>(null)
  const invoiceLogoFile = useRef<HTMLInputElement>(null)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/branding')
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? 'Failed to load branding')
        setB(data.data as Branding)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load branding')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    if (!b) return
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload: Partial<Branding> = {
        primary_color: b.primary_color,
        accent_color: b.accent_color,
        app_name_hrms: b.app_name_hrms,
        app_name_crm: b.app_name_crm,
        email_from_name: b.email_from_name,
        email_from_addr: b.email_from_addr,
        hide_powered_by: b.hide_powered_by,
        invoice_footer_text: b.invoice_footer_text,
        pdf_template: b.pdf_template,
      }
      const res = await fetch('/api/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setB(data.data as Branding)
      setSuccess('Branding updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function uploadAsset(kind: 'logo_url' | 'logo_dark_url' | 'favicon_url' | 'invoice_logo_url', file: File) {
    setUploadingKind(kind); setError(''); setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/branding/upload-url', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setB(prev => prev ? ({ ...prev, ...(data.data as Branding) }) : prev)
      setSuccess(`${kind.replace(/_/g, ' ')} uploaded.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingKind(null)
    }
  }

  const level = b?.level ?? 'none'
  const canLogo = level === 'logo' || level === 'full' || level === 'custom_domain'
  const canFull = level === 'full' || level === 'custom_domain'

  return (
    <div>
      <Topbar title="Branding" subtitle="Customise the look of your workspace" />

      <div style={{ padding: '24px 28px', maxWidth: 980, margin: '0 auto' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading…
          </div>
        )}

        {!loading && b && (
          <>
            {/* ── Level banner ───────────────────────────────────────── */}
            <div
              style={{
                background: canLogo ? '#F0FDF4' : '#F8FAFC',
                border: `1px solid ${canLogo ? '#BBF7D0' : '#E2E8F0'}`,
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {canLogo ? <CheckCircle2 size={16} color="#15803d" /> : <Lock size={16} color="#64748B" />}
                <span style={{ fontSize: 11, fontWeight: 800, color: canLogo ? '#15803d' : '#64748B', textTransform: 'uppercase', letterSpacing: '.05em' }}>Branding level</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{LEVEL_BLURB[level].label}</span>
              </div>
              <ul style={{ margin: '4px 0 0 22px', padding: 0, color: '#475569', fontSize: 12, lineHeight: 1.7 }}>
                {LEVEL_BLURB[level].bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}
              </ul>
              {LEVEL_BLURB[level].cta && (
                <p style={{ marginTop: 10, fontSize: 12, color: '#0F172A', fontWeight: 600 }}>
                  {LEVEL_BLURB[level].cta} <a href="/settings/billing" style={{ color: '#E8622A', textDecoration: 'none' }}>View plans</a>
                </p>
              )}
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}
            {success && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', color: '#047857', fontSize: 13, marginBottom: 14 }}>
                <CheckCircle2 size={15} /> {success}
              </div>
            )}

            {/* ── Logos & favicon ────────────────────────────────────── */}
            <Section title="Logos & favicon" icon={<ImageIcon size={14} />} disabled={!canLogo}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <AssetUpload
                  label="Logo"
                  url={b.logo_url}
                  disabled={!canLogo}
                  uploading={uploadingKind === 'logo_url'}
                  onPick={() => logoFile.current?.click()}
                />
                <AssetUpload
                  label="Favicon"
                  url={b.favicon_url}
                  disabled={!canLogo}
                  uploading={uploadingKind === 'favicon_url'}
                  onPick={() => faviconFile.current?.click()}
                />
                <AssetUpload
                  label="Invoice logo"
                  url={b.invoice_logo_url}
                  disabled={!canLogo}
                  uploading={uploadingKind === 'invoice_logo_url'}
                  onPick={() => invoiceLogoFile.current?.click()}
                />
              </div>
              <input ref={logoFile} type="file" accept="image/*" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset('logo_url', f); e.target.value = '' }} />
              <input ref={faviconFile} type="file" accept="image/*,.ico" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset('favicon_url', f); e.target.value = '' }} />
              <input ref={invoiceLogoFile} type="file" accept="image/*" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset('invoice_logo_url', f); e.target.value = '' }} />
            </Section>

            {/* ── Colors ─────────────────────────────────────────────── */}
            <Section title="Colors" icon={<Palette size={14} />} disabled={!canLogo}>
              <div style={{ display: 'flex', gap: 14 }}>
                <ColorInput
                  label="Primary"
                  value={b.primary_color ?? '#1565C0'}
                  disabled={!canLogo}
                  onChange={v => setB({ ...b, primary_color: v })}
                />
                <ColorInput
                  label="Accent"
                  value={b.accent_color ?? '#10B981'}
                  disabled={!canLogo}
                  onChange={v => setB({ ...b, accent_color: v })}
                />
              </div>
            </Section>

            {/* ── App name + watermark + email-from (full level) ─────── */}
            <Section title="App name & email" disabled={!canFull} hint={canFull ? null : 'Available at Full white-label level.'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="App name (HRMS)" disabled={!canFull}>
                  <input
                    type="text"
                    value={b.app_name_hrms ?? ''}
                    placeholder="e.g. Acme HR"
                    onChange={e => setB({ ...b, app_name_hrms: e.target.value })}
                    disabled={!canFull}
                    style={inputStyle(!canFull)}
                  />
                </Field>
                <Field label="App name (CRM)" disabled={!canFull}>
                  <input
                    type="text"
                    value={b.app_name_crm ?? ''}
                    placeholder="e.g. Acme Sales"
                    onChange={e => setB({ ...b, app_name_crm: e.target.value })}
                    disabled={!canFull}
                    style={inputStyle(!canFull)}
                  />
                </Field>
                <Field label="Email from name" disabled={!canFull}>
                  <input
                    type="text"
                    value={b.email_from_name ?? ''}
                    placeholder="Acme HR Notifications"
                    onChange={e => setB({ ...b, email_from_name: e.target.value })}
                    disabled={!canFull}
                    style={inputStyle(!canFull)}
                  />
                </Field>
                <Field label="Email from address" disabled={!canFull} hint={canFull ? (b.email_dns_verified ? 'DNS verified ✓' : 'Pending DNS verification by Imperial ops.') : null}>
                  <input
                    type="email"
                    value={b.email_from_addr ?? ''}
                    placeholder="noreply@acme.com"
                    onChange={e => setB({ ...b, email_from_addr: e.target.value })}
                    disabled={!canFull}
                    style={inputStyle(!canFull)}
                  />
                </Field>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canFull ? 'pointer' : 'not-allowed', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={!!b.hide_powered_by}
                  disabled={!canFull}
                  onChange={e => setB({ ...b, hide_powered_by: e.target.checked })}
                />
                {b.hide_powered_by ? <EyeOff size={14} color="#64748B" /> : <Eye size={14} color="#64748B" />}
                <span style={{ fontSize: 13, color: canFull ? '#0F172A' : '#94A3B8' }}>
                  Hide &ldquo;Powered by Imperial&rdquo; watermark on app pages, emails, and PDFs
                </span>
              </label>
            </Section>

            {/* ── Custom domain (level 3, deferred to v1.1) ──────────── */}
            <Section title="Custom domain" disabled hint="Available at Custom Domain level. Configured by Imperial ops once DNS is verified.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="HRMS domain" disabled>
                  <input type="text" value={b.custom_domain_hrms ?? ''} disabled placeholder="hr.acme.com" style={inputStyle(true)} />
                </Field>
                <Field label="CRM domain" disabled>
                  <input type="text" value={b.custom_domain_crm ?? ''} disabled placeholder="crm.acme.com" style={inputStyle(true)} />
                </Field>
              </div>
            </Section>

            {/* ── Save button ────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                onClick={save}
                disabled={saving || !canLogo}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px',
                  borderRadius: 9,
                  background: saving || !canLogo ? '#CBD5E1' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving || !canLogo ? 'not-allowed' : 'pointer',
                  boxShadow: saving || !canLogo ? 'none' : '0 4px 14px rgba(244,121,32,0.4)',
                }}
              >
                {saving
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</>
                  : <><Save size={14} />Save changes</>}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function Section({ title, icon, children, disabled, hint }: { title: string; icon?: React.ReactNode; children: React.ReactNode; disabled?: boolean; hint?: string | null }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 14,
      padding: '16px 18px',
      marginBottom: 14,
      opacity: disabled ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon && <div style={{ color: '#64748B' }}>{icon}</div>}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{title}</span>
        {disabled && <Lock size={12} color="#94A3B8" />}
      </div>
      {children}
      {hint && <p style={{ marginTop: 10, fontSize: 11.5, color: '#94A3B8' }}>{hint}</p>}
    </div>
  )
}

function Field({ label, children, disabled, hint }: { label: string; children: React.ReactNode; disabled?: boolean; hint?: string | null }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: disabled ? '#94A3B8' : '#374151', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <p style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>{hint}</p>}
    </div>
  )
}

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    border: '1.5px solid #E5E7EB',
    outline: 'none',
    padding: '10px 12px',
    fontSize: 13,
    color: disabled ? '#94A3B8' : '#111827',
    borderRadius: 9,
    background: disabled ? '#F8FAFC' : '#FFFFFF',
  }
}

function ColorInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: disabled ? '#94A3B8' : '#374151', marginBottom: 5 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 36, padding: 2, border: '1.5px solid #E5E7EB', borderRadius: 8, background: '#FFFFFF', cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          style={inputStyle(disabled)}
        />
      </div>
    </div>
  )
}

function AssetUpload({ label, url, onPick, disabled, uploading }: { label: string; url: string | null; onPick: () => void; disabled: boolean; uploading: boolean }) {
  return (
    <div style={{
      border: '1.5px dashed #E2E8F0',
      borderRadius: 12,
      padding: 14,
      background: disabled ? '#F8FAFC' : '#FFFFFF',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{label}</div>
      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: '#F8FAFC', borderRadius: 9, overflow: 'hidden' }}>
        {url
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={url} alt={label} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          : <ImageIcon size={20} color="#CBD5E1" />}
      </div>
      <button
        type="button"
        onClick={onPick}
        disabled={disabled || uploading}
        style={{
          width: '100%', padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          background: disabled ? '#F1F5F9' : '#FFFFFF',
          color: disabled ? '#94A3B8' : '#374151',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
        }}
      >
        {uploading
          ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />Uploading…</>
          : <><Upload size={12} />{url ? 'Replace' : 'Upload'}</>}
      </button>
    </div>
  )
}
