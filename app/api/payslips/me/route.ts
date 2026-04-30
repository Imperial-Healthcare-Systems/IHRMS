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

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

/**
 * GET /api/payslips/me
 * Returns every payslip belonging to the current session user, joined with
 * the payroll run so the UI can show month/year/status. Self-scoped — does
 * not require admin role; HR-admins still see their own payslips here too.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id as string
    if (!userId) return NextResponse.json({ error: 'No user id on session' }, { status: 401 })

    const buildQuery = (withRun: boolean) => {
      const select = withRun
        ? `*, run:payroll_runs!payroll_run_id(id, month, year, status)`
        : '*'
      return supabaseAdmin
        .from('payslips')
        .select(select)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false })
    }

    let { data, error } = await buildQuery(true)
    if (error && (error.code === 'PGRST200' || error.code === 'PGRST201' || error.code === '42703')) {
      console.warn('[payslips/me] run join failed, retrying without:', error.message)
      const retry = await buildQuery(false)
      data = retry.data; error = retry.error
    }

    if (error) {
      console.error('[payslips/me GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    // Enrich each row with a "period" label for easy display
    const enriched = (data ?? []).map((p: any) => {
      const run   = p.run ?? null
      const month = run?.month ?? p.month ?? null
      const year  = run?.year  ?? p.year  ?? null
      const period = (month && year) ? `${MONTHS[month] ?? month} ${year}` : '—'
      return { ...p, period, run_status: run?.status ?? p.status ?? null }
    })

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error('[payslips/me catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
