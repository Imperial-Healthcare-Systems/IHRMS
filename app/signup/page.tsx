'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, Mail } from 'lucide-react'
import PoweredByImperial from '@/components/branding/PoweredByImperial'

type Tier = 'starter' | 'growth' | 'pro' | 'enterprise'
type Product = 'ihrms' | 'icrm' | 'bundle'

const TIERS: { value: Tier; label: string; sub: string }[] = [
  { value: 'starter',    label: 'Starter',    sub: 'Up to 10 seats' },
  { value: 'growth',     label: 'Growth',     sub: 'Up to 50 seats' },
  { value: 'pro',        label: 'Pro',        sub: 'Company email required' },
  { value: 'enterprise', label: 'Enterprise', sub: 'Custom seat counts' },
]

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '20px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
  padding: '40px 40px 36px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #E5E7EB',
  outline: 'none',
  padding: '12px 14px',
  fontSize: '14px',
  color: '#111827',
  borderRadius: '10px',
  marginBottom: '16px',
}

export default function SignupPage() {
  const router = useRouter()

  // Step 1: form
  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gstin, setGstin] = useState('')
  const [product, setProduct] = useState<Product>('ihrms')
  const [tier, setTier] = useState<Tier>('starter')

  // Step 2: OTP
  const [challengeToken, setChallengeToken] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const isOtpStep = Boolean(challengeToken)

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setDevOtp('')

    if (!orgName.trim() || !fullName.trim() || !email.trim()) {
      setError('Organisation, your name, and email are all required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: orgName.trim(),
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          gstin: gstin.trim() || undefined,
          product,
          tier,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Signup failed')
        return
      }
      setChallengeToken(data.challengeToken)
      setSuccess('OTP sent to your email. Enter it below to finish creating your workspace.')
      if (data.devOtp) setDevOtp(data.devOtp)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP from your email.')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/auth/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp, challengeToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not complete signup')
        return
      }
      setSuccess('Workspace created! Redirecting to login…')
      setTimeout(() => router.push(data.redirectTo ?? '/login'), 1200)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '32px 24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imperial-logo-color.png" alt="Imperial Healthcare Systems" style={{ width: 220, height: 'auto' }} />
        </div>

        <div style={cardStyle}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(10,22,40,0.05)', borderRadius: '20px', padding: '4px 12px', marginBottom: '14px' }}>
              <Building2 size={12} color="#0A1628" />
              <span style={{ fontSize: '11.5px', color: '#0A1628', fontWeight: 600 }}>Create workspace</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0A1628', fontFamily: "'Outfit', sans-serif", marginBottom: '6px' }}>
              {isOtpStep ? 'Verify your email' : 'Start your 14-day trial'}
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '13px' }}>
              {isOtpStep ? `We sent a 6-digit code to ${email}.` : 'No card needed for Starter and Growth tiers.'}
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <AlertCircle size={15} color="#E11D48" style={{ marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#BE123C', lineHeight: 1.4 }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <CheckCircle2 size={15} color="#059669" style={{ marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#047857', lineHeight: 1.4 }}>{success}</p>
            </div>
          )}
          {devOtp && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: 700, marginBottom: '4px' }}>Development OTP</p>
              <p style={{ fontSize: '18px', letterSpacing: '4px', color: '#1E3A8A', fontWeight: 800 }}>{devOtp}</p>
            </div>
          )}

          {!isOtpStep ? (
            <form onSubmit={handleSignup}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Organisation name</label>
              <input style={inputStyle} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Healthcare Pvt Ltd" />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Your full name</label>
              <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Work email</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Phone (optional)</label>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>GSTIN (optional)</label>
              <input style={inputStyle} value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Product</label>
              <select style={inputStyle} value={product} onChange={e => setProduct(e.target.value as Product)}>
                <option value="ihrms">HRMS only</option>
                <option value="icrm">CRM only</option>
                <option value="bundle">Bundle (HRMS + CRM)</option>
              </select>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {TIERS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTier(t.value)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: tier === t.value ? '2px solid #F47920' : '1.5px solid #E5E7EB',
                      background: tier === t.value ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{t.label}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>{t.sub}</div>
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '12px 20px', background: submitting ? '#C4541A' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '14.5px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: submitting ? 'none' : '0 4px 14px rgba(244,121,32,0.4)' }}
              >
                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Sending OTP…</> : <><Mail size={16} />Continue</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>One-Time Password</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                style={{ ...inputStyle, fontSize: '18px', letterSpacing: '6px', textAlign: 'center' }}
              />
              <button
                type="submit"
                disabled={verifying}
                style={{ width: '100%', padding: '12px 20px', background: verifying ? '#C4541A' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '14.5px', fontWeight: 700, cursor: verifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: verifying ? 'none' : '0 4px 14px rgba(244,121,32,0.4)' }}
              >
                {verifying ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Creating workspace…</> : <><span>Create workspace</span><ArrowRight size={15} /></>}
              </button>
              <button
                type="button"
                onClick={() => { setChallengeToken(''); setOtp(''); setSuccess(''); setError('') }}
                style={{ marginTop: '12px', width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Edit details
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12.5px', color: '#64748B' }}>
          Already have an account? <Link href="/login" style={{ color: '#E8622A', fontWeight: 600 }}>Sign in</Link>
        </p>
        <div style={{ marginTop: 14 }}>
          <PoweredByImperial context="auth" forceShow />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
