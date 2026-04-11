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
    const employee_id  = searchParams.get('employee_id')
    const reviewer_id  = searchParams.get('reviewer_id')
    const cycle_id     = searchParams.get('cycle_id')
    const cycle_type   = searchParams.get('cycle_type')
    const status       = searchParams.get('status')
    const year         = searchParams.get('year')
    const limit        = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset       = parseInt(searchParams.get('offset') ?? '0')

    const sessionUserId = (session.user as Record<string, unknown>)?.id as string | undefined
    const isAdmin       = (session.user as Record<string, unknown>)?.isAdmin as boolean | undefined

    let query = supabaseAdmin
      .from('performance_reviews')
      .select(`
        id, cycle, cycle_id, review_period_from, review_period_to,
        self_rating, manager_rating, final_rating,
        kra_scores, goals, next_goals, strengths, areas_of_improvement,
        training_needs, promotion_recommended, increment_recommended,
        manager_comments, status, employee_acknowledged_at,
        employee:employees!performance_reviews_employee_id_fkey(
          id, first_name, last_name, emp_id, email,
          department:departments!employees_department_id_fkey(id, name),
          designation:designations(id, title)
        ),
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          id, first_name, last_name, emp_id
        ),
        created_at, updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Scope: non-admins see reviews where they are employee or reviewer
    if (!isAdmin) {
      query = query.or(`employee_id.eq.${sessionUserId},reviewer_id.eq.${sessionUserId}`)
    }

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (reviewer_id) query = query.eq('reviewer_id', reviewer_id)
    if (cycle_id)    query = query.eq('cycle_id', cycle_id)
    if (cycle_type)  query = query.eq('cycle', cycle_type)
    if (status)      query = query.eq('status', status)
    if (year) {
      query = query
        .gte('review_period_from', `${year}-01-01`)
        .lte('review_period_to', `${year}-12-31`)
    }

    const { data, error, count } = await query
    if (error) {
      const msg = errMsg(error)
      if (msg.includes('does not exist') || msg.includes('PGRST')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[reviews GET]', error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[reviews GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { employee_id, reviewer_id, period_from, period_to, cycle_type, cycle_id, goals, kra_scores, training_needs } = body

    if (!employee_id || !reviewer_id || !period_from || !period_to || !cycle_type) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, reviewer_id, period_from, period_to, cycle_type' },
        { status: 400 }
      )
    }

    const VALID_CYCLES = ['annual', 'half_yearly', 'quarterly', 'probation', 'pip']
    if (!VALID_CYCLES.includes(cycle_type)) {
      return NextResponse.json({ error: `cycle_type must be one of: ${VALID_CYCLES.join(', ')}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('performance_reviews')
      .insert({
        employee_id,
        reviewer_id,
        review_period_from: period_from,
        review_period_to:   period_to,
        cycle:              cycle_type,
        cycle_id:           cycle_id ?? null,
        status:             'draft',
        goals:              goals ?? [],
        kra_scores:         kra_scores ?? {},
        training_needs:     training_needs ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('[reviews POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[reviews POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
