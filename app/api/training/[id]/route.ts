import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { data, error } = await supabaseAdmin
      .from('training_courses')
      .select(`
        id, title, description, trainer, start_date, end_date, status, org_id, created_at,
        enrollments:training_enrollments(id, employee_id, status, completed_at,
          employee:employees!employee_id(id, first_name, last_name, emp_id))
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { title, description, trainer, start_date, end_date, status } = body

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (trainer !== undefined) updates.trainer = trainer
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
    if (status !== undefined) updates.status = status

    const { data, error } = await supabaseAdmin
      .from('training_courses')
      .update(updates)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (error) throw error

    logAudit({ org_id: ctx.orgId, actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId, action: 'updated', module: 'training', entity_id: id, summary: 'Training course updated' })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
