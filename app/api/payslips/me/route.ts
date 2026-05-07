import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
 * the payroll run so the UI can show month/year/status. Self-scoped — no
 * admin role required.
 *
 * The session's user.id is the employees.id (Path A and Path B both set it
 * that way), so eq('employee_id', ctx.identityId) does the right thing in
 * both cases. The org_id filter is defense-in-depth.
 */
export async function GET(_req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const buildQuery = (withRun: boolean) => {
      const select = withRun
        ? `*, run:payroll_runs!payroll_run_id(id, month, year, status)`
        : '*'
      return supabaseAdmin
        .from('payslips')
        .select(select)
        .eq('employee_id', ctx.identityId)  // employees.id (compat layer)
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })
    }

    let { data, error: dbErr } = await buildQuery(true)
    if (dbErr && (dbErr.code === 'PGRST200' || dbErr.code === 'PGRST201' || dbErr.code === '42703')) {
      console.warn('[payslips/me] run join failed, retrying without:', dbErr.message)
      const retry = await buildQuery(false)
      data = retry.data; dbErr = retry.error
    }

    if (dbErr) {
      console.error('[payslips/me GET]', dbErr)
      if (dbErr.code === '42P01') return NextResponse.json({ data: [] })
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

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
