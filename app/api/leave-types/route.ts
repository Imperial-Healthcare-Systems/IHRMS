/**
 * GET  /api/leave-types — list the tenant's configured leave types.
 *                        Used by the manager-grid legend + the admin module.
 * POST /api/leave-types — create a new leave type (admin only).
 *
 * Read access: any authenticated org member (the manager-grid needs it).
 * Write access: owner/admin/hr_admin (per spec §4 admin-role gates).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const ADMIN_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin']

const createSchema = z.object({
  code: z.string().min(1).max(8).regex(/^[A-Z0-9]+$/, 'Code must be UPPERCASE letters/digits only'),
  label: z.string().min(1).max(80),
  letter: z.string().length(1).optional().nullable(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be #RRGGBB hex'),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

// Reserved codes — system codes can never be defined as a leave type.
const RESERVED_CODES = new Set(['P', 'A', 'PM', 'WO'])

export async function GET(_req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .select('id, org_id, code, label, letter, color_hex, is_active, display_order, created_at, updated_at')
      .eq('org_id', ctx.orgId)
      .order('display_order', { ascending: true })
      .order('code', { ascending: true })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      console.error('[leave-types GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list leave types'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const body = parsed.data
    const code = body.code.toUpperCase()

    if (RESERVED_CODES.has(code)) {
      return NextResponse.json({ error: `Code "${code}" is reserved as a system status` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .insert({
        org_id: ctx.orgId,
        code,
        label: body.label,
        letter: body.letter ?? null,
        color_hex: body.color_hex.toUpperCase(),
        is_active: body.is_active ?? true,
        display_order: body.display_order ?? 100,
      } as never)
      .select('*')
      .single()

    if (error) {
      // 23505 = unique_violation on (org_id, code)
      if (error.code === '23505') {
        return NextResponse.json({ error: `Code "${code}" already exists for your org` }, { status: 409 })
      }
      console.error('[leave-types POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId,
      actor_membership_id: ctx.membershipId,
      action: 'created',
      module: 'leave_types',
      entity_id: (data as { id: string }).id,
      summary: `Created leave type ${code} (${body.label})`,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create leave type'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
