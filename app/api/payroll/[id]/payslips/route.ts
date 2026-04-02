import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search        = searchParams.get('search')
    const department_id = searchParams.get('department_id')
    const limit         = parseInt(searchParams.get('limit') ?? '100')
    const offset        = parseInt(searchParams.get('offset') ?? '0')

    // Verify payroll run exists
    const { data: run, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, month, year, status')
      .eq('id', id)
      .single()

    if (runError) {
      if (runError.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw runError
    }

    let query = supabaseAdmin
      .from('payslips')
      .select(`
        id, month, year, working_days, paid_days, lop_days,
        basic, hra, special_allowance, conveyance, medical_allowance, lta,
        overtime, bonus, other_earnings, gross_earnings,
        employee_pf, employee_esic, professional_tax, tds, lwf_employee,
        advance_recovery, loan_recovery, other_deductions, total_deductions,
        net_pay, employer_pf, employer_esic, employer_gratuity,
        ytd_gross, ytd_tds, ytd_pf,
        payment_status, payment_date, payment_ref, pdf_url,
        employee:employees!payslips_employee_id_fkey(
          id, first_name, last_name, work_email,
          department:departments(id, name, code),
          designation:designations(id, title)
        ),
        created_at, updated_at
      `, { count: 'exact' })
      .eq('payroll_run_id', id)
      .order('created_at', { ascending: true })
      .limit(limit)
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Apply search filter in JS since we're joining nested data
    let filtered = data ?? []
    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter((p: any) => {
        const emp = p.employee
        if (!emp) return false
        return (
          emp.first_name?.toLowerCase().includes(term) ||
          emp.last_name?.toLowerCase().includes(term) ||
          emp.work_email?.toLowerCase().includes(term)
        )
      })
    }
    if (department_id) {
      filtered = filtered.filter((p: any) => p.employee?.department?.id === department_id)
    }

    return NextResponse.json({
      data: filtered,
      count: search || department_id ? filtered.length : count,
      payroll_run: run,
      limit,
      offset,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
