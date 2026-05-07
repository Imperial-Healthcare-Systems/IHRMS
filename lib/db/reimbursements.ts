import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getExpenseClaims(filters: {
  employee_id?: string
  status?: string
  category?: string
  month?: number
  year?: number
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('expense_claims')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, emp_id,
        department:departments(name),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name)
      ),
      approved_by_employee:employees!approved_by(id, first_name, last_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.year) {
    const monthStr = filters.month
      ? String(filters.month).padStart(2, '0')
      : '01'
    const endMonth = filters.month
      ? String(filters.month).padStart(2, '0')
      : '12'
    query = query
      .gte('expense_date', `${filters.year}-${monthStr}-01`)
      .lte('expense_date', `${filters.year}-${endMonth}-31`)
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset && filters.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getExpenseClaim(id: string) {
  const { data, error } = await supabaseAdmin
    .from('expense_claims')
    .select(`
      *,
      employee:employees!employee_id(
        id, first_name, last_name, emp_id,
        department:departments(name),
        designation:designations(title)
      ),
      approved_by_employee:employees!approved_by(id, first_name, last_name)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createExpenseClaim(payload: {
  employee_id: string
  category: string
  amount: number
  expense_date: string
  description: string
  receipt_url?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('expense_claims')
    .insert({ ...payload, status: 'submitted' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approveExpenseClaim(id: string, approved_by: string, remarks?: string) {
  const { data, error } = await supabaseAdmin
    .from('expense_claims')
    .update({
      status: 'approved',
      approved_by,
      approved_at: new Date().toISOString(),
      remarks: remarks ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectExpenseClaim(id: string, rejected_by: string, remarks: string) {
  const { data, error } = await supabaseAdmin
    .from('expense_claims')
    .update({
      status: 'rejected',
      approved_by: rejected_by,
      approved_at: new Date().toISOString(),
      remarks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markExpensePaid(id: string, payment_reference?: string) {
  const { data, error } = await supabaseAdmin
    .from('expense_claims')
    .update({
      status: 'paid',
      payment_reference: payment_reference ?? null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getReimbursementStats(month?: number, year?: number) {
  const now = new Date()
  const m = month ?? now.getMonth() + 1
  const y = year ?? now.getFullYear()
  const monthStr = String(m).padStart(2, '0')
  const start = `${y}-${monthStr}-01`
  const end = `${y}-${monthStr}-31`

  const { data, error } = await supabaseAdmin
    .from('expense_claims')
    .select('status, amount, category')
    .gte('expense_date', start)
    .lte('expense_date', end)
  if (error) throw error

  const rows = data ?? []
  const totalAmount = rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const approvedAmount = rows
    .filter(r => r.status === 'approved' || r.status === 'paid')
    .reduce((s, r) => s + (r.amount ?? 0), 0)
  const pendingAmount = rows
    .filter(r => r.status === 'submitted')
    .reduce((s, r) => s + (r.amount ?? 0), 0)

  return {
    total_claims: rows.length,
    submitted: rows.filter(r => r.status === 'submitted').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    paid: rows.filter(r => r.status === 'paid').length,
    total_amount: totalAmount,
    approved_amount: approvedAmount,
    pending_amount: pendingAmount,
    by_category: [...new Set(rows.map(r => r.category))].map(cat => ({
      category: cat,
      count: rows.filter(r => r.category === cat).length,
      amount: rows.filter(r => r.category === cat).reduce((s, r) => s + (r.amount ?? 0), 0),
    })),
  }
}
