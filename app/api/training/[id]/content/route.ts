import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
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

const VALID_TYPES = ['video', 'document', 'link', 'youtube', 'vimeo']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    // Verify course belongs to this org
    {
      const { data: course } = await supabaseAdmin
        .from('training_courses').select('id')
        .eq('id', courseId).eq('org_id', ctx.orgId).maybeSingle()
      if (!course) return NextResponse.json({ error: 'Course not found in your organisation' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('course_content')
      .select('id, course_id, title, description, content_type, storage_path, external_url, duration_seconds, display_order, created_at')
      .eq('org_id', ctx.orgId)
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
    if (items.length > 0) {
      const { data: progress } = await supabaseAdmin
        .from('course_content_progress')
        .select('content_id')
        .eq('org_id', ctx.orgId)
        .eq('course_id', courseId)
        .eq('employee_id', ctx.identityId)
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
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    // Verify course belongs to this org
    {
      const { data: course } = await supabaseAdmin
        .from('training_courses').select('id')
        .eq('id', courseId).eq('org_id', ctx.orgId).maybeSingle()
      if (!course) return NextResponse.json({ error: 'Course not found in your organisation' }, { status: 404 })
    }

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { title, description, content_type, storage_path, external_url, duration_seconds, display_order } = body

    if (!title)        return NextResponse.json({ error: 'title is required' }, { status: 400 })
    if (!content_type || !VALID_TYPES.includes(content_type)) {
      return NextResponse.json({ error: `content_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }
    if (!storage_path && !external_url) {
      return NextResponse.json({ error: 'Either storage_path or external_url is required' }, { status: 400 })
    }

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
        org_id:           ctx.orgId,
        created_by:       ctx.identityId,
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
