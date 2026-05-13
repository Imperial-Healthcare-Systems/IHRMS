/**
 * Team Attendance Manager View — domain types.
 *
 * Per IHRMS team-attendance package, adapted to use the existing
 * `attendance_daily` table (with its enum-typed `status` column and the
 * new `leave_type_id` discriminator added in Migration 111) rather than
 * a new `attendance_records` table.
 *
 * The brief's architectural rule lives here:
 *   "The ONLY hardcoded codes are the four operational system codes:
 *    P (Present), A (Absent), PM (Punch Missed), WO (Weekly Off).
 *    Everything else is tenant data loaded from leave_types."
 */

/** The four system status codes — hardcoded, identical for every tenant. */
export type SystemStatusCode = 'P' | 'A' | 'PM' | 'WO'

export const SYSTEM_CODES: Record<SystemStatusCode, { label: string; color: string; letter: '' }> = {
  P:  { label: 'Present',      color: '#3B6D11', letter: '' },
  A:  { label: 'Absent',       color: '#A32D2D', letter: '' },
  PM: { label: 'Punch missed', color: '#BA7517', letter: '' },
  WO: { label: 'Weekly off',   color: '#B4B2A9', letter: '' },
} as const

/** Tenant-defined leave type row from the `leave_types` table. */
export type LeaveType = {
  id: string
  org_id: string
  code: string
  label: string
  letter: string | null
  color_hex: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

/** Per-tenant manager-grid configuration row from `tenant_attendance_settings`. */
export type TenantAttendanceSettings = {
  org_id: string
  /** Ordered list of leave codes (must exist in leave_types) shown as aggregate columns. */
  pinned_codes: string[]
  /** 0=Sun..6=Sat — days the grid renders as WO when no attendance row exists. */
  weekly_off_days: number[]
  /** Number of `A` days that flips the row to "action needed". */
  flag_absent_at: number
  /** Number of `PM` days that flips the row to "action needed". */
  flag_punch_miss_at: number
  /** Month (1-12) the org's fiscal year starts. India default = 4 (April). */
  fiscal_year_start: number
  created_at: string
  updated_at: string
}

/**
 * Status code as it travels through the app — either a system code or any
 * tenant-defined leave code. The grid treats them uniformly for rendering.
 */
export type StatusCode = SystemStatusCode | string

/**
 * Resolved status entry used during rendering — flattens system + tenant codes
 * into a uniform shape the dot renderer consumes.
 */
export type ResolvedStatus = {
  code: StatusCode
  label: string
  color: string
  letter: string
  isSystem: boolean
}

/** Per-employee monthly aggregate for the right-side summary columns. */
export type EmployeeAggregate = {
  P: number
  A: number
  PM: number
  /** Per-leave-code counts. Keys come from leave_types.code for this tenant. */
  byLeaveCode: Record<string, number>
  /** Attendance percentage = P / working_days × 100, rounded. */
  pct: number
}

/** Row data passed into the AttendanceGrid component. */
export type AttendanceRow = {
  employee: {
    id: string
    name: string
    role: string
    emp_id: string | null
    avatar_url: string | null
  }
  /** 31-element array; one entry per day. Days outside the month → null. */
  daily: (StatusCode | null)[]
  aggregate: EmployeeAggregate
}

/** Full payload returned from /api/team-attendance. */
export type TeamAttendancePayload = {
  org: { id: string; name: string }
  period: { year: number; month: number; daysInMonth: number; workingDays: number }
  systemCodes: typeof SYSTEM_CODES
  leaveTypes: LeaveType[]
  pinnedCodes: string[]
  weeklyOffDays: number[]
  rows: AttendanceRow[]
}

/**
 * Subset of `attendance_daily` columns the team-attendance reader needs.
 * Kept narrow so the grid doesn't accidentally read hours/late_minutes etc.
 */
export type AttendanceDailyRow = {
  employee_id: string
  attendance_date: string  // 'YYYY-MM-DD'
  status:
    | 'present' | 'absent' | 'half_day' | 'late' | 'on_leave'
    | 'holiday' | 'weekend' | 'work_from_home' | 'on_duty' | 'comp_off'
  leave_type_id: string | null
}
