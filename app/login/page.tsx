'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, Loader2, AlertCircle,
  Users, IndianRupee, BarChart3, Shield,
  CheckCircle2, ArrowRight, Stethoscope,
  Building2, HeartPulse, Activity,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────── */
const features = [
  { icon: Users,        label: 'Hire-to-Retire Lifecycle',      desc: 'End-to-end employee management from recruitment to exit' },
  { icon: IndianRupee,  label: 'India-Compliant Payroll',        desc: 'EPF · ESI · TDS · Professional Tax · Gratuity' },
  { icon: HeartPulse,   label: 'Healthcare RCM Ready',           desc: 'Built for medical coding, billing & AR teams' },
  { icon: BarChart3,    label: 'Advanced Analytics',             desc: 'Real-time dashboards, custom reports & AI insights' },
  { icon: Shield,       label: 'Statutory Compliance',           desc: 'Automated filings & audit-ready records' },
]

const stats = [
  { value: '248+', label: 'Employees Managed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '₹4.2Cr', label: 'Monthly Payroll' },
  { value: '2', label: 'Global Offices' },
]

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [rememberMe, setRememberMe]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState('')
  const [emailFocused, setEmailFocused]     = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your work email.'); return }
    if (!validateEmail(email)) { setError('Enter a valid email address.'); return }
    if (!password) { setError('Please enter your password.'); return }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Invalid credentials. Please check your email and password.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError('')
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch {
      setError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════
          LEFT PANEL
      ══════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '520px',
          flexShrink: 0,
          flexDirection: 'column',
          background: 'linear-gradient(165deg, #060E1F 0%, #0A1628 40%, #0D1F3C 70%, #091530 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Glowing orbs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-60px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,121,32,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '80px', left: '-80px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '30%',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,121,32,0.07) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '48px 44px' }}>

          {/* ── Brand ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            {/* Logo mark */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #F47920 0%, #FFD700 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(244,121,32,0.4)',
            }}>
              <Stethoscope size={24} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.5px', fontFamily: "'Outfit', sans-serif" }}>
                  IHRMS
                </span>
                <span style={{
                  background: 'rgba(244,121,32,0.18)', color: '#F59E0B',
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}>
                  v2.0
                </span>
              </div>
              <p style={{ color: '#64748B', fontSize: '12px', marginTop: '1px', letterSpacing: '0.3px' }}>
                Imperial Healthcare Systems
              </p>
            </div>
          </div>

          {/* ── Hero ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '12px', paddingBottom: '32px' }}>

            {/* Tag line */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'rgba(244,121,32,0.12)', border: '1px solid rgba(244,121,32,0.25)',
              borderRadius: '24px', padding: '5px 14px', width: 'fit-content', marginBottom: '22px',
            }}>
              <HeartPulse size={13} color="#F47920" />
              <span style={{ color: '#F47920', fontSize: '12px', fontWeight: 600 }}>
                Healthcare HR Platform
              </span>
            </div>

            <h1 style={{
              color: '#FFFFFF', fontFamily: "'Outfit', sans-serif",
              fontSize: '36px', fontWeight: 800, lineHeight: 1.15,
              letterSpacing: '-0.8px', marginBottom: '14px',
            }}>
              Complete HR <br />
              <span style={{ color: '#F47920' }}>Hire-to-Retire</span><br />
              Management
            </h1>

            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '36px', maxWidth: '380px' }}>
              One platform for your entire workforce — US &amp; India teams, RCM specialists,
              payroll compliance, and everything in between.
            </p>

            {/* Features list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(244,121,32,0.12)', border: '1px solid rgba(244,121,32,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} color="#F47920" />
                  </div>
                  <div>
                    <p style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>{label}</p>
                    <p style={{ color: '#64748B', fontSize: '11.5px', lineHeight: 1.4, marginTop: '1px' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1px', background: 'rgba(255,255,255,0.06)',
              borderRadius: '14px', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {stats.map(({ value, label }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '14px 12px', textAlign: 'center',
                }}>
                  <p style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '16px', fontFamily: "'Outfit', sans-serif" }}>{value}</p>
                  <p style={{ color: '#475569', fontSize: '10px', marginTop: '2px', lineHeight: 1.3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer compliance badge ── */}
          <div style={{
            borderRadius: '12px', padding: '14px 18px',
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(34,197,94,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CheckCircle2 size={16} color="#22C55E" />
            </div>
            <div>
              <p style={{ color: '#22C55E', fontSize: '12px', fontWeight: 700 }}>India Statutory Compliance Ready</p>
              <p style={{ color: '#475569', fontSize: '11px', marginTop: '1px' }}>
                EPF · ESIC · Professional Tax · TDS · Gratuity · Labour Law
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT PANEL
      ══════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F8FAFC', padding: '32px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle background texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'radial-gradient(circle at 1px 1px, #0A1628 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

          {/* Mobile brand header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '32px', justifyContent: 'center',
          }} className="flex lg:hidden">
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #F47920 0%, #FFD700 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(244,121,32,0.35)',
            }}>
              <Stethoscope size={20} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '20px', color: '#0A1628', fontFamily: "'Outfit', sans-serif" }}>IHRMS</span>
              <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '0px' }}>Imperial Healthcare Systems</p>
            </div>
          </div>

          {/* Card container */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
            padding: '40px 40px 36px',
          }}>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'rgba(10,22,40,0.05)', borderRadius: '20px',
                padding: '4px 12px', marginBottom: '16px',
              }}>
                <Building2 size={12} color="#0A1628" />
                <span style={{ fontSize: '11.5px', color: '#0A1628', fontWeight: 600 }}>
                  Imperial Healthcare Systems
                </span>
              </div>
              <h2 style={{
                fontSize: '26px', fontWeight: 800, color: '#0A1628',
                fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.5px',
                lineHeight: 1.2, marginBottom: '6px',
              }}>
                Welcome back
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Sign in to your workspace to continue
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: '#FFF1F2', border: '1px solid #FECDD3',
                borderRadius: '10px', padding: '12px 14px',
                marginBottom: '20px',
              }}>
                <AlertCircle size={15} color="#E11D48" style={{ marginTop: '1px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#BE123C', lineHeight: 1.4 }}>{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>

              {/* Email input */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>
                  Work Email
                </label>
                <div style={{
                  position: 'relative',
                  borderRadius: '10px',
                  border: `1.5px solid ${emailFocused ? '#F47920' : email && !validateEmail(email) ? '#EF4444' : '#E5E7EB'}`,
                  boxShadow: emailFocused ? '0 0 0 3px rgba(244,121,32,0.1)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  background: '#FFFFFF',
                }}>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@imperialhealthcare.com"
                    style={{
                      width: '100%', border: 'none', outline: 'none',
                      padding: '11px 14px', fontSize: '14px', color: '#111827',
                      background: 'transparent', borderRadius: '10px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
              </div>

              {/* Password input */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Password
                  </label>
                  <a href="/forgot-password" style={{ fontSize: '12px', color: '#F47920', fontWeight: 500, textDecoration: 'none' }}>
                    Forgot password?
                  </a>
                </div>
                <div style={{
                  position: 'relative',
                  borderRadius: '10px',
                  border: `1.5px solid ${passwordFocused ? '#F47920' : '#E5E7EB'}`,
                  boxShadow: passwordFocused ? '0 0 0 3px rgba(244,121,32,0.1)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  background: '#FFFFFF',
                }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%', border: 'none', outline: 'none',
                      padding: '11px 44px 11px 14px', fontSize: '14px', color: '#111827',
                      background: 'transparent', borderRadius: '10px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9CA3AF', padding: '2px', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '24px' }}>
                <div
                  onClick={() => setRememberMe(v => !v)}
                  style={{
                    width: '18px', height: '18px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0,
                    border: `2px solid ${rememberMe ? '#F47920' : '#D1D5DB'}`,
                    background: rememberMe ? '#F47920' : '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {rememberMe && <CheckCircle2 size={11} color="#ffffff" strokeWidth={3} />}
                </div>
                <label
                  onClick={() => setRememberMe(v => !v)}
                  style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer', userSelect: 'none' }}
                >
                  Keep me signed in for 30 days
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 20px',
                  background: loading
                    ? '#C4541A'
                    : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)',
                  color: '#FFFFFF', border: 'none', borderRadius: '10px',
                  fontSize: '14.5px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(244,121,32,0.4)',
                  transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.2px',
                }}
              >
                {loading ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                ) : (
                  <><span>Sign in to IHRMS</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#F3F4F6' }} />
              <span style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 600, letterSpacing: '0.8px' }}>
                OR CONTINUE WITH
              </span>
              <div style={{ flex: 1, height: '1px', background: '#F3F4F6' }} />
            </div>

            {/* Google sign in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: '100%', padding: '11px 20px',
                background: '#FFFFFF',
                border: '1.5px solid #E5E7EB',
                borderRadius: '10px',
                color: '#374151', fontSize: '14px', fontWeight: 600,
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                opacity: googleLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB'; (e.currentTarget as HTMLButtonElement).style.background = '#FAFAFA' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
            >
              {googleLoading ? (
                <Loader2 size={16} color="#94A3B8" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087C16.6582 14.0109 17.64 11.7037 17.64 9.2045z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3446 0-4.3282-1.5832-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9574C.3477 6.173 0 7.5482 0 9s.3477 2.827.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
                  <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6554 3.5795 9 3.5795z" fill="#EA4335"/>
                </svg>
              )}
              {googleLoading ? 'Redirecting to Google…' : 'Sign in with Google'}
            </button>

            {/* Footer */}
            <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#CBD5E1', lineHeight: 1.6 }}>
              By signing in you agree to our{' '}
              <a href="/terms" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Terms</a>{' '}
              and{' '}
              <a href="/privacy" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Privacy Policy</a>
            </p>
          </div>

          {/* Below card — copyright */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
              <Activity size={13} color="#94A3B8" />
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                System Status: <span style={{ color: '#22C55E', fontWeight: 600 }}>All Systems Operational</span>
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#CBD5E1' }}>
              © {new Date().getFullYear()} Imperial Healthcare Systems · IHRMS v2.0
            </p>
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
