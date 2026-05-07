import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')
    const month       = searchParams.get('month')
    const year        = searchParams.get('year')
    const manager_id  = searchParams.get('manager_id')
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset      = parseInt(searchParams.get('offset') ?? '0')

    const sessionIsAdmin = HR_ROLES.includes(ctx.role)

    // Plain SELECT * + simple employee join without explicit FK names
    let query = supabaseAdmin
      .from('expense_claims')
      .select(`
        *,
        employee:employees!expense_claims_employee_id_fkey(
          id, first_name, last_name, emp_id, email,
          department:departments!employees_department_id_fkey(id, name)
        )
      `, { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Scope: HR admin sees all; managers see team; employees see own
    if (!sessionIsAdmin) {
      if (manager_id && manager_id === ctx.identityId) {
        const { data: teamMembers } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('org_id', ctx.orgId)
          .eq('manager_id', manager_id)
        const teamIds = (teamMembers ?? []).map((e: { id: string }) => e.id)
        if (teamIds.length > 0) {
          query = query.in('employee_id', teamIds)
        } else {
          return NextResponse.json({ data: [], count: 0 })
        }
      } else {
        query = query.eq('employee_id', ctx.identityId)
      }
    }

    if (employee_id && sessionIsAdmin) query = query.eq('employee_id', employee_id)
    if (status)                         query = query.eq('status', status)

    if (year && month) {
      const monthNum  = parseInt(month)
      const yearNum   = parseInt(year)
      const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`
      const endDay    = new Date(yearNum, monthNum, 0).getDate()
      const endDate   = `${yearNum}-${String(monthNum).padStart(2, '0')}-${endDay}`
      query = query.gte('claim_date', startDate).lte('claim_date', endDate)
    } else if (year) {
      query = query.gte('claim_date', `${year}-01-01`).lte('claim_date', `${year}-12-31`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[reimbursements GET]', error)
      // If table or relationship doesn't exist yet, return empty gracefully
      const msg = errMsg(error)
      if (msg.includes('does not exist') || msg.includes('PGRST') || msg.includes('relation')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err: unknown) {
    console.error('[reimbursements GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { category: rawCategory, description, amount, month, year, receipt_url } = body

    if (!rawCategory || !description || !amount || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: category, description, amount, month, year' },
        { status: 400 }
      )
    }

    // Normalise to lowercase DB values (UI sends Title-cased display names)
    const CATEGORY_MAP: Record<string, string> = {
      travel: 'travel', accommodation: 'accommodation', food: 'food',
      'food & meals': 'food', stay: 'accommodation',
      client_entertainment: 'client_entertainment', 'client entertainment': 'client_entertainment',
      communication: 'communication', telecom: 'communication',
      training: 'training', medical: 'medical',
      equipment: 'equipment', other: 'other',
    }
    const category = CATEGORY_MAP[String(rawCategory).toLowerCase()] ?? 'other'

    const yearNum  = parseInt(year)
    const monthNum = parseInt(month)

    // Auto-generate claim number: CLM/YEAR/SEQ (org-scoped sequence)
    const { count: existingCount } = await supabaseAdmin
      .from('expense_claims')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .gte('created_at', `${yearNum}-01-01`)
      .lte('created_at', `${yearNum}-12-31`)

    const seq          = (existingCount ?? 0) + 1
    const claim_number = `CLM/${yearNum}/${String(seq).padStart(4, '0')}`
    const claim_date   = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`

    const insertPayload: Record<string, unknown> = {
      employee_id: ctx.identityId,
      org_id:      ctx.orgId,
      claim_date,
      category,
      expense_type: category,
      description: `[${claim_number}] ${description}`,
      amount: parseFloat(amount),
      currency: 'INR',
      status: 'pending',
    }
    if (receipt_url) insertPayload.receipt_urls = [receipt_url]

    const { data, error } = await supabaseAdmin
      .from('expense_claims')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('[reimbursements POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data, claim_number }, { status: 201 })
  } catch (err: unknown) {
    console.error('[reimbursements POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
