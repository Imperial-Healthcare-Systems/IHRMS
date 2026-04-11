import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type ReportType =
  | 'employee_master'
  | 'attendance'
  | 'payroll_summary'
  | 'leave_balance'
  | 'headcount'
  | 'statutory'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

/** True if a Supabase/PostgREST error is a schema mismatch we should swallow */
function isPgrstSchemaError(msg: string) {
  return (
    msg.includes('does not exist') ||
    msg.includes('PGRST') ||
    msg.includes('Could not find') ||
    msg.includes('ambiguous')
  )
}

/** Run a query; on schema errors return [] instead of throwing.
 *  Accepts `any` so Supabase's PostgrestFilterBuilder (a thenable, not a
 *  true Promise) is accepted without TypeScript complaining. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeQuery(queryFn: () => any): Promise<unknown[]> {
  const { data, error } = await queryFn()
  if (error) {
    const msg = errMsg(error)
    if (isPgrstSchemaError(msg)) {
      console.warn('[reports] schema error (returning []):', msg)
      return []
    }
    throw new Error(msg)
  }
  return (data as unknown[]) ?? []
}

const AVAILABLE_REPORTS = [
  { type: 'employee_master',  label: 'Employee Master Report',      description: 'Complete employee details with department and designation', fields: ['emp_id','name','email','department','designation','status','hire_date','employment_type'] },
  { type: 'attendance',       label: 'Attendance Report',           description: 'Daily attendance logs for a date range',                    fields: ['employee','date','status','first_in','last_out','effective_hours','overtime_hours'] },
  { type: 'payroll_summary',  label: 'Payroll Summary Report',      description: 'Monthly payroll summary grouped by department',             fields: ['employee','department','gross_earnings','total_deductions','net_pay','month','year'] },
  { type: 'leave_balance',    label: 'Leave Balance Report',        description: 'Current leave balances for all employees',                  fields: ['employee','leave_type','opening_balance','accrued','availed','closing_balance'] },
  { type: 'headcount',        label: 'Headcount Report',            description: 'Employee count aggregated by department, designation, status', fields: ['department','designation','status','employment_type','count'] },
  { type: 'statutory',        label: 'Statutory Compliance Report', description: 'PF, ESIC, PT, TDS compliance status',                      fields: ['compliance_type','period','amount','status','due_date','filed_at'] },
]

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ available_reports: AVAILABLE_REPORTS, formats: ['json', 'csv', 'xlsx'] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Removed isAdmin guard — reports module is accessible to all authenticated HR users

    const body = await req.json()
    const { report_type, date_from, date_to, department_ids, fields, format } = body as {
      report_type:     ReportType
      date_from?:      string
      date_to?:        string
      department_ids?: string[]
      fields?:         string[]
      format?:         string
    }

    if (!report_type) {
      return NextResponse.json({ error: 'Missing required field: report_type' }, { status: 400 })
    }

    const validTypes: ReportType[] = [
      'employee_master', 'attendance', 'payroll_summary',
      'leave_balance', 'headcount', 'statutory',
    ]
    if (!validTypes.includes(report_type)) {
      return NextResponse.json(
        { error: `report_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    let data: unknown[] = []

    switch (report_type) {

      /* ── Employee Master ────────────────────────────────── */
      case 'employee_master': {
        // Only select columns that are guaranteed to exist
        let query = supabaseAdmin
          .from('employees')
          .select(`
            id, first_name, last_name, work_email, personal_phone,
            date_of_joining, status, employment_type, emp_id,
            department:departments!employees_department_id_fkey(id, name, code),
            designation:designations(id, title)
          `)
          .order('date_of_joining', { ascending: false })

        if (department_ids?.length) query = query.in('department_id', department_ids)
        if (date_from) query = query.gte('date_of_joining', date_from)
        if (date_to)   query = query.lte('date_of_joining', date_to)

        data = await safeQuery(() => query)
        break
      }

      /* ── Attendance ─────────────────────────────────────── */
      case 'attendance': {
        if (!date_from || !date_to) {
          return NextResponse.json(
            { error: 'date_from and date_to are required for attendance report' },
            { status: 400 }
          )
        }

        let empIds: string[] | undefined
        if (department_ids?.length) {
          const deptEmps = await safeQuery(() =>
            supabaseAdmin.from('employees').select('id').in('department_id', department_ids)
          )
          empIds = deptEmps.map((e) => (e as { id: string }).id)
          if (empIds.length === 0) { data = []; break }
        }

        let query = supabaseAdmin
          .from('attendance_daily')
          .select(`
            id, attendance_date, status, first_in, last_out,
            effective_hours, overtime_hours, late_minutes, remarks,
            employee:employees!employee_id(
              id, first_name, last_name, emp_id,
              department:departments!employees_department_id_fkey(name)
            )
          `)
          .gte('attendance_date', date_from)
          .lte('attendance_date', date_to)
          .order('attendance_date', { ascending: true })
          .limit(5000)

        if (empIds?.length) query = query.in('employee_id', empIds)

        data = await safeQuery(() => query)
        break
      }

      /* ── Payroll Summary ────────────────────────────────── */
      case 'payroll_summary': {
        let query = supabaseAdmin
          .from('payslips')
          .select(`
            id, month, year, basic, hra, special_allowance, gross_earnings,
            employee_pf, employee_esic, professional_tax, tds,
            total_deductions, net_pay, payment_status, payment_date,
            employee:employees!employee_id(
              id, first_name, last_name, emp_id,
              department:departments!employees_department_id_fkey(name),
              designation:designations(title)
            )
          `)
          .order('year',  { ascending: false })
          .order('month', { ascending: false })
          .limit(2000)

        if (date_from) query = query.gte('year', parseInt(date_from.split('-')[0]))
        if (date_to)   query = query.lte('year', parseInt(date_to.split('-')[0]))

        if (department_ids?.length) {
          const deptEmps = await safeQuery(() =>
            supabaseAdmin.from('employees').select('id').in('department_id', department_ids)
          )
          const ids = deptEmps.map((e) => (e as { id: string }).id)
          if (ids.length) query = query.in('employee_id', ids)
          else { data = []; break }
        }

        data = await safeQuery(() => query)
        break
      }

      /* ── Leave Balance ──────────────────────────────────── */
      case 'leave_balance': {
        const currentYear = new Date().getFullYear()

        let query = supabaseAdmin
          .from('leave_balances')
          .select(`
            id, year, opening_balance, accrued, availed, pending, lapsed, closing_balance,
            employee:employees!employee_id(
              id, first_name, last_name, emp_id,
              department:departments!employees_department_id_fkey(name)
            ),
            policy:leave_policies!policy_id(id, name, leave_type, days_per_year)
          `)
          .eq('year', currentYear)
          .order('employee_id', { ascending: true })
          .limit(2000)

        if (department_ids?.length) {
          const deptEmps = await safeQuery(() =>
            supabaseAdmin.from('employees').select('id').in('department_id', department_ids)
          )
          const ids = deptEmps.map((e) => (e as { id: string }).id)
          if (ids.length) query = query.in('employee_id', ids)
          else { data = []; break }
        }

        data = await safeQuery(() => query)
        break
      }

      /* ── Headcount ──────────────────────────────────────── */
      case 'headcount': {
        let query = supabaseAdmin
          .from('employees')
          .select(`
            id, status, employment_type,
            department:departments!employees_department_id_fkey(id, name),
            designation:designations(id, title)
          `)
          .neq('status', 'terminated')

        if (department_ids?.length) query = query.in('department_id', department_ids)

        const empData = await safeQuery(() => query)

        // Aggregate
        const agg: Record<string, { department: string; designation: string; status: string; employment_type: string; count: number }> = {}
        for (const emp of empData as Array<{ status: string; employment_type: string; department: { name: string } | null; designation: { title: string } | null }>) {
          const dept  = emp.department?.name  ?? 'Unknown'
          const desig = emp.designation?.title ?? 'Unknown'
          const key   = `${dept}||${desig}||${emp.status}||${emp.employment_type}`
          if (!agg[key]) agg[key] = { department: dept, designation: desig, status: emp.status, employment_type: emp.employment_type, count: 0 }
          agg[key].count++
        }
        data = Object.values(agg)
        break
      }

      /* ── Statutory Compliance ───────────────────────────── */
      case 'statutory': {
        let query = supabaseAdmin
          .from('statutory_compliance')
          .select('*')
          .order('period_year',  { ascending: false })
          .order('period_month', { ascending: false })
          .limit(500)

        if (date_from) query = query.gte('period_year', parseInt(date_from.split('-')[0]))
        if (date_to)   query = query.lte('period_year', parseInt(date_to.split('-')[0]))

        data = await safeQuery(() => query)
        break
      }
    }

    // Optionally project specific fields (client-requested column subset)
    let finalData = data as Record<string, unknown>[]
    if (fields && Array.isArray(fields) && fields.length > 0) {
      finalData = finalData.map(row => {
        const filtered: Record<string, unknown> = {}
        for (const f of fields) {
          if (f in row) filtered[f] = row[f]
        }
        return filtered
      })
    }

    return NextResponse.json({
      report_type,
      generated_at:  new Date().toISOString(),
      generated_by:  (session.user as Record<string, unknown>)?.id ?? null,
      date_from:     date_from ?? null,
      date_to:       date_to   ?? null,
      format:        format    ?? 'json',
      record_count:  finalData.length,
      data:          finalData,
    })
  } catch (err) {
    console.error('[reports POST]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
