/**
 * POST /api/auth/verify-otp
 *
 * Server-side OTP verification + Supabase Auth session cookie issuance.
 *
 * Body: { email, otp }
 *
 * Flow ORDER MATTERS:
 *   1. Resolve identity + active HRMS memberships + employee row BY EMAIL.
 *      We compute org context BEFORE verifying the OTP because:
 *   2. Write app_metadata via admin API. This invalidates any existing
 *      refresh tokens — but the user has none yet at this stage, so no
 *      collateral damage. Crucially, doing this BEFORE verifyOtp means the
 *      session JWT verifyOtp mints will already carry the new claims.
 *   3. verifyOtp — cookies are written with a session JWT that already
 *      includes active_org_id / active_role / all_memberships. No
 *      refreshSession() needed.
 *
 * The reverse ordering breaks because updateUserById invalidates refresh
 * tokens, the subsequent refresh fails, and @supabase/ssr clears the
 * auth cookies on refresh failure — user gets bounced to /login.
 *
 * Security note: doing lookups before OTP verify means we touch admin APIs
 * on failed-OTP attempts. Writes are idempotent (computed from current
 * membership state — no privilege escalation), and /api/auth/otp's rate
 * limit caps blast radius.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type MembershipRow = {
  id: string
  org_id: string
  role: string
  organisations: {
    name: string
    plan_tier: string | null
    subscription_status: string | null
    org_branding: { level: string }[] | null
  } | null
}

const MANAGER_ROLES = new Set(['super_admin', 'admin', 'hr_admin', 'crm_admin', 'manager'])
const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin'])

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Email and OTP are required.' }, { status: 400 })
    }
    if (!/^\d{4,10}$/.test(otp)) {
      return NextResponse.json({ error: 'Enter the numeric OTP from the email.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // ── 1. Identity ────────────────────────────────────────────────────
    const { data: identity } = await supabaseAdmin
      .from('identities')
      .select('id, is_platform_admin, last_active_org_id, full_name, avatar_url')
      .eq('email', normalizedEmail)
      .maybeSingle() as {
        data: {
          id: string
          is_platform_admin: boolean | null
          last_active_org_id: string | null
          full_name: string | null
          avatar_url: string | null
        } | null
      }

    if (!identity) {
      return NextResponse.json({ error: 'No account found for that email.' }, { status: 403 })
    }

    // ── 2. Active HRMS memberships ─────────────────────────────────────
    const { data: rawMemberships } = await supabaseAdmin
      .from('memberships')
      .select(`
        id, org_id, role,
        organisations ( name, plan_tier, subscription_status, org_branding ( level ) )
      `)
      .eq('identity_id', identity.id)
      .eq('status', 'active')
      .eq('hrms_access', true)

    const memberships = (rawMemberships ?? []).map(m => {
      const orgRaw = (m as unknown as { organisations: unknown }).organisations
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
      return {
        id: (m as { id: string }).id,
        org_id: (m as { org_id: string }).org_id,
        role: (m as { role: string }).role,
        organisations: org as MembershipRow['organisations'],
      } satisfies MembershipRow
    })

    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'HRMS access is not enabled for this account.' },
        { status: 403 },
      )
    }

    // Prefer last-active org if still valid, else first membership.
    const activeMembership =
      memberships.find(m => m.org_id === identity.last_active_org_id) ?? memberships[0]

    if (activeMembership.organisations?.subscription_status === 'deactivated') {
      return NextResponse.json(
        { error: 'This organisation has been deactivated.' },
        { status: 403 },
      )
    }

    const planTier = activeMembership.organisations?.plan_tier ?? 'free'
    const subscriptionStatus = activeMembership.organisations?.subscription_status ?? 'active'
    const orgName = activeMembership.organisations?.name ?? null
    const brandingLevel = activeMembership.organisations?.org_branding?.[0]?.level ?? 'none'

    // ── 3. Employee row for legacy fields (empId, is_admin) ────────────
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id, emp_id, first_name, last_name, role, is_admin, avatar_url')
      .eq('identity_id', identity.id)
      .eq('org_id', activeMembership.org_id)
      .maybeSingle() as {
        data: {
          id: string
          emp_id: string | null
          first_name: string | null
          last_name: string | null
          role: string | null
          is_admin: boolean | null
          avatar_url: string | null
        } | null
      }

    const legacyRole = emp?.role ?? activeMembership.role
    const legacyIsAdmin = emp?.is_admin ?? ADMIN_ROLES.has(activeMembership.role)

    // ── 4. Write app_metadata BEFORE verifyOtp ─────────────────────────
    // No refresh tokens exist for this login attempt yet, so the
    // invalidation is harmless. The next verifyOtp will mint a session
    // JWT that already carries these claims.
    const allMembershipsClaim = memberships.map(m => ({
      membership_id: m.id,
      org_id: m.org_id,
      org_name: m.organisations?.name ?? '',
      role: m.role,
    }))

    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(identity.id, {
      app_metadata: {
        active_org_id:         activeMembership.org_id,
        active_membership_id:  activeMembership.id,
        active_role:           activeMembership.role,
        active_org_name:       orgName,
        active_branding_level: brandingLevel,
        plan_tier:             planTier,
        subscription_status:   subscriptionStatus,
        is_platform_admin:     identity.is_platform_admin === true,
        all_memberships:       allMembershipsClaim,
        // Legacy continuity fields — read by middleware role gate and module pages.
        emp_id:                emp?.emp_id ?? null,
        is_admin:              legacyIsAdmin,
        legacy_role:           legacyRole,
      },
      user_metadata: {
        full_name:  identity.full_name ?? ([emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || null),
        avatar_url: identity.avatar_url ?? emp?.avatar_url ?? null,
      },
    })
    if (metaErr) {
      console.error('[verify-otp] updateUserById failed:', metaErr)
      return NextResponse.json(
        { error: 'Could not establish org context. Please try again.' },
        { status: 500 },
      )
    }

    // ── 5. Verify OTP — cookies are written with the fresh JWT ─────────
    const supabase = await getServerSupabase()
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp,
      type: 'email',
    })

    if (verifyErr || !verifyData?.user || !verifyData?.session) {
      return NextResponse.json(
        { error: verifyErr?.message ?? 'Incorrect or expired OTP. Request a new code.' },
        { status: 401 },
      )
    }

    // ── 6. Persist last_active_org_id (fire-and-forget) ────────────────
    await supabaseAdmin
      .from('identities')
      .update({ last_active_org_id: activeMembership.org_id } as never)
      .eq('id', identity.id)

    return NextResponse.json({
      success: true,
      redirectTo: '/dashboard',
      user: {
        id:                  emp?.id ?? identity.id,
        email:               normalizedEmail,
        name:                identity.full_name ?? ([emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || null),
        role:                legacyRole,
        orgId:               activeMembership.org_id,
        membershipId:        activeMembership.id,
        membershipRole:      activeMembership.role,
        planTier,
        subscriptionStatus,
        isAdmin:             legacyIsAdmin,
        isManager:           MANAGER_ROLES.has(legacyRole),
        isPlatformAdmin:     identity.is_platform_admin === true,
      },
    })
  } catch (err) {
    console.error('[verify-otp]', err)
    return NextResponse.json({ error: 'Failed to verify OTP. Try again.' }, { status: 500 })
  }
}
