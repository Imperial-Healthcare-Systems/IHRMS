/**
 * NextAuth options for IHRMS — Phase 1 of IMPERIAL_TENANT_SPEC v1.0.
 *
 * Auth root is now `identities` (multi-tenant model). Memberships drive
 * access control. The session shape preserves ALL legacy fields
 * (id, role, orgId, planTier, subscriptionStatus, isAdmin, empId)
 * for backward compatibility with the 100+ existing API routes that
 * read them; the new Active* fields coexist for routes that have
 * been retrofitted to call requireAuth().
 *
 * Login flow:
 *   1. Email + OTP credentials
 *   2. Try identity-based path (preferred): findIdentityByEmail → memberships → activeOrg
 *   3. If no identity exists yet (legacy employee never backfilled), fall back to
 *      findActiveEmployeeByEmail. This will gradually disappear as Migration 101's
 *      backfill catches new employees on each signup.
 */
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { findActiveEmployeeByEmail } from './auth-utils'
import { verifyOtpChallenge } from './otp'
import { supabaseAdmin } from './supabase-admin'
import { findIdentityByEmail, recordLogin } from './auth-shared/identity'
import { getActiveMemberships, pickActiveOrg } from './auth-shared/membership'

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET

const APP_KIND: 'ihrms' | 'icrm' | 'admin' = 'ihrms'

