/**
 * NextAuth session shape augmentation.
 *
 * IHRMS keeps both the legacy fields (id, role, orgId, planTier, subscriptionStatus,
 * isAdmin, empId) and the new tenant-spec fields (activeOrgId, activeMembershipId,
 * etc.) on the same session during the Phase 2 retrofit period.
 *
 * Routes calling the new `requireAuth()` use the Active* fields.
 * Routes still reading session.user.id / .role / .orgId continue to work unchanged.
 */
import type { DefaultSession, DefaultUser } from 'next-auth'
import type { JWT as DefaultJWT } from 'next-auth/jwt'

export type MembershipRole =
  | 'owner' | 'admin' | 'hr_admin' | 'crm_admin'
  | 'manager' | 'member' | 'finance' | 'viewer'

export interface MembershipSummary {
  membershipId: string
  orgId: string
  orgName: string
  role: MembershipRole | string
}

declare module 'next-auth' {
  interface Session {
    user: {
      // ── Legacy fields (preserved for Phase 2 retrofit period) ──
      id: string
      empId?: string | null
      role?: string | null
      isAdmin?: boolean
      orgId?: string | null
      planTier?: string
      subscriptionStatus?: string

      // ── New tenant-spec fields ──
      isPlatformAdmin?: boolean
      activeOrgId?: string | null
      activeMembershipId?: string | null
      activeRole?: MembershipRole | string | null
      activeOrgName?: string | null
      activeBrandingLevel?: 'none' | 'logo' | 'full' | 'custom_domain'
      activePlanTier?: string | null
      activeSubscriptionStatus?: string | null
      allMemberships?: MembershipSummary[]

      // ── Impersonation (set when Imperial admin is acting as a tenant user) ──
      isImpersonating?: boolean
      impersonatorAdminId?: string | null
      impersonationLogId?: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    empId?: string | null
    role?: string | null
    isAdmin?: boolean
    orgId?: string | null
    planTier?: string
    subscriptionStatus?: string
    isPlatformAdmin?: boolean
    activeOrgId?: string | null
    activeMembershipId?: string | null
    activeRole?: MembershipRole | string | null
    activeOrgName?: string | null
    activeBrandingLevel?: string | null
    activePlanTier?: string | null
    activeSubscriptionStatus?: string | null
    allMemberships?: MembershipSummary[]
    isImpersonating?: boolean
    impersonatorAdminId?: string | null
    impersonationLogId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string
    empId?: string | null
    role?: string | null
    isAdmin?: boolean
    orgId?: string | null
    planTier?: string
    subscriptionStatus?: string
    isPlatformAdmin?: boolean
    activeOrgId?: string | null
    activeMembershipId?: string | null
    activeRole?: MembershipRole | string | null
    activeOrgName?: string | null
    activeBrandingLevel?: string | null
    activePlanTier?: string | null
    activeSubscriptionStatus?: string | null
    allMemberships?: MembershipSummary[]
    isImpersonating?: boolean
    impersonatorAdminId?: string | null
    impersonationLogId?: string | null
  }
}
