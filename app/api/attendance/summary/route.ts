import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActiveEmployee } from '@/lib/employee-context'

const FULL_ACCESS_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

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
    const month = searchParams.get('month') // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
    }

    const isFullAccess = FULL_ACCESS_ROLES.includes(ctx.role)

    const [year, mon] = month.split('-').map(Number)
    const dateFrom = `${month}-01`
    const daysInMonth = new Date(year, mon, 0).getDate()
    const dateTo = `${month}-${String(daysInMonth).padStart(2, '0')}`

    // Working days (Mon–Fri) in the month
    let workingDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, mon - 1, d).getDay()
      if (day !== 0 && day !== 6) workingDays++
    }

    let query = supabaseAdmin
      .from('attendance_daily')
      .select(`
        employee_id, attendance_date, status, total_hours,
        employee:employees!attendance_daily_employee_id_fkey(
          id, first_name, last_name, emp_id,
          department:departments!employees_department_id_fkey(name)
        )
      `)
      .eq('org_id', ctx.orgId)
      .gte('attendance_date', dateFrom)
      .lte('attendance_date', dateTo)

    if (!isFullAccess) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ employees: [], dailyPct: [], workingDays, month })
      query = query.eq('employee_id', me.id)
    }

    const { data: records, error: attErr } = await query
    if (attErr) throw attErr

    type EmployeeAgg = {
      empId: string; name: string; department: string
      present: number; absent: number; wfh: number; late: number; otHours: number
    }
    const empMap = new Map<string, EmployeeAgg>()
    const dailyMap = new Map<string, { present: number; total: number }>()

    for (const r of records ?? []) {
      const emp = r.employee as unknown as { id: string; first_name: string; last_name: string; emp_id?: string; department?: { name: string } | null } | null
      if (!emp) continue

      const empId = emp.emp_id ?? emp.id
      const name = `${emp.first_name} ${emp.last_name}`
      const dept = emp.department?.name ?? '—'
      const isPresent = ['present', 'late', 'work_from_home', 'half_day'].includes(r.status ?? '')

      if (!empMap.has(r.employee_id)) {
        empMap.set(r.employee_id, { empId, name, department: dept, present: 0, absent: 0, wfh: 0, late: 0, otHours: 0 })
      }
      const agg = empMap.get(r.employee_id)!
      if (isPresent) agg.present++
      if (r.status === 'absent') agg.absent++
      if (r.status === 'work_from_home') agg.wfh++
      if (r.status === 'late') agg.late++
      if (r.total_hours && r.total_hours > 9) agg.otHours += r.total_hours - 9

      if (!dailyMap.has(r.attendance_date)) dailyMap.set(r.attendance_date, { present: 0, total: 0 })
      const d = dailyMap.get(r.attendance_date)!
      d.total++
      if (isPresent) d.present++
    }

    const employees = Array.from(empMap.values()).map(agg => ({
      empId: agg.empId,
      name: agg.name,
      department: agg.department,
      workingDays,
      present: agg.present,
      absent: agg.absent,
      lop: agg.absent,
      wfh: agg.wfh,
      late: agg.late,
      otHours: Math.round(agg.otHours * 10) / 10,
      attendancePct: workingDays > 0 ? Math.round((agg.present / workingDays) * 100) : 0,
    }))

    const dailyPct = Array.from({ length: daysInMonth }, (_, i) => {
      const day = new Date(year, mon - 1, i + 1).getDay()
      if (day === 0 || day === 6) return 0
      const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
      const entry = dailyMap.get(dateStr)
      if (!entry || entry.total === 0) return 0
      return Math.round((entry.present / entry.total) * 100)
    })

    return NextResponse.json({ employees, dailyPct, workingDays, month })
  } catch (err: unknown) {
    console.error('[attendance summary GET]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
