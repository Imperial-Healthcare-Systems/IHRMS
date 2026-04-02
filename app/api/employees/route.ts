import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const department_id = searchParams.get('department_id')
    const employment_type = searchParams.get('employment_type')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('employees')
      .select(`
        id, emp_id, first_name, last_name, email, phone, status, employment_type,
        hire_date, work_location, avatar_url, role, is_admin, ctc_annual,
        department:departments(id, name, code),
        designation:designations(id, title, grade),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name, emp_id)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (department_id) query = query.eq('department_id', department_id)
    if (employment_type) query = query.eq('employment_type', employment_type)
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,emp_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count, limit, offset })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { first_name, last_name, email, phone, department_id, designation_id,
            employment_type, hire_date, work_location, ctc_annual, basic_salary,
            hra, special_allowance, pf_contribution, pf_applicable, esic_applicable,
            pt_applicable, pan_number, aadhaar_number, tax_regime, reporting_manager_id,
            role, gender, date_of_birth } = body

    if (!first_name || !last_name || !email || !department_id || !hire_date) {
      return NextResponse.json({ error: 'Missing required fields: first_name, last_name, email, department_id, hire_date' }, { status: 400 })
    }

    // Auto-generate EMP ID
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin.from('employees').select('*', { count: 'exact', head: true })
    const seq = (count ?? 0) + 1
    const emp_id = `EMP/${year}/${String(seq).padStart(3, '0')}`

    // Calculate probation end date (6 months from hire)
    const hireDate = new Date(hire_date)
    const probation_end_date = new Date(hireDate.setMonth(hireDate.getMonth() + 6)).toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        emp_id, first_name, last_name, email, phone, department_id, designation_id,
        employment_type: employment_type ?? 'full_time', hire_date, work_location,
        status: 'probation', role: role ?? 'employee',
        ctc_annual: ctc_annual ?? 0, basic_salary: basic_salary ?? 0,
        hra: hra ?? 0, special_allowance: special_allowance ?? 0,
        pf_contribution: pf_contribution ?? 0,
        pf_applicable: pf_applicable ?? true, esic_applicable: esic_applicable ?? false,
        pt_applicable: pt_applicable ?? true, pan_number, aadhaar_number,
        tax_regime: tax_regime ?? 'new', reporting_manager_id,
        gender, date_of_birth, probation_end_date,
        is_admin: false, currency: 'INR',
      })
      .select()
      .single()
    if (error) throw error

    // Create probation review entry
    const probReviewDate = new Date(hire_date)
    probReviewDate.setMonth(probReviewDate.getMonth() + 6)
    const { error: probationReviewError } = await supabaseAdmin.from('probation_reviews').insert({
      employee_id: data.id,
      due_date: probReviewDate.toISOString().split('T')[0],
      outcome: 'pending',
    })

    if (probationReviewError) {
      console.error('Failed to create probation review', probationReviewError)
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
