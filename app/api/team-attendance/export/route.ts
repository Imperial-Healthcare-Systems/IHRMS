/**
 * GET /api/team-attendance/export?year=YYYY&month=MM[&manager_id=UUID][&exceptions_only=1]
 *
 * Server-streamed CSV of the manager grid for the requested month.
 * Matches what's on screen for the same filter state — same scope, same
 * filter rules, same columns. Reuses the data-loading path of the JSON
 * route by calling it internally so there's no risk of divergence.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { filterExceptionsOnly, lookupStatus } from '@/lib/attendance'
import type { LeaveType, StatusCode, TeamAttendancePayload } from '@/types/team-attendance'

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function dotCell(code: StatusCode | null, leaveTypes: LeaveType[]): string {
  if (code === null) return ''
  // For CSV we emit the code itself (P/A/PM/WO/CL/EL/...). The reader can
  // map back to labels via the legend or the system_codes constants.
  const _ = lookupStatus(code, leaveTypes)  // verifies it resolves; not used in CSV output
  void _
  return code
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  const url = new URL(req.url)

  try {
    // Call the JSON endpoint internally so the export reflects exactly the
    // same data as the on-screen grid. We forward the relevant query params.
    const innerUrl = new URL('/api/team-attendance', req.url)
    for (const k of ['year', 'month', 'manager_id']) {
      const v = url.searchParams.get(k)
      if (v) innerUrl.searchParams.set(k, v)
    }
    const innerRes = await fetch(innerUrl.toString(), {
      headers: { cookie: req.headers.get('cookie') ?? '' },
    })
    if (!innerRes.ok) {
      const body = await innerRes.text()
      return new NextResponse(body, { status: innerRes.status })
    }
    const json = await innerRes.json() as {
      data: TeamAttendancePayload
      flag_thresholds: { absent: number; punch_miss: number }
    }

    const payload = json.data
    const exceptionsOnly = url.searchParams.get('exceptions_only') === '1'
    const rows = exceptionsOnly
      ? filterExceptionsOnly(payload.rows, json.flag_thresholds.absent, json.flag_thresholds.punch_miss)
      : payload.rows

    // Build the CSV. Header columns:
    //   Emp ID, Name, Role, 1..daysInMonth, P, A, PM, <pinned codes...>, Attendance %
    const headers: string[] = ['Emp ID', 'Name', 'Role']
    for (let d = 1; d <= payload.period.daysInMonth; d++) headers.push(String(d))
    headers.push('P', 'A', 'PM', ...payload.pinnedCodes, 'Attendance %')

    const lines: string[] = []
    lines.push(headers.map(csvEscape).join(','))

    for (const row of rows) {
      const cells: string[] = []
      cells.push(csvEscape(row.employee.emp_id))
      cells.push(csvEscape(row.employee.name))
      cells.push(csvEscape(row.employee.role))
      for (let d = 0; d < payload.period.daysInMonth; d++) {
        cells.push(csvEscape(dotCell(row.daily[d], payload.leaveTypes)))
      }
      cells.push(csvEscape(row.aggregate.P))
      cells.push(csvEscape(row.aggregate.A))
      cells.push(csvEscape(row.aggregate.PM))
      for (const pc of payload.pinnedCodes) cells.push(csvEscape(row.aggregate.byLeaveCode[pc] ?? 0))
      cells.push(csvEscape(`${row.aggregate.pct}%`))
      lines.push(cells.join(','))
    }

    const csv = lines.join('\n') + '\n'
    const filename = `team-attendance-${payload.period.year}-${String(payload.period.month).padStart(2, '0')}.csv`

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId,
      actor_membership_id: ctx.membershipId,
      action: 'updated',           // closest existing AuditAction; treat as "exported"
      module: 'team_attendance',
      summary: `Exported team-attendance CSV (${rows.length} rows, ${payload.period.year}-${String(payload.period.month).padStart(2, '0')}${exceptionsOnly ? ', exceptions only' : ''})`,
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[team-attendance/export GET]', err)
    const msg = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
