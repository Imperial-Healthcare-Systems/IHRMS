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
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json() as { role?: string; is_admin?: boolean; status?: string }
    delete (body as Record<string, unknown>).org_id

    const newRole    = body.role     ?? (body.is_admin === false ? 'employee' : undefined)
    const newIsAdmin = body.is_admin ?? (body.role ? body.role !== 'employee' : undefined)

    if (newRole === undefined && newIsAdmin === undefined && body.status === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (newRole    !== undefined) update.role     = newRole
    if (newIsAdmin !== undefined) update.is_admin = newIsAdmin
    if (body.status !== undefined) update.status  = body.status

    const { data, error: dbErr } = await supabaseAdmin
      .from('employees')
      .update(update)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('id, first_name, last_name, emp_id, employee_code, role, is_admin, status')
      .single()

    if (dbErr) {
      console.error('[admin-users PATCH]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    const e = data as Record<string, unknown>
    return NextResponse.json({
      data: {
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        emp_id: e.emp_id ?? e.employee_code ?? '',
        role: e.role,
        is_admin: e.is_admin,
        status: e.status,
      }
    })
  } catch (err) {
    console.error('[admin-users PATCH catch]', err)
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
