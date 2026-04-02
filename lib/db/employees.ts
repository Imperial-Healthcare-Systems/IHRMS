import { supabaseAdmin } from '@/lib/supabase'

export interface EmployeeFilters {
  status?: string
  department_id?: string
  employment_type?: string
  search?: string
  limit?: number
  offset?: number
}

export async function getEmployees(filters: EmployeeFilters = {}) {
  let query = supabaseAdmin
    .from('employees')
    .select(`
      *,
      department:departments(id, name, code),
      designation:designations(id, title, grade),
      reporting_manager:employees!reporting_manager_id(id, first_name, last_name, emp_id)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.department_id) query = query.eq('department_id', filters.department_id)
  if (filters.employment_type) query = query.eq('employment_type', filters.employment_type)
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,emp_id.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 20)) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getEmployee(id: string) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(`
      *,
      department:departments(*),
      designation:designations(*),
      reporting_manager:employees!reporting_manager_id(id, first_name, last_name, emp_id, email)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getEmployeeByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('email', email)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createEmployee(payload: Record<string, unknown>) {
  // Auto-generate EMP ID
  const year = new Date().getFullYear()
  const { count } = await supabaseAdmin
    .from('employees')
    .select('*', { count: 'exact', head: true })
  const sequence = (count ?? 0) + 1
  const emp_id = `EMP/${year}/${String(sequence).padStart(3, '0')}`

  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert({ ...payload, emp_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmployee(id: string) {
  // Soft delete — set status to terminated
  const { data, error } = await supabaseAdmin
    .from('employees')
    .update({ status: 'terminated', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDepartments() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*, head:employees!head_id(id, first_name, last_name)')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getDesignations(department_id?: string) {
  let query = supabaseAdmin
    .from('designations')
    .select('*, department:departments(id, name)')
    .order('level')
  if (department_id) query = query.eq('department_id', department_id)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getHeadcountStats() {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('status, department_id, employment_type, hire_date')
  if (error) throw error

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  return {
    total: data?.length ?? 0,
    active: data?.filter(e => e.status === 'active').length ?? 0,
    probation: data?.filter(e => e.status === 'probation').length ?? 0,
    on_leave: data?.filter(e => e.status === 'on_leave').length ?? 0,
    notice_period: data?.filter(e => e.status === 'notice_period').length ?? 0,
    terminated: data?.filter(e => e.status === 'terminated').length ?? 0,
    new_joiners_this_month: data?.filter(e => e.hire_date >= thisMonthStart).length ?? 0,
  }
}
