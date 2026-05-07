import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']
const ELEVATED_ROLES = ['super_admin', 'hr_admin', 'manager', 'operations_head', 'payroll_admin', 'finance_admin', 'owner', 'admin', 'crm_admin']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET() {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, emp_id, employee_code, work_email, role, is_admin, status, updated_at, departments!employees_department_id_fkey(name)')
      .eq('org_id', ctx.orgId)
      .in('role', ELEVATED_ROLES)
      .order('first_name')

    if (dbErr) {
      console.error('[admin-users GET]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    type EmpRow = Record<string, unknown>
    const mapped = (data ?? []).map((e: EmpRow) => {
      const dept = e.departments as Record<string, unknown> | null
      return {
        id: e.id,
        emp_id: e.emp_id ?? e.employee_code ?? '',
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.work_email ?? '',
        role: e.role ?? 'employee',
        is_admin: Boolean(e.is_admin),
        status: e.status ?? 'active',
        department: dept?.name ?? '—',
        updated_at: e.updated_at,
      }
    })
    return NextResponse.json({ data: mapped })
  } catch (err) {
    console.error('[admin-users GET catch]', err)
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json() as { action?: string; q?: string; employee_id?: string; role?: string }

    // ── Search ──────────────────────────────────────────────────────────────
    if (body.action === 'search') {
      const raw = (body.q ?? '').trim()
      if (raw.length < 2) return NextResponse.json({ data: [] })
      const q = `*${raw}*`

      const { data, error: dbErr } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, emp_id, employee_code, work_email, role, is_admin')
        .eq('org_id', ctx.orgId)
        .eq('status', 'active')
        .or(`first_name.ilike.${q},last_name.ilike.${q}`)
        .limit(10)

      if (dbErr) {
        console.error('[admin-users search]', dbErr)
        return NextResponse.json({ error: dbErr.message, data: [] }, { status: 500 })
      }

      type EmpRow = Record<string, unknown>
      const mapped = (data ?? []).map((e: EmpRow) => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        emp_id: e.emp_id ?? e.employee_code ?? '',
        email: e.work_email ?? '',
        role: e.role ?? 'employee',
        is_admin: Boolean(e.is_admin),
        department: '—',
      }))
      return NextResponse.json({ data: mapped })
    }

    // ── Add / promote to admin (HR only) ─────────────────────────────────────
    if (!HR_ROLES.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })
    }
    if (!body.employee_id || !body.role) {
      return NextResponse.json({ error: 'employee_id and role are required' }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('employees')
      .update({ role: body.role, is_admin: true })
      .eq('id', body.employee_id)
      .eq('org_id', ctx.orgId)
      .select('id, first_name, last_name, emp_id, employee_code, role, is_admin, status, work_email')
      .single()

    if (dbErr) {
      console.error('[admin-users POST add]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: dbErr.code === 'PGRST116' ? 404 : 500 })
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
        email: e.work_email ?? '',
      }
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
