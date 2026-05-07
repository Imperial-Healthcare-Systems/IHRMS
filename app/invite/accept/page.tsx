'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react'
import PoweredByImperial from '@/components/branding/PoweredByImperial'

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

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#E8622A' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <AcceptInviteInner />
    </Suspense>
  )
}

function AcceptInviteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [stage, setStage] = useState<'loading' | 'request' | 'otp' | 'done'>('loading')
  const [orgName, setOrgName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [otp, setOtp] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Step 1: when the page loads with a token, request the OTP automatically.
  useEffect(() => {
    if (!token) { setError('Missing invitation token.'); setStage('request'); return }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/team/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error ?? 'Invitation could not be loaded.')
          setStage('request')
          return
        }
        setOrgName(data.orgName ?? 'an organisation')
        setRole(data.role ?? 'member')
        setEmail(data.email ?? '')
        setChallengeToken(data.challengeToken)
        if (data.devOtp) setDevOtp(data.devOtp)
        setStage('otp')
      } catch {
        if (!cancelled) {
          setError('Could not reach the server.')
          setStage('request')
        }
      }
    })()

    return () => { cancelled = true }
  }, [token])

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return }

    setBusy(true)
    try {
      const res = await fetch('/api/team/accept/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, challengeToken, full_name: fullName.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not accept invitation.')
        return
      }
      setStage('done')
      setTimeout(() => router.push(data.redirectTo ?? '/login'), 1400)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '32px 24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imperial-logo-color.png" alt="Imperial Healthcare Systems" style={{ width: 220, height: 'auto' }} />
        </div>

        <div style={cardStyle}>
          {stage === 'loading' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#E8622A' }} />
              <p style={{ marginTop: '14px', fontSize: '14px', color: '#475569' }}>Looking up your invitation…</p>
            </div>
          )}

          {stage === 'request' && (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0A1628', fontFamily: "'Outfit', sans-serif", marginBottom: '6px' }}>Invitation unavailable</h2>
              <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '16px' }}>{error || 'We could not find an active invitation for this link.'}</p>
              <Link href="/login" style={{ display: 'inline-block', color: '#E8622A', fontWeight: 600, fontSize: '13px' }}>Back to sign in</Link>
            </>
          )}

          {stage === 'otp' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0A1628', fontFamily: "'Outfit', sans-serif", marginBottom: '6px' }}>
                  Join {orgName}
                </h2>
                <p style={{ color: '#64748B', fontSize: '13px' }}>
                  You&rsquo;ve been invited as a <strong>{role.replace(/_/g, ' ')}</strong>. We sent a 6-digit code to <strong>{email}</strong>.
                </p>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <AlertCircle size={15} color="#E11D48" style={{ marginTop: '1px', flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', color: '#BE123C', lineHeight: 1.4 }}>{error}</p>
                </div>
              )}
              {devOtp && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: 700, marginBottom: '4px' }}>Development OTP</p>
                  <p style={{ fontSize: '18px', letterSpacing: '4px', color: '#1E3A8A', fontWeight: 800 }}>{devOtp}</p>
                </div>
              )}

              <form onSubmit={handleVerify}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Your full name</label>
                <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '-12px 0 14px' }}>Only required for first-time users.</p>

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
                  disabled={busy}
                  style={{ width: '100%', padding: '12px 20px', background: busy ? '#C4541A' : 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '14.5px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: busy ? 'none' : '0 4px 14px rgba(244,121,32,0.4)' }}
                >
                  {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Joining…</> : <><Mail size={16} />Accept invitation<ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}

          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <CheckCircle2 size={32} color="#22C55E" />
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0A1628', marginTop: '14px' }}>You&rsquo;re in</h2>
              <p style={{ color: '#64748B', fontSize: '13px', marginTop: '6px' }}>Redirecting you to sign in…</p>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <PoweredByImperial context="auth" forceShow />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
