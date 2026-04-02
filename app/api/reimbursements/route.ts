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
    const status      = searchParams.get('status')
    const month       = searchParams.get('month')
    const year        = searchParams.get('year')
    const manager_id  = searchParams.get('manager_id')  // for team view
    const limit       = parseInt(searchParams.get('limit') ?? '50')
    const offset      = parseInt(searchParams.get('offset') ?? '0')

    const sessionUserId  = (session.user as any)?.id
    const sessionIsAdmin = (session.user as any)?.isAdmin

    let query = supabaseAdmin
      .from('expense_claims')
      .select(`
        id, claim_date, category, description, amount, currency,
        receipt_urls, status, rejection_note, paid_at, payment_ref,
        approved_at,
        employee:employees!expense_claims_employee_id_fkey(
          id, first_name, last_name, emp_id, work_email,
          department:departments(id, name),
          manager:employees!employees_manager_id_fkey(id, first_name, last_name, emp_id)
        ),
        approved_by:employees!expense_claims_approved_by_fkey(
          id, first_name, last_name, emp_id
        ),
        created_at, updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Scope: HR admin sees all; managers see team; employees see own
    if (!sessionIsAdmin) {
      if (manager_id && manager_id === sessionUserId) {
        // Team view: fetch employees under this manager
        const { data: teamMembers } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('manager_id', manager_id)
        const teamIds = (teamMembers ?? []).map((e: { id: string }) => e.id)
        if (teamIds.length > 0) {
          query = query.in('employee_id', teamIds)
        } else {
          return NextResponse.json({ data: [], count: 0 })
        }
      } else {
        // Regular employee: see own claims only
        query = query.eq('employee_id', sessionUserId)
      }
    }

    if (employee_id && sessionIsAdmin) query = query.eq('employee_id', employee_id)
    if (status)                         query = query.eq('status', status)

    // Filter by month/year using claim_date
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
    if (error) throw error

    return NextResponse.json({ data, count, limit, offset })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      category,
      description,
      amount,
      month,
      year,
      receipt_url,
    } = body

    if (!category || !description || !amount || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: category, description, amount, month, year' },
        { status: 400 }
      )
    }

    const employeeId = (session.user as any)?.id
    if (!employeeId) {
      return NextResponse.json({ error: 'Could not resolve employee from session' }, { status: 401 })
    }

    const yearNum  = parseInt(year)
    const monthNum = parseInt(month)

    // Auto-generate claim number: CLM/YEAR/SEQ
    const { count: existingCount } = await supabaseAdmin
      .from('expense_claims')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${yearNum}-01-01`)
      .lte('created_at', `${yearNum}-12-31`)

    const seq         = (existingCount ?? 0) + 1
    const claim_number = `CLM/${yearNum}/${String(seq).padStart(4, '0')}`

    // claim_date: first day of the given month/year
    const claim_date = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`

    const { data, error } = await supabaseAdmin
      .from('expense_claims')
      .insert({
        employee_id: employeeId,
        claim_date,
        category,
        description: `[${claim_number}] ${description}`,
        amount: parseFloat(amount),
        currency: 'INR',
        receipt_urls: receipt_url ? [receipt_url] : null,
        status: 'submitted',   // schema enum: draft→submitted→approved/rejected→paid
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, claim_number }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
