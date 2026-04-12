import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

const ADMIN_ROLES = ['super_admin', 'hr_admin', 'manager', 'operations_head', 'payroll_admin', 'finance_admin']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, emp_id, employee_code, work_email, role, is_admin, status, updated_at, departments!employees_department_id_fkey(name)')
      .in('role', ADMIN_ROLES)
      .order('first_name')

    if (error) {
      console.error('[admin-users GET]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { action?: string; q?: string; employee_id?: string; role?: string }

    // ── Search ──────────────────────────────────────────────────────────────
    if (body.action === 'search') {
      const raw = (body.q ?? '').trim()
      if (raw.length < 2) return NextResponse.json({ data: [] })
      // PostgREST .or() uses * as wildcard for ilike (not %)
      const q = `*${raw}*`

      // Use Supabase REST — fast HTTP, no cold TCP connection overhead.
      // Avoid: joining departments (PGRST201 risk), selecting non-existent columns.
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, emp_id, employee_code, work_email, role, is_admin')
        .eq('status', 'active')
        .or(`first_name.ilike.${q},last_name.ilike.${q}`)
        .limit(10)

      if (error) {
        console.error('[admin-users search]', error)
        return NextResponse.json({ error: error.message, data: [] }, { status: 500 })
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

    // ── Add / promote to admin ───────────────────────────────────────────────
    if (!body.employee_id || !body.role) {
      return NextResponse.json({ error: 'employee_id and role are required' }, { status: 400 })
    }

    // Use Supabase REST — fast HTTP, no cold TCP connection.
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({ role: body.role, is_admin: true })
      .eq('id', body.employee_id)
      .select('id, first_name, last_name, emp_id, employee_code, role, is_admin, status, work_email')
      .single()

    if (error) {
      console.error('[admin-users POST add]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: error.code === 'PGRST116' ? 404 : 500 })
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
