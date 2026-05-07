import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getWarnings(filters: {
  employee_id?: string
  status?: string
  year?: number
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('warning_letters')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, emp_id,
        department:departments(name),
        designation:designations(title)
      ),
      issued_by_employee:employees!issued_by(id, first_name, last_name)
    `, { count: 'exact' })
    .order('date', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.year) {
    query = query
      .gte('date', `${filters.year}-01-01`)
      .lte('date', `${filters.year}-12-31`)
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset && filters.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getWarning(id: string) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, emp_id, hire_date,
        department:departments(name),
        designation:designations(title)
      ),
      issued_by_employee:employees!issued_by(id, first_name, last_name)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createWarning(payload: {
  employee_id: string
  warning_type: string
  subject: string
  reason: string
  description?: string
  date: string
  issued_by: string
  response_deadline?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .insert({ ...payload, status: 'draft' })
    .select()
    .single()
  if (error) throw error

  // Check annual warning count for auto-termination trigger
  const year = new Date(payload.date).getFullYear()
  const { count } = await supabaseAdmin
    .from('warning_letters')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', payload.employee_id)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .neq('status', 'draft')

  return {
    warning: data,
    warning_count: count ?? 0,
    auto_termination_triggered: (count ?? 0) >= 3,
  }
}

export async function issueWarning(id: string) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .update({ status: 'issued', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function acknowledgeWarning(id: string, employee_remarks?: string) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .update({
      status: 'acknowledged',
      employee_remarks: employee_remarks ?? null,
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resolveWarning(id: string, resolution_note?: string) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .update({
      status: 'resolved',
      resolution_note: resolution_note ?? null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getWarningStats(year?: number) {
  const y = year ?? new Date().getFullYear()

  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .select('status, warning_type, employee_id, date')
    .gte('date', `${y}-01-01`)
    .lte('date', `${y}-12-31`)
  if (error) throw error

  const rows = data ?? []
  const uniqueEmployees = new Set(rows.map(r => r.employee_id))

  return {
    total: rows.length,
    draft: rows.filter(r => r.status === 'draft').length,
    issued: rows.filter(r => r.status === 'issued').length,
    acknowledged: rows.filter(r => r.status === 'acknowledged').length,
    resolved: rows.filter(r => r.status === 'resolved').length,
    disputed: rows.filter(r => r.status === 'disputed').length,
    employees_with_warnings: uniqueEmployees.size,
    by_type: ['verbal', 'written_1', 'written_2', 'final'].map(t => ({
      type: t,
      count: rows.filter(r => r.warning_type === t).length,
    })),
  }
}
