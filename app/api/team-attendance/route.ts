/**
 * GET /api/team-attendance?year=YYYY&month=MM[&manager_id=UUID]
 *
 * Returns the manager-grid payload: org info, period info, system codes,
 * tenant leave types, pinned codes, weekly off days, and per-employee rows
 * (employee + 31-element daily status + per-month aggregate).
 *
 * Defaults:
 *   - year/month → current month
 *   - manager_id → ctx.identityId (the caller is the manager looking at their
 *     own team). Admins (owner/admin/hr_admin) can pass any manager_id.
 *
 * Data source: attendance_daily (with leave_type_id discriminator from
 * Migration 111). The brief's separate attendance_records table is not used.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  aggregate,
  dailyRowsToStatusArray,
  workingDaysInMonth,
} from '@/lib/attendance'
import {
  SYSTEM_CODES,
  type AttendanceDailyRow,
  type AttendanceRow,
  type LeaveType,
  type TeamAttendancePayload,
  type TenantAttendanceSettings,
} from '@/types/team-attendance'

const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_admin', 'super_admin', 'hr'])

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const url = new URL(req.url)
    const now = new Date()
    const year  = parseInt(url.searchParams.get('year')  ?? String(now.getFullYear()), 10)
    const month = parseInt(url.searchParams.get('month') ?? String(now.getMonth() + 1), 10)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    // Resolve manager_id. Admins can view any manager's team in their org;
    // non-admins always see their own direct reports.
    const requestedManagerId = url.searchParams.get('manager_id') ?? null
    const isAdmin = ADMIN_ROLES.has(ctx.role)
    const managerId = isAdmin && requestedManagerId ? requestedManagerId : ctx.identityId

    // ── 1. Org metadata (for the response header)
    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('id, name')
      .eq('id', ctx.orgId)
      .maybeSingle() as { data: { id: string; name: string } | null }

    // ── 2. Tenant settings (pinned codes, weekly off days, flag thresholds)
    const { data: settingsRow } = await supabaseAdmin
      .from('tenant_attendance_settings')
      .select('org_id, pinned_codes, weekly_off_days, flag_absent_at, flag_punch_miss_at, fiscal_year_start, created_at, updated_at')
      .eq('org_id', ctx.orgId)
      .maybeSingle() as { data: TenantAttendanceSettings | null }

    const settings: TenantAttendanceSettings = settingsRow ?? {
      org_id: ctx.orgId,
      pinned_codes: [],
      weekly_off_days: [0, 6],
      flag_absent_at: 2,
      flag_punch_miss_at: 3,
      fiscal_year_start: 4,
      created_at: '',
      updated_at: '',
    }

    // ── 3. Tenant leave types
    const { data: leaveTypes } = await supabaseAdmin
      .from('leave_types')
      .select('id, org_id, code, label, letter, color_hex, is_active, display_order, created_at, updated_at')
      .eq('org_id', ctx.orgId)
      .order('display_order', { ascending: true }) as { data: LeaveType[] | null }

    const leaveTypeIdToCode = new Map<string, string>()
    for (const lt of leaveTypes ?? []) leaveTypeIdToCode.set(lt.id, lt.code)

    // ── 4. Direct reports (employees with reporting_manager_id = managerId)
    //      The brief's expectation is employees.manager_id; IHRMS uses
    //      reporting_manager_id (verified in app/api/employees/[id]/route.ts).
    //      For the v1 grid we look up by identity_id matching managerId via
    //      the employees row's identity_id, falling back to the legacy
    //      employees.id case where managerId might be an employee.id.
    const { data: managerEmp } = await supabaseAdmin
      .from('employees')
      .select('id, identity_id')
      .eq('org_id', ctx.orgId)
      .or(`identity_id.eq.${managerId},id.eq.${managerId}`)
      .maybeSingle() as { data: { id: string; identity_id: string | null } | null }

    if (!managerEmp) {
      // Manager has no employee profile in this org → empty team.
      return emptyPayload(ctx.orgId, org?.name ?? '—', year, month, leaveTypes ?? [], settings)
    }

    const { data: reports } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, emp_id, avatar_url, designation_title, role')
      .eq('org_id', ctx.orgId)
      .eq('reporting_manager_id', managerEmp.id)
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    const reportsList = (reports ?? []) as Array<{
      id: string
      first_name: string
      last_name: string | null
      emp_id: string | null
      avatar_url: string | null
      designation_title: string | null
      role: string | null
    }>

    if (reportsList.length === 0) {
      return emptyPayload(ctx.orgId, org?.name ?? '—', year, month, leaveTypes ?? [], settings)
    }

    // ── 5. Bulk attendance_daily for the period, all reports at once
    const reportIds = reportsList.map(r => r.id)
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const totalDays = daysInMonth(year, month)
    const lastDay  = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`

    const { data: dailyRows } = await supabaseAdmin
      .from('attendance_daily')
      .select('employee_id, attendance_date, status, leave_type_id')
      .eq('org_id', ctx.orgId)
      .in('employee_id', reportIds)
      .gte('attendance_date', firstDay)
      .lte('attendance_date', lastDay) as { data: AttendanceDailyRow[] | null }

    const byEmployee = new Map<string, AttendanceDailyRow[]>()
    for (const r of dailyRows ?? []) {
      const list = byEmployee.get(r.employee_id)
      if (list) list.push(r)
      else byEmployee.set(r.employee_id, [r])
    }

    // ── 6. Build grid rows
    const grid: AttendanceRow[] = reportsList.map(emp => {
      const daily = dailyRowsToStatusArray(
        byEmployee.get(emp.id) ?? [],
        year, month, totalDays, settings.weekly_off_days,
        leaveTypeIdToCode,
      )
      const agg = aggregate(daily, leaveTypes ?? [])
      return {
        employee: {
          id: emp.id,
          name: `${emp.first_name}${emp.last_name ? ' ' + emp.last_name : ''}`.trim(),
          role: emp.designation_title ?? emp.role ?? '—',
          emp_id: emp.emp_id,
          avatar_url: emp.avatar_url,
        },
        daily,
        aggregate: agg,
      }
    })

    const payload: TeamAttendancePayload = {
      org: { id: ctx.orgId, name: org?.name ?? '—' },
      period: {
        year, month,
        daysInMonth: totalDays,
        workingDays: workingDaysInMonth(year, month, totalDays, settings.weekly_off_days),
      },
      systemCodes: SYSTEM_CODES,
      leaveTypes: leaveTypes ?? [],
      pinnedCodes: settings.pinned_codes,
      weeklyOffDays: settings.weekly_off_days,
      rows: grid,
    }

    return NextResponse.json({
      data: payload,
      flag_thresholds: {
        absent: settings.flag_absent_at,
        punch_miss: settings.flag_punch_miss_at,
      },
    })
  } catch (err) {
    console.error('[team-attendance GET catch]', err)
    const msg = err instanceof Error ? err.message : 'Failed to load team attendance'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function emptyPayload(
  orgId: string,
  orgName: string,
  year: number,
  month: number,
  leaveTypes: LeaveType[],
  settings: TenantAttendanceSettings,
) {
  const totalDays = daysInMonth(year, month)
  const payload: TeamAttendancePayload = {
    org: { id: orgId, name: orgName },
    period: {
      year, month,
      daysInMonth: totalDays,
      workingDays: workingDaysInMonth(year, month, totalDays, settings.weekly_off_days),
    },
    systemCodes: SYSTEM_CODES,
    leaveTypes,
    pinnedCodes: settings.pinned_codes,
    weeklyOffDays: settings.weekly_off_days,
    rows: [],
  }
  return NextResponse.json({
    data: payload,
    flag_thresholds: {
      absent: settings.flag_absent_at,
      punch_miss: settings.flag_punch_miss_at,
    },
  })
}
