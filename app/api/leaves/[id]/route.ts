import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeaveStatusEmail } from '@/lib/mailer'

async function sendLeaveNotification(
  employeeId: string,
  action: 'approve' | 'reject',
  leaveType: string,
  fromDate: string,
  toDate: string,
  totalDays: number,
  remarks?: string,
) {
  const isApproved = action === 'approve'
  const dateLabel = fromDate ? new Date(fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : fromDate

  // In-app notification
  try {
    await supabaseAdmin.from('notifications').insert({
      recipient_id: employeeId,
      title: isApproved ? 'Leave Request Approved ✓' : 'Leave Request Rejected',
      body: isApproved
        ? `Your ${leaveType} leave request starting ${dateLabel} has been approved.`
        : `Your ${leaveType} leave request starting ${dateLabel} was not approved.${remarks ? ' Reason: ' + remarks : ''}`,
      type: isApproved ? 'success' : 'warning',
    })
  } catch (e) { console.warn('[leaves notify] in-app non-fatal:', e) }

  // Email notification
  try {
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('first_name, last_name, work_email')
      .eq('id', employeeId)
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, emp_id, department_id)
      `)
      .eq('id', id)
      .single()

    if (error) { console.error('[leaves GET id]', error); throw error }
    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[leaves GET id catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, remarks } = body // action: 'approve' | 'reject' | 'cancel'
    const approverId = (session.user as any)?.id
    const userRole   = (session.user as any)?.role
    const now = new Date().toISOString()

    const FULL_ACCESS_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr', 'operations_head']

    // For approve/reject: verify caller is HR/admin or the employee's reporting manager
    if (action === 'approve' || action === 'reject') {
      if (!FULL_ACCESS_ROLES.includes(userRole)) {
        const { data: leaveRow } = await supabaseAdmin
          .from('leave_requests')
          .select('employee_id')
          .eq('id', id)
          .single()
        if (!leaveRow) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('reporting_manager_id')
          .eq('id', (leaveRow as any).employee_id)
          .single()
        if (!emp || (emp as any).reporting_manager_id !== approverId) {
          return NextResponse.json({ error: 'Forbidden: you are not the reporting manager for this employee' }, { status: 403 })
        }
      }
    }

    if (action === 'cancel') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', id)
        .select()
        .single()
      if (error) { console.error('[leaves PATCH cancel]', error); throw error }
      return NextResponse.json({ data })
    }

    if (action === 'approve') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'approved', approved_by: approverId, updated_at: now, approver_remarks: remarks ?? null })
        .eq('id', id)
        .select()
        .single()
      if (error) { console.error('[leaves PATCH approve]', error); throw error }
      const row = data as Record<string, unknown>

      // Decrement leave_balances
      try {
        const fromDate  = String(row.from_date ?? '')
        const toDate    = String(row.to_date   ?? '')
        const msPerDay  = 86400000
        // Prefer stored total_days; fall back to calculating from dates
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
            if (balUpdateErr) console.warn('[leaves approve] balance update error:', balUpdateErr)
            else console.log(`[leaves approve] balance updated: employee=${row.employee_id} type=${row.leave_type} used=${newUsed} remaining=${newRemaining}`)
          } else {
            console.warn(`[leaves approve] no leave_balances row found for employee=${row.employee_id} type=${row.leave_type} year=${year}`)
          }
        }
      } catch (balErr) {
        console.warn('[leaves approve] balance update non-fatal:', balErr)
      }

      await sendLeaveNotification(String(row.employee_id), 'approve', String(row.leave_type ?? ''), String(row.from_date ?? ''), String(row.to_date ?? ''), Number(row.total_days ?? 0), remarks)
      return NextResponse.json({ data })
    }

    if (action === 'reject') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'rejected', approved_by: approverId, updated_at: now, approver_remarks: remarks ?? null })
        .eq('id', id)
        .select()
        .single()
      if (error) { console.error('[leaves PATCH reject]', error); throw error }
      const row = data as Record<string, unknown>
      await sendLeaveNotification(String(row.employee_id), 'reject', String(row.leave_type ?? ''), String(row.from_date ?? ''), String(row.to_date ?? ''), Number(row.total_days ?? 0), remarks)
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action. Use cancel, approve, or reject' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[leaves PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
