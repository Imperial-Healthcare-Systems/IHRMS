import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safe(fn: () => any): Promise<unknown[]> {
  const { data, error } = await fn()
  if (error) {
    const msg = errMsg(error)
    if (isPgrstErr(msg)) { console.warn('[compliance/pt] schema error:', msg); return [] }
    throw new Error(msg)
  }
  return (data as unknown[]) ?? []
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
    const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()))

    // Query payslips for PT data
    let rows = await safe(() =>
      supabaseAdmin
        .from('payslips')
        .select('id, month, year, gross_earnings, professional_tax, payment_status')
        .eq('month', month)
        .eq('year', year)
        .limit(2000)
    )

    let actualMonth = month, actualYear = year
    if (rows.length === 0) {
      actualMonth = month === 1 ? 12 : month - 1
      actualYear  = month === 1 ? year - 1 : year
      rows = await safe(() =>
        supabaseAdmin
          .from('payslips')
          .select('id, month, year, gross_earnings, professional_tax, payment_status')
          .eq('month', actualMonth)
          .eq('year', actualYear)
          .limit(2000)
      )
    }

    type Row = { id: string; gross_earnings?: number; professional_tax?: number; payment_status?: string }

    let totalPt = 0, totalEmployees = 0
    for (const r of rows as Row[]) {
      totalPt += r.professional_tax ?? 0
      totalEmployees++
    }

    // Since we don't have state in employees, use aggregate totals only
    // Build a summary row using PT collected data
    const summary = {
      total_employees: totalEmployees,
      total_pt: totalPt,
      // PT rate breakdown based on approximate gross ranges
      nil_count:    (rows as Row[]).filter(r => (r.professional_tax ?? 0) === 0).length,
      low_rate_count:  (rows as Row[]).filter(r => { const pt = r.professional_tax ?? 0; return pt > 0 && pt <= 150 }).length,
      high_rate_count: (rows as Row[]).filter(r => (r.professional_tax ?? 0) > 150).length,
    }

    return NextResponse.json({ data: rows, summary, month: actualMonth, year: actualYear, count: rows.length })
  } catch (err) {
    console.error('[compliance/pt]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
