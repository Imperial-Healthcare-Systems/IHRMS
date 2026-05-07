/**
 * GET  /api/branding — current org's branding settings.
 * PATCH /api/branding — update branding fields the customer's level allows.
 *
 * Per spec §9.4 the *level* itself is set by Imperial Admin Console
 * (it's a billing/contractual decision). The customer can only edit the
 * field set their level enables — see BRANDING_FIELDS_BY_LEVEL.
 *
 * Requires HR_ADMIN_ROLES — branding is an admin-level org setting.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrgBranding, BRANDING_FIELDS_BY_LEVEL, type OrgBranding } from '@/lib/branding'
import { logAudit } from '@/lib/audit'

const ADMIN_ROLES = ['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin']

export async function GET(_req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const branding = await getOrgBranding(ctx.orgId)
    return NextResponse.json({ data: branding })
  } catch (err) {
    console.error('[branding GET]', err)
    const message = err instanceof Error ? err.message : 'Failed to load branding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const body = (await req.json()) as Record<string, unknown>

    // Defensive — strip identifiers and immutable fields the client may try to send.
    delete body.id
    delete body.org_id
    delete body.created_at
    delete body.updated_at
    delete body.level                    // level is admin-set only
    delete body.email_dns_verified       // verified by ops flow
    delete body.custom_domain_verified
    delete body.custom_domain_hrms       // managed by Admin Console
    delete body.custom_domain_crm

    const branding = await getOrgBranding(ctx.orgId)
    const allowed = new Set(BRANDING_FIELDS_BY_LEVEL[branding.level])

    if (allowed.size === 0) {
      return NextResponse.json({
        error: 'Branding customisation is not enabled on your plan. Upgrade to Pro or higher to customise branding.',
        level: branding.level,
      }, { status: 403 })
    }

    const update: Record<string, unknown> = {}
    const rejected: string[] = []
    for (const k of Object.keys(body)) {
      if (allowed.has(k as keyof OrgBranding)) update[k] = body[k]
      else rejected.push(k)
    }

    // Specifically guard hide_powered_by — only togglable at level >= 'full'.
    if ('hide_powered_by' in update && branding.level !== 'full' && branding.level !== 'custom_domain') {
      delete update.hide_powered_by
      rejected.push('hide_powered_by')
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({
        error: 'No allowed fields to update at this branding level.',
        rejected,
        level: branding.level,
      }, { status: 400 })
    }

    update.updated_at = new Date().toISOString()

    // Upsert ensures the row exists (Migration 103's seed should have
    // already created it, but defensive idempotence costs nothing).
    const { data, error } = await supabaseAdmin
      .from('org_branding')
      .upsert({ org_id: ctx.orgId, ...update } as never, { onConflict: 'org_id' })
      .select('*')
      .single()

    if (error) {
      console.error('[branding PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'updated',
      module: 'branding',
      entity_id: ctx.orgId,
      summary: `Updated branding fields: ${Object.keys(update).filter(k => k !== 'updated_at').join(', ')}`,
    })

    return NextResponse.json({ data, rejected })
  } catch (err) {
    console.error('[branding PATCH catch]', err)
    const message = err instanceof Error ? err.message : 'Failed to update branding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
