/**
 * PATCH  /api/leave-types/[id] — edit a leave type's label / color / order / active flag.
 * DELETE /api/leave-types/[id] — soft-delete (set is_active=false) since historical
 *                                attendance_daily rows reference leave_type_id.
 *
 * Code itself is NOT editable post-creation (FK references and historical data
 * depend on a stable code). Admin can deactivate + create a new code instead.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const ADMIN_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin']

const patchSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  letter: z.string().length(1).nullable().optional(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const update: Record<string, unknown> = {}
    if (parsed.data.label !== undefined)         update.label = parsed.data.label
    if (parsed.data.letter !== undefined)        update.letter = parsed.data.letter
    if (parsed.data.color_hex !== undefined)     update.color_hex = parsed.data.color_hex.toUpperCase()
    if (parsed.data.display_order !== undefined) update.display_order = parsed.data.display_order
    if (parsed.data.is_active !== undefined)     update.is_active = parsed.data.is_active

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .update(update as never)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
      console.error('[leave-types PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId,
      actor_membership_id: ctx.membershipId,
      action: 'updated',
      module: 'leave_types',
      entity_id: id,
      summary: `Updated leave type: ${Object.keys(update).join(', ')}`,
    })

    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update leave type'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    // Soft delete: historical attendance_daily rows still point at this id.
    // A hard delete would cascade leave_type_id to NULL via ON DELETE SET NULL,
    // which silently rewrites history. Soft delete preserves it.
    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .update({ is_active: false } as never)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('id, code, label')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
      console.error('[leave-types DELETE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const row = data as { id: string; code: string; label: string }
    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId,
      actor_membership_id: ctx.membershipId,
      action: 'deleted',
      module: 'leave_types',
      entity_id: id,
      summary: `Deactivated leave type ${row.code} (${row.label})`,
    })

    return NextResponse.json({ success: true, soft_deleted: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to deactivate leave type'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
