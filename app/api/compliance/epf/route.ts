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
    if (isPgrstErr(msg)) { console.warn('[compliance/epf] schema error:', msg); return [] }
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

    // Query payslips for given month/year — use prev month if none found
    let rows = await safe(() =>
      supabaseAdmin
        .from('payslips')
        .select(`
          id, month, year, basic, gross_earnings, employee_pf, payment_status,
          employee:employees!employee_id(
            id, first_name, last_name, emp_id,
            department:departments!employees_department_id_fkey(name)
          )
        `)
        .eq('month', month)
        .eq('year', year)
        .order('id', { ascending: true })
        .limit(500)
    )

    let actualMonth = month, actualYear = year
    if (rows.length === 0) {
      actualMonth = month === 1 ? 12 : month - 1
      actualYear  = month === 1 ? year - 1 : year
      rows = await safe(() =>
        supabaseAdmin
          .from('payslips')
          .select(`
            id, month, year, basic, gross_earnings, employee_pf, payment_status,
            employee:employees!employee_id(
              id, first_name, last_name, emp_id,
              department:departments!employees_department_id_fkey(name)
            )
          `)
          .eq('month', actualMonth)
          .eq('year', actualYear)
          .order('id', { ascending: true })
          .limit(500)
      )
    }

    type Row = {
      id: string; month: number; year: number
      basic?: number; gross_earnings?: number; employee_pf?: number; payment_status?: string
      employee?: { id: string; first_name: string; last_name: string; emp_id?: string; department?: { name: string } | null } | null
    }

    const data = (rows as Row[]).map(r => {
      const pfWages    = r.basic ?? Math.round((r.gross_earnings ?? 0) * 0.4)
      const empPf      = r.employee_pf ?? Math.round(pfWages * 0.12)
      const emplrPf    = empPf                               // employer = 12%
      const eps        = Math.min(Math.round(pfWages * 0.0833), 1250) // 8.33% capped ₹1250
      const edli       = Math.round(pfWages * 0.005)         // 0.5%
      const adminChg   = Math.round(pfWages * 0.012)         // 1.2%
      return {
        name:         r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Unknown',
        emp_id:       r.employee?.emp_id ?? '—',
        department:   (r.employee?.department as { name?: string } | null)?.name ?? '—',
        pf_wages:     pfWages,
        emp_contrib:  empPf,
        emplr_contrib:emplrPf,
        eps,
        edli,
        admin_charges:adminChg,
        total_challan: empPf + emplrPf + edli + adminChg,
        status:       r.payment_status === 'paid' ? 'Active' : 'Pending',
      }
    })

    return NextResponse.json({ data, month: actualMonth, year: actualYear, count: data.length })
  } catch (err) {
    console.error('[compliance/epf]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
