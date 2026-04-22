import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { findActiveEmployeeByEmail } from './auth-utils'
import { verifyOtpChallenge } from './otp'
import { supabaseAdmin } from './supabase'

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET

const providers = [
  CredentialsProvider({
    name: 'email-otp',
    credentials: {
      email: { label: 'Email', type: 'email' },
      otp: { label: 'One-Time Password', type: 'text' },
      challengeToken: { label: 'Challenge Token', type: 'text' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.otp || !credentials?.challengeToken) {
        return null
      }

      const email = credentials.email.trim().toLowerCase()
      const verification = verifyOtpChallenge({
        email,
        otp: credentials.otp,
        challengeToken: credentials.challengeToken,
      })

      if (!verification.valid) {
        return null
      }

      try {
        const employee = await findActiveEmployeeByEmail(email)

        if (!employee) {
          return null
        }

        // Fetch org metadata for JWT caching (eliminates per-request DB calls)
        let orgId: string | null = null
        let planTier: string = 'free'
        let subscriptionStatus: string = 'active'

        if (employee.department_id) {
          const { data: empOrg } = await supabaseAdmin
            .from('employees')
            .select('org_id')
            .eq('id', employee.id)
            .maybeSingle()
          orgId = empOrg?.org_id ?? null
        }

        if (orgId) {
          const { data: org } = await supabaseAdmin
            .from('organisations')
            .select('plan_tier, subscription_status')
            .eq('id', orgId)
            .maybeSingle()
          if (org) {
            planTier = org.plan_tier ?? 'free'
            subscriptionStatus = org.subscription_status ?? 'active'
          }
        }

        return {
          id: employee.id,
          email: employee.email,
          name: `${employee.first_name} ${employee.last_name}`,
          image: employee.avatar_url,
          empId: employee.emp_id,
          role: employee.role,
          isAdmin: employee.is_admin,
          orgId,
          planTier,
          subscriptionStatus,
        }
      } catch {
        return null
      }
    },
  }),
]

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.empId = (user as any).empId
        token.role = (user as any).role
        token.isAdmin = (user as any).isAdmin
        token.orgId = (user as any).orgId
        token.planTier = (user as any).planTier
        token.subscriptionStatus = (user as any).subscriptionStatus
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).empId = token.empId
        ;(session.user as any).role = token.role
        ;(session.user as any).isAdmin = token.isAdmin
        ;(session.user as any).orgId = token.orgId
        ;(session.user as any).planTier = token.planTier
        ;(session.user as any).subscriptionStatus = token.subscriptionStatus
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  secret: authSecret,
}