const providers = [
  CredentialsProvider({
    name: 'email-otp',
    credentials: {
      email:          { label: 'Email',           type: 'email' },
      otp:            { label: 'One-Time Password', type: 'text' },
      challengeToken: { label: 'Challenge Token', type: 'text' },
      preferOrgId:    { label: 'Preferred Org Id', type: 'text' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.otp || !credentials?.challengeToken) {
        return null
      }

      const email = credentials.email.trim().toLowerCase()

      const verification = verifyOtpChallenge({
        email,
        otp:            credentials.otp,
        challengeToken: credentials.challengeToken,
      })
      if (!verification.valid) return null

      try {
        // ── Path A: identity-based (preferred) ─────────────────────────────
        const identity = await findIdentityByEmail(email)

        if (identity) {
          if (identity.isLocked) return null

          // Get all active memberships, then filter to those with HRMS access
          const allMemberships = await getActiveMemberships(identity.id)
          const eligible = allMemberships.filter(m => m.hrmsAccess)

          if (eligible.length === 0) {
            // Identity exists but no HRMS membership → fall through to legacy path.
            // Don't return null yet; the legacy path may find an employee row that
            // hasn't been linked to a membership yet.
          } else {
            const active = await pickActiveOrg(identity.id, eligible, credentials.preferOrgId)
            if (!active) return null

            // Block if subscription is in deactivated state
            if (active.subscriptionStatus === 'deactivated') return null

            // Look up the matching employee profile for legacy field continuity
            // (existing routes read empId, isAdmin from this).
            const { data: emp } = await supabaseAdmin
              .from('employees')
              .select('id, emp_id, first_name, last_name, role, is_admin, avatar_url')
              .eq('identity_id', identity.id)
              .eq('org_id', active.orgId)
              .maybeSingle()

            // Sanitize role/admin state — legacy `isAdmin` and `role` fields keep
            // their meaning so existing route role checks don't break.
            const legacyRole    = emp?.role     ?? active.role
            const legacyIsAdmin = emp?.is_admin ?? ['owner','admin','hr_admin','crm_admin'].includes(active.role)

            await recordLogin(identity.id, active.orgId)

            return {
              // ── id/email/name/image (NextAuth canonical) ──
              id:    emp?.id ?? identity.id,  // employee.id when available, else identity.id
              email: identity.email,
              name:  identity.fullName ?? (`${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim() || identity.email),
              image: identity.avatarUrl ?? emp?.avatar_url ?? null,

              // ── Legacy fields (every existing route reads these) ──
              empId:               emp?.emp_id ?? null,
              role:                legacyRole,
              isAdmin:             legacyIsAdmin,
              orgId:               active.orgId,
              planTier:            active.planTier ?? 'free',
              subscriptionStatus:  active.subscriptionStatus ?? 'active',

              // ── New tenant-spec fields (for requireAuth() consumers) ──
              isPlatformAdmin:        identity.isPlatformAdmin,
              activeOrgId:            active.orgId,
              activeMembershipId:     active.id,
              activeRole:             active.role,
              activeOrgName:          active.orgName,
              activeBrandingLevel:    active.brandingLevel,
              activePlanTier:         active.planTier,
              activeSubscriptionStatus: active.subscriptionStatus,
              allMemberships: eligible.map(m => ({
                membershipId: m.id,
                orgId:        m.orgId,
                orgName:      m.orgName,
                role:         m.role,
              })),
            }
          }
        }

        // ── Path B: legacy fallback (employee not yet backfilled to identity) ──
        const employee = await findActiveEmployeeByEmail(email)
        if (!employee) return null

        // Hydrate org metadata the same way the old auth.ts did
        let orgId: string | null = null
        let planTier             = 'free'
        let subscriptionStatus   = 'active'

        const { data: empOrg } = await supabaseAdmin
          .from('employees')
          .select('org_id')
          .eq('id', employee.id)
          .maybeSingle()
        orgId = empOrg?.org_id ?? null

        if (orgId) {
          const { data: org } = await supabaseAdmin
            .from('organisations')
            .select('plan_tier, subscription_status')
            .eq('id', orgId)
            .maybeSingle()
          if (org) {
            planTier           = org.plan_tier           ?? 'free'
            subscriptionStatus = org.subscription_status ?? 'active'
          }
        }

        return {
          id:    employee.id,
          email: employee.email,
          name:  `${employee.first_name} ${employee.last_name}`,
          image: employee.avatar_url,

          // Legacy fields populated from employee row
          empId:              employee.emp_id,
          role:               employee.role,
          isAdmin:            employee.is_admin,
          orgId,
          planTier,
          subscriptionStatus,

          // New fields — best-effort mapping from legacy data so requireAuth() can work
          isPlatformAdmin:        false,
          activeOrgId:            orgId,
          activeMembershipId:     employee.id,  // fallback to employee.id as membership stand-in
          activeRole:             employee.role ?? 'member',
          activeOrgName:          null,
          activeBrandingLevel:    'none',
          activePlanTier:         planTier,
          activeSubscriptionStatus: subscriptionStatus,
          allMemberships: [],
        }
      } catch (err) {
        console.error('[auth] authorize error:', err)
        return null
      }
    },
  }),
]

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Copy every field from the authorize() return into the token
        const u = user as any
        token.id    = u.id
        token.empId = u.empId
        token.role  = u.role
        token.isAdmin = u.isAdmin
        token.orgId  = u.orgId
        token.planTier = u.planTier
        token.subscriptionStatus = u.subscriptionStatus
        token.isPlatformAdmin = u.isPlatformAdmin
        token.activeOrgId       = u.activeOrgId
        token.activeMembershipId = u.activeMembershipId
        token.activeRole        = u.activeRole
        token.activeOrgName     = u.activeOrgName
        token.activeBrandingLevel = u.activeBrandingLevel
        token.activePlanTier    = u.activePlanTier
        token.activeSubscriptionStatus = u.activeSubscriptionStatus
        token.allMemberships    = u.allMemberships
        token.isImpersonating   = u.isImpersonating ?? false
        token.impersonatorAdminId = u.impersonatorAdminId ?? null
        token.impersonationLogId  = u.impersonationLogId  ?? null
      }

      // Allow client-side session.update({ activeOrgId }) to switch org without re-login
      if (trigger === 'update' && (session as any)?.activeOrgId) {
        const s = session as any
        token.activeOrgId         = s.activeOrgId
        token.activeMembershipId  = s.activeMembershipId
        token.activeRole          = s.activeRole
        token.activeOrgName       = s.activeOrgName
        token.activeBrandingLevel = s.activeBrandingLevel
        token.activePlanTier      = s.activePlanTier
        token.activeSubscriptionStatus = s.activeSubscriptionStatus
        // Keep legacy `orgId` and `role` in sync with the new active context
        token.orgId    = s.activeOrgId
        token.role     = s.activeRole
        token.planTier = s.activePlanTier
        token.subscriptionStatus = s.activeSubscriptionStatus
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.id    = token.id
        u.empId = token.empId
        u.role  = token.role
        u.isAdmin = token.isAdmin
        u.orgId  = token.orgId
        u.planTier = token.planTier
        u.subscriptionStatus = token.subscriptionStatus
        u.isPlatformAdmin = token.isPlatformAdmin
        u.activeOrgId         = token.activeOrgId
        u.activeMembershipId  = token.activeMembershipId
        u.activeRole          = token.activeRole
        u.activeOrgName       = token.activeOrgName
        u.activeBrandingLevel = token.activeBrandingLevel
        u.activePlanTier      = token.activePlanTier
        u.activeSubscriptionStatus = token.activeSubscriptionStatus
        u.allMemberships      = token.allMemberships
        u.isImpersonating     = token.isImpersonating
        u.impersonatorAdminId = token.impersonatorAdminId
        u.impersonationLogId  = token.impersonationLogId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  session: { strategy: 'jwt' },
  secret: authSecret,
}

// Exported so other modules (impersonation receiver, switch-org route)
// can know which app they're in without re-reading process.env.
export { APP_KIND }
