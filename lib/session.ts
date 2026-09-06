/**
 * Session helpers — Supabase Auth backed (Phase E of IHRMS migration).
 *
 * Public surface unchanged from the NextAuth era:
 *   - `requireAuth()` returns `{ ctx: AuthContext, error: null }` or `{ ctx: null, error: NextResponse }`
 *   - `requireRole(allowed)` same shape, with role-allow-list check
 *
 * Added:
 *   - `getSession()` returns a NextAuth-shaped Session object (or null).
 *     Used by lib/use-session.ts to synthesise the client hook and by
 *     impersonation-end / signup flows for soft session reads.
 *
 * What changed internally:
 *   - Session is read from the cookie-backed Supabase server client.
 *   - AuthContext fields come from auth.users.app_metadata (written by
 *     verify-otp, switch-org, impersonation-login).
 *   - Impersonation liveness check on every requireAuth(): if
 *     app_metadata.impersonation_log_id refers to a row whose ended_at is
 *     non-NULL, the Supabase session is signed out and 401 is returned.
 *     Enforces the 1-hour cap; the hourly zombie sweeper closes stale rows.
 */
import { NextResponse } from 'next/server'
import type { Session, Membership } from '@/types/session'

import { getServerSupabase } from './supabase-server'
import { supabaseAdmin } from './supabase-admin'

export type AuthContext = {
  /** identities.id — auth root */
  identityId: string
  /** memberships.id for the active org */
  membershipId: string
  /** active organisation id */
  orgId: string
  /** active membership role */
  role: string
  /** denormalized email for logging convenience */
  email: string
  /** platform admin flag */
  isPlatformAdmin: boolean
  /** true when this session was issued by the Admin Console as an impersonation */
  isImpersonating: boolean
  /** identities.id of the impersonating Imperial admin (only set when isImpersonating) */
  impersonatorAdminId: string | null
}

const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin'])

function readMembershipsClaim(meta: Record<string, unknown>): Membership[] {
  const raw = meta.all_memberships
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

/**
 * Read the current Supabase session and synthesise a Session object so
 * existing callers keep working. Returns null if there is no session OR
 * if the session is an impersonation whose log row has been closed.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await getServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>

  // Impersonation cap enforcement — close the session if the log row ended.
  const impersonationLogId = typeof meta.impersonation_log_id === 'string' ? meta.impersonation_log_id : null
  const isImpersonating = meta.is_impersonating === true
  if (isImpersonating && impersonationLogId) {
    const { data: log } = await supabaseAdmin
      .from('platform_impersonation_log')
      .select('ended_at')
      .eq('id', impersonationLogId)
      .maybeSingle() as { data: { ended_at: string | null } | null }

    if (!log || log.ended_at) {
      await supabase.auth.signOut().catch(() => {})
      return null
    }
  }

  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>
  const role = typeof meta.active_role === 'string' ? meta.active_role : 'member'
  const orgId = typeof meta.active_org_id === 'string' ? meta.active_org_id : ''
  const membershipId = typeof meta.active_membership_id === 'string' ? meta.active_membership_id : null
  const orgName = typeof meta.active_org_name === 'string' ? meta.active_org_name : null
  const brandingLevel = typeof meta.active_branding_level === 'string' ? meta.active_branding_level : 'none'
  const planTier = typeof meta.plan_tier === 'string' ? meta.plan_tier : 'free'
  const subscriptionStatus = typeof meta.subscription_status === 'string' ? meta.subscription_status : 'active'
  const isPlatformAdmin = meta.is_platform_admin === true
  const impersonatorAdminId = typeof meta.impersonator_admin_id === 'string' ? meta.impersonator_admin_id : null
  const empId = typeof meta.emp_id === 'string' ? meta.emp_id : null
  const isAdmin = meta.is_admin === true || ADMIN_ROLES.has(role)
  const legacyRole = typeof meta.legacy_role === 'string' ? meta.legacy_role : role
  const allMemberships = readMembershipsClaim(meta)

  const session: Session = {
    user: {
      id: user.id,
      email: user.email ?? '',
      name: typeof userMeta.full_name === 'string' ? userMeta.full_name : null,
      image: typeof userMeta.avatar_url === 'string' ? userMeta.avatar_url : null,

      // Legacy fields
      empId,
      role: legacyRole,
      isAdmin,
      orgId,
      planTier,
      subscriptionStatus,

      // Active*
      isPlatformAdmin,
      activeOrgId:           orgId,
      activeMembershipId:    membershipId,
      activeRole:            role,
      activeOrgName:         orgName,
      activeBrandingLevel:   brandingLevel,
      activePlanTier:        planTier,
      activeSubscriptionStatus: subscriptionStatus,
      allMemberships,

      // Impersonation
      isImpersonating,
      impersonatorAdminId,
      impersonationLogId,
      impersonatedBy: isImpersonating && impersonatorAdminId
        ? { identityId: impersonatorAdminId, email: '', name: '', startedAt: '' }
        : null,
    },
    expires: '',
  }

  return session
}

/**
 * REQUIRED at the top of EVERY tenant-scoped API route.
 *
 *   const { ctx, error } = await requireAuth()
 *   if (error) return error
 *   // ... use ctx.orgId for filtering
 */
export async function requireAuth(): Promise<
  { ctx: AuthContext; error: null } | { ctx: null; error: NextResponse }
> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const u = session.user
  const orgId = u.activeOrgId ?? u.orgId
  if (!orgId) {
    return {
      ctx: null,
      error: NextResponse.json({ error: 'No active organisation' }, { status: 403 }),
    }
  }

  return {
    ctx: {
      identityId:          u.id,
      membershipId:        u.activeMembershipId ?? u.id,
      orgId,
      role:                u.activeRole ?? u.role ?? 'member',
      email:               u.email ?? '',
      isPlatformAdmin:     u.isPlatformAdmin,
      isImpersonating:     u.isImpersonating,
      impersonatorAdminId: u.impersonatorAdminId,
    },
    error: null,
  }
}

export async function requireRole(allowed: string[]): Promise<
  { ctx: AuthContext; error: null } | { ctx: null; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result
  if (!allowed.includes(result.ctx.role)) {
    return {
      ctx: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return result
}
