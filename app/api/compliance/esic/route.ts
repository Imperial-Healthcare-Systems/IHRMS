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
    if (isPgrstErr(msg)) { console.warn('[compliance/esic] schema error:', msg); return [] }
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

    // Query payslips where gross_earnings ≤ 21000 (ESIC eligible)
    let rows = await safe(() =>
      supabaseAdmin
        .from('payslips')
        .select(`
          id, month, year, gross_earnings, employee_esic, payment_status,
          employee:employees!employee_id(
            id, first_name, last_name, emp_id,
            department:departments!employees_department_id_fkey(name)
          )
        `)
        .eq('month', month)
        .eq('year', year)
        .lte('gross_earnings', 21000)
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
            id, month, year, gross_earnings, employee_esic, payment_status,
            employee:employees!employee_id(
              id, first_name, last_name, emp_id,
              department:departments!employees_department_id_fkey(name)
            )
          `)
          .eq('month', actualMonth)
          .eq('year', actualYear)
          .lte('gross_earnings', 21000)
          .order('id', { ascending: true })
          .limit(500)
      )
    }

    type Row = {
      id: string; month: number; year: number
      gross_earnings?: number; employee_esic?: number; payment_status?: string
      employee?: { id: string; first_name: string; last_name: string; emp_id?: string; department?: { name: string } | null } | null
    }

    const data = (rows as Row[]).map(r => {
      const gross       = r.gross_earnings ?? 0
      const empEsic     = r.employee_esic ?? Math.round(gross * 0.0075) // 0.75%
      const emplrEsic   = Math.round(gross * 0.0325)                    // 3.25%
      return {
        name:          r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Unknown',
        emp_id:        r.employee?.emp_id ?? '—',
        department:    (r.employee?.department as { name?: string } | null)?.name ?? '—',
        gross_salary:  gross,
        emp_contrib:   empEsic,
        emplr_contrib: emplrEsic,
        total:         empEsic + emplrEsic,
        status:        r.payment_status === 'paid' ? 'Active' : 'Pending',
      }
    })

    return NextResponse.json({ data, month: actualMonth, year: actualYear, count: data.length })
  } catch (err) {
    console.error('[compliance/esic]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
