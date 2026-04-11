import { NextResponse } from 'next/server'
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

function isPgrstErr(msg: string) {
  return (
    msg.includes('does not exist') || msg.includes('PGRST') ||
    msg.includes('Could not find') || msg.includes('ambiguous')
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safe(fn: () => any): Promise<unknown[]> {
  const { data, error } = await fn()
  if (error) {
    const msg = errMsg(error)
    if (isPgrstErr(msg)) { console.warn('[compliance/summary] schema error:', msg); return [] }
    throw new Error(msg)
  }
  return (data as unknown[]) ?? []
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear  = now.getFullYear()

    // ── 1. Total active employees (EPF enrolled = all active) ──
    const employees = await safe(() =>
      supabaseAdmin.from('employees').select('id, status').neq('status', 'terminated')
    )
    const totalActive = employees.length

    // ── 2. ESIC eligible from latest payslips (gross ≤ 21000) ──
    // Get most recent month payslips to count ESIC eligible
    const esicRows = await safe(() =>
      supabaseAdmin
        .from('payslips')
        .select('id, gross_earnings')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .lte('gross_earnings', 21000)
        .limit(2000)
    )

    // If no payslips for current month, try previous month
    let esicEligible = esicRows.length
    if (esicEligible === 0) {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const prevYear  = currentMonth === 1 ? currentYear - 1 : currentYear
      const prev = await safe(() =>
        supabaseAdmin
          .from('payslips')
          .select('id, gross_earnings')
          .eq('year', prevYear)
          .eq('month', prevMonth)
          .lte('gross_earnings', 21000)
          .limit(2000)
      )
      esicEligible = prev.length
    }

    // ── 3. Statutory compliance stats ──
    const statRecords = await safe(() =>
      supabaseAdmin
        .from('statutory_compliance')
        .select('id, status, due_date, period_year, period_month')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(100)
    )

    let compliantCount   = 0
    let actionRequired   = 0
    let dueThisMonth     = 0

    if (statRecords.length > 0) {
      for (const r of statRecords as Array<{ status: string; due_date?: string; period_year?: number; period_month?: number }>) {
        if (r.status === 'paid' || r.status === 'filed') compliantCount++
        else if (r.status === 'pending' || r.status === 'overdue') actionRequired++

        if (r.due_date) {
          const d = new Date(r.due_date)
          if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) dueThisMonth++
        }
      }
    } else {
      // Fallback: compute from known statutory calendar
      // EPF, ESIC due 15th; PT due 30th; TDS Q4 due May 31
      const filings = [
        { due: new Date(currentYear, currentMonth - 1, 15) }, // EPF
        { due: new Date(currentYear, currentMonth - 1, 15) }, // ESIC
        { due: new Date(currentYear, currentMonth - 1, 30) }, // PT
      ]
      dueThisMonth = filings.filter(f => f.due.getMonth() + 1 === currentMonth).length
    }

    // ── 4. Current month payslip EPF/ESIC totals ──
    const payslipTotals = await safe(() =>
      supabaseAdmin
        .from('payslips')
        .select('employee_pf, employee_esic, professional_tax, tds, gross_earnings')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .limit(2000)
    )

    // If no current month, try previous
    let totals = payslipTotals
    if (totals.length === 0) {
      const pm = currentMonth === 1 ? 12 : currentMonth - 1
      const py = currentMonth === 1 ? currentYear - 1 : currentYear
      totals = await safe(() =>
        supabaseAdmin
          .from('payslips')
          .select('employee_pf, employee_esic, professional_tax, tds, gross_earnings')
          .eq('year', py)
          .eq('month', pm)
          .limit(2000)
      )
    }

    let totalEpfEmployee = 0, totalEpfEmployer = 0
    let totalEsicEmployee = 0, totalEsicEmployer = 0
    let totalPt = 0, totalTds = 0, totalGross = 0
    for (const r of totals as Array<{ employee_pf?: number; employee_esic?: number; professional_tax?: number; tds?: number; gross_earnings?: number }>) {
      totalEpfEmployee  += r.employee_pf      ?? 0
      totalEpfEmployer  += r.employee_pf      ?? 0 // employer = same as employee for ECR
      totalEsicEmployee += r.employee_esic    ?? 0
      totalEsicEmployer += Math.round(((r.gross_earnings ?? 0) <= 21000 ? (r.gross_earnings ?? 0) * 0.0325 : 0))
      totalPt           += r.professional_tax ?? 0
      totalTds          += r.tds              ?? 0
      totalGross        += r.gross_earnings   ?? 0
    }

    return NextResponse.json({
      total_active:     totalActive,
      esic_eligible:    esicEligible,
      compliant_count:  compliantCount || (dueThisMonth > 0 ? 0 : Math.max(statRecords.length - actionRequired, 0)),
      action_required:  actionRequired,
      due_this_month:   dueThisMonth,
      current_month: currentMonth,
      current_year:  currentYear,
      payslip_count: totals.length,
      totals: {
        epf_employee:  totalEpfEmployee,
        epf_employer:  totalEpfEmployer,
        esic_employee: totalEsicEmployee,
        esic_employer: totalEsicEmployer,
        pt:            totalPt,
        tds:           totalTds,
        gross:         totalGross,
      },
    })
  } catch (err) {
    console.error('[compliance/summary]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
