import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequestWithAuth } from 'next-auth/middleware'

// Role → allowed route prefixes
// Routes not listed here are accessible to all authenticated users (e.g. /dashboard, /profile)
const ROUTE_ROLES: Record<string, string[]> = {
  '/payroll':        ['super_admin', 'hr_admin', 'admin', 'hr', 'payroll_admin'],
  '/settings':       ['super_admin', 'hr_admin', 'admin', 'hr'],
  '/recruitment':    ['super_admin', 'hr_admin', 'admin', 'hr'],
  '/reports':        ['super_admin', 'hr_admin', 'admin', 'hr', 'operations_head'],
  '/compliance':     ['super_admin', 'hr_admin', 'admin', 'hr'],
  '/warnings':       ['super_admin', 'hr_admin', 'admin', 'hr', 'manager'],
  '/onboarding':     ['super_admin', 'hr_admin', 'admin', 'hr'],
  '/exit':           ['super_admin', 'hr_admin', 'admin', 'hr'],
  '/reimbursements': ['super_admin', 'hr_admin', 'admin', 'hr', 'finance_admin'],
  '/employees':      ['super_admin', 'hr_admin', 'admin', 'hr', 'operations_head', 'manager'],
  '/performance':    ['super_admin', 'hr_admin', 'admin', 'hr', 'operations_head', 'manager'],
  '/attendance':     ['super_admin', 'hr_admin', 'admin', 'hr', 'operations_head', 'manager', 'employee'],
  '/leaves':         ['super_admin', 'hr_admin', 'admin', 'hr', 'operations_head', 'manager', 'employee'],
  '/announcements':  ['super_admin', 'hr_admin', 'admin', 'hr', 'operations_head', 'manager', 'employee'],
  '/assets':         ['super_admin', 'hr_admin', 'admin', 'hr'],
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { token } = req.nextauth
    const role = (token?.role as string | null | undefined) ?? 'employee'
    const pathname = req.nextUrl.pathname

    // Find the most specific matching route prefix
    const matchedPrefix = Object.keys(ROUTE_ROLES)
      .filter((prefix) => pathname.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0]  // longest match wins

    if (matchedPrefix) {
      const allowedRoles = ROUTE_ROLES[matchedPrefix]
      if (!allowedRoles.includes(role)) {
        // Redirect to dashboard with an "access denied" query param
        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('denied', matchedPrefix.replace('/', ''))
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/login',
      error: '/login',
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

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
