'use client'

import { FormEvent, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  HeartPulse,
  IndianRupee,
  Loader2,
  Mail,
  Shield,
  Users,
} from 'lucide-react'
import PoweredByImperial from '@/components/branding/PoweredByImperial'

const features = [
  { icon: Users, label: 'Hire-to-Retire Lifecycle', desc: 'End-to-end employee management from recruitment to exit' },
  { icon: IndianRupee, label: 'India-Compliant Payroll', desc: 'EPF, ESI, TDS, professional tax, and gratuity' },
  { icon: HeartPulse, label: 'Healthcare RCM Ready', desc: 'Built for medical coding, billing, and AR teams' },
  { icon: BarChart3, label: 'Advanced Analytics', desc: 'Real-time dashboards, custom reports, and insights' },
  { icon: Shield, label: 'Statutory Compliance', desc: 'Automated filings with audit-ready records' },
]

const stats = [
  { value: '248+', label: 'Employees Managed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: 'Rs 4.2Cr', label: 'Monthly Payroll' },
  { value: '2', label: 'Global Offices' },
]

const shellStyle = { minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" } as const
const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '20px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
  padding: '40px 40px 36px',
} as const

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const isOtpStep = Boolean(challengeToken)
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function requestOtp() {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Please enter your work email.')
      return
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setRequestingOtp(true)
    setError('')
    setSuccess('')
    setDevOtp('')

    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error ?? 'Unable to send OTP right now.')
        return
      }

      setChallengeToken(payload.challengeToken)
      setMaskedEmail(payload.maskedEmail ?? normalizedEmail)
      setSuccess(payload.message ?? 'OTP sent. Check your inbox for the verification code.')
      setDevOtp(payload.devOtp ?? '')
      setOtp('')
    } catch {
      setError('Something went wrong while sending the OTP. Please try again.')
    } finally {
      setRequestingOtp(false)
    }
  }

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await requestOtp()
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP sent to your email.')
      return
    }

    setVerifyingOtp(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        otp,
        challengeToken,
        redirect: false,
      })

      if (result?.error) {
        setError('The OTP is invalid or has expired. Request a new code and try again.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong while verifying the OTP. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  function resetFlow() {
    setChallengeToken('')
    setOtp('')
    setMaskedEmail('')
    setSuccess('')
    setError('')
    setDevOtp('')
  }

  return (
    <div style={shellStyle}>
      <div
        className="hidden lg:flex"
        style={{
          width: '520px',
          flexShrink: 0,
          flexDirection: 'column',
          background: 'linear-gradient(165deg, #060E1F 0%, #0A1628 40%, #0D1F3C 70%, #091530 100%)',
          position: 'relative',
          overflow: 'hidden',
          padding: '48px 44px',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: '32px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/imperial-logo-white.png"
              alt="Imperial Healthcare Systems"
              style={{ width: 260, height: 'auto', mixBlendMode: 'screen' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(244,121,32,0.12)', border: '1px solid rgba(244,121,32,0.25)', borderRadius: '24px', padding: '5px 14px', marginBottom: '22px' }}>
              <HeartPulse size={13} color="#F47920" />
              <span style={{ color: '#F47920', fontSize: '12px', fontWeight: 600 }}>Healthcare HR Platform</span>
            </div>

            <h1 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '36px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.8px', marginBottom: '14px' }}>
              Complete HR <br />
              <span style={{ color: '#F47920' }}>Hire-to-Retire</span>
              <br />
              Management
            </h1>

            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '36px', maxWidth: '380px' }}>
              One platform for your entire workforce, payroll compliance, healthcare operations, and reporting.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: '13px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(244,121,32,0.12)', border: '1px solid rgba(244,121,32,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color="#F47920" />
                  </div>
                  <div>
                    <p style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 600 }}>{label}</p>
                    <p style={{ color: '#64748B', fontSize: '11.5px', lineHeight: 1.4 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {stats.map(({ value, label }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '16px', fontFamily: "'Outfit', sans-serif" }}>{value}</p>
                  <p style={{ color: '#475569', fontSize: '10px' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: '12px', padding: '14px 18px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color="#22C55E" />
            </div>
            <div>
              <p style={{ color: '#22C55E', fontSize: '12px', fontWeight: 700 }}>India Statutory Compliance Ready</p>
              <p style={{ color: '#475569', fontSize: '11px' }}>EPF, ESIC, professional tax, TDS, gratuity, and labor law</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'radial-gradient(circle at 1px 1px, #0A1628 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
          <div className="flex lg:hidden" style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/imperial-logo-color.png"
              alt="Imperial Healthcare Systems"
              style={{ width: 220, height: 'auto' }}
            />
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(10,22,40,0.05)', borderRadius: '20px', padding: '4px 12px', marginBottom: '16px' }}>
                <Building2 size={12} color="#0A1628" />
                <span style={{ fontSize: '11.5px', color: '#0A1628', fontWeight: 600 }}>Imperial Healthcare Systems</span>
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0A1628', fontFamily: "'Outfit', sans-serif", marginBottom: '6px' }}>Welcome back</h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>Sign in with a one-time passcode sent to your work email</p>
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
              <form onSubmit={handleRequestOtp} noValidate>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>Work Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError('')
                  }}
                  placeholder="you@imperialhealthcare.com"
                  style={{ width: '100%', border: '1.5px solid #E5E7EB', outline: 'none', padding: '12px 14px', fontSize: '14px', color: '#111827', borderRadius: '10px', marginBottom: '20px' }}
                />
                <button
                  type="submit"
                  disabled={requestingOtp}
                  style={{ width: '100%', padding: '12px 20px', background: requestingOtp ? '#C4541A' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '14.5px', fontWeight: 700, cursor: requestingOtp ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: requestingOtp ? 'none' : '0 4px 14px rgba(244,121,32,0.4)' }}
                >
                  {requestingOtp ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Sending OTP...</> : <><Mail size={16} />Send OTP</>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} noValidate>
                <div style={{ borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>OTP sent</p>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                    Enter the 6-digit code sent to <strong>{maskedEmail || email}</strong>. The code stays valid for 10 minutes.
                  </p>
                </div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>One-Time Password</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  placeholder="Enter 6-digit OTP"
                  style={{ width: '100%', border: '1.5px solid #E5E7EB', outline: 'none', padding: '12px 14px', fontSize: '18px', color: '#111827', borderRadius: '10px', marginBottom: '20px', letterSpacing: '6px', textAlign: 'center' }}
                />
                <button
                  type="submit"
                  disabled={verifyingOtp}
                  style={{ width: '100%', padding: '12px 20px', background: verifyingOtp ? '#C4541A' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '14.5px', fontWeight: 700, cursor: verifyingOtp ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: verifyingOtp ? 'none' : '0 4px 14px rgba(244,121,32,0.4)' }}
                >
                  {verifyingOtp ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Verifying...</> : <><span>Verify OTP and Sign In</span><ArrowRight size={15} /></>}
                </button>
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={() => void requestOtp()} disabled={requestingOtp} style={{ flex: 1, padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: requestingOtp ? 'not-allowed' : 'pointer' }}>
                    {requestingOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
                  <button type="button" onClick={resetFlow} style={{ flex: 1, padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Use another email
                  </button>
                </div>
              </form>
            )}

            <p style={{ marginTop: '22px', textAlign: 'center', fontSize: '12px', color: '#94A3B8', lineHeight: 1.6 }}>
              Password sign-in is disabled. Every login now uses email OTP verification.
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
              <Activity size={13} color="#94A3B8" />
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                System Status: <span style={{ color: '#22C55E', fontWeight: 600 }}>All Systems Operational</span>
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#CBD5E1' }}>Copyright {new Date().getFullYear()} Imperial Healthcare Systems | IHRMS v2.0</p>
            <div style={{ marginTop: 10 }}>
              <PoweredByImperial context="auth" forceShow />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
