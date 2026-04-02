import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const EPF_WAGE_CEILING = 15000
const EMPLOYEE_EPF_RATE = 0.12   // 12%
const EMPLOYER_EPF_RATE = 0.12   // 12% total
const EPS_RATE = 0.0833          // 8.33% of EPF wages (goes to EPS)
const EDLI_RATE = 0.005          // 0.5% of EPF wages

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

    // Get all PF-applicable active employees with salary structure
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, first_name, last_name, work_email, pf_account_number, uan_number,
        department:departments(name),
        salary:salary_structures(basic_monthly, effective_from, effective_to, is_active)
      `)
      .eq('pf_applicable', true)
      .neq('status', 'terminated')

    if (empError) throw empError

    // Compute EPF breakdown per employee
    const breakdown = (employees ?? []).map((emp) => {
      const salaries = (emp.salary as any[]) ?? []
      const activeSalary = salaries.find((s: any) => s.is_active) ?? salaries[salaries.length - 1]
      const basicMonthly = activeSalary?.basic_monthly ?? 0

      const epf_wages = Math.min(basicMonthly, EPF_WAGE_CEILING)
      const employee_contribution = Math.round(epf_wages * EMPLOYEE_EPF_RATE)
      const eps = Math.round(epf_wages * EPS_RATE)
      const employer_epf_diff = Math.round(epf_wages * EMPLOYER_EPF_RATE) - eps
      const edli = Math.round(epf_wages * EDLI_RATE)

      return {
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.work_email,
        pf_account_number: emp.pf_account_number,
        uan_number: emp.uan_number,
        department: (emp.department as any)?.name,
        basic_salary: basicMonthly,
        epf_wages,
        employee_contribution,
        employer_epf_diff,
        eps,
        edli,
        total_employer_contribution: employer_epf_diff + eps + edli,
      }
    })

    const totals = breakdown.reduce(
      (acc, row) => ({
        total_epf_wages: acc.total_epf_wages + row.epf_wages,
        total_employee_contribution: acc.total_employee_contribution + row.employee_contribution,
        total_employer_epf_diff: acc.total_employer_epf_diff + row.employer_epf_diff,
        total_eps: acc.total_eps + row.eps,
        total_edli: acc.total_edli + row.edli,
        total_employer_contribution: acc.total_employer_contribution + row.total_employer_contribution,
      }),
      {
        total_epf_wages: 0,
        total_employee_contribution: 0,
        total_employer_epf_diff: 0,
        total_eps: 0,
        total_edli: 0,
        total_employer_contribution: 0,
      }
    )

    // Due date: 15th of next month
    const dueMonth = month === 12 ? 1 : month + 1
    const dueYear = month === 12 ? year + 1 : year
    const due_date = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`

    // Fetch compliance record if exists
    const { data: complianceRecord } = await supabaseAdmin
      .from('statutory_compliance')
      .select('*')
      .eq('compliance_type', 'pf')
      .eq('period_month', month)
      .eq('period_year', year)
      .maybeSingle()

    return NextResponse.json({
      month,
      year,
      due_date,
      total_employees: breakdown.length,
      ...totals,
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

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
    }

    // Get PF-applicable employees with active salary
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        salary:salary_structures(basic_monthly, is_active)
      `)
      .eq('pf_applicable', true)
      .neq('status', 'terminated')

    if (empError) throw empError

    // Compute totals
    let totalAmount = 0
    for (const emp of employees ?? []) {
      const salaries = (emp.salary as any[]) ?? []
      const activeSalary = salaries.find((s: any) => s.is_active) ?? salaries[salaries.length - 1]
      const basicMonthly = activeSalary?.basic_monthly ?? 0
      const epf_wages = Math.min(basicMonthly, EPF_WAGE_CEILING)
      const employee_contribution = Math.round(epf_wages * EMPLOYEE_EPF_RATE)
      const eps = Math.round(epf_wages * EPS_RATE)
      const edli = Math.round(epf_wages * EDLI_RATE)
      const employer_epf_diff = Math.round(epf_wages * EMPLOYER_EPF_RATE) - eps
      totalAmount += employee_contribution + employer_epf_diff + eps + edli
    }

    // Due date: 15th of next month
    const dueMonth = month === 12 ? 1 : month + 1
    const dueYear = month === 12 ? year + 1 : year
    const due_date = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`

    // Upsert statutory_compliance record
    const { data: compliance, error: compError } = await supabaseAdmin
      .from('statutory_compliance')
      .upsert(
        {
          compliance_type: 'pf',
          period_month: month,
          period_year: year,
          due_date,
          amount: totalAmount,
          status: 'pending',
          form_number: 'ECR',
          managed_by: (session.user as any)?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'compliance_type,period_month,period_year' }
      )
      .select()
      .single()

    if (compError) throw compError

    return NextResponse.json({
      message: 'EPF report generated successfully',
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
