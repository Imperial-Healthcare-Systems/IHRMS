import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { body: comment } = body

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'comment body is required' }, { status: 400 })
    }

    // Verify ticket exists and belongs to this org
    const { data: ticket } = await supabaseAdmin
      .from('helpdesk_tickets')
      .select('id, raised_by')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('helpdesk_comments')
      .insert({ ticket_id: id, body: comment.trim(), author_id: ctx.identityId, org_id: ctx.orgId })
      .select(`
        id, body, created_at,
        author:employees!author_id(id, first_name, last_name)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
