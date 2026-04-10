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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')

    let query = supabaseAdmin
      .from('salary_structures')
      .select('*')
      .order('effective_from', { ascending: false })

    if (employee_id) query = query.eq('employee_id', employee_id)

    const { data, error } = await query

    // If table doesn't exist yet, return empty array instead of 500
    if (error) {
      const msg = String(error.message ?? '')
      if (msg.includes('does not exist') || msg.includes('PGRST')) {
        console.warn('[salary-structures GET] table not ready:', msg)
        return NextResponse.json({ data: [] })
      }
      console.error('[salary-structures GET]', error)
      throw error
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    console.error('[salary-structures GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
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

    const basicN        = parseFloat(basic)       || 0
    const hraN          = parseFloat(hra)          || 0
    const conveyanceN   = parseFloat(conveyance)   || 0
    const medN          = parseFloat(medical_allowance) || 0
    const specialN      = parseFloat(special_allowance) || 0
    const ltaN          = parseFloat(lta)          || 0
    const ctcAnnualN    = parseFloat(ctc_annual)   || 0
    const empPfN        = parseFloat(pf_employer)  || 0
    const empEsicN      = parseFloat(esic_employer)|| 0

    const ctcMonthly = Math.round(ctcAnnualN / 12)

    // Only insert columns that definitively exist in the live schema
    const insertPayload: Record<string, unknown> = {
      employee_id,
      effective_from,
      effective_to:         effective_to || null,
      ctc_annual:           ctcAnnualN,
      ctc_monthly:          ctcMonthly,
      basic_monthly:        basicN,
      hra_monthly:          hraN,
      special_allowance:    specialN,
      conveyance_allowance: conveyanceN,
      medical_allowance:    medN,
      lta_monthly:          ltaN,
      employer_pf:          empPfN,
      employer_esic:        empEsicN,
      is_active:            true,
      remarks:              remarks || null,
    }

    const { data, error } = await supabaseAdmin
      .from('salary_structures')
      .upsert(insertPayload, { onConflict: 'employee_id,effective_from', ignoreDuplicates: false })
      .select()
      .single()

    if (error) { console.error('[salary-structures POST]', error); throw error }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[salary-structures POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
