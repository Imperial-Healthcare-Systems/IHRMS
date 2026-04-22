import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { emitEvent } from '@/lib/ecosystem'
import { logAudit } from '@/lib/audit'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

const EXIT_SELECT = `
  *,
  employee:employees!employee_id(
    id, first_name, last_name, emp_id, work_email, date_of_joining,
    department:departments!employees_department_id_fkey(id, name),
    designation:designations(id, title)
  )
`

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status')
    const exit_type = searchParams.get('exit_type')
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    let query = supabaseAdmin
      .from('exit_processes')
      .select(EXIT_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status)    query = query.eq('status', status)
    if (exit_type) query = query.eq('exit_type', exit_type)

    const { data, error, count } = await query

    if (error) {
      const msg = errMsg(error)
      if (msg.includes('does not exist') || msg.includes('PGRST') || msg.includes('Could not find')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[exit GET]', error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0 })
  } catch (err) {
    console.error('[exit GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { employee_id, exit_type, last_working_date, reason, resignation_date, notice_period_days } = body

    if (!employee_id || !exit_type || !last_working_date || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, exit_type, last_working_date, reason' },
        { status: 400 }
      )
    }

    const validExitTypes = ['resignation', 'termination', 'retirement', 'end_of_contract', 'mutual_separation', 'absconding', 'death']
    if (!validExitTypes.includes(exit_type)) {
      return NextResponse.json({ error: `exit_type must be one of: ${validExitTypes.join(', ')}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('exit_processes')
      .insert({
        employee_id,
        exit_type,
        reason,
        last_working_date,
        resignation_date: resignation_date ?? null,
        notice_period_days: notice_period_days ?? null,
        status: 'initiated',
      })
      .select(EXIT_SELECT)
      .single()

    if (error) {
      console.error('[exit POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    // Update employee status to notice_period (best-effort)
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'notice_period', updated_at: new Date().toISOString() })
      .eq('id', employee_id)

    if (empError) console.error('[exit POST] employee status update:', empError.message)

    // Ecosystem event + audit (fire-and-forget)
    const orgId = (session.user as any)?.orgId as string | undefined
    const actorId = (session.user as any)?.id as string | undefined
    if (orgId) {
      emitEvent({ event_type: 'employee.offboarded', source_platform: 'ihrms', org_id: orgId, actor_id: actorId, entity_id: employee_id, payload: { employee_id, exit_type, last_working_date } })
      logAudit({ org_id: orgId, actor_id: actorId ?? 'unknown', action: 'created', module: 'exit', entity_id: employee_id, summary: 'Exit initiated for employee' })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[exit POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
