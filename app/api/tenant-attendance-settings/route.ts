/**
 * GET   /api/tenant-attendance-settings — per-tenant grid configuration.
 * PATCH /api/tenant-attendance-settings — admin updates pinned_codes,
 *                                          weekly_off_days, flag thresholds.
 *
 * Migration 111 seeds one row per org so GET always succeeds (no row check
 * needed downstream). PATCH validates pinned_codes against live leave_types
 * via the validate_pinned_codes() RPC.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const ADMIN_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin']

const patchSchema = z.object({
  pinned_codes:       z.array(z.string().min(1).max(8)).max(8).optional(),
  weekly_off_days:    z.array(z.number().int().min(0).max(6)).min(0).max(7).optional(),
  flag_absent_at:     z.number().int().min(0).max(31).optional(),
  flag_punch_miss_at: z.number().int().min(0).max(31).optional(),
  fiscal_year_start:  z.number().int().min(1).max(12).optional(),
})

export async function GET(_req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const { data, error } = await supabaseAdmin
      .from('tenant_attendance_settings')
      .select('org_id, pinned_codes, weekly_off_days, flag_absent_at, flag_punch_miss_at, fiscal_year_start, created_at, updated_at')
      .eq('org_id', ctx.orgId)
      .maybeSingle()

    if (error && error.code !== '42P01') {
      console.error('[tenant-attendance-settings GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Migration 111's seed should have created a row for every org. Defensive
    // fallback returns the same default shape if a row is somehow missing.
    const defaults = {
      org_id: ctx.orgId,
      pinned_codes: [] as string[],
      weekly_off_days: [0, 6],
      flag_absent_at: 2,
      flag_punch_miss_at: 3,
      fiscal_year_start: 4,
      created_at: null,
      updated_at: null,
    }
    return NextResponse.json({ data: data ?? defaults })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load settings'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const body = parsed.data

    // Validate pinned_codes against live leave_types for this org.
    if (body.pinned_codes !== undefined && body.pinned_codes.length > 0) {
      const { data: ok, error: rpcErr } = await supabaseAdmin.rpc('validate_pinned_codes', {
        p_org_id: ctx.orgId,
        p_codes: body.pinned_codes,
      })
      if (rpcErr) {
        console.error('[tenant-attendance-settings PATCH] validate_pinned_codes:', rpcErr)
        return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
      }
      if (ok !== true) {
        return NextResponse.json({
          error: 'One or more pinned codes do not match an active leave type for your org.',
          pinned_codes: body.pinned_codes,
        }, { status: 400 })
      }
    }

    const update: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
    const { data, error } = await supabaseAdmin
      .from('tenant_attendance_settings')
      .upsert({ org_id: ctx.orgId, ...update } as never, { onConflict: 'org_id' })
      .select('*')
      .single()

    if (error) {
      console.error('[tenant-attendance-settings PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId,
      actor_membership_id: ctx.membershipId,
      action: 'updated',
      module: 'tenant_attendance_settings',
      entity_id: ctx.orgId,
      summary: `Updated team-attendance settings: ${Object.keys(body).join(', ')}`,
    })

    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update settings'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
