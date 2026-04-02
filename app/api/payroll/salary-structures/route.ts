import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')

    let query = supabaseAdmin
      .from('salary_structures')
      .select(`
        id, effective_from, effective_to, ctc_annual, ctc_monthly,
        basic_monthly, hra_monthly, special_allowance, conveyance_allowance,
        medical_allowance, lta_monthly, other_allowances,
        employer_pf, employer_esic, employer_gratuity,
        is_active, remarks,
        employee:employees!salary_structures_employee_id_fkey(
          id, first_name, last_name, work_email,
          department:departments(id, name),
          designation:designations(id, title)
        ),
        approved_by:employees!salary_structures_approved_by_fkey(id, first_name, last_name),
        created_at, updated_at
      `)
      .order('effective_from', { ascending: false })

    if (employee_id) query = query.eq('employee_id', employee_id)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const {
      employee_id,
      effective_from,
      ctc_annual,
      basic,
      hra,
      conveyance,
      medical_allowance,
      special_allowance,
      lta,
      pf_employee,
      pf_employer,
      esic_employee,
      esic_employer,
      professional_tax,
      tds,
      effective_to,
      remarks,
    } = body

    if (!employee_id || !effective_from || !ctc_annual || !basic) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, effective_from, ctc_annual, basic' },
        { status: 400 }
      )
    }

    const approvedById = (session.user as any)?.id ?? null

    // Store additional deduction components (pf_employee, esic_employee, pt, tds) in other_allowances
    // or as separate tracking — map to schema columns where possible
    const insertPayload = {
      employee_id,
      effective_from,
      effective_to: effective_to ?? null,
      ctc_annual: parseFloat(ctc_annual),
      basic_monthly: parseFloat(basic),
      hra_monthly: parseFloat(hra ?? 0),
      conveyance_allowance: parseFloat(conveyance ?? 0),
      medical_allowance: parseFloat(medical_allowance ?? 0),
      special_allowance: parseFloat(special_allowance ?? 0),
      lta_monthly: parseFloat(lta ?? 0),
      employer_pf: parseFloat(pf_employer ?? 0),
      employer_esic: parseFloat(esic_employer ?? 0),
      // Store employee-side deductions and TDS in other_allowances as metadata
      other_allowances: {
        pf_employee: parseFloat(pf_employee ?? 0),
        esic_employee: parseFloat(esic_employee ?? 0),
        professional_tax: parseFloat(professional_tax ?? 0),
        tds: parseFloat(tds ?? 0),
      },
      is_active: true,
      approved_by: approvedById,
      remarks: remarks ?? null,
    }

    // Upsert based on employee_id + effective_from
    const { data, error } = await supabaseAdmin
      .from('salary_structures')
      .upsert(insertPayload, {
        onConflict: 'employee_id,effective_from',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
