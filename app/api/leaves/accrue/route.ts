import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_ROLES = ['super_admin', 'hr_admin', 'admin', 'hr']

interface LeavePolicyRow {
  code: string
  name: string
  annualDays: number | null
  monthlyRate: number | null
  accrualType: string
  carryFwdMax: number
  paid: boolean
  encashable: boolean
  active: boolean
}

const DEFAULT_POLICY: LeavePolicyRow[] = [
  { code: 'CL',          name: 'Casual Leave',      annualDays: 12,  monthlyRate: null, accrualType: 'monthly',  carryFwdMax: 0,  paid: true,  encashable: false, active: true },
  { code: 'SL',          name: 'Sick Leave',         annualDays: 12,  monthlyRate: null, accrualType: 'monthly',  carryFwdMax: 3,  paid: true,  encashable: false, active: true },
  { code: 'EL',          name: 'Earned Leave',       annualDays: 15,  monthlyRate: 1.25, accrualType: 'monthly',  carryFwdMax: 30, paid: true,  encashable: true,  active: true },
  { code: 'LOP',         name: 'Loss of Pay',        annualDays: null,monthlyRate: null, accrualType: 'none',     carryFwdMax: 0,  paid: false, encashable: false, active: true },
  { code: 'ML',          name: 'Maternity Leave',    annualDays: 182, monthlyRate: null, accrualType: 'upfront',  carryFwdMax: 0,  paid: true,  encashable: false, active: true },
  { code: 'PL',          name: 'Paternity Leave',    annualDays: 15,  monthlyRate: null, accrualType: 'upfront',  carryFwdMax: 0,  paid: true,  encashable: false, active: true },
  { code: 'CompOff',     name: 'Compensatory Off',   annualDays: null,monthlyRate: null, accrualType: 'on_event', carryFwdMax: 2,  paid: true,  encashable: false, active: true },
  { code: 'Bereavement', name: 'Bereavement Leave',  annualDays: 3,   monthlyRate: null, accrualType: 'on_event', carryFwdMax: 0,  paid: true,  encashable: false, active: true },
]

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = ((session.user as Record<string, unknown>)?.role as string) ?? 'employee'
    if (!ADMIN_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden — only HR Admin or Super Admin can run accrual' }, { status: 403 })
    }

    // Load saved leave policy (falls back to defaults)
    let policy: LeavePolicyRow[] = DEFAULT_POLICY
    try {
      const { data: setting } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', 'leave_policy')
        .maybeSingle()
      if (setting && Array.isArray(setting.value)) policy = setting.value as LeavePolicyRow[]
    } catch { /* use defaults */ }

    // Only process monthly-accrual leave types that are active
    const monthlyTypes = policy.filter(lt => lt.accrualType === 'monthly' && lt.active)
    if (!monthlyTypes.length) {
      return NextResponse.json({ success: true, message: 'No monthly-accrual leave types configured', updatedCount: 0 })
    }

    // Get all active employees
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('status', 'active')
    if (empErr) throw empErr

    const year = new Date().getFullYear()
    const monthName = new Date().toLocaleString('en-IN', { month: 'long' })
    let updatedCount = 0
    const errors: string[] = []

    for (const emp of employees ?? []) {
      for (const lt of monthlyTypes) {
        const rate = lt.monthlyRate !== null
          ? lt.monthlyRate
          : lt.annualDays ? Math.round((lt.annualDays / 12) * 100) / 100 : 0
        if (!rate) continue

        try {
          const { data: rows } = await supabaseAdmin
            .from('leave_balances')
            .select('id, accrued, closing_balance')
            .eq('employee_id', emp.id)
            .eq('leave_type', lt.code)
            .eq('year', year)
            .limit(1)

          const existing = rows?.[0] ?? null
          const maxBalance = (lt.annualDays ?? 9999) + (lt.carryFwdMax ?? 0)

          if (existing) {
            const newAccrued  = Math.round(((existing.accrued ?? 0) + rate) * 100) / 100
            const newClosing  = Math.min(Math.round(((existing.closing_balance ?? 0) + rate) * 100) / 100, maxBalance)
            await supabaseAdmin
              .from('leave_balances')
              .update({ accrued: newAccrued, closing_balance: newClosing })
              .eq('id', existing.id)
          } else {
            const initial = Math.min(rate, maxBalance)
            await supabaseAdmin
              .from('leave_balances')
              .insert({
                employee_id:     emp.id,
                leave_type:      lt.code,
                year,
                opening_balance: 0,
                accrued:         rate,
                availed:         0,
                carry_forward:   0,
                closing_balance: initial,
              })
          }
          updatedCount++
        } catch (err) {
          errors.push(`${emp.id}/${lt.code}: ${err instanceof Error ? err.message : 'error'}`)
        }
      }
    }

    // Persist last-run metadata
    try {
      await supabaseAdmin.from('app_settings').upsert({
        key: 'leave_accrual_last_run',
        value: { timestamp: new Date().toISOString(), employeeCount: employees?.length ?? 0, updatedCount, month: monthName, year },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
    } catch { /* non-fatal */ }

    return NextResponse.json({
      success: true,
      month: monthName,
      year,
      employeeCount: employees?.length ?? 0,
      updatedCount,
      ...(errors.length ? { errors } : {}),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
