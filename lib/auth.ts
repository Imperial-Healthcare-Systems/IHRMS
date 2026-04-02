import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from './supabase'

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET
const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET

const providers = [
  ...(googleClientId && googleClientSecret
    ? [
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : []),
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null
      try {
        const { data: employee } = await supabaseAdmin
          .from('employees')
          .select('id, emp_id, first_name, last_name, email, role, is_admin, avatar_url, department_id')
          .eq('email', credentials.email)
          .eq('status', 'active')
          .single()
        if (!employee) return null
        // In production, verify password hash from auth table
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
        (session.user as any).id = token.id
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
