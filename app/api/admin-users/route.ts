import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import sql from '@/lib/pg'

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

    // Use direct SQL — bypasses PostgREST schema cache for role/is_admin columns
    const rows = await sql`
      SELECT
        e.id,
        COALESCE(e.emp_id, e.employee_code, '') AS emp_id,
        e.first_name,
        e.last_name,
        COALESCE(e.work_email, e.email, '') AS email,
        COALESCE(e.role, 'employee') AS role,
        COALESCE(e.is_admin, false) AS is_admin,
        COALESCE(e.status, 'active') AS status,
        COALESCE(d.name, '—') AS department,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.is_admin = true
         OR e.role = ANY(${ADMIN_ROLES}::text[])
      ORDER BY e.first_name, e.last_name
    `

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('[admin-users GET]', err)
    // Fallback to Supabase if direct SQL fails
    try {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, emp_id, employee_code, role, is_admin, status, work_email, updated_at')
        .order('first_name')
      return NextResponse.json({ data: (data ?? []).map((e: Record<string, unknown>) => ({
        id: e.id, emp_id: e.emp_id ?? e.employee_code ?? '', first_name: e.first_name,
        last_name: e.last_name, email: e.work_email ?? '', role: (e.role as string) ?? 'employee',
        is_admin: Boolean(e.is_admin), status: (e.status as string) ?? 'active', department: '—', updated_at: e.updated_at,
      })) })
    } catch {
      return NextResponse.json({ data: [] })
    }
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
      const q = `%${raw}%`

      // Use Supabase REST (HTTP — no cold TCP connection overhead)
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, emp_id, employee_code, work_email, email, role, is_admin, department_id, departments!employees_department_id_fkey(name)')
        .eq('status', 'active')
        .or(`first_name.ilike.${q},last_name.ilike.${q},emp_id.ilike.${q},employee_code.ilike.${q}`)
        .limit(10)

      if (error) { console.error('[admin-users search]', error); return NextResponse.json({ data: [] }) }

      type EmpRow = Record<string, unknown>
      const mapped = (data ?? []).map((e: EmpRow) => {
        const dept = e.departments as Record<string, unknown> | null
        return {
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          emp_id: e.emp_id ?? e.employee_code ?? '',
          email: e.work_email ?? e.email ?? '',
          role: e.role ?? 'employee',
          is_admin: Boolean(e.is_admin),
          department: dept?.name ?? '—',
        }
      })
      return NextResponse.json({ data: mapped })
    }

    // ── Add / promote to admin ───────────────────────────────────────────────
    if (!body.employee_id || !body.role) {
      return NextResponse.json({ error: 'employee_id and role are required' }, { status: 400 })
    }

    // Direct SQL to bypass PostgREST schema cache on role/is_admin
    try {
      const rows = await sql`
        UPDATE employees
        SET role = ${body.role}, is_admin = true
        WHERE id = ${body.employee_id}::uuid
        RETURNING
          id,
          first_name,
          last_name,
          COALESCE(emp_id, employee_code, '') AS emp_id,
          role,
          is_admin,
          status,
          COALESCE(work_email, email, '') AS email
      `
      if (!rows.length) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      return NextResponse.json({ data: rows[0] }, { status: 201 })
    } catch (sqlErr) {
      console.error('[admin-users POST add] SQL error:', sqlErr)
      return NextResponse.json({ error: errMsg(sqlErr) }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
