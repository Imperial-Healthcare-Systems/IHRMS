import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
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

const EXIT_SELECT = `
  *,
  employee:employees!employee_id(
    id, first_name, last_name, emp_id, work_email,
    date_of_joining,
    department:departments!employees_department_id_fkey(id, name),
    designation:designations(id, title)
  )
`

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('exit_processes')
      .select(EXIT_SELECT)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Exit process not found' }, { status: 404 })
      console.error('[exit GET id]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { all_clearance_done, fnf_approved, employee_id_to_terminate } = body as {
      all_clearance_done?: boolean
      fnf_approved?: boolean
      employee_id_to_terminate?: string
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (fnf_approved) {
      updates.status = 'completed'
    } else if (all_clearance_done) {
      updates.status = 'cleared'
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('exit_processes')
      .update(updates)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select(EXIT_SELECT)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Exit process not found' }, { status: 404 })
      console.error('[exit PATCH]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    if (fnf_approved && employee_id_to_terminate) {
      const { error: empErr } = await supabaseAdmin
        .from('employees')
        .update({ status: 'terminated', updated_at: new Date().toISOString() })
        .eq('id', employee_id_to_terminate)
        .eq('org_id', ctx.orgId)
      if (empErr) console.error('[exit PATCH] employee termination update:', empErr.message)
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[exit PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
