/**
 * Drop-in replacement for `next-auth/react`'s `useSession()` + `signOut()`,
 * backed by Supabase Auth via the browser client.
 *
 * Existing components import { useSession, signOut } from 'next-auth/react' —
 * change to { useSession, signOut } from '@/lib/use-session'. The returned
 * shape mirrors lib/session.ts's server-side synth, so client and server
 * agree on session shape.
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Session, Membership } from '@/types/session'
import type { AuthChangeEvent, Session as SupabaseSession, User } from '@supabase/supabase-js'
import { getBrowserSupabase } from './supabase-browser'

type Status = 'loading' | 'authenticated' | 'unauthenticated'

const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin'])

function readMemberships(raw: unknown): Membership[] {
  if (!Array.isArray(raw)) return []
  return raw.map(m => {
    const r = m as Record<string, unknown>
    return {
      membershipId: typeof r.membership_id === 'string' ? r.membership_id : '',
      orgId:        typeof r.org_id === 'string' ? r.org_id : '',
      orgName:      typeof r.org_name === 'string' ? r.org_name : '',
      role:         typeof r.role === 'string' ? r.role : 'member',
    }
  })
}

function synthesiseSession(user: User | null): Session | null {
  if (!user) return null

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>
  const activeRole = typeof meta.active_role === 'string' ? meta.active_role : 'member'
  const orgId = typeof meta.active_org_id === 'string' ? meta.active_org_id : ''
  const membershipId = typeof meta.active_membership_id === 'string' ? meta.active_membership_id : null
  const orgName = typeof meta.active_org_name === 'string' ? meta.active_org_name : null
  const brandingLevel = typeof meta.active_branding_level === 'string' ? meta.active_branding_level : 'none'
  const planTier = typeof meta.plan_tier === 'string' ? meta.plan_tier : 'free'
  const subscriptionStatus = typeof meta.subscription_status === 'string' ? meta.subscription_status : 'active'
  const isPlatformAdmin = meta.is_platform_admin === true
  const isImpersonating = meta.is_impersonating === true
  const impersonatorAdminId = typeof meta.impersonator_admin_id === 'string' ? meta.impersonator_admin_id : null
  const impersonationLogId = typeof meta.impersonation_log_id === 'string' ? meta.impersonation_log_id : null
  const empId = typeof meta.emp_id === 'string' ? meta.emp_id : null
  const isAdmin = meta.is_admin === true || ADMIN_ROLES.has(activeRole)
  const legacyRole = typeof meta.legacy_role === 'string' ? meta.legacy_role : activeRole

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      name: typeof userMeta.full_name === 'string' ? userMeta.full_name : null,
      image: typeof userMeta.avatar_url === 'string' ? userMeta.avatar_url : null,

      empId,
      role: legacyRole,
      isAdmin,
      orgId,
      planTier,
      subscriptionStatus,

      isPlatformAdmin,
      activeOrgId:           orgId,
      activeMembershipId:    membershipId,
      activeRole,
      activeOrgName:         orgName,
      activeBrandingLevel:   brandingLevel,
      activePlanTier:        planTier,
      activeSubscriptionStatus: subscriptionStatus,
      allMemberships:        readMemberships(meta.all_memberships),

      isImpersonating,
      impersonatorAdminId,
      impersonationLogId,
      impersonatedBy: isImpersonating && impersonatorAdminId
        ? { identityId: impersonatorAdminId, email: '', name: '', startedAt: '' }
        : null,
    },
    expires: '',
  }
}

export function useSession() {
  const [data, setData] = useState<Session | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const refresh = useCallback(async () => {
    const supabase = getBrowserSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const next = synthesiseSession(user)
    setData(next)
    setStatus(next ? 'authenticated' : 'unauthenticated')
    return next
  }, [])

  // `update()` keeps the next-auth contract: callers can pass anything
  // (we ignore the payload) and trigger a fresh session read. The server
  // is the source of truth — app_metadata changes via the admin API,
  // refreshSession picks them up, this hook re-reads.
  const update = useCallback(async (_?: unknown) => {
    const supabase = getBrowserSupabase()
    await supabase.auth.refreshSession()
    return refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    void refresh()

    const supabase = getBrowserSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: SupabaseSession | null) => {
        if (cancelled) return
        const next = synthesiseSession(session?.user ?? null)
        setData(next)
        setStatus(next ? 'authenticated' : 'unauthenticated')
      },
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [refresh])

  return { data, status, update }
}

/**
 * Drop-in for next-auth/react's `signOut()`. Clears the Supabase auth
 * cookies and navigates to `callbackUrl` (defaults to `/login`).
 */
export async function signOut(opts?: { callbackUrl?: string; redirect?: boolean }) {
  const supabase = getBrowserSupabase()
  await supabase.auth.signOut()
  if (opts?.redirect === false) return
  const target = opts?.callbackUrl ?? '/login'
  if (typeof window !== 'undefined') {
    window.location.href = target
  }
}
