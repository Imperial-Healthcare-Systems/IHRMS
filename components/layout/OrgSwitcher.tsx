'use client'

/**
 * Org-switcher dropdown for users with memberships in multiple orgs.
 * Hidden when the user has only one membership.
 *
 * On selection: POST /api/auth/switch-org → session.update({...}) → soft refresh.
 * The JWT update trigger in lib/auth.ts copies the new Active* fields onto the
 * legacy fields too, so existing routes pick up the new orgId immediately.
 */
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/use-session'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react'

type Membership = {
  membershipId: string
  orgId: string
  orgName: string
  role: string
}

export function OrgSwitcher() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const u = (session?.user as Record<string, unknown> | undefined) ?? {}
  const memberships = (u.allMemberships as Membership[] | undefined) ?? []
  const activeOrgId = (u.activeOrgId as string | undefined) ?? (u.orgId as string | undefined)
  const activeOrgName = (u.activeOrgName as string | undefined) ?? memberships.find(m => m.orgId === activeOrgId)?.orgName ?? '—'

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Single-membership users have nothing to switch to.
  if (memberships.length <= 1) return null

  async function selectOrg(m: Membership) {
    if (m.orgId === activeOrgId) { setOpen(false); return }
    setBusyOrgId(m.orgId)
    try {
      const res = await fetch('/api/auth/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: m.orgId }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.warn('[OrgSwitcher] switch failed:', data?.error)
        return
      }
      // Push new Active* fields into the JWT — auth.ts JWT update trigger
      // mirrors them into the legacy fields too.
      await update({
        activeOrgId: data.activeOrgId,
        activeMembershipId: data.activeMembershipId,
        activeRole: data.activeRole,
        activeOrgName: data.activeOrgName,
        activeBrandingLevel: data.activeBrandingLevel,
        activePlanTier: data.activePlanTier,
        activeSubscriptionStatus: data.activeSubscriptionStatus,
      })
      setOpen(false)
      // Force a server-side re-render so org-scoped data reflects the new context.
      router.refresh()
    } finally {
      setBusyOrgId(null)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 11px',
          borderRadius: 9,
          border: '1px solid #E8EBF0',
          background: open ? '#FFF3E8' : '#FFFFFF',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          maxWidth: 220,
        }}
      >
        <Building2 size={13} color={open ? '#F47920' : '#64748B'} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeOrgName}
        </span>
        <ChevronDown size={12} color="#94A3B8" />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            minWidth: 260,
            background: '#FFFFFF', borderRadius: 12,
            border: '1px solid #E8EBF0',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            padding: 6,
            zIndex: 50,
          }}
        >
          <div style={{ padding: '8px 10px 6px', fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your organisations
          </div>
          {memberships.map(m => {
            const isActive = m.orgId === activeOrgId
            const isBusy = busyOrgId === m.orgId
            return (
              <button
                key={m.membershipId}
                onClick={() => selectOrg(m)}
                disabled={isBusy}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? '#FFF7ED' : 'transparent',
                  cursor: isBusy ? 'wait' : 'pointer',
                }}
                onMouseEnter={e => { if (!isActive && !isBusy) (e.currentTarget as HTMLElement).style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (!isActive && !isBusy) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: isActive ? 'rgba(244,121,32,0.12)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={13} color={isActive ? '#F47920' : '#64748B'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.orgName}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'capitalize' }}>{m.role.replace(/_/g, ' ')}</div>
                </div>
                {isBusy ? <Loader2 size={14} style={{ color: '#F47920', animation: 'spin 1s linear infinite' }} /> : isActive ? <Check size={14} color="#F47920" /> : null}
              </button>
            )
          })}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  )
}
