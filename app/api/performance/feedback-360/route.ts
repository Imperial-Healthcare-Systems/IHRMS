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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const subjectId  = searchParams.get('subject_id')
    const reviewerId = searchParams.get('reviewer_id')
    const isAdminUser = HR_ROLES.includes(ctx.role)

    const buildQuery = (withJoins: boolean) => {
      const select = withJoins
        ? `id, rating, comments, relationship, is_anonymous, created_at,
           subject:employees!subject_id(id, first_name, last_name, emp_id),
           reviewer:employees!reviewer_id(id, first_name, last_name)`
        : 'id, rating, comments, relationship, is_anonymous, created_at, subject_id, reviewer_id'

      let q = supabaseAdmin
        .from('feedback_360')
        .select(select)
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })

      if (subjectId)         q = q.eq('subject_id', subjectId)
      else if (!isAdminUser)  q = q.or(`subject_id.eq.${ctx.identityId},reviewer_id.eq.${ctx.identityId}`)
      if (reviewerId)        q = q.eq('reviewer_id', reviewerId)
      return q
    }

    let { data, error: dbErr } = await buildQuery(true)
    if (dbErr && (dbErr.code === 'PGRST200' || dbErr.code === 'PGRST201')) {
      console.warn('[feedback-360 GET] FK hints failed, retrying without joins:', dbErr.message)
      const retry = await buildQuery(false)
      data = retry.data; dbErr = retry.error
    }
    if (dbErr) {
      console.error('[feedback-360 GET]', dbErr)
      if (dbErr.code === '42P01') return NextResponse.json({ data: [] })
      throw dbErr
    }

    // Mask reviewer identity for anonymous feedback (non-admin)
    const result = (data ?? []).map(row => {
      const r = row as Record<string, unknown>
      if (r.is_anonymous && !isAdminUser) return { ...r, reviewer: null }
      return r
    })

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[feedback-360 GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { subject_id, subject_employee_id, rating, comments, relationship, is_anonymous } = body
    const subjectId = subject_id ?? subject_employee_id

    if (!subjectId || rating === undefined) {
      return NextResponse.json({ error: 'subject_id and rating are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 })
    }

    if (ctx.identityId === subjectId) {
      return NextResponse.json({ error: 'Cannot submit feedback for yourself' }, { status: 400 })
    }

    // Cross-tenant guard
    const { data: subject } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', subjectId)
      .eq('org_id', ctx.orgId)
      .maybeSingle()
    if (!subject) return NextResponse.json({ error: 'Subject not found in your organisation' }, { status: 404 })

    const now = new Date()
    const quarter = Math.ceil((now.getMonth() + 1) / 3)
    const reviewPeriod = body.review_period ?? `${now.getFullYear()}-Q${quarter}`

    const { data, error: dbErr } = await supabaseAdmin
      .from('feedback_360')
      .insert({
        org_id:        ctx.orgId,
        subject_id:    subjectId,
        reviewer_id:   ctx.identityId,
        rating,
        comments:      comments ?? null,
        relationship:  relationship ?? 'peer',
        is_anonymous:  is_anonymous ?? false,
        review_period: reviewPeriod,
      })
      .select()
      .single()

    if (dbErr) {
      console.error('[feedback-360 POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr), code: dbErr.code, details: dbErr.details }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[feedback-360 POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
