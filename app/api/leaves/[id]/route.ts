import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendLeaveStatusEmail } from '@/lib/mailer'
import { getActiveEmployee } from '@/lib/employee-context'

const FULL_ACCESS_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'operations_head']

async function sendLeaveNotification(
  orgId: string,
  employeeId: string,
  action: 'approve' | 'reject',
  leaveType: string,
  fromDate: string,
  toDate: string,
  totalDays: number,
  remarks?: string,
) {
  const isApproved = action === 'approve'
  const dateLabel = fromDate
    ? new Date(fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : fromDate

  try {
    await supabaseAdmin.from('notifications').insert({
      org_id: orgId,
      recipient_id: employeeId,
      title: isApproved ? 'Leave Request Approved ✓' : 'Leave Request Rejected',
      body: isApproved
        ? `Your ${leaveType} leave request starting ${dateLabel} has been approved.`
        : `Your ${leaveType} leave request starting ${dateLabel} was not approved.${remarks ? ' Reason: ' + remarks : ''}`,
      type: isApproved ? 'success' : 'warning',
    })
  } catch (e) { console.warn('[leaves notify] in-app non-fatal:', e) }

  try {
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('first_name, last_name, work_email')
      .eq('id', employeeId)
      .eq('org_id', orgId)
      .single()
    if (emp?.work_email) {
      await sendLeaveStatusEmail({
        to: emp.work_email,
        empName: `${emp.first_name} ${emp.last_name}`,
        leaveType,
        fromDate,
        toDate,
        totalDays,
        status: action === 'approve' ? 'approved' : 'rejected',
        remarks,
        orgId,
      })
    }
  } catch (e) { console.warn('[leaves notify] email non-fatal:', e) }
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, emp_id, department_id)
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      console.error('[leaves GET id]', dbErr)
      throw dbErr
    }
    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[leaves GET id catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { action, remarks } = body as { action?: 'approve' | 'reject' | 'cancel'; remarks?: string }
    const now = new Date().toISOString()

    // Verify the leave request exists in this org
    const { data: leaveRow, error: fetchErr } = await supabaseAdmin
      .from('leave_requests')
      .select('id, employee_id')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()
    if (fetchErr || !leaveRow) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

    // For approve/reject: caller must be HR/admin OR the employee's reporting manager
    if (action === 'approve' || action === 'reject') {
      if (!FULL_ACCESS_ROLES.includes(ctx.role)) {
        const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
        if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('reporting_manager_id')
          .eq('id', (leaveRow as any).employee_id)
          .eq('org_id', ctx.orgId)
          .single()
        if (!emp || (emp as any).reporting_manager_id !== me.id) {
          return NextResponse.json({ error: 'Forbidden: you are not the reporting manager for this employee' }, { status: 403 })
        }
      }
    }

    if (action === 'cancel') {
      const { data, error: dbErr } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .select()
        .single()
      if (dbErr) { console.error('[leaves PATCH cancel]', dbErr); throw dbErr }
      return NextResponse.json({ data })
    }

    if (action === 'approve') {
      const { data, error: dbErr } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'approved', approved_by: ctx.identityId, updated_at: now, approver_remarks: remarks ?? null })
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .select()
        .single()
      if (dbErr) { console.error('[leaves PATCH approve]', dbErr); throw dbErr }
      const row = data as Record<string, unknown>

      // Decrement leave_balances (best-effort)
      try {
        const fromDate  = String(row.from_date ?? '')
        const toDate    = String(row.to_date   ?? '')
        const msPerDay  = 86400000
        const totalDays = Number(row.total_days ?? 0) > 0
          ? Number(row.total_days)
          : fromDate && toDate
            ? Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / msPerDay) + 1
            : 0

        const year = fromDate ? new Date(fromDate).getFullYear() : new Date().getFullYear()

        if (totalDays > 0) {
          const { data: bal, error: balFetchErr } = await supabaseAdmin
            .from('leave_balances')
            .select('id, used_days, remaining_days, total_days')
            .eq('org_id', ctx.orgId)
            .eq('employee_id', String(row.employee_id))
            .eq('leave_type', String(row.leave_type))
            .eq('year', year)
            .maybeSingle()

          if (balFetchErr) {
            console.warn('[leaves approve] balance fetch error:', balFetchErr)
          } else if (bal) {
            const newUsed      = Number(bal.used_days ?? 0) + totalDays
            const newRemaining = Math.max(0, Number(bal.remaining_days ?? bal.total_days ?? 0) - totalDays)
            const { error: balUpdateErr } = await supabaseAdmin
              .from('leave_balances')
              .update({ used_days: newUsed, remaining_days: newRemaining })
              .eq('id', bal.id)
            if (balUpdateErr) console.error('[leaves approve] balance UPDATE FAILED — user can re-request same days:', balUpdateErr.message, { org_id: ctx.orgId, leave_id: id })
          }
        }
      } catch (balErr) {
        console.error('[leaves approve] balance update FAILED — user can re-request same days:', balErr instanceof Error ? balErr.message : balErr, { org_id: ctx.orgId, leave_id: id })
      }

      await sendLeaveNotification(
        ctx.orgId,
        String(row.employee_id),
        'approve',
        String(row.leave_type ?? ''),
        String(row.from_date ?? ''),
        String(row.to_date ?? ''),
        Number(row.total_days ?? 0),
        remarks,
      )
      return NextResponse.json({ data })
    }

    if (action === 'reject') {
      const { data, error: dbErr } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'rejected', approved_by: ctx.identityId, updated_at: now, approver_remarks: remarks ?? null })
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .select()
        .single()
      if (dbErr) { console.error('[leaves PATCH reject]', dbErr); throw dbErr }
      const row = data as Record<string, unknown>
      await sendLeaveNotification(
        ctx.orgId,
        String(row.employee_id),
        'reject',
        String(row.leave_type ?? ''),
        String(row.from_date ?? ''),
        String(row.to_date ?? ''),
        Number(row.total_days ?? 0),
        remarks,
      )
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action. Use cancel, approve, or reject' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[leaves PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
