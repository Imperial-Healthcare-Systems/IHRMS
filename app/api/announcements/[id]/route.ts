import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']
function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>) {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ADMIN_ROLES.includes(role ?? '')
}

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select(SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      // Fallback without join
      const { data: basic, error: e2 } = await supabaseAdmin
        .from('announcements').select('*').eq('id', id).single()
      if (e2) return NextResponse.json({ error: errMsg(e2) }, { status: 500 })
      return NextResponse.json({ data: basic })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, body: bodyText, content, expires_at, is_pinned, priority, is_urgent, category, type } = body

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    // Update both live column (content) and our added column (body)
    const newText = bodyText ?? content
    if (newText !== undefined) { updates.content = newText; updates.body = newText }
    if (expires_at !== undefined) updates.expires_at = expires_at
    if (is_pinned  !== undefined) updates.is_pinned  = is_pinned

    // Resolve priority + announcement_type
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

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('announcements').select('id, title').eq('id', id).single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(fetchError) }, { status: 500 })
    }

    const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id)
    if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 })

    return NextResponse.json({ message: `Announcement '${existing.title}' deleted successfully` })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
