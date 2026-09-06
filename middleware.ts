/**
 * Supabase-Auth-backed middleware (Phase G of IHRMS auth migration).
 *
 * Replaces the prior `next-auth/middleware` `withAuth` wrapper. Two
 * responsibilities:
 *
 *   1. Refresh the Supabase auth cookie (createServerClient + getUser).
 *      Without this pass, server components on subsequent requests would
 *      see a stale session.
 *
 *   2. Route role-gating against `app_metadata.legacy_role` / `active_role`.
 *      The role-prefix map below preserves the exact policy the previous
 *      withAuth callback enforced.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value)
          }
          response = NextResponse.next({ request: req })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Refresh the session and read claims.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('returnTo', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>
  const role = typeof meta.legacy_role === 'string'
    ? meta.legacy_role
    : (typeof meta.active_role === 'string' ? meta.active_role : 'employee')

  const pathname = req.nextUrl.pathname
  const matchedPrefix = Object.keys(ROUTE_ROLES)
    .filter(prefix => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]

  if (matchedPrefix) {
    const allowed = ROUTE_ROLES[matchedPrefix]
    if (!allowed.includes(role)) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('denied', matchedPrefix.replace('/', ''))
      return NextResponse.redirect(url)
    }
  }

  return response
}

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
