import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id  = searchParams.get('employee_id')
    const reviewer_id  = searchParams.get('reviewer_id')
    const review_type  = searchParams.get('review_type')   // maps to 'cycle' in schema
    const status       = searchParams.get('status')
    const year         = searchParams.get('year')
    const limit        = parseInt(searchParams.get('limit') ?? '50')
    const offset       = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('performance_reviews')
      .select(`
        id, cycle, review_period_from, review_period_to,
        self_rating, manager_rating, final_rating,
        kra_scores, goals, strengths, areas_of_improvement,
        training_needs, promotion_recommended, increment_recommended,
        status, employee_acknowledged_at,
        employee:employees!performance_reviews_employee_id_fkey(
          id, first_name, last_name, emp_id, work_email,
          department:departments(id, name),
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

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (reviewer_id) query = query.eq('reviewer_id', reviewer_id)
    if (review_type) query = query.eq('cycle', review_type)
    if (status)      query = query.eq('status', status)
    if (year) {
      query = query
        .gte('review_period_from', `${year}-01-01`)
        .lte('review_period_to', `${year}-12-31`)
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
      employee_id,
      reviewer_id,
      period_start,
      period_end,
      review_type,
      goals,
      kra_scores,
      training_needs,
    } = body

    if (!employee_id || !reviewer_id || !period_start || !period_end || !review_type) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, reviewer_id, period_start, period_end, review_type' },
        { status: 400 }
      )
    }

    const validCycles = ['annual', 'half_yearly', 'quarterly', 'probation', 'pip']
    if (!validCycles.includes(review_type)) {
      return NextResponse.json(
        { error: `review_type must be one of: ${validCycles.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('performance_reviews')
      .insert({
        employee_id,
        reviewer_id,
        review_period_from: period_start,
        review_period_to: period_end,
        cycle: review_type,
        status: 'draft',
        goals: goals ?? [],
        kra_scores: kra_scores ?? {},
        training_needs: training_needs ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
