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

    let query = supabaseAdmin
      .from('attendance_regularizations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (status)      query = query.eq('status', status)
    if (!['hr_admin', 'super_admin', 'operations_head'].includes(userRole) && !employee_id) {
      query = query.eq('employee_id', userId)
    }

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

    const approverId = (session.user as any)?.id

    const { data, error } = await supabaseAdmin
      .from('attendance_regularizations')
      .update({
        status,
        approved_by:       approverId,
        approved_at:       new Date().toISOString(),
        rejection_reason:  rejection_reason ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) { console.error('[regularization PATCH]', error); throw error }

    // If approved, update the actual attendance record
    if (status === 'approved') {
      const reg = data as any
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

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[regularization PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
