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
    const leave_type = searchParams.get('leave_type')
    const year = searchParams.get('year')
    const manager_id = searchParams.get('manager_id') // for pending approvals
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const userRole = (session.user as any)?.role
    const userId = (session.user as any)?.id

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees(id, first_name, last_name, emp_id,
          department:departments(name)),
        level1_approver:employees!level1_approver_id(id, first_name, last_name),
        level2_approver:employees!level2_approver_id(id, first_name, last_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (employee_id) query = query.eq('employee_id', employee_id)
    else if (!['hr_admin', 'super_admin', 'operations_head', 'manager'].includes(userRole)) {
      query = query.eq('employee_id', userId)
    }
    if (status) query = query.eq('status', status)
    if (leave_type) query = query.eq('leave_type', leave_type)
    if (year) {
      query = query.gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
    }
    if (manager_id) {
      query = query.eq('level1_approver_id', manager_id).eq('level1_status', 'pending')
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
    const { leave_type, start_date, end_date, days, reason, is_half_day, half_day_session, employee_id } = body

    if (!leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json({ error: 'leave_type, start_date, end_date, reason are required' }, { status: 400 })
    }

    const targetEmployee = employee_id ?? (session.user as any)?.id

    // Get employee info for approver
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('reporting_manager_id, status')
      .eq('id', targetEmployee)
      .single()

    if (emp?.status === 'terminated') {
      return NextResponse.json({ error: 'Cannot apply leave for terminated employee' }, { status: 400 })
    }

    // Check leave balance (except LOP)
    if (leave_type !== 'LOP') {
      const year = new Date(start_date).getFullYear()
      const { data: balance } = await supabaseAdmin
        .from('leave_balances')
        .select('closing_balance')
        .eq('employee_id', targetEmployee)
        .eq('leave_type', leave_type)
        .eq('year', year)
        .single()

      if (balance && (balance.closing_balance ?? 0) < days) {
        return NextResponse.json({
          error: `Insufficient ${leave_type} balance. Available: ${balance.closing_balance}, Requested: ${days}`
        }, { status: 400 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        employee_id: targetEmployee, leave_type, start_date, end_date,
        days: days ?? 1, reason, is_half_day: is_half_day ?? false,
        half_day_session, status: 'pending',
        level1_approver_id: emp?.reporting_manager_id ?? null,
        level1_status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
