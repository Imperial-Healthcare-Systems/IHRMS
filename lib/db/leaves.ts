import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getLeaveRequests(filters: {
  employee_id?: string
  status?: string
  leave_type?: string
  year?: number
  manager_id?: string
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('leave_requests')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id, department_id,
        department:departments(name),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name)),
      level1_approver:employees!level1_approver_id(id, first_name, last_name),
      level2_approver:employees!level2_approver_id(id, first_name, last_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.leave_type) query = query.eq('leave_type', filters.leave_type)
  if (filters.year) {
    query = query
      .gte('start_date', `${filters.year}-01-01`)
      .lte('start_date', `${filters.year}-12-31`)
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 20)) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getLeaveRequest(id: string) {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select(`
      *,
      employee:employees(*),
      level1_approver:employees!level1_approver_id(id, first_name, last_name, email),
      level2_approver:employees!level2_approver_id(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createLeaveRequest(payload: {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  is_half_day?: boolean
  half_day_session?: string
}) {
  // Get employee's reporting manager
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('reporting_manager_id, department_id')
    .eq('id', payload.employee_id)
    .single()

  // Check leave balance
  const year = new Date(payload.start_date).getFullYear()
  const { data: balance } = await supabaseAdmin
    .from('leave_balances')
    .select('closing_balance')
    .eq('employee_id', payload.employee_id)
    .eq('leave_type', payload.leave_type)
    .eq('year', year)
    .single()

  if (balance && payload.leave_type !== 'LOP' && (balance.closing_balance ?? 0) < payload.days) {
    throw new Error(`Insufficient leave balance. Available: ${balance.closing_balance}, Requested: ${payload.days}`)
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .insert({
      ...payload,
      status: 'pending',
      level1_approver_id: emp?.reporting_manager_id ?? null,
      level1_status: 'pending',
      is_half_day: payload.is_half_day ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approveLeaveRequest(
  id: string,
  level: 1 | 2,
  approver_id: string,
  action: 'approved' | 'rejected',
  remarks?: string
) {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = {}

  if (level === 1) {
    update.level1_status = action
    update.level1_remarks = remarks
    update.level1_actioned_at = now
    // If approved at L1, check if L2 needed - for now mark as approved
    update.status = action === 'approved' ? 'approved' : 'rejected'
  } else {
    update.level2_status = action
    update.level2_remarks = remarks
    update.level2_actioned_at = now
    update.status = action
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Deduct from leave balance if approved
  if (action === 'approved') {
    const req = await getLeaveRequest(id)
    const year = new Date(req.start_date).getFullYear()
    const { error: deductLeaveBalanceError } = await supabaseAdmin.rpc('deduct_leave_balance', {
      p_employee_id: req.employee_id,
      p_leave_type: req.leave_type,
      p_year: year,
      p_days: req.days,
    })

    if (deductLeaveBalanceError) {
      console.error('Failed to deduct leave balance', deductLeaveBalanceError)
    }
  }

  return data
}

export async function getLeaveBalances(employee_id: string, year?: number) {
  const currentYear = year ?? new Date().getFullYear()
  const { data, error } = await supabaseAdmin
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employee_id)
    .eq('year', currentYear)
  if (error) throw error
  return data ?? []
}

export async function getLeaveBalanceSummary(employee_id: string) {
  const year = new Date().getFullYear()
  const { data, error } = await supabaseAdmin
    .from('leave_balances')
    .select('leave_type, opening_balance, accrued, availed, carry_forward, closing_balance')
    .eq('employee_id', employee_id)
    .eq('year', year)
  if (error) throw error
  return data ?? []
}

export async function getPendingLeaveApprovals(manager_id: string) {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id,
        department:departments(name))
    `)
    .eq('level1_approver_id', manager_id)
    .eq('level1_status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTeamLeaveCalendar(manager_id: string, year: number, month: number) {
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const dateToDate = new Date(year, month, 0)
  const dateTo = dateToDate.toISOString().split('T')[0]

  // Get all team members
  const { data: team } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name')
    .eq('reporting_manager_id', manager_id)
    .eq('status', 'active')

  if (!team?.length) return []

  const teamIds = team.map((e) => e.id)
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select('employee_id, leave_type, start_date, end_date, days, status')
    .in('employee_id', teamIds)
    .eq('status', 'approved')
    .gte('start_date', dateFrom)
    .lte('end_date', dateTo)

  if (error) throw error
  return data ?? []
}
