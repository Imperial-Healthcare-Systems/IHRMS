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

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subject_id')
    const reviewerId = searchParams.get('reviewer_id')
    const orgId = (session.user as any)?.orgId as string | null
    const userId = (session.user as any)?.id as string
    const isAdminUser = isAdmin(session)

    const buildQuery = (withJoins: boolean) => {
      const select = withJoins
        ? `id, rating, comments, relationship, is_anonymous, created_at,
           subject:employees!subject_id(id, first_name, last_name, emp_id),
           reviewer:employees!reviewer_id(id, first_name, last_name)`
        : 'id, rating, comments, relationship, is_anonymous, created_at, subject_id, reviewer_id'

      let q = supabaseAdmin
        .from('feedback_360')
        .select(select)
        .order('created_at', { ascending: false })

      if (orgId) q = q.eq('org_id', orgId)
      if (subjectId)        q = q.eq('subject_id', subjectId)
      else if (!isAdminUser) q = q.or(`subject_id.eq.${userId},reviewer_id.eq.${userId}`)
      if (reviewerId)       q = q.eq('reviewer_id', reviewerId)
      return q
    }

    let { data, error } = await buildQuery(true)
    if (error && (error.code === 'PGRST200' || error.code === 'PGRST201')) {
      console.warn('[feedback-360 GET] FK hints failed, retrying without joins:', error.message)
      const retry = await buildQuery(false)
      data = retry.data; error = retry.error
    }
    if (error) {
      console.error('[feedback-360 GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      throw error
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // Accept both subject_id and subject_employee_id for backward compatibility
    const { subject_id, subject_employee_id, rating, comments, relationship, is_anonymous } = body
    const subjectId = subject_id ?? subject_employee_id

    if (!subjectId || rating === undefined) {
      return NextResponse.json({ error: 'subject_id and rating are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 })
    }

    const reviewerId = (session.user as any)?.id as string
    if (reviewerId === subjectId) {
      return NextResponse.json({ error: 'Cannot submit feedback for yourself' }, { status: 400 })
    }

    const orgId = (session.user as any)?.orgId as string | null

    // review_period is NOT NULL on the pre-existing schema — derive a sensible default
    // (current quarter, e.g. "2026-Q2") if not supplied by the client.
    const now = new Date()
    const quarter = Math.ceil((now.getMonth() + 1) / 3)
    const reviewPeriod = body.review_period ?? `${now.getFullYear()}-Q${quarter}`

    const { data, error } = await supabaseAdmin
      .from('feedback_360')
      .insert({
        subject_id: subjectId,
        reviewer_id: reviewerId,
        rating,
        comments:      comments ?? null,
        relationship:  relationship ?? 'peer',
        is_anonymous:  is_anonymous ?? false,
        review_period: reviewPeriod,
        org_id:        orgId,
      })
      .select()
      .single()

    if (error) {
      console.error('[feedback-360 POST]', error)
      return NextResponse.json({ error: errMsg(error), code: error.code, details: error.details }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[feedback-360 POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
