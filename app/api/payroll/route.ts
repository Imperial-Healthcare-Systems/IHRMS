import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year   = searchParams.get('year')
    const status = searchParams.get('status')
    const limit  = parseInt(searchParams.get('limit') ?? '20')

    let query = supabaseAdmin
      .from('payroll_runs')
      .select(`
        id, month, year, run_date, payment_date, status,
        total_employees, total_gross, total_deductions, total_net,
        total_employer_pf, total_employer_esic, remarks,
        processed_by:employees!payroll_runs_processed_by_fkey(id, first_name, last_name, emp_id),
        approved_by:employees!payroll_runs_approved_by_fkey(id, first_name, last_name, emp_id),
        created_at, updated_at
      `, { count: 'exact' })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(limit)

    if (year)   query = query.eq('year', parseInt(year))
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count })
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
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Missing required fields: month, year' }, { status: 400 })
    }

    const monthNum = parseInt(month)
    const yearNum  = parseInt(year)

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
    }

    // Check if payroll run already exists for this month/year
    const { data: existing } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, status')
      .eq('month', monthNum)
      .eq('year', yearNum)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Payroll run already exists for ${MONTH_NAMES[monthNum]} ${yearNum}`, existing },
        { status: 409 }
      )
    }

    // Get active employee count
    const { count: employeeCount } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'probation', 'on_leave', 'notice_period'])

    const period_label = `${MONTH_NAMES[monthNum]} ${yearNum}`
    const processedById = (session.user as any)?.id ?? null

    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .insert({
        month: monthNum,
        year: yearNum,
        status: 'draft',
        total_employees: employeeCount ?? 0,
        remarks: period_label,
        processed_by: processedById,
        run_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, period_label }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
