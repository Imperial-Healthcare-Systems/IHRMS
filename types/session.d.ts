/**
 * Plain Session types — no longer depends on next-auth.
 *
 * Synthesised from auth.users.app_metadata by lib/session.ts (server) and
 * lib/use-session.ts (client). Keeps every field the existing route handlers
 * and module pages read off `session.user`.
 */

export type Membership = {
  membershipId: string
  orgId: string
  orgName: string
  role: string
}

export type ImpersonatedBy = {
  identityId: string
  email: string
  name: string
  startedAt: string
} | null

export interface Session {
  user: {
    id: string
    email: string
    name?: string | null
    image?: string | null

    // Legacy fields (existing routes + middleware read these).
    empId: string | null
    role: string
    isAdmin: boolean
    orgId: string
    planTier: string
    subscriptionStatus: string

    // New tenant-spec fields.
    isPlatformAdmin: boolean
    activeOrgId: string
    activeMembershipId: string | null
    activeRole: string
    activeOrgName: string | null
    activeBrandingLevel: string
    activePlanTier: string
    activeSubscriptionStatus: string
    allMemberships: Membership[]

    // Impersonation flags.
    isImpersonating: boolean
    impersonatorAdminId: string | null
    impersonationLogId: string | null
    impersonatedBy?: ImpersonatedBy
  }
  /** ISO timestamp the session expires at — synthesised, not load-bearing. */
  expires: string
}
