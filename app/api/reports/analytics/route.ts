import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PALETTE = ['#1E3A5F','#E8622A','#1A7A4A','#7C3AED','#0369A1','#BE185D','#0F766E','#B45309']

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    // ── 1. Active employees + department breakdown ──
    const { data: empData, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, status, department:departments!employees_department_id_fkey(id, name)')
      .eq('org_id', ctx.orgId)
      .neq('status', 'terminated')

    if (empErr) {
      const msg = errMsg(empErr)
      // Graceful fallback for schema issues
      if (msg.includes('does not exist') || msg.includes('PGRST')) {
        return NextResponse.json({
          headcount_trend: [], payroll_trend: [],
          department_distribution: [], total_active: 0,
        })
      }
      console.error('[analytics GET] employees:', empErr)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const totalActive = (empData ?? []).length

    // Department distribution
    const deptMap: Record<string, { name: string; count: number; idx: number }> = {}
    let deptIdx = 0
    for (const emp of empData ?? []) {
      const dept = emp.department as { id?: string; name?: string } | null
      const deptId = dept?.id ?? '__unknown__'
      const deptName = dept?.name ?? 'Unknown'
      if (!deptMap[deptId]) deptMap[deptId] = { name: deptName, count: 0, idx: deptIdx++ }
      deptMap[deptId].count++
    }
    const departmentDistribution = Object.values(deptMap)
      .sort((a, b) => b.count - a.count)
      .map(d => ({
        dept:  d.name,
        count: d.count,
        pct:   totalActive > 0 ? Math.round((d.count / totalActive) * 1000) / 10 : 0,
        color: PALETTE[d.idx % PALETTE.length],
      }))

    // ── 2. Payroll trend from payroll_runs (last 6 months) ──
    const { data: runs, error: runErr } = await supabaseAdmin
      .from('payroll_runs')
      .select('month, year, total_employees, total_net, status')
      .eq('org_id', ctx.orgId)
      .order('year',  { ascending: false })
      .order('month', { ascending: false })
      .limit(12)

    let headcountTrend: { month: string; value: number }[] = []
    let payrollTrend:   { month: string; value: number; label: string }[] = []

    if (!runErr && runs && runs.length > 0) {
      // Reverse so oldest is first, take last 6
      const last6 = [...runs].reverse().slice(-6)
      headcountTrend = last6.map(r => ({
        month: MONTH_NAMES[(r.month as number) - 1],
        value: (r.total_employees as number) ?? totalActive,
      }))
      payrollTrend = last6.map(r => {
        const netLakhs = ((r.total_net as number) ?? 0) / 100000
        return {
          month: MONTH_NAMES[(r.month as number) - 1],
          value: netLakhs,
          label: netLakhs > 0 ? `₹${netLakhs.toFixed(1)}L` : '₹0L',
        }
      })
    } else {
      // Fallback: build 6-month grid with current headcount
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        headcountTrend.push({ month: MONTH_NAMES[d.getMonth()], value: totalActive })
        payrollTrend.push({ month: MONTH_NAMES[d.getMonth()], value: 0, label: '₹0L' })
      }
    }

    return NextResponse.json({
      headcount_trend:       headcountTrend,
      payroll_trend:         payrollTrend,
      department_distribution: departmentDistribution,
      total_active:          totalActive,
    })
  } catch (err) {
    console.error('[analytics GET]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
