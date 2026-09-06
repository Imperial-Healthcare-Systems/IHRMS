import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActiveEmployee } from '@/lib/employee-context'

const FULL_ACCESS_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

function todayIST(): string {
  return nowIST().toISOString().split('T')[0]
}

function toTimeStr(ts: string | null | undefined): string | null {
  if (!ts) return null
  if (/^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5)
  try {
    const utc = new Date(ts)
    const ist = new Date(utc.getTime() + IST_OFFSET_MS)
    return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`
  } catch { return null }
}

function mapRow(r: any) {
  return {
    id:             r.id,
    employee_id:    r.employee_id,
    date:           r.attendance_date,
    punch_in:       toTimeStr(r.check_in),
    punch_out:      toTimeStr(r.check_out),
    hours_worked:   r.total_hours ?? null,
    status:         r.status      ?? 'present',
    is_wfh:         r.status === 'work_from_home',
    is_half_day:    r.status === 'half_day',
    overtime_hours: null,
    regularized:    r.is_regularized ?? false,
    notes:          r.remarks ?? null,
    geo_lat:        r.geo_lat      ?? null,
    geo_lng:        r.geo_lng      ?? null,
    geo_location:   r.geo_location ?? null,
    employee:       Array.isArray(r.employee) ? r.employee[0] ?? null : r.employee ?? null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const date        = searchParams.get('date')
    const date_from   = searchParams.get('date_from')
    const date_to     = searchParams.get('date_to')
    const status      = searchParams.get('status')
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)

    let query = supabaseAdmin
      .from('attendance_daily')
      .select(`
        id, employee_id, attendance_date, check_in, check_out,
        total_hours, status, is_regularized, remarks,
        geo_lat, geo_lng, geo_location,
        employee:employees(id, first_name, last_name, emp_id, department_id)
      `, { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('attendance_date', { ascending: false })
      .limit(limit)

    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    } else if (!FULL_ACCESS_ROLES.includes(ctx.role)) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ data: [], count: 0 })
      query = query.eq('employee_id', me.id)
    }

    if (date)      query = query.eq('attendance_date', date)
    if (date_from) query = query.gte('attendance_date', date_from)
    if (date_to)   query = query.lte('attendance_date', date_to)
    if (status)    query = query.eq('status', status)

    const { data, error: dbErr, count } = await query
    if (dbErr) {
      console.error('[attendance GET]', dbErr)
      throw dbErr
    }

    return NextResponse.json({ data: (data as any[]).map(mapRow), count })
  } catch (err: unknown) {
    console.error('[attendance GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { action, employee_id, is_wfh, notes, geo_lat, geo_lng, geo_location } = body

    // Resolve the caller's employees row; if no employee_id passed, default to it.
    const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
    const targetEmployee = employee_id ?? me?.id ?? null
    if (!targetEmployee) {
      return NextResponse.json({ error: 'You do not have an employee profile in this organisation.' }, { status: 404 })
    }

    // Cross-tenant guard: if targetEmployee differs from caller, verify same org
    if (employee_id && employee_id !== me?.id) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id', employee_id)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    const today  = todayIST()
    const now    = new Date()
    const istNow = nowIST()
    const h      = istNow.getUTCHours()
    const m      = istNow.getUTCMinutes()

    // ── PUNCH IN ──────────────────────────────────────────────
    if (action === 'punch_in') {
      const istDayStart = new Date(`${today}T00:00:00+05:30`).toISOString()
      const istDayEnd   = new Date(`${today}T23:59:59+05:30`).toISOString()

      const { data: alreadyPunched, error: chkErr } = await supabaseAdmin
        .from('attendance_daily')
        .select('id, check_in, check_out')
        .eq('org_id', ctx.orgId)
        .eq('employee_id', targetEmployee)
        .gte('check_in', istDayStart)
        .lte('check_in', istDayEnd)
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (chkErr && chkErr.code !== 'PGRST116') {
        console.error('[punch_in check]', chkErr)
        throw chkErr
      }

      if (alreadyPunched?.check_in) {
        const inIST = toTimeStr(alreadyPunched.check_in)
        const alreadyOut = !!alreadyPunched.check_out
        return NextResponse.json(
          {
            error: alreadyOut
              ? `Already completed attendance today (in: ${inIST}). Please contact HR to regularize.`
              : `Already punched in at ${inIST} IST today.`,
            existing_check_in: inIST,
            already_checked_out: alreadyOut,
          },
          { status: 409 },
        )
      }

      const isLate = h > 9 || (h === 9 && m > 15)
      const status = is_wfh ? 'work_from_home' : isLate ? 'late' : 'present'

      const { data: bareRecord } = await supabaseAdmin
        .from('attendance_daily')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('employee_id', targetEmployee)
        .eq('attendance_date', today)
        .is('check_in', null)
        .maybeSingle()

      let data: any, dbErr: any

      const geoFields = {
        ...(geo_lat  != null ? { geo_lat }      : {}),
        ...(geo_lng  != null ? { geo_lng }      : {}),
        ...(geo_location    ? { geo_location }  : {}),
      }

      if (bareRecord) {
        ;({ data, error: dbErr } = await supabaseAdmin
          .from('attendance_daily')
          .update({ check_in: now.toISOString(), status, remarks: notes ?? null, ...geoFields })
          .eq('id', bareRecord.id)
          .eq('org_id', ctx.orgId)
          .select()
          .single())
      } else {
        ;({ data, error: dbErr } = await supabaseAdmin
          .from('attendance_daily')
          .insert({
            org_id:          ctx.orgId,
            employee_id:     targetEmployee,
            attendance_date: today,
            check_in:        now.toISOString(),
            status,
            remarks:         notes ?? null,
            ...geoFields,
          })
          .select()
          .single())
      }

      if (dbErr) {
        console.error('[punch_in save]', dbErr)
        // Status CHECK constraint failure → fall back to 'present' tagged with [WFH] in remarks
        if (dbErr.code === '23514' && is_wfh) {
          console.warn('[punch_in] status constraint rejected work_from_home; retrying as present with [WFH] tag')
          const fallbackPayload = bareRecord
            ? { check_in: now.toISOString(), status: 'present', remarks: notes ? `[WFH] ${notes}` : '[WFH]', ...geoFields }
            : { org_id: ctx.orgId, employee_id: targetEmployee, attendance_date: today, check_in: now.toISOString(), status: 'present', remarks: notes ? `[WFH] ${notes}` : '[WFH]', ...geoFields }

          const retryQ = bareRecord
            ? supabaseAdmin.from('attendance_daily').update(fallbackPayload).eq('id', bareRecord.id).eq('org_id', ctx.orgId).select().single()
            : supabaseAdmin.from('attendance_daily').insert(fallbackPayload).select().single()
          const retry = await retryQ
          if (retry.error) {
            console.error('[punch_in fallback save]', retry.error)
            return NextResponse.json({ error: retry.error.message, code: retry.error.code, details: retry.error.details }, { status: 500 })
          }
          return NextResponse.json({ data: mapRow({ ...retry.data, status: 'work_from_home' }), message: 'Punched in (WFH)' }, { status: bareRecord ? 200 : 201 })
        }
        return NextResponse.json({ error: dbErr.message, code: dbErr.code, details: dbErr.details, hint: dbErr.hint }, { status: 500 })
      }

      return NextResponse.json(
        { data: mapRow(data), message: 'Punched in successfully' },
        { status: bareRecord ? 200 : 201 },
      )
    }

    // ── PUNCH OUT ─────────────────────────────────────────────
    if (action === 'punch_out') {
      const { data: log, error: logErr } = await supabaseAdmin
        .from('attendance_daily')
        .select('id, check_in, status')
        .eq('org_id', ctx.orgId)
        .eq('employee_id', targetEmployee)
        .eq('attendance_date', today)
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

      const { data, error: dbErr } = await supabaseAdmin
        .from('attendance_daily')
        .update({
          check_out:   now.toISOString(),
          total_hours: totalHours,
          status:      finalStatus,
          remarks:     notes ?? null,
        })
        .eq('id', log.id)
        .eq('org_id', ctx.orgId)
        .select()
        .single()

      if (dbErr) { console.error('[punch_out save]', dbErr); throw dbErr }

      return NextResponse.json({ data: mapRow(data), message: 'Punched out successfully' })
    }

    return NextResponse.json({ error: 'Invalid action. Use punch_in or punch_out' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[attendance POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
