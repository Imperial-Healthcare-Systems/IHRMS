import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentYear = now.getFullYear()

    const [
      employees,
      todayAttendance,
      pendingLeaves,
      latestPayroll,
      openPositions,
      pendingExpenses,
      pendingRegularizations,
      warningsThisYear,
    ] = await Promise.all([
      supabaseAdmin
        .from('employees')
        .select('id, status, date_of_joining')
        .eq('org_id', ctx.orgId)
        .neq('status', 'terminated'),

      supabaseAdmin
        .from('attendance_daily')
        .select('id, status')
        .eq('org_id', ctx.orgId)
        .eq('attendance_date', today),

      supabaseAdmin
        .from('leave_requests')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('status', 'pending'),

      supabaseAdmin
        .from('payroll_runs')
        .select('status, month, year, total_net')
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit(1),

      supabaseAdmin
        .from('job_requisitions')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('status', 'open'),

      supabaseAdmin
        .from('expense_claims')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('status', 'submitted'),

      supabaseAdmin
        .from('attendance_regularizations')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('status', 'pending'),

      supabaseAdmin
        .from('warning_letters')
        .select('id')
        .eq('org_id', ctx.orgId)
        .gte('issued_date', `${currentYear}-01-01`)
        .neq('status', 'draft'),
    ])

    // ── Headcount breakdown ──
    const allEmployees = employees.data ?? []
    const totalHeadcount = allEmployees.length
    const activeCount = allEmployees.filter((e) => e.status === 'active').length
    const probationCount = allEmployees.filter((e) => e.status === 'probation').length
    const onNoticeCount = allEmployees.filter((e) => e.status === 'notice_period').length
    const onLeaveCount = allEmployees.filter((e) => e.status === 'on_leave').length

    const newJoinersThisMonth = allEmployees.filter(
      (e) => e.date_of_joining && e.date_of_joining >= thisMonthStart
    ).length

    // ── Today's attendance ──
    const attendanceRecords = todayAttendance.data ?? []
    const presentCount = attendanceRecords.filter(
      (a) => ['present', 'work_from_home', 'on_duty', 'half_day', 'late', 'comp_off'].includes(a.status)
    ).length
    const wfhCount = attendanceRecords.filter((a) => a.status === 'work_from_home').length
    const onLeaveToday = attendanceRecords.filter((a) => a.status === 'on_leave').length
    const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length
    const attendanceRate =
      totalHeadcount > 0 ? Math.round((presentCount / totalHeadcount) * 100) : 0

    // ── Payroll ──
    const payrollRun = (latestPayroll.data ?? [])[0] ?? null
    let periodLabel = null
    if (payrollRun) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      periodLabel = `${monthNames[(payrollRun.month ?? 1) - 1]} ${payrollRun.year}`
    }

    return NextResponse.json({
      headcount: {
        total: totalHeadcount,
        active: activeCount,
        probation: probationCount,
        on_notice: onNoticeCount,
        on_leave: onLeaveCount,
        new_joiners_this_month: newJoinersThisMonth,
      },
      today: {
        date: today,
        present: presentCount,
        absent: absentCount,
        on_leave: onLeaveToday,
        wfh: wfhCount,
        attendance_rate: attendanceRate,
      },
      pending: {
        leaves: (pendingLeaves.data ?? []).length,
        expenses: (pendingExpenses.data ?? []).length,
        regularizations: (pendingRegularizations.data ?? []).length,
      },
      payroll: {
        current_period: periodLabel,
        status: payrollRun?.status ?? null,
        total_net: payrollRun?.total_net ?? null,
      },
      recruitment: {
        open_positions: (openPositions.data ?? []).length,
      },
      compliance: {
        warnings_this_year: (warningsThisYear.data ?? []).length,
      },
      generated_at: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
