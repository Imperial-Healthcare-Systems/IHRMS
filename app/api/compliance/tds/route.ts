import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'payroll_admin', 'finance_admin']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}
function isPgrstErr(m: string) {
  return m.includes('does not exist') || m.includes('PGRST') || m.includes('Could not find') || m.includes('ambiguous')
}
async function safe(fn: () => any): Promise<unknown[]> {
  const { data, error } = await fn()
  if (error) {
    const msg = errMsg(error)
    if (isPgrstErr(msg)) { console.warn('[compliance/tds] schema error:', msg); return [] }
    throw new Error(msg)
  }
  return (data as unknown[]) ?? []
}

function getQuarter(month: number): number {
  if (month >= 4 && month <= 6)  return 1
  if (month >= 7 && month <= 9)  return 2
  if (month >= 10 && month <= 12) return 3
  return 4
}

function getQDueDate(q: number, fyEndYear: number): string {
  const DUE: Record<number, string> = {
    1: `${fyEndYear - 1}-07-31`,
    2: `${fyEndYear - 1}-10-31`,
    3: `${fyEndYear}-01-31`,
    4: `${fyEndYear}-05-31`,
  }
  return DUE[q]
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear  = now.getFullYear()
    const fyStart = curMonth >= 4 ? curYear : curYear - 1

    const fyParam = searchParams.get('fy')
    let fyStartYear = fyStart
    if (fyParam) {
      const parts = fyParam.split('-')
      fyStartYear = parseInt(parts[0])
    }
    const fyEndYear = fyStartYear + 1

    const rows = await safe(() =>
      supabaseAdmin
        .from('payslips')
        .select('id, month, year, tds, gross_earnings, payment_status')
        .eq('org_id', ctx.orgId)
        .or(
          `and(year.eq.${fyStartYear},month.gte.4),and(year.eq.${fyEndYear},month.lte.3)`
        )
        .limit(5000)
    )

    type Row = { id: string; month: number; year: number; tds?: number; gross_earnings?: number; payment_status?: string }

    const qData: Record<number, { tds: number; gross: number; count: number }> = {
      1: { tds: 0, gross: 0, count: 0 },
      2: { tds: 0, gross: 0, count: 0 },
      3: { tds: 0, gross: 0, count: 0 },
      4: { tds: 0, gross: 0, count: 0 },
    }

    for (const r of rows as Row[]) {
      const q = getQuarter(r.month)
      qData[q].tds   += r.tds ?? 0
      qData[q].gross += r.gross_earnings ?? 0
      qData[q].count++
    }

    const QPERIODS: Record<number, string> = {
      1: `Apr–Jun ${fyStartYear}`,
      2: `Jul–Sep ${fyStartYear}`,
      3: `Oct–Dec ${fyStartYear}`,
      4: `Jan–Mar ${fyEndYear}`,
    }

    const todayStr = now.toISOString().slice(0, 10)

    const quarters = [1, 2, 3, 4].map(q => {
      const dueDate = getQDueDate(q, fyEndYear)
      const hasData = qData[q].count > 0
      const isPast  = dueDate < todayStr
      return {
        quarter:    `Q${q}`,
        period:     QPERIODS[q],
        tds:        qData[q].tds,
        gross:      qData[q].gross,
        payslip_count: qData[q].count,
        due_date:   dueDate,
        status:     !hasData ? 'no_data' : (isPast ? 'Filed' : 'Pending'),
      }
    })

    const totalTds   = quarters.reduce((s, q) => s + q.tds, 0)
    const totalGross = quarters.reduce((s, q) => s + q.gross, 0)

    return NextResponse.json({
      fy: `${fyStartYear}-${String(fyEndYear).slice(-2)}`,
      fy_start_year: fyStartYear,
      fy_end_year:   fyEndYear,
      quarters,
      total_tds:     totalTds,
      total_gross:   totalGross,
    })
  } catch (err) {
    console.error('[compliance/tds]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
