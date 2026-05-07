import { supabaseAdmin } from '@/lib/supabase-admin'

// IST = UTC + 05:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

function todayIST(): string {
  return nowIST().toISOString().split('T')[0]
}

function timeStrIST(): string {
  const ist = nowIST()
  return `${ist.getUTCHours().toString().padStart(2, '0')}:${ist.getUTCMinutes().toString().padStart(2, '0')}`
}

export async function getAttendanceLogs(filters: {
  employee_id?: string
  date?: string
  date_from?: string
  date_to?: string
  status?: string
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('attendance_logs')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id, department_id,
        department:departments(name))
    `, { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.date) query = query.eq('date', filters.date)
  if (filters.date_from) query = query.gte('date', filters.date_from)
  if (filters.date_to) query = query.lte('date', filters.date_to)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 50)) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getTodayAttendance() {
  const today = todayIST()
  return getAttendanceLogs({ date: today, limit: 500 })
}

export async function punchIn(employee_id: string, payload: {
  punch_method?: string
  ip_address?: string
  geo_lat?: number
  geo_lng?: number
  geo_location?: string
  notes?: string
  is_wfh?: boolean
}) {
  const today    = todayIST()
  const punch_in = timeStrIST()

  // Check if already punched in today
  const { data: existing } = await supabaseAdmin
    .from('attendance_logs')
    .select('id')
    .eq('employee_id', employee_id)
    .eq('date', today)
    .single()

  if (existing) {
    throw new Error('Already punched in for today')
  }

  // Determine late status (9:15 AM IST grace)
  const [h, m] = punch_in.split(':').map(Number)
  const isLate = h > 9 || (h === 9 && m > 15)

  const { data, error } = await supabaseAdmin
    .from('attendance_logs')
    .insert({
      employee_id,
      date: today,
      punch_in,
      status: isLate ? 'late' : 'present',
      regularized: false,
      is_wfh: payload.is_wfh ?? false,
      is_half_day: false,
      ...payload,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function punchOut(employee_id: string, payload: {
  punch_method?: string
  ip_address?: string
  notes?: string
}) {
  const today     = todayIST()
  const punch_out = timeStrIST()

  const { data: log } = await supabaseAdmin
    .from('attendance_logs')
    .select('id, punch_in')
    .eq('employee_id', employee_id)
    .eq('date', today)
    .single()

  if (!log) throw new Error('No punch-in found for today')

  // Calculate hours worked
  let hours_worked: number | null = null
  if (log.punch_in) {
    const [ih, im] = log.punch_in.split(':').map(Number)
    const [oh, om] = punch_out.split(':').map(Number)
    hours_worked = parseFloat(((oh * 60 + om - (ih * 60 + im)) / 60).toFixed(2))
  }

  const { data, error } = await supabaseAdmin
    .from('attendance_logs')
    .update({ punch_out, hours_worked, ...payload })
    .eq('id', log.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRegularizationRequests(filters: {
  employee_id?: string
  status?: string
  limit?: number
} = {}) {
  let query = supabaseAdmin
    .from('attendance_regularizations')
    .select(`
      *,
      employee:employees(id, first_name, last_name, emp_id)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function createRegularizationRequest(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('attendance_regularizations')
    .insert({ ...payload, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRegularizationStatus(
  id: string,
  status: 'approved' | 'rejected',
  approved_by: string,
  rejection_reason?: string
) {
  const { data, error } = await supabaseAdmin
    .from('attendance_regularizations')
    .update({
      status,
      approved_by,
      approved_at: new Date().toISOString(),
      rejection_reason: rejection_reason ?? null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMonthlyAttendanceSummary(year: number, month: number) {
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const dateToDate = new Date(year, month, 0)
  const dateTo = dateToDate.toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('attendance_logs')
    .select('employee_id, status, hours_worked, is_wfh, overtime_hours')
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error) throw error

  // Group by employee
  const summary: Record<string, {
    present: number; absent: number; late: number; wfh: number;
    half_day: number; on_leave: number; total_hours: number; overtime: number
  }> = {}

  for (const log of (data ?? [])) {
    if (!summary[log.employee_id]) {
      summary[log.employee_id] = { present: 0, absent: 0, late: 0, wfh: 0, half_day: 0, on_leave: 0, total_hours: 0, overtime: 0 }
    }
    const s = summary[log.employee_id]
    if (log.status === 'present') s.present++
    if (log.status === 'absent') s.absent++
    if (log.status === 'late') { s.late++; s.present++ }
    if (log.status === 'half_day') s.half_day++
    if (log.status === 'on_leave') s.on_leave++
    if (log.is_wfh) s.wfh++
    s.total_hours += log.hours_worked ?? 0
    s.overtime += log.overtime_hours ?? 0
  }

  return summary
}
