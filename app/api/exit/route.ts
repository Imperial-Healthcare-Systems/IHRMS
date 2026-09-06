import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/ecosystem'
import { logAudit } from '@/lib/audit'
import { getActiveEmployee } from '@/lib/employee-context'

const FULL_ACCESS_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'operations_head']
const MANAGER_ROLES     = ['manager']

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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status')
    const exit_type = searchParams.get('exit_type')
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    let teamIds: string[] = []
    if (MANAGER_ROLES.includes(ctx.role)) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ data: [], count: 0 })
      const { data: team } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('reporting_manager_id', me.id)
        .eq('status', 'active')
      teamIds = (team ?? []).map((e: any) => e.id as string)
      if (teamIds.length === 0) return NextResponse.json({ data: [], count: 0 })
    }

    let query = supabaseAdmin
      .from('exit_processes')
      .select(EXIT_SELECT, { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (MANAGER_ROLES.includes(ctx.role)) {
      query = query.in('employee_id', teamIds)
    } else if (!FULL_ACCESS_ROLES.includes(ctx.role)) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ data: [], count: 0 })
      query = query.eq('employee_id', me.id)
    }

    if (status)    query = query.eq('status', status)
    if (exit_type) query = query.eq('exit_type', exit_type)

    const { data, error: dbErr, count } = await query

    if (dbErr) {
      const msg = errMsg(dbErr)
      if (msg.includes('does not exist') || msg.includes('PGRST') || msg.includes('Could not find')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[exit GET]', dbErr)
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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

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

    // Cross-tenant guard
    const { data: emp } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
    if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('exit_processes')
      .insert({
        org_id: ctx.orgId,
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

    if (dbErr) {
      console.error('[exit POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    // Update employee status to notice_period (best-effort)
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'notice_period', updated_at: new Date().toISOString() })
      .eq('id', employee_id)
      .eq('org_id', ctx.orgId)

    if (empError) console.error('[exit POST] employee status update:', empError.message)

    emitEvent({
      event_type: 'employee.offboarded',
      source_platform: 'ihrms',
      org_id: ctx.orgId,
      actor_id: ctx.identityId,
      entity_id: employee_id,
      payload: { employee_id, exit_type, last_working_date },
    })
    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'created',
      module: 'exit',
      entity_id: employee_id,
      summary: 'Exit initiated for employee',
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[exit POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { id, action, rejection_reason } = body
    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const { data: exitRow, error: fetchErr } = await supabaseAdmin
      .from('exit_processes')
      .select('id, employee_id, exit_type, status')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()
    if (fetchErr || !exitRow) return NextResponse.json({ error: 'Exit record not found' }, { status: 404 })

    if (!FULL_ACCESS_ROLES.includes(ctx.role)) {
      if (MANAGER_ROLES.includes(ctx.role)) {
        const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
        if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('reporting_manager_id')
          .eq('id', (exitRow as any).employee_id)
          .eq('org_id', ctx.orgId)
          .single()
        if (!emp || (emp as any).reporting_manager_id !== me.id) {
          return NextResponse.json({ error: 'Forbidden: you are not the reporting manager for this employee' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      reviewed_by: ctx.identityId,
      reviewed_at: new Date().toISOString(),
    }
    if (rejection_reason) updatePayload.rejection_reason = rejection_reason

    const { data, error: dbErr } = await supabaseAdmin
      .from('exit_processes')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select(EXIT_SELECT)
      .single()
    if (dbErr) { console.error('[exit PATCH]', dbErr); throw dbErr }

    try {
      const isApproved = action === 'approve'
      await supabaseAdmin.from('notifications').insert({
        org_id: ctx.orgId,
        recipient_id: (exitRow as any).employee_id,
        title: isApproved ? 'Resignation Accepted' : 'Resignation Rejected',
        body: isApproved
          ? 'Your resignation has been accepted. Please check your exit details.'
          : `Your resignation was not approved.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`,
        type: isApproved ? 'info' : 'warning',
      })
    } catch (e) { console.warn('[exit PATCH] notification non-fatal:', e) }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: action === 'approve' ? 'approved' : 'rejected',
      module: 'exit',
      entity_id: id,
      summary: `Exit process ${newStatus}`,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[exit PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
