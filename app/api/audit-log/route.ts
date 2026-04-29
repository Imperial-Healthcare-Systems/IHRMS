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
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)
    const offset    = parseInt(searchParams.get('offset') ?? '0')
    const action    = searchParams.get('action')
    const module    = searchParams.get('module')
    const actorId   = searchParams.get('actor_id')
    const dateFrom  = searchParams.get('date_from')
    const dateTo    = searchParams.get('date_to')
    const orgId = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.orgId as string | null

    // Try with actor join first; fall back to no-join if FK isn't resolvable
    const buildQuery = (withActor: boolean) => {
      const select = withActor
        ? `id, org_id, actor_id, action, module, entity_id, summary, meta, ip_address, user_agent, created_at,
           actor:employees!actor_id(id, first_name, last_name, emp_id, avatar_url)`
        : 'id, org_id, actor_id, action, module, entity_id, summary, meta, ip_address, user_agent, created_at'

      let q = supabaseAdmin
        .from('audit_logs')
        .select(select, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (orgId)    q = q.eq('org_id', orgId)
      if (action)   q = q.eq('action', action)
      if (module)   q = q.eq('module', module)
      if (actorId)  q = q.eq('actor_id', actorId)
      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo)   q = q.lte('created_at', `${dateTo}T23:59:59.999Z`)
      return q
    }

    let { data, error, count } = await buildQuery(true)
    if (error && (error.code === 'PGRST200' || error.code === 'PGRST201')) {
      console.warn('[audit-log GET] actor join failed, retrying without:', error.message)
      const retry = await buildQuery(false)
      data = retry.data; error = retry.error; count = retry.count
    }

    if (error) {
      console.error('[audit-log GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [], count: 0 })
      // Schema mismatch — return empty rather than 500 so the UI keeps rendering
      if (error.code === '42703') return NextResponse.json({ data: [], count: 0, schema_warning: error.message })
      throw error
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[audit-log GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
