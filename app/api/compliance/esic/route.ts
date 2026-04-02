import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ESIC_GROSS_CEILING = 21000
const EMPLOYEE_ESIC_RATE = 0.0075  // 0.75%
const EMPLOYER_ESIC_RATE = 0.0325  // 3.25%

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

    // Get ESIC-applicable active employees with salary
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, first_name, last_name, work_email, esic_number,
        department:departments(name),
        salary:salary_structures(basic_monthly, hra_monthly, special_allowance,
          conveyance_allowance, medical_allowance, is_active)
      `)
      .eq('esic_applicable', true)
      .neq('status', 'terminated')

    if (empError) throw empError

    // Filter employees whose gross salary <= 21000 and build breakdown
    const breakdown: Array<{
      employee_id: string
      name: string
      email: string
      esic_number: string | null
      department: string | undefined
      gross_salary: number
      esic_wages: number
      employee_contribution: number
      employer_contribution: number
      total_contribution: number
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

      // Only include employees with gross <= ceiling
      if (gross_salary > ESIC_GROSS_CEILING) continue

      const employee_contribution = Math.round(gross_salary * EMPLOYEE_ESIC_RATE)
      const employer_contribution = Math.round(gross_salary * EMPLOYER_ESIC_RATE)

      breakdown.push({
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.work_email,
        esic_number: emp.esic_number,
        department: (emp.department as any)?.name,
        gross_salary,
        esic_wages: gross_salary,
        employee_contribution,
        employer_contribution,
        total_contribution: employee_contribution + employer_contribution,
      })
    }

    const totals = breakdown.reduce(
      (acc, row) => ({
        total_esic_wages: acc.total_esic_wages + row.esic_wages,
        total_employee_contribution: acc.total_employee_contribution + row.employee_contribution,
        total_employer_contribution: acc.total_employer_contribution + row.employer_contribution,
        total_contribution: acc.total_contribution + row.total_contribution,
      }),
      {
        total_esic_wages: 0,
        total_employee_contribution: 0,
        total_employer_contribution: 0,
        total_contribution: 0,
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
      .eq('compliance_type', 'esic')
      .eq('period_month', month)
      .eq('period_year', year)
      .maybeSingle()

    return NextResponse.json({
      month,
      year,
      due_date,
      total_employees: breakdown.length,
      gross_ceiling: ESIC_GROSS_CEILING,
      employee_rate_pct: EMPLOYEE_ESIC_RATE * 100,
      employer_rate_pct: EMPLOYER_ESIC_RATE * 100,
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

    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        salary:salary_structures(basic_monthly, hra_monthly, special_allowance,
          conveyance_allowance, medical_allowance, is_active)
      `)
      .eq('esic_applicable', true)
      .neq('status', 'terminated')

    if (empError) throw empError

    let totalAmount = 0
    let eligibleCount = 0

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

      if (gross > ESIC_GROSS_CEILING) continue

      totalAmount += Math.round(gross * EMPLOYEE_ESIC_RATE) + Math.round(gross * EMPLOYER_ESIC_RATE)
      eligibleCount++
    }

    const dueMonth = month === 12 ? 1 : month + 1
    const dueYear = month === 12 ? year + 1 : year
    const due_date = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`

    const { data: compliance, error: compError } = await supabaseAdmin
      .from('statutory_compliance')
      .upsert(
        {
          compliance_type: 'esic',
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
      message: 'ESIC report generated successfully',
      data: compliance,
      total_employees: eligibleCount,
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
