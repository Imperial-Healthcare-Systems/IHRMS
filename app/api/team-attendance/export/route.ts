/**
 * GET /api/team-attendance/export?year=YYYY&month=MM[&manager_id=UUID][&exceptions_only=1]
 *
 * Server-streamed CSV of the manager grid for the requested month. Format
 * matches `docs/sample-outputs/csv-export-sample.csv`:
 *
 *   Imperial HRMS — Team Attendance
 *   Tenant,<org_name>
 *   Period,<YYYY-MM>
 *   Filter,<All employees | Exceptions only>
 *   Generated at,<ISO timestamp>
 *
 *   Status legend
 *   P,Present
 *   ...
 *
 *   Employee,Role,01 Fri,02 Sat,...,P,A,PM,<pinned codes>,%
 *   <row data>
 *
 * Day columns use "DD Day" (e.g. "01 Fri") so Excel doesn't auto-interpret
 * them as dates. Reuses the JSON endpoint internally so what's exported is
 * exactly what's on-screen.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { filterExceptionsOnly } from '@/lib/attendance'
import { SYSTEM_CODES, type StatusCode, type TeamAttendancePayload } from '@/types/team-attendance'

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function dotCell(code: StatusCode | null): string {
  return code === null ? '' : code
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  const url = new URL(req.url)

  try {
    // Reuse the JSON endpoint so the export reflects the same data as the on-screen grid.
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

    const lines: string[] = []

    // ── Metadata header block ───────────────────────────────────────
    lines.push('Imperial HRMS — Team Attendance')
    lines.push(`Tenant,${csvEscape(payload.org.name)}`)
    lines.push(`Period,${payload.period.year}-${String(payload.period.month).padStart(2, '0')}`)
    lines.push(`Filter,${exceptionsOnly ? 'Exceptions only' : 'All employees'}`)
    lines.push(`Generated at,${new Date().toISOString()}`)
    lines.push('')

    // ── Status legend ────────────────────────────────────────────────
    lines.push('Status legend')
    for (const code of ['P', 'A', 'PM', 'WO'] as const) {
      lines.push(`${code},${csvEscape(SYSTEM_CODES[code].label)}`)
    }
    for (const lt of payload.leaveTypes) {
      if (!lt.is_active) continue
      lines.push(`${csvEscape(lt.code)},${csvEscape(lt.label)}`)
    }
    lines.push('')

    // ── Day column headers as "DD Day" ───────────────────────────────
    const dayHeaders: string[] = []
    for (let d = 1; d <= payload.period.daysInMonth; d++) {
      const dow = new Date(payload.period.year, payload.period.month - 1, d).getDay()
      dayHeaders.push(`${String(d).padStart(2, '0')} ${DOW_SHORT[dow]}`)
    }

    const headers: string[] = ['Employee', 'Role', ...dayHeaders, 'P', 'A', 'PM', ...payload.pinnedCodes, '%']
    lines.push(headers.map(csvEscape).join(','))

    // ── Data rows ────────────────────────────────────────────────────
    for (const row of rows) {
      const cells: string[] = []
      cells.push(csvEscape(row.employee.name))
      cells.push(csvEscape(row.employee.role))
      for (let d = 0; d < payload.period.daysInMonth; d++) {
        cells.push(csvEscape(dotCell(row.daily[d])))
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
      action: 'updated',
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
