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

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const userId = (session.user as any)?.id as string
    const orgId = (session.user as any)?.orgId as string | null
    const isAdminUser = isAdmin(session)

    let query = supabaseAdmin
      .from('helpdesk_tickets')
      .select(`
        id, subject, category, priority, status, created_at, updated_at, resolved_at,
        raised_by_emp:employees!raised_by(id, first_name, last_name, emp_id),
        assigned_to_emp:employees!assigned_to(id, first_name, last_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (!isAdminUser) query = query.eq('raised_by', userId)
    if (orgId) query = query.eq('org_id', orgId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, error, count } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [], count: 0 })
      throw error
    }
    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { subject, description, category, priority } = body
    if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })

    const raisedBy = (session.user as any)?.id as string
    const orgId = (session.user as any)?.orgId as string | null

    const { data, error } = await supabaseAdmin
      .from('helpdesk_tickets')
      .insert({
        subject,
        description: description ?? null,
        category: category ?? 'general',
        priority: priority ?? 'normal',
        status: 'open',
        raised_by: raisedBy,
        org_id: orgId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
