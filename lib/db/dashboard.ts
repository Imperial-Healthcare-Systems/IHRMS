import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getHRDashboardStats() {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Run all queries in parallel
  const [
    employeesResult,
    attendanceResult,
    leaveResult,
    payrollResult,
    openPositionsResult,
    regularizationResult,
    expenseResult,
    probationResult,
  ] = await Promise.all([
    supabaseAdmin.from('employees').select('status, hire_date').neq('status', 'terminated'),
    supabaseAdmin.from('attendance_logs').select('status, is_wfh').eq('date', today),
    supabaseAdmin.from('leave_requests').select('status').eq('status', 'pending'),
    supabaseAdmin.from('payroll_runs').select('status, period_label').order('created_at', { ascending: false }).limit(1),
    supabaseAdmin.from('job_requisitions').select('id').eq('status', 'open'),
    supabaseAdmin.from('attendance_regularizations').select('id').eq('status', 'pending'),
    supabaseAdmin.from('expense_claims').select('id').eq('status', 'pending'),
    supabaseAdmin.from('probation_reviews').select('id').eq('outcome', 'pending').lt('due_date', today),
  ])

  const employees = employeesResult.data ?? []
  const attendance = attendanceResult.data ?? []

  return {
    total_employees: employees.filter(e => e.status !== 'terminated').length,
    active_employees: employees.filter(e => e.status === 'active').length,
    on_probation: employees.filter(e => e.status === 'probation').length,
    on_notice: employees.filter(e => e.status === 'notice_period').length,
    new_joiners_this_month: employees.filter(e => e.hire_date >= thisMonthStart).length,
    present_today: attendance.filter(a => ['present', 'late'].includes(a.status)).length,
    absent_today: attendance.filter(a => a.status === 'absent').length,
    on_leave_today: attendance.filter(a => a.status === 'on_leave').length,
    wfh_today: attendance.filter(a => a.is_wfh).length,
    pending_leaves: leaveResult.data?.length ?? 0,
    current_payroll_status: payrollResult.data?.[0]?.status ?? 'not_started',
    current_payroll_period: payrollResult.data?.[0]?.period_label ?? '',
    open_positions: openPositionsResult.data?.length ?? 0,
    pending_regularizations: regularizationResult.data?.length ?? 0,
    pending_expenses: expenseResult.data?.length ?? 0,
    probation_overdue: probationResult.data?.length ?? 0,
    compliance_alerts: 0, // calculated separately
  }
}

export async function getManagerDashboardStats(manager_id: string) {
  const today = new Date().toISOString().split('T')[0]

  const [teamResult, attendanceResult, leaveResult, regularizationResult] = await Promise.all([
    supabaseAdmin.from('employees').select('id').eq('reporting_manager_id', manager_id).eq('status', 'active'),
    supabaseAdmin.from('attendance_logs').select('employee_id, status, is_wfh').eq('date', today),
    supabaseAdmin.from('leave_requests').select('id').eq('level1_approver_id', manager_id).eq('level1_status', 'pending'),
    supabaseAdmin.from('attendance_regularizations').select('id').eq('status', 'pending'),
  ])

  const teamIds = new Set((teamResult.data ?? []).map(e => e.id))
  const todayLogs = (attendanceResult.data ?? []).filter(a => teamIds.has(a.employee_id))

  return {
    team_size: teamIds.size,
    present_today: todayLogs.filter(a => ['present', 'late'].includes(a.status)).length,
    on_leave_today: todayLogs.filter(a => a.status === 'on_leave').length,
    wfh_today: todayLogs.filter(a => a.is_wfh).length,
    pending_leave_approvals: leaveResult.data?.length ?? 0,
    pending_regularizations: regularizationResult.data?.length ?? 0,
  }
}
