import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  try {
    const { contentId } = await params
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    // Fetch the row first so we can remove the storage object (if any)
    const { data: row } = await supabaseAdmin
      .from('course_content')
      .select('storage_path')
      .eq('id', contentId)
      .eq('org_id', ctx.orgId)
      .single()

    if (!row) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

    if (row?.storage_path) {
      try {
        await supabaseAdmin.storage.from('course-content').remove([row.storage_path])
      } catch (e) { console.warn('[course content DELETE] storage cleanup non-fatal:', e) }
    }

    const { error } = await supabaseAdmin
      .from('course_content')
      .delete()
      .eq('id', contentId)
      .eq('org_id', ctx.orgId)

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
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const allowedFields = ['title', 'description', 'duration_seconds', 'display_order', 'external_url']
    const update: Record<string, unknown> = {}
    for (const k of allowedFields) if (k in body) update[k] = body[k]

    const { data, error } = await supabaseAdmin
      .from('course_content')
      .update(update)
      .eq('id', contentId)
      .eq('org_id', ctx.orgId)
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
