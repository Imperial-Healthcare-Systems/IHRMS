import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { data, error } = await supabaseAdmin
      .from('helpdesk_tickets')
      .select(`
        *,
        raised_by_emp:employees!raised_by(id, first_name, last_name, emp_id),
        assigned_to_emp:employees!assigned_to(id, first_name, last_name),
        comments:helpdesk_comments(id, body, created_at, author:employees!author_id(id, first_name, last_name))
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
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
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { action, status, assigned_to, comment } = body

    const isAdminUser = HR_ROLES.includes(ctx.role)

    // Add comment (any authenticated user can comment on their own ticket)
    if (action === 'comment') {
      if (!comment) return NextResponse.json({ error: 'comment body required' }, { status: 400 })

      // Verify ticket belongs to this org
      const { data: ticket } = await supabaseAdmin
        .from('helpdesk_tickets')
        .select('id')
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

      const { data, error } = await supabaseAdmin
        .from('helpdesk_comments')
        .insert({ ticket_id: id, body: comment, author_id: ctx.identityId, org_id: ctx.orgId })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    // Status/assignment updates — admin only
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Cross-tenant guard for assigned_to
    if (assigned_to) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', assigned_to).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

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
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (error) throw error

    logAudit({ org_id: ctx.orgId, actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId, action: 'updated', module: 'helpdesk', entity_id: id, summary: `Helpdesk ticket ${status ?? 'updated'}` })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
