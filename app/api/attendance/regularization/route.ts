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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')
    const userRole    = (session.user as any)?.role
    const userId      = (session.user as any)?.id

    // Only true HR roles can review all employees' requests
    const FULL_ACCESS_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']

    let query = supabaseAdmin
      .from('attendance_regularizations')
      .select('*, employee:employees!attendance_regularizations_employee_id_fkey(id, first_name, last_name, emp_id, employee_code)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (employee_id && FULL_ACCESS_ROLES.includes(userRole)) {
      // HR filtering by specific employee
      query = query.eq('employee_id', employee_id)
    } else if (!FULL_ACCESS_ROLES.includes(userRole)) {
      // Non-HR roles see only their own requests
      query = query.eq('employee_id', userId)
    }
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) { console.error('[regularization GET]', error); throw error }
    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    console.error('[regularization GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { date, reason, requested_punch_in, requested_punch_out, employee_id } = body

    if (!date)   return NextResponse.json({ error: 'date is required' },   { status: 400 })
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

    const targetEmployee = employee_id ?? (session.user as any)?.id

    // requested_in / requested_out are NOT NULL in the schema — use midnight as fallback
    const requestedIn  = requested_punch_in  || '09:00'
    const requestedOut = requested_punch_out || '18:00'

    const payload: Record<string, unknown> = {
      employee_id: targetEmployee,
      date,
      reason,
    }
    // Only include optional columns if they have values
    if (requestedIn  && requestedIn  !== '09:00') payload.requested_punch_in  = requestedIn
    if (requestedOut && requestedOut !== '18:00') payload.requested_punch_out = requestedOut

    console.log('[regularization POST] payload:', payload)

    const { data, error } = await supabaseAdmin
      .from('attendance_regularizations')
      .insert(payload)
      .select()
      .single()

    if (error) { console.error('[regularization POST]', error); throw error }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[regularization POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, status, rejection_reason } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })

    // Build update payload — only include columns that exist in the schema
    const updatePayload: Record<string, unknown> = { status }
    if (rejection_reason != null) updatePayload.rejection_reason = rejection_reason

    const { data, error } = await supabaseAdmin
      .from('attendance_regularizations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) { console.error('[regularization PATCH]', error); throw error }

    const reg = data as any

    // If approved, update the actual attendance record
    if (status === 'approved') {
      await supabaseAdmin
        .from('attendance_daily')
        .update({
          ...(reg.requested_punch_in  ? { check_in:  reg.requested_punch_in  } : {}),
          ...(reg.requested_punch_out ? { check_out: reg.requested_punch_out } : {}),
          is_regularized: true,
        })
        .eq('employee_id', reg.employee_id)
        .eq('date', reg.date)
    }

    // Send in-app notification to the employee (Supabase REST — no cold TCP)
    if (reg.employee_id) {
      try {
        const dateLabel = reg.date
          ? new Date(reg.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'your requested date'
        const isApproved = status === 'approved'
        await supabaseAdmin.from('notifications').insert({
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
