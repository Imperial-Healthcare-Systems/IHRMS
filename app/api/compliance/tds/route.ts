import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Map quarter number to months
const QUARTER_MONTHS: Record<number, number[]> = {
  1: [4, 5, 6],   // Q1: Apr–Jun
  2: [7, 8, 9],   // Q2: Jul–Sep
  3: [10, 11, 12], // Q3: Oct–Dec
  4: [1, 2, 3],   // Q4: Jan–Mar
}

// Parse financial year string like "2025-26" into start/end calendar years
function parseFinancialYear(fy: string): { fyStartYear: number; fyEndYear: number } {
  const parts = fy.split('-')
  const fyStartYear = parseInt(parts[0])
  const fyEndYear = fyStartYear + 1
  return { fyStartYear, fyEndYear }
}

// Get calendar year for a month given the financial year
function getCalendarYear(month: number, fyStartYear: number): number {
  // Months Apr(4) – Dec(12) are in fyStartYear; Jan(1)–Mar(3) are in fyEndYear
  return month >= 4 ? fyStartYear : fyStartYear + 1
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const now = new Date()
    // Default to current financial year
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const defaultFY =
      currentMonth >= 4
        ? `${currentYear}-${String(currentYear + 1).slice(-2)}`
        : `${currentYear - 1}-${String(currentYear).slice(-2)}`

    const financial_year = searchParams.get('financial_year') ?? defaultFY
    const quarterParam = searchParams.get('quarter')
    const quarter = quarterParam ? parseInt(quarterParam) : null

    if (!financial_year.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json(
        { error: 'financial_year must be in format YYYY-YY (e.g. 2025-26)' },
        { status: 400 }
      )
    }
    if (quarter !== null && (quarter < 1 || quarter > 4)) {
      return NextResponse.json({ error: 'quarter must be between 1 and 4' }, { status: 400 })
    }

    const { fyStartYear } = parseFinancialYear(financial_year)

    // Get all TDS data from payslips for this FY grouped by quarter
    const quarterBreakdown: Record<number, {
      quarter: number
      months: number[]
      total_tds: number
      employees: number
    }> = {}

    // Initialize all quarters
    for (let q = 1; q <= 4; q++) {
      quarterBreakdown[q] = {
        quarter: q,
        months: QUARTER_MONTHS[q],
        total_tds: 0,
        employees: 0,
      }
    }

    // Build list of month/year combinations for the FY
    const monthYearPairs: Array<{ month: number; year: number; quarter: number }> = []
    for (let q = 1; q <= 4; q++) {
      for (const m of QUARTER_MONTHS[q]) {
        const yr = getCalendarYear(m, fyStartYear)
        monthYearPairs.push({ month: m, year: yr, quarter: q })
      }
    }

    // Filter to specific quarter if requested
    const pairsToQuery = quarter
      ? monthYearPairs.filter((p) => p.quarter === quarter)
      : monthYearPairs

    // Fetch payslip TDS for each month
    const payslipPromises = pairsToQuery.map(({ month, year }) =>
      supabaseAdmin
        .from('payslips')
        .select('employee_id, tds, month, year')
        .eq('month', month)
        .eq('year', year)
    )

    const payslipResults = await Promise.all(payslipPromises)

    let totalTds = 0
    const taxRegimeBreakdown: Record<string, number> = { old: 0, new: 0 }
    const form16Status: Record<string, boolean> = {}

    for (let i = 0; i < pairsToQuery.length; i++) {
      const { quarter: q } = pairsToQuery[i]
      const { data: payslips, error } = payslipResults[i]
      if (error) continue

      const monthTds = (payslips ?? []).reduce((sum: number, p: any) => sum + (p.tds ?? 0), 0)
      quarterBreakdown[q].total_tds += monthTds
      quarterBreakdown[q].employees = Math.max(
        quarterBreakdown[q].employees,
        (payslips ?? []).length
      )
      totalTds += monthTds
    }

    // Get tax regime breakdown from employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, tax_regime')
      .eq('tds_applicable', true)
      .neq('status', 'terminated')

    for (const emp of employees ?? []) {
      const regime = (emp.tax_regime as string) ?? 'new'
      taxRegimeBreakdown[regime] = (taxRegimeBreakdown[regime] ?? 0) + 1
    }

    // Check Form 16 generation status from compliance records
    const { data: compRecords } = await supabaseAdmin
      .from('statutory_compliance')
      .select('period_month, period_year, return_filed, form_number')
      .eq('compliance_type', 'tds')
      .eq('period_year', fyStartYear)

    for (const rec of compRecords ?? []) {
      const key = `${rec.period_year}-${rec.period_month}`
      form16Status[key] = rec.return_filed ?? false
    }

    const response: Record<string, unknown> = {
      financial_year,
      total_tds_deducted: totalTds,
      total_employees: (employees ?? []).length,
      by_quarter: Object.values(quarterBreakdown),
      by_tax_regime: taxRegimeBreakdown,
      form16_status: form16Status,
    }

    if (quarter !== null) {
      response.selected_quarter = quarter
      response.quarter_total = quarterBreakdown[quarter]?.total_tds ?? 0
    }

    return NextResponse.json(response)
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
    const { financial_year, quarter } = body

    if (!financial_year || !quarter) {
      return NextResponse.json(
        { error: 'Missing required fields: financial_year, quarter' },
        { status: 400 }
      )
    }

    if (quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'quarter must be between 1 and 4' }, { status: 400 })
    }

    const { fyStartYear } = parseFinancialYear(financial_year)
    const months = QUARTER_MONTHS[quarter]

    // Aggregate payslips TDS for each month in the quarter
    let totalTds = 0
    let recordCount = 0

    const promises = months.map((m) => {
      const yr = getCalendarYear(m, fyStartYear)
      return supabaseAdmin
        .from('payslips')
        .select('tds')
        .eq('month', m)
        .eq('year', yr)
    })

    const results = await Promise.all(promises)

    for (const { data, error } of results) {
      if (error) continue
      for (const p of data ?? []) {
        totalTds += p.tds ?? 0
        recordCount++
      }
    }

    // Determine the due date for the quarter's TDS return
    const quarterDueDates: Record<number, string> = {
      1: `${fyStartYear}-07-31`,
      2: `${fyStartYear}-10-31`,
      3: `${fyStartYear + 1}-01-31`,
      4: `${fyStartYear + 1}-05-31`,
    }
    const due_date = quarterDueDates[quarter]

    // Upsert a compliance record for this quarter summary
    // Use period_month = quarter * 3 as a proxy (last month of quarter)
    const lastMonthOfQuarter = months[months.length - 1]
    const lastYearOfQuarter = getCalendarYear(lastMonthOfQuarter, fyStartYear)

    const { data: compliance, error: compError } = await supabaseAdmin
      .from('statutory_compliance')
      .upsert(
        {
          compliance_type: 'tds',
          period_month: lastMonthOfQuarter,
          period_year: lastYearOfQuarter,
          due_date,
          amount: totalTds,
          status: 'pending',
          form_number: `Form 24Q Q${quarter}`,
          managed_by: (session.user as any)?.id ?? null,
          remarks: `FY ${financial_year} Q${quarter} TDS summary`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'compliance_type,period_month,period_year' }
      )
      .select()
      .single()

    if (compError) throw compError

    return NextResponse.json({
      message: `TDS summary generated for FY ${financial_year} Q${quarter}`,
      data: compliance,
      financial_year,
      quarter,
      total_tds: totalTds,
      payslip_records: recordCount,
      due_date,
    }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
