import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const FULL_ACCESS_ROLES  = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']
const MANAGER_ROLES      = ['manager', 'operations_head']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

/** Returns true if today is past the 15th of the month after `dateStr`. */
function isPastDeadline(dateStr: string): boolean {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const deadlineMonth = d.getMonth() + 1
  const deadlineYear  = deadlineMonth === 12 ? d.getFullYear() + 1 : d.getFullYear()
  const normalizedMonth = deadlineMonth % 12
  const deadline = new Date(deadlineYear, normalizedMonth, 15, 23, 59, 59, 999)
  return new Date() > deadline
}

function deadlineLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const deadlineMonth = d.getMonth() + 1
  const deadlineYear  = deadlineMonth === 12 ? d.getFullYear() + 1 : d.getFullYear()
  const deadline = new Date(deadlineYear, deadlineMonth % 12, 15)
  return deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')

    let query = supabaseAdmin
      .from('attendance_regularizations')
      .select('*, employee:employees!attendance_regularizations_employee_id_fkey(id, first_name, last_name, emp_id, employee_code)', { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })

    if (FULL_ACCESS_ROLES.includes(ctx.role)) {
      if (employee_id) query = query.eq('employee_id', employee_id)
    } else if (MANAGER_ROLES.includes(ctx.role)) {
      const { data: team } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('reporting_manager_id', ctx.identityId)
        .eq('status', 'active')
      const teamIds = (team ?? []).map((e: any) => e.id as string)
      if (teamIds.length === 0) return NextResponse.json({ data: [], count: 0 })
      query = query.in('employee_id', teamIds)
      if (employee_id && teamIds.includes(employee_id)) query = query.eq('employee_id', employee_id)
    } else {
      query = query.eq('employee_id', ctx.identityId)
    }

    if (status) query = query.eq('status', status)

    const { data, error: dbErr, count } = await query
    if (dbErr) { console.error('[regularization GET]', dbErr); throw dbErr }
    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    console.error('[regularization GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { date, reason, requested_punch_in, requested_punch_out, employee_id } = body

    if (!date)   return NextResponse.json({ error: 'date is required' },   { status: 400 })
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

    if (isPastDeadline(date)) {
      return NextResponse.json(
        { error: `Regularization deadline has passed. Requests for ${date} must be submitted by the 15th of the following month (${deadlineLabel(date)}).` },
        { status: 400 }
      )
    }

    const targetEmployee = employee_id ?? ctx.identityId

    // Cross-tenant guard
    if (employee_id && employee_id !== ctx.identityId) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    const requestedIn  = requested_punch_in  || '09:00'
    const requestedOut = requested_punch_out || '18:00'

    const payload: Record<string, unknown> = {
      org_id: ctx.orgId,
      employee_id: targetEmployee,
      date,
      reason,
    }
    if (requestedIn  && requestedIn  !== '09:00') payload.requested_punch_in  = requestedIn
    if (requestedOut && requestedOut !== '18:00') payload.requested_punch_out = requestedOut

    const { data, error: dbErr } = await supabaseAdmin
      .from('attendance_regularizations')
      .insert(payload)
      .select()
      .single()

    if (dbErr) { console.error('[regularization POST]', dbErr); throw dbErr }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[regularization POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { id, status, rejection_reason } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })

    // Fetch and verify org boundary
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('attendance_regularizations')
      .select('id, employee_id')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()
    if (fetchErr || !existing) return NextResponse.json({ error: 'Regularization request not found' }, { status: 404 })

    // Authorization: HR/admin OR direct reporting manager
    if (!FULL_ACCESS_ROLES.includes(ctx.role)) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('reporting_manager_id')
        .eq('id', (existing as any).employee_id)
        .eq('org_id', ctx.orgId)
        .single()
      if (!emp || (emp as any).reporting_manager_id !== ctx.identityId) {
        return NextResponse.json({ error: 'Forbidden: you are not the reporting manager for this employee' }, { status: 403 })
      }
    }

    const updatePayload: Record<string, unknown> = { status }
    if (rejection_reason != null) updatePayload.rejection_reason = rejection_reason

    const { data, error: dbErr } = await supabaseAdmin
      .from('attendance_regularizations')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (dbErr) { console.error('[regularization PATCH]', dbErr); throw dbErr }

    const reg = data as any

    if (status === 'approved') {
      await supabaseAdmin
        .from('attendance_daily')
        .update({
          ...(reg.requested_punch_in  ? { check_in:  reg.requested_punch_in  } : {}),
          ...(reg.requested_punch_out ? { check_out: reg.requested_punch_out } : {}),
          is_regularized: true,
        })
        .eq('org_id', ctx.orgId)
        .eq('employee_id', reg.employee_id)
        .eq('date', reg.date)
    }

    if (reg.employee_id) {
      try {
        const dateLabel = reg.date
          ? new Date(reg.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'your requested date'
        const isApproved = status === 'approved'
        await supabaseAdmin.from('notifications').insert({
          org_id: ctx.orgId,
          recipient_id: reg.employee_id,
          title: isApproved ? 'Attendance Regularization Approved ✓' : 'Attendance Regularization Rejected',
          body: isApproved
            ? `Your regularization request for ${dateLabel} has been approved and your attendance record has been updated.`
            : `Your regularization request for ${dateLabel} was not approved.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`,
          type: isApproved ? 'success' : 'warning',
        })
      } catch (notifErr) {
        console.warn('[regularization PATCH] notification insert non-fatal:', notifErr)
      }
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[regularization PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
