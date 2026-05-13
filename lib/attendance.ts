/**
 * Pure functions for the Team Attendance manager grid.
 *
 * No I/O, no React, no Supabase. Every function here is deterministic and
 * unit-testable. The team-attendance API route in app/api/team-attendance/
 * does the data loading and calls these to shape the response.
 */
import {
  SYSTEM_CODES,
  type AttendanceDailyRow,
  type AttendanceRow,
  type EmployeeAggregate,
  type LeaveType,
  type ResolvedStatus,
  type StatusCode,
  type SystemStatusCode,
} from '@/types/team-attendance'

const SYSTEM_KEYS = new Set<string>(Object.keys(SYSTEM_CODES))

/**
 * Map our enum-typed `attendance_daily.status` (plus the `leave_type_id`
 * discriminator) to the brief's StatusCode space.
 *
 * Decisions baked in:
 *   - half_day, late, work_from_home, on_duty → 'P' (employee was working)
 *   - holiday, weekend, comp_off              → 'WO' (non-working day)
 *   - absent                                  → 'A'
 *   - on_leave + leave_type_id resolvable     → tenant code (e.g. 'CL', 'ML')
 *   - on_leave + leave_type_id NULL/unknown   → 'A' (defensive — counts as absent)
 *
 * PM (punch missed) is not in our enum today. The team-attendance reader
 * can synthesize PM at query time (a working day with no attendance_daily
 * row + no leave_request covering it). For v1 we don't synthesize PM yet;
 * any null row falls through to the default fill in dailyRowsToStatusArray.
 */
export function mapDailyRowToStatusCode(
  row: AttendanceDailyRow,
  leaveTypeIdToCode: Map<string, string>,
): StatusCode {
  switch (row.status) {
    case 'present':
    case 'half_day':
    case 'late':
    case 'work_from_home':
    case 'on_duty':
      return 'P'
    case 'holiday':
    case 'weekend':
    case 'comp_off':
      return 'WO'
    case 'absent':
      return 'A'
    case 'on_leave': {
      if (row.leave_type_id) {
        const code = leaveTypeIdToCode.get(row.leave_type_id)
        if (code) return code
      }
      // on_leave with no leave_type_id is data corruption from before
      // Migration 111. Render as 'A' so the dot isn't invisible and the
      // manager can investigate.
      return 'A'
    }
  }
}

/**
 * Resolve a status code to its display attributes. Tenant leave types take
 * precedence over system codes only if a tenant has — incorrectly — defined
 * a leave with the same code as a system code; we surface the system meaning
 * because P/A/PM/WO are platform contracts and must never be overridden.
 */
export function lookupStatus(code: StatusCode, leaveTypes: LeaveType[]): ResolvedStatus {
  if (SYSTEM_KEYS.has(code)) {
    const sys = SYSTEM_CODES[code as SystemStatusCode]
    return { code, label: sys.label, color: sys.color, letter: '', isSystem: true }
  }

  const lt = leaveTypes.find(t => t.code === code && t.is_active)
  if (lt) {
    return {
      code,
      label: lt.label,
      color: lt.color_hex,
      letter: lt.letter ?? '',
      isSystem: false,
    }
  }

  // Defensive fallback: status code in the DB that isn't in SYSTEM_CODES or
  // any active leave_type means the tenant deactivated a code that still
  // has historical records. Render muted gray, never crash.
  return { code, label: `Unknown (${code})`, color: '#888888', letter: '', isSystem: false }
}

/**
 * Compute the monthly aggregate for one employee.
 * Working days = days where status is anything other than WO.
 * pct = P / workingDays × 100 (rounded). If workingDays is 0, pct is 0.
 */
export function aggregate(
  daily: (StatusCode | null)[],
  leaveTypes: LeaveType[],
): EmployeeAggregate {
  const byLeaveCode: Record<string, number> = {}
  for (const lt of leaveTypes) {
    if (lt.is_active) byLeaveCode[lt.code] = 0
  }

  let P = 0
  let A = 0
  let PM = 0
  let workingDays = 0

  for (const code of daily) {
    if (code === null) continue
    if (code === 'WO') continue
    workingDays += 1

    if (code === 'P') P += 1
    else if (code === 'A') A += 1
    else if (code === 'PM') PM += 1
    else if (byLeaveCode[code] !== undefined) byLeaveCode[code] += 1
    // Unknown codes are intentionally not counted in any bucket.
  }

  const pct = workingDays === 0 ? 0 : Math.round((P / workingDays) * 100)
  return { P, A, PM, byLeaveCode, pct }
}

/** Color for the percentage column based on the value. */
export function pctColor(pct: number): string {
  if (pct >= 100) return '#3B6D11' // green — perfect attendance
  if (pct < 75)   return '#A32D2D' // red — needs intervention
  if (pct < 85)   return '#BA7517' // amber — watch
  return 'var(--color-text-primary)'
}

/** Whether to render the "Action needed" chip on a row. Thresholds come from tenant settings. */
export function isFlagged(
  agg: EmployeeAggregate,
  flagAbsentAt: number,
  flagPunchMissAt: number,
): boolean {
  return agg.A >= flagAbsentAt || agg.PM >= flagPunchMissAt
}

/**
 * Convert a list of attendance_daily rows for ONE employee into the 31-element
 * daily array used by the grid. Days outside the actual month are null.
 *
 * Pre-fill rule: days falling on weekly_off_days render as 'WO' by default;
 * a real attendance row overrides that (e.g. someone worked on Saturday).
 */
export function dailyRowsToStatusArray(
  rows: AttendanceDailyRow[],
  year: number,
  month: number, // 1-12
  daysInMonth: number,
  weeklyOffDays: number[],
  leaveTypeIdToCode: Map<string, string>,
): (StatusCode | null)[] {
  const daily: (StatusCode | null)[] = new Array(31).fill(null)
  const woSet = new Set(weeklyOffDays)

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (woSet.has(date.getDay())) {
      daily[day - 1] = 'WO'
    }
  }

  for (const row of rows) {
    const day = parseInt(row.attendance_date.slice(8, 10), 10)
    if (day >= 1 && day <= daysInMonth) {
      daily[day - 1] = mapDailyRowToStatusCode(row, leaveTypeIdToCode)
    }
  }

  return daily
}

/** Working days in a month, excluding weekly offs (holidays handled per-row). */
export function workingDaysInMonth(
  year: number,
  month: number,
  daysInMonth: number,
  weeklyOffDays: number[],
): number {
  const woSet = new Set(weeklyOffDays)
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (!woSet.has(date.getDay())) count += 1
  }
  return count
}

/** Apply the exceptions filter — keep only rows the manager needs to act on. */
export function filterExceptionsOnly(
  rows: AttendanceRow[],
  flagAbsentAt: number,
  flagPunchMissAt: number,
): AttendanceRow[] {
  return rows.filter(r => isFlagged(r.aggregate, flagAbsentAt, flagPunchMissAt))
}
