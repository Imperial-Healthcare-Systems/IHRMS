import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sql from '@/lib/pg'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { role?: string; is_admin?: boolean; status?: string }

    // When deactivating (is_admin=false with no explicit role), reset role to 'employee'
    const newRole    = body.role     ?? (body.is_admin === false ? 'employee' : undefined)
    const newIsAdmin = body.is_admin ?? (body.role ? body.role !== 'employee' : undefined)

    if (newRole === undefined && newIsAdmin === undefined && body.status === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Use direct SQL to bypass PostgREST schema cache for role/is_admin
    try {
      let rows
      if (newRole !== undefined && newIsAdmin !== undefined && body.status !== undefined) {
        rows = await sql`
          UPDATE employees SET role=${newRole}, is_admin=${newIsAdmin}, status=${body.status}
          WHERE id=${id}::uuid
          RETURNING id, first_name, last_name, COALESCE(emp_id,employee_code,'') AS emp_id, role, is_admin, status
        `
      } else if (newRole !== undefined && newIsAdmin !== undefined) {
        rows = await sql`
          UPDATE employees SET role=${newRole}, is_admin=${newIsAdmin}
          WHERE id=${id}::uuid
          RETURNING id, first_name, last_name, COALESCE(emp_id,employee_code,'') AS emp_id, role, is_admin, status
        `
      } else if (newRole !== undefined) {
        rows = await sql`
          UPDATE employees SET role=${newRole}, is_admin=${newRole !== 'employee'}
          WHERE id=${id}::uuid
          RETURNING id, first_name, last_name, COALESCE(emp_id,employee_code,'') AS emp_id, role, is_admin, status
        `
      } else if (newIsAdmin !== undefined) {
        rows = await sql`
          UPDATE employees SET is_admin=${newIsAdmin}
          WHERE id=${id}::uuid
          RETURNING id, first_name, last_name, COALESCE(emp_id,employee_code,'') AS emp_id, role, is_admin, status
        `
      } else {
        rows = await sql`
          UPDATE employees SET status=${body.status!}
          WHERE id=${id}::uuid
          RETURNING id, first_name, last_name, COALESCE(emp_id,employee_code,'') AS emp_id, role, is_admin, status
        `
      }

      if (!rows.length) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      return NextResponse.json({ data: rows[0] })
    } catch (sqlErr) {
      console.error('[admin-users PATCH] SQL error:', sqlErr)
      return NextResponse.json({ error: errMsg(sqlErr) }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
