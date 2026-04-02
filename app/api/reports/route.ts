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

const AVAILABLE_REPORTS = [
  {
    type: 'employee_master',
    label: 'Employee Master Report',
    description: 'Complete employee details with department and designation',
    fields: ['emp_id', 'name', 'email', 'department', 'designation', 'status', 'hire_date', 'employment_type'],
  },
  {
    type: 'attendance',
    label: 'Attendance Report',
    description: 'Daily attendance logs for a date range',
    fields: ['employee', 'date', 'status', 'first_in', 'last_out', 'effective_hours', 'overtime_hours'],
  },
  {
    type: 'payroll_summary',
    label: 'Payroll Summary Report',
    description: 'Monthly payroll summary grouped by department',
    fields: ['employee', 'department', 'gross_earnings', 'total_deductions', 'net_pay', 'month', 'year'],
  },
  {
    type: 'leave_balance',
    label: 'Leave Balance Report',
    description: 'Current leave balances for all employees',
    fields: ['employee', 'leave_type', 'opening_balance', 'accrued', 'availed', 'closing_balance'],
  },
  {
    type: 'headcount',
    label: 'Headcount Report',
    description: 'Employee count aggregated by department, designation, and status',
    fields: ['department', 'designation', 'status', 'employment_type', 'count'],
  },
  {
    type: 'statutory',
    label: 'Statutory Compliance Report',
    description: 'PF, ESIC, PT, TDS compliance status',
    fields: ['compliance_type', 'period', 'amount', 'status', 'due_date', 'filed_at'],
  },
]

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Return available reports list
    return NextResponse.json({
      available_reports: AVAILABLE_REPORTS,
      formats: ['json', 'csv', 'xlsx'],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { report_type, date_from, date_to, department_ids, fields, format } = body

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
    let recordCount = 0

    switch (report_type as ReportType) {
      case 'employee_master': {
        let query = supabaseAdmin
          .from('employees')
          .select(`
            id, first_name, last_name, work_email, personal_phone,
            date_of_joining, status, employment_type, gender,
            pan_number, uan_number,
            department:departments(id, name, code),
            designation:designations(id, title, level),
            manager:employees!manager_id(id, first_name, last_name)
          `)
          .order('date_of_joining', { ascending: false })

        if (department_ids && department_ids.length > 0) {
          query = query.in('department_id', department_ids)
        }
        if (date_from) query = query.gte('date_of_joining', date_from)
        if (date_to) query = query.lte('date_of_joining', date_to)

        const { data: result, error } = await query
        if (error) throw error
        data = result ?? []
        break
      }

      case 'attendance': {
        if (!date_from || !date_to) {
          return NextResponse.json(
            { error: 'date_from and date_to are required for attendance report' },
            { status: 400 }
          )
        }

        let query = supabaseAdmin
          .from('attendance_daily')
          .select(`
            id, attendance_date, status, first_in, last_out,
            effective_hours, overtime_hours, late_minutes, remarks,
            employee:employees!employee_id(
              id, first_name, last_name, work_email,
              department:departments(name)
            )
          `)
          .gte('attendance_date', date_from)
          .lte('attendance_date', date_to)
          .order('attendance_date', { ascending: true })

        if (department_ids && department_ids.length > 0) {
          // Can't filter by nested relation directly — fetch employee IDs first
          const { data: deptEmployees } = await supabaseAdmin
            .from('employees')
            .select('id')
            .in('department_id', department_ids)
          if (deptEmployees && deptEmployees.length > 0) {
            query = query.in('employee_id', deptEmployees.map((e) => e.id))
          }
        }

        const { data: result, error } = await query
        if (error) throw error
        data = result ?? []
        break
      }

      case 'payroll_summary': {
        let query = supabaseAdmin
          .from('payslips')
          .select(`
            id, month, year, basic, hra, special_allowance, gross_earnings,
            employee_pf, employee_esic, professional_tax, tds,
            total_deductions, net_pay, payment_status, payment_date,
            employee:employees!employee_id(
              id, first_name, last_name, work_email,
              department:departments(name),
              designation:designations(title)
            )
          `)
          .order('year', { ascending: false })
          .order('month', { ascending: false })

        if (date_from) {
          // Parse YYYY-MM from date_from
          const [yr, mo] = date_from.split('-')
          query = query.gte('year', parseInt(yr))
        }
        if (date_to) {
          const [yr] = date_to.split('-')
          query = query.lte('year', parseInt(yr))
        }

        if (department_ids && department_ids.length > 0) {
          const { data: deptEmployees } = await supabaseAdmin
            .from('employees')
            .select('id')
            .in('department_id', department_ids)
          if (deptEmployees && deptEmployees.length > 0) {
            query = query.in('employee_id', deptEmployees.map((e) => e.id))
          }
        }

        const { data: result, error } = await query
        if (error) throw error
        data = result ?? []
        break
      }

      case 'leave_balance': {
        const currentYear = new Date().getFullYear()

        let query = supabaseAdmin
          .from('leave_balances')
          .select(`
            id, year, opening_balance, accrued, availed, pending, lapsed, closing_balance,
            employee:employees!employee_id(
              id, first_name, last_name, work_email,
              department:departments(name)
            ),
            policy:leave_policies!policy_id(id, name, leave_type, days_per_year)
          `)
          .eq('year', currentYear)
          .order('employee_id', { ascending: true })

        if (department_ids && department_ids.length > 0) {
          const { data: deptEmployees } = await supabaseAdmin
            .from('employees')
            .select('id')
            .in('department_id', department_ids)
          if (deptEmployees && deptEmployees.length > 0) {
            query = query.in('employee_id', deptEmployees.map((e) => e.id))
          }
        }

        const { data: result, error } = await query
        if (error) throw error
        data = result ?? []
        break
      }

      case 'headcount': {
        let query = supabaseAdmin
          .from('employees')
          .select(`
            id, status, employment_type,
            department:departments(id, name),
            designation:designations(id, title)
          `)
          .neq('status', 'terminated')

        if (department_ids && department_ids.length > 0) {
          query = query.in('department_id', department_ids)
        }

        const { data: empData, error } = await query
        if (error) throw error

        // Aggregate headcount by department/designation/status
        const aggregates: Record<string, {
          department: string
          designation: string
          status: string
          employment_type: string
          count: number
        }> = {}

        for (const emp of empData ?? []) {
          const deptName = (emp.department as any)?.name ?? 'Unknown'
          const desigTitle = (emp.designation as any)?.title ?? 'Unknown'
          const key = `${deptName}||${desigTitle}||${emp.status}||${emp.employment_type}`
          if (!aggregates[key]) {
            aggregates[key] = {
              department: deptName,
              designation: desigTitle,
              status: emp.status,
              employment_type: emp.employment_type,
              count: 0,
            }
          }
          aggregates[key].count++
        }

        data = Object.values(aggregates)
        break
      }

      case 'statutory': {
        let query = supabaseAdmin
          .from('statutory_compliance')
          .select('*')
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })

        if (date_from) {
          const [yr] = date_from.split('-')
          query = query.gte('period_year', parseInt(yr))
        }
        if (date_to) {
          const [yr] = date_to.split('-')
          query = query.lte('period_year', parseInt(yr))
        }

        const { data: result, error } = await query
        if (error) throw error
        data = result ?? []
        break
      }
    }

    // Optionally filter fields if specified
    let finalData = data
    if (fields && Array.isArray(fields) && fields.length > 0) {
      finalData = data.map((row: any) => {
        const filtered: Record<string, unknown> = {}
        for (const field of fields) {
          if (field in row) filtered[field] = row[field]
        }
        return filtered
      })
    }

    recordCount = finalData.length

    return NextResponse.json({
      report_type,
      generated_at: new Date().toISOString(),
      generated_by: (session.user as any)?.id,
      date_from: date_from ?? null,
      date_to: date_to ?? null,
      format: format ?? 'json',
      record_count: recordCount,
      data: finalData,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
