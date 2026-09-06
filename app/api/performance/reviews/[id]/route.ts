import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActiveEmployee } from '@/lib/employee-context'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('performance_reviews')
      .select(`
        id, cycle, cycle_id, review_period_start, review_period_end,
        self_rating, manager_rating, final_rating,
        kra_scores, goals, next_goals, strengths, areas_of_improvement,
        training_needs, promotion_recommended, increment_recommended,
        manager_comments, status, employee_acknowledged_at,
        employee:employees!performance_reviews_employee_id_fkey(
          id, first_name, last_name, emp_id, email, avatar_url,
          department:departments!employees_department_id_fkey(id, name),
          designation:designations(id, title)
        ),
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          id, first_name, last_name, emp_id
        ),
        created_at, updated_at
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      console.error('[reviews GET id]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { status, ...rest } = body

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('performance_reviews')
      .select('id, status, self_rating, manager_rating, final_rating, employee_id, reviewer_id')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      throw fetchError
    }

    const isHr = HR_ROLES.includes(ctx.role)
    let isParticipant = false
    if (!isHr) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      isParticipant = !!me && (current.employee_id === me.id || current.reviewer_id === me.id)
    }

    if (!isHr && !isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatePayload: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

    if (status) {
      if (status === 'submitted') {
        const incomingRating = rest.self_rating ?? rest.manager_rating ?? rest.final_rating
        const existingRating = current.self_rating ?? current.manager_rating ?? current.final_rating
        if (!incomingRating && !existingRating) {
          return NextResponse.json(
            { error: 'Cannot submit without at least one rating (self_rating, manager_rating, or final_rating).' },
            { status: 422 }
          )
        }
      }
      if (status === 'acknowledged' || status === 'completed') {
        updatePayload.employee_acknowledged_at = new Date().toISOString()
      }
      updatePayload.status = status
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('performance_reviews')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (dbErr) {
      console.error('[reviews PATCH]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[reviews PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
