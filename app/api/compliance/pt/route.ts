import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Professional Tax slabs by state
// Format: [{ min, max, tax }] — max null means no upper limit
type PTSlab = { min: number; max: number | null; tax: number }
type PTSlabs = Record<string, PTSlab[]>

const PT_SLABS: PTSlabs = {
  Karnataka: [
    { min: 18001, max: null, tax: 200 },
    { min: 15001, max: 18000, tax: 150 },
    { min: 0, max: 15000, tax: 0 },
  ],
  Maharashtra: [
    { min: 20001, max: null, tax: 200 },
    { min: 15001, max: 20000, tax: 150 },
    { min: 10001, max: 15000, tax: 130 },
    { min: 7501, max: 10000, tax: 175 },
    { min: 0, max: 7500, tax: 0 },
  ],
  // Default slab for other states
  Default: [
    { min: 15001, max: null, tax: 200 },
    { min: 0, max: 15000, tax: 0 },
  ],
}

function computePT(grossSalary: number, state: string): number {
  const slabs = PT_SLABS[state] ?? PT_SLABS['Default']
  for (const slab of slabs) {
    if (grossSalary >= slab.min && (slab.max === null || grossSalary <= slab.max)) {
      return slab.tax
    }
  }
  return 0
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
    }

    // Get PT-applicable active employees
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, first_name, last_name, work_email, pt_state,
        department:departments(name),
        salary:salary_structures(basic_monthly, hra_monthly, special_allowance,
          conveyance_allowance, medical_allowance, is_active)
      `)
      .eq('pt_applicable', true)
      .neq('status', 'terminated')

    if (empError) throw empError

    // Build employee breakdown and group by state
    const stateWiseTotals: Record<string, {
      state: string
      total_employees: number
      total_pt: number
      employees: unknown[]
    }> = {}

    const breakdown: Array<{
      employee_id: string
      name: string
      email: string
      state: string
      gross_salary: number
      pt_amount: number
    }> = []

    for (const emp of employees ?? []) {
      const salaries = (emp.salary as any[]) ?? []
      const activeSalary = salaries.find((s: any) => s.is_active) ?? salaries[salaries.length - 1]

      if (!activeSalary) continue

      const gross_salary =
        (activeSalary.basic_monthly ?? 0) +
        (activeSalary.hra_monthly ?? 0) +
        (activeSalary.special_allowance ?? 0) +
        (activeSalary.conveyance_allowance ?? 0) +
        (activeSalary.medical_allowance ?? 0)

      const state = emp.pt_state ?? 'Default'
      const pt_amount = computePT(gross_salary, state)

      const row = {
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.work_email,
        state,
        gross_salary,
        pt_amount,
      }

      breakdown.push(row)

      if (!stateWiseTotals[state]) {
        stateWiseTotals[state] = {
          state,
          total_employees: 0,
          total_pt: 0,
          employees: [],
        }
      }
      stateWiseTotals[state].total_employees++
      stateWiseTotals[state].total_pt += pt_amount
      stateWiseTotals[state].employees.push(row)
    }

    const overallTotal = breakdown.reduce((sum, row) => sum + row.pt_amount, 0)

    // Due date: last day of same month generally, but return 30th of same month
    const due_date = `${year}-${String(month).padStart(2, '0')}-30`

    const { data: complianceRecord } = await supabaseAdmin
      .from('statutory_compliance')
      .select('*')
      .eq('compliance_type', 'pt')
      .eq('period_month', month)
      .eq('period_year', year)
      .maybeSingle()

    return NextResponse.json({
      month,
      year,
      due_date,
      total_employees: breakdown.length,
      total_pt: overallTotal,
      state_wise: Object.values(stateWiseTotals),
      breakdown,
      compliance_record: complianceRecord ?? null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const now = new Date()
    const month = parseInt(body.month ?? now.getMonth() + 1)
    const year = parseInt(body.year ?? now.getFullYear())

    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, pt_state,
        salary:salary_structures(basic_monthly, hra_monthly, special_allowance,
          conveyance_allowance, medical_allowance, is_active)
      `)
      .eq('pt_applicable', true)
      .neq('status', 'terminated')

    if (empError) throw empError

    let totalAmount = 0
    for (const emp of employees ?? []) {
      const salaries = (emp.salary as any[]) ?? []
      const activeSalary = salaries.find((s: any) => s.is_active) ?? salaries[salaries.length - 1]
      if (!activeSalary) continue
      const gross =
        (activeSalary.basic_monthly ?? 0) +
        (activeSalary.hra_monthly ?? 0) +
        (activeSalary.special_allowance ?? 0) +
        (activeSalary.conveyance_allowance ?? 0) +
        (activeSalary.medical_allowance ?? 0)
      totalAmount += computePT(gross, emp.pt_state ?? 'Default')
    }

    const due_date = `${year}-${String(month).padStart(2, '0')}-30`

    const { data: compliance, error: compError } = await supabaseAdmin
      .from('statutory_compliance')
      .upsert(
        {
          compliance_type: 'pt',
          period_month: month,
          period_year: year,
          due_date,
          amount: totalAmount,
          status: 'pending',
          managed_by: (session.user as any)?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'compliance_type,period_month,period_year' }
      )
      .select()
      .single()

    if (compError) throw compError

    return NextResponse.json({
      message: 'PT report generated successfully',
      data: compliance,
      total_employees: (employees ?? []).length,
      total_amount: totalAmount,
      month,
      year,
      due_date,
    }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
