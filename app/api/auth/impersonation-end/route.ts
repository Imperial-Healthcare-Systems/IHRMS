/**
 * End an active impersonation session — Phase 5 of IMPERIAL_TENANT_SPEC v1.0 §8.3.
 *
 * Triggered by the End Session button in the ImpersonationBanner. Three
 * side-effects, all best-effort (we always end the session even if any
 * one of them fails — getting the cookie cleared takes priority):
 *
 *   1. Stamp `platform_impersonation_log.ended_at = now()`
 *   2. Insert tenant_visible_audit row with `imperial.impersonation_ended`
 *   3. Clear the next-auth session cookie
 *
 * The Admin Console redirect URL is configurable via
 * IMPERIAL_ADMIN_BASE_URL — defaults to https://imperialhealthcare.cloud.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  const u = session?.user as { isImpersonating?: boolean; impersonationLogId?: string; activeOrgId?: string; orgId?: string } | undefined

  if (!u?.isImpersonating) {
    return NextResponse.json({ error: 'Not currently impersonating' }, { status: 400 })
  }

  const orgId = u.activeOrgId ?? u.orgId ?? null
  const logId = u.impersonationLogId ?? null
  const adminBase = process.env.IMPERIAL_ADMIN_BASE_URL ?? 'https://imperialhealthcare.cloud'
  const redirectTo = orgId ? `${adminBase}/orgs/${orgId}` : adminBase

  // 1. Close the impersonation log row (idempotent — only updates if not yet ended).
  if (logId) {
    await supabaseAdmin
      .from('platform_impersonation_log')
      .update({ ended_at: new Date().toISOString() } as never)
      .eq('id', logId)
      .is('ended_at', null)
      .then(({ error }) => {
        if (error) console.warn('[impersonation-end] log close non-fatal:', error.message)
      })
  }

  // 2. Tenant-visible audit row.
  if (orgId) {
    await supabaseAdmin.from('tenant_visible_audit').insert({
      org_id: orgId,
      event_type: 'imperial.impersonation_ended',
      imperial_admin_email: session?.user?.email ?? 'imperial-admin',
      reason: null,
      reference_type: 'impersonation_log',
      reference_id: logId,
    } as never).then(({ error }) => {
      if (error) console.warn('[impersonation-end] tenant_visible_audit insert non-fatal:', error.message)
    })
  }

  // 3. Clear the session cookie. Don't rely on signOut() — we want the
  //    redirect target to be the Admin Console, not /login.
  const isProd = process.env.NODE_ENV === 'production'
  const cookieName = isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

  const res = NextResponse.json({ success: true, redirectTo })
  res.cookies.set({
    name: cookieName,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return res
}
