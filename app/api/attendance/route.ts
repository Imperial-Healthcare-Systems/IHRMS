import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const date = searchParams.get('date')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') ?? '100')

    let query = supabaseAdmin
      .from('attendance_logs')
      .select(`
        *,
        employee:employees(id, first_name, last_name, emp_id,
          department:departments(name))
      `, { count: 'exact' })
      .order('date', { ascending: false })
      .limit(limit)

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (date) query = query.eq('date', date)
    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)
    if (status) query = query.eq('status', status)

    // Restrict non-admins to their own data
    const userRole = (session.user as any)?.role
    const userId = (session.user as any)?.id
    if (!['hr_admin', 'super_admin', 'operations_head'].includes(userRole) && !employee_id) {
      query = query.eq('employee_id', userId)
    }

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, employee_id, punch_method, ip_address, geo_lat, geo_lng, geo_location, is_wfh, notes } = body

    const targetEmployee = employee_id ?? (session.user as any)?.id
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (action === 'punch_in') {
      // Check if already punched in
      const { data: existing } = await supabaseAdmin
        .from('attendance_logs')
        .select('id, punch_in')
        .eq('employee_id', targetEmployee)
        .eq('date', today)
        .single()

      if (existing?.punch_in) {
        return NextResponse.json({ error: 'Already punched in today' }, { status: 409 })
      }

      const [h, m] = timeStr.split(':').map(Number)
      const isLate = h > 9 || (h === 9 && m > 15) // grace till 9:15

      const payload: Record<string, unknown> = {
        employee_id: targetEmployee, date: today, punch_in: timeStr,
        status: isLate ? 'late' : 'present',
        is_wfh: is_wfh ?? false, is_half_day: false, regularized: false,
        punch_method, ip_address, geo_lat, geo_lng, geo_location, notes,
      }

      if (existing) {
        // Update existing record
        const { data, error } = await supabaseAdmin
          .from('attendance_logs').update(payload).eq('id', existing.id).select().single()
        if (error) throw error
        return NextResponse.json({ data, message: 'Punched in successfully' })
      }

      const { data, error } = await supabaseAdmin
        .from('attendance_logs').insert(payload).select().single()
      if (error) throw error
      return NextResponse.json({ data, message: 'Punched in successfully' }, { status: 201 })
    }

    if (action === 'punch_out') {
      const { data: log, error: logErr } = await supabaseAdmin
        .from('attendance_logs')
        .select('id, punch_in, status')
        .eq('employee_id', targetEmployee)
        .eq('date', today)
        .single()

      if (logErr || !log?.punch_in) {
        return NextResponse.json({ error: 'No punch-in found for today' }, { status: 400 })
      }

      // Calculate hours worked
      const [ih, im] = log.punch_in.split(':').map(Number)
      const [oh, om] = timeStr.split(':').map(Number)
      const hours_worked = parseFloat(((oh * 60 + om - (ih * 60 + im)) / 60).toFixed(2))

      // Check half day (less than 4 hours)
      const is_half_day = hours_worked < 4
      const overtime_hours = hours_worked > 9 ? parseFloat((hours_worked - 9).toFixed(2)) : 0

      const { data, error } = await supabaseAdmin
        .from('attendance_logs')
        .update({ punch_out: timeStr, hours_worked, is_half_day, overtime_hours, punch_method, ip_address, notes })
        .eq('id', log.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data, message: 'Punched out successfully' })
    }

    return NextResponse.json({ error: 'Invalid action. Use punch_in or punch_out' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
