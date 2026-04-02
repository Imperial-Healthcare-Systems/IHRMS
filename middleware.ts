import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: [
    '/profile/:path*',
    '/dashboard/:path*',
    '/employees/:path*',
    '/recruitment/:path*',
    '/attendance/:path*',
    '/leaves/:path*',
    '/payroll/:path*',
    '/reimbursements/:path*',
    '/performance/:path*',
    '/warnings/:path*',
    '/onboarding/:path*',
    '/exit/:path*',
    '/reports/:path*',
    '/compliance/:path*',
    '/assets/:path*',
    '/announcements/:path*',
    '/settings/:path*',
  ],
}
