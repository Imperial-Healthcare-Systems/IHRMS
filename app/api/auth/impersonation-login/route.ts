/**
 * Impersonation receiver — Phase 5 of IMPERIAL_TENANT_SPEC v1.0 §8.1.
 *
 * Entry point hit by the Admin Console. Verifies the HS256 token signed
 * with IMPERSONATION_SECRET, walks the membership graph to resolve
 * identity_id + membership_id for the target user in the target org,
 * inserts a `tenant_visible_audit` row (Q3b — customer must see it),
 * mints a NextAuth session cookie carrying isImpersonating=true and
 * the impersonator's identity, then redirects to /dashboard.
 *
 * Cookie maxAge is forced to 3600s — impersonation sessions are
 * short-lived regardless of normal session policy.
 */
import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyImpersonationToken } from '@/lib/auth-shared/jwt-claims'

const SESSION_MAX_AGE_SECONDS = 3600 // 1 hour

export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    if (!nextAuthSecret) {
      return NextResponse.json({ error: 'NEXTAUTH_SECRET not configured' }, { status: 500 })
    }
    if (!process.env.IMPERSONATION_SECRET) {
      return NextResponse.json({ error: 'IMPERSONATION_SECRET not configured' }, { status: 500 })
    }

    // 1. Verify the impersonation token signature + claims.
    let claims
    try {
      claims = await verifyImpersonationToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (!claims.sub || !claims.orgId || !claims.impersonator || !claims.logId) {
      return NextResponse.json({ error: 'Malformed token' }, { status: 401 })
    }

    // 2. Verify the impersonation log row exists, hasn't been ended, and is
    //    still inside the 1-hour grace window. Uses cast through unknown
    //    because Supabase generated types don't include this Migration-105
    //    table yet.
    const { data: log } = await supabaseAdmin
      .from('platform_impersonation_log')
      .select('id, ended_at, started_at')
      .eq('id', claims.logId)
      .maybeSingle() as { data: { id: string; ended_at: string | null; started_at: string } | null }

    if (!log) {
      return NextResponse.json({ error: 'Impersonation session not found' }, { status: 403 })
    }
    if (log.ended_at) {
      return NextResponse.json({ error: 'Impersonation session already ended' }, { status: 403 })
    }
    if (Date.now() - new Date(log.started_at).getTime() > SESSION_MAX_AGE_SECONDS * 1000) {
      return NextResponse.json({ error: 'Impersonation session expired' }, { status: 401 })
    }

    // 3. Resolve identity_id + membership_id + role for the target.
    //    Token may carry an identity_id (preferred) OR a legacy employee.id.
    let identityId = claims.sub
    let membershipId: string | null = null
    let role: string = 'member'

    const { data: directMembership } = await supabaseAdmin
      .from('memberships')
      .select('id, role')
      .eq('identity_id', identityId)
      .eq('org_id', claims.orgId)
      .eq('status', 'active')
      .maybeSingle() as { data: { id: string; role: string } | null }

    if (directMembership) {
      membershipId = directMembership.id
      role = directMembership.role
    } else {
      // Legacy fallback: token's `sub` was an employee.id
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('identity_id, membership_id')
        .eq('id', claims.sub)
        .eq('org_id', claims.orgId)
        .maybeSingle() as { data: { identity_id: string | null; membership_id: string | null } | null }

      if (!emp || !emp.identity_id || !emp.membership_id) {
        return NextResponse.json({ error: 'Target user not found in this org' }, { status: 404 })
      }
      identityId = emp.identity_id
      membershipId = emp.membership_id

      const { data: m } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('id', membershipId)
        .maybeSingle() as { data: { role: string } | null }
      role = m?.role ?? 'member'
    }

    // 4. Hydrate identity + org metadata so the session JWT has
    //    everything the existing routes (legacy fields) expect.
    const [identityRes, orgRes, empRes] = await Promise.all([
      supabaseAdmin
        .from('identities')
        .select('email, full_name, avatar_url, is_platform_admin')
        .eq('id', identityId)
        .maybeSingle(),
      supabaseAdmin
        .from('organisations')
        .select('name, plan_tier, subscription_status, org_branding(level)')
        .eq('id', claims.orgId)
        .maybeSingle(),
      supabaseAdmin
        .from('employees')
        .select('id, emp_id, first_name, last_name, role, is_admin, avatar_url')
        .eq('identity_id', identityId)
        .eq('org_id', claims.orgId)
        .maybeSingle(),
    ])
    const identity = identityRes.data as unknown as {
      email: string
      full_name: string | null
      avatar_url: string | null
      is_platform_admin: boolean | null
    } | null
    const org = orgRes.data as unknown as {
      name: string
      plan_tier: string | null
      subscription_status: string | null
      org_branding: { level: string }[] | null
    } | null
    const emp = empRes.data as unknown as {
      id: string
      emp_id: string
      first_name: string
      last_name: string
      role: string
      is_admin: boolean
      avatar_url: string | null
    } | null

    // 5. Insert tenant-visible audit (Q3b — customer must see "Imperial admin
    //    impersonated this user"). The Imperial admin's email comes from
    //    their own identity row when possible, employee row as fallback.
    let imperialAdminEmail = 'imperial-admin'
    {
      const { data: adminIdentity } = await supabaseAdmin
        .from('identities')
        .select('email')
        .eq('id', claims.impersonator)
        .maybeSingle() as { data: { email: string } | null }
      if (adminIdentity?.email) {
        imperialAdminEmail = adminIdentity.email
      } else {
        const { data: adminEmp } = await supabaseAdmin
          .from('employees')
          .select('work_email')
          .eq('id', claims.impersonator)
          .maybeSingle() as { data: { work_email: string | null } | null }
        if (adminEmp?.work_email) imperialAdminEmail = adminEmp.work_email
      }
    }

    await supabaseAdmin.from('tenant_visible_audit').insert({
      org_id: claims.orgId,
      event_type: 'imperial.impersonation',
      imperial_admin_email: imperialAdminEmail,
      reason: claims.reason ?? null,
      reference_type: 'impersonation_log',
      reference_id: claims.logId,
      metadata: { impersonator_id: claims.impersonator, target_identity_id: identityId },
    } as never).then(({ error }) => {
      if (error) console.error('[impersonation-login] tenant_visible_audit INSERT FAILED:', error.message, { org_id: claims.orgId, event_type: 'imperial.impersonation' })
    })

    // 6. Mint a NextAuth session JWT with the same shape lib/auth.ts emits
    //    on a normal credentials login. Keep both legacy and Active*
    //    fields populated so all retrofitted + non-retrofitted routes work.
    const planTier = org?.plan_tier ?? 'free'
    const subscriptionStatus = org?.subscription_status ?? 'active'
    const brandingLevel = org?.org_branding?.[0]?.level ?? 'none'
    const legacyId = emp?.id ?? identityId
    const legacyRole = emp?.role ?? role
    const legacyIsAdmin = emp?.is_admin ?? ['owner', 'admin', 'hr_admin', 'crm_admin'].includes(role)
    const legacyName = (identity?.full_name ?? `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim()) || identity?.email || 'User'

    const sessionToken = await encode({
      token: {
        // ── NextAuth canonical ──
        id:    legacyId,
        email: identity?.email ?? '',
        name:  legacyName,
        picture: identity?.avatar_url ?? emp?.avatar_url ?? null,

        // ── Legacy fields (every existing route reads these) ──
        empId:               emp?.emp_id ?? null,
        role:                legacyRole,
        isAdmin:             legacyIsAdmin,
        orgId:               claims.orgId,
        planTier,
        subscriptionStatus,

        // ── New tenant-spec fields (requireAuth() consumers) ──
        isPlatformAdmin:        identity?.is_platform_admin ?? false,
        activeOrgId:            claims.orgId,
        activeMembershipId:     membershipId,
        activeRole:             role,
        activeOrgName:          org?.name ?? null,
        activeBrandingLevel:    brandingLevel,
        activePlanTier:         planTier,
        activeSubscriptionStatus: subscriptionStatus,
        // Single-org list — impersonation is locked to one org per session.
        allMemberships: [{
          membershipId,
          orgId:   claims.orgId,
          orgName: org?.name ?? '',
          role,
        }],

        // ── Impersonation flags ──
        isImpersonating:     true,
        impersonatorAdminId: claims.impersonator,
        impersonationLogId:  claims.logId,
      },
      secret: nextAuthSecret,
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    // 7. Set the cookie + redirect. Cookie name varies by environment per
    //    NextAuth's default cookie naming (matches getServerSession reads).
    const isProd = process.env.NODE_ENV === 'production'
    const cookieName = isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

    const response = NextResponse.redirect(new URL('/dashboard?impersonating=1', req.url))
    response.cookies.set({
      name: cookieName,
      value: sessionToken,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('[auth/impersonation-login GET]', err)
    const message = err instanceof Error ? err.message : 'Impersonation login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
