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
    const status          = searchParams.get('status')
    const department_id   = searchParams.get('department_id')
    const employment_type = searchParams.get('employment_type')
    const search          = searchParams.get('search')
    const limit           = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)
    const offset          = parseInt(searchParams.get('offset') ?? '0')

    // ── Step 1: core employee query (only columns we know exist from auth-utils) ──
    let query = supabaseAdmin
      .from('employees')
      .select(
        'id, first_name, last_name, status, employment_type, work_location, avatar_url',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status)          query = query.eq('status', status)
    if (department_id)   query = query.eq('department_id', department_id)
    if (employment_type) query = query.eq('employment_type', employment_type)

    const { data: core, error: coreErr, count } = await query
    if (coreErr) {
      console.error('[employees GET] core query:', coreErr)
      return NextResponse.json({ error: errMsg(coreErr) }, { status: 500 })
    }

    if (!core || core.length === 0) {
      return NextResponse.json({ data: [], count: 0, limit, offset })
    }

    const ids = core.map(e => e.id)

    // ── Step 2: enrich with optional columns — each attempt independent ──
    type Extra = { id: string; emp_id?: string; email?: string; work_email?: string; phone?: string; personal_phone?: string; hire_date?: string; date_of_joining?: string; role?: string; is_admin?: boolean }
    const extraMap: Record<string, Extra> = {}

    // Try to get emp_id / role / is_admin (exist based on auth-utils)
    try {
      const { data: ids_data } = await supabaseAdmin
        .from('employees')
        .select('id, emp_id, role, is_admin')
        .in('id', ids)
      if (ids_data) ids_data.forEach(r => { extraMap[r.id] = { ...extraMap[r.id], ...r } })
    } catch { /* skip */ }

    // Try work_email / personal_phone / date_of_joining (schema column names)
    try {
      const { data: contact } = await supabaseAdmin
        .from('employees')
        .select('id, work_email, personal_phone, date_of_joining')
        .in('id', ids)
      if (contact) contact.forEach((r: Extra) => {
        extraMap[r.id] = {
          ...extraMap[r.id],
          email: r.work_email,
          phone: r.personal_phone,
          hire_date: r.date_of_joining,
        }
      })
    } catch { /* skip */ }

    // Try department join
    type EmpDept = { id: string; department_id?: string; department?: { id: string; name: string; code: string } | null }
    const deptMap: Record<string, EmpDept['department']> = {}
    try {
      const { data: depts } = await supabaseAdmin
        .from('employees')
        .select('id, department:departments(id, name, code)')
        .in('id', ids)
      if (depts) (depts as unknown as EmpDept[]).forEach(r => { deptMap[r.id] = r.department ?? null })
    } catch { /* skip */ }

    // Try designation join
    type EmpDesig = { id: string; designation?: { id: string; title: string; level?: number } | null }
    const desigMap: Record<string, { id: string; title: string; grade: string } | null> = {}
    try {
      const { data: desigs } = await supabaseAdmin
        .from('employees')
        .select('id, designation:designations(id, title, level)')
        .in('id', ids)
      if (desigs) (desigs as unknown as EmpDesig[]).forEach(r => {
        desigMap[r.id] = r.designation
          ? { id: r.designation.id, title: r.designation.title, grade: String(r.designation.level ?? '') }
          : null
      })
    } catch { /* skip */ }

    // ── Step 3: apply search filter ──
    let filtered = core
    if (search) {
      const q = search.toLowerCase()
      filtered = core.filter(e => {
        const ex = extraMap[e.id] ?? {}
        return (
          String(e.first_name ?? '').toLowerCase().includes(q) ||
          String(e.last_name  ?? '').toLowerCase().includes(q) ||
          String(ex.emp_id    ?? '').toLowerCase().includes(q) ||
          String(ex.email     ?? '').toLowerCase().includes(q)
        )
      })
    }

    // ── Step 4: assemble final response ──
    const data = filtered.map(e => {
      const ex = extraMap[e.id] ?? {}
      return {
        id:               e.id,
        emp_id:           ex.emp_id           ?? '',
        first_name:       e.first_name,
        last_name:        e.last_name,
        email:            ex.email             ?? '',
        phone:            ex.phone             ?? '',
        status:           e.status,
        employment_type:  e.employment_type,
        hire_date:        ex.hire_date         ?? '',
        work_location:    e.work_location      ?? '',
        avatar_url:       e.avatar_url         ?? null,
        role:             ex.role              ?? 'employee',
        is_admin:         ex.is_admin          ?? false,
        ctc_annual:       0,
        department:       deptMap[e.id]        ?? null,
        designation:      desigMap[e.id]       ?? null,
        reporting_manager: null,
      }
    })

    return NextResponse.json({ data, count: search ? data.length : (count ?? data.length), limit, offset })
  } catch (err: unknown) {
    console.error('[employees GET] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const {
      first_name, last_name, email, phone, department_id, designation_id,
      employment_type, hire_date, work_location, ctc_annual,
      pf_applicable, esic_applicable, pt_applicable,
      pan_number, aadhaar_number, tax_regime, reporting_manager_id,
      role, gender, date_of_birth,
    } = body

    if (!first_name || !last_name || !email || !department_id || !hire_date) {
      return NextResponse.json({
        error: 'Missing required fields: first_name, last_name, email, department_id, hire_date',
      }, { status: 400 })
    }

    // Auto-generate EMP ID
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin.from('employees').select('*', { count: 'exact', head: true })
    const seq = (count ?? 0) + 1
    const emp_id = `EMP/${year}/${String(seq).padStart(3, '0')}`

    // Probation end date — 6 months from joining
    const hireDate = new Date(hire_date)
    const probation_end_date = new Date(hire_date)
    probation_end_date.setMonth(hireDate.getMonth() + 6)

    const insertPayload: Record<string, unknown> = {
      employee_code: emp_id,
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`.trim(),
      department_id,
      employment_type: employment_type ?? 'full_time',
      status: 'active',
      work_location,
      pf_applicable:  pf_applicable  ?? true,
      esic_applicable: esic_applicable ?? false,
      pt_applicable:  pt_applicable  ?? true,
      pan_number,
      aadhaar_number,
      tax_regime: tax_regime ?? 'new',
      role:     role     ?? 'employee',
      is_admin: false,
      probation_end_date: probation_end_date.toISOString().split('T')[0],
      // Schema column names
      email,
      work_email:      email,
      personal_phone:  phone ?? null,
      date_of_joining: hire_date,
    }

    if (designation_id)      insertPayload.designation_id = designation_id
    if (reporting_manager_id) insertPayload.manager_id    = reporting_manager_id
    if (gender)              insertPayload.gender         = gender
    if (date_of_birth)       insertPayload.date_of_birth  = date_of_birth

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('[employees POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    // Create salary structure if CTC provided (non-critical)
    if (ctc_annual && data?.id) {
      const basic = Math.round(ctc_annual * 0.4 / 12)
      const hra   = Math.round(ctc_annual * 0.2 / 12)
      try {
        await supabaseAdmin.from('salary_structures').insert({
          employee_id: data.id,
          effective_from: hire_date,
          ctc_annual,
          basic_monthly: basic,
          hra_monthly: hra,
          special_allowance: Math.round(ctc_annual / 12) - basic - hra,
        })
      } catch { /* non-critical */ }
    }

    // Create probation review (non-critical)
    try {
      await supabaseAdmin.from('probation_reviews').insert({
        employee_id: data.id,
        due_date: probation_end_date.toISOString().split('T')[0],
        outcome: 'pending',
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[employees POST] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
