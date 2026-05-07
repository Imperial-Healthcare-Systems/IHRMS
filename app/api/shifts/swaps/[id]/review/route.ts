import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_OR_MANAGER_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'manager', 'operations_head']

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
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx
    if (!HR_OR_MANAGER_ROLES.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { status, reviewer_note } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      status,
      reviewed_by: ctx.identityId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (reviewer_note !== undefined) updates.reviewer_note = reviewer_note

    const { data, error } = await supabaseAdmin
      .from('shift_swaps')
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
