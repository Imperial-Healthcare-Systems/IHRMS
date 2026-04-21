import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

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
      .select('*', { count: 'exact' })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(limit)

    if (year)   query = query.eq('year', parseInt(year))
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) { console.error('[payroll GET]', error); throw error }

    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    console.error('[payroll GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as any)?.role as string | undefined
    const PAYROLL_ROLES = ['payroll_admin', 'finance_admin', 'super_admin', 'hr_admin', 'admin']
    if (!PAYROLL_ROLES.includes(userRole ?? '')) {
      return NextResponse.json({ error: 'Forbidden — Payroll Admin role required' }, { status: 403 })
    }

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
      .maybeSingle()

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

    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .insert({
        month: monthNum,
        year:  yearNum,
        status: 'draft',
        total_employees: employeeCount ?? 0,
        remarks: period_label,
        run_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) { console.error('[payroll POST]', error); throw error }

    return NextResponse.json({ data, period_label }, { status: 201 })
  } catch (err: unknown) {
    console.error('[payroll POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
