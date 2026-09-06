import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { toCurrencyString, toDecimal, divide } from '@/lib/money'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'payroll_admin']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')

    let query = supabaseAdmin
      .from('salary_structures')
      .select('*')
      .eq('org_id', ctx.orgId)
      .order('effective_from', { ascending: false })

    if (employee_id) query = query.eq('employee_id', employee_id)

    const { data, error: dbErr } = await query

    if (dbErr) {
      const msg = String(dbErr.message ?? '')
      if (msg.includes('does not exist') || msg.includes('PGRST')) {
        console.warn('[salary-structures GET] table not ready:', msg)
        return NextResponse.json({ data: [] })
      }
      console.error('[salary-structures GET]', dbErr)
      throw dbErr
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    console.error('[salary-structures GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const {
      employee_id, effective_from, effective_to,
      ctc_annual, basic, hra, conveyance, medical_allowance,
      special_allowance, lta, pf_employer, esic_employer, remarks,
    } = body

    if (!employee_id || !effective_from || !ctc_annual || !basic) {
      return NextResponse.json(
        { error: 'employee_id, effective_from, ctc_annual and basic are required' },
        { status: 400 }
      )
    }

    // Cross-tenant guard: confirm the target employee belongs to this org
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()
    if (!emp) {
      return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    // Decimal-precision money math — keeps salary components lossless and
    // ctc_monthly = ctc_annual / 12 properly rounded to paise (not whole rupees).
    const ctcAnnualD = toDecimal(ctc_annual)
    const ctcMonthlyStr = toCurrencyString(divide(ctcAnnualD, 12))

    const insertPayload: Record<string, unknown> = {
      org_id:               ctx.orgId,             // canonical — from JWT
      employee_id,
      effective_from,
      effective_to:         effective_to || null,
      ctc_annual:           toCurrencyString(ctcAnnualD),
      ctc_monthly:          ctcMonthlyStr,
      basic_monthly:        toCurrencyString(basic),
      hra_monthly:          toCurrencyString(hra),
      special_allowance:    toCurrencyString(special_allowance),
      conveyance_allowance: toCurrencyString(conveyance),
      medical_allowance:    toCurrencyString(medical_allowance),
      lta_monthly:          toCurrencyString(lta),
      employer_pf:          toCurrencyString(pf_employer),
      employer_esic:        toCurrencyString(esic_employer),
      is_active:            true,
      remarks:              remarks || null,
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('salary_structures')
      .upsert(insertPayload, { onConflict: 'employee_id,effective_from', ignoreDuplicates: false })
      .select()
      .single()

    if (dbErr) { console.error('[salary-structures POST]', dbErr); throw dbErr }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[salary-structures POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
