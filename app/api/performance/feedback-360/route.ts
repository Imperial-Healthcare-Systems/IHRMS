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

    let query = supabaseAdmin
      .from('feedback_360')
      .select(`
        id, rating, comments, relationship, is_anonymous, created_at,
        subject:employees!subject_id(id, first_name, last_name, emp_id),
        reviewer:employees!reviewer_id(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (orgId) query = query.eq('org_id', orgId)

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    } else if (!isAdminUser) {
      query = query.or(`subject_id.eq.${userId},reviewer_id.eq.${userId}`)
    }

    if (reviewerId) query = query.eq('reviewer_id', reviewerId)

    const { data, error } = await query
    if (error) {
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
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { subject_id, rating, comments, relationship, is_anonymous } = body

    if (!subject_id || rating === undefined) {
      return NextResponse.json({ error: 'subject_id and rating are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 })
    }

    const reviewerId = (session.user as any)?.id as string
    if (reviewerId === subject_id) {
      return NextResponse.json({ error: 'Cannot submit feedback for yourself' }, { status: 400 })
    }

    const orgId = (session.user as any)?.orgId as string | null

    const { data, error } = await supabaseAdmin
      .from('feedback_360')
      .insert({
        subject_id,
        reviewer_id: reviewerId,
        rating,
        comments: comments ?? null,
        relationship: relationship ?? 'peer',
        is_anonymous: is_anonymous ?? false,
        org_id: orgId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
