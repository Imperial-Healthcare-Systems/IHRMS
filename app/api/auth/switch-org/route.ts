/**
 * POST /api/auth/switch-org
 *
 * Body: { orgId: string }
 *
 * Changes the active organisation for the current Supabase Auth session.
 *
 *   1. Read the caller from the Supabase session (cookie-backed).
 *   2. Verify they have an ACTIVE membership in orgId with hrms_access=true.
 *   3. Update app_metadata.{active_org_id, active_membership_id, active_role,
 *      active_org_name, active_branding_level, plan_tier, subscription_status}
 *      via the admin API.
 *   4. refreshSession so the cookie's JWT carries the new claims and RLS
 *      helpers (current_org_id) start returning the new org immediately.
 *   5. Persist identities.last_active_org_id.
 *
 * Response shape preserves the previous fields so OrgSwitcher only needs to
 * stop passing payload to update() — the client calls update() no-arg and
 * use-session re-reads from auth.users.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const identityId = user.id
    const currentOrgId = (user.app_metadata?.active_org_id as string | undefined) ?? null

    if (orgId === currentOrgId) {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        activeOrgId: orgId,
      })
    }

    // Verify the requested org is an active HRMS membership for this identity.
    const { data: membership, error } = await supabaseAdmin
      .from('memberships')
      .select(`
        id, role,
        organisations!inner ( id, name, plan_tier, subscription_status,
                              org_branding ( level ) )
      `)
      .eq('identity_id', identityId)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('hrms_access', true)
      .maybeSingle()

    if (error) {
      console.error('[auth/switch-org]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!membership) {
      return NextResponse.json({ error: 'No access to this organisation' }, { status: 403 })
    }

    const org = (membership as unknown as {
      id: string
      role: string
      organisations: {
        id: string
        name: string
        plan_tier: string | null
        subscription_status: string | null
        org_branding: { level: string }[] | null
      }
    }).organisations

    const planTier = org?.plan_tier ?? 'free'
    const subscriptionStatus = org?.subscription_status ?? 'active'
    const orgName = org?.name ?? null
    const brandingLevel = org?.org_branding?.[0]?.level ?? 'none'

    // Update app_metadata via admin API — preserve existing claims we don't
    // touch (all_memberships, is_platform_admin, emp_id, is_admin).
    const newMetadata = {
      ...(user.app_metadata ?? {}),
      active_org_id:         orgId,
      active_membership_id:  (membership as { id: string }).id,
      active_role:           (membership as { role: string }).role,
      active_org_name:       orgName,
      active_branding_level: brandingLevel,
      plan_tier:             planTier,
      subscription_status:   subscriptionStatus,
    }

    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(identityId, {
      app_metadata: newMetadata,
    })
    if (metaErr) {
      console.error('[auth/switch-org] updateUserById failed:', metaErr)
      return NextResponse.json({ error: 'Failed to switch organisation' }, { status: 500 })
    }

    // Refresh so the cookie's JWT carries the new claims.
    const { error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr) {
      console.error('[auth/switch-org] refreshSession failed:', refreshErr)
      // Non-fatal — claims land on the next natural refresh.
    }

    await supabaseAdmin
      .from('identities')
      .update({ last_active_org_id: orgId } as never)
      .eq('id', identityId)

    return NextResponse.json({
      success: true,
      activeOrgId: orgId,
      activeMembershipId: (membership as { id: string }).id,
      activeRole: (membership as { role: string }).role,
      activeOrgName: orgName,
      activeBrandingLevel: brandingLevel,
      activePlanTier: planTier,
      activeSubscriptionStatus: subscriptionStatus,
    })
  } catch (err) {
    console.error('[auth/switch-org POST]', err)
    const message = err instanceof Error ? err.message : 'Switch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
