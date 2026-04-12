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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')
    const leave_type  = searchParams.get('leave_type')
    const year        = searchParams.get('year')
    const manager_id  = searchParams.get('manager_id')
    const limit       = parseInt(searchParams.get('limit') ?? '50')

    const userRole = (session.user as any)?.role
    const userId   = (session.user as any)?.id

    const { searchParams: sp2 } = new URL(req.url)
    const date_from = sp2.get('date_from')
    const date_to   = sp2.get('date_to')

    const FULL_ACCESS_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr', 'operations_head', 'manager']

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(
          id, first_name, last_name, emp_id, department_id,
          department:departments!employees_department_id_fkey(name)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (employee_id) query = query.eq('employee_id', employee_id)
    else if (!FULL_ACCESS_ROLES.includes(userRole)) {
      query = query.eq('employee_id', userId)
    }
    if (status)     query = query.eq('status', status)
    if (leave_type) query = query.eq('leave_type', leave_type)
    if (year)       query = query.gte('from_date', `${year}-01-01`).lte('from_date', `${year}-12-31`)
    if (date_from)  query = query.gte('from_date', date_from)
    if (date_to)    query = query.lte('from_date', date_to)
    if (manager_id) query = query.eq('approved_by', manager_id)

    const { data, error, count } = await query
    if (error) { console.error('[leaves GET]', error); throw error }
    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    console.error('[leaves GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { leave_type, start_date, end_date, from_date, to_date, days, reason, employee_id } = body

    const effectiveFrom = from_date ?? start_date
    const effectiveTo   = to_date   ?? end_date

    if (!leave_type || !effectiveFrom || !effectiveTo || !reason) {
      return NextResponse.json({ error: 'leave_type, from_date, to_date, reason are required' }, { status: 400 })
    }

    // Map UI short codes → DB enum values
    const LEAVE_TYPE_MAP: Record<string, string> = {
      CL: 'casual', SL: 'sick', EL: 'earned', LOP: 'unpaid',
      ML: 'maternity', PL: 'paternity', CompOff: 'compensatory',
      Bereavement: 'bereavement', WFH: 'work_from_home',
      casual: 'casual', sick: 'sick', earned: 'earned', unpaid: 'unpaid',
      maternity: 'maternity', paternity: 'paternity',
      compensatory: 'compensatory', bereavement: 'bereavement',
    }
    const dbLeaveType = LEAVE_TYPE_MAP[leave_type] ?? leave_type.toLowerCase()

    const targetEmployee = employee_id ?? (session.user as any)?.id

    // Overlap check — reject if an active leave already covers any part of the requested range
    const { data: overlapping } = await supabaseAdmin
      .from('leave_requests')
      .select('id, from_date, to_date, status')
      .eq('employee_id', targetEmployee)
      .in('status', ['pending', 'approved'])
      .lte('from_date', effectiveTo)
      .gte('to_date', effectiveFrom)
      .limit(1)

    if (overlapping && overlapping.length > 0) {
      const existing = overlapping[0] as Record<string, unknown>
      return NextResponse.json(
        { error: `You already have a ${existing.status} leave request overlapping this date range (${existing.from_date} – ${existing.to_date}).` },
        { status: 409 }
      )
    }

    // Calculate total_days if not provided
    const msPerDay  = 86400000
    const totalDays = days ?? Math.round((new Date(effectiveTo).getTime() - new Date(effectiveFrom).getTime()) / msPerDay) + 1

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        employee_id: targetEmployee,
        leave_type:  dbLeaveType,
        from_date:   effectiveFrom,
        to_date:     effectiveTo,
        total_days:  totalDays,
        reason,
        status:      'pending',
      })
      .select()
      .single()

    if (error) { console.error('[leaves POST]', error); throw error }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[leaves POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
