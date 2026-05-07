/**
 * Switch the active org context for the current session.
 * Per IMPERIAL_TENANT_SPEC v1.0 §3.3.
 *
 * Verifies the requested org is in the caller's active memberships AND
 * that the membership grants HRMS access. Updates last_active_org_id
 * and returns the new Active* fields. The client must call
 * `session.update({...})` with the response so the JWT is refreshed —
 * see the JWT `update` trigger handling in lib/auth.ts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const identityId = (session.user as { id: string }).id

    // Verify the requested org is in the identity's active memberships
    // AND that this app's access flag is set (hrms_access for IHRMS).
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

    await supabaseAdmin
      .from('identities')
      .update({ last_active_org_id: orgId } as never)
      .eq('id', identityId)

    const org = (membership as unknown as {
      id: string
      role: string
      organisations: {
        id: string
        name: string
        plan_tier: string
        subscription_status: string
        org_branding: { level: string }[]
      }
    }).organisations

    return NextResponse.json({
      success: true,
      activeOrgId: orgId,
      activeMembershipId: (membership as { id: string }).id,
      activeRole: (membership as { role: string }).role,
      activeOrgName: org?.name ?? null,
      activeBrandingLevel: org?.org_branding?.[0]?.level ?? 'none',
      activePlanTier: org?.plan_tier ?? null,
      activeSubscriptionStatus: org?.subscription_status ?? null,
    })
  } catch (err) {
    console.error('[auth/switch-org POST]', err)
    const message = err instanceof Error ? err.message : 'Switch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
