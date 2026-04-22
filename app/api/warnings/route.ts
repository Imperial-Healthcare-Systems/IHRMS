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

// Use * for base table columns — avoids PGRST204 if schema drifts
const WARNING_SELECT = `
  *,
  employee:employees!employee_id(
    id, first_name, last_name, emp_id,
    department:departments!employees_department_id_fkey(id, name),
    designation:designations(id, title)
  ),
  issued_by:employees!issued_by(
    id, first_name, last_name, emp_id
  )
`

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')
    const year        = searchParams.get('year')
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset      = parseInt(searchParams.get('offset') ?? '0')

    const userRole = (session.user as Record<string, unknown>)?.role as string | undefined
    const userId   = (session.user as Record<string, unknown>)?.id   as string | undefined
    const FULL_ACCESS = ['hr_admin', 'super_admin', 'admin', 'hr', 'manager', 'operations_head']
    const isFullAccess = FULL_ACCESS.includes(userRole ?? '')

    let query = supabaseAdmin
      .from('warning_letters')
      .select(WARNING_SELECT, { count: 'exact' })
      .order('issued_date', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Employees only see their own records
    if (!isFullAccess) {
      query = query.eq('employee_id', userId as string)
    } else if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }
    if (status)      query = query.eq('status', status)
    if (year) {
      query = query
        .gte('issued_date', `${year}-01-01`)
        .lte('issued_date', `${year}-12-31`)
    }

    const { data, error, count } = await query

    if (error) {
      const msg = errMsg(error)
      if (msg.includes('does not exist') || msg.includes('PGRST') || msg.includes('Could not find')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[warnings GET]', error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[warnings GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = (session.user as Record<string, unknown>)?.isAdmin as boolean | undefined
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { employee_id, issued_by, date, subject, description } = body

    if (!employee_id || !issued_by || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, issued_by, subject, description' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const currentYear = new Date().getFullYear()

    const { data: warning, error } = await supabaseAdmin
      .from('warning_letters')
      .insert({
        employee_id,
        issued_by,
        subject,
        issued_date: date || today,
        description,
        status: 'issued',
      })
      .select(WARNING_SELECT)
      .single()

    if (error) {
      console.error('[warnings POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    // Count warnings for this employee in current year
    const { count: warningCount } = await supabaseAdmin
      .from('warning_letters')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employee_id)
      .gte('issued_date', `${currentYear}-01-01`)
      .lte('issued_date', `${currentYear}-12-31`)

    const totalWarnings   = warningCount ?? 0
    const autoTermination = totalWarnings >= 3

    if (autoTermination) {
      const { error: exitErr } = await supabaseAdmin
        .from('exit_processes')
        .upsert(
          { employee_id, exit_type: 'termination', reason: `3 warnings issued in calendar year ${currentYear}` },
          { onConflict: 'employee_id', ignoreDuplicates: true }
        )
      if (exitErr) console.error('Failed to auto-create exit process', exitErr)
    }

    // Ecosystem event + audit (fire-and-forget)
    const orgId = (session.user as any)?.orgId as string | undefined
    const actorId = (session.user as any)?.id as string | undefined
    if (orgId) {
      emitEvent({ event_type: 'warning.issued', source_platform: 'ihrms', org_id: orgId, actor_id: actorId, entity_id: employee_id, payload: { employee_id, subject, total_warnings: totalWarnings, auto_termination: autoTermination } })
      logAudit({ org_id: orgId, actor_id: actorId ?? 'unknown', action: 'created', module: 'warnings', entity_id: employee_id, summary: 'Warning issued to employee' })
    }

    return NextResponse.json(
      { data: warning, warning_count: totalWarnings, auto_termination_triggered: autoTermination },
      { status: 201 }
    )
  } catch (err) {
    console.error('[warnings POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, action, employee_remarks } = body as {
      id?: string
      action?: 'issue' | 'acknowledge'
      employee_remarks?: string
    }

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing required fields: id, action' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}

    if (action === 'issue') {
      updatePayload.status = 'issued'
    } else if (action === 'acknowledge') {
      updatePayload.status = 'acknowledged'
      if (employee_remarks) updatePayload.employee_remarks = employee_remarks
    } else {
      return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('warning_letters')
      .update(updatePayload)
      .eq('id', id)
      .select(WARNING_SELECT)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Warning letter not found' }, { status: 404 })
      console.error('[warnings PATCH]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    if (action === 'issue') {
      const currentYear = new Date().getFullYear()
      const empId = (data as Record<string, unknown>).employee_id as string
      const { count: warningCount } = await supabaseAdmin
        .from('warning_letters')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', empId)
        .eq('status', 'issued')
        .gte('issued_date', `${currentYear}-01-01`)
        .lte('issued_date', `${currentYear}-12-31`)

      const autoTermination = (warningCount ?? 0) >= 3
      if (autoTermination) {
        const { error: exitErr } = await supabaseAdmin
          .from('exit_processes')
          .upsert(
            { employee_id: empId, exit_type: 'termination', reason: `3 warnings issued in calendar year ${currentYear}` },
            { onConflict: 'employee_id', ignoreDuplicates: true }
          )
        if (exitErr) console.error('Failed to auto-create exit process', exitErr)
      }

      return NextResponse.json({ data, auto_termination_triggered: autoTermination })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[warnings PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
