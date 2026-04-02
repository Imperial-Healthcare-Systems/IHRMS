import { supabaseAdmin } from '@/lib/supabase'

export async function getExitProcesses(filters: {
  status?: string
  exit_type?: string
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('exit_processes')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, emp_id, work_location,
        department:departments(id, name),
        designation:designations(id, title),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name)
      ),
      initiated_by_employee:employees!initiated_by(id, first_name, last_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.exit_type) query = query.eq('exit_type', filters.exit_type)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset && filters.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getExitProcess(id: string) {
  const { data, error } = await supabaseAdmin
    .from('exit_processes')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, emp_id, email, phone, hire_date,
        department:departments(id, name),
        designation:designations(id, title),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name, email)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function initiateExit(payload: {
  employee_id: string
  exit_type: string
  reason: string
  last_working_day: string
  resignation_date?: string
  notice_period_days?: number
  initiated_by?: string
}) {
  const clearance_checklist = {
    hr: false, it: false, finance: false, manager: false, admin: false,
  }

  const { data, error } = await supabaseAdmin
    .from('exit_processes')
    .insert({
      ...payload,
      status: 'initiated',
      clearance_checklist,
      noc_issued: false,
      experience_letter: false,
      relieving_letter: false,
    })
    .select()
    .single()
  if (error) throw error

  // Update employee status to notice_period
  await supabaseAdmin
    .from('employees')
    .update({ status: 'notice_period', updated_at: new Date().toISOString() })
    .eq('id', payload.employee_id)

  return data
}

export async function updateExitProcess(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('exit_processes')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClearanceChecklist(id: string, department: string, cleared: boolean) {
  // Fetch current checklist first
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('exit_processes')
    .select('clearance_checklist')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const checklist = { ...(existing?.clearance_checklist ?? {}), [department]: cleared }
  const allCleared = Object.values(checklist).every(Boolean)

  const { data, error } = await supabaseAdmin
    .from('exit_processes')
    .update({
      clearance_checklist: checklist,
      status: allCleared ? 'cleared' : 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getExitStats() {
  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabaseAdmin
    .from('exit_processes')
    .select('status, exit_type, created_at, last_working_day')
  if (error) throw error

  const rows = data ?? []
  return {
    total: rows.length,
    initiated: rows.filter(r => r.status === 'initiated').length,
    in_progress: rows.filter(r => r.status === 'in_progress').length,
    cleared: rows.filter(r => r.status === 'cleared').length,
    completed: rows.filter(r => r.status === 'completed').length,
    resignations: rows.filter(r => r.exit_type === 'resignation').length,
    terminations: rows.filter(r => r.exit_type === 'termination').length,
    this_month: rows.filter(r => r.created_at >= thisMonthStart).length,
    due_this_month: rows.filter(r =>
      r.last_working_day >= thisMonthStart &&
      r.status !== 'completed' && r.status !== 'cancelled'
    ).length,
  }
}
