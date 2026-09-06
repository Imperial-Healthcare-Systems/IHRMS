import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getPerformanceReviews(filters: {
  employee_id?: string
  reviewer_id?: string
  review_type?: string
  status?: string
  year?: number
} = {}) {
  let query = supabaseAdmin
    .from('performance_reviews')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id,
        department:departments(name), designation:designations(title)),
      reviewer:employees!reviewer_id(id, first_name, last_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.reviewer_id) query = query.eq('reviewer_id', filters.reviewer_id)
  if (filters.review_type) query = query.eq('review_type', filters.review_type)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.year) {
    query = query
      .gte('review_period_start', `${filters.year}-01-01`)
      .lte('review_period_end', `${filters.year}-12-31`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function createReview(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('performance_reviews')
    .insert({ ...payload, status: 'draft' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateReview(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('performance_reviews')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getWarningLetters(filters: {
  employee_id?: string
  status?: string
  year?: number
  limit?: number
} = {}) {
  let query = supabaseAdmin
    .from('warning_letters')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id,
        department:departments(name)),
      issued_by_employee:employees!issued_by(id, first_name, last_name)
    `, { count: 'exact' })
    .order('issued_date', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.year) {
    query = query
      .gte('issued_date', `${filters.year}-01-01`)
      .lte('issued_date', `${filters.year}-12-31`)
  }
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function createWarning(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .insert({ ...payload, status: 'draft' })
    .select()
    .single()
  if (error) throw error

  // Check warning count for auto-termination trigger
  const year = new Date().getFullYear()
  const { count } = await supabaseAdmin
    .from('warning_letters')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', payload.employee_id as string)
    .gte('issued_date', `${year}-01-01`)
    .lte('issued_date', `${year}-12-31`)
    .neq('status', 'draft')

  return { warning: data, warning_count: count ?? 0, auto_termination_triggered: (count ?? 0) >= 3 }
}

export async function issueWarning(id: string) {
  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .update({ status: 'issued' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAppreciationNotes(filters: {
  employee_id?: string
  is_public?: boolean
  limit?: number
} = {}) {
  let query = supabaseAdmin
    .from('appreciation_notes')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id),
      given_by_employee:employees!given_by(id, first_name, last_name)
    `)
    .order('date', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.is_public !== undefined) query = query.eq('is_public', filters.is_public)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createAppreciation(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('appreciation_notes')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getProbationReviews(filters: {
  outcome?: string
  overdue?: boolean
} = {}) {
  let query = supabaseAdmin
    .from('probation_reviews')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id, date_of_joining, probation_end_date,
        department:departments(name),
        designation:designations(title),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name))
    `)
    .order('probation_end', { ascending: true })

  if (filters.outcome) query = query.eq('outcome', filters.outcome)
  if (filters.overdue) {
    query = query.lt('probation_end', new Date().toISOString().split('T')[0]).eq('outcome', 'pending')
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
