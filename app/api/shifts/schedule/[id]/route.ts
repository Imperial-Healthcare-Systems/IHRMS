import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { shift_id, effective_from, effective_to } = body

    // Cross-tenant guard for shift_id
    if (shift_id) {
      const { data: shift } = await supabaseAdmin
        .from('shifts').select('id')
        .eq('id', shift_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!shift) return NextResponse.json({ error: 'Shift not found in your organisation' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (shift_id !== undefined) updates.shift_id = shift_id
    if (effective_from !== undefined) updates.effective_from = effective_from
    if (effective_to !== undefined) updates.effective_to = effective_to

    const { data, error } = await supabaseAdmin
      .from('shift_schedules')
      .update(updates)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { error } = await supabaseAdmin
      .from('shift_schedules')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.orgId)
    if (error) throw error
    return NextResponse.json({ message: 'Schedule entry deleted' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
