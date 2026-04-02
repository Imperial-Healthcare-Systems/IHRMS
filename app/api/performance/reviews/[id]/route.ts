import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('performance_reviews')
      .select(`
        id, cycle, review_period_from, review_period_to,
        self_rating, manager_rating, final_rating,
        kra_scores, goals, strengths, areas_of_improvement,
        training_needs, promotion_recommended, increment_recommended,
        status, employee_acknowledged_at,
        employee:employees!performance_reviews_employee_id_fkey(
          id, first_name, last_name, emp_id, work_email, avatar_url,
          department:departments(id, name),
          designation:designations(id, title)
        ),
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          id, first_name, last_name, emp_id, work_email
        ),
        created_at, updated_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Performance review not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { status, ...rest } = body

    // Fetch current review for validation
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('performance_reviews')
      .select('id, status, self_rating, manager_rating, final_rating')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Performance review not found' }, { status: 404 })
      throw fetchError
    }

    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    }

    if (status) {
      if (status === 'submitted') {
        // Validate that at least one rating is set
        const incomingRating = rest.self_rating ?? rest.manager_rating ?? rest.final_rating
        const existingRating = current.self_rating ?? current.manager_rating ?? current.final_rating
        if (!incomingRating && !existingRating) {
          return NextResponse.json(
            { error: 'Cannot submit review without a rating. Set self_rating, manager_rating or final_rating first.' },
            { status: 422 }
          )
        }
      }

      if (status === 'completed') {
        // Set acknowledged timestamp when marking completed
        updatePayload.employee_acknowledged_at = new Date().toISOString()
      }

      updatePayload.status = status
    }

    const { data, error } = await supabaseAdmin
      .from('performance_reviews')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
