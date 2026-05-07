/**
 * Canonical session helpers per IMPERIAL_TENANT_SPEC v1.0 Section 3.4.
 *
 * Required at the top of EVERY tenant-scoped API route during/after the
 * Phase 2 retrofit (except /api/auth/* and /api/cron/* routes which run
 * with no session or with CRON_SECRET).
 *
 * Returns the AuthContext or a 401/403 response. Never trust orgId from
 * anywhere except the JWT (Founding Principle 2).
 */
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

export type AuthContext = {
  /** identities.id — the auth root */
  identityId: string
  /** memberships.id for the active org (legacy fallback: employee.id when no membership) */
  membershipId: string
  /** active organisation id — read from JWT only, never from request */
  orgId: string
  /** active membership role (membership_role enum) */
  role: string
  /** denormalized email for logging convenience */
  email: string
  /** platform admin flag (Imperial admin only) */
  isPlatformAdmin: boolean
  /** true when this session was issued by the Admin Console as an impersonation */
  isImpersonating: boolean
  /** identities.id of the impersonating Imperial admin (only set when isImpersonating) */
  impersonatorAdminId: string | null
}

/**
 * REQUIRED at the top of EVERY tenant-scoped API route.
 *
 * Returns either { ctx, error: null } or { ctx: null, error: <NextResponse> }.
 * Callers do:
 *
 *   const { ctx, error } = await requireAuth()
 *   if (error) return error
 *   // ... use ctx.orgId for filtering
 */
export async function requireAuth(): Promise<
  { ctx: AuthContext; error: null } | { ctx: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions)
  const u = session?.user as any
  if (!u?.id) {
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Compatibility layer: prefer new Active* fields, fall back to legacy fields.
  // Once Phase 2 finishes the retrofit, the legacy fallbacks can be removed.
  const orgId        = u.activeOrgId        ?? u.orgId        ?? null
  const membershipId = u.activeMembershipId ?? u.id           // employee.id as fallback
  const role         = u.activeRole         ?? u.role         ?? 'member'

  if (!orgId) {
    return {
      ctx: null,
      error: NextResponse.json({ error: 'No active organisation' }, { status: 403 }),
    }
  }

  return {
    ctx: {
      identityId:           u.id,
      membershipId,
      orgId,
      role,
      email:                u.email ?? '',
      isPlatformAdmin:      u.isPlatformAdmin ?? u.isAdmin ?? false,
      isImpersonating:      u.isImpersonating ?? false,
      impersonatorAdminId:  u.impersonatorAdminId ?? null,
    },
    error: null,
  }
}

/**
 * Use when the route requires a specific role (or any of a set of roles).
 *
 *   const { ctx, error } = await requireRole(['owner','admin','hr_admin'])
 *   if (error) return error
 */
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
