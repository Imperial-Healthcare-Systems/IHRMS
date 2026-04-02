import { supabaseAdmin } from '@/lib/supabase'

const EPF_WAGE_CEILING = 15000
const EPF_EE_RATE = 0.12
const EPF_ER_RATE = 0.12
const EPS_RATE = 0.0833
const EDLI_RATE = 0.005

export async function getComplianceRecords(filters: {
  compliance_type?: string
  status?: string
  year?: number
} = {}) {
  let query = supabaseAdmin
    .from('statutory_compliance')
    .select('*', { count: 'exact' })
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (filters.compliance_type) query = query.eq('compliance_type', filters.compliance_type)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.year) query = query.eq('period_year', filters.year)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getComplianceRecord(id: string) {
  const { data, error } = await supabaseAdmin
    .from('statutory_compliance')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function upsertComplianceRecord(payload: {
  compliance_type: string
  period_month: number
  period_year: number
  due_date: string
  amount: number
  status?: string
  form_number?: string
  managed_by?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('statutory_compliance')
    .upsert(
      { ...payload, status: payload.status ?? 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'compliance_type,period_month,period_year' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markComplianceFiled(id: string, filed_by?: string) {
  const { data, error } = await supabaseAdmin
    .from('statutory_compliance')
    .update({
      status: 'filed',
      filed_date: new Date().toISOString().split('T')[0],
      filed_by: filed_by ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markCompliancePaid(id: string, challan_number?: string) {
  const { data, error } = await supabaseAdmin
    .from('statutory_compliance')
    .update({
      status: 'paid',
      challan_number: challan_number ?? null,
      payment_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function computeEPFBreakdown(month: number, year: number) {
  const { data: employees, error } = await supabaseAdmin
    .from('employees')
    .select(`
      id, first_name, last_name, pf_account_number, uan_number,
      department:departments(name),
      salary:salary_structures(basic_monthly, is_active)
    `)
    .eq('pf_applicable', true)
    .neq('status', 'terminated')

  if (error) throw error

  const breakdown = (employees ?? []).map((emp) => {
    const salaries = (emp.salary as any[]) ?? []
    const active = salaries.find((s: any) => s.is_active) ?? salaries[salaries.length - 1]
    const basic = active?.basic_monthly ?? 0
    const epf_wages = Math.min(basic, EPF_WAGE_CEILING)
    const ee = Math.round(epf_wages * EPF_EE_RATE)
    const eps = Math.round(epf_wages * EPS_RATE)
    const er_diff = Math.round(epf_wages * EPF_ER_RATE) - eps
    const edli = Math.round(epf_wages * EDLI_RATE)
    return {
      employee_id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      pf_account_number: emp.pf_account_number,
      uan_number: emp.uan_number,
      department: (emp.department as any)?.name,
      basic_salary: basic,
      epf_wages,
      employee_contribution: ee,
      employer_epf_diff: er_diff,
      eps,
      edli,
      total_employer: er_diff + eps + edli,
    }
  })

  const totals = breakdown.reduce(
    (acc, r) => ({
      epf_wages: acc.epf_wages + r.epf_wages,
      employee_contribution: acc.employee_contribution + r.employee_contribution,
      employer_epf_diff: acc.employer_epf_diff + r.employer_epf_diff,
      eps: acc.eps + r.eps,
      edli: acc.edli + r.edli,
      total_employer: acc.total_employer + r.total_employer,
    }),
    { epf_wages: 0, employee_contribution: 0, employer_epf_diff: 0, eps: 0, edli: 0, total_employer: 0 }
  )

  const dueMonth = month === 12 ? 1 : month + 1
  const dueYear = month === 12 ? year + 1 : year
  const due_date = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`

  return { month, year, due_date, employees: breakdown.length, breakdown, totals }
}

export async function getComplianceDashboard(year: number) {
  const { data, error } = await supabaseAdmin
    .from('statutory_compliance')
    .select('compliance_type, period_month, status, due_date, amount')
    .eq('period_year', year)
    .order('period_month', { ascending: true })
  if (error) throw error

  const today = new Date().toISOString().split('T')[0]
  const rows = data ?? []

  return {
    total_records: rows.length,
    filed: rows.filter(r => r.status === 'filed' || r.status === 'paid').length,
    pending: rows.filter(r => r.status === 'pending').length,
    overdue: rows.filter(r => r.status === 'pending' && r.due_date < today).length,
    total_liability: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
    paid: rows.reduce((s, r) => s + (r.status === 'paid' ? (r.amount ?? 0) : 0), 0),
    by_type: ['pf', 'esic', 'pt', 'tds'].map(t => ({
      type: t,
      count: rows.filter(r => r.compliance_type === t).length,
      pending: rows.filter(r => r.compliance_type === t && r.status === 'pending').length,
      amount: rows.filter(r => r.compliance_type === t).reduce((s, r) => s + (r.amount ?? 0), 0),
    })),
  }
}
