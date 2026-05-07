import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const isAdminUser = HR_ROLES.includes(ctx.role)

    // Schema uses `title`, but page expects `subject`. Alias on read so the
    // existing client code (which destructures `subject`) keeps working.
    const buildQuery = (withJoins: boolean) => {
      const select = withJoins
        ? `id, ticket_number, subject:title, description, category, priority, status,
           created_at, updated_at, resolved_at, closed_at, raised_by, assigned_to,
           raised_by_emp:employees!raised_by(id, first_name, last_name, emp_id),
           assigned_to_emp:employees!assigned_to(id, first_name, last_name)`
        : 'id, ticket_number, subject:title, description, category, priority, status, created_at, updated_at, resolved_at, closed_at, raised_by, assigned_to'
      let q = supabaseAdmin
        .from('helpdesk_tickets')
        .select(select, { count: 'exact' })
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)
      if (!isAdminUser) q = q.eq('raised_by', ctx.identityId)
      if (status)       q = q.eq('status', status)
      if (priority)     q = q.eq('priority', priority)
      return q
    }

    let { data, error, count } = await buildQuery(true)
    if (error && (error.code === 'PGRST200' || error.code === 'PGRST201')) {
      console.warn('[helpdesk GET] employee joins failed, retrying without:', error.message)
      const retry = await buildQuery(false)
      data = retry.data; error = retry.error; count = retry.count
    }

    if (error) {
      console.error('[helpdesk GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [], count: 0 })
      if (error.code === '42703') return NextResponse.json({ data: [], count: 0, schema_warning: error.message })
      return NextResponse.json({ error: errMsg(error), code: error.code, details: error.details }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[helpdesk GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    // Accept either `title` or `subject` from the client (page legacy)
    const title = body.title ?? body.subject
    const { description, category, priority } = body
    if (!title)       return NextResponse.json({ error: 'title (or subject) is required' }, { status: 400 })
    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 })
    if (!category)    return NextResponse.json({ error: 'category is required' }, { status: 400 })

    // ticket_number is NOT NULL with no default — generate a short, sortable code
    const ticketNumber = `HD-${Date.now().toString(36).toUpperCase()}`

    // Map UI's 'normal' → schema default 'medium' so we don't trip a CHECK constraint
    const PRIORITY_MAP: Record<string, string> = { normal: 'medium', med: 'medium' }
    const finalPriority = PRIORITY_MAP[priority] ?? priority ?? 'medium'

    const { data, error } = await supabaseAdmin
      .from('helpdesk_tickets')
      .insert({
        ticket_number: ticketNumber,
        title,
        description,
        category,
        priority: finalPriority,
        status:   'open',
        raised_by: ctx.identityId,
        org_id:    ctx.orgId,
      })
      .select()
      .single()

    if (error) {
      console.error('[helpdesk POST]', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[helpdesk POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
