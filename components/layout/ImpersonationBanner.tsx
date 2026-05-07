'use client'

/**
 * Persistent red banner shown at the top of every page when an Imperial
 * admin is impersonating a customer user. Per IMPERIAL_TENANT_SPEC v1.0
 * §8.3 — visibility is non-negotiable: the customer must always know
 * actions are being taken under impersonation.
 *
 * Hidden when session.user.isImpersonating !== true. Mounted in
 * app/(modules)/layout.tsx so it covers every authenticated page.
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Loader2, LogOut } from 'lucide-react'

export function ImpersonationBanner() {
  const { data: session } = useSession()
  const u = session?.user as {
    isImpersonating?: boolean
    activeOrgName?: string
    name?: string
    email?: string
  } | undefined

  const [ending, setEnding] = useState(false)

  if (!u?.isImpersonating) return null

  async function endSession() {
    setEnding(true)
    try {
      const res = await fetch('/api/auth/impersonation-end', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      // Cookie has been cleared server-side; full reload to drop the JWT.
      window.location.href = (typeof data?.redirectTo === 'string' && data.redirectTo) || '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: 'linear-gradient(90deg, #B91C1C 0%, #DC2626 50%, #B91C1C 100%)',
        color: '#FFFFFF',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
      }}
    >
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.4 }}>
        <strong style={{ fontWeight: 700 }}>You are impersonating a user</strong>
        {u.activeOrgName ? <> in <strong>{u.activeOrgName}</strong></> : null}
        {u.name || u.email ? <> as <strong>{u.name ?? u.email}</strong></> : null}
        . All actions are logged and visible to the customer.
      </div>
      <button
        onClick={endSession}
        disabled={ending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.45)',
          background: ending ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 700,
          cursor: ending ? 'wait' : 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!ending) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={e => { if (!ending) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
      >
        {ending
          ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />Ending…</>
          : <><LogOut size={12} />End Session</>}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
