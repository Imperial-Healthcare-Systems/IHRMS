import { supabaseAdmin } from '@/lib/supabase'

export async function getPayrollRuns(filters: {
  year?: number
  status?: string
  limit?: number
} = {}) {
  let query = supabaseAdmin
    .from('payroll_runs')
    .select('*', { count: 'exact' })
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (filters.year) query = query.eq('year', filters.year)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getPayrollRun(id: string) {
  const { data, error } = await supabaseAdmin
    .from('payroll_runs')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getPayslips(filters: {
  payroll_run_id?: string
  employee_id?: string
  year?: number
  month?: number
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('payslips')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id, pan_number,
        department:departments(name),
        designation:designations(title)),
      payroll_run:payroll_runs(period_label, status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.payroll_run_id) query = query.eq('payroll_run_id', filters.payroll_run_id)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.year) query = query.eq('year', filters.year)
  if (filters.month) query = query.eq('month', filters.month)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 50)) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getPayslip(id: string) {
  const { data, error } = await supabaseAdmin
    .from('payslips')
    .select(`
      *,
      employee:employees(*, department:departments(*), designation:designations(*)),
      payroll_run:payroll_runs(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getSalaryStructure(employee_id: string) {
  const { data, error } = await supabaseAdmin
    .from('salary_structures')
    .select('*')
    .eq('employee_id', employee_id)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertSalaryStructure(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('salary_structures')
    .upsert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function initiatePayrollRun(month: number, year: number, run_by: string) {
  // Check if run already exists
  const { data: existing } = await supabaseAdmin
    .from('payroll_runs')
    .select('id, status')
    .eq('month', month)
    .eq('year', year)
    .single()

  if (existing) {
    if (existing.status !== 'cancelled') {
      throw new Error(`Payroll run for ${month}/${year} already exists with status: ${existing.status}`)
    }
  }

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const period_label = `${monthNames[month - 1]} ${year}`

  // Get all active employees
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('status', 'active')

  const { data, error } = await supabaseAdmin
    .from('payroll_runs')
    .insert({
      month, year, period_label,
      status: 'draft',
      total_employees: employees?.length ?? 0,
      total_gross: 0, total_deductions: 0, total_net: 0,
      total_pf: 0, total_esic: 0, total_pt: 0, total_tds: 0,
      run_by,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approvePayrollRun(id: string, approved_by: string) {
  const { data, error } = await supabaseAdmin
    .from('payroll_runs')
    .update({ status: 'approved', approved_by, approved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getStatutoryCompliance(month: number, year: number) {
  const { data, error } = await supabaseAdmin
    .from('statutory_compliance')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id, uan_number, esic_number, pan_number)
    `)
    .eq('month', month)
    .eq('year', year)
  if (error) throw error
  return data ?? []
}
