import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendLeaveSubmittedEmail } from '@/lib/mailer'
import { getActiveEmployee } from '@/lib/employee-context'

const FULL_ACCESS_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'operations_head']
const MANAGER_ROLES     = ['manager']

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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')
    const leave_type  = searchParams.get('leave_type')
    const year        = searchParams.get('year')
    const manager_id  = searchParams.get('manager_id')
    const limit       = parseInt(searchParams.get('limit') ?? '50')
    const date_from   = searchParams.get('date_from')
    const date_to     = searchParams.get('date_to')

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(
          id, first_name, last_name, emp_id, department_id,
          department:departments!employees_department_id_fkey(name)
        )
      `, { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (FULL_ACCESS_ROLES.includes(ctx.role)) {
      if (employee_id) query = query.eq('employee_id', employee_id)
    } else if (MANAGER_ROLES.includes(ctx.role)) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ data: [], count: 0 })
      const { data: team } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('reporting_manager_id', me.id)
        .eq('status', 'active')
      const teamIds = (team ?? []).map((e: any) => e.id as string)
      if (teamIds.length === 0) return NextResponse.json({ data: [], count: 0 })
      query = query.in('employee_id', teamIds)
      if (employee_id && teamIds.includes(employee_id)) query = query.eq('employee_id', employee_id)
    } else {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ data: [], count: 0 })
      query = query.eq('employee_id', me.id)
    }

    if (status)     query = query.eq('status', status)
    if (leave_type) query = query.eq('leave_type', leave_type)
    if (year)       query = query.gte('from_date', `${year}-01-01`).lte('from_date', `${year}-12-31`)
    if (date_from)  query = query.gte('from_date', date_from)
    if (date_to)    query = query.lte('from_date', date_to)
    if (manager_id) query = query.eq('approved_by', manager_id)

    const { data, error: dbErr, count } = await query
    if (dbErr) { console.error('[leaves GET]', dbErr); throw dbErr }
    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    console.error('[leaves GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { leave_type, start_date, end_date, from_date, to_date, days, reason, employee_id } = body

    const effectiveFrom = from_date ?? start_date
    const effectiveTo   = to_date   ?? end_date

    if (!leave_type || !effectiveFrom || !effectiveTo || !reason) {
      return NextResponse.json({ error: 'leave_type, from_date, to_date, reason are required' }, { status: 400 })
    }

    const LEAVE_TYPE_MAP: Record<string, string> = {
      CL: 'casual', SL: 'sick', EL: 'earned', LOP: 'unpaid',
      ML: 'maternity', PL: 'paternity', CompOff: 'compensatory',
      Bereavement: 'bereavement', WFH: 'work_from_home',
      casual: 'casual', sick: 'sick', earned: 'earned', unpaid: 'unpaid',
      maternity: 'maternity', paternity: 'paternity',
      compensatory: 'compensatory', bereavement: 'bereavement',
    }
    const dbLeaveType = LEAVE_TYPE_MAP[leave_type] ?? leave_type.toLowerCase()

    const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
    const targetEmployee = employee_id ?? me?.id ?? null
    if (!targetEmployee) {
      return NextResponse.json({ error: 'You do not have an employee profile in this organisation.' }, { status: 404 })
    }

    // Cross-tenant guard: if a different employee_id was provided, verify it's in this org
    if (employee_id && employee_id !== me?.id) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id', employee_id)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    // Overlap check — scoped to this employee
    const { data: overlapping } = await supabaseAdmin
      .from('leave_requests')
      .select('id, from_date, to_date, status')
      .eq('org_id', ctx.orgId)
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

    const msPerDay  = 86400000
    const totalDays = days ?? Math.round((new Date(effectiveTo).getTime() - new Date(effectiveFrom).getTime()) / msPerDay) + 1

    const { data, error: dbErr } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        org_id:      ctx.orgId,
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

    if (dbErr) { console.error('[leaves POST]', dbErr); throw dbErr }

    // Email HR — fetch HR list within THIS org only
    ;(async () => {
      try {
        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('first_name, last_name, emp_id')
          .eq('id', targetEmployee)
          .eq('org_id', ctx.orgId)
          .single()
        const { data: hrs } = await supabaseAdmin
          .from('employees')
          .select('work_email, first_name')
          .eq('org_id', ctx.orgId)
          .in('role', ['hr_admin', 'hr', 'admin'])
          .eq('status', 'active')
          .limit(5)
        if (emp && hrs && hrs.length > 0) {
          const empName = `${emp.first_name} ${emp.last_name}`
          await Promise.all((hrs as any[]).map(hr =>
            hr.work_email ? sendLeaveSubmittedEmail({
              to: hr.work_email,
              hrName: hr.first_name ?? 'HR',
              empName,
              empId: emp.emp_id ?? '',
              leaveType: dbLeaveType,
              fromDate: effectiveFrom,
              toDate: effectiveTo,
              totalDays,
              reason,
              orgId: ctx.orgId,
            }) : Promise.resolve()
          ))
        }
      } catch (e) { console.warn('[leaves POST] email notify non-fatal:', e) }
    })()

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[leaves POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
