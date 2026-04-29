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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  try {
    const { contentId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrAdmin(session)) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    // Fetch the row first so we can remove the storage object (if any)
    const { data: row } = await supabaseAdmin
      .from('course_content')
      .select('storage_path')
      .eq('id', contentId)
      .single()

    if (row?.storage_path) {
      try {
        await supabaseAdmin.storage.from('course-content').remove([row.storage_path])
      } catch (e) { console.warn('[course content DELETE] storage cleanup non-fatal:', e) }
    }

    const { error } = await supabaseAdmin
      .from('course_content')
      .delete()
      .eq('id', contentId)

    if (error) {
      console.error('[course content DELETE]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[course content DELETE catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  try {
    const { contentId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrAdmin(session)) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const allowedFields = ['title', 'description', 'duration_seconds', 'display_order', 'external_url']
    const update: Record<string, unknown> = {}
    for (const k of allowedFields) if (k in body) update[k] = body[k]

    const { data, error } = await supabaseAdmin
      .from('course_content')
      .update(update)
      .eq('id', contentId)
      .select()
      .single()

    if (error) {
      console.error('[course content PATCH]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[course content PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
