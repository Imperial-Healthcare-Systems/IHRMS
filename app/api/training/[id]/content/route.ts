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

function isHrAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

const VALID_TYPES = ['video', 'document', 'link', 'youtube', 'vimeo']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id as string

    const { data, error } = await supabaseAdmin
      .from('course_content')
      .select('id, course_id, title, description, content_type, storage_path, external_url, duration_seconds, display_order, created_at')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[course content GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [], progress: { total: 0, done: 0, percentage: 0 } })
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    const items = data ?? []

    // Fetch the current user's completion records for this course
    let completedSet = new Set<string>()
    if (userId && items.length > 0) {
      const { data: progress } = await supabaseAdmin
        .from('course_content_progress')
        .select('content_id')
        .eq('course_id', courseId)
        .eq('employee_id', userId)
      for (const row of progress ?? []) completedSet.add((row as any).content_id as string)
    }

    const enriched = items.map(it => ({ ...it, completed_by_me: completedSet.has(it.id as string) }))
    const total      = items.length
    const done       = completedSet.size
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0

    return NextResponse.json({ data: enriched, progress: { total, done, percentage } })
  } catch (err) {
    console.error('[course content GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrAdmin(session)) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { title, description, content_type, storage_path, external_url, duration_seconds, display_order } = body

    if (!title)        return NextResponse.json({ error: 'title is required' }, { status: 400 })
    if (!content_type || !VALID_TYPES.includes(content_type)) {
      return NextResponse.json({ error: `content_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }
    if (!storage_path && !external_url) {
      return NextResponse.json({ error: 'Either storage_path or external_url is required' }, { status: 400 })
    }

    const orgId   = (session.user as any)?.orgId   as string | null
    const actorId = (session.user as any)?.id      as string

    const { data, error } = await supabaseAdmin
      .from('course_content')
      .insert({
        course_id:        courseId,
        title,
        description:      description ?? null,
        content_type,
        storage_path:     storage_path ?? null,
        external_url:     external_url ?? null,
        duration_seconds: duration_seconds ?? null,
        display_order:    display_order   ?? 0,
        org_id:           orgId,
        created_by:       actorId,
      })
      .select()
      .single()

    if (error) {
      console.error('[course content POST]', error)
      return NextResponse.json({ error: errMsg(error), code: error.code, details: error.details }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[course content POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
