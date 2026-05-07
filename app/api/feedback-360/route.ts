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
    const subjectId = searchParams.get('subject_id')
    const reviewerId = searchParams.get('reviewer_id')
    const isAdminUser = HR_ROLES.includes(ctx.role)

    let query = supabaseAdmin
      .from('feedback_360')
      .select(`
        id, rating, comments, relationship, is_anonymous, created_at,
        subject:employees!subject_id(id, first_name, last_name, emp_id),
        reviewer:employees!reviewer_id(id, first_name, last_name)
      `)
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    } else if (!isAdminUser) {
      // Employees see feedback about themselves or given by themselves
      query = query.or(`subject_id.eq.${ctx.identityId},reviewer_id.eq.${ctx.identityId}`)
    }

    if (reviewerId) query = query.eq('reviewer_id', reviewerId)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      throw error
    }

    // Mask reviewer identity for anonymous responses (non-admin)
    const result = (data ?? []).map(row => {
      const r = row as Record<string, unknown>
      if (r.is_anonymous && !isAdminUser) {
        return { ...r, reviewer: null }
      }
      return r
    })

    return NextResponse.json({ data: result })
  } catch (err) {
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
    const { subject_id, rating, comments, relationship, is_anonymous } = body
    if (!subject_id || rating === undefined) {
      return NextResponse.json({ error: 'subject_id and rating are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 })
    }

    if (ctx.identityId === subject_id) {
      return NextResponse.json({ error: 'Cannot submit feedback for yourself' }, { status: 400 })
    }

    // Cross-tenant guard for subject_id
    {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', subject_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('feedback_360')
      .insert({
        subject_id,
        reviewer_id: ctx.identityId,
        rating,
        comments: comments ?? null,
        relationship: relationship ?? 'peer',
        is_anonymous: is_anonymous ?? false,
        org_id: ctx.orgId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
