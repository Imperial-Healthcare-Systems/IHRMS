import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('helpdesk_tickets')
      .select(`
        *,
        raised_by_emp:employees!raised_by(id, first_name, last_name, emp_id),
        assigned_to_emp:employees!assigned_to(id, first_name, last_name),
        comments:helpdesk_comments(id, body, created_at, author:employees!author_id(id, first_name, last_name))
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, status, assigned_to, comment } = body

    const actorId = (session.user as any)?.id as string
    const orgId = (session.user as any)?.orgId as string | null
    const isAdminUser = isAdmin(session)

    // Add comment (any authenticated user can comment on their own ticket)
    if (action === 'comment') {
      if (!comment) return NextResponse.json({ error: 'comment body required' }, { status: 400 })
      const { data, error } = await supabaseAdmin
        .from('helpdesk_comments')
        .insert({ ticket_id: id, body: comment, author_id: actorId })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    // Status/assignment updates — admin only
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) {
      updates.status = status
      if (status === 'resolved') updates.resolved_at = new Date().toISOString()
    }
    if (assigned_to !== undefined) updates.assigned_to = assigned_to

    const { data, error } = await supabaseAdmin
      .from('helpdesk_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'updated', module: 'helpdesk', entity_id: id, summary: `Helpdesk ticket ${status ?? 'updated'}` })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
