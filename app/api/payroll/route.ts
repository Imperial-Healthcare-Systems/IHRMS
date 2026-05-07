import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const PAYROLL_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'payroll_admin', 'finance_admin']

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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const year   = searchParams.get('year')
    const status = searchParams.get('status')
    const limit  = parseInt(searchParams.get('limit') ?? '20')

    let query = supabaseAdmin
      .from('payroll_runs')
      .select('*', { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(limit)

    if (year)   query = query.eq('year', parseInt(year))
    if (status) query = query.eq('status', status)

    const { data, error: dbErr, count } = await query
    if (dbErr) { console.error('[payroll GET]', dbErr); throw dbErr }

    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    console.error('[payroll GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(PAYROLL_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { month, year } = body
    if (!month || !year) {
      return NextResponse.json({ error: 'Missing required fields: month, year' }, { status: 400 })
    }

    const monthNum = parseInt(month)
    const yearNum  = parseInt(year)

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
    }

    // Check if payroll run already exists for this month/year IN THIS ORG
    const { data: existing } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, status')
      .eq('org_id', ctx.orgId)
      .eq('month', monthNum)
      .eq('year', yearNum)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Payroll run already exists for ${MONTH_NAMES[monthNum]} ${yearNum}`, existing },
        { status: 409 }
      )
    }

    // Active employee count — scoped to this org
    const { count: employeeCount } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .in('status', ['active', 'probation', 'on_leave', 'notice_period'])

    const period_label = `${MONTH_NAMES[monthNum]} ${yearNum}`

    const { data, error: insErr } = await supabaseAdmin
      .from('payroll_runs')
      .insert({
        org_id: ctx.orgId,
        month: monthNum,
        year:  yearNum,
        status: 'draft',
        total_employees: employeeCount ?? 0,
        remarks: period_label,
        run_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (insErr) { console.error('[payroll POST]', insErr); throw insErr }

    return NextResponse.json({ data, period_label }, { status: 201 })
  } catch (err: unknown) {
    console.error('[payroll POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
