import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sql from '@/lib/pg'

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
    const month = searchParams.get('month') // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
    }

    const [year, mon] = month.split('-').map(Number)
    const dateFrom = `${month}-01`
    const daysInMonth = new Date(year, mon, 0).getDate()
    const dateTo = `${month}-${String(daysInMonth).padStart(2, '0')}`

    // Working days (Mon–Fri) in the month
    let workingDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, mon - 1, d).getDay()
      if (day !== 0 && day !== 6) workingDays++
    }

    // Per-employee aggregated summary
    const summaryRows = await sql`
      SELECT
        e.id,
        COALESCE(e.emp_id, e.employee_code, e.id::text) AS emp_id,
        e.first_name || ' ' || e.last_name AS full_name,
        COALESCE(d.name, '—') AS department,
        COUNT(*) FILTER (WHERE a.status IN ('present','late','work_from_home','half_day')) AS present,
        COUNT(*) FILTER (WHERE a.status = 'absent') AS absent,
        COUNT(*) FILTER (WHERE a.status = 'work_from_home') AS wfh,
        COUNT(*) FILTER (WHERE a.status = 'late') AS late,
        ROUND(
          COALESCE(SUM(GREATEST(a.total_hours - 9, 0)) FILTER (WHERE a.total_hours IS NOT NULL AND a.total_hours > 9), 0)::numeric, 1
        ) AS ot_hours
      FROM attendance_daily a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE a.date BETWEEN ${dateFrom}::date AND ${dateTo}::date
      GROUP BY e.id, e.first_name, e.last_name, e.emp_id, e.employee_code, d.name
      ORDER BY e.first_name, e.last_name
    `

    // Daily company-wide attendance percentage
    const dailyRows = await sql`
      SELECT
        a.date::text AS date_str,
        COUNT(*) FILTER (WHERE a.status IN ('present','late','work_from_home','half_day')) AS present_count,
        COUNT(*) AS total_count
      FROM attendance_daily a
      WHERE a.date BETWEEN ${dateFrom}::date AND ${dateTo}::date
      GROUP BY a.date
      ORDER BY a.date
    `

    const dailyMap = new Map(dailyRows.map(r => [r.date_str as string, r]))

    const dailyPct = Array.from({ length: daysInMonth }, (_, i) => {
      const day = new Date(year, mon - 1, i + 1).getDay()
      if (day === 0 || day === 6) return 0 // weekend
      const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
      const row = dailyMap.get(dateStr)
      if (!row || Number(row.total_count) === 0) return 0
      return Math.round((Number(row.present_count) / Number(row.total_count)) * 100)
    })

    const employees = summaryRows.map(r => ({
      empId:         String(r.emp_id ?? ''),
      name:          String(r.full_name),
      department:    String(r.department),
      workingDays,
      present:       Number(r.present),
      absent:        Number(r.absent),
      lop:           Number(r.absent),
      wfh:           Number(r.wfh),
      late:          Number(r.late),
      otHours:       Number(r.ot_hours),
      attendancePct: workingDays > 0 ? Math.round((Number(r.present) / workingDays) * 100) : 0,
    }))

    return NextResponse.json({ employees, dailyPct, workingDays, month })
  } catch (err: unknown) {
    console.error('[attendance summary GET]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
