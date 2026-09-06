'use client'

/**
 * DEV pill rendered in the team-attendance grid footer.
 *
 * Two independent gates protect this component:
 *   1. Compile-time tree-shake: `process.env.NODE_ENV !== 'production'`
 *      is a build-time constant. In production the early `return null`
 *      becomes dead code that SWC/Webpack prunes — no `DevTenantSwitcher`
 *      identifier reaches the production bundle.
 *   2. Runtime: the /api/dev/tenants route returns 404 in production
 *      regardless of caller. If the gate above ever leaks (e.g. a stale
 *      build), the fetch fails and `allowed` flips to false, rendering
 *      nothing.
 */
import { useEffect, useState } from 'react'
import { ChevronUp, Loader2 } from 'lucide-react'

type Tenant = { org_id: string; org_name: string }

const IS_DEV = process.env.NODE_ENV !== 'production'

export default function DevTenantSwitcher() {
  // Hooks must run unconditionally and in the same order on every render, so
  // the IS_DEV guard gates the RENDER (below), not the hook calls. The
  // compile-time tree-shake still works: IS_DEV is a build-time constant, so
  // in a production build the whole render body below is dead code.
  const [open, setOpen] = useState(false)
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [currentOverride, setCurrentOverride] = useState<string | null>(null)
  const [homeOrgId, setHomeOrgId] = useState<string | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    if (!IS_DEV || !open || tenants !== null) return
    setLoading(true)
    fetch('/api/dev/tenants')
      .then(async r => {
        if (r.status === 404) { setAllowed(false); return null }
        if (!r.ok) throw new Error('Failed to load tenants')
        return r.json()
      })
      .then(j => {
        if (!j) return
        setAllowed(true)
        setTenants((j.data ?? []) as Tenant[])
        setCurrentOverride(j.current_override ?? null)
        setHomeOrgId(j.home_org_id ?? null)
      })
      .catch(() => setAllowed(false))
      .finally(() => setLoading(false))
  }, [open, tenants])

  async function switchTo(orgId: string) {
    setSwitching(orgId)
    try {
      const res = await fetch('/api/dev/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      if (res.ok) window.location.reload()
      else setSwitching(null)
    } catch {
      setSwitching(null)
    }
  }

  async function clearOverride() {
    setSwitching('__clear__')
    try {
      const res = await fetch('/api/dev/tenants', { method: 'DELETE' })
      if (res.ok) window.location.reload()
      else setSwitching(null)
    } catch {
      setSwitching(null)
    }
  }

  // Gate 1 (compile-time): IS_DEV is a build-time constant, so everything
  // below is pruned from the production bundle.
  if (!IS_DEV) return null
  // Gate 2 (runtime): /api/dev/tenants 404s for non-internal callers.
  if (allowed === false) return null

  const hasOverride = !!currentOverride && currentOverride !== homeOrgId
  const label = hasOverride ? 'HIDE DEV' : 'DEV'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 4,
          background: hasOverride ? '#FEF3C7' : '#FEE2E2',
          color: hasOverride ? '#92400E' : '#991B1B',
          border: `1px solid ${hasOverride ? '#FDE68A' : '#FECACA'}`,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
        title={hasOverride ? 'Click to switch or clear tenant override' : 'Switch tenant (Imperial-internal only)'}
      >
        {label}
        <ChevronUp size={10} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
          minWidth: 260, maxWidth: 340,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          zIndex: 50,
          padding: 6,
        }}>
          <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tenant override (dev)
          </div>

          {loading ? (
            <div style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 12 }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Loading tenants…
            </div>
          ) : !tenants ? (
            <div style={{ padding: '12px 10px', color: '#64748B', fontSize: 12 }}>
              Not authorised
            </div>
          ) : (
            <>
              {hasOverride && (
                <button
                  onClick={clearOverride}
                  disabled={switching !== null}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6,
                    fontSize: 11, color: '#92400E', cursor: switching ? 'not-allowed' : 'pointer',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>← Return to home tenant</span>
                  {switching === '__clear__' && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                </button>
              )}

              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {tenants.map(t => {
                  const active = t.org_id === (currentOverride ?? homeOrgId)
                  const isHome = t.org_id === homeOrgId
                  return (
                    <button
                      key={t.org_id}
                      onClick={() => !active && switchTo(t.org_id)}
                      disabled={active || switching !== null}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', background: active ? '#F0F9FF' : 'transparent',
                        border: 'none', borderRadius: 4,
                        fontSize: 12, color: active ? '#0369A1' : '#1F2937',
                        cursor: active || switching ? 'default' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.org_name}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                        {isHome && <span style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>home</span>}
                        {switching === t.org_id && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                        {active && switching === null && <span style={{ fontSize: 14, color: '#0369A1' }}>✓</span>}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={{ padding: '6px 10px', fontSize: 10, color: '#94A3B8', borderTop: '1px solid #F1F5F9', marginTop: 4 }}>
                Pass <code style={{ background: '#F1F5F9', padding: '0 4px', borderRadius: 3 }}>?manager_id=&lt;uuid&gt;</code> in the URL to view another manager&apos;s team in the override tenant.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
