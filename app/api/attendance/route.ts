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

// Extract HH:MM from a TIMESTAMPTZ string (or return as-is if already HH:MM)
function toTimeStr(ts: string | null | undefined): string | null {
  if (!ts) return null
  if (/^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5)
  try {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return null }
}

// Safely map a DB row → AttendanceLog shape for the frontend
function mapRow(r: any) {
  return {
    id:             r.id,
    employee_id:    r.employee_id,
    date:           r.date,
    punch_in:       toTimeStr(r.check_in),
    punch_out:      toTimeStr(r.check_out),
    hours_worked:   r.total_hours ?? null,
    status:         r.status      ?? 'present',
    is_wfh:         r.status === 'work_from_home',
    is_half_day:    r.status === 'half_day',
    overtime_hours: null,
    regularized:    r.is_regularized ?? false,
    notes:          r.remarks ?? null,
    employee:       Array.isArray(r.employee) ? r.employee[0] ?? null : r.employee ?? null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const date        = searchParams.get('date')
    const date_from   = searchParams.get('date_from')
    const date_to     = searchParams.get('date_to')
    const status      = searchParams.get('status')
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)

    const userRole = (session.user as any)?.role
    const userId   = (session.user as any)?.id

    let query = supabaseAdmin
      .from('attendance_daily')
      .select(`
        id, employee_id, date, check_in, check_out,
        total_hours, status, is_regularized, remarks,
        employee:employees(id, first_name, last_name, emp_id, department_id)
      `, { count: 'exact' })
      .order('date', { ascending: false })
      .limit(limit)

    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    } else if (!['hr_admin', 'super_admin', 'operations_head'].includes(userRole)) {
      query = query.eq('employee_id', userId)
    }

    if (date)      query = query.eq('date', date)
    if (date_from) query = query.gte('date', date_from)
    if (date_to)   query = query.lte('date', date_to)
    if (status)    query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) {
      console.error('[attendance GET]', error)
      throw error
    }

    return NextResponse.json({ data: (data as any[]).map(mapRow), count })
  } catch (err: unknown) {
    console.error('[attendance GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, employee_id, is_wfh, notes } = body

    const targetEmployee = employee_id ?? (session.user as any)?.id
    if (!targetEmployee) return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })

    const today  = new Date().toISOString().split('T')[0]
    const now    = new Date()
    const h      = now.getHours()
    const m      = now.getMinutes()

    // ── PUNCH IN ──────────────────────────────────────────────
    if (action === 'punch_in') {
      const { data: existing, error: chkErr } = await supabaseAdmin
        .from('attendance_daily')
        .select('id, check_in')
        .eq('employee_id', targetEmployee)
        .eq('date', today)
        .maybeSingle()

      if (chkErr) { console.error('[punch_in check]', chkErr); throw chkErr }

      if (existing?.check_in) {
        return NextResponse.json({ error: 'Already punched in today' }, { status: 409 })
      }

      const isLate = h > 9 || (h === 9 && m > 15)
      const status = is_wfh ? 'work_from_home' : isLate ? 'late' : 'present'

      let data: any, error: any

      if (existing) {
        ;({ data, error } = await supabaseAdmin
          .from('attendance_daily')
          .update({ check_in: now.toISOString(), status, remarks: notes ?? null })
          .eq('id', existing.id)
          .select()
          .single())
      } else {
        ;({ data, error } = await supabaseAdmin
          .from('attendance_daily')
          .insert({
            employee_id: targetEmployee,
            date:        today,
            check_in:    now.toISOString(),
            status,
            remarks:     notes ?? null,
          })
          .select()
          .single())
      }

      if (error) { console.error('[punch_in save]', error); throw error }

      return NextResponse.json(
        { data: mapRow(data), message: 'Punched in successfully' },
        { status: existing ? 200 : 201 },
      )
    }

    // ── PUNCH OUT ─────────────────────────────────────────────
    if (action === 'punch_out') {
      const { data: log, error: logErr } = await supabaseAdmin
        .from('attendance_daily')
        .select('id, check_in, status')
        .eq('employee_id', targetEmployee)
        .eq('date', today)
        .maybeSingle()

      if (logErr) { console.error('[punch_out fetch]', logErr); throw logErr }

      if (!log?.check_in) {
        return NextResponse.json({ error: 'No punch-in found for today' }, { status: 400 })
      }

      const inTime     = new Date(log.check_in)
      const totalMins  = (now.getTime() - inTime.getTime()) / 60000
      const totalHours = parseFloat((totalMins / 60).toFixed(2))
      const isHalfDay  = totalHours < 4
      const finalStatus = isHalfDay ? 'half_day' : (log.status ?? 'present')

      const { data, error } = await supabaseAdmin
        .from('attendance_daily')
        .update({
          check_out:   now.toISOString(),
          total_hours: totalHours,
          status:      finalStatus,
          remarks:     notes ?? null,
        })
        .eq('id', log.id)
        .select()
        .single()

      if (error) { console.error('[punch_out save]', error); throw error }

      return NextResponse.json({ data: mapRow(data), message: 'Punched out successfully' })
    }

    return NextResponse.json({ error: 'Invalid action. Use punch_in or punch_out' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[attendance POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
