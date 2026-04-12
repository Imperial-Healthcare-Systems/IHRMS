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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { role?: string; is_admin?: boolean; status?: string }

    const newRole    = body.role     ?? (body.is_admin === false ? 'employee' : undefined)
    const newIsAdmin = body.is_admin ?? (body.role ? body.role !== 'employee' : undefined)

    if (newRole === undefined && newIsAdmin === undefined && body.status === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Build update payload
    const update: Record<string, unknown> = {}
    if (newRole    !== undefined) update.role     = newRole
    if (newIsAdmin !== undefined) update.is_admin = newIsAdmin
    if (body.status !== undefined) update.status  = body.status

    // Use Supabase REST — fast HTTP, no cold TCP connection.
    // supabaseAdmin bypasses RLS and has schema-cache access.
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(update)
      .eq('id', id)
      .select('id, first_name, last_name, emp_id, employee_code, role, is_admin, status')
      .single()

    if (error) {
      console.error('[admin-users PATCH]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
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
