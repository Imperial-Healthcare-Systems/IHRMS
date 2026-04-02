import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const exit_type = searchParams.get('exit_type')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    let query = supabaseAdmin
      .from('exit_processes')
      .select(`
        id, exit_type, reason, resignation_date, last_working_day,
        notice_period_days, notice_period_waived, status,
        clearance_checklist, fnf_amount, fnf_settlement_date,
        noc_issued, experience_letter, relieving_letter,
        exit_interview_done, created_at, updated_at,
        employee:employees!employee_id(
          id, first_name, last_name, work_email,
          department:departments(id, name),
          designation:designations(id, title)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (exit_type) query = query.eq('exit_type', exit_type)

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
    const {
      employee_id,
      exit_type,
      last_working_date,
      reason,
      resignation_date,
      notice_period_days,
    } = body

    if (!employee_id || !exit_type || !last_working_date || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, exit_type, last_working_date, reason' },
        { status: 400 }
      )
    }

    const validExitTypes = ['resignation', 'termination', 'retirement', 'end_of_contract', 'absconding', 'death']
    if (!validExitTypes.includes(exit_type)) {
      return NextResponse.json({ error: `exit_type must be one of: ${validExitTypes.join(', ')}` }, { status: 400 })
    }

    // Default clearance checklist with all flags set to false
    const clearance_checklist = {
      hr: false,
      it: false,
      finance: false,
      manager: false,
      admin: false,
    }

    const initiatedById = (session.user as any)?.id ?? null

    const { data, error } = await supabaseAdmin
      .from('exit_processes')
      .insert({
        employee_id,
        exit_type,
        last_working_day: last_working_date,
        reason,
        resignation_date: resignation_date ?? null,
        notice_period_days: notice_period_days ?? null,
        status: 'initiated',
        clearance_checklist,
        noc_issued: false,
        experience_letter: false,
        relieving_letter: false,
        initiated_by: initiatedById,
      })
      .select()
      .single()

    if (error) throw error

    // Update employee status to notice_period
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'notice_period', updated_at: new Date().toISOString() })
      .eq('id', employee_id)

    if (empError) {
      console.error('Failed to update employee status:', empError.message)
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
