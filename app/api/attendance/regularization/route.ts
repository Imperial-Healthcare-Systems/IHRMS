import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const userRole = (session.user as any)?.role
    const userId = (session.user as any)?.id

    let query = supabaseAdmin
      .from('attendance_regularizations')
      .select(`
        *,
        employee:employees(id, first_name, last_name, emp_id,
          department:departments(name),
          reporting_manager:employees!manager_id(id, first_name, last_name))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (status) query = query.eq('status', status)
    if (!['hr_admin', 'super_admin', 'operations_head'].includes(userRole) && !employee_id) {
      query = query.eq('employee_id', userId)
    }

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { date, reason, requested_punch_in, requested_punch_out, employee_id } = body
    if (!date || !reason) return NextResponse.json({ error: 'date and reason are required' }, { status: 400 })

    const targetEmployee = employee_id ?? (session.user as any)?.id

    const { data, error } = await supabaseAdmin
      .from('attendance_regularizations')
      .insert({
        employee_id: targetEmployee, date, reason, status: 'pending',
        requested_punch_in, requested_punch_out,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, status, rejection_reason } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })

    const approverId = (session.user as any)?.id
    const { data, error } = await supabaseAdmin
      .from('attendance_regularizations')
      .update({
        status, approved_by: approverId,
        approved_at: new Date().toISOString(),
        rejection_reason: rejection_reason ?? null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // If approved, update the actual attendance log
    if (status === 'approved') {
      const reg = data
      if (reg.requested_punch_in || reg.requested_punch_out) {
        const updatePayload: Record<string, unknown> = { regularized: true }
        if (reg.requested_punch_in) updatePayload.punch_in = reg.requested_punch_in
        if (reg.requested_punch_out) updatePayload.punch_out = reg.requested_punch_out
        await supabaseAdmin
          .from('attendance_logs')
          .update(updatePayload)
          .eq('employee_id', reg.employee_id)
          .eq('date', reg.date)
      }
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
