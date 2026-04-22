import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Vercel Cron: runs 1st of every month at 01:00 UTC
// Decision Gate #1: monthly accrual
// Accrual = total_days / 12 per leave type per active employee
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const year = new Date().getFullYear()

    // Fetch all active employees
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, org_id')
      .eq('status', 'active')

    if (empErr) throw empErr
    if (!employees?.length) return NextResponse.json({ ok: true, accrued: 0 })

    // Fetch all leave balance rows for current year
    const { data: balances, error: balErr } = await supabaseAdmin
      .from('leave_balances')
      .select('id, employee_id, leave_type, total_days, used_days, remaining_days')
      .eq('year', year)

    if (balErr) throw balErr

    const balMap = new Map<string, typeof balances extends (infer T)[] ? T : never>()
    for (const b of balances ?? []) {
      balMap.set(`${b.employee_id}:${b.leave_type}`, b)
    }

    const updates: { id: string; remaining_days: number }[] = []
    const monthlyAccrual = (totalDays: number) => Math.round((totalDays / 12) * 100) / 100

    for (const emp of employees) {
      // Find all leave balance rows for this employee
      for (const [key, bal] of balMap.entries()) {
        if (!key.startsWith(emp.id)) continue
        const accrual = monthlyAccrual(bal.total_days ?? 0)
        const newRemaining = Math.min(
          Number(bal.remaining_days ?? 0) + accrual,
          Number(bal.total_days ?? 0) // cap at total
        )
        updates.push({ id: bal.id, remaining_days: newRemaining })
      }
    }

    // Batch update
    let accrued = 0
    for (const u of updates) {
      const { error } = await supabaseAdmin
        .from('leave_balances')
        .update({ remaining_days: u.remaining_days })
        .eq('id', u.id)
      if (!error) accrued++
    }

    return NextResponse.json({ ok: true, accrued, month: new Date().toISOString().slice(0, 7) })
  } catch (err) {
    console.error('[cron/leave-accrual]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Cron failed' }, { status: 500 })
  }
}
