import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { findActiveEmployeeByEmail } from './auth-utils'
import { verifyOtpChallenge } from './otp'

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

        return {
          id: employee.id,
          email: employee.email,
          name: `${employee.first_name} ${employee.last_name}`,
          image: employee.avatar_url,
          empId: employee.emp_id,
          role: employee.role,
          isAdmin: employee.is_admin,
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).empId = token.empId
        ;(session.user as any).role = token.role
        ;(session.user as any).isAdmin = token.isAdmin
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
