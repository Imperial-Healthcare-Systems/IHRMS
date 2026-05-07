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

const SELECT = `
  id, title, content, announcement_type, target_audience,
  published_by, is_published, published_at, expires_at,
  priority, is_pinned, audience, body, created_at, updated_at
`

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('announcements')
      .select(SELECT)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      const { data: basic, error: e2 } = await supabaseAdmin
        .from('announcements').select('*').eq('id', id).eq('org_id', ctx.orgId).single()
      if (e2) return NextResponse.json({ error: errMsg(e2) }, { status: 500 })
      return NextResponse.json({ data: basic })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { title, body: bodyText, content, expires_at, is_pinned, priority, is_urgent, category, type } = body

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    const newText = bodyText ?? content
    if (newText !== undefined) { updates.content = newText; updates.body = newText }
    if (expires_at !== undefined) updates.expires_at = expires_at
    if (is_pinned  !== undefined) updates.is_pinned  = is_pinned

    const cat = category ?? type
    if (priority !== undefined)      updates.priority = priority
    else if (is_urgent !== undefined) updates.priority = is_urgent ? 'urgent' : 'normal'
    else if (cat !== undefined) {
      const MAP: Record<string, string> = {
        urgent: 'urgent', holiday: 'low', event: 'normal', policy: 'high', general: 'normal',
      }
      updates.priority = MAP[String(cat).toLowerCase()] ?? 'normal'
      updates.announcement_type = String(cat).toLowerCase()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('*')
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('announcements').select('id, title').eq('id', id).eq('org_id', ctx.orgId).single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(fetchError) }, { status: 500 })
    }

    const { error: dbErr } = await supabaseAdmin
      .from('announcements').delete().eq('id', id).eq('org_id', ctx.orgId)
    if (dbErr) return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })

    return NextResponse.json({ message: `Announcement '${existing.title}' deleted successfully` })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
